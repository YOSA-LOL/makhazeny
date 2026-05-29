import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'
import { productSchema } from '@/lib/validation'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const categoryId = searchParams.get('categoryId') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const { items: products, total } = store.products.findMany({
      search: search || undefined,
      categoryId: categoryId || undefined,
      skip,
      limit,
    })

    return NextResponse.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Failed to fetch products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const validation = productSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { name, sku, description, categoryId, purchasePrice, sellingPrice, quantity, lowStockLevel, barcode } =
      validation.data

    const existingSku = store.products.findBySku(sku)

    if (existingSku) {
      return NextResponse.json(
        { error: 'Product with this SKU already exists' },
        { status: 400 }
      )
    }

    const product = store.products.create({
      name,
      sku,
      description: description ?? null,
      categoryId,
      purchasePrice,
      sellingPrice,
      quantity,
      lowStockLevel,
      barcode: barcode ?? null,
    })

    return NextResponse.json(
      { success: true, data: product },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to create product:', error)
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}
