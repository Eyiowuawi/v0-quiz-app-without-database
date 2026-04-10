"use client";

import type { ReactNode } from "react";

function formatRoomCode(teamId: string): string {
  const t = teamId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (t.length <= 4) return t || "—";
  if (t.length <= 8) return `${t.slice(0, 4)} ${t.slice(4)}`;
  return `${t.slice(0, 4)} ${t.slice(4, 8)}`;
}

export function StudentPlayShell({
  teamId,
  email,
  participantDisplayName,
  onLeave,
  children,
}: {
  teamId: string;
  email: string;
  participantDisplayName: string;
  onLeave: () => void;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen pt-[56px]">
      <header className="fixed top-0 left-0 right-0 z-40 flex h-14 items-stretch gap-1 border-b-4 border-chart-2/40 bg-linear-to-r from-card via-accent/30 to-card px-2 shadow-md backdrop-blur-md sm:gap-2 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-35" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-success shadow-[0_0_8px_oklch(0.55_0.17_155/0.8)]" />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="font-black text-[9px] uppercase tracking-[0.2em] text-chart-2 sm:text-[10px]">
              Live game
            </p>
            <p className="truncate text-[10px] font-bold text-muted-foreground sm:text-xs">
              Quiz Runner
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center justify-center rounded-xl border-2 border-primary/35 bg-card px-2 py-1 shadow-inner sm:px-4">
          <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">
            Room
          </span>
          <span className="font-mono text-xs font-black tracking-widest text-foreground sm:text-sm">
            {formatRoomCode(teamId)}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:gap-2">
          <div
            className="hidden min-w-0 flex-col items-end text-right sm:flex"
            title={email}
          >
            <span className="max-w-[140px] truncate text-xs font-black text-foreground md:max-w-[180px]">
              {participantDisplayName}
            </span>
            <span className="max-w-[140px] truncate text-[10px] font-semibold text-muted-foreground md:max-w-[180px]">
              {email}
            </span>
          </div>
          <span
            className="max-w-[88px] truncate text-xs font-black text-foreground sm:hidden"
            title={`${participantDisplayName} · ${email}`}
          >
            {participantDisplayName}
          </span>
          <button
            type="button"
            onClick={onLeave}
            className="shrink-0 rounded-xl border-2 border-border bg-secondary px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-secondary-foreground shadow-sm transition-transform active:scale-95 hover:border-primary/45 hover:brightness-105 sm:px-3"
          >
            Exit
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}
