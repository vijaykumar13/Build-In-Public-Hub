"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { Menu, X, Users, Swords, BookOpen } from "lucide-react";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg hover:bg-secondary transition-colors"
        aria-label="Toggle menu"
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {open && (
        <div className="absolute top-16 left-0 right-0 glass-card border-b border-border/50 p-4 flex flex-col gap-2 animate-fade-in">
          <a
            href="#builders"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-3 rounded-lg hover:bg-secondary transition-colors text-sm font-medium"
          >
            <Users className="w-4 h-4" />
            Builders
          </a>
          <a
            href="/spar"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-3 rounded-lg hover:bg-secondary transition-colors text-sm font-medium"
          >
            <Swords className="w-4 h-4" />
            Spar Mode
          </a>
          <a
            href="/resources"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-3 rounded-lg hover:bg-secondary transition-colors text-sm font-medium"
          >
            <BookOpen className="w-4 h-4" />
            Resources
          </a>
          {!session && (
            <div className="border-t border-border/50 pt-2 mt-2 flex flex-col gap-2">
              <button
                onClick={() => { signIn("github"); setOpen(false); }}
                className="inline-flex items-center justify-center gap-2 text-sm font-medium border-2 border-primary/50 text-foreground hover:border-primary hover:bg-primary/10 transition-all duration-300 h-10 rounded-lg px-4"
              >
                Sign In
              </button>
              <button
                onClick={() => { signIn("github"); setOpen(false); }}
                className="inline-flex items-center justify-center gap-2 text-sm bg-primary text-primary-foreground font-semibold shadow-lg hover:scale-105 transition-all duration-300 h-10 rounded-lg px-4"
              >
                Join Community
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
