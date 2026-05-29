import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const customerId = searchParams.get('customerId') ?? undefined
    const status = searchParams.get('status') ?? undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const { items: debts, total } = store.debts.findMany({
      customerId,
      status,
      skip,
      limit,
    })

    return NextResponse.json({
      success: true,
      data: debts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Failed to fetch debts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch debts' },
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
    const { customerId, amount, description, dueDate } = body

    if (!customerId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const debt = store.debts.create({
      customerId,
      originalAmount: amount,
      remainingAmount: amount,
      status: 'ACTIVE',
      description,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    })

    return NextResponse.json(
      { success: true, data: debt },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to create debt:', error)
    return NextResponse.json(
      { error: 'Failed to create debt' },
      { status: 500 }
    )
  }
}
