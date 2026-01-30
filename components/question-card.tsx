"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface QuestionCardProps {
  question: {
    id: number
    question: string
    options: string[]
  }
  questionIndex: number
  totalQuestions: number
  email: string
  hasAnswered: boolean
  previousAnswer?: {
    selectedOption: number
    correctOption: number
    isCorrect: boolean
  }
  onAnswer: (isCorrect: boolean, correctOption: number) => void
}

export function QuestionCard({
  question,
  questionIndex,
  totalQuestions,
  email,
  hasAnswered,
  previousAnswer,
  onAnswer,
}: QuestionCardProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{
    isCorrect: boolean
    correctOption: number
  } | null>(previousAnswer || null)

  const handleSubmit = async () => {
    if (selectedOption === null) return

    setIsSubmitting(true)

    try {
      const res = await fetch("/api/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          questionIndex,
          selectedOption,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setResult({
          isCorrect: data.isCorrect,
          correctOption: data.correctOption,
        })
        onAnswer(data.isCorrect, data.correctOption)
      }
    } catch (error) {
      console.error("Submit error:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const showResult = result !== null || hasAnswered

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-medium text-muted-foreground">
            Question {questionIndex + 1} of {totalQuestions}
          </span>
          <div className="h-2 flex-1 mx-4 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((questionIndex + 1) / totalQuestions) * 100}%` }}
            />
          </div>
        </div>

        <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-6 text-balance">
          {question.question}
        </h2>

        <div className="space-y-3">
          {question.options.map((option, index) => {
            const isSelected = selectedOption === index || (previousAnswer && previousAnswer.selectedOption === index)
            const isCorrectAnswer = result?.correctOption === index || previousAnswer?.correctOption === index
            const wasWrongSelection = showResult && isSelected && !isCorrectAnswer

            return (
              <button
                key={index}
                onClick={() => !showResult && setSelectedOption(index)}
                disabled={showResult || isSubmitting}
                className={cn(
                  "w-full p-4 text-left rounded-lg border-2 transition-all duration-200",
                  "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
                  !showResult && isSelected && "border-primary bg-primary/5",
                  !showResult && !isSelected && "border-border bg-card",
                  showResult && isCorrectAnswer && "border-green-500 bg-green-500/10 text-green-700",
                  showResult && wasWrongSelection && "border-red-500 bg-red-500/10 text-red-700",
                  showResult && !isCorrectAnswer && !wasWrongSelection && "border-border bg-muted/50 text-muted-foreground",
                  (showResult || isSubmitting) && "cursor-not-allowed"
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2",
                      !showResult && isSelected && "border-primary bg-primary text-primary-foreground",
                      !showResult && !isSelected && "border-muted-foreground/30 text-muted-foreground",
                      showResult && isCorrectAnswer && "border-green-500 bg-green-500 text-white",
                      showResult && wasWrongSelection && "border-red-500 bg-red-500 text-white",
                      showResult && !isCorrectAnswer && !wasWrongSelection && "border-muted-foreground/30 text-muted-foreground"
                    )}
                  >
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="flex-1 font-medium">{option}</span>
                  {showResult && isCorrectAnswer && (
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {showResult && wasWrongSelection && (
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {!showResult && (
          <Button
            onClick={handleSubmit}
            disabled={selectedOption === null || isSubmitting}
            className="w-full mt-6 h-12 text-lg font-medium"
          >
            {isSubmitting ? "Submitting..." : "Submit Answer"}
          </Button>
        )}

        {showResult && (
          <div
            className={cn(
              "mt-6 p-4 rounded-lg text-center font-medium",
              (result?.isCorrect || previousAnswer?.isCorrect) ? "bg-green-500/10 text-green-700" : "bg-red-500/10 text-red-700"
            )}
          >
            {(result?.isCorrect || previousAnswer?.isCorrect) ? "Correct! Well done." : "Incorrect. Better luck next time!"}
          </div>
        )}
      </div>
    </div>
  )
}
