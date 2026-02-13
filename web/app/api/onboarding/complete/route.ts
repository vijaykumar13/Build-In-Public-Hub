import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const username = (session.user as { username?: string }).username;

    if (!username) {
      return NextResponse.json({ error: "No GitHub username found" }, { status: 400 });
    }

    const body = await request.json();
    const {
      full_name,
      bio,
      location,
      website_url,
      twitter_username,
      product_hunt_username,
      current_project,
    } = body;

    // Validate required fields
    if (!full_name || full_name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Check if developer already exists
    const { data: existing } = await supabase
      .from("developers")
      .select("id")
      .eq("username", username)
      .single();

    if (existing) {
      // Update existing profile
      const { data: developer, error } = await supabase
        .from("developers")
        .update({
          full_name: full_name.trim(),
          bio: bio?.trim() || null,
          location: location?.trim() || null,
          website_url: website_url?.trim() || null,
          twitter_username: twitter_username?.trim().replace(/^@/, "") || null,
          product_hunt_username: product_hunt_username?.trim().replace(/^@/, "") || null,
          avatar_url: session.user.image || null,
          updated_at: new Date().toISOString(),
        })
        .eq("username", username)
        .select()
        .single();

      if (error) {
        console.error("Error updating developer:", error);
        return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
      }

      return NextResponse.json({ developer });
    }

    // Create new developer profile
    const { data: developer, error } = await supabase
      .from("developers")
      .insert({
        username,
        full_name: full_name.trim(),
        bio: bio?.trim() || null,
        location: location?.trim() || null,
        website_url: website_url?.trim() || null,
        twitter_username: twitter_username?.trim().replace(/^@/, "") || null,
        product_hunt_username: product_hunt_username?.trim().replace(/^@/, "") || null,
        avatar_url: session.user.image || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating developer:", error);
      return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
    }

    // Also ensure user exists in the users table (for spar mode compatibility)
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("github_username", username)
      .single();

    if (!existingUser) {
      await supabase.from("users").insert({
        github_id: username,
        github_username: username,
        avatar_url: session.user.image || null,
        email: session.user.email || null,
      });
    }

    return NextResponse.json({ developer }, { status: 201 });
  } catch (error) {
    console.error("Error in onboarding complete:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
