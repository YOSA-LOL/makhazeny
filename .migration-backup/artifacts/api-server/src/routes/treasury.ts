import { Router } from 'express'
import { store } from '../lib/store.js'
import { requireAuth } from '../middlewares/requireAuth.js'
import type { Request, Response } from 'express'

const router = Router()

const INCOME_TYPES = ['SALES_INCOME', 'INSTALLMENT_PAYMENT', 'MANUAL_INCOME']
const EXPENSE_TYPES = ['SUPPLIER_PAYMENT', 'MANUAL_EXPENSE', 'RETURN_REFUND']

function calcSummary(transactions: { type: string; amount: number }[], openingBalance: number) {
  const income = transactions.filter((t) => INCOME_TYPES.includes(t.type)).reduce((sum, t) => sum + t.amount, 0)
  const expenses = transactions.filter((t) => EXPENSE_TYPES.includes(t.type)).reduce((sum, t) => sum + t.amount, 0)
  const profit = income - expenses
  return { income, expenses, profit, closingBalance: openingBalance + profit }
}

router.get('/treasury', requireAuth, (req: Request, res: Response) => {
  const date = (req.query.date as string) ?? undefined
  const page = parseInt((req.query.page as string) || '1')
  const limit = parseInt((req.query.limit as string) || '10')
  const skip = (page - 1) * limit

  const { items, total } = store.treasury.findMany({ date, skip, limit })
  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
})

router.post('/treasury', requireAuth, (req: Request, res: Response) => {
  const { action } = req.body

  if (action === 'get-today') {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let treasury = store.treasury.findByDate(today)
    if (!treasury) {
      const last = store.treasury.findPreviousDay(today)
      const openingBalance = last?.dailyBalance?.closingBalance ?? 0
      treasury = store.treasury.create({ date: today, openingBalance, closingBalance: openingBalance, notes: 'Treasury opened with balance from previous day' })
    }

    const transactions = treasury.transactions || []
    const summary = calcSummary(transactions, treasury.openingBalance)
    return res.json({ success: true, data: { treasury, summary: { openingBalance: treasury.openingBalance, ...summary, transactionCount: transactions.length } } })
  }

  if (action === 'add-manual-expense') {
    const { amount, description, treasuryId } = req.body
    if (!amount || !description || !treasuryId) return res.status(400).json({ error: 'Missing required fields' })

    const treasury = store.treasury.findById(treasuryId)
    if (!treasury) return res.status(404).json({ error: 'Treasury not found' })

    const transaction = store.treasuryTransactions.create({ treasuryId, type: 'MANUAL_EXPENSE', amount: Number(amount), description, reference: null, saleId: null, paymentId: null, supplierPaymentId: null, supplierId: null, returnId: null, expenseId: null })
    return res.json({ success: true, data: transaction })
  }

  if (action === 'add-manual-income') {
    const { amount, description, treasuryId } = req.body
    if (!amount || !description || !treasuryId) return res.status(400).json({ error: 'Missing required fields' })

    const treasury = store.treasury.findById(treasuryId)
    if (!treasury) return res.status(404).json({ error: 'Treasury not found' })

    const transaction = store.treasuryTransactions.create({ treasuryId, type: 'MANUAL_INCOME', amount: Number(amount), description, reference: null, saleId: null, paymentId: null, supplierPaymentId: null, supplierId: null, returnId: null, expenseId: null })
    return res.json({ success: true, data: transaction })
  }

  return res.status(400).json({ error: 'Invalid action' })
})

router.get('/treasury/summary', requireAuth, (req: Request, res: Response) => {
  const days = parseInt((req.query.days as string) || '7')

  const endDate = new Date()
  endDate.setHours(23, 59, 59, 999)
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - (days - 1))
  startDate.setHours(0, 0, 0, 0)

  const treasuries = store.treasury.findInDateRange(startDate, endDate)

  const dailySummaries = treasuries.map((t) => {
    const transactions = t.transactions || []
    const income = transactions.filter((tx) => INCOME_TYPES.includes(tx.type)).reduce((sum, tx) => sum + tx.amount, 0)
    const expenses = transactions.filter((tx) => EXPENSE_TYPES.includes(tx.type)).reduce((sum, tx) => sum + tx.amount, 0)
    return { date: t.date, openingBalance: t.openingBalance, closingBalance: t.openingBalance + income - expenses, income, expenses, profit: income - expenses, transactionCount: transactions.length }
  })

  const totals = {
    totalIncome: dailySummaries.reduce((s, d) => s + d.income, 0),
    totalExpenses: dailySummaries.reduce((s, d) => s + d.expenses, 0),
    totalProfit: dailySummaries.reduce((s, d) => s + d.profit, 0),
    averageDailyIncome: 0,
    averageDailyExpense: 0,
    averageDailyProfit: 0,
  }

  if (dailySummaries.length > 0) {
    totals.averageDailyIncome = totals.totalIncome / dailySummaries.length
    totals.averageDailyExpense = totals.totalExpenses / dailySummaries.length
    totals.averageDailyProfit = totals.totalProfit / dailySummaries.length
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayTreasury = store.treasury.findByDate(today)
  let currentBalance = 0
  if (todayTreasury) {
    const todayTransactions = todayTreasury.transactions || []
    const todayIncome = todayTransactions.filter((t) => INCOME_TYPES.includes(t.type)).reduce((sum, t) => sum + t.amount, 0)
    const todayExpenses = todayTransactions.filter((t) => EXPENSE_TYPES.includes(t.type)).reduce((sum, t) => sum + t.amount, 0)
    currentBalance = todayTreasury.openingBalance + todayIncome - todayExpenses
  }

  res.json({ success: true, data: { dailySummaries, totals, currentBalance, period: { startDate, endDate, days } } })
})

router.get('/treasury/transactions', requireAuth, (req: Request, res: Response) => {
  const treasuryId = (req.query.treasuryId as string) ?? undefined
  const startDate = (req.query.startDate as string) ?? undefined
  const endDate = (req.query.endDate as string) ?? undefined
  const type = (req.query.type as string) ?? undefined
  const page = parseInt((req.query.page as string) || '1')
  const limit = parseInt((req.query.limit as string) || '20')
  const skip = (page - 1) * limit

  const { items, total } = store.treasuryTransactions.findMany({ treasuryId, startDate, endDate, type, skip, limit })
  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
})

router.post('/treasury/transactions', requireAuth, (req: Request, res: Response) => {
  const { treasuryId, type, amount, description, reference, saleId, paymentId, expenseId } = req.body

  if (!treasuryId || !type || !amount || !description) return res.status(400).json({ error: 'Missing required fields' })

  const treasury = store.treasury.findById(treasuryId)
  if (!treasury) return res.status(404).json({ error: 'Treasury record not found' })

  const transaction = store.treasuryTransactions.create({ treasuryId, type, amount: Number(amount), description, reference: reference ?? null, saleId: saleId ?? null, paymentId: paymentId ?? null, supplierPaymentId: null, supplierId: null, returnId: null, expenseId: expenseId ?? null })
  return res.status(201).json({ success: true, data: transaction })
})

export default router
