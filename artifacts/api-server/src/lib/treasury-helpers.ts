import { store } from './store.js'

export const INCOME_TYPES = [
  'SALES_INCOME',
  'INSTALLMENT_PAYMENT',
  'MANUAL_INCOME',
  'BALANCE_CARRYOVER',
  'RETURN_REFUND',
] as const

export const EXPENSE_TYPES = ['SUPPLIER_PAYMENT', 'MANUAL_EXPENSE', 'INVENTORY_PURCHASE'] as const

export function calcTreasurySummary(
  transactions: { type: string; amount: number }[],
  openingBalance: number,
) {
  const income = transactions
    .filter((t) => INCOME_TYPES.includes(t.type as (typeof INCOME_TYPES)[number]))
    .reduce((sum, t) => sum + t.amount, 0)
  const expenses = transactions
    .filter((t) => EXPENSE_TYPES.includes(t.type as (typeof EXPENSE_TYPES)[number]))
    .reduce((sum, t) => sum + t.amount, 0)
  const profit = income - expenses
  return { income, expenses, profit, closingBalance: openingBalance + profit }
}

export async function ensureTreasuryForDate(date: Date = new Date()) {
  const day = new Date(date)
  day.setHours(0, 0, 0, 0)

  let treasury = await store.treasury.findByDate(day)
  if (treasury) return treasury

  const last = await store.treasury.findPreviousDay(day)
  const openingBalance = last?.closingBalance ?? 0

  return store.treasury.create({
    date: day,
    openingBalance,
    closingBalance: openingBalance,
    notes: 'Treasury opened automatically',
  })
}

export async function recordTreasuryIncome(
  amount: number,
  description: string,
  reference?: string | null,
) {
  if (!amount || amount <= 0) return null
  if (!description?.trim()) return null

  const treasury = await ensureTreasuryForDate()
  return store.treasuryTransactions.create({
    treasuryId: treasury.id,
    type: 'MANUAL_INCOME',
    amount,
    description: description.trim(),
    reference: reference ?? null,
    saleId: null,
    paymentId: null,
    supplierPaymentId: null,
    supplierId: null,
    returnId: null,
    expenseId: null,
  })
}

export async function recordTreasuryExpense(
  amount: number,
  description: string,
  reference?: string | null,
  type: 'MANUAL_EXPENSE' | 'INVENTORY_PURCHASE' = 'MANUAL_EXPENSE',
) {
  if (!amount || amount <= 0) return null
  if (!description?.trim()) return null

  const treasury = await ensureTreasuryForDate()
  const payload = {
    treasuryId: treasury.id,
    type,
    amount,
    description: description.trim(),
    reference: reference ?? null,
    saleId: null,
    paymentId: null,
    supplierPaymentId: null,
    supplierId: null,
    returnId: null,
    expenseId: null,
  }

  try {
    return await store.treasuryTransactions.create(payload)
  } catch (err) {
    // Fallback when DB enum does not include INVENTORY_PURCHASE yet
    if (type === 'INVENTORY_PURCHASE') {
      return store.treasuryTransactions.create({ ...payload, type: 'MANUAL_EXPENSE' })
    }
    throw err
  }
}
