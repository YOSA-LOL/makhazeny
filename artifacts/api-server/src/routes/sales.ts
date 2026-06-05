import { Router } from 'express'
import { store } from '../lib/store.js'
import { requireAuth, requireAdmin } from '../middlewares/requireAuth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { paramId } from '../lib/params.js'
import type { Request, Response } from 'express'

const router = Router()

router.get('/sales', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const search = (req.query.search as string) || ''
  const date = (req.query.date as string) || undefined
  const page = parseInt((req.query.page as string) || '1')
  const limit = parseInt((req.query.limit as string) || '10')
  const skip = (page - 1) * limit

  const { items, total } = await store.sales.findMany({ search: search || undefined, date, skip, limit })
  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
}))

router.get('/sales/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const sale = await store.sales.findById(paramId(req))
  if (!sale) return res.status(404).json({ error: 'Sale not found' })
  return res.json({ success: true, data: sale })
}))

router.post('/sales', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { customerId, paymentMethod, paidAmount: paidAmountRaw, dueDate, notes, items } = req.body

  if (!customerId || !items?.length) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const customer = await store.customers.findById(customerId)
  if (!customer) return res.status(404).json({ error: 'Customer not found' })

  let totalAmount = 0
  const itemsWithValidation = []
  for (const item of items as { productId: string; quantity: number; price: number }[]) {
    const product = await store.products.findById(item.productId)
    if (!product) throw new Error(`Product ${item.productId} not found`)
    if (product.quantity < item.quantity) throw new Error(`Insufficient stock for ${product.name}`)
    const itemTotal = item.price * item.quantity
    totalAmount += itemTotal
    itemsWithValidation.push({ ...item, total: itemTotal })
  }

  const paidAmount = paidAmountRaw !== undefined
    ? Math.min(Math.max(0, Number(paidAmountRaw)), totalAmount)
    : totalAmount

  const remainingAmount = Math.max(0, totalAmount - paidAmount)

  const status: 'PAID' | 'PARTIAL' | 'PENDING' =
    paidAmount >= totalAmount ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'PENDING'

  const lastSaleNumber = await store.sales.findLastSaleNumber()
  const lastNumber = lastSaleNumber ? parseInt(lastSaleNumber.split('-')[1] || '0') : 0
  const saleNumber = `SALE-${String(lastNumber + 1).padStart(6, '0')}`

  const sale = await store.sales.create({
    saleNumber,
    customerId,
    totalAmount,
    paidAmount,
    status,
    paymentMethod,
    notes,
    items: itemsWithValidation,
  })

  if (remainingAmount > 0) {
    await store.debts.create({
      saleId: sale.id,
      customerId,
      originalAmount: totalAmount,
      remainingAmount,
      status: paidAmount > 0 ? 'PARTIAL' : 'ACTIVE',
      dueDate: dueDate ? new Date(dueDate) : null,
    })
  }

  if (paidAmount > 0) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const treasury = await store.treasury.findByDate(today)
    if (treasury) {
      await store.treasuryTransactions.create({
        treasuryId: treasury.id,
        type: 'SALES_INCOME',
        amount: paidAmount,
        description: `Sale #${saleNumber} — ${paymentMethod}`,
        reference: saleNumber,
        saleId: sale.id,
        paymentId: null,
        supplierPaymentId: null,
        supplierId: null,
        returnId: null,
        expenseId: null,
      })
    }
  }

  return res.status(201).json({ success: true, data: await store.sales.findById(sale.id) })
}))

router.put('/sales/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const sale = await store.sales.findById(paramId(req))
  if (!sale) return res.status(404).json({ error: 'Sale not found' })

  const { status, paidAmount, notes } = req.body
  const updateData: Record<string, unknown> = {}
  if (status !== undefined) updateData.status = status
  if (paidAmount !== undefined) updateData.paidAmount = paidAmount
  if (notes !== undefined) updateData.notes = notes

  const updated = await store.sales.update(paramId(req), updateData)
  return res.json({ success: true, data: updated })
}))

router.delete('/sales/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const deleted = await store.sales.delete(paramId(req))
  if (!deleted) return res.status(404).json({ error: 'Sale not found' })
  return res.json({ success: true, message: 'Sale deleted' })
}))

export default router
