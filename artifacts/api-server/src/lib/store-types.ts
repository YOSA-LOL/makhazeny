import { randomUUID } from 'crypto'

export type UserRole = 'ADMIN' | 'ACCOUNTANT' | 'EMPLOYEE'
export type SaleStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'CANCELLED'
export type PaymentMethod = 'CASH' | 'CARD' | 'CHECK' | 'TRANSFER' | 'INSTALLMENT' | 'CREDIT' | 'OTHER'
export type DebtStatus = 'ACTIVE' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED'
export type ReturnStatus = 'PENDING' | 'APPROVED' | 'PROCESSED' | 'REJECTED'
export type ReturnReason = 'DEFECTIVE' | 'WRONG_ITEM' | 'CUSTOMER_REQUEST' | 'DAMAGE' | 'OTHER'
export type TransactionType =
  | 'SALES_INCOME'
  | 'INSTALLMENT_PAYMENT'
  | 'SUPPLIER_PAYMENT'
  | 'RETURN_REFUND'
  | 'MANUAL_EXPENSE'
  | 'MANUAL_INCOME'
  | 'INVENTORY_PURCHASE'
  | 'BALANCE_CARRYOVER'

export interface User {
  id: string
  email: string
  password: string
  name: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

export interface Category {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export interface Product {
  id: string
  name: string
  sku: string
  description: string | null
  categoryId: string
  supplierId: string | null
  purchasePrice: number
  sellingPrice: number
  quantity: number
  lowStockLevel: number
  barcode: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Customer {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  creditLimit: number
  createdAt: Date
  updatedAt: Date
}

export interface Supplier {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  balance: number
  createdAt: Date
  updatedAt: Date
}

export interface Sale {
  id: string
  saleNumber: string
  customerId: string
  totalAmount: number
  paidAmount: number
  status: SaleStatus
  paymentMethod: PaymentMethod
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export interface SalesItem {
  id: string
  saleId: string
  productId: string
  quantity: number
  price: number
  total: number
  createdAt: Date
}

export interface Debt {
  id: string
  saleId: string | null
  customerId: string
  originalAmount: number
  remainingAmount: number
  dueDate: Date | null
  status: DebtStatus
  description?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Payment {
  id: string
  debtId: string
  customerId: string
  amount: number
  method: PaymentMethod
  paymentMethod?: PaymentMethod
  reference: string | null
  notes: string | null
  createdAt: Date
}

export interface ReturnRecord {
  id: string
  returnNumber: string
  saleId: string
  customerId: string
  totalAmount: number
  totalReturnAmount: number
  reason: ReturnReason
  status: ReturnStatus
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ReturnItem {
  id: string
  returnId: string
  saleItemId?: string
  productId: string
  quantity: number
  price: number
  amount: number
  returnAmount: number
}

export interface Treasury {
  id: string
  date: Date
  openingBalance: number
  closingBalance: number
  isClosed: boolean
  closedAt: Date | null
  closedBySystem: boolean
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export interface TreasuryTransaction {
  id: string
  treasuryId: string
  type: TransactionType
  amount: number
  description: string
  saleId: string | null
  paymentId: string | null
  supplierPaymentId: string | null
  supplierId: string | null
  returnId: string | null
  expenseId: string | null
  reference: string | null
  createdAt: Date
}

export interface DailyBalanceHistory {
  id: string
  treasuryId: string
  date: Date
  openingBalance: number
  closingBalance: number
  dailyIncome: number
  dailyExpense: number
  dailyProfit: number
  createdAt: Date
  updatedAt: Date
}

export function now() {
  return new Date()
}

export function id() {
  return randomUUID()
}

export function matches(text: string | null | undefined, search: string) {
  return (text ?? '').toLowerCase().includes(search.toLowerCase())
}

export function paginate<T>(items: T[], skip: number, take: number) {
  return { items: items.slice(skip, skip + take), total: items.length }
}

export function startOfDay(d: Date) {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  return date
}

export function isSameDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime()
}

export function isDateInRange(date: Date, start: Date, end: Date) {
  const d = date.getTime()
  return d >= start.getTime() && d <= end.getTime()
}

export function withCategory(product: Product, categories: Category[], suppliers?: Supplier[]) {
  return {
    ...product,
    category: categories.find((c) => c.id === product.categoryId) ?? null,
    supplier: suppliers
      ? product.supplierId
        ? (suppliers.find((s) => s.id === product.supplierId) ?? null)
        : null
      : undefined,
  }
}

export function withCustomer(customer: Customer, debts: Debt[]) {
  const activeDebts = debts.filter(
    (d) => d.customerId === customer.id && ['ACTIVE', 'PARTIAL', 'OVERDUE'].includes(d.status),
  )
  const totalDebt = activeDebts.reduce((sum, d) => sum + d.remainingAmount, 0)
  return {
    ...customer,
    debts: activeDebts.map((d) => ({ remainingAmount: d.remainingAmount })),
    totalDebt,
  }
}

export function enrichSale(
  sale: Sale,
  customers: Customer[],
  products: Product[],
  suppliers: Supplier[],
  salesItems: SalesItem[],
  debts: Debt[],
) {
  const customer = customers.find((c) => c.id === sale.customerId)!
  const items = salesItems
    .filter((i) => i.saleId === sale.id)
    .map((item) => {
      const product = products.find((p) => p.id === item.productId)!
      const supplier = product?.supplierId
        ? (suppliers.find((s) => s.id === product.supplierId) ?? null)
        : null
      return { ...item, product: { ...product, supplier } }
    })
  const debt = debts.find((d) => d.saleId === sale.id) ?? null
  return { ...sale, debtId: debt?.id ?? null, customer, items, debt }
}

export function enrichReturn(
  record: ReturnRecord,
  sale: ReturnType<typeof enrichSale>,
  returnItems: ReturnItem[],
  products: Product[],
) {
  const items = returnItems
    .filter((i) => i.returnId === record.id)
    .map((item) => ({
      ...item,
      product: products.find((p) => p.id === item.productId)!,
    }))
  return { ...record, sale, items }
}

export function enrichDebt(debt: Debt, customers: Customer[], sales: Sale[], payments: Payment[]) {
  return {
    ...debt,
    customer: customers.find((c) => c.id === debt.customerId)!,
    sale: debt.saleId ? (sales.find((s) => s.id === debt.saleId) ?? null) : null,
    payments: payments.filter((p) => p.debtId === debt.id),
  }
}

export function enrichTreasury(
  treasury: Treasury,
  transactions: TreasuryTransaction[],
  dailyBalances: DailyBalanceHistory[],
) {
  return {
    ...treasury,
    transactions: transactions.filter((t) => t.treasuryId === treasury.id),
    dailyBalance: dailyBalances.find((d) => d.treasuryId === treasury.id) ?? null,
  }
}
