import { supabase } from "@/lib/supabase";
import { Spar } from "@/lib/spar-types";
import { AuthButton } from "@/components/AuthButton";
import { SparDetailClient } from "./SparDetailClient";
import {
  CodeXml,
  ArrowLeft,
  Swords
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 15;

async function getSpar(id: string): Promise<Spar | null> {
  const { data, error } = await supabase
    .from("spars")
    .select(`
      *,
      creator:users!spars_creator_id_fkey(*),
      opponent:users!spars_opponent_id_fkey(*),
      winner:users!spars_winner_id_fkey(*)
    `)
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as Spar;
}

export default async function SparDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const spar = await getSpar(id);

  if (!spar) {
    notFound();
  }

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
              <Link href="/spar">
                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 hover:bg-secondary hover:text-secondary-foreground h-10 px-4 py-2 gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  All Spars
                </button>
              </Link>
            </div>

            <AuthButton />
          </div>
        </div>
      </nav>

      {/* Content - Client component for interactivity */}
      <SparDetailClient spar={spar} />

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
