import { Router } from 'express'
import { store } from '../lib/store.js'
import { requireAuth, requireAdmin } from '../middlewares/requireAuth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { paramId } from '../lib/params.js'
import type { Request, Response } from 'express'

const router = Router()

router.get('/products', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const search = (req.query.search as string) || ''
  const categoryId = (req.query.categoryId as string) || ''
  const page = parseInt((req.query.page as string) || '1')
  const limit = parseInt((req.query.limit as string) || '10')
  const skip = (page - 1) * limit

  const { items, total } = await store.products.findMany({
    search: search || undefined,
    categoryId: categoryId || undefined,
    skip,
    limit,
  })

  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
}))

router.get('/products/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const product = await store.products.findById(paramId(req))
  if (!product) return res.status(404).json({ error: 'Product not found' })
  return res.json({ success: true, data: product })
}))

router.post('/products', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { name, sku, description, categoryId, supplierId, purchasePrice, sellingPrice, quantity, lowStockLevel, barcode } = req.body

  if (!name || !sku || !categoryId) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const existing = await store.products.findBySku(sku)
  if (existing) return res.status(400).json({ error: 'Product with this SKU already exists' })

  const product = await store.products.create({
    name,
    sku,
    description: description ?? null,
    categoryId,
    supplierId: supplierId ?? null,
    purchasePrice: Number(purchasePrice),
    sellingPrice: Number(sellingPrice),
    quantity: Number(quantity),
    lowStockLevel: Number(lowStockLevel),
    barcode: barcode ?? null,
  })

  return res.status(201).json({ success: true, data: product })
}))

router.put('/products/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const product = await store.products.findById(paramId(req))
  if (!product) return res.status(404).json({ error: 'Product not found' })

  const { name, description, categoryId, supplierId, purchasePrice, sellingPrice, quantity, lowStockLevel, barcode } = req.body
  const updateData: Record<string, unknown> = {}
  if (name !== undefined) updateData.name = name
  if (description !== undefined) updateData.description = description
  if (categoryId !== undefined) updateData.categoryId = categoryId
  if (supplierId !== undefined) updateData.supplierId = supplierId || null
  if (purchasePrice !== undefined) updateData.purchasePrice = Number(purchasePrice)
  if (sellingPrice !== undefined) updateData.sellingPrice = Number(sellingPrice)
  if (quantity !== undefined) updateData.quantity = Number(quantity)
  if (lowStockLevel !== undefined) updateData.lowStockLevel = Number(lowStockLevel)
  if (barcode !== undefined) updateData.barcode = barcode

  const updated = await store.products.update(paramId(req), updateData)
  return res.json({ success: true, data: updated })
}))

router.delete('/products/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const deleted = await store.products.delete(paramId(req))
  if (!deleted) return res.status(404).json({ error: 'Product not found' })
  return res.json({ success: true, message: 'Product deleted' })
}))

export default router
