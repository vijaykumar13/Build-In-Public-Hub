#!/usr/bin/env node

/**
 * BuildInPublicHub - Automated Outreach Pipeline
 *
 * Picks top candidates from hashtag_signups that haven't been contacted yet,
 * scores them by priority, and sends outreach tweets @mentioning them.
 *
 * Requires Twitter API write access (OAuth 1.0a) for posting tweets.
 * Falls back to "dry run" mode if write credentials are missing, logging
 * what would be sent without actually posting.
 *
 * Usage:
 *   node scripts/outreach_pipeline.js               # Run outreach (or dry run)
 *   node scripts/outreach_pipeline.js --dry-run      # Force dry run
 *   node scripts/outreach_pipeline.js --limit 5      # Override daily cap
 *   node scripts/outreach_pipeline.js --mock          # Mock data for testing
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET (for posting)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../web/.env.local') });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Twitter OAuth 1.0a credentials for posting tweets
const TWITTER_API_KEY = process.env.TWITTER_API_KEY;
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET;
const TWITTER_ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN;
const TWITTER_ACCESS_SECRET = process.env.TWITTER_ACCESS_SECRET;

const args = process.argv.slice(2);
const isMock = args.includes('--mock');
const forceDryRun = args.includes('--dry-run');
const limitArg = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : null;

const DAILY_CAP = limitArg || 10;
const COOLDOWN_DAYS = 30; // Don't re-contact within 30 days

// Tweet templates — rotated to avoid spam detection
const TWEET_TEMPLATES = [
  'Hey @{username}! We noticed you\'re building in public. Check out BuildInPublicHub.net — a leaderboard for indie devs shipping in the open!',
  'Hey @{username}, love seeing builders ship in public! We made buildinpublichub.net for devs like you — track your progress on our leaderboard!',
  'Yo @{username}! Fellow builder here. We built buildinpublichub.net as a leaderboard for #buildinpublic devs. Would love to have you on it!',
  '@{username} Saw you\'re building in public — nice! We created buildinpublichub.net to spotlight indie devs. Come join the leaderboard!',
  'Hey @{username}! Building in public is awesome. We made a leaderboard for devs like you at buildinpublichub.net — check it out!',
];

if (!SUPABASE_URL || !SUPABASE_KEY) {
  if (!isMock) {
    console.error('Missing Supabase credentials.');
    process.exit(1);
  }
}

const supabase = createClient(SUPABASE_URL || 'https://mock.supabase.co', SUPABASE_KEY || 'mock');

const hasWriteAccess = !!(TWITTER_API_KEY && TWITTER_API_SECRET && TWITTER_ACCESS_TOKEN && TWITTER_ACCESS_SECRET);
const isDryRun = forceDryRun || !hasWriteAccess;

// Initialize Twitter write client
let twitterWriteClient = null;
if (hasWriteAccess && !isDryRun && !isMock) {
  try {
    const { TwitterApi } = require('twitter-api-v2');
    twitterWriteClient = new TwitterApi({
      appKey: TWITTER_API_KEY,
      appSecret: TWITTER_API_SECRET,
      accessToken: TWITTER_ACCESS_TOKEN,
      accessSecret: TWITTER_ACCESS_SECRET,
    });
  } catch (e) {
    console.error('Failed to initialize Twitter write client:', e.message);
  }
}

function getTemplate(username) {
  const idx = Math.floor(Math.random() * TWEET_TEMPLATES.length);
  return TWEET_TEMPLATES[idx].replace('{username}', username);
}

function scorePriority(signup) {
  let score = 0;
  const followers = signup.twitter_followers || 0;

  // Follower sweet spot: 100-10K is ideal
  if (followers >= 100 && followers <= 10000) score += 30;
  else if (followers > 10000 && followers <= 50000) score += 20;
  else if (followers >= 50 && followers < 100) score += 10;

  // Has GitHub (from tweet_text field used by follower scraper)
  if (signup.tweet_text && signup.tweet_text.startsWith('GitHub:')) score += 20;

  // Source bonus: follower scrapes are higher quality
  if (signup.hashtag_used && signup.hashtag_used.startsWith('followers:')) score += 10;

  // Bio quality
  const bio = (signup.twitter_bio || '').toLowerCase();
  const builderKeywords = ['build', 'ship', 'maker', 'founder', 'saas', 'indie', 'dev'];
  const matches = builderKeywords.filter(kw => bio.includes(kw));
  score += Math.min(matches.length * 5, 20);

  return score;
}

async function getCandidates() {
  if (isMock) {
    return Array.from({ length: 15 }, (_, i) => ({
      id: `mock_${i}`,
      twitter_username: `mockbuilder_${i}`,
      twitter_name: `Mock Builder ${i}`,
      twitter_bio: 'Indie maker building SaaS in public',
      twitter_followers: 200 + Math.floor(Math.random() * 5000),
      hashtag_used: i % 2 === 0 ? 'followers:@levelsio' : '#BUILDINPUBLIC',
      tweet_text: i % 3 === 0 ? 'GitHub: mockdev' : null,
      status: 'added',
      developer_id: `dev_${i}`,
    }));
  }

  // Get signups that haven't been contacted yet
  const cooldownDate = new Date();
  cooldownDate.setDate(cooldownDate.getDate() - COOLDOWN_DAYS);

  // Get all 'added' signups
  const { data: signups, error } = await supabase
    .from('hashtag_signups')
    .select('*')
    .eq('status', 'added')
    .order('discovered_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('Error fetching signups:', error.message);
    return [];
  }

  if (!signups || signups.length === 0) return [];

  // Get existing outreach records to exclude already-contacted users
  const usernames = signups.map(s => s.twitter_username);
  const { data: existingOutreach } = await supabase
    .from('outreach_log')
    .select('twitter_username, outreach_status, sent_at')
    .in('twitter_username', usernames);

  const contacted = new Map();
  for (const o of (existingOutreach || [])) {
    contacted.set(o.twitter_username.toLowerCase(), o);
  }

  // Filter: exclude already contacted (within cooldown) and already signed up
  const candidates = signups.filter(s => {
    const existing = contacted.get(s.twitter_username.toLowerCase());
    if (!existing) return true;
    if (existing.outreach_status === 'signed_up') return false;
    if (existing.sent_at && new Date(existing.sent_at) > cooldownDate) return false;
    return true;
  });

  return candidates;
}

async function sendOutreach(candidate) {
  const message = getTemplate(candidate.twitter_username);

  if (isMock || isDryRun) {
    return { success: true, message, dryRun: true };
  }

  try {
    await twitterWriteClient.v2.tweet(message);
    return { success: true, message, dryRun: false };
  } catch (error) {
    console.error(`   [ERROR] Failed to tweet for @${candidate.twitter_username}:`, error.message);
    return { success: false, message, error: error.message };
  }
}

async function logOutreach(candidate, message, status, signupId) {
  if (isMock) return;

  const { error } = await supabase
    .from('outreach_log')
    .upsert({
      twitter_username: candidate.twitter_username,
      outreach_type: 'mention',
      outreach_status: status,
      message_text: message,
      source: candidate.hashtag_used?.startsWith('followers:') ? 'follower_scrape' : 'hashtag_monitor',
      priority_score: scorePriority(candidate),
      sent_at: status === 'sent' ? new Date().toISOString() : null,
      developer_id: candidate.developer_id,
      signup_id: candidate.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'twitter_username,outreach_type' });

  if (error) {
    console.error(`   [ERROR] Failed to log outreach for @${candidate.twitter_username}:`, error.message);
  }
}

async function main() {
  console.log('\n[OUTREACH] Starting outreach pipeline...');
  console.log(`[OUTREACH] Daily cap: ${DAILY_CAP}`);
  console.log(`[OUTREACH] Mode: ${isMock ? 'MOCK' : isDryRun ? 'DRY RUN (no Twitter write creds)' : 'LIVE'}`);

  if (isDryRun && !isMock) {
    console.log('[OUTREACH] To enable live tweeting, set: TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET');
  }

  // Get candidates
  const candidates = await getCandidates();
  console.log(`[OUTREACH] Found ${candidates.length} eligible candidates\n`);

  if (candidates.length === 0) {
    console.log('[OUTREACH] No candidates to contact. Done.');
    return;
  }

  // Score and sort by priority
  const scored = candidates.map(c => ({
    ...c,
    priority: scorePriority(c),
  }));
  scored.sort((a, b) => b.priority - a.priority);

  // Take top N up to daily cap
  const batch = scored.slice(0, DAILY_CAP);

  console.log(`[OUTREACH] Processing top ${batch.length} candidates:\n`);
  console.log('  #  | Priority | Followers | Username             | Source');
  console.log('  ---|----------|-----------|----------------------|-------');

  const results = { sent: 0, failed: 0, dryRun: 0 };

  for (let i = 0; i < batch.length; i++) {
    const candidate = batch[i];
    const source = (candidate.hashtag_used || '').substring(0, 25);

    console.log(
      `  ${String(i + 1).padStart(2)} | ${String(candidate.priority).padStart(8)} | ${String(candidate.twitter_followers).padStart(9)} | @${candidate.twitter_username.padEnd(19)} | ${source}`
    );

    const result = await sendOutreach(candidate);

    if (result.dryRun) {
      console.log(`     -> [DRY RUN] Would tweet: "${result.message.substring(0, 80)}..."`);
      await logOutreach(candidate, result.message, 'pending', candidate.id);
      results.dryRun++;
    } else if (result.success) {
      console.log(`     -> Tweeted!`);
      await logOutreach(candidate, result.message, 'sent', candidate.id);
      results.sent++;
      // Pause between tweets to avoid rate limits
      await new Promise(r => setTimeout(r, 5000));
    } else {
      console.log(`     -> FAILED: ${result.error}`);
      await logOutreach(candidate, result.message, 'failed', candidate.id);
      results.failed++;
    }
  }

  console.log('\n[OUTREACH] Pipeline Complete:');
  console.log(`   Candidates found: ${candidates.length}`);
  console.log(`   Processed:        ${batch.length}`);
  if (isDryRun || isMock) {
    console.log(`   Dry run:          ${results.dryRun}`);
  } else {
    console.log(`   Sent:             ${results.sent}`);
    console.log(`   Failed:           ${results.failed}`);
  }
}

module.exports = { main, scorePriority, TWEET_TEMPLATES };

if (require.main === module) {
  main().catch(console.error);
}
