import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'
import { getCurrentUser } from '@/lib/auth'

const INCOME_TYPES = ['SALES_INCOME', 'INSTALLMENT_PAYMENT', 'MANUAL_INCOME']
const EXPENSE_TYPES = ['SUPPLIER_PAYMENT', 'MANUAL_EXPENSE', 'RETURN_REFUND']

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '7')

    const endDate = new Date()
    endDate.setHours(23, 59, 59, 999)

    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - (days - 1))
    startDate.setHours(0, 0, 0, 0)

    const treasuries = store.treasury.findInDateRange(startDate, endDate)

    const dailySummaries = treasuries.map((treasury) => {
      const transactions = treasury.transactions || []

      const income = transactions
        .filter((t) => INCOME_TYPES.includes(t.type))
        .reduce((sum, t) => sum + t.amount, 0)

      const expenses = transactions
        .filter((t) => EXPENSE_TYPES.includes(t.type))
        .reduce((sum, t) => sum + t.amount, 0)

      const profit = income - expenses
      const closingBalance = treasury.openingBalance + profit

      return {
        date: treasury.date,
        openingBalance: treasury.openingBalance,
        closingBalance,
        income,
        expenses,
        profit,
        transactionCount: transactions.length,
      }
    })

    const totals = {
      totalIncome: dailySummaries.reduce((sum, d) => sum + d.income, 0),
      totalExpenses: dailySummaries.reduce((sum, d) => sum + d.expenses, 0),
      totalProfit: dailySummaries.reduce((sum, d) => sum + d.profit, 0),
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
      const todayIncome = todayTransactions
        .filter((t) => INCOME_TYPES.includes(t.type))
        .reduce((sum, t) => sum + t.amount, 0)

      const todayExpenses = todayTransactions
        .filter((t) => EXPENSE_TYPES.includes(t.type))
        .reduce((sum, t) => sum + t.amount, 0)

      const todayProfit = todayIncome - todayExpenses
      currentBalance = todayTreasury.openingBalance + todayProfit
    }

    return NextResponse.json({
      success: true,
      data: {
        dailySummaries,
        totals,
        currentBalance,
        period: {
          startDate,
          endDate,
          days,
        },
      },
    })
  } catch (error) {
    console.error('Failed to fetch summary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch summary' },
      { status: 500 }
    )
  }
}
