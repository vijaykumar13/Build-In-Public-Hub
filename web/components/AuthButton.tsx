"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { Github, LogOut, User } from "lucide-react";

export function AuthButton() {
    const { data: session } = useSession();

    if (session) {
        return (
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    {session.user?.image ? (
                        <img
                            src={session.user.image}
                            alt={session.user.name || "User"}
                            className="w-8 h-8 rounded-full border border-white/20"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-white/20">
                            <User className="w-4 h-4 text-zinc-400" />
                        </div>
                    )}
                    <span className="text-sm font-medium text-white hidden md:block">
                        {session.user?.name}
                    </span>
                </div>
                <button
                    onClick={() => signOut()}
                    className="text-xs text-zinc-400 hover:text-white transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={() => signIn("github")}
            className="bg-white text-black px-4 py-2 rounded-full font-semibold hover:bg-zinc-200 transition-colors flex items-center gap-2 text-sm"
        >
            <Github className="w-4 h-4" />
            Connect GitHub
        </button>
    );
}
