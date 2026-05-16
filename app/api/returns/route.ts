import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { returnSchema } from '@/lib/validation'
import { getCurrentUser } from '@/lib/auth'
import { Decimal } from 'decimal.js'

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

    const [returns, total] = await Promise.all([
      prisma.return.findMany({
        where: { status },
        include: {
          sale: {
            include: { customer: true, items: true },
          },
          items: {
            include: { product: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.return.count({ where: { status } }),
    ])

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

    // Verify sale exists
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { items: true, customer: true },
    })

    if (!sale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      )
    }

    // Calculate return amount and validate items
    let totalReturnAmount = new Decimal(0)
    const validatedItems = items.map((item) => {
      const saleItem = sale.items.find((si) => si.id === item.saleItemId)
      if (!saleItem) {
        throw new Error(`Sale item ${item.saleItemId} not found`)
      }

      if (item.quantity > saleItem.quantity) {
        throw new Error(`Cannot return more than purchased quantity`)
      }

      const itemReturnAmount = (saleItem.price as unknown as Decimal).times(item.quantity)
      totalReturnAmount = totalReturnAmount.plus(itemReturnAmount)

      return {
        ...item,
        productId: saleItem.productId,
        price: saleItem.price,
        returnAmount: itemReturnAmount,
      }
    })

    // Generate return number
    const lastReturn = await prisma.return.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { returnNumber: true },
    })

    const lastNumber = lastReturn?.returnNumber ? parseInt(lastReturn.returnNumber.split('-')[1] || '0') : 0
    const returnNumber = `RET-${String(lastNumber + 1).padStart(6, '0')}`

    // Create return record
    const returnRecord = await prisma.return.create({
      data: {
        returnNumber,
        saleId,
        totalReturnAmount,
        reason,
        notes,
        status: 'PENDING',
        items: {
          create: validatedItems.map((item) => ({
            saleItemId: item.saleItemId,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price as unknown as Decimal,
            returnAmount: item.returnAmount as unknown as Decimal,
          })),
        },
      },
      include: {
        sale: {
          include: { customer: true },
        },
        items: {
          include: { product: true },
        },
      },
    })

    return NextResponse.json(
      { success: true, data: returnRecord },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Failed to create return:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create return' },
      { status: 400 }
    )
  }
}
