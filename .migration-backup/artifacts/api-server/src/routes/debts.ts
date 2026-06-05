import { Router } from 'express'
import { store } from '../lib/store.js'
import { requireAuth } from '../middlewares/requireAuth.js'
import type { Request, Response } from 'express'

const router = Router()

router.get('/debts', requireAuth, (req: Request, res: Response) => {
  const customerId = (req.query.customerId as string) ?? undefined
  const status = (req.query.status as string) ?? undefined
  const page = parseInt((req.query.page as string) || '1')
  const limit = parseInt((req.query.limit as string) || '10')
  const skip = (page - 1) * limit

  const { items, total } = store.debts.findMany({ customerId, status, skip, limit })
  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
})

router.post('/debts', requireAuth, (req: Request, res: Response) => {
  const { customerId, amount, description, dueDate } = req.body
  if (!customerId || !amount) return res.status(400).json({ error: 'Missing required fields' })

  const debt = store.debts.create({
    customerId,
    originalAmount: Number(amount),
    remainingAmount: Number(amount),
    status: 'ACTIVE',
    description,
    dueDate: dueDate ? new Date(dueDate) : undefined,
  })
  return res.status(201).json({ success: true, data: debt })
})

router.get('/debts/:id/payments', requireAuth, (req: Request, res: Response) => {
  const payments = store.payments.findByDebtId(req.params.id)
  res.json({ success: true, data: payments })
})

router.post('/debts/:id/payments', requireAuth, (req: Request, res: Response) => {
  const { amount, paymentMethod, notes } = req.body
  const debtId = req.params.id

  if (!amount) return res.status(400).json({ error: 'Payment amount is required' })

  const debt = store.debts.findById(debtId)
  if (!debt) return res.status(404).json({ error: 'Debt not found' })

  const paymentAmount = Number(amount)
  if (paymentAmount > debt.remainingAmount) return res.status(400).json({ error: 'Payment amount exceeds remaining debt' })

  const payment = store.payments.create({ debtId, customerId: debt.customerId, amount: paymentAmount, paymentMethod, notes })

  const newRemaining = debt.remainingAmount - paymentAmount
  const newStatus = newRemaining === 0 ? 'PAID' : newRemaining < debt.originalAmount ? 'PARTIAL' : 'ACTIVE'

  const updatedDebt = store.debts.update(debtId, { remainingAmount: Math.max(0, newRemaining), status: newStatus as 'PAID' | 'PARTIAL' | 'ACTIVE' })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const treasury = store.treasury.findByDate(today)
  if (treasury) {
    store.treasuryTransactions.create({
      treasuryId: treasury.id,
      type: 'INSTALLMENT_PAYMENT',
      amount: paymentAmount,
      description: `Debt payment from ${debt.customer?.name || 'Customer'}`,
      reference: debtId,
      saleId: null,
      paymentId: payment.id,
      supplierPaymentId: null,
      supplierId: null,
      returnId: null,
      expenseId: null,
    })
  }

  return res.status(201).json({ success: true, data: { payment, debt: updatedDebt } })
})

export default router
