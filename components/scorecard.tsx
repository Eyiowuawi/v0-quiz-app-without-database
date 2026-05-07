"use client";

import useSWR from "swr";
import { cn } from "@/lib/utils";
import { Crown, Target, Trophy, Zap } from "lucide-react";

interface ScorecardProps {
  email: string;
  displayName: string;
  teamId?: string | null;
}

interface ResultData {
  email: string;
  displayName?: string;
  resultsAvailable: boolean;
  message?: string;
  correctCount: number;
  totalAnswered: number;
  totalQuestions: number;
  percentage: number;
  answers: {
    questionIndex: number;
    question: string;
    options: string[];
    selectedOption: number | null;
    correctOption: number;
    isCorrect: boolean;
    answered: boolean;
  }[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function Scorecard({ email, displayName, teamId }: ScorecardProps) {
  const { data, isLoading } = useSWR<ResultData>(
    teamId
      ? `/api/quiz/results?email=${encodeURIComponent(email)}&teamId=${teamId}`
      : null,
    fetcher,
    { refreshInterval: 3000 },
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-grid">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-sm font-black uppercase tracking-[0.2em] text-zinc-500">
            Loading scores…
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-grid p-4">
        <p className="text-center font-semibold text-zinc-400">
          Failed to load results
        </p>
      </div>
    );
  }

  if (!data.resultsAvailable) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-grid p-4">
        <div className="glass-card max-w-md rounded-[2rem] border border-white/10 p-8 text-center">
          <div className="relative mx-auto mb-6 flex h-28 w-28 items-center justify-center">
            <div
              className="absolute inset-0 animate-ping rounded-full border border-indigo-500/30 opacity-40"
              style={{ animationDuration: "2s" }}
            />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-indigo-500/30 bg-indigo-500/10">
              <Trophy className="h-12 w-12 text-indigo-400" strokeWidth={2.2} />
            </div>
          </div>
          <p className="mb-2 font-black text-xs uppercase tracking-[0.35em] text-indigo-400">
            Almost there
          </p>
          <h2 className="mb-2 font-display text-2xl font-black text-foreground">
            Waiting for results
          </h2>
          <p className="text-sm font-semibold text-zinc-400">
            {data.message ||
              "Your host will unlock the scoreboard soon. Keep this tab open!"}
          </p>
        </div>
      </div>
    );
  }

  const getGrade = (percentage: number) => {
    if (percentage >= 90)
      return {
        grade: "S",
        ringClass:
          "bg-linear-to-br from-chart-4 via-chart-1 to-primary p-1 shadow-lg",
        textClass: "text-chart-1",
        message: "Legendary run!",
      };
    if (percentage >= 80)
      return {
        grade: "A+",
        ringClass:
          "bg-linear-to-br from-primary via-chart-2 to-chart-5 p-1 shadow-lg",
        textClass: "text-primary",
        message: "Crushed it!",
      };
    if (percentage >= 70)
      return {
        grade: "A",
        ringClass:
          "bg-linear-to-br from-chart-2 to-chart-5 p-1 shadow-lg",
        textClass: "text-chart-2",
        message: "Great game!",
      };
    if (percentage >= 60)
      return {
        grade: "B",
        ringClass:
          "bg-linear-to-br from-chart-5 to-chart-3 p-1 shadow-lg",
        textClass: "text-chart-5",
        message: "Nice work!",
      };
    if (percentage >= 50)
      return {
        grade: "C",
        ringClass:
          "bg-linear-to-br from-chart-4 to-chart-3 p-1 shadow-lg",
        textClass: "text-chart-4",
        message: "Keep leveling up!",
      };
    return {
      grade: "F",
      ringClass: "bg-linear-to-br from-destructive/40 to-muted p-1 shadow-md",
      textClass: "text-destructive",
      message: "Next match is yours!",
    };
  };

  const { grade, ringClass, textClass, message } = getGrade(data.percentage);
  const headerName = data.displayName?.trim() || displayName;

  return (
    <div className="min-h-[calc(100vh-56px)] bg-grid px-3 py-6 sm:px-4 sm:py-8">
      <div className="relative mx-auto max-w-2xl">
        <div className="pointer-events-none absolute -top-6 left-1/2 h-32 w-64 -translate-x-1/2 rounded-full bg-indigo-600/20 blur-3xl" />

        <div className="glass-card relative mb-6 overflow-hidden rounded-[2rem] border border-white/10 p-6 sm:p-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-90" />

          <div className="relative text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5">
              <Crown className="h-4 w-4 text-emerald-400" />
              <span className="font-black text-xs uppercase tracking-[0.25em] text-emerald-400">
                Run complete
              </span>
            </div>

            <h1 className="mb-1 font-display text-2xl font-black uppercase italic tracking-tighter text-foreground sm:text-3xl">
              Score screen
            </h1>
            <p className="mb-1 text-lg font-black text-foreground">{headerName}</p>
            <p className="mb-8 text-sm font-semibold text-muted-foreground">
              {email}
            </p>

            <div
              className={cn(
                "mx-auto mb-4 flex h-36 w-36 items-center justify-center rounded-full sm:h-44 sm:w-44",
                ringClass,
              )}
            >
              <div className="flex h-full w-full flex-col items-center justify-center rounded-full border-4 border-card bg-card">
                <span
                  className={cn(
                    "font-black tabular-nums sm:text-7xl text-6xl",
                    textClass,
                  )}
                >
                  {grade}
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Rank
                </span>
              </div>
            </div>

            <p className="mb-8 text-lg font-black text-foreground">{message}</p>

            <div className="mb-8 grid grid-cols-3 gap-2 sm:gap-4">
              <div className="rounded-2xl border-4 border-success/35 bg-success/10 p-3 text-center sm:p-4">
                <Target className="mx-auto mb-1 h-5 w-5 text-success" />
                <div className="text-2xl font-black tabular-nums text-foreground sm:text-3xl">
                  {data.correctCount}
                </div>
                <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground sm:text-xs">
                  Correct
                </div>
              </div>
              <div className="rounded-2xl border-4 border-chart-2/35 bg-chart-2/10 p-3 text-center sm:p-4">
                <Zap className="mx-auto mb-1 h-5 w-5 text-chart-2" />
                <div className="text-2xl font-black tabular-nums text-foreground sm:text-3xl">
                  {data.totalAnswered}
                </div>
                <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground sm:text-xs">
                  Answered
                </div>
              </div>
              <div className="rounded-2xl border-4 border-primary/35 bg-primary/10 p-3 text-center sm:p-4">
                <Trophy className="mx-auto mb-1 h-5 w-5 text-primary" />
                <div className="text-2xl font-black tabular-nums text-foreground sm:text-3xl">
                  {data.percentage}%
                </div>
                <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground sm:text-xs">
                  Score
                </div>
              </div>
            </div>

            <div className="mb-1 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <span>Power meter</span>
              <span>{data.percentage}%</span>
            </div>
            <div className="h-5 overflow-hidden rounded-full border-2 border-border bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700",
                  data.percentage >= 70
                    ? "bg-linear-to-r from-chart-3 to-primary"
                    : data.percentage >= 50
                      ? "bg-linear-to-r from-chart-4 to-chart-1"
                      : "bg-destructive",
                )}
                style={{ width: `${data.percentage}%` }}
              />
            </div>
          </div>
        </div>

        <div className="glass-card relative overflow-hidden rounded-[2rem] border border-white/10 p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="rounded-lg bg-indigo-500/15 px-2 py-1 font-black text-[10px] uppercase tracking-widest text-indigo-400">
              Replay
            </span>
            <h2 className="text-lg font-black tracking-tight text-foreground sm:text-xl">
              Answer review
            </h2>
          </div>

          <div className="space-y-3">
            {data.answers && data.answers.length > 0 ? (
              data.answers
                .sort((a, b) => a.questionIndex - b.questionIndex)
                .map((answer, index) => (
                  <div
                    key={index}
                    className={cn(
                      "rounded-2xl border-4 p-4",
                      answer.isCorrect && answer.answered
                        ? "border-success/45 bg-success/10"
                        : !answer.answered
                          ? "border-muted-foreground/25 bg-muted/40"
                          : "border-destructive/40 bg-destructive/10",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black text-white",
                          answer.isCorrect && answer.answered
                            ? "bg-success"
                            : !answer.answered
                              ? "bg-muted-foreground"
                              : "bg-destructive",
                        )}
                      >
                        {answer.questionIndex + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="mb-2 text-sm font-bold leading-snug text-foreground md:text-base">
                          {answer.question}
                        </p>
                        {answer.answered ? (
                          <>
                            <p className="text-xs font-semibold text-muted-foreground sm:text-sm">
                              Your pick:{" "}
                              <span className="font-black text-foreground">
                                {String.fromCharCode(65 + answer.selectedOption!)}{" "}
                                — {answer.options?.[answer.selectedOption!]}
                              </span>
                            </p>
                            {!answer.isCorrect && (
                              <p className="mt-1 text-xs font-bold text-success sm:text-sm">
                                Right answer:{" "}
                                <span className="font-black">
                                  {String.fromCharCode(
                                    65 + answer.correctOption,
                                  )}{" "}
                                  — {answer.options?.[answer.correctOption]}
                                </span>
                              </p>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="mb-1 text-xs font-black uppercase tracking-wide text-muted-foreground">
                              Skipped
                            </p>
                            <p className="text-xs font-bold text-success sm:text-sm">
                              Right answer:{" "}
                              <span className="font-black">
                                {String.fromCharCode(
                                  65 + answer.correctOption,
                                )}{" "}
                                — {answer.options?.[answer.correctOption]}
                              </span>
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              <p className="py-6 text-center text-sm font-semibold text-muted-foreground">
                No answers recorded
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
