import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { Decimal } from 'decimal.js'

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

    const returnRecord = await prisma.return.findUnique({
      where: { id },
      include: {
        sale: {
          include: { customer: true, items: true },
        },
        items: {
          include: { product: true },
        },
      },
    })

    if (!returnRecord) {
      return NextResponse.json(
        { error: 'Return not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: returnRecord })
  } catch (error) {
    console.error('Failed to fetch return:', error)
    return NextResponse.json(
      { error: 'Failed to fetch return' },
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
    const { status, notes } = body

    const returnRecord = await prisma.return.findUnique({
      where: { id },
      include: { items: true, sale: true },
    })

    if (!returnRecord) {
      return NextResponse.json(
        { error: 'Return not found' },
        { status: 404 }
      )
    }

    const updateData: any = {}
    if (status) updateData.status = status
    if (notes !== undefined) updateData.notes = notes

    // If approving the return, restore inventory and adjust debt
    if (status === 'APPROVED' && returnRecord.status !== 'APPROVED') {
      // Restore inventory
      await Promise.all(
        returnRecord.items.map((item) =>
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

      // Adjust debt if it exists
      if (returnRecord.sale.debtId) {
        const debt = await prisma.debt.findUnique({
          where: { id: returnRecord.sale.debtId },
        })

        if (debt) {
          const newRemaining = (debt.remainingAmount as unknown as Decimal).minus(returnRecord.totalReturnAmount as unknown as Decimal)

          if (newRemaining.isNegative()) {
            // Customer overpaid, credit their account
            await prisma.debt.update({
              where: { id: debt.id },
              data: {
                remainingAmount: new Decimal(0),
                status: 'PAID',
              },
            })
          } else {
            await prisma.debt.update({
              where: { id: debt.id },
              data: {
                remainingAmount: newRemaining,
              },
            })
          }
        }
      }

      // Create treasury transaction for refund
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const treasury = await prisma.treasury.findFirst({
        where: {
          date: {
            gte: today,
            lt: tomorrow,
          },
        },
      })

      if (treasury) {
        await prisma.treasuryTransaction.create({
          data: {
            treasuryId: treasury.id,
            type: 'RETURN_REFUND',
            amount: returnRecord.totalReturnAmount as unknown as Decimal,
            description: `Return refund for sale ${returnRecord.sale.saleNumber}`,
            reference: id,
          },
        })
      }
    }

    const updatedReturn = await prisma.return.update({
      where: { id },
      data: updateData,
      include: {
        sale: {
          include: { customer: true },
        },
        items: {
          include: { product: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: updatedReturn })
  } catch (error) {
    console.error('Failed to update return:', error)
    return NextResponse.json(
      { error: 'Failed to update return' },
      { status: 500 }
    )
  }
}
