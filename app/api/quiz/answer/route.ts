import { NextRequest, NextResponse } from 'next/server'
import { redis, KEYS, QuizState } from '@/lib/redis'
import { quizQuestions } from '@/lib/quiz-data'

interface StoredAnswer {
  email: string
  questionIndex: number
  selectedOption: number
  isCorrect: boolean
  answeredAt: number
}

export async function POST(request: NextRequest) {
  try {
    const { email, questionIndex, selectedOption } = await request.json()

    if (!email || questionIndex === undefined || selectedOption === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Verify quiz is active and on this question
    const state = await redis.get<QuizState>(KEYS.QUIZ_STATE)
    if (!state || !state.isActive || state.currentQuestionIndex !== questionIndex) {
      return NextResponse.json({ error: 'Question not currently active' }, { status: 400 })
    }

    // Check if question exists
    const question = quizQuestions[questionIndex]
    if (!question) {
      return NextResponse.json({ error: 'Invalid question' }, { status: 400 })
    }

    // Store answer with unique key per user per question
    const answerKey = KEYS.USER_ANSWER(normalizedEmail, questionIndex)
    const isCorrect = selectedOption === question.correctOption
    
    const answer: StoredAnswer = {
      email: normalizedEmail,
      questionIndex,
      selectedOption,
      isCorrect,
      answeredAt: Date.now(),
    }

    await redis.set(answerKey, answer)

    // Also update the main answers list for leaderboard calculations
    const allAnswers = await redis.get<StoredAnswer[]>(KEYS.ANSWERS) || []
    const existingIdx = allAnswers.findIndex(
      a => a.email === normalizedEmail && a.questionIndex === questionIndex
    )
    
    if (existingIdx >= 0) {
      allAnswers[existingIdx] = answer
    } else {
      allAnswers.push(answer)
    }
    await redis.set(KEYS.ANSWERS, allAnswers)

    // Don't return correct answer - just confirm submission
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Submit answer error:', error)
    return NextResponse.json({ error: 'Failed to submit answer' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email')
    const questionIndexParam = request.nextUrl.searchParams.get('questionIndex')
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // If specific question requested, return just that answer
    if (questionIndexParam !== null) {
      const questionIndex = parseInt(questionIndexParam, 10)
      const answerKey = KEYS.USER_ANSWER(normalizedEmail, questionIndex)
      const answer = await redis.get<StoredAnswer>(answerKey)
      
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
    
    for (let i = 0; i < quizQuestions.length; i++) {
      const answerKey = KEYS.USER_ANSWER(normalizedEmail, i)
      const answer = await redis.get<StoredAnswer>(answerKey)
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
