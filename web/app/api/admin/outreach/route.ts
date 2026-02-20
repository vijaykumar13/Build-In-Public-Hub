import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getSupabaseAdmin } from "@/lib/supabase";

// GET — list outreach log with optional status filter and pagination
export async function GET(req: NextRequest) {
  const { isAdmin: admin } = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
  const offset = (page - 1) * limit;

  const supabase = getSupabaseAdmin();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from("outreach_log") as any)
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && ["pending", "sent", "failed", "replied", "signed_up"].includes(status)) {
    query = query.eq("outreach_status", status);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get summary stats
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allData } = await (supabase.from("outreach_log") as any).select("outreach_status");
  const stats = { total: 0, pending: 0, sent: 0, failed: 0, replied: 0, signed_up: 0 };
  for (const row of allData || []) {
    stats.total++;
    const s = row.outreach_status as keyof typeof stats;
    if (s in stats) stats[s]++;
  }

  return NextResponse.json({
    outreach: data,
    total: count,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
    stats,
  });
}

// PATCH — update an outreach record's status or notes
export async function PATCH(req: NextRequest) {
  const { isAdmin: admin } = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { id, outreach_status, notes } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updates: Record<string, string> = { updated_at: new Date().toISOString() };
  if (outreach_status && ["pending", "sent", "failed", "replied", "signed_up"].includes(outreach_status)) {
    updates.outreach_status = outreach_status;
  }
  if (notes !== undefined) {
    updates.notes = notes;
  }

  const supabase = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("outreach_log") as any)
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ outreach: data });
}
