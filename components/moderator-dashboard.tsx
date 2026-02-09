"use client";

import React from "react";

import { useState, useCallback, useEffect, useRef } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ShareLink } from "@/components/share-link";
import { ModeratorAuth } from "@/components/moderator-auth";
import { Share2 } from "lucide-react";

interface QuizState {
  currentQuestionIndex: number;
  isActive: boolean;
  showResults: boolean;
  timerMode: boolean;
  timerDuration: number;
  questionStartTime?: number;
}

interface Question {
  id: number;
  question: string;
  options: string[];
  correctOption: number;
}

interface Participant {
  email: string;
  joinedAt: number;
}

interface ModeratorData {
  state: QuizState;
  questions: Question[];
  participantCount: number;
  participants: Participant[];
}

interface LeaderboardEntry {
  email: string;
  correctCount: number;
  totalAnswered: number;
  percentage: number;
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  totalParticipants: number;
  totalQuestions: number;
}

const createFetcher = (sessionId: string) => async (url: string) => {
  const res = await fetch(url, {
    headers: { "x-session-id": sessionId },
  });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

// Question template for JSON upload
const QUESTION_TEMPLATE = `[
  {
    "question": "What is the capital of France?",
    "options": ["London", "Berlin", "Paris", "Madrid"],
    "correctOption": 2
  },
  {
    "question": "Which planet is the Red Planet?",
    "options": ["Venus", "Mars", "Jupiter", "Saturn"],
    "correctOption": 1
  }
]`;

export function ModeratorDashboard() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [moderatorEmail, setModeratorEmail] = useState<string | null>(null);
  const [moderatorName, setModeratorName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timerMode, setTimerMode] = useState(false);
  const [timerDuration, setTimerDuration] = useState(30);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoAdvanceRef = useRef<NodeJS.Timeout | null>(null);

  // Question upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [questionsJson, setQuestionsJson] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  // Clear database confirmation
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const fetcher = sessionId ? createFetcher(sessionId) : null;

  const { data, mutate } = useSWR<ModeratorData>(
    sessionId ? "/api/moderator" : null,
    fetcher,
    { refreshInterval: 3000 },
  );

  const { data: leaderboardData } = useSWR<LeaderboardData>(
    sessionId && teamId
      ? `/api/quiz/results?moderator=true&teamId=${teamId}`
      : null,
    (url: string) =>
      fetch(url, { headers: { "x-session-id": sessionId! } }).then((res) =>
        res.json(),
      ),
    { refreshInterval: 5000 },
  );

  // Load session from localStorage on mount (client-side only)
  useEffect(() => {
    const savedSessionId = localStorage.getItem("moderator-session-id");
    const savedTeamId = localStorage.getItem("moderator-team-id");
    const savedEmail = localStorage.getItem("moderator-email");
    const savedName = localStorage.getItem("moderator-name");

    if (savedSessionId && savedTeamId) {
      // Verify session is still valid
      fetch("/api/moderator/auth", {
        headers: { "x-session-id": savedSessionId },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.authenticated) {
            setSessionId(savedSessionId);
            setTeamId(savedTeamId);
            setModeratorEmail(savedEmail);
            setModeratorName(savedName);
          } else {
            // Session expired, clear storage
            localStorage.removeItem("moderator-session-id");
            localStorage.removeItem("moderator-team-id");
            localStorage.removeItem("moderator-email");
            localStorage.removeItem("moderator-name");
          }
        })
        .catch(() => {
          // Clear invalid session
          localStorage.removeItem("moderator-session-id");
          localStorage.removeItem("moderator-team-id");
          localStorage.removeItem("moderator-email");
          localStorage.removeItem("moderator-name");
        });
    }
  }, []);

  // Sync timer settings from server state
  useEffect(() => {
    if (data?.state) {
      setTimerMode(data.state.timerMode ?? false);
      setTimerDuration(data.state.timerDuration ?? 30);
    }
  }, [data?.state]);

  // Timer countdown and auto-advance logic
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);

    const state = data?.state;
    if (
      state?.timerMode &&
      state?.questionStartTime &&
      state?.timerDuration &&
      state.isActive
    ) {
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor(
          (Date.now() - state.questionStartTime!) / 1000,
        );
        const remaining = Math.max(0, state.timerDuration - elapsed);
        setTimeRemaining(remaining);
      }, 1000);

      const elapsed = Math.floor((Date.now() - state.questionStartTime) / 1000);
      const remaining = Math.max(0, state.timerDuration - elapsed);

      if (remaining > 0) {
        autoAdvanceRef.current = setTimeout(async () => {
          await executeAction("next");
        }, remaining * 1000);
      }
    } else {
      setTimeRemaining(null);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, [
    data?.state?.questionStartTime,
    data?.state?.timerMode,
    data?.state?.isActive,
    data?.state?.timerDuration,
  ]);

  const executeAction = useCallback(
    async (
      action: string,
      questionIndex?: number,
      options?: {
        timerMode?: boolean;
        timerDuration?: number;
        questions?: Question[];
      },
    ) => {
      if (!sessionId) return;

      setIsLoading(true);
      try {
        const res = await fetch("/api/moderator", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-session-id": sessionId,
          },
          body: JSON.stringify({
            action,
            questionIndex,
            timerMode: options?.timerMode,
            timerDuration: options?.timerDuration,
            questions: options?.questions,
          }),
        });
        const result = await res.json();
        if (!res.ok) {
          const errorMsg = result.error || "Action failed";
          toast.error(errorMsg);
          throw new Error(errorMsg);
        }
        // Show success toast for important actions
        if (action === "start") {
          toast.success("Quiz started!");
        } else if (action === "showResults") {
          toast.success("Results are now visible to participants!");
        } else if (action === "uploadQuestions") {
          toast.success("Questions uploaded successfully!");
        } else if (action === "clearDatabase") {
          toast.success("Database cleared!");
        }
        await mutate();
        return result;
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, mutate],
  );

  const handleAuth = (
    newSessionId: string,
    newTeamId: string,
    email: string,
    name: string,
  ) => {
    setSessionId(newSessionId);
    setTeamId(newTeamId);
    setModeratorEmail(email);
    setModeratorName(name);
    localStorage.setItem("moderator-session-id", newSessionId);
    localStorage.setItem("moderator-team-id", newTeamId);
    localStorage.setItem("moderator-email", email);
    localStorage.setItem("moderator-name", name);
  };

  const handleLogout = () => {
    localStorage.removeItem("moderator-session-id");
    localStorage.removeItem("moderator-team-id");
    localStorage.removeItem("moderator-email");
    localStorage.removeItem("moderator-name");
    setSessionId(null);
    setTeamId(null);
    setModeratorEmail(null);
    setModeratorName(null);
  };

  const handleStartQuiz = () => {
    executeAction("start", undefined, { timerMode, timerDuration });
  };

  const handleTimerModeChange = async (enabled: boolean) => {
    setTimerMode(enabled);
    await executeAction("setTimerMode", undefined, {
      timerMode: enabled,
      timerDuration,
    });
  };

  const handleTimerDurationChange = async (duration: number) => {
    setTimerDuration(duration);
    await executeAction("setTimerMode", undefined, {
      timerMode,
      timerDuration: duration,
    });
  };

  const handleUploadQuestions = async () => {
    setUploadError("");
    setUploadSuccess("");

    try {
      const parsedQuestions = JSON.parse(questionsJson);
      const result = await executeAction("uploadQuestions", undefined, {
        questions: parsedQuestions,
      });
      if (result?.success) {
        setUploadSuccess(result.message || "Questions uploaded successfully!");
        setQuestionsJson("");
        setTimeout(() => {
          setShowUploadModal(false);
          setUploadSuccess("");
        }, 2000);
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        setUploadError("Invalid JSON format. Please check your syntax.");
      } else if (err instanceof Error) {
        setUploadError(err.message);
      } else {
        setUploadError("Failed to upload questions");
      }
    }
  };

  const handleResetQuestions = async () => {
    await executeAction("resetQuestions");
    setShowUploadModal(false);
  };

  const handleClearDatabase = async () => {
    await executeAction("clearDatabase");
    setShowClearConfirm(false);
  };

  if (!sessionId || !teamId) {
    return <ModeratorAuth onAuth={handleAuth} />;
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { state, questions, participantCount } = data;
  const currentQuestion =
    state.currentQuestionIndex >= 0
      ? questions[state.currentQuestionIndex]
      : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-foreground">
              Quiz Moderator
            </h1>
            {moderatorName && (
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Welcome, {moderatorName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {participantCount} participant{participantCount !== 1 ? "s" : ""}
            </span>
            <button
              onClick={() => (window.location.href = "/")}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Home
            </button>
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
        {/* Team URL Display */}
        {teamId && (
          <div className="bg-linear-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl p-6 mb-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Share2 className="w-5 h-5 text-primary" />
                  <p className="text-sm font-semibold text-foreground">
                    Your Quiz Link
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Share this link with participants to join your quiz
                </p>
                <div className="bg-background border border-border rounded-lg p-3 mb-3">
                  <code className="text-sm font-mono text-foreground break-all">
                    {typeof window !== "undefined"
                      ? window.location.origin
                      : ""}
                    /quiz/{teamId}
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <ShareLink
                    url={
                      typeof window !== "undefined"
                        ? `${window.location.origin}/quiz/${teamId}`
                        : undefined
                    }
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const url =
                        typeof window !== "undefined"
                          ? `${window.location.origin}/quiz/${teamId}`
                          : "";
                      navigator.clipboard.writeText(teamId).then(() => {
                        toast.success("Team ID copied!");
                      });
                    }}
                  >
                    Copy Team ID
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Control Panel */}
          <div className="md:col-span-2 space-y-6">
            {/* Questions Management */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Questions ({questions.length})
                </h2>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowUploadModal(true)}
                    variant="outline"
                    size="sm"
                    disabled={state.currentQuestionIndex !== -1}
                  >
                    Upload Questions
                  </Button>
                </div>
              </div>
              {state.currentQuestionIndex !== -1 && (
                <p className="text-sm text-muted-foreground">
                  Cannot change questions while quiz is in progress. Reset to
                  modify.
                </p>
              )}
            </div>

            {/* Timer Mode Settings */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Quiz Mode
              </h2>

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
                      <span className="font-medium text-foreground">
                        Manual Control
                      </span>
                      <p className="text-sm text-muted-foreground">
                        Manually advance questions
                      </p>
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
                      <span className="font-medium text-foreground">
                        Auto Timer
                      </span>
                      <p className="text-sm text-muted-foreground">
                        Auto-advance with countdown
                      </p>
                    </div>
                  </label>
                </div>

                {timerMode && (
                  <div className="ml-7 flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      Time per question:
                    </span>
                    <select
                      value={timerDuration}
                      onChange={(e) =>
                        handleTimerDurationChange(Number(e.target.value))
                      }
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
                  Quiz mode cannot be changed while quiz is in progress. Reset
                  to change.
                </p>
              )}
            </div>

            {/* Status Card */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Quiz Status
                </h2>
                <div className="flex items-center gap-3">
                  {timerMode && timeRemaining !== null && state.isActive && (
                    <span
                      className={cn(
                        "px-3 py-1 rounded-full text-sm font-bold",
                        timeRemaining <= 10
                          ? "bg-red-500/10 text-red-600"
                          : "bg-blue-500/10 text-blue-600",
                      )}
                    >
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
                        : "bg-yellow-500/10 text-yellow-600",
                    )}
                  >
                    {state.isActive
                      ? "Active"
                      : state.showResults
                      ? "Results"
                      : state.currentQuestionIndex === -1
                      ? "Not Started"
                      : "Paused"}
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
                    {timerMode
                      ? `Start Quiz (${timerDuration}s per question)`
                      : "Start Quiz (Manual)"}
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
                      {state.currentQuestionIndex >= questions.length - 1
                        ? "End Quiz"
                        : "Next"}
                    </Button>
                    <Button
                      onClick={() =>
                        executeAction(state.isActive ? "pause" : "resume")
                      }
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

              <div className="mt-4 flex gap-2">
                <Button
                  onClick={() => executeAction("reset")}
                  disabled={isLoading}
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  Reset Quiz
                </Button>
                <Button
                  onClick={() => setShowClearConfirm(true)}
                  disabled={isLoading}
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  Clear Database
                </Button>
              </div>
            </div>

            {/* Current Question */}
            {currentQuestion && (
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    Question {state.currentQuestionIndex + 1} of{" "}
                    {questions.length}
                  </h2>
                </div>

                <p className="text-xl font-medium text-foreground mb-4">
                  {currentQuestion.question}
                </p>

                <div className="space-y-2">
                  {currentQuestion.options.map((option, index) => (
                    <div
                      key={index}
                      className={cn(
                        "p-3 rounded-lg border",
                        index === currentQuestion.correctOption
                          ? "border-green-500 bg-green-500/10"
                          : "border-border",
                      )}
                    >
                      <span className="font-medium mr-2">
                        {String.fromCharCode(65 + index)}.
                      </span>
                      {option}
                      {index === currentQuestion.correctOption && (
                        <span className="ml-2 text-green-600 text-sm">
                          (Correct)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Question Navigator */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Jump to Question
              </h2>
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
                        : "bg-muted hover:bg-muted/80 text-foreground",
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Leaderboard
                </h2>
                {leaderboardData && (
                  <span className="text-sm text-muted-foreground">
                    {leaderboardData.totalParticipants} participant
                    {leaderboardData.totalParticipants !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {leaderboardData?.leaderboard &&
              leaderboardData.leaderboard.length > 0 ? (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {leaderboardData.leaderboard.map((entry, index) => (
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
                            : "bg-muted text-muted-foreground",
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
                          {entry.correctCount}/
                          {leaderboardData?.totalQuestions ||
                            entry.totalAnswered}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.percentage}%
                        </p>
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

      {/* Upload Questions Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">
                Upload Questions
              </h2>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadError("");
                  setUploadSuccess("");
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">
                Paste your questions in JSON format. Each question needs:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside mb-4">
                <li>
                  <code className="bg-muted px-1 rounded">question</code> - The
                  question text
                </li>
                <li>
                  <code className="bg-muted px-1 rounded">options</code> - Array
                  of answer choices (2-6 options)
                </li>
                <li>
                  <code className="bg-muted px-1 rounded">correctOption</code> -
                  Index of correct answer (0-based)
                </li>
              </ul>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                Template Example:
              </label>
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                {QUESTION_TEMPLATE}
              </pre>
              <Button
                onClick={() => setQuestionsJson(QUESTION_TEMPLATE)}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Use Template
              </Button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                Your Questions JSON:
              </label>
              <textarea
                value={questionsJson}
                onChange={(e) => setQuestionsJson(e.target.value)}
                className="w-full h-64 px-4 py-3 rounded-lg border border-input bg-background text-foreground font-mono text-sm"
                placeholder="Paste your JSON here..."
              />
            </div>

            {uploadError && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-green-500/10 text-green-600 text-sm">
                {uploadSuccess}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleUploadQuestions}
                disabled={isLoading || !questionsJson.trim()}
                className="bg-primary hover:bg-primary/90"
              >
                Upload Questions
              </Button>
              <Button
                onClick={handleResetQuestions}
                disabled={isLoading}
                variant="outline"
              >
                Reset to Default
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Database Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-foreground mb-4">
              Clear Database?
            </h2>
            <p className="text-muted-foreground mb-6">
              This will permanently delete ALL data including:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside mb-6">
              <li>All participant accounts and sessions</li>
              <li>All quiz answers and scores</li>
              <li>Quiz state and progress</li>
              <li>Custom uploaded questions</li>
            </ul>
            <p className="text-destructive font-medium mb-6">
              This action cannot be undone!
            </p>
            <div className="flex gap-3">
              <Button
                onClick={handleClearDatabase}
                disabled={isLoading}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                Yes, Clear Everything
              </Button>
              <Button
                onClick={() => setShowClearConfirm(false)}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
