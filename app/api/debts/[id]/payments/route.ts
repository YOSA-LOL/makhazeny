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

    const payments = await prisma.debtPayment.findMany({
      where: { debtId: id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: payments })
  } catch (error) {
    console.error('Failed to fetch payments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: debtId } = await params
    const body = await req.json()
    const { amount, paymentMethod, notes } = body

    if (!amount) {
      return NextResponse.json(
        { error: 'Payment amount is required' },
        { status: 400 }
      )
    }

    // Get debt
    const debt = await prisma.debt.findUnique({
      where: { id: debtId },
    })

    if (!debt) {
      return NextResponse.json(
        { error: 'Debt not found' },
        { status: 404 }
      )
    }

    const paymentAmount = new Decimal(amount)

    if (paymentAmount.greaterThan(debt.remainingAmount)) {
      return NextResponse.json(
        { error: 'Payment amount exceeds remaining debt' },
        { status: 400 }
      )
    }

    // Create payment
    const payment = await prisma.debtPayment.create({
      data: {
        debtId,
        amount: paymentAmount,
        paymentMethod,
        notes,
      },
    })

    // Update debt
    const newRemaining = (debt.remainingAmount as unknown as Decimal).minus(paymentAmount)
    const newStatus = newRemaining.equals(0) ? 'PAID' : newRemaining.lessThan(debt.originalAmount as unknown as Decimal) ? 'PARTIAL' : 'ACTIVE'

    const updatedDebt = await prisma.debt.update({
      where: { id: debtId },
      data: {
        remainingAmount: newRemaining,
        status: newStatus,
      },
      include: {
        customer: true,
        payments: true,
      },
    })

    // Create treasury transaction for payment
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
          type: 'INSTALLMENT_PAYMENT',
          amount: paymentAmount,
          description: `Debt payment from ${debt.customer?.name || 'Customer'}`,
          reference: debtId,
          paymentId: payment.id,
        },
      })
    }

    return NextResponse.json(
      { success: true, data: { payment, debt: updatedDebt } },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to process payment:', error)
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    )
  }
}
