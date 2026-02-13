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

const BIP_HASHTAGS = [
  "#BIP",
  "#BIPHUB",
  "#BIP_HUB",
  "#BUILDINPUBLIC",
  "#BUILDINPUBLICHUB",
  "#BUILDINPUBLIC_HUB",
];

const SPAM_BIO_PATTERNS =
  /follow.?for.?follow|f4f|gain followers|crypto giveaway|dm me for/i;
const SPAM_TWEET_PATTERNS =
  /buy now|click here|free money|earn \$|make money fast/i;
const MIN_FOLLOWERS = 10;
const MIN_TWEETS = 5;

interface TwitterUserMetrics {
  followers_count: number;
  following_count: number;
  tweet_count: number;
}

interface TwitterUser {
  id: string;
  username: string;
  name: string;
  description?: string;
  public_metrics?: TwitterUserMetrics;
  profile_image_url?: string;
}

interface Tweet {
  id: string;
  text: string;
  author_id: string;
}

function isSpam(user: TwitterUser, tweetText?: string): boolean {
  if (user.public_metrics) {
    const { followers_count, following_count, tweet_count } =
      user.public_metrics;
    if (followers_count < MIN_FOLLOWERS) return true;
    if (tweet_count < MIN_TWEETS) return true;
    if (following_count > 5000 && followers_count < 50) return true;
  }
  if (user.description && SPAM_BIO_PATTERNS.test(user.description)) return true;
  if (tweetText && SPAM_TWEET_PATTERNS.test(tweetText)) return true;
  return false;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  if (!bearerToken) {
    return NextResponse.json(
      { error: "TWITTER_BEARER_TOKEN not configured" },
      { status: 500 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const totals = { discovered: 0, added: 0, skipped: 0, spam: 0, errors: 0 };

  for (const hashtag of BIP_HASHTAGS) {
    const hashtagKey = `monitor_${hashtag.replace("#", "").toLowerCase()}`;

    // Get last processed tweet ID
    const { data: stateData } = await supabase
      .from("monitor_state")
      .select("last_tweet_id")
      .eq("id", hashtagKey)
      .single();
    const sinceId = stateData?.last_tweet_id || null;

    try {
      const params = new URLSearchParams({
        query: hashtag,
        "tweet.fields": "author_id,created_at",
        "user.fields":
          "username,name,description,public_metrics,profile_image_url",
        expansions: "author_id",
        max_results: "100",
      });
      if (sinceId) params.set("since_id", sinceId);

      const res = await fetch(
        `https://api.twitter.com/2/tweets/search/recent?${params}`,
        { headers: { Authorization: `Bearer ${bearerToken}` } }
      );

      if (!res.ok) {
        if (res.status === 429) {
          console.log(`[Monitor] Rate limited on ${hashtag}, skipping`);
          continue;
        }
        console.error(`[Monitor] Twitter API ${res.status} for ${hashtag}`);
        totals.errors++;
        continue;
      }

      const data = await res.json();
      if (!data.data || data.data.length === 0) continue;

      const tweets: Tweet[] = data.data;
      const users: TwitterUser[] = data.includes?.users || [];
      const userMap = new Map(users.map((u) => [u.id, u]));

      let newestTweetId = sinceId;

      for (const tweet of tweets) {
        const user = userMap.get(tweet.author_id);
        if (!user) continue;

        if (!newestTweetId || tweet.id > newestTweetId) {
          newestTweetId = tweet.id;
        }

        totals.discovered++;

        if (isSpam(user, tweet.text)) {
          totals.spam++;
          continue;
        }

        // Check if already exists
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

        // Auto-add developer
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
              source: "hashtag",
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
                source: "hashtag",
                onboarding_completed: false,
              })
              .select("id")
              .single();
            developerId = retryData?.id;
          } else if (devError) {
            throw devError;
          }

          // Record signup
          await supabase.from("hashtag_signups").insert({
            twitter_username: user.username,
            twitter_name: user.name,
            twitter_bio: user.description,
            twitter_followers: user.public_metrics?.followers_count || 0,
            twitter_avatar_url: user.profile_image_url,
            hashtag_used: hashtag,
            tweet_id: tweet.id,
            tweet_text: tweet.text,
            status: "added",
            developer_id: developerId,
            added_at: new Date().toISOString(),
          });

          totals.added++;
          console.log(
            `[Monitor] + @${user.username} (${user.public_metrics?.followers_count || 0} followers) via ${hashtag}`
          );
        } catch (err) {
          console.error(
            `[Monitor] Failed to add @${user.username}:`,
            err instanceof Error ? err.message : err
          );
          totals.errors++;
        }
      }

      // Save state
      if (newestTweetId) {
        await supabase.from("monitor_state").upsert({
          id: hashtagKey,
          last_tweet_id: newestTweetId,
          last_run_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error(
        `[Monitor] Error for ${hashtag}:`,
        error instanceof Error ? error.message : error
      );
      totals.errors++;
    }

    // Rate limit pause between hashtags
    await new Promise((r) => setTimeout(r, 2000));
  }

  return NextResponse.json({ success: true, ...totals });
}
