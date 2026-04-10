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

  const { data: quizData } = useSWR(
    email && effectiveTeamId
      ? `/api/quiz/state?teamId=${effectiveTeamId}`
      : null,
    fetcher,
    { refreshInterval: 2000 },
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
    const state = quizData?.state as QuizState | null;
    if (
      state?.timerMode &&
      state?.questionStartTime &&
      state?.timerDuration &&
      state.isActive
    ) {
      const interval = setInterval(() => {
        const elapsed = Math.floor(
          (Date.now() - state.questionStartTime!) / 1000,
        );
        const remaining = Math.max(0, state.timerDuration! - elapsed);
        setTimeRemaining(remaining);
      }, 1000);
      return () => clearInterval(interval);
    }
    setTimeRemaining(null);
  }, [quizData?.state]);

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
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-card border-2 border-border rounded-3xl p-8 shadow-xl shadow-chart-2/12 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Team ID Required
            </h1>
            <p className="text-muted-foreground mb-6">
              Please enter a team ID or use the quiz link provided by your
              moderator.
            </p>
            <Button onClick={() => (window.location.href = "/")}>
              Go to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!email) {
    return <LoginForm onLogin={handleLogin} teamId={effectiveTeamId} />;
  }

  const state: QuizState | null = quizData?.state;
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
          timeRemaining={timeRemaining}
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
    />,
  );
}
