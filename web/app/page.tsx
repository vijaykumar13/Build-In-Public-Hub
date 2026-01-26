import { Rocket } from "lucide-react";
import { Leaderboard, Developer } from "@/components/Leaderboard";
import { supabase } from "@/lib/supabase";
import { AuthButton } from "@/components/AuthButton";

// Revalidate every 60 seconds
export const revalidate = 60;

async function getLeaderboardData(): Promise<Developer[]> {
  const { data: developers, error } = await supabase
    .from('developers')
    .select(`
      *,
      stats_history (
        github_commits_last_30_days,
        twitter_followers
      )
    `)
    .order('total_score', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }

  // Transform DB data to Component Data
  return developers.map((dev, index) => {
    // Get latest stats
    const latestStats = dev.stats_history?.[0] || {};

    // Simple mock calculation for total score if 0
    // Real algo would be in the backend/ingestion
    const consistency = latestStats.github_commits_last_30_days || 0;
    const engagement = latestStats.twitter_followers || 0;

    // If scores are not pre-calculated in DB, calculate on fly for now
    const totalScore = dev.total_score || (consistency * 0.5 + engagement * 0.01);

    return {
      rank: index + 1,
      name: dev.full_name || dev.username,
      username: dev.username,
      consistencyScore: Math.min(100, consistency), // Cap at 100 for graph
      engagementScore: engagement,
      totalScore: totalScore,
      change: 0, // Need historical comparison for this
      avatar_url: dev.avatar_url
    };
  });
}

export default async function Home() {
  const developers = await getLeaderboardData();

  return (
    <div className="min-h-screen bg-[#0F0F12] text-white selection:bg-purple-500/30">
      {/* Navbar */}
      <nav className="border-b border-white/10 bg-[#0F0F12]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-bold text-xl tracking-tight flex items-center gap-2">
            <Rocket className="w-6 h-6 text-purple-500" />
            <span>Hustle<span className="text-purple-500">Hub</span></span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-zinc-400">
            <a href="#" className="hover:text-white transition-colors">Leaderboard</a>
            <a href="#" className="hover:text-white transition-colors">Feed</a>
            <a href="#" className="hover:text-white transition-colors">Submit</a>
            <AuthButton />
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
            Proof of Work <br /> for Indie Hackers.
          </h1>
          <p className="text-lg text-zinc-400 mb-8">
            Track your shipping consistency, engagement, and launches.
            Compete on the global leaderboard.
          </p>
        </div>

        {/* Leaderboard */}
        <Leaderboard developers={developers} />
      </main>
    </div>
  );
}
