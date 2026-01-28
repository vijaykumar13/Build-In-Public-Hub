import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { supabase } from "@/lib/supabase";
import { PAYMENTS_ENABLED } from "@/lib/stripe";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sparId } = await params;

    // Get the spar
    const { data: spar, error: sparError } = await supabase
      .from("spars")
      .select("*, creator:users!spars_creator_id_fkey(*)")
      .eq("id", sparId)
      .single();

    if (sparError || !spar) {
      return NextResponse.json({ error: "Spar not found" }, { status: 404 });
    }

    if (spar.status !== "pending") {
      return NextResponse.json({ error: "Spar is not open for acceptance" }, { status: 400 });
    }

    // Get or create opponent user
    const githubUsername = (session.user as { login?: string }).login
      || session.user.name
      || session.user.email?.split("@")[0]
      || "unknown";

    // Can't accept your own spar
    if (spar.creator?.github_username === githubUsername) {
      return NextResponse.json({ error: "You can't accept your own spar" }, { status: 400 });
    }

    // If spar has a specific opponent, verify it matches
    if (spar.opponent_github_username && spar.opponent_github_username.toLowerCase() !== githubUsername.toLowerCase()) {
      return NextResponse.json({ error: "This spar is not for you" }, { status: 403 });
    }

    // Get or create opponent user record
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("github_username", githubUsername)
      .single();

    let opponentId: string;

    if (existingUser) {
      opponentId = existingUser.id;
    } else {
      const { data: newUser, error: userError } = await supabase
        .from("users")
        .insert({
          github_id: githubUsername,
          github_username: githubUsername,
          avatar_url: session.user.image || null,
          email: session.user.email || null,
        })
        .select()
        .single();

      if (userError) {
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
      }
      opponentId = newUser.id;
    }

    // Schedule start time (5 minutes from now)
    const scheduledStart = new Date(Date.now() + 5 * 60 * 1000);
    const actualEnd = new Date(scheduledStart.getTime() + spar.duration_hours * 60 * 60 * 1000);

    // Update the spar
    const { data: updatedSpar, error: updateError } = await supabase
      .from("spars")
      .update({
        opponent_id: opponentId,
        opponent_github_username: githubUsername,
        status: "accepted",
        opponent_paid: !PAYMENTS_ENABLED,
        scheduled_start: scheduledStart.toISOString(),
        actual_end: actualEnd.toISOString(),
      })
      .eq("id", sparId)
      .select(`
        *,
        creator:users!spars_creator_id_fkey(*),
        opponent:users!spars_opponent_id_fkey(*)
      `)
      .single();

    if (updateError) {
      console.error("Error accepting spar:", updateError);
      return NextResponse.json({ error: "Failed to accept spar" }, { status: 500 });
    }

    return NextResponse.json({ spar: updatedSpar });
  } catch (error) {
    console.error("Error in spar accept:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
