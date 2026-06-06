import { randomUUID } from 'crypto'
import { Router } from 'express'
import { store } from '../lib/store.js'
import { recordTreasuryExpense, recordTreasuryIncome } from '../lib/treasury-helpers.js'
import { requireAuth, requireAdmin } from '../middlewares/requireAuth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { paramId } from '../lib/params.js'
import type { Request, Response } from 'express'

const router = Router()

function generateSku() {
  return `PRD-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`
}

function buildNewProductIncomeDescription(
  productName: string,
  quantity: number,
  unitCost: number,
) {
  return `New product: ${productName} (${quantity} x EGP ${unitCost})`
}

function buildRestockExpenseDescription(
  productName: string,
  quantity: number,
  unitCost: number,
) {
  return `Stock restock: ${productName} (${quantity} x EGP ${unitCost})`
}

async function recordNewProductIncome(
  productName: string,
  purchasePrice: number,
  quantity: number,
  reference?: string,
) {
  const amount = purchasePrice * quantity
  if (amount <= 0) return
  const description = buildNewProductIncomeDescription(productName, quantity, purchasePrice)
  await recordTreasuryIncome(amount, description, reference ?? null)
}

async function recordRestockExpense(
  productName: string,
  purchasePrice: number,
  quantity: number,
  reference?: string,
) {
  const cost = purchasePrice * quantity
  if (cost <= 0) return
  const description = buildRestockExpenseDescription(productName, quantity, purchasePrice)
  await recordTreasuryExpense(cost, description, reference ?? null, 'INVENTORY_PURCHASE')
}

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

  if (!name || !categoryId) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const qty = Number(quantity)
  const unitCost = Number(purchasePrice)
  const existingProduct = await store.products.findByNameAndCategory(name, categoryId)
  if (existingProduct) {
    const updated = await store.products.update(existingProduct.id, {
      quantity: existingProduct.quantity + qty,
      purchasePrice: purchasePrice !== undefined ? unitCost : undefined,
      sellingPrice: sellingPrice !== undefined ? Number(sellingPrice) : undefined,
      lowStockLevel: lowStockLevel !== undefined ? Number(lowStockLevel) : undefined,
      supplierId: supplierId !== undefined ? (supplierId || null) : undefined,
      description: description !== undefined ? (description ?? null) : undefined,
      barcode: barcode !== undefined ? (barcode ?? null) : undefined,
    })
    await recordRestockExpense(
      name,
      purchasePrice !== undefined ? unitCost : existingProduct.purchasePrice,
      qty,
      existingProduct.id,
    )
    return res.status(200).json({
      success: true,
      data: updated,
      message: 'Stock added to existing product in this category',
    })
  }

  const resolvedSku = (sku && String(sku).trim()) || generateSku()
  const skuTaken = await store.products.findBySku(resolvedSku)
  if (skuTaken) return res.status(400).json({ error: 'Product with this SKU already exists' })

  const product = await store.products.create({
    name,
    sku: resolvedSku,
    description: description ?? null,
    categoryId,
    supplierId: supplierId ?? null,
    purchasePrice: unitCost,
    sellingPrice: Number(sellingPrice),
    quantity: qty,
    lowStockLevel: Number(lowStockLevel),
    barcode: barcode ?? null,
  })

  await recordNewProductIncome(name, unitCost, qty, product.id)

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
  const newQty = quantity !== undefined ? Number(quantity) : undefined
  if (newQty !== undefined) updateData.quantity = newQty
  if (lowStockLevel !== undefined) updateData.lowStockLevel = Number(lowStockLevel)
  if (barcode !== undefined) updateData.barcode = barcode

  const updated = await store.products.update(paramId(req), updateData)

  if (newQty !== undefined && newQty > product.quantity) {
    const addedQty = newQty - product.quantity
    const unitCost = purchasePrice !== undefined ? Number(purchasePrice) : product.purchasePrice
    await recordRestockExpense(product.name, unitCost, addedQty, product.id)
  }

  return res.json({ success: true, data: updated })
}))

router.delete('/products/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const deleted = await store.products.delete(paramId(req))
  if (!deleted) return res.status(404).json({ error: 'Product not found' })
  return res.json({ success: true, message: 'Product deleted' })
}))

export default router
