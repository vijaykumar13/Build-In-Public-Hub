import { Leaderboard, Developer } from "@/components/Leaderboard";
import { supabase } from "@/lib/supabase";
import { AuthButton } from "@/components/AuthButton";
import {
  Users,
  Rocket,
  Calendar,
  BookOpen,
  CodeXml,
  ArrowRight,
  Sparkles
} from "lucide-react";

export const revalidate = 60;

async function getLeaderboardData(): Promise<Developer[]> {
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
    .order('total_score', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching leaderboard:', error);
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

export default async function Home() {
  const developers = await getLeaderboardData();
  const totalCommits = developers.reduce((acc, d) => acc + d.consistencyScore, 0);
  const totalFollowers = developers.reduce((acc, d) => acc + (d.followers || 0), 0);

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
              <a href="#builders">
                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 hover:bg-secondary hover:text-secondary-foreground h-10 px-4 py-2 gap-2">
                  <Users className="w-4 h-4" />
                  Builders
                </button>
              </a>
            </div>

            {/* Auth */}
            <AuthButton />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-20 hero-gradient relative overflow-hidden">
        {/* Background Blurs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>

        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 animate-fade-in">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                Join {developers.length}+ builders
              </span>
            </div>

            {/* Hero Title */}
            <h1
              className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight animate-fade-in"
              style={{ animationDelay: '0.1s' }}
            >
              Build in Public.
              <br />
              <span className="gradient-text">Grow Together.</span>
            </h1>

            {/* Subtitle */}
            <p
              className="text-lg md:text-xl text-muted-foreground mt-6 max-w-2xl mx-auto animate-fade-in"
              style={{ animationDelay: '0.2s' }}
            >
              Connect with developers who share their journey, showcase their projects,
              and inspire others to build amazing things.
            </p>

            {/* CTA Buttons */}
            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 animate-fade-in"
              style={{ animationDelay: '0.3s' }}
            >
              <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap bg-primary text-primary-foreground font-semibold shadow-lg glow-primary hover:scale-105 hover:shadow-xl transition-all duration-300 h-14 rounded-xl px-10 text-lg">
                <Rocket className="w-5 h-5" />
                Start Building
              </button>
              <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium border-2 border-primary/50 text-foreground hover:border-primary hover:bg-primary/10 transition-all duration-300 h-14 rounded-xl px-10 text-lg">
                <CodeXml className="w-5 h-5" />
                Explore Builders
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-4xl mx-auto animate-fade-in"
            style={{ animationDelay: '0.4s' }}
          >
            <div className="glass-card rounded-xl p-6 text-center group hover:border-primary/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto group-hover:bg-primary/20 transition-colors">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div className="mt-4">
                <p className="text-3xl font-bold gradient-text">{developers.length.toLocaleString()}</p>
                <span className="text-xs text-accent font-medium">+12% this month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Active Builders</p>
            </div>

            <div className="glass-card rounded-xl p-6 text-center group hover:border-primary/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto group-hover:bg-primary/20 transition-colors">
                <Rocket className="w-6 h-6 text-primary" />
              </div>
              <div className="mt-4">
                <p className="text-3xl font-bold gradient-text">{totalCommits.toLocaleString()}</p>
                <span className="text-xs text-accent font-medium">+8% this week</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Commits Shipped</p>
            </div>

            <div className="glass-card rounded-xl p-6 text-center group hover:border-primary/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto group-hover:bg-primary/20 transition-colors">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div className="mt-4">
                <p className="text-3xl font-bold gradient-text">
                  {totalFollowers >= 1000000
                    ? `${(totalFollowers / 1000000).toFixed(1)}M`
                    : totalFollowers >= 1000
                      ? `${Math.round(totalFollowers / 1000)}K`
                      : totalFollowers}
                </p>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Total Followers</p>
            </div>

            <div className="glass-card rounded-xl p-6 text-center group hover:border-primary/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto group-hover:bg-primary/20 transition-colors">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div className="mt-4">
                <p className="text-3xl font-bold gradient-text">24/7</p>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Live Updates</p>
            </div>
          </div>
        </div>
      </section>

      {/* Top Builders Section */}
      <section id="builders" className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold">Top Builders</h2>
              <p className="text-muted-foreground mt-1">This month's most active community members</p>
            </div>
            <a href="#builders">
              <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 hover:bg-secondary hover:text-secondary-foreground h-10 px-4 py-2 group">
                View All
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </a>
          </div>

          <Leaderboard developers={developers.slice(0, 6)} />
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
