import { NextRequest, NextResponse } from 'next/server'
import { redis, KEYS, QuizState, UserAnswer } from '@/lib/redis'
import { quizQuestions } from '@/lib/quiz-data'

export async function POST(request: NextRequest) {
  try {
    const { email, questionIndex, selectedOption } = await request.json()

    if (!email || questionIndex === undefined || selectedOption === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

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

    // Get existing answers
    const answers = await redis.get<UserAnswer[]>(KEYS.ANSWERS) || []

    // Check if user already answered this question
    const alreadyAnswered = answers.some(
      a => a.email === email.toLowerCase() && a.questionIndex === questionIndex
    )

    if (alreadyAnswered) {
      return NextResponse.json({ error: 'Already answered this question' }, { status: 400 })
    }

    // Record answer
    const isCorrect = selectedOption === question.correctOption
    const newAnswer: UserAnswer = {
      email: email.toLowerCase(),
      questionIndex,
      selectedOption,
      isCorrect,
      answeredAt: Date.now(),
    }

    await redis.set(KEYS.ANSWERS, [...answers, newAnswer])

    return NextResponse.json({ 
      success: true,
      isCorrect,
      correctOption: question.correctOption
    })
  } catch (error) {
    console.error('Submit answer error:', error)
    return NextResponse.json({ error: 'Failed to submit answer' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email')
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const answers = await redis.get<UserAnswer[]>(KEYS.ANSWERS) || []
    const userAnswers = answers.filter(a => a.email === email.toLowerCase())

    return NextResponse.json({ answers: userAnswers })
  } catch (error) {
    console.error('Get answers error:', error)
    return NextResponse.json({ error: 'Failed to get answers' }, { status: 500 })
  }
}
