#!/usr/bin/env node

/**
 * BuildInPublicHub - Twitter Builder Discovery Script
 *
 * Finds indie developers on Twitter/X who use #buildinpublic and related hashtags.
 * Filters by bio keywords, follower count, and activity.
 * Outputs a CSV/JSON of potential builders to invite.
 *
 * Usage:
 *   node scripts/discover_builders.js                    # Search hashtags
 *   node scripts/discover_builders.js --followers <handle>  # Scrape followers of an account
 *   node scripts/discover_builders.js --mock             # Use mock data for testing
 *   node scripts/discover_builders.js --output json      # Output format (csv or json)
 *
 * Required env var: TWITTER_BEARER_TOKEN in web/.env.local
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../web/.env.local') });

const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Parse CLI args
const args = process.argv.slice(2);
const isMock = args.includes('--mock');
const outputFormat = args.includes('--output') ? args[args.indexOf('--output') + 1] : 'csv';
const followersMode = args.includes('--followers');
const targetHandle = followersMode ? args[args.indexOf('--followers') + 1] : null;

// Search queries for discovery
const SEARCH_QUERIES = [
  '#buildinpublic',
  '#indiehackers',
  '#solofounder',
  '#shipfast',
  '#buildintheopen',
  'building in public',
  'indie maker',
  'bootstrapped SaaS',
];

// Bio keywords that indicate indie developers
const BIO_KEYWORDS = [
  'build', 'indie', 'maker', 'founder', 'solo', 'bootstrap',
  'saas', 'shipping', 'dev', 'developer', 'engineer', 'coding',
  'startup', 'product', 'hacker', 'creator', 'ship', 'launch',
  'open source', 'oss', 'nextjs', 'react', 'typescript',
];

// Minimum thresholds
const MIN_FOLLOWERS = 50;
const MAX_FOLLOWERS = 500000; // Skip mega-accounts
const MIN_TWEETS = 10;

if (!TWITTER_BEARER_TOKEN && !isMock) {
  console.error("Missing TWITTER_BEARER_TOKEN environment variable.");
  console.log("\nTo get a Bearer Token:");
  console.log("1. Go to https://developer.twitter.com/en/portal/dashboard");
  console.log("2. Create a project and app (Free tier works for search)");
  console.log("3. Generate a Bearer Token");
  console.log("4. Add TWITTER_BEARER_TOKEN=your_token to web/.env.local");
  console.log("\nOr run with --mock for testing: node scripts/discover_builders.js --mock");
  process.exit(1);
}

// Supabase client to check existing members
let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

// Twitter client
let twitterClient = null;
if (TWITTER_BEARER_TOKEN && !isMock) {
  try {
    const { TwitterApi } = require('twitter-api-v2');
    twitterClient = new TwitterApi(TWITTER_BEARER_TOKEN).readOnly;
  } catch (e) {
    console.error('Failed to initialize Twitter client. Install: npm install twitter-api-v2');
    console.error(e.message);
    process.exit(1);
  }
}

// Store discovered developers
const discovered = new Map(); // username -> data

async function getExistingMembers() {
  if (!supabase) return new Set();

  const { data, error } = await supabase
    .from('developers')
    .select('username, twitter_username');

  if (error) {
    console.error('Error fetching existing members:', error.message);
    return new Set();
  }

  const existing = new Set();
  for (const dev of (data || [])) {
    if (dev.username) existing.add(dev.username.toLowerCase());
    if (dev.twitter_username) existing.add(dev.twitter_username.toLowerCase());
  }
  return existing;
}

function matchesBioKeywords(bio) {
  if (!bio) return false;
  const lower = bio.toLowerCase();
  return BIO_KEYWORDS.some(keyword => lower.includes(keyword));
}

function scoreCandidate(user) {
  let score = 0;
  const bio = (user.description || '').toLowerCase();

  // Bio keyword matches (up to 30 points)
  const matches = BIO_KEYWORDS.filter(kw => bio.includes(kw));
  score += Math.min(matches.length * 5, 30);

  // Follower sweet spot: 100-10K followers (up to 20 points)
  const followers = user.followers_count || 0;
  if (followers >= 100 && followers <= 10000) score += 20;
  else if (followers > 10000 && followers <= 50000) score += 15;
  else if (followers >= 50 && followers < 100) score += 10;

  // Activity: tweet count (up to 15 points)
  const tweets = user.tweet_count || 0;
  if (tweets >= 1000) score += 15;
  else if (tweets >= 500) score += 10;
  else if (tweets >= 100) score += 5;

  // Has website/link in bio (5 points)
  if (bio.includes('http') || bio.includes('.com') || bio.includes('.io') || bio.includes('.dev')) {
    score += 5;
  }

  return score;
}

async function searchHashtags() {
  console.log('\n🔍 Searching Twitter for #buildinpublic developers...\n');

  for (const query of SEARCH_QUERIES) {
    console.log(`  Searching: "${query}"...`);

    if (isMock) {
      // Generate mock results
      for (let i = 0; i < 5; i++) {
        const username = `mockdev_${query.replace(/[^a-z]/g, '')}_${i}`;
        discovered.set(username.toLowerCase(), {
          username,
          name: `Mock Developer ${i}`,
          description: `I'm building my SaaS in public. ${query} maker.`,
          followers_count: Math.floor(Math.random() * 10000) + 100,
          following_count: Math.floor(Math.random() * 1000),
          tweet_count: Math.floor(Math.random() * 5000) + 100,
          listed_count: Math.floor(Math.random() * 100),
          profile_image_url: `https://unavatar.io/twitter/${username}`,
          source: query,
        });
      }
      continue;
    }

    try {
      const result = await twitterClient.v2.search(query, {
        'tweet.fields': ['author_id', 'created_at'],
        'user.fields': ['public_metrics', 'description', 'profile_image_url', 'name', 'username'],
        'expansions': ['author_id'],
        'max_results': 100,
      });

      if (result.includes?.users) {
        for (const user of result.includes.users) {
          const metrics = user.public_metrics || {};
          const followers = metrics.followers_count || 0;

          // Filter by thresholds
          if (followers < MIN_FOLLOWERS || followers > MAX_FOLLOWERS) continue;
          if ((metrics.tweet_count || 0) < MIN_TWEETS) continue;

          // Check bio keywords (soft filter - still include but with lower score)
          discovered.set(user.username.toLowerCase(), {
            username: user.username,
            name: user.name,
            description: user.description,
            followers_count: followers,
            following_count: metrics.following_count || 0,
            tweet_count: metrics.tweet_count || 0,
            listed_count: metrics.listed_count || 0,
            profile_image_url: user.profile_image_url,
            source: query,
          });
        }
        console.log(`    Found ${result.includes.users.length} users`);
      }

      // Rate limit pause
      await new Promise(r => setTimeout(r, 2000));

    } catch (error) {
      if (error.code === 429) {
        console.error(`    ⚠️ Rate limited. Waiting 60 seconds...`);
        await new Promise(r => setTimeout(r, 60000));
      } else {
        console.error(`    ❌ Error searching "${query}":`, error.message);
      }
    }
  }
}

async function scrapeFollowers(handle) {
  console.log(`\n👥 Scraping followers of @${handle}...\n`);

  if (isMock) {
    for (let i = 0; i < 20; i++) {
      const username = `follower_${handle}_${i}`;
      discovered.set(username.toLowerCase(), {
        username,
        name: `Follower ${i} of ${handle}`,
        description: `Indie maker building cool stuff. #buildinpublic`,
        followers_count: Math.floor(Math.random() * 10000) + 100,
        following_count: Math.floor(Math.random() * 1000),
        tweet_count: Math.floor(Math.random() * 5000) + 100,
        listed_count: Math.floor(Math.random() * 100),
        profile_image_url: `https://unavatar.io/twitter/${username}`,
        source: `followers:@${handle}`,
      });
    }
    return;
  }

  try {
    // First get the user ID
    const user = await twitterClient.v2.userByUsername(handle, {
      'user.fields': ['public_metrics'],
    });

    if (!user.data) {
      console.error(`User @${handle} not found`);
      return;
    }

    console.log(`  @${handle} has ${user.data.public_metrics?.followers_count?.toLocaleString()} followers`);

    // Get followers (paginated, max 1000 per request on Basic plan)
    const followers = await twitterClient.v2.followers(user.data.id, {
      'user.fields': ['public_metrics', 'description', 'profile_image_url', 'name', 'username'],
      'max_results': 1000,
    });

    if (followers.data) {
      for (const follower of followers.data) {
        const metrics = follower.public_metrics || {};
        const followerCount = metrics.followers_count || 0;

        if (followerCount < MIN_FOLLOWERS || followerCount > MAX_FOLLOWERS) continue;
        if ((metrics.tweet_count || 0) < MIN_TWEETS) continue;

        discovered.set(follower.username.toLowerCase(), {
          username: follower.username,
          name: follower.name,
          description: follower.description,
          followers_count: followerCount,
          following_count: metrics.following_count || 0,
          tweet_count: metrics.tweet_count || 0,
          listed_count: metrics.listed_count || 0,
          profile_image_url: follower.profile_image_url,
          source: `followers:@${handle}`,
        });
      }
      console.log(`  Found ${followers.data.length} followers matching criteria`);
    }

  } catch (error) {
    if (error.code === 429) {
      console.error('  ⚠️ Rate limited. Try again in 15 minutes.');
    } else {
      console.error(`  ❌ Error:`, error.message);
    }
  }
}

function exportResults(candidates, existingMembers) {
  const outputDir = path.join(__dirname, '../data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().split('T')[0];

  if (outputFormat === 'json') {
    const filePath = path.join(outputDir, `discovered_builders_${timestamp}.json`);
    fs.writeFileSync(filePath, JSON.stringify(candidates, null, 2));
    console.log(`\n📄 Saved ${candidates.length} candidates to ${filePath}`);
  } else {
    const filePath = path.join(outputDir, `discovered_builders_${timestamp}.csv`);
    const header = 'username,name,followers,tweets,score,bio_match,source,profile_url,description\n';
    const rows = candidates.map(c => {
      const desc = (c.description || '').replace(/"/g, '""').replace(/\n/g, ' ');
      return `"${c.username}","${c.name}",${c.followers_count},${c.tweet_count},${c.score},${c.bio_match},"${c.source}","https://x.com/${c.username}","${desc}"`;
    });
    fs.writeFileSync(filePath, header + rows.join('\n'));
    console.log(`\n📄 Saved ${candidates.length} candidates to ${filePath}`);
  }
}

async function main() {
  console.log('🚀 BuildInPublicHub - Builder Discovery Tool');
  console.log('============================================');

  if (isMock) {
    console.log('⚠️  Running in MOCK mode (no API calls)\n');
  }

  // Get existing members to exclude
  const existingMembers = await getExistingMembers();
  console.log(`📋 ${existingMembers.size} existing members to exclude\n`);

  // Run discovery
  if (followersMode && targetHandle) {
    await scrapeFollowers(targetHandle);
  } else {
    await searchHashtags();
  }

  // Filter and score candidates
  console.log(`\n📊 Processing ${discovered.size} raw candidates...`);

  const candidates = [];
  for (const [username, data] of discovered) {
    // Skip existing members
    if (existingMembers.has(username)) {
      continue;
    }

    const score = scoreCandidate(data);
    const bioMatch = matchesBioKeywords(data.description);

    candidates.push({
      ...data,
      score,
      bio_match: bioMatch,
    });
  }

  // Sort by score (highest first)
  candidates.sort((a, b) => b.score - a.score);

  // Remove low-score candidates
  const qualified = candidates.filter(c => c.score >= 10);

  console.log(`\n✅ Results:`);
  console.log(`   Total discovered: ${discovered.size}`);
  console.log(`   Already members: ${discovered.size - candidates.length}`);
  console.log(`   Qualified (score >= 10): ${qualified.length}`);
  console.log(`   Filtered out: ${candidates.length - qualified.length}`);

  // Show top 20
  console.log(`\n🏆 Top 20 Candidates:\n`);
  console.log('  #  | Score | Followers | Username             | Bio');
  console.log('  ---|-------|-----------|----------------------|-----');

  qualified.slice(0, 20).forEach((c, i) => {
    const bio = (c.description || '').slice(0, 60).replace(/\n/g, ' ');
    console.log(
      `  ${String(i + 1).padStart(2)} | ${String(c.score).padStart(5)} | ${String(c.followers_count).padStart(9)} | @${c.username.padEnd(19)} | ${bio}...`
    );
  });

  // Export
  if (qualified.length > 0) {
    exportResults(qualified, existingMembers);
  }

  console.log('\n🎯 Next steps:');
  console.log('   1. Review the candidates in the output file');
  console.log('   2. Personalize DM messages referencing their projects');
  console.log('   3. Send invites: "Hey! I noticed you\'re building in public...');
  console.log('      Check out BuildInPublicHub.net - a leaderboard for indie devs!"');
  console.log('   4. Track responses and conversions\n');
}

main().catch(console.error);
