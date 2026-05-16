import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { saleSchema } from '@/lib/validation'
import { getCurrentUser } from '@/lib/auth'
import { Decimal } from 'decimal.js'

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

    const where: any = {}
    if (search) {
      where.OR = [
        { saleNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          customer: true,
          items: {
            include: { product: true },
          },
          debt: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.sale.count({ where }),
    ])

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

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Calculate total and verify products
    let totalAmount = new Decimal(0)
    const itemsWithValidation = await Promise.all(
      items.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        })

        if (!product) {
          throw new Error(`Product ${item.productId} not found`)
        }

        if (product.quantity < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}`)
        }

        const itemTotal = new Decimal(item.price).times(item.quantity)
        totalAmount = totalAmount.plus(itemTotal)

        return {
          ...item,
          total: itemTotal,
        }
      })
    )

    // Generate sale number
    const lastSale = await prisma.sale.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { saleNumber: true },
    })

    const lastNumber = lastSale?.saleNumber ? parseInt(lastSale.saleNumber.split('-')[1] || '0') : 0
    const saleNumber = `SALE-${String(lastNumber + 1).padStart(6, '0')}`

    // Create sale with items
    const sale = await prisma.sale.create({
      data: {
        saleNumber,
        customerId,
        totalAmount,
        paidAmount: new Decimal(0),
        status: 'PENDING',
        paymentMethod,
        notes,
        items: {
          create: itemsWithValidation.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: new Decimal(item.price),
            total: item.total,
          })),
        },
      },
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
      },
    })

    // Update product quantities
    await Promise.all(
      itemsWithValidation.map((item) =>
        prisma.product.update({
          where: { id: item.productId },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        })
      )
    )

    // Create debt record
    if (totalAmount.toNumber() > 0) {
      await prisma.debt.create({
        data: {
          saleId: sale.id,
          customerId,
          originalAmount: totalAmount,
          remainingAmount: totalAmount,
          status: 'ACTIVE',
        },
      })
    }

    return NextResponse.json(
      { success: true, data: sale },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Failed to create sale:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create sale' },
      { status: 400 }
    )
  }
}
