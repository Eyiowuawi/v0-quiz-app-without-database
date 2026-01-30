"use client"

import useSWR from "swr"
import { cn } from "@/lib/utils"

interface ScorecardProps {
  email: string
}

interface ResultData {
  email: string
  resultsAvailable: boolean
  message?: string
  correctCount: number
  totalAnswered: number
  totalQuestions: number
  percentage: number
  answers: {
    questionIndex: number
    question: string
    options: string[]
    selectedOption: number
    correctOption: number
    isCorrect: boolean
  }[]
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function Scorecard({ email }: ScorecardProps) {
  const { data, isLoading } = useSWR<ResultData>(
    `/api/quiz/results?email=${encodeURIComponent(email)}`,
    fetcher,
    { refreshInterval: 3000 }
  )

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center text-muted-foreground">Failed to load results</div>
      </div>
    )
  }

  // Results not yet available
  if (!data.resultsAvailable) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Waiting for Results</h2>
          <p className="text-muted-foreground">{data.message || 'The moderator will release results soon...'}</p>
        </div>
      </div>
    )
  }

  const getGrade = (percentage: number) => {
    if (percentage >= 90) return { grade: "A+", color: "text-green-500", message: "Outstanding!" }
    if (percentage >= 80) return { grade: "A", color: "text-green-500", message: "Excellent work!" }
    if (percentage >= 70) return { grade: "B", color: "text-blue-500", message: "Good job!" }
    if (percentage >= 60) return { grade: "C", color: "text-yellow-500", message: "Not bad!" }
    if (percentage >= 50) return { grade: "D", color: "text-orange-500", message: "Room for improvement" }
    return { grade: "F", color: "text-red-500", message: "Better luck next time!" }
  }

  const { grade, color, message } = getGrade(data.percentage)

  return (
    <div className="min-h-screen bg-background p-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-lg mb-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Quiz Complete!</h1>
            <p className="text-muted-foreground">{email}</p>
          </div>

          <div className="flex flex-col items-center mb-8">
            <div className={cn("text-7xl md:text-8xl font-bold mb-2", color)}>
              {grade}
            </div>
            <p className="text-lg text-muted-foreground">{message}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center mb-8">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-3xl font-bold text-foreground">{data.correctCount}</div>
              <div className="text-sm text-muted-foreground">Correct</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-3xl font-bold text-foreground">{data.totalAnswered}</div>
              <div className="text-sm text-muted-foreground">Answered</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-3xl font-bold text-foreground">{data.percentage}%</div>
              <div className="text-sm text-muted-foreground">Score</div>
            </div>
          </div>

          <div className="h-4 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-500 rounded-full",
                data.percentage >= 70 ? "bg-green-500" : data.percentage >= 50 ? "bg-yellow-500" : "bg-red-500"
              )}
              style={{ width: `${data.percentage}%` }}
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-foreground mb-4">Answer Review</h2>
          <div className="space-y-4">
            {data.answers && data.answers.length > 0 ? (
              data.answers
                .sort((a, b) => a.questionIndex - b.questionIndex)
                .map((answer, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-4 rounded-lg border-2",
                    answer.isCorrect ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0 mt-0.5",
                        answer.isCorrect ? "bg-green-500" : "bg-red-500"
                      )}
                    >
                      {answer.isCorrect ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm md:text-base mb-2">
                        Q{answer.questionIndex + 1}: {answer.question}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Your answer: <span className="font-medium">{String.fromCharCode(65 + answer.selectedOption)} - {answer.options?.[answer.selectedOption]}</span>
                      </p>
                      {!answer.isCorrect && (
                        <p className="text-sm text-green-600 mt-1">
                          Correct answer: <span className="font-medium">{String.fromCharCode(65 + answer.correctOption)} - {answer.options?.[answer.correctOption]}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No answers recorded</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
