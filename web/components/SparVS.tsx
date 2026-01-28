"use client";

import { User } from "@/lib/spar-types";
import { Trophy, Users as UsersIcon } from "lucide-react";

interface SparVSProps {
  creator?: User;
  opponent?: User;
  opponentUsername?: string;
  creatorCommits: number;
  opponentCommits: number;
  winnerId?: string;
  isActive: boolean;
  isCompleted: boolean;
}

export function SparVS({
  creator,
  opponent,
  opponentUsername,
  creatorCommits,
  opponentCommits,
  winnerId,
  isActive,
  isCompleted,
}: SparVSProps) {
  const totalCommits = creatorCommits + opponentCommits || 1;
  const creatorPercent = Math.round((creatorCommits / totalCommits) * 100);
  const opponentPercent = 100 - creatorPercent;

  const creatorWon = isCompleted && winnerId === creator?.id;
  const opponentWon = isCompleted && winnerId === opponent?.id;

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between">
        {/* Creator Side */}
        <div className="flex-1 text-center">
          <div className="relative inline-block">
            <img
              src={creator?.avatar_url || `https://github.com/${creator?.github_username}.png`}
              alt={creator?.github_username || "Creator"}
              className={`w-20 h-20 rounded-full ring-4 ${
                creatorWon ? "ring-yellow-400" : "ring-border"
              }`}
            />
            {creatorWon && (
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-yellow-400/20 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-yellow-400" />
              </div>
            )}
          </div>
          <p className="font-semibold mt-3">@{creator?.github_username || "unknown"}</p>
          {(isActive || isCompleted) && (
            <div className="mt-2">
              <p className="text-4xl font-bold gradient-text">{creatorCommits}</p>
              <p className="text-sm text-muted-foreground">commits</p>
            </div>
          )}
        </div>

        {/* VS */}
        <div className="px-6 flex-shrink-0">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/30">
            <span className="text-xl font-bold text-primary">VS</span>
          </div>
        </div>

        {/* Opponent Side */}
        <div className="flex-1 text-center">
          {opponent || opponentUsername ? (
            <>
              <div className="relative inline-block">
                <img
                  src={opponent?.avatar_url || `https://github.com/${opponentUsername}.png`}
                  alt={opponent?.github_username || opponentUsername || "Opponent"}
                  className={`w-20 h-20 rounded-full ring-4 ${
                    opponentWon ? "ring-yellow-400" : "ring-border"
                  }`}
                />
                {opponentWon && (
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-yellow-400/20 flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                  </div>
                )}
              </div>
              <p className="font-semibold mt-3">@{opponent?.github_username || opponentUsername}</p>
              {(isActive || isCompleted) && (
                <div className="mt-2">
                  <p className="text-4xl font-bold gradient-text">{opponentCommits}</p>
                  <p className="text-sm text-muted-foreground">commits</p>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center ring-4 ring-border mx-auto">
                <UsersIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="font-semibold mt-3 text-muted-foreground">Waiting...</p>
            </>
          )}
        </div>
      </div>

      {/* Progress Bar (when active or completed) */}
      {(isActive || isCompleted) && (creatorCommits > 0 || opponentCommits > 0) && (
        <div className="mt-6">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>{creatorPercent}%</span>
            <span>{opponentPercent}%</span>
          </div>
          <div className="h-3 rounded-full bg-secondary overflow-hidden flex">
            <div
              className="h-full bg-primary rounded-l-full transition-all duration-500"
              style={{ width: `${creatorPercent}%` }}
            />
            <div
              className="h-full bg-accent rounded-r-full transition-all duration-500"
              style={{ width: `${opponentPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
