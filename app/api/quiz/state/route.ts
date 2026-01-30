import { NextResponse } from 'next/server'
import { redis, KEYS, QuizState } from '@/lib/redis'
import { quizQuestions, Question } from '@/lib/quiz-data'

// Helper to get questions (custom or default)
async function getQuestions(): Promise<Question[]> {
  const customQuestions = await redis.get<Question[]>(KEYS.CUSTOM_QUESTIONS)
  return customQuestions && customQuestions.length > 0 ? customQuestions : quizQuestions
}

export async function GET() {
  try {
    const state = await redis.get<QuizState>(KEYS.QUIZ_STATE)
    const questions = await getQuestions()
    
    if (!state) {
      // Initialize default state
      const defaultState: QuizState = {
        currentQuestionIndex: -1, // -1 means quiz hasn't started
        isActive: false,
        showResults: false,
        timerMode: false,
        timerDuration: 30,
      }
      await redis.set(KEYS.QUIZ_STATE, defaultState)
      return NextResponse.json({ 
        state: defaultState, 
        totalQuestions: questions.length,
        currentQuestion: null 
      })
    }

    const currentQuestion = state.currentQuestionIndex >= 0 && state.currentQuestionIndex < questions.length
      ? {
          id: questions[state.currentQuestionIndex].id,
          question: questions[state.currentQuestionIndex].question,
          options: questions[state.currentQuestionIndex].options,
          // Don't send correct answer to client
        }
      : null

    return NextResponse.json({ 
      state: {
        currentQuestionIndex: state.currentQuestionIndex,
        isActive: state.isActive,
        showResults: state.showResults,
        timerMode: state.timerMode,
        timerDuration: state.timerDuration,
        questionStartTime: state.questionStartTime,
      }, 
      totalQuestions: questions.length,
      currentQuestion 
    })
  } catch (error) {
    console.error('Get quiz state error:', error)
    return NextResponse.json({ error: 'Failed to get quiz state' }, { status: 500 })
  }
}
