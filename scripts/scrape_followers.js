#!/usr/bin/env node

/**
 * BuildInPublicHub - Follower Scraper
 *
 * Scrapes followers of key indie hacker accounts and stores qualified
 * builders in the hashtag_signups table for review and outreach.
 *
 * Rotates through target accounts across runs using monitor_state for
 * pagination cursors.
 *
 * Usage:
 *   node scripts/scrape_followers.js                  # Scrape next target account
 *   node scripts/scrape_followers.js --target levelsio # Scrape specific account
 *   node scripts/scrape_followers.js --mock           # Use mock data for testing
 *
 * Required env vars: TWITTER_BEARER_TOKEN, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../web/.env.local') });
const { createClient } = require('@supabase/supabase-js');

const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const args = process.argv.slice(2);
const isMock = args.includes('--mock');
const targetArg = args.includes('--target') ? args[args.indexOf('--target') + 1] : null;

// Target indie hacker accounts to scrape followers from
const TARGET_ACCOUNTS = ['levelsio', 'marclouv', 'tdinh_me'];

// Bio keywords that indicate indie developers
const BUILDER_BIO_KEYWORDS = [
  'build', 'indie', 'maker', 'founder', 'solo', 'bootstrap',
  'saas', 'shipping', 'dev', 'developer', 'engineer', 'coding',
  'startup', 'product', 'hacker', 'creator', 'ship', 'launch',
  'open source', 'oss', 'nextjs', 'react', 'typescript',
];

// Spam bio patterns
const SPAM_BIO_PATTERNS = /follow.?for.?follow|f4f|gain followers|crypto giveaway|dm me for|dm me|promo|follow back|18\+|onlyfans|casino|betting|crypto|nft|forex|trading|web3|airdrop|giveaway/i;

const MIN_FOLLOWERS = 50;
const MAX_FOLLOWERS = 500000;
const MIN_TWEETS = 20;
const MAX_PER_RUN = 1000; // Max followers to fetch per run (API limit)

if (!TWITTER_BEARER_TOKEN && !isMock) {
  console.error('Missing TWITTER_BEARER_TOKEN. Use --mock for testing.');
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  if (!isMock) {
    console.error('Missing Supabase credentials.');
    process.exit(1);
  }
}

const supabase = createClient(SUPABASE_URL || 'https://mock.supabase.co', SUPABASE_KEY || 'mock');

function hasBuilderBio(bio) {
  if (!bio) return false;
  const lower = bio.toLowerCase();
  return BUILDER_BIO_KEYWORDS.some(keyword => lower.includes(keyword));
}

function isSpam(user) {
  const metrics = user.public_metrics || {};
  if (metrics.followers_count < MIN_FOLLOWERS) return true;
  if (metrics.followers_count > MAX_FOLLOWERS) return true;
  if (metrics.tweet_count < MIN_TWEETS) return true;
  if (metrics.following_count > 10 * metrics.followers_count) return true;
  if (user.description && SPAM_BIO_PATTERNS.test(user.description)) return true;
  if (!hasBuilderBio(user.description)) return true;
  return false;
}

function extractGithubUsername(user) {
  const bio = (user.description || '').toLowerCase();
  const url = user.url || '';

  // Check URL entities for github.com links
  const urls = user.entities?.url?.urls || [];
  const descUrls = user.entities?.description?.urls || [];
  const allUrls = [...urls, ...descUrls];

  for (const u of allUrls) {
    const expanded = u.expanded_url || '';
    const match = expanded.match(/github\.com\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
  }

  // Check bio text for github references
  const bioMatch = bio.match(/github\.com\/([a-zA-Z0-9_-]+)/);
  if (bioMatch) return bioMatch[1];

  return null;
}

async function getRotationState() {
  const { data } = await supabase
    .from('monitor_state')
    .select('last_tweet_id, metadata')
    .eq('id', 'follower_scraper')
    .single();
  return data;
}

async function saveRotationState(targetHandle, paginationToken) {
  await supabase
    .from('monitor_state')
    .upsert({
      id: 'follower_scraper',
      last_tweet_id: paginationToken || '',
      last_run_at: new Date().toISOString(),
      metadata: { last_target: targetHandle, completed_at: new Date().toISOString() },
    });
}

async function getNextTarget() {
  if (targetArg) return targetArg;

  const state = await getRotationState();
  if (!state?.metadata?.last_target) return TARGET_ACCOUNTS[0];

  const lastIdx = TARGET_ACCOUNTS.indexOf(state.metadata.last_target);
  const nextIdx = (lastIdx + 1) % TARGET_ACCOUNTS.length;
  return TARGET_ACCOUNTS[nextIdx];
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

async function addDeveloper(user, targetHandle) {
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
      source: 'follower_scrape',
      onboarding_completed: false,
    })
    .select('id')
    .single();

  if (error) {
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
          source: 'follower_scrape',
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

async function recordSignup(user, targetHandle, developerId) {
  const githubUsername = extractGithubUsername(user);
  const { error } = await supabase
    .from('hashtag_signups')
    .insert({
      twitter_username: user.username,
      twitter_name: user.name,
      twitter_bio: user.description,
      twitter_followers: user.public_metrics?.followers_count || 0,
      twitter_avatar_url: user.profile_image_url,
      hashtag_used: `followers:@${targetHandle}`,
      tweet_id: `follower_${user.id}_${Date.now()}`,
      tweet_text: githubUsername ? `GitHub: ${githubUsername}` : null,
      status: 'added',
      developer_id: developerId,
      added_at: new Date().toISOString(),
    });
  if (error && error.code !== '23505') {
    console.error(`   [ERROR] Failed to record signup for @${user.username}:`, error.message);
  }
}

async function scrapeFollowersMock(targetHandle) {
  console.log(`\n   [MOCK] Scraping followers of @${targetHandle}...`);

  const mockFollowers = [];
  for (let i = 0; i < 10; i++) {
    mockFollowers.push({
      id: `mock_${i}`,
      username: `builder_${targetHandle}_${i}`,
      name: `Builder ${i}`,
      description: 'Building a SaaS product in public. Indie maker.',
      public_metrics: {
        followers_count: 200 + Math.floor(Math.random() * 5000),
        following_count: 100 + Math.floor(Math.random() * 500),
        tweet_count: 500 + Math.floor(Math.random() * 5000),
      },
      profile_image_url: null,
    });
  }

  const results = { discovered: 0, added: 0, skipped: 0, spam: 0, errors: 0 };
  for (const user of mockFollowers) {
    results.discovered++;
    if (isSpam(user)) {
      results.spam++;
      continue;
    }
    console.log(`   [MOCK] Would add @${user.username} (${user.public_metrics.followers_count} followers)`);
    results.added++;
  }
  return results;
}

async function scrapeFollowers(targetHandle) {
  console.log(`\n   Resolving @${targetHandle} user ID...`);

  const results = { discovered: 0, added: 0, skipped: 0, spam: 0, errors: 0 };

  try {
    // Resolve username to user ID
    const userRes = await fetch(
      `https://api.twitter.com/2/users/by/username/${targetHandle}?user.fields=public_metrics`,
      { headers: { Authorization: `Bearer ${TWITTER_BEARER_TOKEN}` } }
    );

    if (!userRes.ok) {
      console.error(`   Failed to resolve @${targetHandle}: ${userRes.status}`);
      return results;
    }

    const userData = await userRes.json();
    if (!userData.data) {
      console.error(`   User @${targetHandle} not found`);
      return results;
    }

    const userId = userData.data.id;
    const totalFollowers = userData.data.public_metrics?.followers_count || 0;
    console.log(`   @${targetHandle} (ID: ${userId}) has ${totalFollowers.toLocaleString()} followers`);

    // Fetch followers (paginated)
    const params = new URLSearchParams({
      'user.fields': 'username,name,description,public_metrics,profile_image_url,url,entities',
      'max_results': String(MAX_PER_RUN),
    });

    const followersRes = await fetch(
      `https://api.twitter.com/2/users/${userId}/followers?${params}`,
      { headers: { Authorization: `Bearer ${TWITTER_BEARER_TOKEN}` } }
    );

    if (!followersRes.ok) {
      if (followersRes.status === 429) {
        console.error('   Rate limited. Try again in 15 minutes.');
      } else {
        console.error(`   Twitter API error: ${followersRes.status}`);
      }
      return results;
    }

    const followersData = await followersRes.json();
    const followers = followersData.data || [];
    console.log(`   Fetched ${followers.length} followers`);

    for (const user of followers) {
      results.discovered++;

      if (isSpam(user)) {
        results.spam++;
        continue;
      }

      // Check existing
      if (await isExistingDeveloper(user.username)) {
        results.skipped++;
        continue;
      }

      if (await isExistingSignup(user.username)) {
        results.skipped++;
        continue;
      }

      // Add to platform
      try {
        const developerId = await addDeveloper(user, targetHandle);
        await recordSignup(user, targetHandle, developerId);
        results.added++;
        const ghUser = extractGithubUsername(user);
        console.log(`   + @${user.username} (${user.public_metrics?.followers_count || 0} followers)${ghUser ? ` [GitHub: ${ghUser}]` : ''}`);
      } catch (err) {
        console.error(`   [ERROR] Failed to add @${user.username}:`, err.message);
        results.errors++;
      }
    }

    // Save pagination state
    const nextToken = followersData.meta?.next_token || null;
    await saveRotationState(targetHandle, nextToken);

  } catch (error) {
    console.error(`   [ERROR] Unexpected error:`, error.message);
    results.errors++;
  }

  return results;
}

async function main() {
  console.log('\n[FOLLOWER-SCRAPER] Starting follower scrape...');

  if (isMock) {
    console.log('[FOLLOWER-SCRAPER] Running in MOCK MODE\n');
    const target = targetArg || TARGET_ACCOUNTS[0];
    const results = await scrapeFollowersMock(target);
    console.log('\n[FOLLOWER-SCRAPER] Results:');
    console.log(`   Target:     @${target}`);
    console.log(`   Discovered: ${results.discovered}`);
    console.log(`   Added:      ${results.added}`);
    console.log(`   Spam:       ${results.spam}`);
    return;
  }

  const target = await getNextTarget();
  console.log(`[FOLLOWER-SCRAPER] Target: @${target}`);
  console.log(`[FOLLOWER-SCRAPER] Accounts in rotation: ${TARGET_ACCOUNTS.join(', ')}\n`);

  const results = await scrapeFollowers(target);

  console.log('\n[FOLLOWER-SCRAPER] Scan Complete:');
  console.log(`   Target:     @${target}`);
  console.log(`   Discovered: ${results.discovered}`);
  console.log(`   Added:      ${results.added}`);
  console.log(`   Skipped:    ${results.skipped} (existing members)`);
  console.log(`   Spam:       ${results.spam}`);
  console.log(`   Errors:     ${results.errors}`);
}

module.exports = { main, scrapeFollowers, isSpam, TARGET_ACCOUNTS };

if (require.main === module) {
  main().catch(console.error);
}
