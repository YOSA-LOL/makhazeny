import { Router } from 'express'
import { store } from '../lib/store.js'
import { requireAuth, requireAdmin } from '../middlewares/requireAuth.js'
import type { Request, Response } from 'express'

const router = Router()

router.get('/suppliers', requireAuth, (req: Request, res: Response) => {
  const search = (req.query.search as string) || ''
  const page = parseInt((req.query.page as string) || '1')
  const limit = parseInt((req.query.limit as string) || '10')
  const skip = (page - 1) * limit

  const { items, total } = store.suppliers.findMany({ search: search || undefined, skip, limit })
  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
})

router.get('/suppliers/:id', requireAuth, (req: Request, res: Response) => {
  const supplier = store.suppliers.findById(req.params.id)
  if (!supplier) return res.status(404).json({ error: 'Supplier not found' })
  return res.json({ success: true, data: supplier })
})

router.post('/suppliers', requireAuth, (req: Request, res: Response) => {
  const { name, phone, email, address, city } = req.body
  if (!name) return res.status(400).json({ error: 'Name is required' })

  const supplier = store.suppliers.create({ name, phone: phone || null, email: email || null, address: address || null, city: city || null })
  return res.status(201).json({ success: true, data: supplier })
})

router.put('/suppliers/:id', requireAuth, (req: Request, res: Response) => {
  const supplier = store.suppliers.findById(req.params.id)
  if (!supplier) return res.status(404).json({ error: 'Supplier not found' })

  const { name, phone, email, address, city } = req.body
  const updateData: Record<string, unknown> = {}
  if (name !== undefined) updateData.name = name
  if (phone !== undefined) updateData.phone = phone || null
  if (email !== undefined) updateData.email = email || null
  if (address !== undefined) updateData.address = address || null
  if (city !== undefined) updateData.city = city || null

  const updated = store.suppliers.update(req.params.id, updateData)
  return res.json({ success: true, data: updated })
})

router.delete('/suppliers/:id', requireAdmin, (req: Request, res: Response) => {
  const deleted = store.suppliers.delete(req.params.id)
  if (!deleted) return res.status(404).json({ error: 'Supplier not found' })
  return res.json({ success: true, message: 'Supplier deleted' })
})

export default router
