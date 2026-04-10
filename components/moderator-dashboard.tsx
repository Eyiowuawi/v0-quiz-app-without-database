"use client";

import React from "react";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ShareLink } from "@/components/share-link";
import { ModeratorAuth } from "@/components/moderator-auth";
import {
  CheckCircle2,
  Copy,
  Download,
  FileUp,
  Loader2,
  Plus,
  Share2,
  Trash2,
} from "lucide-react";

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
  name?: string;
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
  name?: string;
  displayName?: string;
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

/** One row in the visual question builder (modal) */
type BuilderQuestionRow = {
  question: string;
  options: string[];
  correctIndex: number;
};

function createEmptyBuilderQuestion(): BuilderQuestionRow {
  return {
    question: "",
    options: ["", ""],
    correctIndex: 0,
  };
}

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
  const [uploadSubmitting, setUploadSubmitting] = useState(false);
  const [uploadDragOver, setUploadDragOver] = useState(false);
  const uploadFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadMode, setUploadMode] = useState<"form" | "json">("form");
  const [builderQuestions, setBuilderQuestions] = useState<BuilderQuestionRow[]>(
    [createEmptyBuilderQuestion()],
  );

  const uploadParseResult = useMemo(() => {
    const t = questionsJson.trim();
    if (!t) return { status: "empty" as const };
    try {
      const parsed = JSON.parse(t) as unknown;
      if (!Array.isArray(parsed)) {
        return {
          status: "error" as const,
          message: "Root must be a JSON array of questions, e.g. [ {...}, {...} ].",
        };
      }
      if (parsed.length === 0) {
        return {
          status: "error" as const,
          message: "Add at least one question object to the array.",
        };
      }
      return { status: "ok" as const, count: parsed.length };
    } catch {
      return {
        status: "error" as const,
        message:
          "Invalid JSON — check quotes, commas, and brackets. Tip: use “Prettify” after fixing.",
      };
    }
  }, [questionsJson]);

  const builderValidation = useMemo(() => {
    const out: Pick<Question, "question" | "options" | "correctOption">[] = [];
    for (let i = 0; i < builderQuestions.length; i++) {
      const row = builderQuestions[i];
      const qText = row.question.trim();
      const opts = row.options.map((o) => o.trim());
      if (!qText) {
        return {
          status: "error" as const,
          message: `Question ${i + 1}: enter the question text.`,
          count: 0,
        };
      }
      if (opts.length < 2) {
        return {
          status: "error" as const,
          message: `Question ${i + 1}: add at least two answer choices.`,
          count: 0,
        };
      }
      if (opts.some((o) => !o)) {
        return {
          status: "error" as const,
          message: `Question ${i + 1}: fill every answer row, or remove an empty one.`,
          count: 0,
        };
      }
      if (
        row.correctIndex < 0 ||
        row.correctIndex >= opts.length
      ) {
        return {
          status: "error" as const,
          message: `Question ${i + 1}: choose which answer is correct.`,
          count: 0,
        };
      }
      out.push({
        question: qText,
        options: opts,
        correctOption: row.correctIndex,
      });
    }
    if (out.length === 0) {
      return { status: "empty" as const, message: "", count: 0 };
    }
    return { status: "ok" as const, questions: out, count: out.length };
  }, [builderQuestions]);

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
        /** Avoid disabling the whole dashboard during long uploads */
        skipGlobalLoading?: boolean;
      },
    ) => {
      if (!sessionId) return;

      if (!options?.skipGlobalLoading) setIsLoading(true);
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
        if (!options?.skipGlobalLoading) setIsLoading(false);
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

  const submitQuestionsPayload = async (
    questionsPayload: Pick<
      Question,
      "question" | "options" | "correctOption"
    >[],
  ) => {
    setUploadSubmitting(true);
    try {
      const result = await executeAction("uploadQuestions", undefined, {
        questions: questionsPayload as Question[],
        skipGlobalLoading: true,
      });
      if (result?.success) {
        setQuestionsJson("");
        setShowUploadModal(false);
      }
    } catch (err) {
      if (err instanceof Error) {
        setUploadError(err.message);
      } else {
        setUploadError("Failed to upload questions");
      }
    } finally {
      setUploadSubmitting(false);
    }
  };

  const handleUploadQuestions = async () => {
    setUploadError("");
    if (uploadParseResult.status !== "ok") {
      setUploadError(
        uploadParseResult.status === "error"
          ? uploadParseResult.message
          : "Paste JSON, drop a file, or start from the sample.",
      );
      return;
    }

    try {
      const parsedQuestions = JSON.parse(questionsJson) as Pick<
        Question,
        "question" | "options" | "correctOption"
      >[];
      await submitQuestionsPayload(parsedQuestions);
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

  const handleUploadFormQuestions = async () => {
    setUploadError("");
    if (builderValidation.status !== "ok") {
      setUploadError(
        builderValidation.status === "error"
          ? builderValidation.message
          : "Add at least one complete question.",
      );
      return;
    }
    await submitQuestionsPayload(builderValidation.questions);
  };

  const updateBuilderRow = useCallback(
    (index: number, patch: Partial<BuilderQuestionRow>) => {
      setBuilderQuestions((prev) =>
        prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
      );
    },
    [],
  );

  const addBuilderOption = useCallback((qIndex: number) => {
    setBuilderQuestions((prev) =>
      prev.map((row, i) =>
        i === qIndex ? { ...row, options: [...row.options, ""] } : row,
      ),
    );
  }, []);

  const removeBuilderOption = useCallback((qIndex: number, optIndex: number) => {
    setBuilderQuestions((prev) =>
      prev.map((row, i) => {
        if (i !== qIndex) return row;
        if (row.options.length <= 2) return row;
        const nextOpts = row.options.filter((_, j) => j !== optIndex);
        let ci = row.correctIndex;
        if (optIndex === ci) ci = 0;
        else if (optIndex < ci) ci -= 1;
        ci = Math.max(0, Math.min(ci, nextOpts.length - 1));
        return { ...row, options: nextOpts, correctIndex: ci };
      }),
    );
  }, []);

  const addBuilderQuestion = useCallback(() => {
    setBuilderQuestions((prev) => [...prev, createEmptyBuilderQuestion()]);
  }, []);

  const removeBuilderQuestion = useCallback((qIndex: number) => {
    setBuilderQuestions((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== qIndex),
    );
  }, []);

  const loadJsonFile = useCallback((file: File) => {
    const okType =
      file.type === "application/json" ||
      file.type === "text/plain" ||
      /\.json$/i.test(file.name);
    if (!okType) {
      toast.error("Please use a .json file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setQuestionsJson(String(reader.result ?? ""));
      setUploadError("");
      toast.success(`Loaded “${file.name}”`);
    };
    reader.onerror = () => toast.error("Could not read that file.");
    reader.readAsText(file);
  }, []);

  const handleUploadDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setUploadDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) loadJsonFile(file);
    },
    [loadJsonFile],
  );

  const copyQuestionTemplate = useCallback(() => {
    void navigator.clipboard.writeText(QUESTION_TEMPLATE).then(() => {
      toast.success("Sample JSON copied — paste into the editor or a file.");
    });
  }, []);

  const downloadQuestionTemplate = useCallback(() => {
    const blob = new Blob([QUESTION_TEMPLATE], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "quiz-questions-sample.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Sample file downloaded");
  }, []);

  const prettifyQuestionsJson = useCallback(() => {
    try {
      const parsed = JSON.parse(questionsJson);
      setQuestionsJson(JSON.stringify(parsed, null, 2));
      setUploadError("");
      toast.success("JSON formatted");
    } catch {
      toast.error("Fix JSON syntax first, then try Prettify again.");
    }
  }, [questionsJson]);

  useEffect(() => {
    if (!showUploadModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowUploadModal(false);
        setUploadError("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showUploadModal]);

  useEffect(() => {
    if (showUploadModal) {
      setBuilderQuestions([createEmptyBuilderQuestion()]);
      setUploadMode("form");
      setQuestionsJson("");
      setUploadError("");
    }
  }, [showUploadModal]);

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
    <div className="min-h-screen">
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
                        <p className="text-sm font-bold text-foreground truncate">
                          {entry.displayName ||
                            entry.name?.trim() ||
                            entry.email.split("@")[0]}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
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
                      className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2"
                    >
                      <p className="truncate text-sm font-bold text-foreground">
                        {participant.name?.trim() ||
                          participant.email.split("@")[0]}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {participant.email}
                      </p>
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
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-questions-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowUploadModal(false);
              setUploadError("");
            }
          }}
        >
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-lg">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2
                  id="upload-questions-title"
                  className="text-xl font-bold text-foreground"
                >
                  Upload questions
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Use the form builder, or switch to JSON to paste or drop a
                  file. Press{" "}
                  <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted text-xs font-mono">
                    Esc
                  </kbd>{" "}
                  to close.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadError("");
                }}
                className="shrink-0 rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Close
              </button>
            </div>

            <div
              className="flex rounded-lg border border-border p-1 mb-4 bg-muted/30 gap-1"
              role="tablist"
              aria-label="Upload mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={uploadMode === "form"}
                className={cn(
                  "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
                  uploadMode === "form"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => {
                  setUploadMode("form");
                  setUploadError("");
                }}
              >
                Form builder
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={uploadMode === "json"}
                className={cn(
                  "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
                  uploadMode === "json"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => {
                  setUploadMode("json");
                  setUploadError("");
                }}
              >
                Paste JSON
              </button>
            </div>

            {uploadMode === "form" ? (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  For each card: write the question, type every answer choice,
                  then use <span className="font-medium">Which is correct?</span>{" "}
                  to pick the right one from the list. Add more choices or
                  questions with the buttons below.
                </p>

                <div className="mb-3 flex flex-wrap items-center gap-2 min-h-6">
                  {builderValidation.status === "ok" && (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                      {builderValidation.count} question
                      {builderValidation.count === 1 ? "" : "s"} ready to save
                    </span>
                  )}
                  {builderValidation.status === "error" && (
                    <span className="text-sm text-amber-700 dark:text-amber-400">
                      {builderValidation.message}
                    </span>
                  )}
                </div>

                <div className="space-y-4 mb-4 max-h-[min(52vh,28rem)] overflow-y-auto pr-1">
                  {builderQuestions.map((row, qi) => (
                    <div
                      key={qi}
                      className="rounded-xl border border-border bg-muted/10 p-4 space-y-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          Question {qi + 1}
                        </span>
                        {builderQuestions.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive gap-1 h-8"
                            onClick={() => removeBuilderQuestion(qi)}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            Remove
                          </Button>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor={`builder-q-${qi}`}
                          className="text-sm font-medium text-foreground"
                        >
                          Question text
                        </label>
                        <textarea
                          id={`builder-q-${qi}`}
                          value={row.question}
                          onChange={(e) =>
                            updateBuilderRow(qi, { question: e.target.value })
                          }
                          rows={2}
                          className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 resize-y min-h-18"
                          placeholder="e.g. What is the capital of France?"
                        />
                      </div>

                      <fieldset className="space-y-3">
                        <legend className="text-sm font-medium text-foreground">
                          Answer choices
                        </legend>
                        <p className="text-xs text-muted-foreground -mt-1">
                          List every option players will see. You will pick the
                          correct one in the next step.
                        </p>
                        {row.options.map((opt, oi) => {
                          const letter = String.fromCharCode(65 + oi);
                          return (
                            <div
                              key={oi}
                              className="flex flex-wrap items-center gap-2 sm:flex-nowrap"
                            >
                              <span
                                className="w-8 shrink-0 text-center text-sm font-semibold tabular-nums text-muted-foreground"
                                aria-hidden
                              >
                                {letter}
                              </span>
                              <input
                                id={`builder-opt-${qi}-${oi}`}
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const next = [...row.options];
                                  next[oi] = e.target.value;
                                  updateBuilderRow(qi, { options: next });
                                }}
                                className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                                placeholder={`Choice ${letter} (e.g. Paris)`}
                                aria-label={`Answer choice ${letter}`}
                              />
                              {row.options.length > 2 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="shrink-0 h-9 w-9 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeBuilderOption(qi, oi)}
                                  aria-label={`Remove choice ${letter}`}
                                >
                                  <Trash2 className="h-4 w-4" aria-hidden />
                                </Button>
                              )}
                            </div>
                          );
                        })}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => addBuilderOption(qi)}
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden />
                          Add another choice
                        </Button>
                      </fieldset>

                      <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 space-y-2">
                        <label
                          htmlFor={`builder-correct-select-${qi}`}
                          className="text-sm font-semibold text-foreground block"
                        >
                          Which is correct?
                        </label>
                        <p className="text-xs text-muted-foreground">
                          This is the answer that will be marked right for
                          scoring. It must be one of the choices above.
                        </p>
                        <select
                          id={`builder-correct-select-${qi}`}
                          value={row.correctIndex}
                          onChange={(e) =>
                            updateBuilderRow(qi, {
                              correctIndex: Number(e.target.value),
                            })
                          }
                          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                        >
                          {row.options.map((opt, oi) => {
                            const letter = String.fromCharCode(65 + oi);
                            const preview = opt.trim() || "(empty — fill choice above)";
                            return (
                              <option key={oi} value={oi}>
                                {letter}: {preview}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="gap-1.5 mb-4 w-full sm:w-auto"
                  onClick={addBuilderQuestion}
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Add another question
                </Button>
              </>
            ) : (
              <>
                <div className="rounded-lg border border-border bg-muted/20 p-4 mb-4">
                  <p className="text-sm font-medium text-foreground mb-2">
                    JSON array: each object needs
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>
                      <code className="bg-muted px-1 rounded">question</code> —
                      prompt text
                    </li>
                    <li>
                      <code className="bg-muted px-1 rounded">options</code> —
                      string array (at least 2)
                    </li>
                    <li>
                      <code className="bg-muted px-1 rounded">correctOption</code>{" "}
                      — 0-based index of the correct answer
                    </li>
                  </ul>
                </div>

                <input
                  ref={uploadFileInputRef}
                  type="file"
                  accept=".json,application/json,text/plain"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) loadJsonFile(f);
                    e.target.value = "";
                  }}
                />

                <div className="flex flex-wrap gap-2 mb-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQuestionsJson(QUESTION_TEMPLATE)}
                    className="gap-1.5"
                  >
                    Insert sample
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyQuestionTemplate}
                    className="gap-1.5"
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                    Copy sample
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={downloadQuestionTemplate}
                    className="gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden />
                    Download .json
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => uploadFileInputRef.current?.click()}
                    className="gap-1.5"
                  >
                    <FileUp className="h-3.5 w-3.5" aria-hidden />
                    Choose file
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={prettifyQuestionsJson}
                    disabled={!questionsJson.trim()}
                  >
                    Prettify
                  </Button>
                </div>

                <div className="mb-2 flex flex-wrap items-center gap-2 min-h-6">
                  {uploadParseResult.status === "ok" && (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                      {uploadParseResult.count} question
                      {uploadParseResult.count === 1 ? "" : "s"} ready to upload
                    </span>
                  )}
                  {uploadParseResult.status === "empty" && (
                    <span className="text-sm text-muted-foreground">
                      Editor is empty — insert a sample or drop a file above.
                    </span>
                  )}
                  {uploadParseResult.status === "error" &&
                    questionsJson.trim() && (
                      <span className="text-sm text-amber-700 dark:text-amber-400">
                        {uploadParseResult.message}
                      </span>
                    )}
                </div>

                <div
                  className={cn(
                    "rounded-xl border-2 border-dashed transition-colors mb-4",
                    uploadDragOver
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background",
                  )}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setUploadDragOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setUploadDragOver(false);
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setUploadDragOver(true);
                  }}
                  onDrop={handleUploadDrop}
                >
                  <label className="block">
                    <span className="sr-only">Question JSON</span>
                    <textarea
                      value={questionsJson}
                      onChange={(e) => {
                        setQuestionsJson(e.target.value);
                        setUploadError("");
                      }}
                      className="w-full min-h-[220px] md:min-h-[280px] px-4 py-3 rounded-xl border-0 bg-transparent text-foreground font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-inset"
                      placeholder='Drop a .json file here or paste an array, e.g. [ { "question": "…", "options": ["A","B"], "correctOption": 0 } ]'
                      spellCheck={false}
                    />
                  </label>
                </div>
              </>
            )}

            {uploadError && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {uploadError}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={
                  uploadMode === "form"
                    ? handleUploadFormQuestions
                    : handleUploadQuestions
                }
                disabled={
                  uploadSubmitting ||
                  (uploadMode === "form"
                    ? builderValidation.status !== "ok"
                    : uploadParseResult.status !== "ok")
                }
                className="bg-primary hover:bg-primary/90 gap-2"
              >
                {uploadSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Uploading…
                  </>
                ) : (
                  "Save to room"
                )}
              </Button>
              <Button
                type="button"
                onClick={handleResetQuestions}
                disabled={isLoading || uploadSubmitting}
                variant="outline"
              >
                Reset to default set
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
