'use client'

import { useState, useEffect, useCallback } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { LoginForm } from './login-form'
import { QuestionCard } from './question-card'
import { WaitingScreen } from './waiting-screen'
import { Scorecard } from './scorecard'

interface QuizState {
  currentQuestionIndex: number
  isActive: boolean
  showResults: boolean
  timerMode?: boolean
  timerDuration?: number
  questionStartTime?: number
}

interface UserAnswer {
  questionIndex: number
  selectedOption: number
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface QuizClientProps {
  teamId?: string
}

export function QuizClient({ teamId }: QuizClientProps) {
  const [email, setEmail] = useState<string | null>(null)
  const [userAnswers, setUserAnswers] = useState<Map<number, number>>(new Map())
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)

  // Get teamId from URL if not provided
  const effectiveTeamId = teamId || (typeof window !== 'undefined'
    ? window.location.pathname.split('/quiz/')[1]?.split('/')[0]
    : null)

  // Check for existing session on mount
  useEffect(() => {
    if (effectiveTeamId) {
      const savedEmail = localStorage.getItem(`quiz-email-${effectiveTeamId}`)
      if (savedEmail) {
        setEmail(savedEmail)
      }
    }
  }, [effectiveTeamId])

  // Poll quiz state every 2 seconds
  const { data: quizData } = useSWR(
    email && effectiveTeamId ? `/api/quiz/state?teamId=${effectiveTeamId}` : null,
    fetcher,
    { refreshInterval: 2000 }
  )

  // Fetch user's previous answers
  const { data: answersData, mutate: mutateAnswers } = useSWR(
    email && effectiveTeamId ? `/api/quiz/answer?email=${encodeURIComponent(email)}&teamId=${effectiveTeamId}` : null,
    fetcher,
    { refreshInterval: 3000 }
  )

  // Update userAnswers when we get data from the server
  useEffect(() => {
    if (answersData?.answers) {
      const answersMap = new Map<number, number>()
      answersData.answers.forEach((answer: UserAnswer) => {
        answersMap.set(answer.questionIndex, answer.selectedOption)
      })
      setUserAnswers(answersMap)
    }
  }, [answersData])

  // Timer countdown
  useEffect(() => {
    const state = quizData?.state as QuizState | null
    if (state?.timerMode && state?.questionStartTime && state?.timerDuration && state.isActive) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - state.questionStartTime!) / 1000)
        const remaining = Math.max(0, state.timerDuration! - elapsed)
        setTimeRemaining(remaining)
      }, 1000)
      return () => clearInterval(interval)
    } else {
      setTimeRemaining(null)
    }
  }, [quizData?.state])

  const handleLogin = (userEmail: string) => {
    setEmail(userEmail)
    if (effectiveTeamId) {
      localStorage.setItem(`quiz-email-${effectiveTeamId}`, userEmail)
    }
  }

  const handleAnswer = useCallback((questionIndex: number, selectedOption: number) => {
    setUserAnswers((prev) => {
      const newMap = new Map(prev)
      newMap.set(questionIndex, selectedOption)
      return newMap
    })
    mutateAnswers()
  }, [mutateAnswers])

  const handleLogout = () => {
    if (effectiveTeamId) {
      localStorage.removeItem(`quiz-email-${effectiveTeamId}`)
    }
    setEmail(null)
    setUserAnswers(new Map())
  }

  // No team ID - redirect to home or show team ID input
  if (!effectiveTeamId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted">
        <div className="bg-card p-8 rounded-lg shadow-lg text-center max-w-md w-full mx-4">
          <h1 className="text-2xl font-bold mb-4">Team ID Required</h1>
          <p className="text-muted-foreground mb-6">
            Please enter a team ID or use the quiz link provided by your moderator.
          </p>
          <Button onClick={() => (window.location.href = '/')}>Go to Home</Button>
        </div>
      </div>
    )
  }

  // Not logged in - show login form
  if (!email) {
    return <LoginForm teamId={effectiveTeamId} onLogin={handleLogin} />
  }

  const state: QuizState | null = quizData?.state
  const currentQuestion = quizData?.currentQuestion
  const totalQuestions = quizData?.totalQuestions || 0

  // Quiz hasn't started yet
  if (!state || state.currentQuestionIndex === -1) {
    return <WaitingScreen email={email} onLogout={handleLogout} />
  }

  // Show results
  if (state.showResults) {
    return <Scorecard email={email} teamId={effectiveTeamId} />
  }

  // Quiz is paused
  if (!state.isActive) {
    return <WaitingScreen email={email} onLogout={handleLogout} isPaused />
  }

  // Show current question
  if (currentQuestion) {
    const previousAnswer = userAnswers.get(state.currentQuestionIndex)

    return (
      <QuestionCard
        question={currentQuestion}
        questionIndex={state.currentQuestionIndex}
        totalQuestions={totalQuestions}
        email={email}
        previousAnswer={previousAnswer}
        onAnswer={(selectedOption) =>
          handleAnswer(state.currentQuestionIndex, selectedOption)
        }
        timeRemaining={timeRemaining}
        teamId={effectiveTeamId}
      />
    )
  }

  return <WaitingScreen email={email} onLogout={handleLogout} />
}
