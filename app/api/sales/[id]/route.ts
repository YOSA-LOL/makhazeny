import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
        debt: true,
      },
    })

    if (!sale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: sale })
  } catch (error) {
    console.error('Failed to fetch sale:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sale' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { status, paidAmount, notes } = body

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!sale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      )
    }

    const updateData: any = {}
    if (status) updateData.status = status
    if (paidAmount !== undefined) updateData.paidAmount = paidAmount
    if (notes !== undefined) updateData.notes = notes

    const updatedSale = await prisma.sale.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
        debt: true,
      },
    })

    return NextResponse.json({ success: true, data: updatedSale })
  } catch (error) {
    console.error('Failed to update sale:', error)
    return NextResponse.json(
      { error: 'Failed to update sale' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!sale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      )
    }

    // Restore inventory
    await Promise.all(
      sale.items.map((item) =>
        prisma.product.update({
          where: { id: item.productId },
          data: {
            quantity: {
              increment: item.quantity,
            },
          },
        })
      )
    )

    await prisma.sale.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Sale deleted' })
  } catch (error) {
    console.error('Failed to delete sale:', error)
    return NextResponse.json(
      { error: 'Failed to delete sale' },
      { status: 500 }
    )
  }
}
