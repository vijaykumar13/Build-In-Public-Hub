import { ImageResponse } from "next/og";
import { supabase } from "@/lib/supabase";

export const runtime = "edge";
export const alt = "Spar Challenge - BuildInPublicHub";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function getStatusLabel(status: string): string {
  switch (status) {
    case "pending": return "WAITING FOR OPPONENT";
    case "accepted": return "STARTING SOON";
    case "active": return "LIVE BATTLE";
    case "completed": return "COMPLETED";
    case "cancelled": return "CANCELLED";
    default: return status.toUpperCase();
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "pending": return "#fbbf24";
    case "accepted": return "#60a5fa";
    case "active": return "#22c55e";
    case "completed": return "#94a3b8";
    case "cancelled": return "#ef4444";
    default: return "#94a3b8";
  }
}

export default async function OGImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: spar } = await supabase
    .from("spars")
    .select(`
      *,
      creator:users!spars_creator_id_fkey(github_username, avatar_url),
      opponent:users!spars_opponent_id_fkey(github_username, avatar_url)
    `)
    .eq("id", id)
    .single();

  if (!spar) {
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
          Spar Not Found
        </div>
      ),
      { ...size }
    );
  }

  const statusColor = getStatusColor(spar.status);
  const statusLabel = getStatusLabel(spar.status);
  const creatorAvatar = spar.creator?.avatar_url || `https://github.com/${spar.creator?.github_username || "ghost"}.png`;
  const opponentAvatar = spar.opponent?.avatar_url || `https://github.com/${spar.opponent_github_username || "ghost"}.png`;
  const creatorName = spar.creator?.github_username || "Creator";
  const opponentName = spar.opponent?.github_username || spar.opponent_github_username || "???";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0a0f1a 0%, #111827 50%, #0a0f1a 100%)",
          padding: "50px 60px",
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
            background: `linear-gradient(to right, ${statusColor}, #2dd4bf)`,
          }}
        />

        {/* Header: Title + Status */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#f8fafc", maxWidth: "700px" }}>
            {spar.title}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 20px",
              borderRadius: "24px",
              background: `${statusColor}15`,
              border: `1px solid ${statusColor}44`,
            }}
          >
            {spar.status === "active" && (
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: statusColor,
                }}
              />
            )}
            <span style={{ fontSize: 16, fontWeight: 600, color: statusColor }}>
              {statusLabel}
            </span>
          </div>
        </div>

        {/* Duration */}
        <div style={{ fontSize: 18, color: "#64748b", marginBottom: "40px" }}>
          {spar.duration_hours}h Coding Spar
        </div>

        {/* VS Section */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "60px",
            flex: 1,
          }}
        >
          {/* Creator */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
            <img
              src={creatorAvatar}
              alt=""
              width={120}
              height={120}
              style={{ borderRadius: "24px", border: "3px solid #2dd4bf33" }}
            />
            <div style={{ fontSize: 24, fontWeight: 600, color: "#f8fafc" }}>
              {creatorName}
            </div>
            {(spar.status === "active" || spar.status === "completed") && (
              <div style={{ fontSize: 36, fontWeight: 700, color: "#2dd4bf" }}>
                {spar.creator_commits} commits
              </div>
            )}
          </div>

          {/* VS */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "#1e293b",
              border: "2px solid #334155",
            }}
          >
            <span style={{ fontSize: 28, fontWeight: 700, color: "#ef4444" }}>VS</span>
          </div>

          {/* Opponent */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
            <img
              src={opponentAvatar}
              alt=""
              width={120}
              height={120}
              style={{ borderRadius: "24px", border: "3px solid #ef444433" }}
            />
            <div style={{ fontSize: 24, fontWeight: 600, color: "#f8fafc" }}>
              {opponentName}
            </div>
            {(spar.status === "active" || spar.status === "completed") && (
              <div style={{ fontSize: 36, fontWeight: 700, color: "#ef4444" }}>
                {spar.opponent_commits} commits
              </div>
            )}
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
            Spar Mode - Where developers battle to ship
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
