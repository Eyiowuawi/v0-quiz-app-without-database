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
}

interface UserAnswer {
  questionIndex: number
  selectedOption: number
  isCorrect: boolean
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function QuizClient() {
  const [email, setEmail] = useState<string | null>(null)
  const [userAnswers, setUserAnswers] = useState<Map<number, UserAnswer>>(new Map())

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
  const { data: answersData } = useSWR(
    email ? `/api/quiz/answer?email=${encodeURIComponent(email)}` : null,
    fetcher
  )

  // Update userAnswers when we get data from the server
  useEffect(() => {
    if (answersData?.answers) {
      const answersMap = new Map<number, UserAnswer>()
      answersData.answers.forEach((answer: UserAnswer) => {
        answersMap.set(answer.questionIndex, answer)
      })
      setUserAnswers(answersMap)
    }
  }, [answersData])

  const handleLogin = (userEmail: string) => {
    setEmail(userEmail)
  }

  const handleAnswer = useCallback((questionIndex: number, isCorrect: boolean, selectedOption: number) => {
    setUserAnswers((prev) => {
      const newMap = new Map(prev)
      newMap.set(questionIndex, { questionIndex, selectedOption, isCorrect })
      return newMap
    })
  }, [])

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
          question={currentQuestion}
          questionIndex={state.currentQuestionIndex}
          totalQuestions={totalQuestions}
          email={email}
          hasAnswered={!!previousAnswer}
          previousAnswer={previousAnswer ? {
            selectedOption: previousAnswer.selectedOption,
            correctOption: currentQuestion.correctOption || 0,
            isCorrect: previousAnswer.isCorrect
          } : undefined}
          onAnswer={(isCorrect, correctOption) =>
            handleAnswer(state.currentQuestionIndex, isCorrect, correctOption)
          }
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
