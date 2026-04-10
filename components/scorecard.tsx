'use client'

import useSWR from 'swr'
import { cn } from '@/lib/utils'

interface ScorecardProps {
  email: string
  teamId?: string | null
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
    selectedOption: number | null
    correctOption: number
    isCorrect: boolean
    answered: boolean
  }[]
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function Scorecard({ email, teamId }: ScorecardProps) {
  const { data, isLoading } = useSWR<ResultData>(
    teamId ? `/api/quiz/results?email=${encodeURIComponent(email)}&teamId=${teamId}` : null,
    fetcher,
    { refreshInterval: 3000 }
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Failed to load results</h2>
        </div>
      </div>
    )
  }

  // Results not yet available
  if (!data.resultsAvailable) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Waiting for Results</h2>
          <p className="text-muted-foreground">{data.message || 'The moderator will release results soon...'}</p>
        </div>
      </div>
    )
  }

  const getGrade = (percentage: number) => {
    if (percentage >= 90) return { grade: 'A+', color: 'text-green-500', message: 'Outstanding!' }
    if (percentage >= 80) return { grade: 'A', color: 'text-green-500', message: 'Excellent work!' }
    if (percentage >= 70) return { grade: 'B', color: 'text-blue-500', message: 'Good job!' }
    if (percentage >= 60) return { grade: 'C', color: 'text-yellow-500', message: 'Not bad!' }
    if (percentage >= 50) return { grade: 'D', color: 'text-orange-500', message: 'Room for improvement' }
    return { grade: 'F', color: 'text-red-500', message: 'Better luck next time!' }
  }

  const { grade, color, message } = getGrade(data.percentage)

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="bg-card rounded-lg shadow-lg p-8 max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-center mb-2">Quiz Complete!</h1>
        <p className="text-center text-muted-foreground mb-8">{email}</p>

        <div className="text-center mb-8">
          <div className={cn('text-6xl font-bold mb-2', color)}>{grade}</div>
          <p className="text-xl text-muted-foreground">{message}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{data.correctCount}</div>
            <div className="text-sm text-muted-foreground">Correct</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{data.totalAnswered}</div>
            <div className="text-sm text-muted-foreground">Answered</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{data.percentage}%</div>
            <div className="text-sm text-muted-foreground">Score</div>
          </div>
        </div>

        <div className="mb-8">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={cn(
                'h-2 rounded-full transition-all duration-500',
                data.percentage >= 70 ? 'bg-green-500' : data.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              )}
              style={{ width: `${data.percentage}%` }}
            />
          </div>
        </div>

        <h2 className="text-xl font-bold mb-4">Answer Review</h2>

        {data.answers && data.answers.length > 0 ? (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {data.answers
              .sort((a, b) => a.questionIndex - b.questionIndex)
              .map((answer, index) => {
                const isUnanswered = !answer.answered

                return (
                  <div
                    key={index}
                    className={cn(
                      'p-4 rounded-lg border',
                      answer.isCorrect && answer.answered
                        ? 'border-green-200 bg-green-50'
                        : !answer.answered
                          ? 'border-gray-200 bg-gray-50'
                          : 'border-red-200 bg-red-50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {answer.isCorrect && answer.answered ? (
                        <span className="text-2xl text-green-600">✓</span>
                      ) : !answer.answered ? (
                        <span className="text-2xl text-gray-400">○</span>
                      ) : (
                        <span className="text-2xl text-red-600">✗</span>
                      )}

                      <div className="flex-1">
                        <h3 className="font-semibold mb-2">
                          Q{answer.questionIndex + 1}: {answer.question}
                        </h3>
                        {answer.answered ? (
                          <>
                            <p className="text-sm mb-1">
                              Your answer: {String.fromCharCode(65 + answer.selectedOption!)} -{' '}
                              {answer.options?.[answer.selectedOption!]}
                            </p>
                            {!answer.isCorrect && (
                              <p className="text-sm text-red-600">
                                Correct answer: {String.fromCharCode(65 + answer.correctOption)} -{' '}
                                {answer.options?.[answer.correctOption]}
                              </p>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-gray-600 mb-1">Not answered</p>
                            <p className="text-sm">
                              Correct answer: {String.fromCharCode(65 + answer.correctOption)} -{' '}
                              {answer.options?.[answer.correctOption]}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">No answers recorded</p>
        )}
      </div>
    </div>
  )
}
