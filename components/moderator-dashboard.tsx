"use client"

import React from "react"

import { useState, useCallback, useEffect, useRef } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ModeratorLoginProps {
  onLogin: (key: string) => void
}

function ModeratorLogin({ onLogin }: ModeratorLoginProps) {
  const [key, setKey] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const res = await fetch("/api/moderator", {
      headers: { "x-moderator-key": key },
    })

    if (res.ok) {
      localStorage.setItem("moderator-key", key)
      onLogin(key)
    } else {
      setError("Invalid moderator key")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Moderator Access</h1>
            <p className="text-muted-foreground">Enter the moderator key to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              placeholder="Moderator Key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground"
            />
            {error && <p className="text-destructive text-sm text-center">{error}</p>}
            <Button type="submit" className="w-full h-12">
              Login
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Default key: admin123
          </p>
        </div>
      </div>
    </div>
  )
}

interface QuizState {
  currentQuestionIndex: number
  isActive: boolean
  showResults: boolean
  timerMode: boolean
  timerDuration: number
  questionStartTime?: number
}

interface Question {
  id: number
  question: string
  options: string[]
  correctOption: number
}

interface Participant {
  email: string
  joinedAt: number
}

interface ModeratorData {
  state: QuizState
  questions: Question[]
  participantCount: number
  participants: Participant[]
}

interface LeaderboardEntry {
  email: string
  correctCount: number
  totalAnswered: number
  percentage: number
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[]
  totalParticipants: number
  totalQuestions: number
}

const createFetcher = (key: string) => async (url: string) => {
  const res = await fetch(url, {
    headers: { "x-moderator-key": key },
  })
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
}

