import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  if (!cronSecret) return true;
  return false;
}

const TARGET_ACCOUNTS = ["levelsio", "marclouv", "tdinh_me"];

const BUILDER_BIO_KEYWORDS = [
  "build", "indie", "maker", "founder", "solo", "bootstrap",
  "saas", "shipping", "dev", "developer", "engineer", "coding",
  "startup", "product", "hacker", "creator", "ship", "launch",
  "open source", "oss", "nextjs", "react", "typescript",
];

const SPAM_BIO_PATTERNS =
  /follow.?for.?follow|f4f|gain followers|crypto giveaway|dm me for|dm me|promo|follow back|18\+|onlyfans|casino|betting|crypto|nft|forex|trading|web3|airdrop|giveaway/i;

const MIN_FOLLOWERS = 50;
const MAX_FOLLOWERS = 500000;
const MIN_TWEETS = 20;

interface TwitterUser {
  id: string;
  username: string;
  name: string;
  description?: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  };
  profile_image_url?: string;
  url?: string;
  entities?: {
    url?: { urls?: { expanded_url?: string }[] };
    description?: { urls?: { expanded_url?: string }[] };
  };
}

function hasBuilderBio(bio: string | undefined): boolean {
  if (!bio) return false;
  const lower = bio.toLowerCase();
  return BUILDER_BIO_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function isSpam(user: TwitterUser): boolean {
  const metrics = user.public_metrics;
  if (metrics) {
    if (metrics.followers_count < MIN_FOLLOWERS) return true;
    if (metrics.followers_count > MAX_FOLLOWERS) return true;
    if (metrics.tweet_count < MIN_TWEETS) return true;
    if (metrics.following_count > 10 * metrics.followers_count) return true;
  }
  if (user.description && SPAM_BIO_PATTERNS.test(user.description)) return true;
  if (!hasBuilderBio(user.description)) return true;
  return false;
}

function extractGithubUsername(user: TwitterUser): string | null {
  const allUrls = [
    ...(user.entities?.url?.urls || []),
    ...(user.entities?.description?.urls || []),
  ];
  for (const u of allUrls) {
    const match = (u.expanded_url || "").match(/github\.com\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
  }
  const bioMatch = (user.description || "").match(/github\.com\/([a-zA-Z0-9_-]+)/i);
  if (bioMatch) return bioMatch[1];
  return null;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  if (!bearerToken) {
    return NextResponse.json({ error: "TWITTER_BEARER_TOKEN not configured" }, { status: 500 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const totals = { discovered: 0, added: 0, skipped: 0, spam: 0, errors: 0, target: "" };

  // Determine which target to scrape (rotation)
  const { data: stateData } = await supabase
    .from("monitor_state")
    .select("metadata")
    .eq("id", "follower_scraper")
    .single();

  const lastTarget = stateData?.metadata?.last_target;
  const lastIdx = lastTarget ? TARGET_ACCOUNTS.indexOf(lastTarget) : -1;
  const target = TARGET_ACCOUNTS[(lastIdx + 1) % TARGET_ACCOUNTS.length];
  totals.target = target;

  try {
    // Resolve username to user ID
    const userRes = await fetch(
      `https://api.twitter.com/2/users/by/username/${target}?user.fields=public_metrics`,
      { headers: { Authorization: `Bearer ${bearerToken}` } }
    );

    if (!userRes.ok) {
      return NextResponse.json({ error: `Failed to resolve @${target}: ${userRes.status}` }, { status: 500 });
    }

    const userData = await userRes.json();
    if (!userData.data) {
      return NextResponse.json({ error: `User @${target} not found` }, { status: 404 });
    }

    const userId = userData.data.id;

    // Fetch followers
    const params = new URLSearchParams({
      "user.fields": "username,name,description,public_metrics,profile_image_url,url,entities",
      max_results: "1000",
    });

    const followersRes = await fetch(
      `https://api.twitter.com/2/users/${userId}/followers?${params}`,
      { headers: { Authorization: `Bearer ${bearerToken}` } }
    );

    if (!followersRes.ok) {
      if (followersRes.status === 429) {
        return NextResponse.json({ error: "Rate limited", ...totals }, { status: 429 });
      }
      return NextResponse.json({ error: `Twitter API ${followersRes.status}` }, { status: 500 });
    }

    const followersData = await followersRes.json();
    const followers: TwitterUser[] = followersData.data || [];

    for (const user of followers) {
      totals.discovered++;

      if (isSpam(user)) {
        totals.spam++;
        continue;
      }

      // Check existing developer
      const { data: existingDev } = await supabase
        .from("developers")
        .select("id")
        .ilike("twitter_username", user.username)
        .limit(1)
        .single();
      if (existingDev) {
        totals.skipped++;
        continue;
      }

      // Check existing signup
      const { data: existingSignup } = await supabase
        .from("hashtag_signups")
        .select("id")
        .ilike("twitter_username", user.username)
        .limit(1)
        .single();
      if (existingSignup) {
        totals.skipped++;
        continue;
      }

      // Add developer
      try {
        const username = user.username.toLowerCase();
        const avatarUrl = user.profile_image_url
          ? user.profile_image_url.replace("_normal", "_400x400")
          : `https://unavatar.io/twitter/${username}`;

        const { data: devData, error: devError } = await supabase
          .from("developers")
          .insert({
            username,
            full_name: user.name || username,
            avatar_url: avatarUrl,
            bio: user.description || "",
            twitter_username: user.username,
            total_score: 0,
            source: "follower_scrape",
            onboarding_completed: false,
          })
          .select("id")
          .single();

        let developerId = devData?.id;

        if (devError?.code === "23505") {
          const { data: retryData } = await supabase
            .from("developers")
            .insert({
              username: `${username}_tw`,
              full_name: user.name || username,
              avatar_url: avatarUrl,
              bio: user.description || "",
              twitter_username: user.username,
              total_score: 0,
              source: "follower_scrape",
              onboarding_completed: false,
            })
            .select("id")
            .single();
          developerId = retryData?.id;
        } else if (devError) {
          throw devError;
        }

        const ghUsername = extractGithubUsername(user);
        await supabase.from("hashtag_signups").insert({
          twitter_username: user.username,
          twitter_name: user.name,
          twitter_bio: user.description,
          twitter_followers: user.public_metrics?.followers_count || 0,
          twitter_avatar_url: user.profile_image_url,
          hashtag_used: `followers:@${target}`,
          tweet_id: `follower_${user.id}_${Date.now()}`,
          tweet_text: ghUsername ? `GitHub: ${ghUsername}` : null,
          status: "added",
          developer_id: developerId,
          added_at: new Date().toISOString(),
        });

        totals.added++;
      } catch (err) {
        console.error(`[Followers] Failed to add @${user.username}:`, err instanceof Error ? err.message : err);
        totals.errors++;
      }
    }

    // Save rotation state
    await supabase.from("monitor_state").upsert({
      id: "follower_scraper",
      last_tweet_id: followersData.meta?.next_token || "",
      last_run_at: new Date().toISOString(),
      metadata: { last_target: target, completed_at: new Date().toISOString() },
    });
  } catch (error) {
    console.error(`[Followers] Error:`, error instanceof Error ? error.message : error);
    totals.errors++;
  }

  return NextResponse.json({ success: true, ...totals });
}
