"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Rocket,
  User,
  Globe,
  Twitter,
  MapPin,
  Link as LinkIcon,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  CodeXml,
  Sparkles,
} from "lucide-react";

const TOTAL_STEPS = 3;

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  // Form state
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [currentProject, setCurrentProject] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [twitterUsername, setTwitterUsername] = useState("");
  const [productHuntUsername, setProductHuntUsername] = useState("");

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    }
  }, [status, router]);

  // Check if user already completed onboarding
  useEffect(() => {
    if (status !== "authenticated") return;

    async function checkOnboarding() {
      try {
        const res = await fetch("/api/onboarding/check");
        const data = await res.json();

        if (!data.needsOnboarding) {
          router.push("/");
          return;
        }
      } catch {
        // Continue with onboarding if check fails
      }
      setChecking(false);
    }

    checkOnboarding();
  }, [status, router]);

  // Pre-fill name from GitHub
  useEffect(() => {
    if (session?.user?.name && !fullName) {
      setFullName(session.user.name);
    }
  }, [session, fullName]);

  async function handleComplete() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          bio,
          location,
          website_url: websiteUrl,
          twitter_username: twitterUsername,
          product_hunt_username: productHuntUsername,
          current_project: currentProject,
        }),
      });

      if (res.ok) {
        setStep(TOTAL_STEPS + 1); // Show success screen
        setTimeout(() => router.push("/"), 2000);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  }

  if (status === "loading" || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return null;

  const username = (session.user as { username?: string }).username || "";

  // Success screen
  if (step > TOTAL_STEPS) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-accent" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Welcome to the community!</h1>
          <p className="text-muted-foreground">
            Redirecting you to the homepage...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <nav className="border-b border-border/50 px-4 py-4">
        <div className="container mx-auto flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <CodeXml className="w-4 h-4 text-primary" />
          </div>
          <span className="font-bold">
            BuildInPublic<span className="text-primary">Hub</span>
          </span>
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Progress bar */}
          <div className="flex items-center gap-2 mb-8">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: step > i ? "100%" : "0%" }}
                />
              </div>
            ))}
          </div>

          {/* Step 1: Welcome + Basic Info */}
          {step === 1 && (
            <div className="animate-fade-in">
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-bold">Welcome, builder!</h1>
              </div>
              <p className="text-muted-foreground mb-8">
                Let&apos;s set up your public builder profile. This will appear on the leaderboard.
              </p>

              {/* GitHub info preview */}
              <div className="glass-card rounded-xl p-4 mb-6 flex items-center gap-4">
                {session.user?.image && (
                  <img
                    src={session.user.image}
                    alt=""
                    className="w-14 h-14 rounded-full ring-2 ring-primary/50"
                  />
                )}
                <div>
                  <p className="font-medium">{session.user?.name || username}</p>
                  <p className="text-sm text-muted-foreground font-mono">@{username}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Display Name <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your name"
                      className="w-full h-11 pl-10 pr-4 rounded-lg bg-secondary/50 border border-border focus:border-primary focus:outline-none transition-colors text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="City, Country"
                      className="w-full h-11 pl-10 pr-4 rounded-lg bg-secondary/50 border border-border focus:border-primary focus:outline-none transition-colors text-sm"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!fullName.trim()}
                className="w-full mt-8 h-12 rounded-lg bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 2: About You */}
          {step === 2 && (
            <div className="animate-fade-in">
              <div className="flex items-center gap-3 mb-2">
                <Rocket className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-bold">What are you building?</h1>
              </div>
              <p className="text-muted-foreground mb-8">
                Tell the community about yourself and your projects.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Full-stack developer building tools for creators..."
                    rows={3}
                    maxLength={280}
                    className="w-full px-4 py-3 rounded-lg bg-secondary/50 border border-border focus:border-primary focus:outline-none transition-colors text-sm resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-right">
                    {bio.length}/280
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Current Project
                  </label>
                  <div className="relative">
                    <CodeXml className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={currentProject}
                      onChange={(e) => setCurrentProject(e.target.value)}
                      placeholder="What are you working on right now?"
                      className="w-full h-11 pl-10 pr-4 rounded-lg bg-secondary/50 border border-border focus:border-primary focus:outline-none transition-colors text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setStep(1)}
                  className="h-12 px-6 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 h-12 rounded-lg bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:scale-[1.02] transition-all"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Social Links */}
          {step === 3 && (
            <div className="animate-fade-in">
              <div className="flex items-center gap-3 mb-2">
                <Globe className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-bold">Connect your socials</h1>
              </div>
              <p className="text-muted-foreground mb-8">
                Help others find and follow your journey. All fields are optional.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Twitter / X</label>
                  <div className="relative">
                    <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={twitterUsername}
                      onChange={(e) => setTwitterUsername(e.target.value)}
                      placeholder="@username"
                      className="w-full h-11 pl-10 pr-4 rounded-lg bg-secondary/50 border border-border focus:border-primary focus:outline-none transition-colors text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Website</label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://yoursite.com"
                      className="w-full h-11 pl-10 pr-4 rounded-lg bg-secondary/50 border border-border focus:border-primary focus:outline-none transition-colors text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Product Hunt</label>
                  <div className="relative">
                    <Rocket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={productHuntUsername}
                      onChange={(e) => setProductHuntUsername(e.target.value)}
                      placeholder="@username"
                      className="w-full h-11 pl-10 pr-4 rounded-lg bg-secondary/50 border border-border focus:border-primary focus:outline-none transition-colors text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setStep(2)}
                  className="h-12 px-6 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="flex-1 h-12 rounded-lg bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 glow-primary hover:scale-[1.02] transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Join the Community
                      <Check className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Skip option */}
          {step <= TOTAL_STEPS && step > 1 && (
            <button
              onClick={handleComplete}
              className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
            >
              Skip for now — I&apos;ll fill this in later
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
