import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { supabase } from "@/lib/supabase";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sparId } = await params;

    // Get spar with users
    const { data: spar, error } = await supabase
      .from("spars")
      .select(`
        *,
        creator:users!spars_creator_id_fkey(*),
        opponent:users!spars_opponent_id_fkey(*)
      `)
      .eq("id", sparId)
      .single();

    if (error || !spar) {
      return NextResponse.json({ error: "Spar not found" }, { status: 404 });
    }

    // Only sync active spars
    if (spar.status !== "active") {
      return NextResponse.json({ message: "Spar is not active", status: spar.status });
    }

    // Check if spar has ended
    if (spar.actual_end && new Date(spar.actual_end) <= new Date()) {
      await completeSpar(spar);
      return NextResponse.json({ message: "Spar completed", status: "completed" });
    }

    // Sync commits for both participants
    let creatorCount = spar.creator_commits;
    let opponentCount = spar.opponent_commits;

    if (spar.creator?.github_username) {
      creatorCount = await syncUserCommits(spar, spar.creator, "creator");
    }
    if (spar.opponent?.github_username) {
      opponentCount = await syncUserCommits(spar, spar.opponent, "opponent");
    }

    return NextResponse.json({
      message: "Synced",
      creator_commits: creatorCount,
      opponent_commits: opponentCount,
    });
  } catch (err) {
    console.error("[Spar Sync] Error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}

async function syncUserCommits(
  spar: Record<string, unknown>,
  user: Record<string, unknown>,
  role: "creator" | "opponent"
): Promise<number> {
  const username = user.github_username as string;
  const sparStart = new Date(spar.actual_start as string);

  try {
    const { data: events } = await octokit.rest.activity.listPublicEventsForUser({
      username,
      per_page: 100,
    });

    const pushEvents = (events || []).filter(
      (e) =>
        e.type === "PushEvent" &&
        e.created_at &&
        new Date(e.created_at) >= sparStart &&
        (!spar.actual_end || new Date(e.created_at) <= new Date(spar.actual_end as string))
    );

    for (const event of pushEvents) {
      const commits = (event.payload as { commits?: Array<{ sha: string; message?: string }> })?.commits || [];
      const repoName = event.repo?.name || "unknown";

      for (const commit of commits) {
        if (commit.message?.startsWith("Merge")) continue;

        await supabase
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
      }
    }

    // Count total commits
    const { count } = await supabase
      .from("spar_commits")
      .select("*", { count: "exact", head: true })
      .eq("spar_id", spar.id as string)
      .eq("user_id", user.id as string);

    const total = count || 0;

    // Update spar commit count
    const updateField = role === "creator" ? "creator_commits" : "opponent_commits";
    await supabase
      .from("spars")
      .update({ [updateField]: total })
      .eq("id", spar.id as string);

    return total;
  } catch (err) {
    console.error(`[Spar Sync] Error syncing @${username}:`, err);
    return (role === "creator" ? spar.creator_commits : spar.opponent_commits) as number;
  }
}

async function completeSpar(spar: Record<string, unknown>) {
  const creatorCommits = spar.creator_commits as number;
  const opponentCommits = spar.opponent_commits as number;
  let winnerId = null;

  if (creatorCommits > opponentCommits) {
    winnerId = spar.creator_id;
  } else if (opponentCommits > creatorCommits) {
    winnerId = spar.opponent_id;
  }

  await supabase
    .from("spars")
    .update({ status: "completed", winner_id: winnerId })
    .eq("id", spar.id as string);

  // Update user win/loss stats
  if (winnerId) {
    const loserId = winnerId === spar.creator_id ? spar.opponent_id : spar.creator_id;
    const creator = spar.creator as Record<string, unknown>;
    const opponent = spar.opponent as Record<string, unknown>;

    const winnerStats = winnerId === spar.creator_id ? creator : opponent;
    const loserStats = winnerId === spar.creator_id ? opponent : creator;

    await supabase
      .from("users")
      .update({ spar_wins: ((winnerStats?.spar_wins as number) || 0) + 1 })
      .eq("id", winnerId as string);

    await supabase
      .from("users")
      .update({ spar_losses: ((loserStats?.spar_losses as number) || 0) + 1 })
      .eq("id", loserId as string);
  }
}
