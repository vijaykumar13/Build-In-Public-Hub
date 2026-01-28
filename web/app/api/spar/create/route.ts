import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { supabase } from "@/lib/supabase";
import { PAYMENTS_ENABLED } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, duration_hours, opponent_github_username } = body;

    // Validate input
    if (!title || title.length > 100) {
      return NextResponse.json({ error: "Title is required (max 100 chars)" }, { status: 400 });
    }

    if (![24, 48, 72].includes(duration_hours)) {
      return NextResponse.json({ error: "Duration must be 24, 48, or 72 hours" }, { status: 400 });
    }

    // Get or create user in our users table
    const githubUsername = (session.user as { login?: string }).login
      || session.user.name
      || session.user.email?.split("@")[0]
      || "unknown";

    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("github_username", githubUsername)
      .single();

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
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
        console.error("Error creating user:", userError);
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
      }
      userId = newUser.id;
    }

    // Don't allow challenging yourself
    if (opponent_github_username && opponent_github_username.toLowerCase() === githubUsername.toLowerCase()) {
      return NextResponse.json({ error: "You can't challenge yourself!" }, { status: 400 });
    }

    // Create the spar
    const sparData: Record<string, unknown> = {
      creator_id: userId,
      title: title.trim(),
      description: description?.trim() || null,
      duration_hours,
      entry_fee_cents: 999,
      status: "pending",
      creator_paid: !PAYMENTS_ENABLED, // Auto-paid when payments disabled
    };

    if (opponent_github_username) {
      sparData.opponent_github_username = opponent_github_username.trim();
    }

    const { data: spar, error: sparError } = await supabase
      .from("spars")
      .insert(sparData)
      .select(`
        *,
        creator:users!spars_creator_id_fkey(*)
      `)
      .single();

    if (sparError) {
      console.error("Error creating spar:", sparError);
      return NextResponse.json({ error: "Failed to create spar" }, { status: 500 });
    }

    return NextResponse.json({ spar }, { status: 201 });
  } catch (error) {
    console.error("Error in spar create:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
