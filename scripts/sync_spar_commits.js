import { Octokit } from "@octokit/rest";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// Sync commits for all active spars
async function syncActiveSpars() {
  console.log("[Spar Sync] Starting commit sync for active spars...");

  // Get all active spars with user info
  const { data: activeSpars, error } = await supabase
    .from("spars")
    .select(`
      *,
      creator:users!spars_creator_id_fkey(*),
      opponent:users!spars_opponent_id_fkey(*)
    `)
    .eq("status", "active");

  if (error) {
    console.error("[Spar Sync] Error fetching active spars:", error);
    return;
  }

  if (!activeSpars || activeSpars.length === 0) {
    console.log("[Spar Sync] No active spars found.");
    return;
  }

  console.log(`[Spar Sync] Found ${activeSpars.length} active spar(s)`);

  for (const spar of activeSpars) {
    // Check if spar has ended
    if (spar.actual_end && new Date(spar.actual_end) <= new Date()) {
      console.log(`[Spar Sync] Spar ${spar.id} has ended, completing...`);
      await completeSpar(spar);
      continue;
    }

    // Sync commits for both participants
    if (spar.creator?.github_username) {
      await syncUserCommits(spar, spar.creator, "creator");
    }
    if (spar.opponent?.github_username) {
      await syncUserCommits(spar, spar.opponent, "opponent");
    }
  }

  console.log("[Spar Sync] Done.");
}

// Fetch and store commits for a user in a spar
async function syncUserCommits(spar, user, role) {
  const username = user.github_username;
  const sparStart = new Date(spar.actual_start);

  try {
    // Fetch recent events from GitHub
    const { data: events } = await octokit.rest.activity.listPublicEventsForUser({
      username,
      per_page: 100,
    });

    // Filter PushEvents within spar time window
    const pushEvents = events.filter(
      (e) =>
        e.type === "PushEvent" &&
        new Date(e.created_at) >= sparStart &&
        (!spar.actual_end || new Date(e.created_at) <= new Date(spar.actual_end))
    );

    let newCommits = 0;

    for (const event of pushEvents) {
      const commits = event.payload?.commits || [];
      const repoName = event.repo?.name || "unknown";

      for (const commit of commits) {
        // Skip merge commits
        if (commit.message?.startsWith("Merge")) continue;

        const { error: insertError } = await supabase
          .from("spar_commits")
          .upsert(
            {
              spar_id: spar.id,
              user_id: user.id,
              commit_sha: commit.sha,
              commit_message: commit.message?.substring(0, 500),
              repo_name: repoName,
              repo_url: `https://github.com/${repoName}`,
              committed_at: event.created_at,
            },
            { onConflict: "spar_id,commit_sha" }
          );

        if (!insertError) {
          newCommits++;
        }
      }
    }

    // Count total commits for this user in this spar
    const { count } = await supabase
      .from("spar_commits")
      .select("*", { count: "exact", head: true })
      .eq("spar_id", spar.id)
      .eq("user_id", user.id);

    // Update the spar commit count
    const updateField = role === "creator" ? "creator_commits" : "opponent_commits";
    await supabase
      .from("spars")
      .update({ [updateField]: count || 0 })
      .eq("id", spar.id);

    console.log(
      `[Spar Sync] @${username} in spar ${spar.id}: ${newCommits} new, ${count} total commits`
    );
  } catch (err) {
    console.error(`[Spar Sync] Error syncing @${username}:`, err.message);
  }
}

// Complete a spar and declare the winner
async function completeSpar(spar) {
  let winnerId = null;

  if (spar.creator_commits > spar.opponent_commits) {
    winnerId = spar.creator_id;
  } else if (spar.opponent_commits > spar.creator_commits) {
    winnerId = spar.opponent_id;
  }

  // Update spar status
  await supabase
    .from("spars")
    .update({
      status: "completed",
      winner_id: winnerId,
    })
    .eq("id", spar.id);

  // Update user stats
  if (winnerId) {
    const loserId = winnerId === spar.creator_id ? spar.opponent_id : spar.creator_id;

    await supabase.rpc("increment_field", {
      table_name: "users",
      field_name: "spar_wins",
      row_id: winnerId,
    }).catch(() => {
      // Fallback if RPC doesn't exist
      supabase
        .from("users")
        .update({ spar_wins: (spar.creator_id === winnerId ? spar.creator : spar.opponent).spar_wins + 1 })
        .eq("id", winnerId);
    });

    await supabase
      .from("users")
      .update({ spar_losses: (spar.creator_id === loserId ? spar.creator : spar.opponent).spar_losses + 1 })
      .eq("id", loserId)
      .catch(() => {});
  }

  const winnerName = winnerId
    ? (winnerId === spar.creator_id ? spar.creator?.github_username : spar.opponent?.github_username)
    : "TIE";

  console.log(`[Spar Sync] Spar ${spar.id} completed! Winner: ${winnerName}`);
}

// Also check for accepted spars that should auto-start
async function checkScheduledStarts() {
  const { data: acceptedSpars } = await supabase
    .from("spars")
    .select("*")
    .eq("status", "accepted")
    .lte("scheduled_start", new Date().toISOString());

  if (acceptedSpars && acceptedSpars.length > 0) {
    for (const spar of acceptedSpars) {
      const now = new Date();
      const actualEnd = new Date(now.getTime() + spar.duration_hours * 60 * 60 * 1000);

      await supabase
        .from("spars")
        .update({
          status: "active",
          actual_start: now.toISOString(),
          actual_end: actualEnd.toISOString(),
        })
        .eq("id", spar.id);

      console.log(`[Spar Sync] Auto-started spar ${spar.id}`);
    }
  }
}

// Run the sync
async function main() {
  await checkScheduledStarts();
  await syncActiveSpars();
}

main().catch(console.error);
