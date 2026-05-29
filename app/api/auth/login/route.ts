import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'
import { comparePasswords, signToken, setAuthCookie } from '@/lib/auth'
import { loginSchema } from '@/lib/validation'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = loginSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid credentials', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { email, password } = parsed.data

    const user = store.users.findByEmail(email)

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const valid = await comparePasswords(password, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    await setAuthCookie(token)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
