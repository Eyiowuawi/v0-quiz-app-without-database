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
    <div className="relative flex min-h-screen items-center justify-center bg-background bg-grid p-4">
      <div className="pointer-events-none absolute left-[10%] top-1/4 h-96 w-96 rounded-full bg-indigo-600/15 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-purple-600/15 blur-[100px]" />

      <div className="relative w-full max-w-md">
        <div className="glass-card relative overflow-hidden rounded-[2rem] p-8 sm:p-10">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-indigo-600/10 blur-3xl" />
          <div className="relative mb-8 text-center">
            <p className="mb-4 inline-flex items-center rounded-full border border-indigo-500/25 bg-indigo-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.35em] text-indigo-400">
              Player join
            </p>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
              <Users className="h-8 w-8" strokeWidth={2.4} />
            </div>
            <h1 className="mb-2 font-display text-3xl font-black uppercase italic tracking-tighter text-foreground">
              Enter the arena
            </h1>
            <p className="text-sm font-medium text-zinc-400">
              {teamId
                ? "Add your name and email so the host can see who’s playing."
                : "Enter your team ID, then your name and email to join."}
            </p>
          </div>

          {!teamId && (
            <div className="mb-6 space-y-2">
              <label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Team ID
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Team ID"
                  value={manualTeamId}
                  onChange={(e) => setManualTeamId(e.target.value)}
                  className="h-12 font-mono text-base font-bold"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  onClick={handleEnterTeamId}
                  disabled={!manualTeamId.trim() || isLoading}
                  className="h-12 shrink-0 rounded-2xl px-4"
                >
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-xs text-zinc-500">
                From your moderator or the quiz link
              </p>
            </div>
          )}

          {effectiveTeamId && (
            <form onSubmit={handleSubmit} className="relative space-y-5">
              <div className="space-y-2">
                <label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
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
                  className="h-14 text-lg font-bold"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-14 text-lg font-bold"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <p className="text-center text-sm text-destructive">{error}</p>
              )}

              <Button
                type="submit"
                className="h-14 w-full rounded-2xl text-lg font-black"
                disabled={isLoading || !email || displayName.trim().length < 2}
              >
                {isLoading ? "Joining…" : "Join quiz"}
              </Button>
            </form>
          )}

          {effectiveTeamId && (
            <p className="mt-6 text-center text-xs text-zinc-500">
              No password — your details are only used for this quiz session.
            </p>
          )}

          {!teamId && (
            <div className="mt-8 border-t border-white/5 pt-6">
              <Button
                variant="outline"
                className="w-full rounded-2xl font-bold"
                onClick={() => router.push("/")}
              >
                Back to home
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
