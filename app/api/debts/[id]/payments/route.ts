import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'
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

    const payments = store.payments.findByDebtId(id)

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

    const debt = store.debts.findById(debtId)

    if (!debt) {
      return NextResponse.json(
        { error: 'Debt not found' },
        { status: 404 }
      )
    }

    const paymentAmount = Number(amount)

    if (paymentAmount > debt.remainingAmount) {
      return NextResponse.json(
        { error: 'Payment amount exceeds remaining debt' },
        { status: 400 }
      )
    }

    const payment = store.payments.create({
      debtId,
      customerId: debt.customerId,
      amount: paymentAmount,
      paymentMethod,
      notes,
    })

    const newRemaining = debt.remainingAmount - paymentAmount
    const newStatus =
      newRemaining === 0
        ? 'PAID'
        : newRemaining < debt.originalAmount
          ? 'PARTIAL'
          : 'ACTIVE'

    const updatedDebt = store.debts.update(debtId, {
      remainingAmount: Math.max(0, newRemaining),
      status: newStatus as 'PAID' | 'PARTIAL' | 'ACTIVE',
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const treasury = store.treasury.findByDate(today)

    if (treasury) {
      store.treasuryTransactions.create({
        treasuryId: treasury.id,
        type: 'INSTALLMENT_PAYMENT',
        amount: paymentAmount,
        description: `Debt payment from ${debt.customer?.name || 'Customer'}`,
        reference: debtId,
        saleId: null,
        paymentId: payment.id,
        supplierPaymentId: null,
        supplierId: null,
        returnId: null,
        expenseId: null,
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
