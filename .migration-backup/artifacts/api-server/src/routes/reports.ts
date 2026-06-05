import { Router } from 'express'
import { store } from '../lib/store.js'
import { requireAuth } from '../middlewares/requireAuth.js'
import type { Request, Response } from 'express'

const router = Router()

router.get('/reports', requireAuth, (req: Request, res: Response) => {
  const type = (req.query.type as string) || 'sales'
  const startDate = req.query.startDate as string
  const endDate = req.query.endDate as string

  if (!startDate || !endDate) return res.status(400).json({ error: 'startDate and endDate are required' })

  const start = new Date(startDate)
  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999)

  if (type === 'sales') {
    const sales = store.sales.findInDateRange(start, end)
    const totalSales = sales.length
    const totalAmount = sales.reduce((sum, s) => sum + s.totalAmount, 0)
    const totalPaid = sales.reduce((sum, s) => sum + s.paidAmount, 0)
    const paymentMethods: Record<string, number> = {}
    const topProducts: Record<string, { quantity: number; revenue: number }> = {}
    sales.forEach((sale) => {
      paymentMethods[sale.paymentMethod] = (paymentMethods[sale.paymentMethod] || 0) + 1
      sale.items.forEach((item) => {
        if (!topProducts[item.product.name]) topProducts[item.product.name] = { quantity: 0, revenue: 0 }
        topProducts[item.product.name].quantity += item.quantity
        topProducts[item.product.name].revenue += item.total
      })
    })
    return res.json({ success: true, data: { totalSales, totalAmount, totalPaid, totalUnpaid: totalAmount - totalPaid, averageOrderValue: totalSales > 0 ? totalAmount / totalSales : 0, paymentMethods, topProducts: Object.entries(topProducts).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 10).map(([name, data]) => ({ name, ...data })) } })
  }

  if (type === 'products') {
    const products = store.products.findAllWithCategories()
    const lowStock = products.filter((p) => p.quantity <= p.lowStockLevel)
    const byCategory: Record<string, number> = {}
    products.forEach((p) => { byCategory[p.category.name] = (byCategory[p.category.name] || 0) + 1 })
    return res.json({ success: true, data: { totalProducts: products.length, totalInventoryValue: products.reduce((s, p) => s + p.quantity * p.sellingPrice, 0), lowStockCount: lowStock.length, outOfStockCount: products.filter((p) => p.quantity === 0).length, averageStockValue: products.length > 0 ? products.reduce((s, p) => s + p.quantity * p.sellingPrice, 0) / products.length : 0, byCategory, lowStockProducts: lowStock.map((p) => ({ name: p.name, sku: p.sku, quantity: p.quantity, lowStockLevel: p.lowStockLevel })) } })
  }

  if (type === 'customers') {
    const customers = store.customers.findAllWithDebts()
    const totalDebt = customers.reduce((sum, c) => sum + c.debts.reduce((d, debt) => d + debt.remainingAmount, 0), 0)
    const customersWithDebt = customers.filter((c) => c.debts.length > 0).length
    const overdueDebt = customers.reduce((sum, c) => sum + c.debts.filter((d) => d.dueDate && new Date(d.dueDate) < new Date()).reduce((d, debt) => d + debt.remainingAmount, 0), 0)
    return res.json({ success: true, data: { totalCustomers: customers.length, customersWithDebt, totalOutstandingDebt: totalDebt, overdueDebt, averageDebtPerCustomer: customersWithDebt > 0 ? totalDebt / customersWithDebt : 0 } })
  }

  if (type === 'debts') {
    const debts = store.debts.findAll()
    const totalAmount = debts.reduce((s, d) => s + d.originalAmount, 0)
    const totalRemaining = debts.reduce((s, d) => s + d.remainingAmount, 0)
    return res.json({ success: true, data: { totalDebts: debts.length, activeDebts: debts.filter((d) => d.status === 'ACTIVE').length, partialDebts: debts.filter((d) => d.status === 'PARTIAL').length, paidDebts: debts.filter((d) => d.status === 'PAID').length, totalAmount, totalPaid: totalAmount - totalRemaining, totalRemaining, overdueDebts: debts.filter((d) => d.dueDate && new Date(d.dueDate) < new Date()).length, paymentRate: totalAmount > 0 ? ((totalAmount - totalRemaining) / totalAmount) * 100 : 0 } })
  }

  if (type === 'inventory') {
    const products = store.products.findAllWithSaleItems()
    const movements: Record<string, { in: number; out: number }> = {}
    products.forEach((p) => { movements[p.name] = { in: 0, out: p.saleItems.reduce((s, i) => s + i.quantity, 0) } })
    return res.json({ success: true, data: { fastMovingProducts: Object.entries(movements).sort((a, b) => b[1].out - a[1].out).slice(0, 10), slowMovingProducts: Object.entries(movements).filter(([_, m]) => m.out === 0).slice(0, 10), totalMovements: Object.values(movements).reduce((s, m) => s + m.out, 0) } })
  }

  return res.status(400).json({ error: 'Unknown report type' })
})

export default router
