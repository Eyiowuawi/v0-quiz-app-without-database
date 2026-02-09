import { NextRequest, NextResponse } from 'next/server'
import { redis, KEYS, QuizState, User, ModeratorSession } from '@/lib/redis'
import { quizQuestions, Question } from '@/lib/quiz-data'

async function verifyModerator(request: NextRequest): Promise<{ teamId: string; email: string } | null> {
  const sessionId = request.headers.get('x-session-id')
  
  if (!sessionId) {
    return null
  }

  const session = await redis.get<ModeratorSession>(KEYS.MODERATOR_SESSION(sessionId))
  
  if (!session || session.expiresAt < Date.now()) {
    return null
  }

  return { teamId: session.teamId, email: session.email }
}

const DEFAULT_STATE: QuizState = {
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

// Helper to clear ALL database records for a team
async function clearAllData(teamId: string) {
  // Clear quiz state
  await redis.del(KEYS.QUIZ_STATE(teamId))
  
  // Clear main answers array
  await redis.del(KEYS.ANSWERS(teamId))
  
  // Get all users to clear their session and answer keys
  const users = await redis.get<User[]>(KEYS.USERS(teamId)) || []
  const questions = await getQuestions(teamId)
  
  for (const user of users) {
    // Clear user session
    await redis.del(KEYS.USER_SESSION(teamId, user.email))
    
    // Clear all user answers
    for (let i = 0; i < questions.length; i++) {
      await redis.del(KEYS.USER_ANSWER(teamId, user.email, i))
    }
  }
  
  // Clear users list
  await redis.del(KEYS.USERS(teamId))
}

export async function GET(request: NextRequest) {
  const moderator = await verifyModerator(request)
  if (!moderator) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { teamId } = moderator
    const state = await redis.get<QuizState>(KEYS.QUIZ_STATE(teamId))
    const users = await redis.get<User[]>(KEYS.USERS(teamId)) || []
    const questions = await getQuestions(teamId)

    return NextResponse.json({
      state: state || DEFAULT_STATE,
      questions,
      participantCount: users.length,
      participants: users,
      teamId,
    })
  } catch (error) {
    console.error('Moderator GET error:', error)
    return NextResponse.json({ error: 'Failed to get moderator data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const moderator = await verifyModerator(request)
  if (!moderator) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { teamId } = moderator
    const { action, questionIndex, timerMode, timerDuration, questions: uploadedQuestions } = await request.json()
    const questions = await getQuestions(teamId)

    let state = await redis.get<QuizState>(KEYS.QUIZ_STATE(teamId)) || { ...DEFAULT_STATE }

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
        
        await redis.set(KEYS.CUSTOM_QUESTIONS(teamId), questionsWithIds)
        
        return NextResponse.json({ 
          success: true, 
          message: `Uploaded ${questionsWithIds.length} questions successfully`,
          questions: questionsWithIds
        })

      case 'resetQuestions':
        // Clear custom questions, revert to default
        await redis.del(KEYS.CUSTOM_QUESTIONS(teamId))
        return NextResponse.json({ 
          success: true, 
          message: 'Questions reset to default',
          questions: quizQuestions
        })

      case 'reset':
        // Reset quiz state and clear all answers
        state = { ...DEFAULT_STATE }
        await redis.set(KEYS.ANSWERS(teamId), [])
        
        const users = await redis.get<User[]>(KEYS.USERS(teamId)) || []
        for (const user of users) {
          for (let i = 0; i < questions.length; i++) {
            await redis.del(KEYS.USER_ANSWER(teamId, user.email, i))
          }
        }
        break

      case 'clearDatabase':
        // Clear EVERYTHING for this team
        await clearAllData(teamId)
        await redis.del(KEYS.CUSTOM_QUESTIONS(teamId))
        return NextResponse.json({ 
          success: true, 
          message: 'Database cleared completely',
          state: DEFAULT_STATE,
          questions: quizQuestions
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    await redis.set(KEYS.QUIZ_STATE(teamId), state)
    const updatedQuestions = await getQuestions(teamId)

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
