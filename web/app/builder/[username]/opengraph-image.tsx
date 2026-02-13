import { ImageResponse } from "next/og";
import { supabase } from "@/lib/supabase";

export const runtime = "edge";
export const alt = "Builder Profile - BuildInPublicHub";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  // Fetch developer data
  const { data: dev } = await supabase
    .from("developers")
    .select(`
      *,
      stats_history (
        github_commits_last_30_days,
        twitter_followers,
        recorded_at
      )
    `)
    .eq("username", username)
    .single();

  if (!dev) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            background: "#0a0f1a",
            color: "#f8fafc",
            fontSize: 48,
            fontWeight: 700,
          }}
        >
          Builder Not Found
        </div>
      ),
      { ...size }
    );
  }

  // Get rank
  const { count } = await supabase
    .from("developers")
    .select("*", { count: "exact", head: true })
    .gt("total_score", dev.total_score || 0);
  const rank = (count || 0) + 1;

  const sortedStats = (dev.stats_history || []).sort(
    (a: { recorded_at: string }, b: { recorded_at: string }) =>
      new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
  );
  const latestStats = sortedStats[0] || {};
  const commits = latestStats.github_commits_last_30_days || 0;
  const followers = latestStats.twitter_followers || 0;
  const name = dev.full_name || dev.username;
  const bio = dev.bio || "Building in public";
  const avatarUrl = dev.avatar_url || `https://github.com/${dev.username}.png`;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0a0f1a 0%, #111827 50%, #0a0f1a 100%)",
          padding: "60px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(to right, #2dd4bf, #22c55e)",
          }}
        />

        {/* Main content */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "40px", flex: 1 }}>
          {/* Avatar */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <img
              src={avatarUrl}
              alt=""
              width={140}
              height={140}
              style={{
                borderRadius: "24px",
                border: "3px solid #2dd4bf33",
              }}
            />
            {/* Rank badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: rank <= 3 ? "#fbbf2433" : "#2dd4bf15",
                padding: "6px 16px",
                borderRadius: "20px",
                border: `1px solid ${rank <= 3 ? "#fbbf2444" : "#2dd4bf33"}`,
              }}
            >
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: rank <= 3 ? "#fbbf24" : "#2dd4bf",
                }}
              >
                #{rank}
              </span>
            </div>
          </div>

          {/* Info */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: "8px" }}>
            <div style={{ fontSize: 44, fontWeight: 700, color: "#f8fafc", lineHeight: 1.2 }}>
              {name}
            </div>
            <div style={{ fontSize: 22, color: "#94a3b8", fontFamily: "monospace" }}>
              @{dev.username}
            </div>
            <div
              style={{
                fontSize: 22,
                color: "#94a3b8",
                marginTop: "8px",
                lineHeight: 1.5,
                maxWidth: "600px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
              }}
            >
              {bio.length > 120 ? bio.slice(0, 120) + "..." : bio}
            </div>

            {/* Stats row */}
            <div style={{ display: "flex", gap: "32px", marginTop: "24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ fontSize: 36, fontWeight: 700, color: "#2dd4bf" }}>{commits}</div>
                <div style={{ fontSize: 16, color: "#64748b" }}>Commits (30d)</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ fontSize: 36, fontWeight: 700, color: "#2dd4bf" }}>
                  {followers >= 1000 ? `${(followers / 1000).toFixed(1)}K` : followers}
                </div>
                <div style={{ fontSize: 16, color: "#64748b" }}>Followers</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ fontSize: 36, fontWeight: 700, color: "#2dd4bf" }}>
                  {Math.round(dev.total_score || 0)}
                </div>
                <div style={{ fontSize: 16, color: "#64748b" }}>Score</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #1e293b",
            paddingTop: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "8px",
                background: "#2dd4bf20",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                color: "#2dd4bf",
                fontWeight: 700,
              }}
            >
              {"</>"}
            </div>
            <span style={{ fontSize: 20, fontWeight: 600, color: "#f8fafc" }}>
              BuildInPublic
              <span style={{ color: "#2dd4bf" }}>Hub</span>
            </span>
          </div>
          <div style={{ fontSize: 18, color: "#64748b" }}>
            buildinpublichub.net
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
