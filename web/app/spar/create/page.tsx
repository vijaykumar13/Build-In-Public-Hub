"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CodeXml,
  Swords,
  ArrowLeft,
  Clock,
  User,
  Zap,
  AlertCircle
} from "lucide-react";
import { AuthButton } from "@/components/AuthButton";

const DURATION_OPTIONS = [
  { value: 24, label: "24 Hours", description: "Quick sprint" },
  { value: 48, label: "48 Hours", description: "Weekend battle" },
  { value: 72, label: "72 Hours", description: "Extended challenge" },
];

export default function CreateSparPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    duration_hours: 24,
    opponent_github_username: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/spar/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create spar");
      }

      // Redirect to the spar page
      router.push(`/spar/${data.spar.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  // Not logged in
  if (status === "unauthenticated") {
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
              <AuthButton />
            </div>
          </div>
        </nav>

        <div className="pt-24 pb-12 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Swords className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Sign In Required</h1>
            <p className="text-muted-foreground mb-6">
              You need to sign in with GitHub to create a spar.
            </p>
            <AuthButton />
          </div>
        </div>
      </div>
    );
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
                  Back to Spars
                </button>
              </Link>
            </div>

            <AuthButton />
          </div>
        </div>
      </nav>

      {/* Content */}
      <section className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">New Challenge</span>
              </div>
              <h1 className="text-3xl font-bold">Create a Spar</h1>
              <p className="text-muted-foreground mt-2">
                Challenge a developer to a coding battle
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="glass-card rounded-xl p-6 space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Battle Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Weekend Ship Challenge"
                    className="w-full px-4 py-3 rounded-lg bg-secondary border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    required
                    maxLength={100}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="What are you building? Any rules?"
                    className="w-full px-4 py-3 rounded-lg bg-secondary border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none"
                    rows={3}
                    maxLength={500}
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Duration
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {DURATION_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, duration_hours: option.value })}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          formData.duration_hours === option.value
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="font-bold">{option.label}</div>
                        <div className="text-sm text-muted-foreground">{option.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Opponent */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    Opponent GitHub Username <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                    <input
                      type="text"
                      value={formData.opponent_github_username}
                      onChange={(e) => setFormData({ ...formData, opponent_github_username: e.target.value })}
                      placeholder="username"
                      className="w-full pl-8 pr-4 py-3 rounded-lg bg-secondary border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Leave empty to create an open challenge anyone can accept
                  </p>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || !formData.title}
                className="w-full inline-flex items-center justify-center gap-2 whitespace-nowrap bg-primary text-primary-foreground font-semibold shadow-lg glow-primary hover:scale-[1.02] hover:shadow-xl transition-all duration-300 h-14 rounded-xl text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Swords className="w-5 h-5" />
                    Create Spar
                  </>
                )}
              </button>

              <p className="text-center text-sm text-muted-foreground">
                Free during beta! Payments coming soon.
              </p>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
