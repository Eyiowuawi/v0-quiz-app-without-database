import { NextRequest, NextResponse } from 'next/server'
import { redis, KEYS, QuizState, User, ModeratorSession } from '@/lib/redis'
import { quizQuestions, Question } from '@/lib/quiz-data'
import {
  atomicApplyModeratorQuizState,
  atomicClearTeamQuizData,
  atomicResetModeratorQuiz,
} from '@/lib/atomic-moderator-quiz'

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
    const qc = questions.length
    const now = Date.now()

    const buildStateResponse = (state: QuizState) =>
      NextResponse.json({
        success: true,
        state,
        currentQuestion:
          state.currentQuestionIndex >= 0
            ? questions[state.currentQuestionIndex]
            : null,
      })

    switch (action) {
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

      case 'clearDatabase': {
        const cleared = await atomicClearTeamQuizData(teamId, questions.length)
        if (!cleared) {
          return NextResponse.json(
            { error: 'Could not clear data. Please try again.' },
            { status: 503 },
          )
        }
        return NextResponse.json({
          success: true,
          message: 'Database cleared completely',
          state: DEFAULT_STATE,
          questions: quizQuestions,
        })
      }

      case 'start': {
        const r = await atomicApplyModeratorQuizState(teamId, 'start', {
          qc,
          now,
          ...(typeof timerMode === 'boolean' ? { tm: timerMode } : {}),
          ...(typeof timerDuration === 'number' ? { td: timerDuration } : {}),
        })
        if (!r.ok) {
          return NextResponse.json(
            { error: 'Could not update quiz. Please try again.' },
            { status: 503 },
          )
        }
        return buildStateResponse(r.state)
      }

      case 'next': {
        const r = await atomicApplyModeratorQuizState(teamId, 'next', {
          qc,
          now,
        })
        if (!r.ok) {
          return NextResponse.json(
            { error: 'Could not update quiz. Please try again.' },
            { status: 503 },
          )
        }
        return buildStateResponse(r.state)
      }

      case 'previous': {
        const r = await atomicApplyModeratorQuizState(teamId, 'previous', {
          qc,
          now,
        })
        if (!r.ok) {
          return NextResponse.json(
            { error: 'Could not update quiz. Please try again.' },
            { status: 503 },
          )
        }
        return buildStateResponse(r.state)
      }

      case 'goto': {
        const r = await atomicApplyModeratorQuizState(teamId, 'goto', {
          qc,
          now,
          qi: questionIndex,
        })
        if (!r.ok) {
          return NextResponse.json(
            { error: 'Could not update quiz. Please try again.' },
            { status: 503 },
          )
        }
        return buildStateResponse(r.state)
      }

      case 'pause': {
        const r = await atomicApplyModeratorQuizState(teamId, 'pause', {
          qc,
          now,
        })
        if (!r.ok) {
          return NextResponse.json(
            { error: 'Could not update quiz. Please try again.' },
            { status: 503 },
          )
        }
        return buildStateResponse(r.state)
      }

      case 'resume': {
        const r = await atomicApplyModeratorQuizState(teamId, 'resume', {
          qc,
          now,
        })
        if (!r.ok) {
          return NextResponse.json(
            { error: 'Could not update quiz. Please try again.' },
            { status: 503 },
          )
        }
        return buildStateResponse(r.state)
      }

      case 'showResults': {
        const r = await atomicApplyModeratorQuizState(teamId, 'showResults', {
          qc,
          now,
        })
        if (!r.ok) {
          return NextResponse.json(
            { error: 'Could not update quiz. Please try again.' },
            { status: 503 },
          )
        }
        return buildStateResponse(r.state)
      }

      case 'setTimerMode': {
        const r = await atomicApplyModeratorQuizState(teamId, 'setTimerMode', {
          qc,
          now,
          tm: timerMode ?? false,
          td: timerDuration ?? 30,
        })
        if (!r.ok) {
          return NextResponse.json(
            { error: 'Could not update quiz. Please try again.' },
            { status: 503 },
          )
        }
        return buildStateResponse(r.state)
      }

      case 'reset': {
        const r = await atomicResetModeratorQuiz(teamId, qc)
        if (!r.ok) {
          return NextResponse.json(
            { error: 'Could not reset quiz. Please try again.' },
            { status: 503 },
          )
        }
        return buildStateResponse(r.state)
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Moderator POST error:', error)
    return NextResponse.json({ error: 'Failed to update quiz state' }, { status: 500 })
  }
}
