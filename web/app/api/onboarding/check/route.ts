import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const username = (session.user as { username?: string }).username;

    if (!username) {
      return NextResponse.json({ needsOnboarding: true });
    }

    // Check if user exists in developers table
    const { data: developer } = await supabase
      .from("developers")
      .select("id, username, full_name, bio")
      .eq("username", username)
      .single();

    return NextResponse.json({
      needsOnboarding: !developer,
      developer: developer || null,
    });
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
