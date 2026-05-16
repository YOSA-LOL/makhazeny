import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { supplierSchema } from '@/lib/validation'
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

    const supplier = await prisma.supplier.findUnique({
      where: { id },
    })

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: supplier })
  } catch (error) {
    console.error('Failed to fetch supplier:', error)
    return NextResponse.json(
      { error: 'Failed to fetch supplier' },
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
    const validation = supplierSchema.partial().safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id },
    })

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      )
    }

    const updateData: any = {}
    if (validation.data.name) updateData.name = validation.data.name
    if (validation.data.phone !== undefined) updateData.phone = validation.data.phone || null
    if (validation.data.email !== undefined) updateData.email = validation.data.email || null
    if (validation.data.address !== undefined) updateData.address = validation.data.address || null
    if (validation.data.city !== undefined) updateData.city = validation.data.city || null

    const updatedSupplier = await prisma.supplier.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: updatedSupplier })
  } catch (error) {
    console.error('Failed to update supplier:', error)
    return NextResponse.json(
      { error: 'Failed to update supplier' },
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

    const supplier = await prisma.supplier.findUnique({
      where: { id },
    })

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      )
    }

    await prisma.supplier.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Supplier deleted' })
  } catch (error) {
    console.error('Failed to delete supplier:', error)
    return NextResponse.json(
      { error: 'Failed to delete supplier' },
      { status: 500 }
    )
  }
}
