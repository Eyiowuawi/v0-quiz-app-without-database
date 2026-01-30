import { NextResponse } from 'next/server'
import { redis, KEYS, QuizState } from '@/lib/redis'
import { quizQuestions } from '@/lib/quiz-data'

export async function GET() {
  try {
    const state = await redis.get<QuizState>(KEYS.QUIZ_STATE)
    
    if (!state) {
      // Initialize default state
      const defaultState: QuizState = {
        currentQuestionIndex: -1, // -1 means quiz hasn't started
        isActive: false,
        showResults: false,
      }
      await redis.set(KEYS.QUIZ_STATE, defaultState)
      return NextResponse.json({ 
        state: defaultState, 
        totalQuestions: quizQuestions.length,
        currentQuestion: null 
      })
    }

    const currentQuestion = state.currentQuestionIndex >= 0 && state.currentQuestionIndex < quizQuestions.length
      ? {
          ...quizQuestions[state.currentQuestionIndex],
          correctOption: undefined, // Don't send correct answer to client
        }
      : null

    return NextResponse.json({ 
      state, 
      totalQuestions: quizQuestions.length,
      currentQuestion 
    })
  } catch (error) {
    console.error('Get quiz state error:', error)
    return NextResponse.json({ error: 'Failed to get quiz state' }, { status: 500 })
  }
}
