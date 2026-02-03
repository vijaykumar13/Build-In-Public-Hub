import { supabase } from "@/lib/supabase";
import { ResourcesClient } from "./ResourcesClient";
import {
  CodeXml,
  Users,
  Swords,
  BookOpen,
} from "lucide-react";
import { AuthButton } from "@/components/AuthButton";

export const revalidate = 60;

interface Resource {
  id: string;
  title: string;
  description: string | null;
  type: string;
  url: string | null;
  icon_name: string;
  sort_order: number;
  featured: boolean;
}

async function getResources(): Promise<Resource[]> {
  const { data, error } = await supabase
    .from("resources")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching resources:", error);
    return [];
  }

  return data || [];
}

export default async function ResourcesPage() {
  const resources = await getResources();

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <a className="flex items-center gap-2 group" href="/">
              <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                <CodeXml className="w-5 h-5 text-primary" />
              </div>
              <span className="font-bold text-lg">
                BuildInPublic<span className="text-primary">Hub</span>
              </span>
            </a>

            <div className="hidden md:flex items-center gap-1">
              <a href="/#builders">
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
                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 bg-secondary text-secondary-foreground h-10 px-4 py-2 gap-2">
                  <BookOpen className="w-4 h-4" />
                  Resources
                </button>
              </a>
            </div>

            <AuthButton />
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-24 pb-12 hero-gradient relative overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold">
              Community <span className="gradient-text">Resources</span>
            </h1>
            <p className="text-lg text-muted-foreground mt-4">
              Guides, tools, templates, and content to help you build in public effectively.
            </p>
          </div>
        </div>
      </section>

      {/* Resources Grid with Filtering */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <ResourcesClient resources={resources} />
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
