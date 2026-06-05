import { Router } from 'express'
import { store } from '../lib/store.js'
import { requireAuth, requireAdmin } from '../middlewares/requireAuth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import type { Request, Response } from 'express'

const router = Router()

router.get('/categories', requireAuth, asyncHandler(async (_req, res) => {
  const categories = await store.categories.findMany()
  res.json({ success: true, data: categories })
}))

router.post('/categories', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.body
  if (!name) return res.status(400).json({ error: 'Name is required' })

  const existing = await store.categories.findByName(name)
  if (existing) return res.status(400).json({ error: 'Category already exists' })

  const category = await store.categories.create(name)
  return res.status(201).json({ success: true, data: category })
}))

export default router