export function ModeratorDashboard() {
  const [moderatorKey, setModeratorKey] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("moderator-key")
    }
    return null
  })
  const [isLoading, setIsLoading] = useState(false)
  const [timerMode, setTimerMode] = useState(false)
  const [timerDuration, setTimerDuration] = useState(30)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const autoAdvanceRef = useRef<NodeJS.Timeout | null>(null)

  const fetcher = moderatorKey ? createFetcher(moderatorKey) : null

  const { data, mutate } = useSWR<ModeratorData>(
    moderatorKey ? "/api/moderator" : null,
    fetcher,
    { refreshInterval: 3000 }
  )

  const { data: leaderboardData } = useSWR<LeaderboardData>(
    moderatorKey ? "/api/quiz/results" : null,
    (url: string) => fetch(url).then(res => res.json()),
    { refreshInterval: 5000 }
  )

  // Sync timer settings from server state
  useEffect(() => {
    if (data?.state) {
      setTimerMode(data.state.timerMode ?? false)
      setTimerDuration(data.state.timerDuration ?? 30)
    }
  }, [data?.state]) // Updated to use the entire data?.state object

  // Timer countdown and auto-advance logic
  useEffect(() => {
    // Clear existing timers
    if (timerRef.current) clearInterval(timerRef.current)
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current)

    const state = data?.state
    if (state?.timerMode && state?.questionStartTime && state?.timerDuration && state.isActive) {
      // Update countdown every second
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - state.questionStartTime!) / 1000)
        const remaining = Math.max(0, state.timerDuration - elapsed)
        setTimeRemaining(remaining)
      }, 1000)

      // Auto-advance when timer expires
      const elapsed = Math.floor((Date.now() - state.questionStartTime) / 1000)
      const remaining = Math.max(0, state.timerDuration - elapsed)
      
      if (remaining > 0) {
        autoAdvanceRef.current = setTimeout(async () => {
          // Auto advance to next question
          await executeAction("next")
        }, remaining * 1000)
      }
    } else {
      setTimeRemaining(null)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current)
    }
  }, [data?.state?.questionStartTime, data?.state?.timerMode, data?.state?.isActive, data?.state?.timerDuration])

  const executeAction = useCallback(async (action: string, questionIndex?: number, options?: { timerMode?: boolean, timerDuration?: number }) => {
    if (!moderatorKey) return

    setIsLoading(true)
    try {
      await fetch("/api/moderator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-moderator-key": moderatorKey,
        },
        body: JSON.stringify({ 
          action, 
          questionIndex,
          timerMode: options?.timerMode,
          timerDuration: options?.timerDuration,
        }),
      })
      await mutate()
    } finally {
      setIsLoading(false)
    }
  }, [moderatorKey, mutate])

  const handleLogout = () => {
    localStorage.removeItem("moderator-key")
    setModeratorKey(null)
  }

  const handleStartQuiz = () => {
    executeAction("start", undefined, { timerMode, timerDuration })
  }

  const handleTimerModeChange = async (enabled: boolean) => {
    setTimerMode(enabled)
    await executeAction("setTimerMode", undefined, { timerMode: enabled, timerDuration })
  }

  const handleTimerDurationChange = async (duration: number) => {
    setTimerDuration(duration)
    await executeAction("setTimerMode", undefined, { timerMode, timerDuration: duration })
  }

  if (!moderatorKey) {
    return <ModeratorLogin onLogin={setModeratorKey} />
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const { state, questions, participantCount } = data
  const currentQuestion = state.currentQuestionIndex >= 0 ? questions[state.currentQuestionIndex] : null

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Quiz Moderator</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {participantCount} participant{participantCount !== 1 ? "s" : ""}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Control Panel */}
          <div className="md:col-span-2 space-y-6">
            {/* Timer Mode Settings */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Quiz Mode</h2>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="quizMode"
                      checked={!timerMode}
                      onChange={() => handleTimerModeChange(false)}
                      className="w-4 h-4 text-primary"
                      disabled={state.currentQuestionIndex !== -1}
                    />
                    <div>
                      <span className="font-medium text-foreground">Manual Control</span>
                      <p className="text-sm text-muted-foreground">Manually advance questions</p>
                    </div>
                  </label>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="quizMode"
                      checked={timerMode}
                      onChange={() => handleTimerModeChange(true)}
                      className="w-4 h-4 text-primary"
                      disabled={state.currentQuestionIndex !== -1}
                    />
                    <div>
                      <span className="font-medium text-foreground">Auto Timer</span>
                      <p className="text-sm text-muted-foreground">Auto-advance with countdown</p>
                    </div>
                  </label>
                </div>

                {timerMode && (
                  <div className="ml-7 flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">Time per question:</span>
                    <select
                      value={timerDuration}
                      onChange={(e) => handleTimerDurationChange(Number(e.target.value))}
                      className="px-3 py-2 rounded-lg border border-input bg-background text-foreground"
                      disabled={state.currentQuestionIndex !== -1}
                    >
                      <option value={15}>15 seconds</option>
                      <option value={30}>30 seconds</option>
                      <option value={45}>45 seconds</option>
                      <option value={60}>1 minute</option>
                      <option value={90}>1.5 minutes</option>
                      <option value={120}>2 minutes</option>
                    </select>
                  </div>
                )}
              </div>

              {state.currentQuestionIndex !== -1 && (
                <p className="text-sm text-muted-foreground mt-4">
                  Quiz mode cannot be changed while quiz is in progress. Reset to change.
                </p>
              )}
            </div>

            {/* Status Card */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Quiz Status</h2>
                <div className="flex items-center gap-3">
                  {timerMode && timeRemaining !== null && state.isActive && (
                    <span className={cn(
                      "px-3 py-1 rounded-full text-sm font-bold",
                      timeRemaining <= 10 ? "bg-red-500/10 text-red-600" : "bg-blue-500/10 text-blue-600"
                    )}>
                      {timeRemaining}s
                    </span>
                  )}
                  <span
                    className={cn(
                      "px-3 py-1 rounded-full text-sm font-medium",
                      state.isActive
                        ? "bg-green-500/10 text-green-600"
                        : state.showResults
                          ? "bg-blue-500/10 text-blue-600"
                          : "bg-yellow-500/10 text-yellow-600"
                    )}
                  >
                    {state.isActive ? "Active" : state.showResults ? "Results" : state.currentQuestionIndex === -1 ? "Not Started" : "Paused"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {state.currentQuestionIndex === -1 ? (
                  <Button
                    onClick={handleStartQuiz}
                    disabled={isLoading}
                    className="col-span-2 md:col-span-4 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {timerMode ? `Start Quiz (${timerDuration}s per question)` : "Start Quiz (Manual)"}
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => executeAction("previous")}
                      disabled={isLoading || state.currentQuestionIndex === 0}
                      variant="outline"
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={() => executeAction("next")}
                      disabled={isLoading}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {state.currentQuestionIndex >= questions.length - 1 ? "End Quiz" : "Next"}
                    </Button>
                    <Button
                      onClick={() => executeAction(state.isActive ? "pause" : "resume")}
                      disabled={isLoading}
                      variant="outline"
                    >
                      {state.isActive ? "Pause" : "Resume"}
                    </Button>
                    <Button
                      onClick={() => executeAction("showResults")}
                      disabled={isLoading}
                      variant="outline"
                    >
                      Show Results
                    </Button>
                  </>
                )}
              </div>

              <div className="mt-4">
                <Button
                  onClick={() => executeAction("reset")}
                  disabled={isLoading}
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  Reset Quiz
                </Button>
              </div>
            </div>

            {/* Current Question */}
            {currentQuestion && (
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    Question {state.currentQuestionIndex + 1} of {questions.length}
                  </h2>
                </div>

                <p className="text-xl font-medium text-foreground mb-4">{currentQuestion.question}</p>

                <div className="space-y-2">
                  {currentQuestion.options.map((option, index) => (
                    <div
                      key={index}
                      className={cn(
                        "p-3 rounded-lg border",
                        index === currentQuestion.correctOption
                          ? "border-green-500 bg-green-500/10"
                          : "border-border"
                      )}
                    >
                      <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
                      {option}
                      {index === currentQuestion.correctOption && (
                        <span className="ml-2 text-green-600 text-sm">(Correct)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Question Navigator */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Jump to Question</h2>
              <div className="flex flex-wrap gap-2">
                {questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => executeAction("goto", index)}
                    disabled={isLoading}
                    className={cn(
                      "w-10 h-10 rounded-lg font-medium text-sm transition-colors",
                      state.currentQuestionIndex === index
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80 text-foreground"
                    )}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Leaderboard</h2>
              {leaderboardData?.leaderboard && leaderboardData.leaderboard.length > 0 ? (
                <div className="space-y-3">
                  {leaderboardData.leaderboard.slice(0, 10).map((entry, index) => (
                    <div
                      key={entry.email}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                    >
                      <span
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                          index === 0
                            ? "bg-yellow-500 text-white"
                            : index === 1
                              ? "bg-gray-400 text-white"
                              : index === 2
                                ? "bg-amber-600 text-white"
                                : "bg-muted text-muted-foreground"
                        )}
                      >
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {entry.email}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">
                          {entry.correctCount}/{entry.totalAnswered}
                        </p>
                        <p className="text-xs text-muted-foreground">{entry.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No participants yet
                </p>
              )}
            </div>

            {/* Participants */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Participants ({participantCount})
              </h2>
              {data.participants.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {data.participants.map((participant) => (
                    <div
                      key={participant.email}
                      className="text-sm text-muted-foreground truncate"
                    >
                      {participant.email}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No participants yet
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
