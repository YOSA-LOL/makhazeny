import { Router } from 'express'
import { store } from '../lib/store.js'
import { requireAuth } from '../middlewares/requireAuth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { paramId } from '../lib/params.js'
import type { Request, Response } from 'express'

const router = Router()

router.get('/returns', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status as string | undefined
  const date = (req.query.date as string) ?? undefined
  const page = parseInt((req.query.page as string) || '1')
  const limit = parseInt((req.query.limit as string) || '10')
  const skip = (page - 1) * limit

  const { items, total } = await store.returns.findMany({ status, date, skip, limit })
  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
}))

router.get('/returns/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const r = await store.returns.findById(paramId(req))
  if (!r) return res.status(404).json({ error: 'Return not found' })
  return res.json({ success: true, data: r })
}))

router.post('/returns', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { saleId, items, reason, notes } = req.body
  if (!saleId || !items?.length) return res.status(400).json({ error: 'Missing required fields' })

  const sale = await store.sales.findById(saleId)
  if (!sale) return res.status(404).json({ error: 'Sale not found' })

  let totalReturnAmount = 0
  const validatedItems = []
  for (const item of items as { saleItemId?: string; productId: string; quantity: number; amount: number }[]) {
    const saleItem = sale.items.find((si) => si.id === item.saleItemId)
    if (!saleItem) throw new Error('Sale item not found')
    if (item.quantity > saleItem.quantity) throw new Error('Cannot return more than purchased quantity')
    const itemReturnAmount = saleItem.price * item.quantity
    totalReturnAmount += itemReturnAmount
    validatedItems.push({ ...item, productId: saleItem.productId, price: saleItem.price, returnAmount: itemReturnAmount })
  }

  const lastReturnNumber = await store.returns.findLastReturnNumber()
  const lastNumber = lastReturnNumber ? parseInt(lastReturnNumber.split('-')[1] || '0') : 0
  const returnNumber = `RET-${String(lastNumber + 1).padStart(6, '0')}`

  const returnRecord = await store.returns.create({ returnNumber, saleId, customerId: sale.customerId, totalReturnAmount, reason, notes, items: validatedItems })
  return res.status(201).json({ success: true, data: returnRecord })
}))

router.put('/returns/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { status, notes } = req.body
  const returnRecord = await store.returns.findById(paramId(req))
  if (!returnRecord) return res.status(404).json({ error: 'Return not found' })

  if (status === 'APPROVED' && returnRecord.status !== 'APPROVED') {
    for (const item of returnRecord.items) {
      await store.products.incrementQuantity(item.productId, item.quantity)
    }
    const debtId = returnRecord.sale.debtId
    if (debtId) {
      const debt = await store.debts.findById(debtId)
      if (debt) {
        const newRemaining = debt.remainingAmount - returnRecord.totalReturnAmount
        await store.debts.update(debt.id, { remainingAmount: Math.max(0, newRemaining), status: newRemaining <= 0 ? 'PAID' : undefined })
      }
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const treasury = await store.treasury.findByDate(today)
    if (treasury) {
      await store.treasuryTransactions.create({
        treasuryId: treasury.id,
        type: 'RETURN_REFUND',
        amount: returnRecord.totalReturnAmount,
        description: `Return income — stock recovered from sale ${returnRecord.sale.saleNumber}`,
        reference: paramId(req),
        saleId: null,
        paymentId: null,
        supplierPaymentId: null,
        supplierId: null,
        returnId: paramId(req),
        expenseId: null,
      })
    }
  }

  const updateData: Record<string, unknown> = {}
  if (status) updateData.status = status
  if (notes !== undefined) updateData.notes = notes

  const updated = await store.returns.update(paramId(req), updateData)
  return res.json({ success: true, data: updated })
}))

export default router
