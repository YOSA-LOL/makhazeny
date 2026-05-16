import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { treasuryTransactionSchema } from '@/lib/validation'
import { getCurrentUser } from '@/lib/auth'
import { Decimal } from 'decimal.js'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const treasuryId = searchParams.get('treasuryId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const type = searchParams.get('type')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: any = {}

    if (treasuryId) {
      where.treasuryId = treasuryId
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    if (type) {
      where.type = type
    }

    const [transactions, total] = await Promise.all([
      prisma.treasuryTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.treasuryTransaction.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Failed to fetch transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
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
    const validation = treasuryTransactionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { treasuryId, type, amount, description, reference, saleId, paymentId, expenseId } = validation.data

    // Verify treasury exists
    const treasury = await prisma.treasury.findUnique({
      where: { id: treasuryId },
    })

    if (!treasury) {
      return NextResponse.json(
        { error: 'Treasury record not found' },
        { status: 404 }
      )
    }

    const transaction = await prisma.treasuryTransaction.create({
      data: {
        treasuryId,
        type,
        amount: new Decimal(amount),
        description,
        reference,
        saleId,
        paymentId,
        expenseId,
      },
    })

    return NextResponse.json(
      { success: true, data: transaction },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to create transaction:', error)
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    )
  }
}
