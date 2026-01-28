const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../web/.env.local') });
const { TwitterApi } = require('twitter-api-v2');
const { createClient } = require('@supabase/supabase-js');

// Config
const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!TWITTER_BEARER_TOKEN) {
    console.error("Missing TWITTER_BEARER_TOKEN environment variable.");
    console.log("To get a Bearer Token:");
    console.log("1. Go to https://developer.twitter.com/en/portal/dashboard");
    console.log("2. Create a project and app");
    console.log("3. Generate a Bearer Token");
    console.log("4. Add TWITTER_BEARER_TOKEN=your_token to web/.env.local");
    if (!process.argv.includes('--mock')) {
        process.exit(1);
    }
}

const supabase = createClient(SUPABASE_URL || 'https://mock.supabase.co', SUPABASE_KEY || 'mock');

// Initialize Twitter client (read-only with Bearer Token)
const twitterClient = TWITTER_BEARER_TOKEN && TWITTER_BEARER_TOKEN !== 'mock-twitter-token'
    ? new TwitterApi(TWITTER_BEARER_TOKEN).readOnly
    : null;

async function main() {
    console.log(`\n🐦 Starting Twitter/X Data Ingestion...`);

    // Fetch developers who have twitter_username set
    const { data: developers, error } = await supabase
        .from('developers')
        .select('id, username, twitter_username')
        .not('twitter_username', 'is', null);

    if (error) {
        console.error('Failed to fetch developers:', error.message);
        return;
    }

    if (!developers || developers.length === 0) {
        console.log('No developers with Twitter usernames found.');
        return;
    }

    console.log(`Found ${developers.length} developers with Twitter usernames.`);

    // Process in batches to respect rate limits (100 users per 15 min window)
    const BATCH_SIZE = 100;
    const batches = [];
    for (let i = 0; i < developers.length; i += BATCH_SIZE) {
        batches.push(developers.slice(i, i + BATCH_SIZE));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`\nProcessing batch ${batchIndex + 1}/${batches.length} (${batch.length} users)...`);

        const twitterUsernames = batch.map(d => d.twitter_username).filter(Boolean);

        if (twitterUsernames.length === 0) continue;

        const twitterData = await fetchTwitterData(twitterUsernames);

        for (const dev of batch) {
            if (!dev.twitter_username) continue;

            const twitterUser = twitterData[dev.twitter_username.toLowerCase()];
            if (twitterUser) {
                await updateDatabase(dev.id, twitterUser);
            } else {
                console.log(`   ⚠️  No Twitter data found for @${dev.twitter_username}`);
            }
        }

        // Rate limit pause between batches
        if (batchIndex < batches.length - 1) {
            console.log('Pausing for rate limit...');
            await new Promise(r => setTimeout(r, 2000));
        }
    }

    console.log("\n✅ Twitter/X Ingestion Complete.");
}

async function fetchTwitterData(usernames) {
    const result = {};

    // MOCK MODE
    if (!twitterClient || process.argv.includes('--mock')) {
        console.log("   ⚠️  Using MOCK MODE (No API calls)");
        for (const username of usernames) {
            result[username.toLowerCase()] = {
                username: username,
                followers_count: Math.floor(Math.random() * 50000),
                following_count: Math.floor(Math.random() * 1000),
                tweet_count: Math.floor(Math.random() * 5000),
                listed_count: Math.floor(Math.random() * 500),
                name: `${username} (Mock)`,
                description: 'Mock bio',
                profile_image_url: `https://unavatar.io/twitter/${username}`
            };
        }
        return result;
    }

    try {
        // Fetch users by username with public metrics
        const { data: users, errors } = await twitterClient.v2.usersByUsernames(usernames, {
            'user.fields': ['public_metrics', 'description', 'profile_image_url', 'name', 'created_at']
        });

        if (errors && errors.length > 0) {
            for (const err of errors) {
                console.log(`   ⚠️  Twitter API error for @${err.value}: ${err.detail}`);
            }
        }

        if (users) {
            for (const user of users) {
                const metrics = user.public_metrics || {};
                result[user.username.toLowerCase()] = {
                    username: user.username,
                    followers_count: metrics.followers_count || 0,
                    following_count: metrics.following_count || 0,
                    tweet_count: metrics.tweet_count || 0,
                    listed_count: metrics.listed_count || 0,
                    name: user.name,
                    description: user.description,
                    profile_image_url: user.profile_image_url
                };
                console.log(`   ✅ @${user.username}: ${metrics.followers_count?.toLocaleString()} followers`);
            }
        }

    } catch (error) {
        console.error('Twitter API Error:', error.message);
        if (error.code === 429) {
            console.error('Rate limit exceeded. Please wait 15 minutes.');
        }
    }

    return result;
}

async function updateDatabase(developerId, twitterData) {
    if (SUPABASE_KEY === 'mock-service-role-key') {
        console.log(`   💾 [MOCK] Database updated for @${twitterData.username}`);
        return;
    }

    // Calculate engagement score based on followers and activity
    // Formula: followers * 0.001 + (tweet_count / 1000) + (listed_count * 0.1)
    const engagementScore = (
        (twitterData.followers_count * 0.001) +
        (twitterData.tweet_count / 1000) +
        (twitterData.listed_count * 0.1)
    );

    // Update stats_history with Twitter data
    const { error: histError } = await supabase
        .from('stats_history')
        .insert({
            developer_id: developerId,
            twitter_followers: twitterData.followers_count,
            twitter_engagement_score: engagementScore,
            engagement_score: engagementScore
        });

    if (histError) {
        console.error(`   ❌ DB History Error for @${twitterData.username}:`, histError.message);
    } else {
        console.log(`   💾 Database updated for @${twitterData.username} (engagement: ${engagementScore.toFixed(2)})`);
    }

    // Update developer's total_score to include Twitter engagement
    // First get current GitHub-based score, then add Twitter component
    const { data: latestStats } = await supabase
        .from('stats_history')
        .select('github_commits_last_30_days')
        .eq('developer_id', developerId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

    const githubCommits = latestStats?.github_commits_last_30_days || 0;
    const newTotalScore = (githubCommits * 0.5) + engagementScore;

    const { error: updateError } = await supabase
        .from('developers')
        .update({
            total_score: newTotalScore,
            updated_at: new Date()
        })
        .eq('id', developerId);

    if (updateError) {
        console.error(`   ❌ Score update error for @${twitterData.username}:`, updateError.message);
    }
}

// Export for use in scheduler
module.exports = { main, fetchTwitterData, updateDatabase };

// Run directly if this file is executed
if (require.main === module) {
    main().catch(console.error);
}
