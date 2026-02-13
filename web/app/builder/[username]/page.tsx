import { supabase } from "@/lib/supabase";
import { AuthButton } from "@/components/AuthButton";
import { ShareButton } from "@/components/ShareButton";
import {
  CodeXml,
  ArrowLeft,
  Trophy,
  GitBranch,
  Star,
  MapPin,
  Globe,
  ExternalLink,
  Rocket,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 60;

type DeveloperData = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  website_url: string | null;
  twitter_username: string | null;
  product_hunt_username: string | null;
  total_score: number;
  current_project: string | null;
  created_at: string;
  stats_history: {
    github_commits_last_30_days: number;
    twitter_followers: number;
    twitter_engagement_score: number;
    recorded_at: string;
  }[];
};

async function getDeveloper(username: string): Promise<{ dev: DeveloperData; rank: number } | null> {
  // Get the specific developer
  const { data: dev, error } = await supabase
    .from("developers")
    .select(`
      *,
      stats_history (
        github_commits_last_30_days,
        twitter_followers,
        twitter_engagement_score,
        recorded_at
      )
    `)
    .eq("username", username)
    .single();

  if (error || !dev) return null;

  // Get rank by counting devs with higher score
  const { count } = await supabase
    .from("developers")
    .select("*", { count: "exact", head: true })
    .gt("total_score", dev.total_score || 0);

  const rank = (count || 0) + 1;

  return { dev: dev as DeveloperData, rank };
}

function getTrophyColor(rank: number) {
  switch (rank) {
    case 1: return { bg: "bg-yellow-400/10", text: "text-yellow-400", label: "Gold" };
    case 2: return { bg: "bg-gray-300/10", text: "text-gray-300", label: "Silver" };
    case 3: return { bg: "bg-amber-600/10", text: "text-amber-600", label: "Bronze" };
    default: return { bg: "bg-primary/10", text: "text-muted-foreground", label: "" };
  }
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${Math.round(num / 1000)}K`;
  return num.toString();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const result = await getDeveloper(username);

  if (!result) {
    return { title: "Builder Not Found" };
  }

  const { dev, rank } = result;
  const name = dev.full_name || dev.username;
  const description = dev.bio || `Ranked #${rank} builder on BuildInPublicHub`;

  return {
    title: `${name} - #${rank} Builder | BuildInPublicHub`,
    description,
    openGraph: {
      title: `${name} - #${rank} Builder`,
      description,
      type: "profile",
      url: `https://www.buildinpublichub.net/builder/${username}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} - #${rank} Builder`,
      description,
    },
  };
}

export default async function BuilderProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const result = await getDeveloper(username);

  if (!result) {
    notFound();
  }

  const { dev, rank } = result;
  const trophyColor = getTrophyColor(rank);
  const isTopThree = rank <= 3;
  const name = dev.full_name || dev.username;

  const sortedStats = (dev.stats_history || []).sort(
    (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
  );
  const latestStats = sortedStats[0] || {};
  const commits = latestStats.github_commits_last_30_days || 0;
  const followers = latestStats.twitter_followers || 0;

  const profileUrl = `https://www.buildinpublichub.net/builder/${dev.username}`;
  const tweetText = `I'm ranked #${rank} on BuildInPublicHub! Check out my builder profile #buildinpublic`;

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link className="flex items-center gap-2 group" href="/">
              <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                <CodeXml className="w-5 h-5 text-primary" />
              </div>
              <span className="font-bold text-lg">
                BuildInPublic<span className="text-primary">Hub</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              <Link href="/builders">
                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 hover:bg-secondary hover:text-secondary-foreground h-10 px-4 py-2 gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  All Builders
                </button>
              </Link>
            </div>

            <AuthButton />
          </div>
        </div>
      </nav>

      {/* Profile Header */}
      <section className="pt-24 pb-8 hero-gradient relative overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>

        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto">
            {/* Mobile back link */}
            <Link
              href="/builders"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 md:hidden"
            >
              <ArrowLeft className="w-4 h-4" />
              All Builders
            </Link>

            <div className="flex flex-col sm:flex-row items-start gap-6">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <img
                  src={dev.avatar_url || `https://github.com/${dev.username}.png`}
                  alt={name}
                  className="w-28 h-28 rounded-2xl object-cover ring-2 ring-border"
                />
                {isTopThree && (
                  <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full ${trophyColor.bg} flex items-center justify-center ring-2 ring-background`}>
                    <Trophy className={`w-4 h-4 ${trophyColor.text}`} />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-3xl font-bold">{name}</h1>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${trophyColor.bg} ${trophyColor.text}`}>
                    <Trophy className="w-3.5 h-3.5" />
                    Rank #{rank}
                  </span>
                </div>

                <a
                  href={`https://github.com/${dev.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground font-mono hover:text-primary transition-colors inline-flex items-center gap-1 mt-1"
                >
                  @{dev.username}
                  <ExternalLink className="w-3 h-3" />
                </a>

                {dev.bio && (
                  <p className="text-muted-foreground mt-3 text-lg leading-relaxed max-w-xl">
                    {dev.bio}
                  </p>
                )}

                {/* Meta info */}
                <div className="flex items-center gap-4 mt-3 flex-wrap">
                  {dev.location && (
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" />
                      {dev.location}
                    </span>
                  )}
                  {dev.current_project && (
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Rocket className="w-3.5 h-3.5" />
                      {dev.current_project}
                    </span>
                  )}
                </div>

                {/* Share button */}
                <div className="mt-4">
                  <ShareButton
                    tweetText={tweetText}
                    url={profileUrl}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats + Links */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="glass-card rounded-xl p-4 text-center">
                <div className="text-2xl font-bold gradient-text">#{rank}</div>
                <div className="text-sm text-muted-foreground mt-1">Rank</div>
              </div>
              <div className="glass-card rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-foreground flex items-center justify-center gap-1.5">
                  <GitBranch className="w-5 h-5 text-primary" />
                  {commits}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Commits (30d)</div>
              </div>
              <div className="glass-card rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-foreground flex items-center justify-center gap-1.5">
                  <Star className="w-5 h-5 text-primary" />
                  {formatNumber(followers)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Followers</div>
              </div>
              <div className="glass-card rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{Math.round(dev.total_score || 0)}</div>
                <div className="text-sm text-muted-foreground mt-1">Total Score</div>
              </div>
            </div>

            {/* Social Links */}
            <div className="glass-card rounded-xl p-6">
              <h2 className="font-semibold mb-4">Links</h2>
              <div className="flex flex-wrap gap-3">
                <a
                  href={`https://github.com/${dev.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 hover:bg-secondary text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                  GitHub
                </a>

                {dev.twitter_username && (
                  <a
                    href={`https://x.com/${dev.twitter_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 hover:bg-secondary text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    @{dev.twitter_username}
                  </a>
                )}

                {dev.product_hunt_username && (
                  <a
                    href={`https://www.producthunt.com/@${dev.product_hunt_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 hover:bg-secondary text-sm font-medium transition-colors"
                  >
                    <Rocket className="w-4 h-4" />
                    Product Hunt
                  </a>
                )}

                {dev.website_url && (
                  <a
                    href={dev.website_url.startsWith("http") ? dev.website_url : `https://${dev.website_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 hover:bg-secondary text-sm font-medium transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    Website
                  </a>
                )}
              </div>
            </div>

            {/* Member Since */}
            <div className="text-center mt-8 text-sm text-muted-foreground">
              Member since {new Date(dev.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </div>
          </div>
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
