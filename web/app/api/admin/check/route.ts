import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";

export async function GET() {
  const { isAdmin: admin, username } = await isAdmin();
  return NextResponse.json({ isAdmin: admin, username });
}
