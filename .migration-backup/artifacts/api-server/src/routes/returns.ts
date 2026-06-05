import { Router } from 'express'
import { store } from '../lib/store.js'
import { requireAuth } from '../middlewares/requireAuth.js'
import type { Request, Response } from 'express'

const router = Router()

router.get('/returns', requireAuth, (req: Request, res: Response) => {
  const status = (req.query.status as string) || 'PENDING'
  const page = parseInt((req.query.page as string) || '1')
  const limit = parseInt((req.query.limit as string) || '10')
  const skip = (page - 1) * limit

  const { items, total } = store.returns.findMany({ status, skip, limit })
  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
})

router.get('/returns/:id', requireAuth, (req: Request, res: Response) => {
  const r = store.returns.findById(req.params.id)
  if (!r) return res.status(404).json({ error: 'Return not found' })
  return res.json({ success: true, data: r })
})

router.post('/returns', requireAuth, (req: Request, res: Response) => {
  try {
    const { saleId, items, reason, notes } = req.body
    if (!saleId || !items?.length) return res.status(400).json({ error: 'Missing required fields' })

    const sale = store.sales.findById(saleId)
    if (!sale) return res.status(404).json({ error: 'Sale not found' })

    let totalReturnAmount = 0
    const validatedItems = items.map((item: { saleItemId?: string; productId: string; quantity: number; amount: number }) => {
      const saleItem = sale.items.find((si) => si.id === item.saleItemId)
      if (!saleItem) throw new Error(`Sale item not found`)
      if (item.quantity > saleItem.quantity) throw new Error('Cannot return more than purchased quantity')
      const itemReturnAmount = saleItem.price * item.quantity
      totalReturnAmount += itemReturnAmount
      return { ...item, productId: saleItem.productId, price: saleItem.price, returnAmount: itemReturnAmount }
    })

    const lastReturnNumber = store.returns.findLastReturnNumber()
    const lastNumber = lastReturnNumber ? parseInt(lastReturnNumber.split('-')[1] || '0') : 0
    const returnNumber = `RET-${String(lastNumber + 1).padStart(6, '0')}`

    const returnRecord = store.returns.create({ returnNumber, saleId, customerId: sale.customerId, totalReturnAmount, reason, notes, items: validatedItems })
    return res.status(201).json({ success: true, data: returnRecord })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create return'
    return res.status(400).json({ error: message })
  }
})

router.put('/returns/:id', requireAuth, (req: Request, res: Response) => {
  const { status, notes } = req.body
  const returnRecord = store.returns.findById(req.params.id)
  if (!returnRecord) return res.status(404).json({ error: 'Return not found' })

  if (status === 'APPROVED' && returnRecord.status !== 'APPROVED') {
    for (const item of returnRecord.items) {
      store.products.incrementQuantity(item.productId, item.quantity)
    }
    const debtId = returnRecord.sale.debtId
    if (debtId) {
      const debt = store.debts.findById(debtId)
      if (debt) {
        const newRemaining = debt.remainingAmount - returnRecord.totalReturnAmount
        store.debts.update(debt.id, { remainingAmount: Math.max(0, newRemaining), status: newRemaining <= 0 ? 'PAID' : undefined })
      }
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const treasury = store.treasury.findByDate(today)
    if (treasury) {
      store.treasuryTransactions.create({
        treasuryId: treasury.id,
        type: 'RETURN_REFUND',
        amount: returnRecord.totalReturnAmount,
        description: `Return refund for sale ${returnRecord.sale.saleNumber}`,
        reference: req.params.id,
        saleId: null,
        paymentId: null,
        supplierPaymentId: null,
        supplierId: null,
        returnId: req.params.id,
        expenseId: null,
      })
    }
  }

  const updateData: Record<string, unknown> = {}
  if (status) updateData.status = status
  if (notes !== undefined) updateData.notes = notes

  const updated = store.returns.update(req.params.id, updateData)
  return res.json({ success: true, data: updated })
})

export default router
