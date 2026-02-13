import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getSupabaseAdmin } from "@/lib/supabase";

// GET — list hashtag signups with optional status filter and pagination
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
  let query = (supabase.from("hashtag_signups") as any)
    .select("*", { count: "exact" })
    .order("discovered_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && ["discovered", "added", "ignored"].includes(status)) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    signups: data,
    total: count,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  });
}

// PATCH — update a signup's status or notes
export async function PATCH(req: NextRequest) {
  const { isAdmin: admin } = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { id, status, notes } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updates: Record<string, string> = {};
  if (status && ["discovered", "added", "ignored"].includes(status)) {
    updates.status = status;
  }
  if (notes !== undefined) {
    updates.notes = notes;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("hashtag_signups") as any)
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ signup: data });
}
