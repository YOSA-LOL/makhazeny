import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const type = searchParams.get('type') || 'sales'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    switch (type) {
      case 'sales':
        return getSalesReport(start, end)
      case 'products':
        return getProductsReport()
      case 'customers':
        return getCustomersReport()
      case 'debts':
        return getDebtsReport()
      case 'inventory':
        return getInventoryReport()
      default:
        return NextResponse.json({ error: 'Unknown report type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Failed to generate report:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}

function getSalesReport(startDate: Date, endDate: Date) {
  const sales = store.sales.findInDateRange(startDate, endDate)

  const totalSales = sales.length
  const totalAmount = sales.reduce((sum, sale) => sum + sale.totalAmount, 0)
  const totalPaid = sales.reduce((sum, sale) => sum + sale.paidAmount, 0)
  const totalUnpaid = totalAmount - totalPaid

  const paymentMethods: { [key: string]: number } = {}
  sales.forEach((sale) => {
    paymentMethods[sale.paymentMethod] = (paymentMethods[sale.paymentMethod] || 0) + 1
  })

  const topProducts: { [key: string]: { quantity: number; revenue: number } } = {}
  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      if (!topProducts[item.product.name]) {
        topProducts[item.product.name] = { quantity: 0, revenue: 0 }
      }
      topProducts[item.product.name].quantity += item.quantity
      topProducts[item.product.name].revenue += item.total
    })
  })

  const sortedTopProducts = Object.entries(topProducts)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 10)

  return NextResponse.json({
    success: true,
    data: {
      totalSales,
      totalAmount,
      totalPaid,
      totalUnpaid,
      averageOrderValue: totalSales > 0 ? totalAmount / totalSales : 0,
      paymentMethods,
      topProducts: sortedTopProducts.map(([name, data]) => ({
        name,
        quantity: data.quantity,
        revenue: data.revenue,
      })),
    },
  })
}

function getProductsReport() {
  const products = store.products.findAllWithCategories()

  const totalProducts = products.length
  const totalValue = products.reduce(
    (sum, p) => sum + p.quantity * p.sellingPrice,
    0
  )

  const lowStockProducts = products.filter((p) => p.quantity <= p.lowStockLevel)
  const outOfStockProducts = products.filter((p) => p.quantity === 0)

  const byCategory: { [key: string]: number } = {}
  products.forEach((p) => {
    byCategory[p.category.name] = (byCategory[p.category.name] || 0) + 1
  })

  return NextResponse.json({
    success: true,
    data: {
      totalProducts,
      totalInventoryValue: totalValue,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts.length,
      averageStockValue: totalProducts > 0 ? totalValue / totalProducts : 0,
      byCategory,
      lowStockProducts: lowStockProducts.map((p) => ({
        name: p.name,
        sku: p.sku,
        quantity: p.quantity,
        lowStockLevel: p.lowStockLevel,
      })),
    },
  })
}

function getCustomersReport() {
  const customers = store.customers.findAllWithDebts()

  const totalCustomers = customers.length
  const totalDebt = customers.reduce((sum, c) => {
    const customerDebt = c.debts.reduce((d, debt) => d + debt.remainingAmount, 0)
    return sum + customerDebt
  }, 0)

  const customersWithDebt = customers.filter((c) => c.debts.length > 0).length
  const overdueDebt = customers.reduce((sum, c) => {
    const customerDebt = c.debts
      .filter((d) => d.dueDate && new Date(d.dueDate) < new Date())
      .reduce((d, debt) => d + debt.remainingAmount, 0)
    return sum + customerDebt
  }, 0)

  return NextResponse.json({
    success: true,
    data: {
      totalCustomers,
      customersWithDebt,
      totalOutstandingDebt: totalDebt,
      overdueDebt,
      averageDebtPerCustomer: customersWithDebt > 0 ? totalDebt / customersWithDebt : 0,
    },
  })
}

function getDebtsReport() {
  const debts = store.debts.findAll()

  const totalDebts = debts.length
  const activeDebts = debts.filter((d) => d.status === 'ACTIVE').length
  const partialDebts = debts.filter((d) => d.status === 'PARTIAL').length
  const paidDebts = debts.filter((d) => d.status === 'PAID').length

  const totalAmount = debts.reduce((sum, d) => sum + d.originalAmount, 0)
  const totalRemaining = debts.reduce((sum, d) => sum + d.remainingAmount, 0)
  const totalPaid = totalAmount - totalRemaining

  const overdueDebts = debts.filter((d) => d.dueDate && new Date(d.dueDate) < new Date()).length

  return NextResponse.json({
    success: true,
    data: {
      totalDebts,
      activeDebts,
      partialDebts,
      paidDebts,
      totalAmount,
      totalPaid,
      totalRemaining,
      overdueDebts,
      paymentRate: totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0,
    },
  })
}

function getInventoryReport() {
  const products = store.products.findAllWithSaleItems()

  const movements: { [key: string]: { in: number; out: number } } = {}

  products.forEach((p) => {
    movements[p.name] = {
      in: 0,
      out: p.saleItems.reduce((sum, item) => sum + item.quantity, 0),
    }
  })

  const fastMoving = Object.entries(movements)
    .sort((a, b) => b[1].out - a[1].out)
    .slice(0, 10)

  const slowMoving = Object.entries(movements)
    .filter(([_, m]) => m.out === 0)
    .slice(0, 10)

  return NextResponse.json({
    success: true,
    data: {
      fastMovingProducts: fastMoving,
      slowMovingProducts: slowMoving,
      totalMovements: Object.values(movements).reduce((sum, m) => sum + m.out, 0),
    },
  })
}
