import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Called to start an accepted spar (when scheduled_start time is reached)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sparId } = await params;

    const { data: spar } = await supabase
      .from("spars")
      .select("*")
      .eq("id", sparId)
      .single();

    if (!spar) {
      return NextResponse.json({ error: "Spar not found" }, { status: 404 });
    }

    if (spar.status !== "accepted") {
      return NextResponse.json({ error: "Spar is not ready to start" }, { status: 400 });
    }

    const now = new Date();
    const actualEnd = new Date(now.getTime() + spar.duration_hours * 60 * 60 * 1000);

    const { data: updatedSpar, error } = await supabase
      .from("spars")
      .update({
        status: "active",
        actual_start: now.toISOString(),
        actual_end: actualEnd.toISOString(),
      })
      .eq("id", sparId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to start spar" }, { status: 500 });
    }

    return NextResponse.json({ spar: updatedSpar });
  } catch (error) {
    console.error("Error starting spar:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
