import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'
import { supplierSchema } from '@/lib/validation'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const { items: suppliers, total } = store.suppliers.findMany({
      search: search || undefined,
      skip,
      limit,
    })

    return NextResponse.json({
      success: true,
      data: suppliers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Failed to fetch suppliers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch suppliers' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const validation = supplierSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { name, phone, email, address, city } = validation.data

    const supplier = store.suppliers.create({
      name,
      phone: phone || null,
      email: email || null,
      address: address || null,
      city: city || null,
    })

    return NextResponse.json(
      { success: true, data: supplier },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to create supplier:', error)
    return NextResponse.json(
      { error: 'Failed to create supplier' },
      { status: 500 }
    )
  }
}
