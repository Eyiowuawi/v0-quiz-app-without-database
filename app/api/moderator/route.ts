import { NextRequest, NextResponse } from 'next/server'
import { redis, KEYS, QuizState, User } from '@/lib/redis'
import { quizQuestions, Question } from '@/lib/quiz-data'

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

// Helper to get questions (custom or default)
async function getQuestions(): Promise<Question[]> {
  const customQuestions = await redis.get<Question[]>(KEYS.CUSTOM_QUESTIONS)
  return customQuestions && customQuestions.length > 0 ? customQuestions : quizQuestions
}

// Helper to clear ALL database records
async function clearAllData() {
  // Clear quiz state
  await redis.del(KEYS.QUIZ_STATE)
  
  // Clear main answers array
  await redis.del(KEYS.ANSWERS)
  
  // Get all users to clear their session and answer keys
  const users = await redis.get<User[]>(KEYS.USERS) || []
  const questions = await getQuestions()
  
  for (const user of users) {
    // Clear user session
    await redis.del(KEYS.USER_SESSION(user.email))
    
    // Clear all user answers
    for (let i = 0; i < questions.length; i++) {
      await redis.del(KEYS.USER_ANSWER(user.email, i))
    }
  }
  
  // Clear users list
  await redis.del(KEYS.USERS)
}

export async function GET(request: NextRequest) {
  if (!verifyModerator(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const state = await redis.get<QuizState>(KEYS.QUIZ_STATE)
    const users = await redis.get<User[]>(KEYS.USERS) || []
    const questions = await getQuestions()

    return NextResponse.json({
      state: state || DEFAULT_STATE,
      questions,
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
    const { action, questionIndex, timerMode, timerDuration, questions: uploadedQuestions } = await request.json()
    const questions = await getQuestions()

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
        if (state.currentQuestionIndex < questions.length - 1) {
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
        if (questionIndex >= 0 && questionIndex < questions.length) {
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

      case 'uploadQuestions':
        // Validate uploaded questions
        if (!uploadedQuestions || !Array.isArray(uploadedQuestions) || uploadedQuestions.length === 0) {
          return NextResponse.json({ error: 'Invalid questions format' }, { status: 400 })
        }
        
        // Validate each question has required fields
        for (let i = 0; i < uploadedQuestions.length; i++) {
          const q = uploadedQuestions[i]
          if (!q.question || !q.options || !Array.isArray(q.options) || q.options.length < 2) {
            return NextResponse.json({ 
              error: `Question ${i + 1} is invalid. Each question must have a "question" text and at least 2 "options".` 
            }, { status: 400 })
          }
          if (typeof q.correctOption !== 'number' || q.correctOption < 0 || q.correctOption >= q.options.length) {
            return NextResponse.json({ 
              error: `Question ${i + 1} has invalid "correctOption". Must be a number between 0 and ${q.options.length - 1}.` 
            }, { status: 400 })
          }
        }
        
        // Add IDs if not present
        const questionsWithIds = uploadedQuestions.map((q: Question, i: number) => ({
          ...q,
          id: q.id || i + 1,
        }))
        
        await redis.set(KEYS.CUSTOM_QUESTIONS, questionsWithIds)
        
        return NextResponse.json({ 
          success: true, 
          message: `Uploaded ${questionsWithIds.length} questions successfully`,
          questions: questionsWithIds
        })

      case 'resetQuestions':
        // Clear custom questions, revert to default
        await redis.del(KEYS.CUSTOM_QUESTIONS)
        return NextResponse.json({ 
          success: true, 
          message: 'Questions reset to default',
          questions: quizQuestions
        })

      case 'reset':
        // Reset quiz state and clear all answers
        state = { ...DEFAULT_STATE }
        await redis.set(KEYS.ANSWERS, [])
        
        const users = await redis.get<User[]>(KEYS.USERS) || []
        for (const user of users) {
          for (let i = 0; i < questions.length; i++) {
            await redis.del(KEYS.USER_ANSWER(user.email, i))
          }
        }
        break

      case 'clearDatabase':
        // Clear EVERYTHING including users, questions, sessions
        await clearAllData()
        await redis.del(KEYS.CUSTOM_QUESTIONS)
        return NextResponse.json({ 
          success: true, 
          message: 'Database cleared completely',
          state: DEFAULT_STATE,
          questions: quizQuestions
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    await redis.set(KEYS.QUIZ_STATE, state)
    const updatedQuestions = await getQuestions()

    return NextResponse.json({ 
      success: true, 
      state,
      currentQuestion: state.currentQuestionIndex >= 0 ? updatedQuestions[state.currentQuestionIndex] : null
    })
  } catch (error) {
    console.error('Moderator POST error:', error)
    return NextResponse.json({ error: 'Failed to update quiz state' }, { status: 500 })
  }
}
