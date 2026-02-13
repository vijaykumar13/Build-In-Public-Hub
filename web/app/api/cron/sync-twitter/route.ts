import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  if (!cronSecret) return true;
  return false;
}

interface TwitterUser {
  username: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
}

async function fetchTwitterMetrics(
  usernames: string[],
  bearerToken: string
): Promise<Map<string, TwitterUser>> {
  const result = new Map<string, TwitterUser>();

  try {
    const res = await fetch(
      `https://api.twitter.com/2/users/by?usernames=${usernames.join(",")}&user.fields=public_metrics`,
      {
        headers: { Authorization: `Bearer ${bearerToken}` },
      }
    );

    if (!res.ok) {
      console.error(`Twitter API error: ${res.status}`);
      return result;
    }

    const data = await res.json();
    if (data.data) {
      for (const user of data.data) {
        result.set(user.username.toLowerCase(), user);
      }
    }
  } catch (error) {
    console.error("Twitter API fetch error:", error);
  }

  return result;
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

  try {
    const supabase = getSupabaseAdmin();

    const { data: developers, error: devError } = await supabase
      .from("developers")
      .select("id, username, twitter_username")
      .not("twitter_username", "is", null);

    if (devError || !developers) {
      console.error("Error fetching developers:", devError);
      return NextResponse.json(
        { error: "Failed to fetch developers" },
        { status: 500 }
      );
    }

    if (developers.length === 0) {
      return NextResponse.json({ success: true, synced: 0, message: "No developers with Twitter usernames" });
    }

    console.log(`[Twitter Sync] Syncing ${developers.length} developers...`);

    // Batch usernames (Twitter API allows 100 per request)
    const BATCH_SIZE = 100;
    let synced = 0;
    let errors = 0;

    for (let i = 0; i < developers.length; i += BATCH_SIZE) {
      const batch = developers.slice(i, i + BATCH_SIZE);
      const usernames = batch
        .map((d) => d.twitter_username)
        .filter(Boolean) as string[];

      if (usernames.length === 0) continue;

      const twitterData = await fetchTwitterMetrics(usernames, bearerToken);

      for (const dev of batch) {
        if (!dev.twitter_username) continue;

        const tUser = twitterData.get(dev.twitter_username.toLowerCase());
        if (!tUser?.public_metrics) continue;

        const metrics = tUser.public_metrics;
        const engagementScore =
          metrics.followers_count * 0.001 +
          metrics.tweet_count / 1000 +
          metrics.listed_count * 0.1;

        const { error: histError } = await supabase
          .from("stats_history")
          .insert({
            developer_id: dev.id,
            twitter_followers: metrics.followers_count,
            twitter_engagement_score: engagementScore,
            engagement_score: engagementScore,
          });

        if (histError) {
          console.error(`[Twitter Sync] DB error for @${dev.twitter_username}:`, histError.message);
          errors++;
        } else {
          synced++;
          console.log(`[Twitter Sync] @${dev.twitter_username}: ${metrics.followers_count} followers`);
        }
      }

      // Rate limit pause between batches
      if (i + BATCH_SIZE < developers.length) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    return NextResponse.json({ success: true, synced, errors, total: developers.length });
  } catch (error) {
    console.error("[Twitter Sync] Fatal error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
