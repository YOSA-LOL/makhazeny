import { Router } from 'express'
import { store } from '../lib/store.js'
import { requireAuth, requireAdmin } from '../middlewares/requireAuth.js'
import type { Request, Response } from 'express'

const router = Router()

router.get('/sales', requireAuth, (req: Request, res: Response) => {
  const search = (req.query.search as string) || ''
  const page = parseInt((req.query.page as string) || '1')
  const limit = parseInt((req.query.limit as string) || '10')
  const skip = (page - 1) * limit

  const { items, total } = store.sales.findMany({ search: search || undefined, skip, limit })
  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
})

router.get('/sales/:id', requireAuth, (req: Request, res: Response) => {
  const sale = store.sales.findById(req.params.id)
  if (!sale) return res.status(404).json({ error: 'Sale not found' })
  return res.json({ success: true, data: sale })
})

router.post('/sales', requireAuth, (req: Request, res: Response) => {
  try {
    const { customerId, paymentMethod, notes, items } = req.body

    if (!customerId || !items?.length) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const customer = store.customers.findById(customerId)
    if (!customer) return res.status(404).json({ error: 'Customer not found' })

    let totalAmount = 0
    const itemsWithValidation = items.map((item: { productId: string; quantity: number; price: number }) => {
      const product = store.products.findById(item.productId)
      if (!product) throw new Error(`Product ${item.productId} not found`)
      if (product.quantity < item.quantity) throw new Error(`Insufficient stock for ${product.name}`)
      const itemTotal = item.price * item.quantity
      totalAmount += itemTotal
      return { ...item, total: itemTotal }
    })

    const lastSaleNumber = store.sales.findLastSaleNumber()
    const lastNumber = lastSaleNumber ? parseInt(lastSaleNumber.split('-')[1] || '0') : 0
    const saleNumber = `SALE-${String(lastNumber + 1).padStart(6, '0')}`

    const sale = store.sales.create({ saleNumber, customerId, totalAmount, paymentMethod, notes, items: itemsWithValidation })

    if (totalAmount > 0) {
      store.debts.create({ saleId: sale.id, customerId, originalAmount: totalAmount, remainingAmount: totalAmount, status: 'ACTIVE' })
    }

    return res.status(201).json({ success: true, data: store.sales.findById(sale.id) })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create sale'
    return res.status(400).json({ error: message })
  }
})

router.put('/sales/:id', requireAuth, (req: Request, res: Response) => {
  const sale = store.sales.findById(req.params.id)
  if (!sale) return res.status(404).json({ error: 'Sale not found' })

  const { status, paidAmount, notes } = req.body
  const updateData: Record<string, unknown> = {}
  if (status !== undefined) updateData.status = status
  if (paidAmount !== undefined) updateData.paidAmount = paidAmount
  if (notes !== undefined) updateData.notes = notes

  const updated = store.sales.update(req.params.id, updateData)
  return res.json({ success: true, data: updated })
})

router.delete('/sales/:id', requireAdmin, (req: Request, res: Response) => {
  const deleted = store.sales.delete(req.params.id)
  if (!deleted) return res.status(404).json({ error: 'Sale not found' })
  return res.json({ success: true, message: 'Sale deleted' })
})

export default router
