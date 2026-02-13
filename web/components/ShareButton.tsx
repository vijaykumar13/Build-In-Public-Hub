"use client";

import { Share2, Check, Copy } from "lucide-react";
import { useState } from "react";

interface ShareButtonProps {
  tweetText: string;
  url: string;
  variant?: "default" | "compact";
}

export function ShareButton({ tweetText, url, variant = "default" }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(url)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-1.5">
        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          title="Share on X"
          onClick={(e) => e.stopPropagation()}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        </a>
        <button
          onClick={(e) => { e.stopPropagation(); handleCopyLink(); }}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          title="Copy link"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors"
      >
        <Share2 className="w-4 h-4" />
        Share on X
      </a>
      <button
        onClick={handleCopyLink}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 hover:bg-secondary text-sm font-medium transition-colors"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-accent" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            Copy Link
          </>
        )}
      </button>
    </div>
  );
}
