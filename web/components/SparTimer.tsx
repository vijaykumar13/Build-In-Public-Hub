"use client";

import { useEffect, useState } from "react";
import { Clock, Flame } from "lucide-react";

interface SparTimerProps {
  targetTime: string;
  label: "starts" | "ends";
  onComplete?: () => void;
}

function getTimeRemaining(target: Date) {
  const now = new Date();
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) return { total: 0, hours: 0, minutes: 0, seconds: 0 };

  return {
    total: diff,
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function SparTimer({ targetTime, label, onComplete }: SparTimerProps) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeRemaining(new Date(targetTime)));

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getTimeRemaining(new Date(targetTime));
      setTimeLeft(remaining);

      if (remaining.total <= 0) {
        clearInterval(interval);
        onComplete?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTime, onComplete]);

  if (timeLeft.total <= 0) {
    return (
      <div className="flex items-center gap-2 text-accent font-medium">
        <Flame className="w-5 h-5" />
        <span>{label === "starts" ? "Started!" : "Time's up!"}</span>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-2 mb-2 text-muted-foreground text-sm">
        <Clock className="w-4 h-4" />
        <span>{label === "starts" ? "Starts in" : "Time remaining"}</span>
      </div>
      <div className="flex items-center justify-center gap-2 font-mono">
        <div className="glass-card rounded-lg px-4 py-3 min-w-[70px]">
          <div className="text-3xl font-bold gradient-text">{pad(timeLeft.hours)}</div>
          <div className="text-xs text-muted-foreground mt-1">hours</div>
        </div>
        <span className="text-2xl font-bold text-muted-foreground">:</span>
        <div className="glass-card rounded-lg px-4 py-3 min-w-[70px]">
          <div className="text-3xl font-bold gradient-text">{pad(timeLeft.minutes)}</div>
          <div className="text-xs text-muted-foreground mt-1">mins</div>
        </div>
        <span className="text-2xl font-bold text-muted-foreground">:</span>
        <div className="glass-card rounded-lg px-4 py-3 min-w-[70px]">
          <div className="text-3xl font-bold gradient-text">{pad(timeLeft.seconds)}</div>
          <div className="text-xs text-muted-foreground mt-1">secs</div>
        </div>
      </div>
    </div>
  );
}
