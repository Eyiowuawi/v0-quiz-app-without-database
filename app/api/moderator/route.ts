import { NextRequest, NextResponse } from 'next/server'
import { redis, KEYS, QuizState, User } from '@/lib/redis'
import { quizQuestions } from '@/lib/quiz-data'

const MODERATOR_KEY = process.env.MODERATOR_KEY || 'admin123'

function verifyModerator(request: NextRequest): boolean {
  const authHeader = request.headers.get('x-moderator-key')
  return authHeader === MODERATOR_KEY
}

const DEFAULT_STATE: QuizState = {
  currentQuestionIndex: -1,
  isActive: false,
  showResults: false,
  timerMode: false,
  timerDuration: 30,
}

export async function GET(request: NextRequest) {
  if (!verifyModerator(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const state = await redis.get<QuizState>(KEYS.QUIZ_STATE)
    const users = await redis.get<User[]>(KEYS.USERS) || []

    return NextResponse.json({
      state: state || DEFAULT_STATE,
      questions: quizQuestions,
      participantCount: users.length,
      participants: users,
    })
  } catch (error) {
    console.error('Moderator GET error:', error)
    return NextResponse.json({ error: 'Failed to get moderator data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!verifyModerator(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { action, questionIndex, timerMode, timerDuration } = await request.json()

    let state = await redis.get<QuizState>(KEYS.QUIZ_STATE) || { ...DEFAULT_STATE }

    switch (action) {
      case 'start':
        state = {
          currentQuestionIndex: 0,
          isActive: true,
          showResults: false,
          timerMode: timerMode ?? state.timerMode ?? false,
          timerDuration: timerDuration ?? state.timerDuration ?? 30,
          questionStartTime: Date.now(),
        }
        break

      case 'next':
        if (state.currentQuestionIndex < quizQuestions.length - 1) {
          state.currentQuestionIndex++
          state.isActive = true
          state.questionStartTime = Date.now()
        } else {
          state.isActive = false
          state.showResults = true
        }
        break

      case 'previous':
        if (state.currentQuestionIndex > 0) {
          state.currentQuestionIndex--
          state.isActive = true
          state.questionStartTime = Date.now()
        }
        break

      case 'goto':
        if (questionIndex >= 0 && questionIndex < quizQuestions.length) {
          state.currentQuestionIndex = questionIndex
          state.isActive = true
          state.showResults = false
          state.questionStartTime = Date.now()
        }
        break

      case 'pause':
        state.isActive = false
        break

      case 'resume':
        state.isActive = true
        state.showResults = false
        state.questionStartTime = Date.now()
        break

      case 'showResults':
        state.isActive = false
        state.showResults = true
        break

      case 'setTimerMode':
        state.timerMode = timerMode ?? false
        state.timerDuration = timerDuration ?? 30
        break

      case 'reset':
        state = { ...DEFAULT_STATE }
        // Clear main answers array
        await redis.set(KEYS.ANSWERS, [])
        // Clear individual user answer keys
        const users = await redis.get<User[]>(KEYS.USERS) || []
        for (const user of users) {
          for (let i = 0; i < quizQuestions.length; i++) {
            await redis.del(KEYS.USER_ANSWER(user.email, i))
          }
        }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    await redis.set(KEYS.QUIZ_STATE, state)

    return NextResponse.json({ 
      success: true, 
      state,
      currentQuestion: state.currentQuestionIndex >= 0 ? quizQuestions[state.currentQuestionIndex] : null
    })
  } catch (error) {
    console.error('Moderator POST error:', error)
    return NextResponse.json({ error: 'Failed to update quiz state' }, { status: 500 })
  }
}
