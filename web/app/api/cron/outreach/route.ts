import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const maxDuration = 60;

// OAuth 1.0a helper for posting tweets
function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

async function postTweet(text: string): Promise<Response> {
  const url = "https://api.twitter.com/2/tweets";
  const method = "POST";
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: process.env.TWITTER_API_KEY!,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: process.env.TWITTER_ACCESS_TOKEN!,
    oauth_version: "1.0",
  };

  // Create signature base string
  const paramString = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(oauthParams[k])}`)
    .join("&");
  const baseString = `${method}&${percentEncode(url)}&${percentEncode(paramString)}`;
  const signingKey = `${percentEncode(process.env.TWITTER_API_SECRET!)}&${percentEncode(process.env.TWITTER_ACCESS_SECRET!)}`;
  const signature = crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");
  oauthParams.oauth_signature = signature;

  const authHeader = "OAuth " + Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(", ");

  return fetch(url, {
    method,
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });
}

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  if (!cronSecret) return true;
  return false;
}

const DAILY_CAP = 10;
const COOLDOWN_DAYS = 30;

const TWEET_TEMPLATES = [
  "Hey @{username}! We noticed you're building in public. Check out BuildInPublicHub.net — a leaderboard for indie devs shipping in the open!",
  "Hey @{username}, love seeing builders ship in public! We made buildinpublichub.net for devs like you — track your progress on our leaderboard!",
  "Yo @{username}! Fellow builder here. We built buildinpublichub.net as a leaderboard for #buildinpublic devs. Would love to have you on it!",
  "@{username} Saw you're building in public — nice! We created buildinpublichub.net to spotlight indie devs. Come join the leaderboard!",
  "Hey @{username}! Building in public is awesome. We made a leaderboard for devs like you at buildinpublichub.net — check it out!",
];

function getTemplate(username: string): string {
  const idx = Math.floor(Math.random() * TWEET_TEMPLATES.length);
  return TWEET_TEMPLATES[idx].replace("{username}", username);
}

interface Signup {
  id: string;
  twitter_username: string;
  twitter_bio: string | null;
  twitter_followers: number;
  hashtag_used: string | null;
  tweet_text: string | null;
  developer_id: string | null;
}

function scorePriority(signup: Signup): number {
  let score = 0;
  const followers = signup.twitter_followers || 0;

  if (followers >= 100 && followers <= 10000) score += 30;
  else if (followers > 10000 && followers <= 50000) score += 20;
  else if (followers >= 50 && followers < 100) score += 10;

  if (signup.tweet_text?.startsWith("GitHub:")) score += 20;
  if (signup.hashtag_used?.startsWith("followers:")) score += 10;

  const bio = (signup.twitter_bio || "").toLowerCase();
  const keywords = ["build", "ship", "maker", "founder", "saas", "indie", "dev"];
  const matches = keywords.filter((kw) => bio.includes(kw));
  score += Math.min(matches.length * 5, 20);

  return score;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  // Check for Twitter write credentials
  const hasWriteAccess = !!(
    process.env.TWITTER_API_KEY &&
    process.env.TWITTER_API_SECRET &&
    process.env.TWITTER_ACCESS_TOKEN &&
    process.env.TWITTER_ACCESS_SECRET
  );

  const supabase = createClient(supabaseUrl, supabaseKey);
  const totals = { candidates: 0, processed: 0, sent: 0, pending: 0, failed: 0, dryRun: !hasWriteAccess };

  // Get candidates
  const cooldownDate = new Date();
  cooldownDate.setDate(cooldownDate.getDate() - COOLDOWN_DAYS);

  const { data: signups, error: signupsError } = await supabase
    .from("hashtag_signups")
    .select("*")
    .eq("status", "added")
    .order("discovered_at", { ascending: false })
    .limit(200);

  if (signupsError || !signups || signups.length === 0) {
    return NextResponse.json({ success: true, ...totals, message: "No candidates" });
  }

  // Exclude already-contacted
  const usernames = signups.map((s: Signup) => s.twitter_username);
  const { data: existingOutreach } = await supabase
    .from("outreach_log")
    .select("twitter_username, outreach_status, sent_at")
    .in("twitter_username", usernames);

  const contacted = new Map<string, { outreach_status: string; sent_at: string | null }>();
  for (const o of existingOutreach || []) {
    contacted.set(o.twitter_username.toLowerCase(), o);
  }

  const candidates = signups.filter((s: Signup) => {
    const existing = contacted.get(s.twitter_username.toLowerCase());
    if (!existing) return true;
    if (existing.outreach_status === "signed_up") return false;
    if (existing.sent_at && new Date(existing.sent_at) > cooldownDate) return false;
    return true;
  });

  totals.candidates = candidates.length;
  if (candidates.length === 0) {
    return NextResponse.json({ success: true, ...totals, message: "No new candidates" });
  }

  // Score and sort
  const scored = candidates
    .map((c: Signup) => ({ ...c, priority: scorePriority(c) }))
    .sort((a: Signup & { priority: number }, b: Signup & { priority: number }) => b.priority - a.priority);

  const batch = scored.slice(0, DAILY_CAP);

  for (const candidate of batch) {
    totals.processed++;
    const message = getTemplate(candidate.twitter_username);
    const source = candidate.hashtag_used?.startsWith("followers:") ? "follower_scrape" : "hashtag_monitor";

    if (!hasWriteAccess) {
      // Dry run — log as pending
      await supabase.from("outreach_log").upsert(
        {
          twitter_username: candidate.twitter_username,
          outreach_type: "mention",
          outreach_status: "pending",
          message_text: message,
          source,
          priority_score: candidate.priority,
          developer_id: candidate.developer_id,
          signup_id: candidate.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "twitter_username,outreach_type" }
      );
      totals.pending++;
    } else {
      try {
        // Post tweet using OAuth 1.0a signed request
        const tweetRes = await postTweet(message);
        if (!tweetRes.ok) {
          throw new Error(`Twitter API ${tweetRes.status}: ${await tweetRes.text()}`);
        }
        await supabase.from("outreach_log").upsert(
          {
            twitter_username: candidate.twitter_username,
            outreach_type: "mention",
            outreach_status: "sent",
            message_text: message,
            source,
            priority_score: candidate.priority,
            sent_at: new Date().toISOString(),
            developer_id: candidate.developer_id,
            signup_id: candidate.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "twitter_username,outreach_type" }
        );
        totals.sent++;
        // Pause between tweets
        await new Promise((r) => setTimeout(r, 5000));
      } catch (err) {
        console.error(`[Outreach] Failed for @${candidate.twitter_username}:`, err instanceof Error ? err.message : err);
        await supabase.from("outreach_log").upsert(
          {
            twitter_username: candidate.twitter_username,
            outreach_type: "mention",
            outreach_status: "failed",
            message_text: message,
            source,
            priority_score: candidate.priority,
            developer_id: candidate.developer_id,
            signup_id: candidate.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "twitter_username,outreach_type" }
        );
        totals.failed++;
      }
    }
  }

  return NextResponse.json({ success: true, ...totals });
}
