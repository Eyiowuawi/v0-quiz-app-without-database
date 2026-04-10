'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface QuestionCardProps {
  question: {
    id: number
    question: string
    options: string[]
  }
  questionIndex: number
  totalQuestions: number
  email: string
  previousAnswer?: number
  onAnswer: (selectedOption: number) => void
  timeRemaining?: number | null
  teamId?: string | null
}

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
    previousAnswer !== undefined ? previousAnswer : null
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastSubmittedOption, setLastSubmittedOption] = useState<number | null>(
    previousAnswer !== undefined ? previousAnswer : null
  )

  // Reset state when question changes
  useEffect(() => {
    setSelectedOption(previousAnswer !== undefined ? previousAnswer : null)
    setLastSubmittedOption(
      previousAnswer !== undefined ? previousAnswer : null
    )
  }, [questionIndex, previousAnswer])

  const handleOptionSelect = async (optionIndex: number) => {
    // If clicking the same option that's already submitted, do nothing
    if (optionIndex === lastSubmittedOption) return

    setSelectedOption(optionIndex)
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/quiz/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          questionIndex,
          selectedOption: optionIndex,
          teamId,
        }),
      })

      if (res.ok) {
        setLastSubmittedOption(optionIndex)
        onAnswer(optionIndex)
        toast.success('Answer submitted!')
      } else {
        const errorData = await res.json().catch(() => ({}))
        toast.error(errorData.error || 'Failed to submit answer')
        // If submission failed, revert selection
        setSelectedOption(lastSubmittedOption)
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('Network error. Please try again.')
      // If submission failed, revert selection
      setSelectedOption(lastSubmittedOption)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="bg-card rounded-lg shadow-lg p-8 max-w-2xl w-full">
        <div className="flex justify-between items-center mb-6">
          <span className="text-sm text-muted-foreground">
            Question {questionIndex + 1} of {totalQuestions}
          </span>
          {timeRemaining !== null && timeRemaining !== undefined && (
            <div className={cn(
              'text-lg font-semibold px-3 py-1 rounded',
              timeRemaining > 10 ? 'bg-green-500/20 text-green-700' : 'bg-red-500/20 text-red-700'
            )}>
              {timeRemaining}s
            </div>
          )}
        </div>

        <h2 className="text-2xl font-bold mb-8 text-balance">
          {question.question}
        </h2>

        <div className="space-y-3">
          {question.options.map((option, index) => {
            const isSelected = selectedOption === index
            const isSubmitted = lastSubmittedOption === index

            return (
              <button
                key={`q${question.id}-opt${index}`}
                onClick={() => handleOptionSelect(index)}
                disabled={isSubmitting}
                className={cn(
                  'w-full p-4 text-left rounded-lg border-2 transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-primary/20',
                  !isSubmitting && 'hover:border-primary/50 cursor-pointer',
                  isSelected && 'border-primary bg-primary/5',
                  !isSelected && 'border-border bg-card',
                  isSubmitting && 'cursor-wait opacity-70'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-primary">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span>{option}</span>
                  {isSubmitted && (
                    <span className="ml-auto text-green-600">✓</span>
                  )}
                  {isSubmitting && isSelected && (
                    <span className="ml-auto animate-spin">⏳</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {lastSubmittedOption !== null && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Answer submitted!{' '}
              {isSubmitting
                ? 'Updating...'
                : "You can change your answer by selecting another option."}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
