import { NextRequest, NextResponse } from 'next/server'
import { redis, KEYS, User } from '@/lib/redis'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check if user already exists
    const existingUsers = await redis.get<User[]>(KEYS.USERS) || []
    const userExists = existingUsers.some(u => u.email === normalizedEmail)

    if (!userExists) {
      // Add new user
      const newUser: User = {
        email: normalizedEmail,
        joinedAt: Date.now(),
      }
      await redis.set(KEYS.USERS, [...existingUsers, newUser])
    }

    // Create session
    await redis.set(KEYS.USER_SESSION(normalizedEmail), { email: normalizedEmail }, { ex: 86400 }) // 24 hour expiry

    return NextResponse.json({ 
      success: true, 
      email: normalizedEmail,
      isNewUser: !userExists 
    })
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email')
    
    if (!email) {
      return NextResponse.json({ authenticated: false })
    }

    const session = await redis.get(KEYS.USER_SESSION(email.toLowerCase()))
    
    return NextResponse.json({ 
      authenticated: !!session,
      email: session ? email.toLowerCase() : null
    })
  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json({ authenticated: false })
  }
}
