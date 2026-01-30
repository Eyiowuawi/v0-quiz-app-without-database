import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

// Redis keys
export const KEYS = {
  QUIZ_STATE: 'quiz:state',
  USERS: 'quiz:users',
  ANSWERS: 'quiz:answers',
  USER_SESSION: (email: string) => `quiz:session:${email}`,
}

// Types
export interface QuizState {
  currentQuestionIndex: number
  isActive: boolean
  showResults: boolean
}

export interface User {
  email: string
  joinedAt: number
}

export interface UserAnswer {
  email: string
  questionIndex: number
  selectedOption: number
  isCorrect: boolean
  answeredAt: number
}
