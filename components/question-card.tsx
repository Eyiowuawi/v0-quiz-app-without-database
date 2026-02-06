"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuestionCardProps {
  question: {
    id: number;
    question: string;
    options: string[];
  };
  questionIndex: number;
  totalQuestions: number;
  email: string;
  previousAnswer?: number; // Just the selected option index, no correct answer info
  onAnswer: (selectedOption: number) => void;
  timeRemaining?: number | null; // For timer mode
}

export function QuestionCard({
  question,
  questionIndex,
  totalQuestions,
  email,
  previousAnswer,
  onAnswer,
  timeRemaining,
}: QuestionCardProps) {
  // Reset selected option when question changes
  const [selectedOption, setSelectedOption] = useState<number | null>(
    previousAnswer !== undefined ? previousAnswer : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmittedOption, setLastSubmittedOption] = useState<number | null>(
    previousAnswer !== undefined ? previousAnswer : null,
  );

  // Reset state when question changes
  useEffect(() => {
    setSelectedOption(previousAnswer !== undefined ? previousAnswer : null);
    setLastSubmittedOption(
      previousAnswer !== undefined ? previousAnswer : null,
    );
  }, [questionIndex, previousAnswer]);

  const handleOptionSelect = async (optionIndex: number) => {
    // If clicking the same option that's already submitted, do nothing
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
        }),
      });

      if (res.ok) {
        setLastSubmittedOption(optionIndex);
        onAnswer(optionIndex);
      } else {
        // If submission failed, revert selection
        setSelectedOption(lastSubmittedOption);
      }
    } catch (error) {
      console.error("Submit error:", error);
      // If submission failed, revert selection
      setSelectedOption(lastSubmittedOption);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-medium text-muted-foreground">
            Question {questionIndex + 1} of {totalQuestions}
          </span>
          <div className="flex items-center gap-4">
            {timeRemaining !== null && timeRemaining !== undefined && (
              <span
                className={cn(
                  "text-sm font-bold px-3 py-1 rounded-full",
                  timeRemaining <= 10
                    ? "bg-red-500/10 text-red-600"
                    : "bg-primary/10 text-primary",
                )}
              >
                {timeRemaining}s
              </span>
            )}
            <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: `${((questionIndex + 1) / totalQuestions) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-6 text-balance">
          {question.question}
        </h2>

        <div className="space-y-3">
          {question.options.map((option, index) => {
            const isSelected = selectedOption === index;
            const isSubmitted = lastSubmittedOption === index;

            return (
              <button
                key={`${questionIndex}-${index}`}
                onClick={() => handleOptionSelect(index)}
                disabled={isSubmitting}
                className={cn(
                  "w-full p-4 text-left rounded-lg border-2 transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-primary/20",
                  !isSubmitting && "hover:border-primary/50 cursor-pointer",
                  isSelected && "border-primary bg-primary/5",
                  !isSelected && "border-border bg-card",
                  isSubmitting && "cursor-wait opacity-70",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all",
                      isSelected &&
                        "border-primary bg-primary text-primary-foreground",
                      !isSelected &&
                        "border-muted-foreground/30 text-muted-foreground",
                    )}
                  >
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="flex-1 font-medium">{option}</span>
                  {isSubmitted && (
                    <svg
                      className="w-5 h-5 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                  {isSubmitting && isSelected && (
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {lastSubmittedOption !== null && (
          <div className="mt-6 p-4 rounded-lg bg-primary/10 text-primary text-center font-medium">
            Answer submitted!{" "}
            {isSubmitting
              ? "Updating..."
              : "You can change your answer by selecting another option."}
          </div>
        )}
      </div>
    </div>
  );
}
