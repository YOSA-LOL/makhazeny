import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'
import { saleSchema } from '@/lib/validation'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const { items: sales, total } = store.sales.findMany({
      search: search || undefined,
      skip,
      limit,
    })

    return NextResponse.json({
      success: true,
      data: sales,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Failed to fetch sales:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sales' },
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
    const validation = saleSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { customerId, paymentMethod, notes, items } = validation.data

    const customer = store.customers.findById(customerId)

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    let totalAmount = 0
    const itemsWithValidation = items.map((item) => {
      const product = store.products.findById(item.productId)

      if (!product) {
        throw new Error(`Product ${item.productId} not found`)
      }

      if (product.quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`)
      }

      const itemTotal = item.price * item.quantity
      totalAmount += itemTotal

      return {
        ...item,
        total: itemTotal,
      }
    })

    const lastSaleNumber = store.sales.findLastSaleNumber()
    const lastNumber = lastSaleNumber ? parseInt(lastSaleNumber.split('-')[1] || '0') : 0
    const saleNumber = `SALE-${String(lastNumber + 1).padStart(6, '0')}`

    const sale = store.sales.create({
      saleNumber,
      customerId,
      totalAmount,
      paymentMethod,
      notes,
      items: itemsWithValidation,
    })

    if (totalAmount > 0) {
      store.debts.create({
        saleId: sale.id,
        customerId,
        originalAmount: totalAmount,
        remainingAmount: totalAmount,
        status: 'ACTIVE',
      })
    }

    const fullSale = store.sales.findById(sale.id)!

    return NextResponse.json(
      { success: true, data: fullSale },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error('Failed to create sale:', error)
    const message = error instanceof Error ? error.message : 'Failed to create sale'
    return NextResponse.json(
      { error: message },
      { status: 400 }
    )
  }
}
