import { Trophy, TrendingUp, Github, Twitter } from "lucide-react";
import { cn } from "@/lib/utils";

// Data Type
export type Developer = {
    rank: number;
    name: string;
    username: string;
    consistencyScore: number; // 0-100
    engagementScore: number;
    totalScore: number;
    change: number;
    avatar_url?: string;
};

interface LeaderboardProps {
    developers: Developer[];
}

export function Leaderboard({ developers }: LeaderboardProps) {
    if (developers.length === 0) {
        return (
            <div className="border border-white/10 rounded-3xl p-10 text-center bg-[#16161A]">
                <p className="text-zinc-500">No developers found yet. Run the ingestion script!</p>
            </div>
        )
    }

    return (
        <div className="border border-white/10 rounded-3xl overflow-hidden bg-[#16161A] w-full">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h3 className="font-semibold text-xl flex items-center gap-2 text-white">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Top Builders
                </h3>
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-xs text-zinc-500 font-medium tracking-wide uppercase">Live Updates</span>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="text-xs text-zinc-500 uppercase bg-white/5 border-b border-white/5">
                        <tr>
                            <th className="px-6 py-4 font-medium tracking-wider">Rank</th>
                            <th className="px-6 py-4 font-medium tracking-wider">Hacker</th>
                            <th className="px-6 py-4 font-medium tracking-wider">Consistency</th>
                            <th className="px-6 py-4 font-medium tracking-wider">Engagement</th>
                            <th className="px-6 py-4 font-medium text-right tracking-wider">Score</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                        {developers.map((dev, i) => (
                            <tr key={dev.username} className="group hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 text-zinc-500 font-mono w-16">
                                    <div className="flex flex-col items-center">
                                        <span className={cn(
                                            "font-bold text-lg",
                                            (i + 1) === 1 ? "text-yellow-500" :
                                                (i + 1) === 2 ? "text-zinc-300" :
                                                    (i + 1) === 3 ? "text-amber-700" : "text-zinc-600"
                                        )}>#{i + 1}</span>
                                        {dev.change !== 0 && (
                                            <span className={cn("text-[10px]", dev.change > 0 ? "text-green-500" : "text-red-500")}>
                                                {dev.change > 0 ? "▲" : "▼"} {Math.abs(dev.change)}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-xs font-bold ring-2 ring-transparent group-hover:ring-purple-500/50 transition-all text-zinc-300 overflow-hidden">
                                            {dev.avatar_url ? <img src={dev.avatar_url} alt={dev.username} className="w-full h-full object-cover" /> : dev.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-medium text-white group-hover:text-purple-400 transition-colors">{dev.name || dev.username}</div>
                                            <div className="text-xs text-zinc-500 flex gap-3 mt-0.5">
                                                <span className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"><Github className="w-3 h-3" /> @{dev.username}</span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-1 h-8 items-end w-32">
                                        {/* Mock consistency graph: randomized based on score */}
                                        {[...Array(12)].map((_, j) => {
                                            const height = Math.max(20, Math.random() * 100);
                                            const active = Math.random() > 0.2;
                                            return (
                                                <div
                                                    key={j}
                                                    className={cn(
                                                        "w-1.5 rounded-sm transition-all duration-500",
                                                        active ? "bg-green-500/80 group-hover:bg-green-400" : "bg-zinc-800"
                                                    )}
                                                    style={{ height: active ? `${height}%` : '15%' }}
                                                />
                                            )
                                        })}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-zinc-400">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-purple-500" />
                                        <span className="font-mono">{dev.engagementScore?.toLocaleString() || 0}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="inline-flex flex-col items-end">
                                        <span className="font-mono text-xl font-bold text-white group-hover:text-purple-400 transition-colors">
                                            {(dev.totalScore || 0).toFixed(1)}
                                        </span>
                                        <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-bold">Hustle Score</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
