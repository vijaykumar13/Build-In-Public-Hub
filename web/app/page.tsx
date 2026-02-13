import { Leaderboard, Developer } from "@/components/Leaderboard";
import { supabase } from "@/lib/supabase";
import { AuthButton } from "@/components/AuthButton";
import { HomepageResources } from "@/components/HomepageResources";
import { MobileNav } from "@/components/MobileNav";
import Link from "next/link";
import {
  Users,
  Rocket,
  Calendar,
  BookOpen,
  CodeXml,
  ArrowRight,
  Sparkles,
  Swords,
  Mic,
  Video,
  Trophy,
} from "lucide-react";

export const revalidate = 60;

interface Resource {
  id: string;
  title: string;
  description: string | null;
  type: string;
  url: string | null;
  icon_name: string;
}

async function getFeaturedResources(): Promise<Resource[]> {
  const { data, error } = await supabase
    .from("resources")
    .select("id, title, description, type, url, icon_name")
    .eq("featured", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching resources:", error);
    return [];
  }
  return data || [];
}

async function getLeaderboardData(): Promise<{ developers: Developer[]; lastUpdated: string | null }> {
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
    return { developers: [], lastUpdated: null };
  }

  let lastUpdated: string | null = null;

  const mapped = developers.map((dev, index) => {
    const sortedStats = (dev.stats_history || []).sort(
      (a: { recorded_at: string }, b: { recorded_at: string }) =>
        new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
    );
    const latestStats = sortedStats[0] || {};

    // Track the most recent recorded_at across all developers
    if (latestStats.recorded_at) {
      if (!lastUpdated || new Date(latestStats.recorded_at) > new Date(lastUpdated)) {
        lastUpdated = latestStats.recorded_at;
      }
    }

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

  return { developers: mapped, lastUpdated };
}

export default async function Home() {
  const [{ developers, lastUpdated }, featuredResources] = await Promise.all([
    getLeaderboardData(),
    getFeaturedResources(),
  ]);
  const totalCommits = developers.reduce((acc, d) => acc + d.consistencyScore, 0);
  const totalFollowers = developers.reduce((acc, d) => acc + (d.followers || 0), 0);

  // Format last updated time
  const lastUpdatedText = lastUpdated
    ? new Date(lastUpdated).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : 'N/A';

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
              <a href="/spar">
                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 hover:bg-secondary hover:text-secondary-foreground h-10 px-4 py-2 gap-2">
                  <Swords className="w-4 h-4" />
                  Spar Mode
                </button>
              </a>
              <a href="/resources">
                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 hover:bg-secondary hover:text-secondary-foreground h-10 px-4 py-2 gap-2">
                  <BookOpen className="w-4 h-4" />
                  Resources
                </button>
              </a>
            </div>

            {/* Auth - Desktop */}
            <AuthButton />

            {/* Mobile Nav */}
            <MobileNav />
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
              <Link href="/api/auth/signin?callbackUrl=/onboarding" className="inline-flex items-center justify-center gap-2 whitespace-nowrap bg-primary text-primary-foreground font-semibold shadow-lg glow-primary hover:scale-105 hover:shadow-xl transition-all duration-300 h-14 rounded-xl px-10 text-lg">
                <Rocket className="w-5 h-5" />
                Start Building
              </Link>
              <Link href="#builders" className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium border-2 border-primary/50 text-foreground hover:border-primary hover:bg-primary/10 transition-all duration-300 h-14 rounded-xl px-10 text-lg">
                <CodeXml className="w-5 h-5" />
                Explore Builders
              </Link>
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
              </div>
              <p className="text-sm text-muted-foreground mt-1">Active Builders</p>
            </div>

            <div className="glass-card rounded-xl p-6 text-center group hover:border-primary/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto group-hover:bg-primary/20 transition-colors">
                <Rocket className="w-6 h-6 text-primary" />
              </div>
              <div className="mt-4">
                <p className="text-3xl font-bold gradient-text">{totalCommits.toLocaleString()}</p>
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
              {lastUpdated && (
                <span className="text-xs text-accent font-medium">Updated: {lastUpdatedText}</span>
              )}
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
            <a href="/builders">
              <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 hover:bg-secondary hover:text-secondary-foreground h-10 px-4 py-2 group">
                View All
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </a>
          </div>

          <Leaderboard developers={developers.slice(0, 6)} />
        </div>
      </section>

      {/* Upcoming Events Section */}
      <section className="py-20 hero-gradient relative overflow-hidden">
        <div className="absolute top-10 right-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="container mx-auto px-4 relative">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold">Upcoming Events</h2>
              <p className="text-muted-foreground mt-1">Join live sessions, workshops, and community meetups</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Event 1 */}
            <div className="glass-card rounded-xl p-6 group hover:border-primary/30 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Mic className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-400/10 text-green-400">Live</span>
                </div>
              </div>
              <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                Build in Public AMA
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                Ask anything about building in public, growing an audience, and shipping products.
              </p>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Mar 5, 2026 · 7:00 PM EST</span>
                </div>
                <span className="text-xs text-primary font-medium">Free</span>
              </div>
            </div>

            {/* Event 2 */}
            <div className="glass-card rounded-xl p-6 group hover:border-primary/30 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <Video className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-400/10 text-blue-400">Workshop</span>
                </div>
              </div>
              <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                Ship Your MVP in 48 Hours
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                Hands-on workshop: go from idea to deployed product in a weekend. Live coding included.
              </p>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Mar 8, 2026 · 10:00 AM EST</span>
                </div>
                <span className="text-xs text-primary font-medium">Free</span>
              </div>
            </div>

            {/* Event 3 */}
            <div className="glass-card rounded-xl p-6 group hover:border-primary/30 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-400/10 flex items-center justify-center group-hover:bg-yellow-400/20 transition-colors">
                  <Trophy className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-400/10 text-yellow-400">Competition</span>
                </div>
              </div>
              <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                Weekend Spar Challenge
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                48-hour coding battle. Challenge a friend, ship features, and claim the top spot.
              </p>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Mar 15, 2026 · All Day</span>
                </div>
                <span className="text-xs text-primary font-medium">Free</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Community Resources Section */}
      {featuredResources.length > 0 && (
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold">Community Resources</h2>
                <p className="text-muted-foreground mt-1">Guides, tools, and content to help you build in public</p>
              </div>
              <a href="/resources">
                <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 hover:bg-secondary hover:text-secondary-foreground h-10 px-4 py-2 group">
                  View All
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </a>
            </div>

            <HomepageResources resources={featuredResources} />
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
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
            <div>
              <h4 className="font-semibold mb-3">Navigate</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#builders" className="hover:text-foreground transition-colors">Builders</a></li>
                <li><a href="/spar" className="hover:text-foreground transition-colors">Spar Mode</a></li>
                <li><a href="/resources" className="hover:text-foreground transition-colors">Resources</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Connect</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="https://github.com/vijaykumar13/Build-In-Public-Hub" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a></li>
                <li><a href="https://twitter.com/BuildInPublicH" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Twitter / X</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/50 mt-8 pt-6 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} BuildInPublicHub. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
