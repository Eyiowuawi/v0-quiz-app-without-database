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
    <div className="min-h-screen bg-background bg-grid pt-14">
      <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-stretch gap-2 border-b border-white/5 bg-zinc-950/80 px-3 shadow-lg shadow-black/20 backdrop-blur-xl sm:gap-3 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-sm font-black italic text-white shadow-md shadow-indigo-600/30">
            Q
          </div>
          <div className="min-w-0 leading-tight">
            <p className="font-display text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
              Live
            </p>
            <p className="truncate text-[10px] font-bold text-zinc-500 sm:text-xs">
              QuizPulse
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 px-2 py-1 sm:px-3">
          <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">
            Room
          </span>
          <span className="font-mono text-xs font-black tracking-widest text-foreground sm:text-sm">
            {formatRoomCode(teamId)}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-2.5">
          <div
            className="hidden min-w-0 flex-col items-end text-right sm:flex"
            title={email}
          >
            <span className="max-w-[140px] truncate text-xs font-black text-foreground md:max-w-[180px]">
              {participantDisplayName}
            </span>
            <span className="max-w-[140px] truncate text-[10px] font-semibold text-zinc-500 md:max-w-[180px]">
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
            className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-zinc-300 transition-transform hover:bg-white/10 active:scale-95 sm:px-3"
          >
            Exit
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}
