import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sparId } = await params;

    // Get spar with users
    const { data: spar, error: sparError } = await supabase
      .from("spars")
      .select(`
        *,
        creator:users!spars_creator_id_fkey(*),
        opponent:users!spars_opponent_id_fkey(*)
      `)
      .eq("id", sparId)
      .single();

    if (sparError || !spar) {
      return NextResponse.json({ error: "Spar not found" }, { status: 404 });
    }

    // Get commits for this spar
    const { data: commits, error: commitsError } = await supabase
      .from("spar_commits")
      .select("*, user:users(*)")
      .eq("spar_id", sparId)
      .order("committed_at", { ascending: false });

    if (commitsError) {
      return NextResponse.json({ error: "Failed to fetch commits" }, { status: 500 });
    }

    return NextResponse.json({
      spar,
      commits: commits || [],
    });
  } catch (error) {
    console.error("Error fetching spar commits:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
