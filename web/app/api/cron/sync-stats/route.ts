import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const maxDuration = 60;

// Verify cron secret to prevent unauthorized access
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  // Allow if no CRON_SECRET is configured (development)
  if (!cronSecret) return true;
  return false;
}

interface GitHubEvent {
  type: string;
  payload: { size?: number; commits?: unknown[] };
  created_at: string;
}

async function fetchGitHubCommits(username: string): Promise<number> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(
      `https://api.github.com/users/${username}/events/public?per_page=100`,
      { headers }
    );

    if (!res.ok) {
      console.error(`GitHub API error for ${username}: ${res.status}`);
      return 0;
    }

    const events: GitHubEvent[] = await res.json();
    const pushEvents = events.filter((e) => e.type === "PushEvent");
    return pushEvents.reduce((acc, e) => acc + (e.payload.size || 0), 0);
  } catch (error) {
    console.error(`Error fetching GitHub data for ${username}:`, error);
    return 0;
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Get all developers with GitHub usernames
    const { data: developers, error: devError } = await supabase
      .from("developers")
      .select("id, username, twitter_username");

    if (devError || !developers) {
      console.error("Error fetching developers:", devError);
      return NextResponse.json(
        { error: "Failed to fetch developers" },
        { status: 500 }
      );
    }

    console.log(`[Stats Sync] Syncing ${developers.length} developers...`);

    let synced = 0;
    let errors = 0;

    for (const dev of developers) {
      try {
        // Rate limit: 500ms between requests
        if (synced > 0) {
          await new Promise((r) => setTimeout(r, 500));
        }

        const commits = await fetchGitHubCommits(dev.username);

        // Insert stats history record
        const { error: histError } = await supabase
          .from("stats_history")
          .insert({
            developer_id: dev.id,
            github_commits_last_30_days: commits,
            twitter_followers: 0,
            twitter_engagement_score: 0,
          });

        if (histError) {
          console.error(`Error inserting stats for ${dev.username}:`, histError);
          errors++;
          continue;
        }

        // Update developer total_score
        const { error: updateError } = await supabase
          .from("developers")
          .update({
            total_score: commits * 0.5,
            updated_at: new Date().toISOString(),
          })
          .eq("id", dev.id);

        if (updateError) {
          console.error(`Error updating score for ${dev.username}:`, updateError);
        }

        synced++;
        console.log(`[Stats Sync] ${dev.username}: ${commits} commits`);
      } catch (err) {
        console.error(`[Stats Sync] Error for ${dev.username}:`, err);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      synced,
      errors,
      total: developers.length,
    });
  } catch (error) {
    console.error("[Stats Sync] Fatal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
