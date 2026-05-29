import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'
import { getCurrentUser } from '@/lib/auth'

const INCOME_TYPES = ['SALES_INCOME', 'INSTALLMENT_PAYMENT', 'MANUAL_INCOME']
const EXPENSE_TYPES = ['SUPPLIER_PAYMENT', 'MANUAL_EXPENSE', 'RETURN_REFUND']

function calcSummary(transactions: { type: string; amount: number }[], openingBalance: number) {
  const income = transactions
    .filter((t) => INCOME_TYPES.includes(t.type))
    .reduce((sum, t) => sum + t.amount, 0)

  const expenses = transactions
    .filter((t) => EXPENSE_TYPES.includes(t.type))
    .reduce((sum, t) => sum + t.amount, 0)

  const profit = income - expenses
  const closingBalance = openingBalance + profit

  return { income, expenses, profit, closingBalance }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const date = searchParams.get('date') ?? undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const { items: treasuries, total } = store.treasury.findMany({
      date,
      skip,
      limit,
    })

    return NextResponse.json({
      success: true,
      data: treasuries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Failed to fetch treasury records:', error)
    return NextResponse.json(
      { error: 'Failed to fetch treasury records' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { action } = body

    if (action === 'get-today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      let treasury = store.treasury.findByDate(today)

      if (!treasury) {
        const lastTreasury = store.treasury.findPreviousDay(today)
        const openingBalance = lastTreasury?.dailyBalance?.closingBalance ?? 0

        treasury = store.treasury.create({
          date: today,
          openingBalance,
          closingBalance: openingBalance,
          notes: 'Treasury opened with balance from previous day',
        })
      }

      const transactions = treasury.transactions || []
      const summary = calcSummary(transactions, treasury.openingBalance)

      return NextResponse.json({
        success: true,
        data: {
          treasury,
          summary: {
            openingBalance: treasury.openingBalance,
            ...summary,
            transactionCount: transactions.length,
          },
        },
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Failed to process treasury action:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
