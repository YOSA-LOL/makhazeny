import { Router } from 'express'
import { store } from '../lib/store.js'
import { requireAuth } from '../middlewares/requireAuth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import type { Request, Response } from 'express'

const router = Router()

const INCOME_TYPES = ['SALES_INCOME', 'INSTALLMENT_PAYMENT', 'MANUAL_INCOME', 'BALANCE_CARRYOVER']
const EXPENSE_TYPES = ['SUPPLIER_PAYMENT', 'MANUAL_EXPENSE', 'RETURN_REFUND']

function calcSummary(transactions: { type: string; amount: number }[], openingBalance: number) {
  const income = transactions.filter((t) => INCOME_TYPES.includes(t.type)).reduce((sum, t) => sum + t.amount, 0)
  const expenses = transactions.filter((t) => EXPENSE_TYPES.includes(t.type)).reduce((sum, t) => sum + t.amount, 0)
  const profit = income - expenses
  return { income, expenses, profit, closingBalance: openingBalance + profit }
}

router.get('/treasury', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const date = (req.query.date as string) ?? undefined
  const page = parseInt((req.query.page as string) || '1')
  const limit = parseInt((req.query.limit as string) || '10')
  const skip = (page - 1) * limit

  const { items, total } = await store.treasury.findMany({ date, skip, limit })
  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
}))

async function sealPastOpenTreasuries(beforeDate: Date) {
  const todayStart = new Date(beforeDate)
  todayStart.setHours(0, 0, 0, 0)

  const { items: allTreasuries } = await store.treasury.findMany({ skip: 0, limit: 9999 })
  for (const t of allTreasuries) {
    const tDay = new Date(t.date)
    tDay.setHours(0, 0, 0, 0)
    if (tDay.getTime() < todayStart.getTime() && !t.isClosed) {
      const txns = (t.transactions || []).filter((tx: { type: string }) => tx.type !== 'BALANCE_CARRYOVER')
      const { closingBalance } = calcSummary(txns, t.openingBalance)
      await store.treasury.closeDay(t.id, closingBalance, true)
    }
  }
}

