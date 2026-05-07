"use client";

import {
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { LoginForm } from "./login-form";
import { QuestionCard } from "./question-card";
import { WaitingScreen } from "./waiting-screen";
import { Scorecard } from "./scorecard";
import { StudentPlayShell } from "./student-play-shell";
import { fetchQuizState, UnknownTeamError } from "@/lib/quiz-state-fetch";

interface QuizState {
  currentQuestionIndex: number;
  isActive: boolean;
  showResults: boolean;
  timerMode?: boolean;
  timerDuration?: number;
  questionStartTime?: number;
}

interface UserAnswer {
  questionIndex: number;
  selectedOption: number;
}

interface Participant {
  email: string;
  displayName: string;
  joinedAt: number;
}

interface QuizStateResponse {
  state: QuizState | null;
  totalQuestions: number;
  currentQuestion: {
    id: number;
    question: string;
    options: string[];
  } | null;
  participants?: Participant[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface QuizClientProps {
  teamId?: string;
}

export function QuizClient({ teamId }: QuizClientProps) {
  const [email, setEmail] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<Map<number, number>>(
    new Map(),
  );
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const effectiveTeamId =
    teamId ||
    (typeof window !== "undefined"
      ? window.location.pathname.split("/quiz/")[1]?.split("/")[0]
      : null);

  useEffect(() => {
    if (!effectiveTeamId) return;
    const savedEmail = localStorage.getItem(`quiz-email-${effectiveTeamId}`);
    const savedName = localStorage.getItem(`quiz-name-${effectiveTeamId}`);
    if (savedEmail) setEmail(savedEmail);
    if (savedName) setParticipantName(savedName);
  }, [effectiveTeamId]);

  useEffect(() => {
    if (!effectiveTeamId || !email || participantName) return;
    fetch(
      `/api/auth?email=${encodeURIComponent(email)}&teamId=${encodeURIComponent(effectiveTeamId)}`,
    )
      .then((r) => r.json())
      .then((d: { authenticated?: boolean; name?: string | null }) => {
        if (d.authenticated && d.name?.trim()) {
          setParticipantName(d.name.trim());
          localStorage.setItem(`quiz-name-${effectiveTeamId}`, d.name.trim());
        }
      })
      .catch(() => {});
  }, [email, effectiveTeamId, participantName]);

  const {
    data: quizData,
    error: quizStateError,
    mutate: mutateQuizState,
  } = useSWR<QuizStateResponse>(
    effectiveTeamId
      ? `/api/quiz/state?teamId=${encodeURIComponent(effectiveTeamId)}`
      : null,
    fetchQuizState,
    { refreshInterval: email ? 2000 : 0 },
  );

  const { data: answersData, mutate: mutateAnswers } = useSWR(
    email && effectiveTeamId
      ? `/api/quiz/answer?email=${encodeURIComponent(email)}&teamId=${effectiveTeamId}`
      : null,
    fetcher,
    { refreshInterval: 3000 },
  );

  useEffect(() => {
    if (answersData?.answers) {
      const answersMap = new Map<number, number>();
      answersData.answers.forEach((answer: UserAnswer) => {
        answersMap.set(answer.questionIndex, answer.selectedOption);
      });
      setUserAnswers(answersMap);
    }
  }, [answersData]);

  useEffect(() => {
    const st = quizData?.state as QuizState | null;
    if (
      !st?.timerMode ||
      st.questionStartTime == null ||
      !st.timerDuration ||
      !st.isActive
    ) {
      setTimeRemaining(null);
      return;
    }
    const start = st.questionStartTime;
    const duration = st.timerDuration;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      setTimeRemaining(Math.max(0, duration - elapsed));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [
    quizData?.state?.timerMode,
    quizData?.state?.questionStartTime,
    quizData?.state?.timerDuration,
    quizData?.state?.isActive,
  ]);

  const handleLogin = (userEmail: string, name: string) => {
    setEmail(userEmail);
    setParticipantName(name.trim());
    if (effectiveTeamId) {
      localStorage.setItem(`quiz-email-${effectiveTeamId}`, userEmail);
      localStorage.setItem(`quiz-name-${effectiveTeamId}`, name.trim());
    }
  };

  const handleAnswer = useCallback(
    (questionIndex: number, selectedOption: number) => {
      setUserAnswers((prev) => {
        const newMap = new Map(prev);
        newMap.set(questionIndex, selectedOption);
        return newMap;
      });
      mutateAnswers();
    },
    [mutateAnswers],
  );

  const handleLogout = () => {
    if (effectiveTeamId) {
      localStorage.removeItem(`quiz-email-${effectiveTeamId}`);
      localStorage.removeItem(`quiz-name-${effectiveTeamId}`);
    }
    setEmail(null);
    setParticipantName(null);
    setUserAnswers(new Map());
  };

  const displayName =
    participantName?.trim() ||
    (email ? email.split("@")[0] : null) ||
    "Player";

  if (!effectiveTeamId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background bg-grid p-4">
        <div className="w-full max-w-md">
          <div className="glass-card rounded-4xl border border-white/10 p-8 text-center sm:p-10">
            <h1 className="mb-4 font-display text-2xl font-black uppercase italic tracking-tighter text-foreground">
              Team ID required
            </h1>
            <p className="mb-6 text-sm font-medium text-zinc-400">
              Please enter a team ID or use the quiz link provided by your
              moderator.
            </p>
            <Button
              className="rounded-2xl font-black"
              onClick={() => (window.location.href = "/")}
            >
              Go to home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (quizStateError instanceof UnknownTeamError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background bg-grid p-4">
        <div className="w-full max-w-md">
          <div className="glass-card rounded-4xl border border-destructive/25 p-8 text-center sm:p-10">
            <h1 className="mb-4 font-display text-2xl font-black uppercase italic tracking-tighter text-foreground">
              Quiz link isn&apos;t valid
            </h1>
            <p className="mb-6 text-sm font-medium text-zinc-400">
              This team ID doesn&apos;t match an active host room. Double-check
              the link or ask your host to open their moderator console once,
              then resend the link.
            </p>
            <Button
              className="rounded-2xl font-black"
              onClick={() => (window.location.href = "/")}
            >
              Go to home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!email) {
    return <LoginForm onLogin={handleLogin} teamId={effectiveTeamId} />;
  }

  if (quizStateError && !(quizStateError instanceof UnknownTeamError)) {
    return (
      <StudentPlayShell
        teamId={effectiveTeamId}
        email={email}
        participantDisplayName={displayName}
        onLeave={handleLogout}
      >
        <div className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="max-w-md text-sm font-medium text-zinc-400">
            {quizStateError.message || "Could not load the quiz. Check your connection."}
          </p>
          <Button
            className="rounded-2xl font-black"
            onClick={() => void mutateQuizState()}
          >
            Retry
          </Button>
        </div>
      </StudentPlayShell>
    );
  }

  const state: QuizState | null = quizData?.state ?? null;
  const currentQuestion = quizData?.currentQuestion;
  const totalQuestions = quizData?.totalQuestions || 0;

  const shell = (inner: ReactNode) => (
    <StudentPlayShell
      teamId={effectiveTeamId}
      email={email}
      participantDisplayName={displayName}
      onLeave={handleLogout}
    >
      {inner}
    </StudentPlayShell>
  );

  if (!state || state.currentQuestionIndex === -1) {
    return shell(
      <WaitingScreen
        variant="lobby"
        message="Waiting for the quiz to start..."
        displayName={displayName}
        email={email}
        participants={quizData?.participants}
      />,
    );
  }

  if (state.showResults) {
    return shell(
      <Scorecard
        email={email}
        displayName={displayName}
        teamId={effectiveTeamId}
      />,
    );
  }

  if (!state.isActive) {
    return shell(
      <WaitingScreen
        variant="paused"
        message="Quiz is paused. Hang tight!"
        displayName={displayName}
        email={email}
        participants={quizData?.participants}
      />,
    );
  }

  if (currentQuestion) {
    const previousAnswer = userAnswers.get(state.currentQuestionIndex);
    return shell(
      <div className="min-h-[calc(100vh-56px)] px-3 py-6 sm:px-4 sm:py-8">
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
          timeRemaining={
            state.timerMode ? timeRemaining : null
          }
          teamId={effectiveTeamId}
        />
      </div>,
    );
  }

  return shell(
    <WaitingScreen
      variant="loading"
      message="Loading..."
      displayName={displayName}
      email={email}
      participants={quizData?.participants}
    />,
  );
}
