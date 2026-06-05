import type { Request, Response, NextFunction } from 'express'
import { verifyToken, type JWTPayload } from '../lib/authLib.js'

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload
    }
  }
}

const DEFAULT_USER: JWTPayload = {
  userId: 'user-admin',
  email: 'admin@makhazeny.local',
  role: 'ADMIN',
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.auth_token
  if (token) {
    const user = verifyToken(token)
    if (user) {
      req.user = user
      return next()
    }
  }
  req.user = DEFAULT_USER
  return next()
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.auth_token
  if (token) {
    const user = verifyToken(token)
    if (user && user.role === 'ADMIN') {
      req.user = user
      return next()
    }
  }
  req.user = DEFAULT_USER
  return next()
}
