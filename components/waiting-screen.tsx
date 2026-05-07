"use client";

import { Gamepad2, PauseCircle, Sparkles } from "lucide-react";

interface WaitingScreenProps {
  message: string;
  email: string;
  displayName: string;
  participants?: {
    email: string;
    displayName: string;
    joinedAt: number;
  }[];
  variant?: "lobby" | "paused" | "loading";
}

export function WaitingScreen({
  message,
  email,
  displayName,
  participants,
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

  const statusText =
    variant === "paused"
      ? "The host has paused the game. Stay ready for the next round."
      : variant === "loading"
      ? "Connecting to the live quiz. Your answers are syncing in real time."
      : "You're in the lobby. The host will launch the next question soon.";

  const joinedPlayers = participants
    ? [...participants].sort((a, b) => a.joinedAt - b.joinedAt)
    : [];
  const visiblePlayers = joinedPlayers.slice(0, 4);
  const playerCount = joinedPlayers.length;
  const currentUserEmail = email.toLowerCase().trim();

  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="glass-card relative overflow-hidden rounded-4xl p-8 sm:p-10">
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-indigo-600/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-10 h-40 w-40 rounded-full bg-purple-600/10 blur-3xl" />

          <div className="relative mb-8 text-center">
            <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl border border-indigo-500/20 bg-indigo-500/10 shadow-inner shadow-indigo-500/10">
              <div className="absolute inset-0 m-auto h-24 w-24 rounded-full border border-indigo-400/30 opacity-30" />
              <Icon
                className="relative h-12 w-12 text-indigo-500"
                strokeWidth={2.2}
              />
            </div>
            <p className="mb-2 font-black text-[10px] uppercase tracking-[0.35em] text-indigo-500">
              {tagline}
            </p>
            <h2 className="mb-3 font-display text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              {message}
            </h2>
            <p className="text-sm font-semibold text-muted-foreground">
              Playing as{" "}
              <span className="font-black text-foreground">{displayName}</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{statusText}</p>
          </div>

          <div className="mt-10 rounded-[1.75rem] border border-border bg-secondary/30 p-5 shadow-inner shadow-indigo-500/5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-500">
                  Live lobby
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  Players who have joined
                </p>
              </div>
              <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.25em] text-indigo-500">
                {playerCount} player{playerCount !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="space-y-3">
              {playerCount > 0 ? (
                <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                  {visiblePlayers.map((player) => (
                    <div
                      key={player.email}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-2"
                    >
                      <span className="font-semibold">
                        {player.displayName}
                      </span>
                      {player.email.toLowerCase().trim() ===
                      currentUserEmail ? (
                        <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs font-black uppercase tracking-[0.2em] text-indigo-500">
                          You
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No players have joined yet. Once someone enters the arena
                  code, they'll appear here.
                </p>
              )}
              {playerCount > visiblePlayers.length && (
                <p className="text-xs text-muted-foreground">
                  +{playerCount - visiblePlayers.length} more joined player
                  {playerCount - visiblePlayers.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>

            <p className="mt-5 text-sm text-muted-foreground">
              Tip: keep this page open so you're ready when the host drops the
              next question.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
