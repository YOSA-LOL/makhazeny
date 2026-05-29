import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'
import { treasuryTransactionSchema } from '@/lib/validation'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const treasuryId = searchParams.get('treasuryId') ?? undefined
    const startDate = searchParams.get('startDate') ?? undefined
    const endDate = searchParams.get('endDate') ?? undefined
    const type = searchParams.get('type') ?? undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const { items: transactions, total } = store.treasuryTransactions.findMany({
      treasuryId,
      startDate,
      endDate,
      type,
      skip,
      limit,
    })

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

    const treasury = store.treasury.findById(treasuryId)

    if (!treasury) {
      return NextResponse.json(
        { error: 'Treasury record not found' },
        { status: 404 }
      )
    }

    const transaction = store.treasuryTransactions.create({
      treasuryId,
      type,
      amount: Number(amount),
      description,
      reference: reference ?? null,
      saleId: saleId ?? null,
      paymentId: paymentId ?? null,
      supplierPaymentId: null,
      supplierId: null,
      returnId: null,
      expenseId: expenseId ?? null,
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
