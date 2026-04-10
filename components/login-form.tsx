"use client";

import React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Users, ArrowRight } from "lucide-react";

interface LoginFormProps {
  onLogin: (email: string, displayName: string) => void;
  teamId?: string | null;
}

export function LoginForm({ onLogin, teamId }: LoginFormProps) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [manualTeamId, setManualTeamId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const effectiveTeamId = teamId || manualTeamId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!effectiveTeamId) {
      setError("Please enter a team ID");
      toast.error("Team ID is required");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: displayName,
          teamId: effectiveTeamId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data.error || "Login failed";
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      if (effectiveTeamId) {
        localStorage.setItem(`quiz-email-${effectiveTeamId}`, data.email);
        localStorage.setItem(
          `quiz-name-${effectiveTeamId}`,
          data.name || displayName.trim(),
        );
      }
      toast.success(`You’re in, ${data.name || displayName.trim()}!`);
      onLogin(data.email, data.name || displayName.trim());
    } catch {
      const errorMsg = "Something went wrong. Please try again.";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnterTeamId = () => {
    if (manualTeamId.trim()) {
      router.push(`/quiz/${manualTeamId.trim()}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="relative overflow-hidden bg-card border-4 border-primary/25 rounded-[1.75rem] p-8 shadow-xl shadow-[0_12px_0_0_oklch(0.62_0.21_42_/_0.12)]">
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-chart-2/20 blur-2xl" />
          <div className="text-center mb-8 relative">
            <p className="mb-3 inline-block rounded-full border-2 border-chart-2/40 bg-chart-2/10 px-3 py-1 font-black text-[10px] uppercase tracking-[0.35em] text-chart-2">
              Player join
            </p>
            <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-primary/25 to-chart-2/25 flex items-center justify-center mx-auto mb-4 border-4 border-primary/30 shadow-inner">
              <Users className="w-8 h-8 text-primary" strokeWidth={2.4} />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-foreground mb-2">
              Enter the game
            </h1>
            <p className="text-sm font-semibold text-muted-foreground">
              {teamId
                ? "Add your name and school email so the host can see who's playing."
                : "Enter your team ID, then your name and email to join."}
            </p>
          </div>

          {!teamId && (
            <div className="mb-6 space-y-2">
              <label className="text-sm font-medium text-foreground">
                Team ID
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter team ID"
                  value={manualTeamId}
                  onChange={(e) => setManualTeamId(e.target.value)}
                  className="h-12 text-lg font-mono"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  onClick={handleEnterTeamId}
                  disabled={!manualTeamId.trim() || isLoading}
                  className="h-12 px-6"
                >
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Get this from your moderator or use the quiz link
              </p>
            </div>
          )}

          {effectiveTeamId && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Your name
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Alex Johnson"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
                  className="h-12 text-lg"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-12 text-lg"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <p className="text-destructive text-sm text-center">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-lg font-medium"
                disabled={isLoading || !email || displayName.trim().length < 2}
              >
                {isLoading ? "Joining..." : "Join Quiz"}
              </Button>
            </form>
          )}

          {effectiveTeamId && (
            <p className="text-xs text-muted-foreground text-center mt-6">
              No password — your name and email are only used for this quiz
              session.
            </p>
          )}

          {!teamId && (
            <div className="mt-6 pt-6 border-t border-border">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/")}
              >
                Back to Home
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
