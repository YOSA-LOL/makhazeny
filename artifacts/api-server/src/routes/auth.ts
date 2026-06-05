import { Router } from 'express'
import { store } from '../lib/store.js'
import { comparePasswords, signToken } from '../lib/authLib.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import type { Request, Response } from 'express'

const router = Router()

router.post('/auth/login', asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  const user = await store.users.findByEmail(email)
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  const valid = await comparePasswords(password, user.password)
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  const token = signToken({ userId: user.id, email: user.email, role: user.role })

  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })

  return res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } })
}))

router.post('/auth/logout', (_req, res) => {
  res.clearCookie('auth_token')
  res.json({ success: true })
})

router.get('/auth/me', (req: Request, res: Response) => {
  const token = req.cookies?.auth_token
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  const { verifyToken } = require('../lib/authLib.js')
  const user = verifyToken(token)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })
  return res.json({ user })
})

export default router
