"use client"

import { useState, useEffect, useCallback } from "react"
import useSWR from "swr"
import { LoginForm } from "./login-form"
import { QuestionCard } from "./question-card"
import { WaitingScreen } from "./waiting-screen"
import { Scorecard } from "./scorecard"

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

export function QuizClient() {
  const [email, setEmail] = useState<string | null>(null)
  const [userAnswers, setUserAnswers] = useState<Map<number, number>>(new Map())
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)

  // Check for existing session on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("quiz-email")
    if (savedEmail) {
      setEmail(savedEmail)
    }
  }, [])

  // Poll quiz state every 2 seconds
  const { data: quizData } = useSWR(
    email ? "/api/quiz/state" : null,
    fetcher,
    { refreshInterval: 2000 }
  )

  // Fetch user's previous answers
  const { data: answersData, mutate: mutateAnswers } = useSWR(
    email ? `/api/quiz/answer?email=${encodeURIComponent(email)}` : null,
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
    localStorage.removeItem("quiz-email")
    setEmail(null)
    setUserAnswers(new Map())
  }

  // Not logged in - show login form
  if (!email) {
    return <LoginForm onLogin={handleLogin} />
  }

  const state: QuizState | null = quizData?.state
  const currentQuestion = quizData?.currentQuestion
  const totalQuestions = quizData?.totalQuestions || 0

  // Quiz hasn't started yet
  if (!state || state.currentQuestionIndex === -1) {
    return (
      <div className="relative">
        <LogoutButton onLogout={handleLogout} />
        <WaitingScreen message="Waiting for the quiz to start..." email={email} />
      </div>
    )
  }

  // Show results
  if (state.showResults) {
    return (
      <div className="relative">
        <LogoutButton onLogout={handleLogout} />
        <Scorecard email={email} />
      </div>
    )
  }

  // Quiz is paused
  if (!state.isActive) {
    return (
      <div className="relative">
        <LogoutButton onLogout={handleLogout} />
        <WaitingScreen message="Quiz is paused. Please wait..." email={email} />
      </div>
    )
  }

  // Show current question
  if (currentQuestion) {
    const previousAnswer = userAnswers.get(state.currentQuestionIndex)

    return (
      <div className="min-h-screen bg-background p-4 py-8 relative">
        <LogoutButton onLogout={handleLogout} />
        <QuestionCard
          key={`question-${state.currentQuestionIndex}`}
          question={currentQuestion}
          questionIndex={state.currentQuestionIndex}
          totalQuestions={totalQuestions}
          email={email}
          previousAnswer={previousAnswer}
          onAnswer={(selectedOption) =>
            handleAnswer(state.currentQuestionIndex, selectedOption)
          }
          timeRemaining={timeRemaining}
        />
      </div>
    )
  }

  return (
    <div className="relative">
      <LogoutButton onLogout={handleLogout} />
      <WaitingScreen message="Loading..." email={email} />
    </div>
  )
}

function LogoutButton({ onLogout }: { onLogout: () => void }) {
  return (
    <button
      onClick={onLogout}
      className="absolute top-4 right-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      Logout
    </button>
  )
}
