#!/usr/bin/env node

/**
 * BuildInPublicHub - Hashtag Monitor & Auto-Add Pipeline
 *
 * Monitors Twitter/X for BIP-related hashtags and automatically adds
 * discovered builders to the platform.
 *
 * Usage:
 *   node scripts/monitor_hashtags.js          # Run with real Twitter API
 *   node scripts/monitor_hashtags.js --mock   # Use mock data for testing
 *
 * Required env vars: TWITTER_BEARER_TOKEN, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../web/.env.local') });
const { TwitterApi } = require('twitter-api-v2');
const { createClient } = require('@supabase/supabase-js');

// Config
const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isMock = process.argv.includes('--mock');

if (!TWITTER_BEARER_TOKEN && !isMock) {
    console.error('Missing TWITTER_BEARER_TOKEN. Use --mock for testing.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL || 'https://mock.supabase.co', SUPABASE_KEY || 'mock');
const twitterClient = TWITTER_BEARER_TOKEN && !isMock
    ? new TwitterApi(TWITTER_BEARER_TOKEN).readOnly
    : null;

// BIP-specific hashtags to monitor
const BIP_HASHTAGS = [
    '#BIP',
    '#BIPHUB',
    '#BIP_HUB',
    '#BUILDINPUBLIC',
    '#BUILDINPUBLICHUB',
    '#BUILDINPUBLIC_HUB',
];

// Spam detection
const SPAM_BIO_PATTERNS = /follow.?for.?follow|f4f|gain followers|crypto giveaway|dm me for|dm me|promo|follow back|18\+|onlyfans|casino|betting|crypto|nft|forex|trading|web3|airdrop|giveaway/i;
const SPAM_TWEET_PATTERNS = /buy now|click here|free money|earn \$|make money fast|crypto|nft|airdrop|giveaway|whitelist|mint|token|telegram|join now|limited spots/i;
// Bitcoin Improvement Proposal pattern — #BIP-110, #BIP-300, "running a node", etc.
const BITCOIN_BIP_PATTERNS = /#BIP[- ]?\d|bitcoin|btc|node operator|full node|listening node|lightning network|satoshi|mempool|blockstream/i;
const MIN_FOLLOWERS = 50;
const MIN_TWEETS = 20;

// Bio keywords that indicate legitimate indie developers (reused from discover_builders.js)
const BUILDER_BIO_KEYWORDS = [
    'build', 'indie', 'maker', 'founder', 'solo', 'bootstrap',
    'saas', 'shipping', 'dev', 'developer', 'engineer', 'coding',
    'startup', 'product', 'hacker', 'creator', 'ship', 'launch',
    'open source', 'oss', 'nextjs', 'react', 'typescript',
];

function hasBuilderBio(bio) {
    if (!bio) return false;
    const lower = bio.toLowerCase();
    return BUILDER_BIO_KEYWORDS.some(keyword => lower.includes(keyword));
}

function isSpam(user, tweetText) {
    if (user.public_metrics) {
        const { followers_count, following_count, tweet_count } = user.public_metrics;
        if (followers_count < MIN_FOLLOWERS) return true;
        if (tweet_count < MIN_TWEETS) return true;
        // Suspicious ratio: following 10x more than followers
        if (following_count > 10 * followers_count) return true;
    }
    if (user.description && SPAM_BIO_PATTERNS.test(user.description)) return true;
    if (tweetText && SPAM_TWEET_PATTERNS.test(tweetText)) return true;
    // Filter out Bitcoin Improvement Proposal tweets hijacking #BIP
    if (tweetText && BITCOIN_BIP_PATTERNS.test(tweetText)) return true;
    // Require at least one builder-related keyword in bio
    if (!hasBuilderBio(user.description)) return true;
    return false;
}

async function getMonitorState(hashtagKey) {
    const { data } = await supabase
        .from('monitor_state')
        .select('last_tweet_id')
        .eq('id', hashtagKey)
        .single();
    return data?.last_tweet_id || null;
}

async function setMonitorState(hashtagKey, lastTweetId) {
    await supabase
        .from('monitor_state')
        .upsert({
            id: hashtagKey,
            last_tweet_id: lastTweetId,
            last_run_at: new Date().toISOString(),
        });
}

async function isExistingDeveloper(twitterUsername) {
    const { data } = await supabase
        .from('developers')
        .select('id')
        .ilike('twitter_username', twitterUsername)
        .limit(1)
        .single();
    return !!data;
}

async function isExistingSignup(twitterUsername) {
    const { data } = await supabase
        .from('hashtag_signups')
        .select('id')
        .ilike('twitter_username', twitterUsername)
        .limit(1)
        .single();
    return !!data;
}

async function autoAddDeveloper(user) {
    const username = user.username.toLowerCase();
    const avatarUrl = user.profile_image_url
        ? user.profile_image_url.replace('_normal', '_400x400')
        : `https://unavatar.io/twitter/${username}`;

    const { data, error } = await supabase
        .from('developers')
        .insert({
            username: username,
            full_name: user.name || username,
            avatar_url: avatarUrl,
            bio: user.description || '',
            twitter_username: user.username,
            total_score: 0,
            source: 'hashtag',
            onboarding_completed: false,
        })
        .select('id')
        .single();

    if (error) {
        // Username conflict — try with _tw suffix
        if (error.code === '23505') {
            const { data: retryData, error: retryError } = await supabase
                .from('developers')
                .insert({
                    username: `${username}_tw`,
                    full_name: user.name || username,
                    avatar_url: avatarUrl,
                    bio: user.description || '',
                    twitter_username: user.username,
                    total_score: 0,
                    source: 'hashtag',
                    onboarding_completed: false,
                })
                .select('id')
                .single();
            if (retryError) throw retryError;
            return retryData.id;
        }
        throw error;
    }
    return data.id;
}

async function recordSignup(user, tweetId, tweetText, hashtag, developerId) {
    const { error } = await supabase
        .from('hashtag_signups')
        .insert({
            twitter_username: user.username,
            twitter_name: user.name,
            twitter_bio: user.description,
            twitter_followers: user.public_metrics?.followers_count || 0,
            twitter_avatar_url: user.profile_image_url,
            hashtag_used: hashtag,
            tweet_id: tweetId,
            tweet_text: tweetText,
            status: 'added',
            developer_id: developerId,
            added_at: new Date().toISOString(),
        });
    if (error && error.code !== '23505') {
        console.error(`   [ERROR] Failed to record signup for @${user.username}:`, error.message);
    }
}

async function searchHashtag(hashtag) {
    const hashtagKey = `monitor_${hashtag.replace('#', '').toLowerCase()}`;
    const sinceId = await getMonitorState(hashtagKey);

    const results = { discovered: 0, added: 0, skipped: 0, spam: 0, errors: 0 };

    if (isMock) {
        console.log(`\n   [MOCK] Searching for ${hashtag}...`);
        const mockUsers = [
            { username: `builder_${Date.now() % 1000}`, name: 'Mock Builder', description: 'Building SaaS in public', public_metrics: { followers_count: 500, following_count: 200, tweet_count: 1500 }, profile_image_url: null },
            { username: `indie_${Date.now() % 1000}`, name: 'Indie Dev', description: 'Solo founder shipping fast', public_metrics: { followers_count: 1200, following_count: 300, tweet_count: 3000 }, profile_image_url: null },
        ];
        for (const user of mockUsers) {
            console.log(`   [MOCK] Would add @${user.username} (${user.public_metrics.followers_count} followers)`);
            results.discovered++;
            results.added++;
        }
        return results;
    }

    try {
        const searchParams = {
            'tweet.fields': ['author_id', 'created_at'],
            'user.fields': ['username', 'name', 'description', 'public_metrics', 'profile_image_url'],
            expansions: ['author_id'],
            max_results: 100,
        };
        if (sinceId) searchParams.since_id = sinceId;

        const response = await twitterClient.v2.search(hashtag, searchParams);

        if (!response.data?.data || response.data.data.length === 0) {
            console.log(`   No new tweets for ${hashtag}`);
            return results;
        }

        const tweets = response.data.data;
        const users = response.data.includes?.users || [];
        const userMap = new Map(users.map(u => [u.id, u]));

        let newestTweetId = sinceId;

        for (const tweet of tweets) {
            const user = userMap.get(tweet.author_id);
            if (!user) continue;

            // Track newest tweet ID for pagination
            if (!newestTweetId || tweet.id > newestTweetId) {
                newestTweetId = tweet.id;
            }

            results.discovered++;

            // Skip spam
            if (isSpam(user, tweet.text)) {
                results.spam++;
                continue;
            }

            // Skip existing developers
            if (await isExistingDeveloper(user.username)) {
                results.skipped++;
                continue;
            }

            // Skip already-tracked signups
            if (await isExistingSignup(user.username)) {
                results.skipped++;
                continue;
            }

            // Auto-add to platform
            try {
                const developerId = await autoAddDeveloper(user);
                await recordSignup(user, tweet.id, tweet.text, hashtag, developerId);
                results.added++;
                console.log(`   + @${user.username} (${user.public_metrics?.followers_count || 0} followers) via ${hashtag}`);
            } catch (err) {
                console.error(`   [ERROR] Failed to add @${user.username}:`, err.message);
                results.errors++;
            }
        }

        // Save state
        if (newestTweetId) {
            await setMonitorState(hashtagKey, newestTweetId);
        }
    } catch (error) {
        if (error.code === 429) {
            console.error(`   [RATE LIMIT] Hit rate limit for ${hashtag}. Waiting...`);
            await new Promise(r => setTimeout(r, 60000));
        } else {
            console.error(`   [ERROR] Twitter API error for ${hashtag}:`, error.message);
        }
        results.errors++;
    }

    return results;
}

async function main() {
    console.log('\n[HASHTAG-MONITOR] Starting BIP hashtag scan...');
    console.log(`[HASHTAG-MONITOR] Monitoring ${BIP_HASHTAGS.length} hashtags`);
    if (isMock) console.log('[HASHTAG-MONITOR] Running in MOCK MODE\n');

    const totals = { discovered: 0, added: 0, skipped: 0, spam: 0, errors: 0 };

    for (const hashtag of BIP_HASHTAGS) {
        const results = await searchHashtag(hashtag);
        totals.discovered += results.discovered;
        totals.added += results.added;
        totals.skipped += results.skipped;
        totals.spam += results.spam;
        totals.errors += results.errors;

        // Rate limit pause between hashtags
        if (!isMock) {
            await new Promise(r => setTimeout(r, 2000));
        }
    }

    console.log('\n[HASHTAG-MONITOR] Scan Complete:');
    console.log(`   Discovered: ${totals.discovered}`);
    console.log(`   Added:      ${totals.added}`);
    console.log(`   Skipped:    ${totals.skipped} (existing members)`);
    console.log(`   Spam:       ${totals.spam}`);
    console.log(`   Errors:     ${totals.errors}`);
}

module.exports = { main, searchHashtag, isSpam };

if (require.main === module) {
    main().catch(console.error);
}
