"use client";

import { Spar, getSparStatusText, getSparStatusColor } from "@/lib/spar-types";
import { Clock, Swords, Trophy, Users } from "lucide-react";
import Link from "next/link";

interface SparCardProps {
  spar: Spar;
}

function formatTimeRemaining(endTime: string): string {
  const end = new Date(endTime);
  const now = new Date();
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return "Ended";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${minutes}m`;
}

export function SparCard({ spar }: SparCardProps) {
  const statusColor = getSparStatusColor(spar.status);
  const statusText = getSparStatusText(spar.status);
  const isActive = spar.status === 'active';
  const isCompleted = spar.status === 'completed';

  return (
    <Link href={`/spar/${spar.id}`}>
      <div className="group glass-card rounded-xl p-5 hover:border-primary/30 transition-all duration-300 hover:shadow-lg cursor-pointer">
        {/* Header: Title + Status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Swords className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-1">
                {spar.title}
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{spar.duration_hours}h battle</span>
              </div>
            </div>
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor}`}>
            {statusText}
          </span>
        </div>

        {/* VS Display */}
        <div className="flex items-center justify-between py-4 border-y border-border/50">
          {/* Creator */}
          <div className="flex items-center gap-3">
            <img
              src={spar.creator?.avatar_url || `https://github.com/${spar.creator?.github_username}.png`}
              alt={spar.creator?.github_username || "Creator"}
              className="w-12 h-12 rounded-full ring-2 ring-border"
            />
            <div>
              <p className="font-medium text-sm">@{spar.creator?.github_username || "unknown"}</p>
              {(isActive || isCompleted) && (
                <p className="text-2xl font-bold gradient-text">{spar.creator_commits}</p>
              )}
            </div>
          </div>

          {/* VS */}
          <div className="px-4">
            <span className="text-xl font-bold text-muted-foreground">VS</span>
          </div>

          {/* Opponent */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-medium text-sm">
                @{spar.opponent?.github_username || spar.opponent_github_username || "???"}
              </p>
              {(isActive || isCompleted) && (
                <p className="text-2xl font-bold gradient-text">{spar.opponent_commits}</p>
              )}
            </div>
            {spar.opponent?.avatar_url || spar.opponent_github_username ? (
              <img
                src={spar.opponent?.avatar_url || `https://github.com/${spar.opponent_github_username}.png`}
                alt={spar.opponent?.github_username || spar.opponent_github_username || "Opponent"}
                className="w-12 h-12 rounded-full ring-2 ring-border"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center ring-2 ring-border">
                <Users className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between text-sm">
          {isActive && spar.actual_end && (
            <div className="flex items-center gap-2 text-accent">
              <Clock className="w-4 h-4" />
              <span>{formatTimeRemaining(spar.actual_end)} remaining</span>
            </div>
          )}
          {isCompleted && spar.winner && (
            <div className="flex items-center gap-2 text-yellow-400">
              <Trophy className="w-4 h-4" />
              <span>Winner: @{spar.winner.github_username}</span>
            </div>
          )}
          {spar.status === 'pending' && (
            <div className="text-muted-foreground">
              Waiting for opponent to accept...
            </div>
          )}
          {spar.status === 'accepted' && spar.scheduled_start && (
            <div className="flex items-center gap-2 text-blue-400">
              <Clock className="w-4 h-4" />
              <span>Starts in {formatTimeRemaining(spar.scheduled_start)}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
