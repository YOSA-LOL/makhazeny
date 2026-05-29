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

    const returnRecord = store.returns.findById(id)

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

    const returnRecord = store.returns.findById(id)

    if (!returnRecord) {
      return NextResponse.json(
        { error: 'Return not found' },
        { status: 404 }
      )
    }

    if (status === 'APPROVED' && returnRecord.status !== 'APPROVED') {
      for (const item of returnRecord.items) {
        store.products.incrementQuantity(item.productId, item.quantity)
      }

      const debtId = returnRecord.sale.debtId
      if (debtId) {
        const debt = store.debts.findById(debtId)

        if (debt) {
          const newRemaining = debt.remainingAmount - returnRecord.totalReturnAmount

          if (newRemaining < 0) {
            store.debts.update(debt.id, {
              remainingAmount: 0,
              status: 'PAID',
            })
          } else {
            store.debts.update(debt.id, {
              remainingAmount: newRemaining,
            })
          }
        }
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const treasury = store.treasury.findByDate(today)

      if (treasury) {
        store.treasuryTransactions.create({
          treasuryId: treasury.id,
          type: 'RETURN_REFUND',
          amount: returnRecord.totalReturnAmount,
          description: `Return refund for sale ${returnRecord.sale.saleNumber}`,
          reference: id,
          saleId: null,
          paymentId: null,
          supplierPaymentId: null,
          supplierId: null,
          returnId: id,
          expenseId: null,
        })
      }
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (notes !== undefined) updateData.notes = notes

    const updatedReturn = store.returns.update(id, updateData)

    return NextResponse.json({ success: true, data: updatedReturn })
  } catch (error) {
    console.error('Failed to update return:', error)
    return NextResponse.json(
      { error: 'Failed to update return' },
      { status: 500 }
    )
  }
}
