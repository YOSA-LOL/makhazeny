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

    const sale = store.sales.findById(id)

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

    const sale = store.sales.findById(id)

    if (!sale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (paidAmount !== undefined) updateData.paidAmount = paidAmount
    if (notes !== undefined) updateData.notes = notes

    const updatedSale = store.sales.update(id, updateData)

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

    const deleted = store.sales.delete(id)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, message: 'Sale deleted' })
  } catch (error) {
    console.error('Failed to delete sale:', error)
    return NextResponse.json(
      { error: 'Failed to delete sale' },
      { status: 500 }
    )
  }
}
