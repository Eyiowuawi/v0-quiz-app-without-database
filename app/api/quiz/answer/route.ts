import { NextRequest, NextResponse } from 'next/server'
import { redis, KEYS, QuizState } from '@/lib/redis'
import { quizQuestions, Question } from '@/lib/quiz-data'
import {
  atomicSubmitAnswer,
  type AnswerPayload,
} from '@/lib/atomic-quiz-answer'
import { atomicExpireTimerIfNeeded } from '@/lib/atomic-moderator-quiz'
import { isTeamRegistered } from '@/lib/team-registry'

// Helper to get questions (custom or default)
async function getQuestions(teamId: string): Promise<Question[]> {
  const customQuestions = await redis.get<Question[]>(KEYS.CUSTOM_QUESTIONS(teamId))
  return customQuestions && customQuestions.length > 0 ? customQuestions : quizQuestions
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      email?: string
      questionIndex?: number
      selectedOption?: number
      teamId?: string
    }
    const { email, questionIndex, selectedOption, teamId } = body

    if (!email || questionIndex === undefined || selectedOption === undefined || !teamId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!(await isTeamRegistered(teamId))) {
      return NextResponse.json({ error: 'Unknown team' }, { status: 404 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const questions = await getQuestions(teamId)

    await atomicExpireTimerIfNeeded(teamId, questions.length, Date.now())

    // Verify quiz is active and on this question
    const state = await redis.get<QuizState>(KEYS.QUIZ_STATE(teamId))
    if (!state || !state.isActive || state.currentQuestionIndex !== questionIndex) {
      return NextResponse.json({ error: 'Question not currently active' }, { status: 400 })
    }

    // Check if question exists
    const question = questions[questionIndex]
    if (!question) {
      return NextResponse.json({ error: 'Invalid question' }, { status: 400 })
    }

    const isCorrect = selectedOption === question.correctOption

    const answer: AnswerPayload = {
      email: normalizedEmail,
      questionIndex,
      selectedOption,
      isCorrect,
      answeredAt: Date.now(),
    }

    const outcome = await atomicSubmitAnswer(teamId, normalizedEmail, answer)
    if (outcome === 'conflict') {
      return NextResponse.json(
        { error: 'Answer already submitted for this question' },
        { status: 409 },
      )
    }
    if (outcome === 'failed') {
      return NextResponse.json(
        { error: 'Could not save answer. Please try again.' },
        { status: 503 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Submit answer error:', error)
    return NextResponse.json({ error: 'Failed to submit answer' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email')
    const teamId = request.nextUrl.searchParams.get('teamId')
    const questionIndexParam = request.nextUrl.searchParams.get('questionIndex')
    
    if (!email || !teamId) {
      return NextResponse.json({ error: 'Email and teamId required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const questions = await getQuestions(teamId)

    // If specific question requested, return just that answer
    if (questionIndexParam !== null) {
      const questionIndex = parseInt(questionIndexParam, 10)
      const answerKey = KEYS.USER_ANSWER(teamId, normalizedEmail, questionIndex)
      const answer = await redis.get<AnswerPayload>(answerKey)
      
      if (answer) {
        return NextResponse.json({
          answer: {
            questionIndex: answer.questionIndex,
            selectedOption: answer.selectedOption,
            // Never return isCorrect until quiz ends
          }
        })
      }
      return NextResponse.json({ answer: null })
    }

    // Return all user's answers (just the selections, no correct/incorrect info)
    const userAnswers: { questionIndex: number; selectedOption: number }[] = []
    
    for (let i = 0; i < questions.length; i++) {
      const answerKey = KEYS.USER_ANSWER(teamId, normalizedEmail, i)
      const answer = await redis.get<AnswerPayload>(answerKey)
      if (answer) {
        userAnswers.push({
          questionIndex: answer.questionIndex,
          selectedOption: answer.selectedOption,
        })
      }
    }

    return NextResponse.json({ answers: userAnswers })
  } catch (error) {
    console.error('Get answers error:', error)
    return NextResponse.json({ error: 'Failed to get answers' }, { status: 500 })
  }
}
