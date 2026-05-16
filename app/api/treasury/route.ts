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
    const date = searchParams.get('date') // specific date or 'today'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    let whereDate: any = {}
    if (date === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      whereDate = {
        date: {
          gte: today,
          lt: tomorrow,
        },
      }
    } else if (date) {
      const selectedDate = new Date(date)
      selectedDate.setHours(0, 0, 0, 0)
      const nextDay = new Date(selectedDate)
      nextDay.setDate(nextDay.getDate() + 1)

      whereDate = {
        date: {
          gte: selectedDate,
          lt: nextDay,
        },
      }
    }

    const [treasuries, total] = await Promise.all([
      prisma.treasury.findMany({
        where: whereDate,
        include: { transactions: true, dailyBalance: true },
        skip,
        take: limit,
        orderBy: { date: 'desc' },
      }),
      prisma.treasury.count({ where: whereDate }),
    ])

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

// Get current day's treasury summary
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
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      let treasury = await prisma.treasury.findFirst({
        where: {
          date: {
            gte: today,
            lt: tomorrow,
          },
        },
        include: {
          transactions: true,
          dailyBalance: true,
        },
      })

      if (!treasury) {
        // Get yesterday's closing balance for opening balance
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        yesterday.setHours(0, 0, 0, 0)

        const lastTreasury = await prisma.treasury.findFirst({
          where: {
            date: {
              gte: yesterday,
              lt: today,
            },
          },
          include: { dailyBalance: true },
        })

        const openingBalance = lastTreasury?.dailyBalance?.closingBalance || new Decimal(0)

        // Create today's treasury with opening balance
        treasury = await prisma.treasury.create({
          data: {
            date: today,
            openingBalance: openingBalance,
            closingBalance: openingBalance,
            notes: `Treasury opened with balance from previous day`,
          },
          include: {
            transactions: true,
            dailyBalance: true,
          },
        })
      }

      // Calculate today's summary
      const transactions = treasury.transactions || []
      const income = transactions
        .filter((t) => ['SALES_INCOME', 'INSTALLMENT_PAYMENT', 'MANUAL_INCOME'].includes(t.type))
        .reduce((sum, t) => sum.plus(t.amount), new Decimal(0))

      const expenses = transactions
        .filter((t) => ['SUPPLIER_PAYMENT', 'MANUAL_EXPENSE', 'RETURN_REFUND'].includes(t.type))
        .reduce((sum, t) => sum.plus(t.amount), new Decimal(0))

      const profit = income.minus(expenses)
      const closingBalance = (treasury.openingBalance as Decimal | unknown as Decimal).plus(profit)

      return NextResponse.json({
        success: true,
        data: {
          treasury,
          summary: {
            openingBalance: treasury.openingBalance,
            income,
            expenses,
            profit,
            closingBalance,
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
