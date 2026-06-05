import { Router } from 'express'
import { store } from '../lib/store.js'
import { requireAuth, requireAdmin } from '../middlewares/requireAuth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { paramId } from '../lib/params.js'
import type { Request, Response } from 'express'

const router = Router()

router.get('/customers', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const search = (req.query.search as string) || ''
  const page = parseInt((req.query.page as string) || '1')
  const limit = parseInt((req.query.limit as string) || '10')
  const skip = (page - 1) * limit

  const { items, total } = await store.customers.findMany({ search: search || undefined, skip, limit })
  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
}))

router.get('/customers/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const customer = await store.customers.findById(paramId(req))
  if (!customer) return res.status(404).json({ error: 'Customer not found' })
  return res.json({ success: true, data: customer })
}))

router.post('/customers', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { name, phone, email, address, city, creditLimit } = req.body
  if (!name) return res.status(400).json({ error: 'Name is required' })

  const customer = await store.customers.create({
    name,
    phone: phone || null,
    email: email || null,
    address: address || null,
    city: city || null,
    creditLimit: Number(creditLimit) || 0,
  })
  return res.status(201).json({ success: true, data: customer })
}))

router.put('/customers/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const customer = await store.customers.findById(paramId(req))
  if (!customer) return res.status(404).json({ error: 'Customer not found' })

  const { name, phone, email, address, city, creditLimit } = req.body
  const updateData: Record<string, unknown> = {}
  if (name !== undefined) updateData.name = name
  if (phone !== undefined) updateData.phone = phone || null
  if (email !== undefined) updateData.email = email || null
  if (address !== undefined) updateData.address = address || null
  if (city !== undefined) updateData.city = city || null
  if (creditLimit !== undefined) updateData.creditLimit = Number(creditLimit)

  const updated = await store.customers.update(paramId(req), updateData)
  return res.json({ success: true, data: updated })
}))

router.delete('/customers/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const deleted = await store.customers.delete(paramId(req))
  if (!deleted) return res.status(404).json({ error: 'Customer not found' })
  return res.json({ success: true, message: 'Customer deleted' })
}))

export default router