router.post('/treasury', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { action } = req.body

  if (action === 'get-today' || action === 'get-by-date') {
    const targetDate = req.body.date ? new Date(req.body.date) : new Date()
    targetDate.setHours(0, 0, 0, 0)

    const serverToday = new Date()
    serverToday.setHours(0, 0, 0, 0)

    const DAY_MS = 24 * 60 * 60 * 1000
    const isToday =
      targetDate.getTime() >= serverToday.getTime() &&
      targetDate.getTime() < serverToday.getTime() + 2 * DAY_MS

    const sealBefore = targetDate.getTime() > serverToday.getTime() ? targetDate : serverToday
    await sealPastOpenTreasuries(sealBefore)

    let treasury = await store.treasury.findByDate(targetDate)

    if (!treasury && isToday) {
      const last = await store.treasury.findPreviousDay(targetDate)
      const openingBalance = last?.closingBalance ?? 0

      treasury = await store.treasury.create({
        date: targetDate,
        openingBalance,
        closingBalance: openingBalance,
        notes: 'Treasury opened with balance from previous day',
      })

      if (openingBalance > 0 && last) {
        const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth()+1).padStart(2,'0')}-${String(targetDate.getDate()).padStart(2,'0')}`
        await store.treasuryTransactions.create({
          treasuryId: treasury.id,
          type: 'BALANCE_CARRYOVER',
          amount: openingBalance,
          description: `Balance carried over from ${new Date(last.date).toLocaleDateString('en-EG')}`,
          reference: `CARRYOVER-${dateStr}`,
          saleId: null, paymentId: null, supplierPaymentId: null,
          supplierId: null, returnId: null, expenseId: null,
        })
        treasury = (await store.treasury.findByDate(targetDate))!
      }
    }

    if (!treasury) {
      return res.json({ success: true, data: null })
    }

    const transactions = treasury.transactions || []
    const regularTransactions = transactions.filter((t) => t.type !== 'BALANCE_CARRYOVER')
    const summary = calcSummary(regularTransactions, treasury.openingBalance)
    return res.json({
      success: true,
      data: {
        treasury,
        summary: {
          openingBalance: treasury.openingBalance,
          ...summary,
          transactionCount: regularTransactions.length,
          isClosed: treasury.isClosed,
          closedAt: treasury.closedAt,
          closedBySystem: treasury.closedBySystem,
        },
      },
    })
  }

  if (action === 'close-day') {
    const { treasuryId } = req.body
    if (!treasuryId) return res.status(400).json({ error: 'Missing treasuryId' })

    const treasury = await store.treasury.findById(treasuryId)
    if (!treasury) return res.status(404).json({ error: 'Treasury not found' })
    if (treasury.isClosed) return res.status(400).json({ error: 'Day is already closed' })

    const transactions = treasury.transactions || []
    const regularTransactions = transactions.filter((t) => t.type !== 'BALANCE_CARRYOVER')
    const summary = calcSummary(regularTransactions, treasury.openingBalance)

    const closedBySystem = req.body.closedBySystem === true
    const updated = await store.treasury.closeDay(treasuryId, summary.closingBalance, closedBySystem)
    return res.json({ success: true, data: updated, closingBalance: summary.closingBalance })
  }

  if (action === 'reopen-day') {
    const { treasuryId } = req.body
    if (!treasuryId) return res.status(400).json({ error: 'Missing treasuryId' })

    const treasury = await store.treasury.findById(treasuryId)
    if (!treasury) return res.status(404).json({ error: 'Treasury not found' })
    if (!treasury.isClosed) return res.status(400).json({ error: 'Day is not closed' })
    if (treasury.closedBySystem) return res.status(400).json({ error: 'This day was automatically closed and cannot be reopened' })

    const t = new Date()
    const isPastMidnight = t.getHours() === 23 && t.getMinutes() >= 59
    if (isPastMidnight) return res.status(400).json({ error: 'Cannot reopen after 11:59 PM' })

    const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0)
    const tomorrowDate = new Date(todayDate.getTime() + 24 * 60 * 60 * 1000)
    const treasuryDay = new Date(treasury.date); treasuryDay.setHours(0, 0, 0, 0)
    const isClientToday =
      treasuryDay.getTime() === todayDate.getTime() ||
      treasuryDay.getTime() === tomorrowDate.getTime()
    if (!isClientToday) {
      return res.status(400).json({ error: 'Can only reopen today\'s treasury' })
    }

    const updated = await store.treasury.reopenDay(treasury.id)
    return res.json({ success: true, data: updated })
  }

  if (action === 'add-manual-expense') {
    const { amount, description, treasuryId } = req.body
    if (!amount || !description || !treasuryId) return res.status(400).json({ error: 'Missing required fields' })

    const treasury = await store.treasury.findById(treasuryId)
    if (!treasury) return res.status(404).json({ error: 'Treasury not found' })

    const transaction = await store.treasuryTransactions.create({ treasuryId, type: 'MANUAL_EXPENSE', amount: Number(amount), description, reference: null, saleId: null, paymentId: null, supplierPaymentId: null, supplierId: null, returnId: null, expenseId: null })
    return res.json({ success: true, data: transaction })
  }

  if (action === 'add-manual-income') {
    const { amount, description, treasuryId } = req.body
    if (!amount || !description || !treasuryId) return res.status(400).json({ error: 'Missing required fields' })

    const treasury = await store.treasury.findById(treasuryId)
    if (!treasury) return res.status(404).json({ error: 'Treasury not found' })

    const transaction = await store.treasuryTransactions.create({ treasuryId, type: 'MANUAL_INCOME', amount: Number(amount), description, reference: null, saleId: null, paymentId: null, supplierPaymentId: null, supplierId: null, returnId: null, expenseId: null })
    return res.json({ success: true, data: transaction })
  }

  return res.status(400).json({ error: 'Invalid action' })
}))

router.get('/treasury/summary', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const days = parseInt((req.query.days as string) || '7')

  const endDate = new Date()
  endDate.setHours(23, 59, 59, 999)
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - (days - 1))
  startDate.setHours(0, 0, 0, 0)

  const treasuries = await store.treasury.findInDateRange(startDate, endDate)

  const dailySummaries = treasuries.map((t) => {
    const transactions = (t.transactions || []).filter((tx) => tx.type !== 'BALANCE_CARRYOVER')
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
  const todayTreasury = await store.treasury.findByDate(today)
  let currentBalance = 0
  if (todayTreasury) {
    const todayTransactions = (todayTreasury.transactions || []).filter((t) => t.type !== 'BALANCE_CARRYOVER')
    const todayIncome = todayTransactions.filter((t) => INCOME_TYPES.includes(t.type)).reduce((sum, t) => sum + t.amount, 0)
    const todayExpenses = todayTransactions.filter((t) => EXPENSE_TYPES.includes(t.type)).reduce((sum, t) => sum + t.amount, 0)
    currentBalance = todayTreasury.openingBalance + todayIncome - todayExpenses
  }

  res.json({ success: true, data: { dailySummaries, totals, currentBalance, period: { startDate, endDate, days } } })
}))

router.get('/treasury/transactions', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const treasuryId = (req.query.treasuryId as string) ?? undefined
  const startDate = (req.query.startDate as string) ?? undefined
  const endDate = (req.query.endDate as string) ?? undefined
  const type = (req.query.type as string) ?? undefined
  const page = parseInt((req.query.page as string) || '1')
  const limit = parseInt((req.query.limit as string) || '20')
  const skip = (page - 1) * limit

  const { items, total } = await store.treasuryTransactions.findMany({ treasuryId, startDate, endDate, type, skip, limit })
  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
}))

router.post('/treasury/transactions', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { treasuryId, type, amount, description, reference, saleId, paymentId, expenseId } = req.body

  if (!treasuryId || !type || !amount || !description) return res.status(400).json({ error: 'Missing required fields' })

  const treasury = await store.treasury.findById(treasuryId)
  if (!treasury) return res.status(404).json({ error: 'Treasury record not found' })

  const transaction = await store.treasuryTransactions.create({ treasuryId, type, amount: Number(amount), description, reference: reference ?? null, saleId: saleId ?? null, paymentId: paymentId ?? null, supplierPaymentId: null, supplierId: null, returnId: null, expenseId: expenseId ?? null })
  return res.status(201).json({ success: true, data: transaction })
}))

export default router
