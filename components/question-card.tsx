"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Crosshair, Zap } from "lucide-react";

interface QuestionCardProps {
  question: {
    id: number;
    question: string;
    options: string[];
  };
  questionIndex: number;
  totalQuestions: number;
  email: string;
  previousAnswer?: number;
  onAnswer: (selectedOption: number) => void;
  timeRemaining?: number | null;
  teamId?: string | null;
}

const OPTION_BADGE = [
  "border-chart-2 bg-chart-2/15 text-chart-2",
  "border-chart-3 bg-chart-3/15 text-chart-3",
  "border-chart-5 bg-chart-5/15 text-chart-5",
  "border-chart-1 bg-chart-1/15 text-chart-1",
] as const;

const OPTION_SELECTED = [
  "border-chart-2 bg-chart-2 text-white shadow-[0_5px_0_0] shadow-chart-2/50",
  "border-chart-3 bg-chart-3 text-white shadow-[0_5px_0_0] shadow-chart-3/50",
  "border-chart-5 bg-chart-5 text-white shadow-[0_5px_0_0] shadow-chart-5/50",
  "border-chart-1 bg-chart-1 text-white shadow-[0_5px_0_0] shadow-chart-1/50",
] as const;

export function QuestionCard({
  question,
  questionIndex,
  totalQuestions,
  email,
  previousAnswer,
  onAnswer,
  timeRemaining,
  teamId,
}: QuestionCardProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(
    previousAnswer !== undefined ? previousAnswer : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmittedOption, setLastSubmittedOption] = useState<number | null>(
    previousAnswer !== undefined ? previousAnswer : null,
  );

  useEffect(() => {
    setSelectedOption(previousAnswer !== undefined ? previousAnswer : null);
    setLastSubmittedOption(
      previousAnswer !== undefined ? previousAnswer : null,
    );
  }, [questionIndex, previousAnswer]);

  const handleOptionSelect = async (optionIndex: number) => {
    if (optionIndex === lastSubmittedOption) return;

    setSelectedOption(optionIndex);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          questionIndex,
          selectedOption: optionIndex,
          teamId,
        }),
      });

      if (res.ok) {
        setLastSubmittedOption(optionIndex);
        onAnswer(optionIndex);
        toast.success("Locked in!");
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to submit answer");
        setSelectedOption(lastSubmittedOption);
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Network error. Please try again.");
      setSelectedOption(lastSubmittedOption);
    } finally {
      setIsSubmitting(false);
    }
  };

  const qNum = questionIndex + 1;
  const safeTotal = Math.max(totalQuestions, 1);

  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <div
        className={cn(
          "relative overflow-hidden rounded-[1.75rem] border-4 border-primary/30 bg-card p-5 shadow-xl sm:p-8",
          "shadow-[0_14px_0_0_oklch(0.62_0.21_42_/_0.12)]",
        )}
      >
        <div className="pointer-events-none absolute -right-16 top-0 h-40 w-40 rounded-full bg-chart-4/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-36 w-36 rounded-full bg-chart-2/15 blur-3xl" />

        <div className="relative mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-chart-2/50 bg-linear-to-br from-chart-2/25 to-primary/20 shadow-inner">
              <Crosshair className="h-6 w-6 text-primary" strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-black text-[10px] uppercase tracking-[0.3em] text-chart-2">
                Question
              </p>
              <p className="font-black tabular-nums text-foreground">
                <span className="text-3xl text-primary sm:text-4xl">{qNum}</span>
                <span className="text-lg text-muted-foreground sm:text-xl">
                  {" "}
                  / {totalQuestions}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            {timeRemaining !== null && timeRemaining !== undefined && (
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-2xl border-2 px-3 py-2 font-black tabular-nums shadow-sm",
                  timeRemaining <= 10
                    ? "animate-pulse border-destructive bg-destructive/15 text-destructive"
                    : "border-chart-4/50 bg-chart-4/20 text-foreground",
                )}
              >
                <Zap
                  className={cn(
                    "h-4 w-4",
                    timeRemaining <= 10 ? "text-destructive" : "text-chart-1",
                  )}
                  strokeWidth={2.5}
                />
                <span className="text-sm">{timeRemaining}s</span>
              </div>
            )}
            <div className="flex max-w-[200px] flex-wrap items-center gap-1.5 rounded-full border-2 border-border bg-muted/60 px-2 py-1.5 sm:max-w-none">
              {Array.from({ length: safeTotal }, (_, i) => (
                <span
                  key={i}
                  title={`Question ${i + 1}`}
                  className={cn(
                    "h-2.5 w-2.5 rounded-full transition-all duration-300",
                    i < questionIndex
                      ? "bg-success shadow-sm"
                      : i === questionIndex
                        ? "scale-125 bg-primary ring-2 ring-primary/50"
                        : "bg-border",
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        <h2 className="relative mb-8 text-pretty text-lg font-black leading-snug tracking-tight text-foreground sm:text-2xl">
          {question.question}
        </h2>

        <div className="relative space-y-3">
          {question.options.map((option, index) => {
            const isSelected = selectedOption === index;
            const isSubmitted = lastSubmittedOption === index;
            const badge = OPTION_BADGE[index % OPTION_BADGE.length];
            const selectedStyle = OPTION_SELECTED[index % OPTION_SELECTED.length];

            return (
              <button
                key={`${questionIndex}-${index}`}
                type="button"
                onClick={() => handleOptionSelect(index)}
                disabled={isSubmitting}
                className={cn(
                  "group w-full rounded-2xl border-4 p-4 text-left transition-all duration-200",
                  "focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/25",
                  !isSubmitting &&
                    "cursor-pointer hover:-translate-y-0.5 active:translate-y-0",
                  isSelected || isSubmitted
                    ? selectedStyle
                    : "border-border bg-card hover:border-primary/40 hover:shadow-md",
                  isSubmitting && "cursor-wait opacity-75",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 text-sm font-black transition-colors",
                      isSelected || isSubmitted
                        ? "border-white/35 bg-white/20 text-white"
                        : cn("border-current bg-background/80", badge),
                    )}
                  >
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="flex-1 text-base font-bold leading-snug">
                    {option}
                  </span>
                  {isSubmitted && (
                    <span className="shrink-0 rounded-lg bg-white/25 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                      Saved
                    </span>
                  )}
                  {isSubmitting && isSelected && (
                    <div className="h-6 w-6 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {lastSubmittedOption !== null && (
          <div className="relative mt-6 rounded-2xl border-4 border-success/40 bg-linear-to-r from-success/15 via-chart-3/10 to-success/15 p-4 text-center">
            <p className="text-sm font-black uppercase tracking-wide text-success">
              Answer locked in
            </p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              Tap another choice anytime to change your answer.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
