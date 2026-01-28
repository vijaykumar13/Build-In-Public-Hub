"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Spar, getSparStatusText, getSparStatusColor } from "@/lib/spar-types";
import { SparVS } from "@/components/SparVS";
import { SparTimer } from "@/components/SparTimer";
import { CommitFeed } from "@/components/CommitFeed";
import {
  Swords,
  Clock,
  Share2,
  Trophy,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface SparDetailClientProps {
  spar: Spar;
}

export function SparDetailClient({ spar: initialSpar }: SparDetailClientProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [spar, setSpar] = useState(initialSpar);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusColor = getSparStatusColor(spar.status);
  const statusText = getSparStatusText(spar.status);

  const currentUsername = (session?.user as { login?: string })?.login
    || session?.user?.name
    || "";

  const isCreator = spar.creator?.github_username === currentUsername;
  const isOpponent = spar.opponent?.github_username === currentUsername
    || spar.opponent_github_username === currentUsername;
  const canAccept = spar.status === "pending" && !isCreator && session?.user;
  const canStart = spar.status === "accepted" && (isCreator || isOpponent);

  const handleAccept = async () => {
    setIsAccepting(true);
    setError(null);
    try {
      const res = await fetch(`/api/spar/${spar.id}/accept`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSpar(data.spar);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleStart = async () => {
    setIsStarting(true);
    setError(null);
    try {
      const res = await fetch(`/api/spar/${spar.id}/start`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSpar(data.spar);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start");
    } finally {
      setIsStarting(false);
    }
  };

  const handleShare = () => {
    const text = spar.status === "active"
      ? `I'm in a coding battle on @BuildInPublicHub! Watch live: `
      : spar.status === "completed"
        ? `I just ${spar.winner_id === (isCreator ? spar.creator?.id : spar.opponent?.id) ? "won" : "competed in"} a coding spar on @BuildInPublicHub! `
        : `I just created a coding challenge on @BuildInPublicHub! Who wants to battle? `;

    const url = `${window.location.origin}/spar/${spar.id}`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      "_blank"
    );
  };

  const handleTimerComplete = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <section className="pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <span className={`inline-flex items-center gap-2 text-sm font-medium px-3 py-1 rounded-full ${statusColor} mb-4`}>
            {spar.status === "active" && (
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            )}
            {statusText}
          </span>

          <h1 className="text-3xl md:text-4xl font-bold mt-2">{spar.title}</h1>

          {spar.description && (
            <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
              {spar.description}
            </p>
          )}

          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {spar.duration_hours}h battle
            </span>
            <button
              onClick={handleShare}
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </div>

        {/* Timer */}
        {spar.status === "accepted" && spar.scheduled_start && (
          <div className="mb-8">
            <SparTimer
              targetTime={spar.scheduled_start}
              label="starts"
              onComplete={handleTimerComplete}
            />
          </div>
        )}

        {spar.status === "active" && spar.actual_end && (
          <div className="mb-8">
            <SparTimer
              targetTime={spar.actual_end}
              label="ends"
              onComplete={handleTimerComplete}
            />
          </div>
        )}

        {/* Winner Banner */}
        {spar.status === "completed" && spar.winner && (
          <div className="glass-card rounded-xl p-6 mb-8 text-center border-yellow-400/30">
            <Trophy className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
            <h2 className="text-xl font-bold">
              @{spar.winner.github_username} wins!
            </h2>
            <p className="text-muted-foreground mt-1">
              {spar.creator_commits} vs {spar.opponent_commits} commits
            </p>
          </div>
        )}

        {spar.status === "completed" && !spar.winner && (
          <div className="glass-card rounded-xl p-6 mb-8 text-center">
            <Swords className="w-10 h-10 text-primary mx-auto mb-3" />
            <h2 className="text-xl font-bold">It's a tie!</h2>
            <p className="text-muted-foreground mt-1">
              Both shipped {spar.creator_commits} commits
            </p>
          </div>
        )}

        {/* VS Display */}
        <div className="mb-8">
          <SparVS
            creator={spar.creator}
            opponent={spar.opponent}
            opponentUsername={spar.opponent_github_username}
            creatorCommits={spar.creator_commits}
            opponentCommits={spar.opponent_commits}
            winnerId={spar.winner_id}
            isActive={spar.status === "active"}
            isCompleted={spar.status === "completed"}
          />
        </div>

        {/* Action Buttons */}
        {error && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 mb-6">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {canAccept && (
          <div className="text-center mb-8">
            <button
              onClick={handleAccept}
              disabled={isAccepting}
              className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold shadow-lg glow-primary hover:scale-105 transition-all duration-300 h-14 rounded-xl px-10 text-lg disabled:opacity-50"
            >
              {isAccepting ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Accept Challenge
                </>
              )}
            </button>
            <p className="text-sm text-muted-foreground mt-2">Free during beta!</p>
          </div>
        )}

        {canStart && (
          <div className="text-center mb-8">
            <button
              onClick={handleStart}
              disabled={isStarting}
              className="inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground font-semibold shadow-lg hover:scale-105 transition-all duration-300 h-14 rounded-xl px-10 text-lg disabled:opacity-50"
            >
              {isStarting ? (
                <>
                  <div className="w-5 h-5 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Swords className="w-5 h-5" />
                  Start Battle Now
                </>
              )}
            </button>
          </div>
        )}

        {/* Commit Feed (only when active or completed) */}
        {(spar.status === "active" || spar.status === "completed") && (
          <CommitFeed
            sparId={spar.id}
            autoRefresh={spar.status === "active"}
          />
        )}
      </div>
    </section>
  );
}
