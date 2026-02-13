"use client";

import { Trophy, GitBranch, Star, ExternalLink } from "lucide-react";
import { ShareButton } from "@/components/ShareButton";
import Link from "next/link";

export type Developer = {
    rank: number;
    name: string;
    username: string;
    consistencyScore: number;
    engagementScore: number;
    totalScore: number;
    change: number;
    avatar_url?: string;
    twitter_username?: string;
    followers?: number;
    bio?: string;
};

interface LeaderboardProps {
    developers: Developer[];
}

function getTrophyColor(rank: number) {
    switch (rank) {
        case 1: return { bg: "bg-yellow-400/10", text: "text-yellow-400" };
        case 2: return { bg: "bg-gray-300/10", text: "text-gray-300" };
        case 3: return { bg: "bg-amber-600/10", text: "text-amber-600" };
        default: return { bg: "bg-primary/10", text: "text-muted-foreground" };
    }
}

function getRankBadgeColor(rank: number) {
    switch (rank) {
        case 1: return "bg-yellow-400/10";
        case 2: return "bg-gray-300/10";
        case 3: return "bg-amber-600/10";
        default: return "";
    }
}

function formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${Math.round(num / 1000)}K`;
    return num.toString();
}

export function Leaderboard({ developers }: LeaderboardProps) {
    if (developers.length === 0) {
        return (
            <div className="py-20 text-center">
                <div className="text-muted-foreground text-lg mb-2">No builders yet</div>
                <div className="text-muted-foreground/60 text-sm">Check back soon!</div>
            </div>
        );
    }

    return (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {developers.map((dev) => {
                const trophyColor = getTrophyColor(dev.rank);
                const isTopThree = dev.rank <= 3;

                const profileUrl = `https://www.buildinpublichub.net/builder/${dev.username}`;
                const tweetText = `I'm ranked #${dev.rank} on BuildInPublicHub! Check out my builder profile #buildinpublic`;

                return (
                    <Link
                        key={dev.username}
                        href={`/builder/${dev.username}`}
                        className="group glass-card rounded-xl p-5 hover:border-primary/30 transition-all duration-300 hover:shadow-lg cursor-pointer block"
                    >
                        {/* Top Row: Trophy + Avatar + Name */}
                        <div className="flex items-start gap-4">
                            {/* Trophy / Rank Badge */}
                            <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${trophyColor.bg} flex items-center justify-center`}>
                                {isTopThree ? (
                                    <Trophy className={`w-5 h-5 ${trophyColor.text}`} />
                                ) : (
                                    <span className="font-mono font-bold text-muted-foreground">#{dev.rank}</span>
                                )}
                            </div>

                            {/* Avatar with rank badge */}
                            <div className="relative flex-shrink-0">
                                <img
                                    src={dev.avatar_url || `https://github.com/${dev.username}.png`}
                                    alt={dev.name}
                                    className="w-14 h-14 rounded-full object-cover ring-2 ring-border group-hover:ring-primary/50 transition-all"
                                />
                                {isTopThree && (
                                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${getRankBadgeColor(dev.rank)} flex items-center justify-center`}>
                                        <span className="text-xs font-bold">{dev.rank}</span>
                                    </div>
                                )}
                            </div>

                            {/* Name + Username */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                                        {dev.name}
                                    </h3>
                                    <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <a
                                    href={`https://github.com/${dev.username}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-muted-foreground font-mono hover:text-primary transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    @{dev.username}
                                </a>
                                {dev.bio && (
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                        {dev.bio}
                                    </p>
                                )}
                                {!dev.bio && (
                                    <p className="text-sm text-muted-foreground/60 mt-1 line-clamp-2 italic">
                                        Building in public...
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Stats Row */}
                        <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <GitBranch className="w-4 h-4" />
                                    {dev.consistencyScore} commits
                                </span>
                                <span className="flex items-center gap-1">
                                    <Star className="w-4 h-4" />
                                    {dev.followers ? formatNumber(dev.followers) : '0'} followers
                                </span>
                            </div>
                            <ShareButton
                                tweetText={tweetText}
                                url={profileUrl}
                                variant="compact"
                            />
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}
