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
        <div
          className={cn(
            "relative overflow-hidden rounded-3xl border-4 border-chart-2/35 bg-card p-8 shadow-xl",
            "shadow-[0_12px_0_0_oklch(0.62_0.21_42_/_0.15)]",
          )}
        >
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-chart-4/25 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-chart-5/20 blur-2xl" />

          <div className="relative mb-6 flex justify-center">
            <div
              className="absolute inset-0 m-auto h-24 w-24 animate-ping rounded-full border-4 border-primary/20 opacity-30"
              style={{ animationDuration: "2s" }}
            />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-primary/40 bg-linear-to-br from-primary/15 via-chart-2/15 to-accent shadow-inner">
              <Icon className="h-11 w-11 text-primary" strokeWidth={2.2} />
            </div>
          </div>

          <p className="mb-1 font-black text-xs uppercase tracking-[0.35em] text-chart-2">
            {tagline}
          </p>
          <h2 className="mb-3 text-xl font-black tracking-tight text-foreground sm:text-2xl">
            {message}
          </h2>
          <p className="text-sm font-semibold text-muted-foreground">
            Playing as{" "}
            <span className="font-black text-foreground">{displayName}</span>
          </p>
          <p className="mt-1 truncate text-xs font-medium text-muted-foreground">
            {email}
          </p>

          <div className="mt-8 flex items-center justify-center gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="h-2.5 w-2.5 rounded-full bg-primary shadow-sm"
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
