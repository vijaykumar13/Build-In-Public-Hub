"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { LogOut, User } from "lucide-react";

export function AuthButton() {
    const { data: session } = useSession();

    if (session) {
        return (
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                    {session.user?.image ? (
                        <img
                            src={session.user.image}
                            alt={session.user.name || "User"}
                            className="w-8 h-8 rounded-full ring-2 ring-border"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center ring-2 ring-border">
                            <User className="w-4 h-4 text-muted-foreground" />
                        </div>
                    )}
                    <span className="text-sm font-medium hidden md:block">
                        {session.user?.name}
                    </span>
                </div>
                <button
                    onClick={() => signOut()}
                    className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    title="Sign out"
                >
                    <LogOut className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return (
        <div className="hidden md:flex items-center gap-3">
            <button
                onClick={() => signIn("github")}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium border-2 border-primary/50 text-foreground hover:border-primary hover:bg-primary/10 transition-all duration-300 h-9 rounded-md px-3"
            >
                Sign In
            </button>
            <button
                onClick={() => signIn("github", { callbackUrl: "/onboarding" })}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm bg-primary text-primary-foreground font-semibold shadow-lg glow-primary hover:scale-105 hover:shadow-xl transition-all duration-300 h-9 rounded-md px-3"
            >
                Join Community
            </button>
        </div>
    );
}
