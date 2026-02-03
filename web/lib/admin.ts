import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const ADMIN_USERS = (process.env.ADMIN_GITHUB_USERS || "")
  .split(",")
  .map((u) => u.trim().toLowerCase())
  .filter(Boolean);

export async function isAdmin(): Promise<{ isAdmin: boolean; username: string | null }> {
  const session = await getServerSession(authOptions);
  const username = (session?.user as any)?.username as string | null;

  if (!username || ADMIN_USERS.length === 0) {
    return { isAdmin: false, username };
  }

  return {
    isAdmin: ADMIN_USERS.includes(username.toLowerCase()),
    username,
  };
}
