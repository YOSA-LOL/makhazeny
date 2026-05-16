import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { customerSchema } from '@/lib/validation'
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

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        debts: {
          where: { status: { in: ['ACTIVE', 'PARTIAL', 'OVERDUE'] } },
          select: { remainingAmount: true },
        },
      },
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    const totalDebt = customer.debts.reduce((sum, debt) => sum.plus(debt.remainingAmount), new Decimal(0))

    return NextResponse.json({ success: true, data: { ...customer, totalDebt } })
  } catch (error) {
    console.error('Failed to fetch customer:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
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
    const validation = customerSchema.partial().safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    const updateData: any = {}
    if (validation.data.name) updateData.name = validation.data.name
    if (validation.data.phone !== undefined) updateData.phone = validation.data.phone || null
    if (validation.data.email !== undefined) updateData.email = validation.data.email || null
    if (validation.data.address !== undefined) updateData.address = validation.data.address || null
    if (validation.data.city !== undefined) updateData.city = validation.data.city || null
    if (validation.data.creditLimit !== undefined) updateData.creditLimit = new Decimal(validation.data.creditLimit)

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: updatedCustomer })
  } catch (error) {
    console.error('Failed to update customer:', error)
    return NextResponse.json(
      { error: 'Failed to update customer' },
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

    const customer = await prisma.customer.findUnique({
      where: { id },
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    await prisma.customer.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Customer deleted' })
  } catch (error) {
    console.error('Failed to delete customer:', error)
    return NextResponse.json(
      { error: 'Failed to delete customer' },
      { status: 500 }
    )
  }
}
