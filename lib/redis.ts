import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// Redis keys - now team-scoped
export const KEYS = {
  QUIZ_STATE: (teamId: string) => `quiz:state:${teamId}`,
  USERS: (teamId: string) => `quiz:users:${teamId}`,
  ANSWERS: (teamId: string) => `quiz:answers:${teamId}`,
  CUSTOM_QUESTIONS: (teamId: string) => `quiz:custom_questions:${teamId}`,
  USER_SESSION: (teamId: string, email: string) =>
    `quiz:session:${teamId}:${email}`,
  USER_ANSWER: (teamId: string, email: string, questionIndex: number) =>
    `quiz:answer:${teamId}:${email}:${questionIndex}`,
  // Moderator keys
  MODERATOR: (email: string) => `moderator:${email}`,
  MODERATOR_SESSION: (sessionId: string) => `moderator:session:${sessionId}`,
  ALL_MODERATORS: "moderators:all",
  // Admin keys
  ADMIN_SESSION: (sessionId: string) => `admin:session:${sessionId}`,
};

// Types
export interface QuizState {
  currentQuestionIndex: number;
  isActive: boolean;
  showResults: boolean;
  timerMode: boolean;
  timerDuration: number; // seconds per question
  questionStartTime?: number; // timestamp when current question started
}

export interface User {
  email: string;
  /** Display name from participant join form (optional for older records). */
  name?: string;
  joinedAt: number;
}

export interface UserAnswer {
  email: string;
  questionIndex: number;
  selectedOption: number;
  isCorrect: boolean;
  answeredAt: number;
}

export interface Moderator {
  email: string;
  name: string;
  teamId: string;
  passwordHash: string;
  createdAt: number;
}

export interface ModeratorSession {
  sessionId: string;
  email: string;
  teamId: string;
  expiresAt: number;
}
