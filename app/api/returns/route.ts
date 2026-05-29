import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'
import { returnSchema } from '@/lib/validation'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const status = searchParams.get('status') || 'PENDING'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const { items: returns, total } = store.returns.findMany({
      status,
      skip,
      limit,
    })

    return NextResponse.json({
      success: true,
      data: returns,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Failed to fetch returns:', error)
    return NextResponse.json(
      { error: 'Failed to fetch returns' },
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
    const validation = returnSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { saleId, items, reason, notes } = validation.data

    const sale = store.sales.findById(saleId)

    if (!sale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      )
    }

    let totalReturnAmount = 0
    const validatedItems = items.map((item) => {
      const saleItem = sale.items.find((si) => si.id === item.saleItemId)
      if (!saleItem) {
        throw new Error(`Sale item ${item.saleItemId} not found`)
      }

      if (item.quantity > saleItem.quantity) {
        throw new Error('Cannot return more than purchased quantity')
      }

      const itemReturnAmount = saleItem.price * item.quantity
      totalReturnAmount += itemReturnAmount

      return {
        ...item,
        productId: saleItem.productId,
        price: saleItem.price,
        returnAmount: itemReturnAmount,
      }
    })

    const lastReturnNumber = store.returns.findLastReturnNumber()
    const lastNumber = lastReturnNumber ? parseInt(lastReturnNumber.split('-')[1] || '0') : 0
    const returnNumber = `RET-${String(lastNumber + 1).padStart(6, '0')}`

    const returnRecord = store.returns.create({
      returnNumber,
      saleId,
      customerId: sale.customerId,
      totalReturnAmount,
      reason,
      notes,
      items: validatedItems,
    })

    return NextResponse.json(
      { success: true, data: returnRecord },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error('Failed to create return:', error)
    const message = error instanceof Error ? error.message : 'Failed to create return'
    return NextResponse.json(
      { error: message },
      { status: 400 }
    )
  }
}
