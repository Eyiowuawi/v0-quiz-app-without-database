"use client";

import { Gamepad2, PauseCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface WaitingScreenProps {
  message: string;
  email: string;
  displayName: string;
  variant?: "lobby" | "paused" | "loading";
}

export function WaitingScreen({
  message,
  email,
  displayName,
  variant = "lobby",
}: WaitingScreenProps) {
  const Icon =
    variant === "paused"
      ? PauseCircle
      : variant === "loading"
        ? Sparkles
        : Gamepad2;

  const tagline =
    variant === "paused"
      ? "Paused"
      : variant === "loading"
        ? "Syncing"
        : "Lobby";

  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="glass-card relative overflow-hidden rounded-[2rem] p-8 sm:p-10">
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-indigo-600/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-10 h-40 w-40 rounded-full bg-purple-600/10 blur-3xl" />

          <div className="relative mb-6 flex justify-center">
            <div
              className="absolute inset-0 m-auto h-24 w-24 animate-ping rounded-full border border-indigo-500/30 opacity-40"
              style={{ animationDuration: "2s" }}
            />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/10 shadow-inner">
              <Icon className="h-11 w-11 text-indigo-400" strokeWidth={2.2} />
            </div>
          </div>

          <p className="mb-1 font-black text-xs uppercase tracking-[0.35em] text-indigo-400">
            {tagline}
          </p>
          <h2 className="mb-3 font-display text-xl font-black tracking-tight text-foreground sm:text-2xl">
            {message}
          </h2>
          <p className="text-sm font-semibold text-zinc-400">
            Playing as{" "}
            <span className="font-black text-white">{displayName}</span>
          </p>
          <p className="mt-1 truncate text-xs font-medium text-zinc-500">
            {email}
          </p>

          <div className="mt-8 flex items-center justify-center gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/40"
                style={{
                  animation: "student-bounce 1s ease-in-out infinite",
                  animationDelay: `${i * 100}ms`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
