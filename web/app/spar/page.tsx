import { supabase } from "@/lib/supabase";
import { Spar } from "@/lib/spar-types";
import { SparCard } from "@/components/SparCard";
import { AuthButton } from "@/components/AuthButton";
import {
  CodeXml,
  Swords,
  Plus,
  Flame,
  Clock,
  Trophy,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";

export const revalidate = 30; // Refresh every 30 seconds

async function getSpars(): Promise<{
  active: Spar[];
  pending: Spar[];
  completed: Spar[];
}> {
  // Fetch active spars
  const { data: activeSpars } = await supabase
    .from('spars')
    .select(`
      *,
      creator:users!spars_creator_id_fkey(*),
      opponent:users!spars_opponent_id_fkey(*),
      winner:users!spars_winner_id_fkey(*)
    `)
    .eq('status', 'active')
    .order('actual_start', { ascending: false })
    .limit(10);

  // Fetch pending/accepted spars
  const { data: pendingSpars } = await supabase
    .from('spars')
    .select(`
      *,
      creator:users!spars_creator_id_fkey(*),
      opponent:users!spars_opponent_id_fkey(*)
    `)
    .in('status', ['pending', 'accepted'])
    .order('created_at', { ascending: false })
    .limit(10);

  // Fetch completed spars
  const { data: completedSpars } = await supabase
    .from('spars')
    .select(`
      *,
      creator:users!spars_creator_id_fkey(*),
      opponent:users!spars_opponent_id_fkey(*),
      winner:users!spars_winner_id_fkey(*)
    `)
    .eq('status', 'completed')
    .order('actual_end', { ascending: false })
    .limit(10);

  return {
    active: (activeSpars || []) as Spar[],
    pending: (pendingSpars || []) as Spar[],
    completed: (completedSpars || []) as Spar[],
  };
}

export default async function SparPage() {
  const { active, pending, completed } = await getSpars();
  const totalSpars = active.length + pending.length + completed.length;

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link className="flex items-center gap-2 group" href="/">
              <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                <CodeXml className="w-5 h-5 text-primary" />
              </div>
              <span className="font-bold text-lg">
                BuildInPublic<span className="text-primary">Hub</span>
              </span>
            </Link>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-1">
              <Link href="/">
                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 hover:bg-secondary hover:text-secondary-foreground h-10 px-4 py-2 gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Home
                </button>
              </Link>
            </div>

            {/* Auth */}
            <AuthButton />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-12 hero-gradient relative overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>

        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Swords className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                Developer Build Battles
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Spar Mode
            </h1>
            <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
              Challenge fellow developers to time-boxed coding battles.
              Track commits, compete in real-time, and prove who ships faster.
            </p>

            <Link href="/spar/create">
              <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap bg-primary text-primary-foreground font-semibold shadow-lg glow-primary hover:scale-105 hover:shadow-xl transition-all duration-300 h-14 rounded-xl px-10 text-lg mt-8">
                <Plus className="w-5 h-5" />
                Start a Spar
              </button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-12 max-w-2xl mx-auto">
            <div className="glass-card rounded-xl p-4 text-center">
              <div className="w-10 h-10 rounded-lg bg-green-400/10 flex items-center justify-center mx-auto">
                <Flame className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-2xl font-bold mt-2">{active.length}</p>
              <p className="text-sm text-muted-foreground">Live Now</p>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <div className="w-10 h-10 rounded-lg bg-yellow-400/10 flex items-center justify-center mx-auto">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <p className="text-2xl font-bold mt-2">{pending.length}</p>
              <p className="text-sm text-muted-foreground">Open Challenges</p>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <p className="text-2xl font-bold mt-2">{completed.length}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {totalSpars === 0 ? (
            /* Empty State */
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Swords className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">No Spars Yet</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Be the first to start a coding battle! Challenge a fellow developer
                and see who can ship more commits.
              </p>
              <Link href="/spar/create">
                <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap bg-primary text-primary-foreground font-semibold shadow-lg glow-primary hover:scale-105 transition-all duration-300 h-12 rounded-xl px-8">
                  <Plus className="w-5 h-5" />
                  Create First Spar
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Active Spars */}
              {active.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
                    <h2 className="text-2xl font-bold">Live Battles</h2>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {active.map((spar) => (
                      <SparCard key={spar.id} spar={spar} />
                    ))}
                  </div>
                </div>
              )}

              {/* Open Challenges */}
              {pending.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <Clock className="w-5 h-5 text-yellow-400" />
                    <h2 className="text-2xl font-bold">Open Challenges</h2>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {pending.map((spar) => (
                      <SparCard key={spar.id} spar={spar} />
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Spars */}
              {completed.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <Trophy className="w-5 h-5 text-muted-foreground" />
                    <h2 className="text-2xl font-bold">Recent Results</h2>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {completed.map((spar) => (
                      <SparCard key={spar.id} spar={spar} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
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
              Spar Mode - Where developers battle to ship.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
