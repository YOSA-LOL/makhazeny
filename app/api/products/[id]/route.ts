import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'
import { productSchema } from '@/lib/validation'
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

    const product = store.products.findById(id)

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: product })
  } catch (error) {
    console.error('Failed to fetch product:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
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
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const validation = productSchema.partial().safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const product = store.products.findById(id)

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    if (validation.data.sku && validation.data.sku !== product.sku) {
      const existingSku = store.products.findBySku(validation.data.sku)
      if (existingSku) {
        return NextResponse.json(
          { error: 'SKU already exists' },
          { status: 400 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (validation.data.name) updateData.name = validation.data.name
    if (validation.data.sku) updateData.sku = validation.data.sku
    if (validation.data.description !== undefined) updateData.description = validation.data.description ?? null
    if (validation.data.categoryId) updateData.categoryId = validation.data.categoryId
    if (validation.data.purchasePrice !== undefined) updateData.purchasePrice = validation.data.purchasePrice
    if (validation.data.sellingPrice !== undefined) updateData.sellingPrice = validation.data.sellingPrice
    if (validation.data.quantity !== undefined) updateData.quantity = validation.data.quantity
    if (validation.data.lowStockLevel !== undefined) updateData.lowStockLevel = validation.data.lowStockLevel
    if (validation.data.barcode !== undefined) updateData.barcode = validation.data.barcode ?? null

    const updatedProduct = store.products.update(id, updateData)

    return NextResponse.json({ success: true, data: updatedProduct })
  } catch (error) {
    console.error('Failed to update product:', error)
    return NextResponse.json(
      { error: 'Failed to update product' },
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

    const deleted = store.products.delete(id)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, message: 'Product deleted' })
  } catch (error) {
    console.error('Failed to delete product:', error)
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}
