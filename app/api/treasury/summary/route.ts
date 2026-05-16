import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { Decimal } from 'decimal.js'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '7') // last N days

    // Get the date range
    const endDate = new Date()
    endDate.setHours(23, 59, 59, 999)

    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - (days - 1))
    startDate.setHours(0, 0, 0, 0)

    // Get treasury records for the date range
    const treasuries = await prisma.treasury.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        transactions: true,
        dailyBalance: true,
      },
      orderBy: { date: 'asc' },
    })

    // Calculate summaries for each day
    const dailySummaries = treasuries.map((treasury) => {
      const transactions = treasury.transactions || []

      const income = transactions
        .filter((t) => ['SALES_INCOME', 'INSTALLMENT_PAYMENT', 'MANUAL_INCOME'].includes(t.type))
        .reduce((sum, t) => sum.plus(t.amount), new Decimal(0))

      const expenses = transactions
        .filter((t) => ['SUPPLIER_PAYMENT', 'MANUAL_EXPENSE', 'RETURN_REFUND'].includes(t.type))
        .reduce((sum, t) => sum.plus(t.amount), new Decimal(0))

      const profit = income.minus(expenses)
      const closingBalance = (treasury.openingBalance as unknown as Decimal).plus(profit)

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

    // Calculate totals
    const totals = {
      totalIncome: dailySummaries.reduce((sum, d) => sum.plus(d.income), new Decimal(0)),
      totalExpenses: dailySummaries.reduce((sum, d) => sum.plus(d.expenses), new Decimal(0)),
      totalProfit: dailySummaries.reduce((sum, d) => sum.plus(d.profit), new Decimal(0)),
      averageDailyIncome: new Decimal(0),
      averageDailyExpense: new Decimal(0),
      averageDailyProfit: new Decimal(0),
    }

    if (dailySummaries.length > 0) {
      totals.averageDailyIncome = totals.totalIncome.dividedBy(dailySummaries.length)
      totals.averageDailyExpense = totals.totalExpenses.dividedBy(dailySummaries.length)
      totals.averageDailyProfit = totals.totalProfit.dividedBy(dailySummaries.length)
    }

    // Get current balance (today's closing)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayTreasury = await prisma.treasury.findFirst({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: { transactions: true },
    })

    let currentBalance = new Decimal(0)
    if (todayTreasury) {
      const todayTransactions = todayTreasury.transactions || []
      const todayIncome = todayTransactions
        .filter((t) => ['SALES_INCOME', 'INSTALLMENT_PAYMENT', 'MANUAL_INCOME'].includes(t.type))
        .reduce((sum, t) => sum.plus(t.amount), new Decimal(0))

      const todayExpenses = todayTransactions
        .filter((t) => ['SUPPLIER_PAYMENT', 'MANUAL_EXPENSE', 'RETURN_REFUND'].includes(t.type))
        .reduce((sum, t) => sum.plus(t.amount), new Decimal(0))

      const todayProfit = todayIncome.minus(todayExpenses)
      currentBalance = (todayTreasury.openingBalance as unknown as Decimal).plus(todayProfit)
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
