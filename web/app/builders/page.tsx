import { Leaderboard, Developer } from "@/components/Leaderboard";
import { supabase } from "@/lib/supabase";
import { AuthButton } from "@/components/AuthButton";
import {
  CodeXml,
  Users,
  ArrowLeft,
  Search
} from "lucide-react";

export const revalidate = 60;

async function getAllBuilders(): Promise<Developer[]> {
  const { data: developers, error } = await supabase
    .from('developers')
    .select(`
      *,
      stats_history (
        github_commits_last_30_days,
        twitter_followers,
        twitter_engagement_score,
        recorded_at
      )
    `)
    .order('total_score', { ascending: false });

  if (error) {
    console.error('Error fetching builders:', error);
    return [];
  }

  return developers.map((dev, index) => {
    const sortedStats = (dev.stats_history || []).sort(
      (a: { recorded_at: string }, b: { recorded_at: string }) =>
        new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
    );
    const latestStats = sortedStats[0] || {};

    return {
      rank: index + 1,
      name: dev.full_name || dev.username,
      username: dev.username,
      consistencyScore: latestStats.github_commits_last_30_days || 0,
      engagementScore: Math.round(latestStats.twitter_engagement_score || 0),
      totalScore: dev.total_score || 0,
      change: 0,
      avatar_url: dev.avatar_url,
      twitter_username: dev.twitter_username,
      followers: latestStats.twitter_followers || 0,
      bio: dev.bio || ''
    };
  });
}

export default async function BuildersPage() {
  const developers = await getAllBuilders();

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <a className="flex items-center gap-2 group" href="/">
              <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                <CodeXml className="w-5 h-5 text-primary" />
              </div>
              <span className="font-bold text-lg">
                BuildInPublic<span className="text-primary">Hub</span>
              </span>
            </a>

            {/* Nav Links - Desktop */}
            <div className="hidden md:flex items-center gap-1">
              <a href="/">
                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 hover:bg-secondary hover:text-secondary-foreground h-10 px-4 py-2 gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Home
                </button>
              </a>
            </div>

            {/* Auth */}
            <AuthButton />
          </div>
        </div>
      </nav>

      {/* Page Header */}
      <section className="pt-24 pb-12 hero-gradient relative overflow-hidden">
        {/* Background Blurs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>

        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto">
            {/* Back Link - Mobile */}
            <a
              href="/"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 md:hidden"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </a>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">All Builders</h1>
                <p className="text-muted-foreground mt-1">
                  {developers.length} developers building in public
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Builders Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <Leaderboard developers={developers} />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <CodeXml className="w-4 h-4 text-primary" />
              </div>
              <span className="font-bold">
                BuildInPublic<span className="text-primary">Hub</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              A community for developers who build in public.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
