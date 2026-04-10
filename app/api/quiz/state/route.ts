import { NextRequest, NextResponse } from 'next/server'
import { redis, KEYS, QuizState } from '@/lib/redis'
import { quizQuestions, Question } from '@/lib/quiz-data'

const DEFAULT_QUIZ_STATE: QuizState = {
  currentQuestionIndex: -1,
  isActive: false,
  showResults: false,
  timerMode: false,
  timerDuration: 30,
}

// Helper to get questions (custom or default)
async function getQuestions(teamId: string): Promise<Question[]> {
  const customQuestions = await redis.get<Question[]>(KEYS.CUSTOM_QUESTIONS(teamId))
  return customQuestions && customQuestions.length > 0 ? customQuestions : quizQuestions
}

export async function GET(request: NextRequest) {
  try {
    const teamId = request.nextUrl.searchParams.get('teamId')
    
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }

    const stateKey = KEYS.QUIZ_STATE(teamId)
    let state = await redis.get<QuizState>(stateKey)
    const questions = await getQuestions(teamId)
    
    if (!state) {
      // SETNX: only one writer initializes; others re-fetch so we never overwrite
      // a state another tab/moderator created between GET and SET.
      await redis.setnx(stateKey, DEFAULT_QUIZ_STATE)
      state = (await redis.get<QuizState>(stateKey)) ?? DEFAULT_QUIZ_STATE
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
