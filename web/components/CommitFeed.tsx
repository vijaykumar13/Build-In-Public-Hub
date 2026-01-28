"use client";

import { useEffect, useState } from "react";
import { SparCommit } from "@/lib/spar-types";
import { GitBranch, RefreshCw } from "lucide-react";

interface CommitFeedProps {
  sparId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function CommitFeed({
  sparId,
  autoRefresh = true,
  refreshInterval = 30000,
}: CommitFeedProps) {
  const [commits, setCommits] = useState<SparCommit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const syncAndFetch = async () => {
    try {
      // Trigger sync from GitHub (only does work if spar is active)
      if (autoRefresh) {
        await fetch(`/api/spar/${sparId}/sync`, { method: "POST" });
      }

      // Then fetch the latest commits
      const res = await fetch(`/api/spar/${sparId}/commits`);
      const data = await res.json();
      setCommits(data.commits || []);
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Failed to fetch commits:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    syncAndFetch();

    if (autoRefresh) {
      const interval = setInterval(syncAndFetch, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [sparId, autoRefresh, refreshInterval]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Commit Feed</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-secondary/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Commit Feed</h3>
          <span className="text-sm text-muted-foreground">({commits.length})</span>
        </div>
        <button
          onClick={syncAndFetch}
          className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {commits.length === 0 ? (
        <div className="text-center py-8">
          <GitBranch className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No commits yet</p>
          <p className="text-sm text-muted-foreground/60">Commits will appear here during the battle</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {commits.map((commit) => (
            <div
              key={commit.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
            >
              <img
                src={commit.user?.avatar_url || `https://github.com/${commit.user?.github_username}.png`}
                alt={commit.user?.github_username || ""}
                className="w-8 h-8 rounded-full ring-1 ring-border flex-shrink-0 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">@{commit.user?.github_username}</span>
                  <span className="text-xs text-muted-foreground">{formatTime(commit.committed_at)}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate mt-0.5">
                  {commit.commit_message || "No message"}
                </p>
                {commit.repo_name && (
                  <span className="text-xs text-primary/80 font-mono">{commit.repo_name}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground/50 text-center mt-4">
        Auto-refreshes every {refreshInterval / 1000}s
      </p>
    </div>
  );
}
