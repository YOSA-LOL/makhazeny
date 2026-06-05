import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

// --- Types ---

export type UserRole = 'ADMIN' | 'ACCOUNTANT' | 'EMPLOYEE'
export type SaleStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'CANCELLED'
export type PaymentMethod = 'CASH' | 'CARD' | 'CHECK' | 'TRANSFER' | 'OTHER'
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

interface Database {
  users: User[]
  categories: Category[]
  products: Product[]
  customers: Customer[]
  suppliers: Supplier[]
  sales: Sale[]
  salesItems: SalesItem[]
  debts: Debt[]
  payments: Payment[]
  returns: ReturnRecord[]
  returnItems: ReturnItem[]
  treasuries: Treasury[]
  treasuryTransactions: TreasuryTransaction[]
  dailyBalanceHistories: DailyBalanceHistory[]
}

// --- Helpers ---

function now() {
  return new Date()
}

function id() {
  return randomUUID()
}

function matches(text: string | null | undefined, search: string) {
  return (text ?? '').toLowerCase().includes(search.toLowerCase())
}

function paginate<T>(items: T[], skip: number, take: number) {
  return { items: items.slice(skip, skip + take), total: items.length }
}

function startOfDay(d: Date) {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  return date
}

function isSameDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime()
}

function isDateInRange(date: Date, start: Date, end: Date) {
  const d = date.getTime()
  return d >= start.getTime() && d <= end.getTime()
}

function withCategory(product: Product, categories: Category[]) {
  return { ...product, category: categories.find((c) => c.id === product.categoryId) ?? null }
}

function withCustomer(customer: Customer, debts: Debt[]) {
  const activeDebts = debts.filter(
    (d) => d.customerId === customer.id && ['ACTIVE', 'PARTIAL', 'OVERDUE'].includes(d.status),
  )
  const totalDebt = activeDebts.reduce((sum, d) => sum + d.remainingAmount, 0)
  return { ...customer, debts: activeDebts.map((d) => ({ remainingAmount: d.remainingAmount })), totalDebt }
}

function enrichSale(sale: Sale, db: Database) {
  const customer = db.customers.find((c) => c.id === sale.customerId)!
  const items = db.salesItems
    .filter((i) => i.saleId === sale.id)
    .map((item) => ({
      ...item,
      product: db.products.find((p) => p.id === item.productId)!,
    }))
  const debt = db.debts.find((d) => d.saleId === sale.id) ?? null
  return {
    ...sale,
    debtId: debt?.id ?? null,
    customer,
    items,
    debt,
  }
}

function enrichReturn(record: ReturnRecord, db: Database) {
  const sale = enrichSale(db.sales.find((s) => s.id === record.saleId)!, db)
  const items = db.returnItems
    .filter((i) => i.returnId === record.id)
    .map((item) => ({
      ...item,
      product: db.products.find((p) => p.id === item.productId)!,
    }))
  return { ...record, sale, items }
}

function enrichDebt(debt: Debt, db: Database) {
  return {
    ...debt,
    customer: db.customers.find((c) => c.id === debt.customerId)!,
    sale: debt.saleId ? db.sales.find((s) => s.id === debt.saleId) ?? null : null,
    payments: db.payments.filter((p) => p.debtId === debt.id),
  }
}

function enrichTreasury(treasury: Treasury, db: Database) {
  return {
    ...treasury,
    transactions: db.treasuryTransactions.filter((t) => t.treasuryId === treasury.id),
    dailyBalance: db.dailyBalanceHistories.find((d) => d.treasuryId === treasury.id) ?? null,
  }
}

// --- Seed ---

function createSeedData(): Database {
  const t = now()
  const today = startOfDay(t)

  const categories: Category[] = [
    { id: 'cat-electronics', name: 'Electronics', createdAt: t, updatedAt: t },
    { id: 'cat-clothing', name: 'Clothing', createdAt: t, updatedAt: t },
    { id: 'cat-groceries', name: 'Groceries', createdAt: t, updatedAt: t },
  ]

  const products: Product[] = [
    { id: 'prod-laptop', name: 'Laptop Computer', sku: 'LAPTOP-001', description: 'High-performance laptop', categoryId: 'cat-electronics', purchasePrice: 800, sellingPrice: 1200, quantity: 4, lowStockLevel: 2, barcode: '1234567890001', createdAt: t, updatedAt: t },
    { id: 'prod-phone', name: 'Smartphone', sku: 'PHONE-001', description: 'Latest smartphone model', categoryId: 'cat-electronics', purchasePrice: 400, sellingPrice: 600, quantity: 15, lowStockLevel: 5, barcode: '1234567890002', createdAt: t, updatedAt: t },
    { id: 'prod-shirt', name: 'Cotton T-Shirt', sku: 'SHIRT-001', description: 'Comfortable cotton shirt', categoryId: 'cat-clothing', purchasePrice: 5, sellingPrice: 15, quantity: 99, lowStockLevel: 20, barcode: '1234567890003', createdAt: t, updatedAt: t },
    { id: 'prod-rice', name: 'White Rice 5kg', sku: 'RICE-001', description: 'Premium white rice', categoryId: 'cat-groceries', purchasePrice: 10, sellingPrice: 15, quantity: 50, lowStockLevel: 10, barcode: '1234567890004', createdAt: t, updatedAt: t },
  ]

  const suppliers: Supplier[] = [
    { id: 'sup-1', name: 'Tech Supply Co', phone: '+1234567890', email: 'supplier@techco.com', address: '123 Tech Street', city: 'Tech City', balance: 0, createdAt: t, updatedAt: t },
    { id: 'sup-2', name: 'Fashion Wholesale', phone: '+0987654321', email: 'supplier@fashion.com', address: '456 Fashion Ave', city: 'Fashion City', balance: 0, createdAt: t, updatedAt: t },
  ]

  const customers: Customer[] = [
    { id: 'cust-1', name: 'Ahmed Hassan', phone: '+201001234567', email: 'ahmed@example.com', address: '789 Main St', city: 'Cairo', creditLimit: 10000, createdAt: t, updatedAt: t },
    { id: 'cust-2', name: 'Fatima Mohamed', phone: '+201101234567', email: 'fatima@example.com', address: '101 King Street', city: 'Alexandria', creditLimit: 5000, createdAt: t, updatedAt: t },
  ]

  const sales: Sale[] = [
    { id: 'sale-1', saleNumber: 'SALE-000001', customerId: 'cust-1', totalAmount: 1215, paidAmount: 600, status: 'PARTIAL', paymentMethod: 'CASH', notes: null, createdAt: t, updatedAt: t },
  ]

  const salesItems: SalesItem[] = [
    { id: 'si-1', saleId: 'sale-1', productId: 'prod-laptop', quantity: 1, price: 1200, total: 1200, createdAt: t },
    { id: 'si-2', saleId: 'sale-1', productId: 'prod-shirt', quantity: 1, price: 15, total: 15, createdAt: t },
  ]

  const debts: Debt[] = [
    { id: 'debt-1', saleId: 'sale-1', customerId: 'cust-1', originalAmount: 1215, remainingAmount: 615, status: 'PARTIAL', dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), createdAt: t, updatedAt: t },
  ]

  const users: User[] = [
    { id: 'user-admin', email: 'admin@makhazeny.local', password: bcrypt.hashSync('admin123', 10), name: 'Admin User', role: 'ADMIN', createdAt: t, updatedAt: t },
    { id: 'user-accountant', email: 'accountant@makhazeny.local', password: bcrypt.hashSync('accountant123', 10), name: 'Accountant User', role: 'ACCOUNTANT', createdAt: t, updatedAt: t },
    { id: 'user-employee', email: 'employee@makhazeny.local', password: bcrypt.hashSync('employee123', 10), name: 'Employee User', role: 'EMPLOYEE', createdAt: t, updatedAt: t },
  ]

  const treasuries: Treasury[] = []
  const treasuryTransactions: TreasuryTransaction[] = []
  const dailyBalanceHistories: DailyBalanceHistory[] = []

  let runningBalance = 5000
  for (let i = 6; i >= 0; i--) {
    const treasuryDate = new Date(today)
    treasuryDate.setDate(treasuryDate.getDate() - i)

    const dailyIncome = i === 0 ? 1215 : Math.round((Math.random() * 2000 + 1000) * 100) / 100
    const dailyExpense = i === 0 ? 250 : Math.round((Math.random() * 500 + 100) * 100) / 100
    const dailyProfit = dailyIncome - dailyExpense
    const closingBalance = runningBalance + dailyProfit
    const treasuryId = `treasury-${i}`

    treasuries.push({
      id: treasuryId,
      date: treasuryDate,
      openingBalance: runningBalance,
      closingBalance,
      notes: `Daily treasury record for ${treasuryDate.toDateString()}`,
      createdAt: t,
      updatedAt: t,
    })

    if (i === 0) {
      treasuryTransactions.push(
        { id: 'tt-1', treasuryId, type: 'SALES_INCOME', amount: 1215, description: 'Sale #SALE-000001 - Cash sales', saleId: 'sale-1', paymentId: null, supplierPaymentId: null, supplierId: null, returnId: null, expenseId: null, reference: 'SALE-000001', createdAt: t },
        { id: 'tt-2', treasuryId, type: 'MANUAL_EXPENSE', amount: 250, description: 'Daily operational expenses', saleId: null, paymentId: null, supplierPaymentId: null, supplierId: null, returnId: null, expenseId: null, reference: 'EXP-001', createdAt: t },
      )
    } else {
      const randomIncome = Math.round((Math.random() * 1000 + 800) * 100) / 100
      const randomExpense = Math.round((Math.random() * 400 + 50) * 100) / 100
      treasuryTransactions.push(
        { id: `tt-income-${i}`, treasuryId, type: 'SALES_INCOME', amount: randomIncome, description: `Sales income for ${treasuryDate.toDateString()}`, saleId: null, paymentId: null, supplierPaymentId: null, supplierId: null, returnId: null, expenseId: null, reference: `SALE-${100 + i}`, createdAt: t },
        { id: `tt-expense-${i}`, treasuryId, type: 'MANUAL_EXPENSE', amount: randomExpense, description: `Operational expenses for ${treasuryDate.toDateString()}`, saleId: null, paymentId: null, supplierPaymentId: null, supplierId: null, returnId: null, expenseId: null, reference: `EXP-${100 + i}`, createdAt: t },
      )
    }

    dailyBalanceHistories.push({
      id: `dbh-${i}`,
      treasuryId,
      date: treasuryDate,
      openingBalance: runningBalance,
      closingBalance,
      dailyIncome,
      dailyExpense,
      dailyProfit,
      createdAt: t,
      updatedAt: t,
    })

    runningBalance = closingBalance
  }

  return {
    users,
    categories,
    products,
    customers,
    suppliers,
    sales,
    salesItems,
    debts,
    payments: [],
    returns: [],
    returnItems: [],
    treasuries,
    treasuryTransactions,
    dailyBalanceHistories,
  }
}

const globalForStore = globalThis as unknown as { __store?: Database }

function getDb(): Database {
  if (!globalForStore.__store) {
    globalForStore.__store = createSeedData()
  }
  return globalForStore.__store
}

// --- Store API ---

export const store = {
  users: {
    findByEmail(email: string) {
      return getDb().users.find((u) => u.email === email) ?? null
    },
  },

  categories: {
    findMany() {
      return [...getDb().categories].sort((a, b) => a.name.localeCompare(b.name))
    },
    findByName(name: string) {
      return getDb().categories.find((c) => c.name === name) ?? null
    },
    create(name: string) {
      const db = getDb()
      const category: Category = { id: id(), name, createdAt: now(), updatedAt: now() }
      db.categories.push(category)
      return category
    },
  },

  products: {
    findMany(opts: { search?: string; categoryId?: string; skip: number; limit: number }) {
      const db = getDb()
      let items = [...db.products]
      if (opts.search) {
        items = items.filter((p) => matches(p.name, opts.search!) || matches(p.sku, opts.search!))
      }
      if (opts.categoryId) {
        items = items.filter((p) => p.categoryId === opts.categoryId)
      }
      items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      const { items: page, total } = paginate(items, opts.skip, opts.limit)
      return { items: page.map((p) => withCategory(p, db.categories)), total }
    },
    findById(productId: string) {
      const db = getDb()
      const product = db.products.find((p) => p.id === productId)
      return product ? withCategory(product, db.categories) : null
    },
    findBySku(sku: string) {
      return getDb().products.find((p) => p.sku === sku) ?? null
    },
    create(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) {
      const db = getDb()
      const product: Product = { ...data, id: id(), createdAt: now(), updatedAt: now() }
      db.products.push(product)
      return withCategory(product, db.categories)
    },
    update(productId: string, data: Partial<Omit<Product, 'id' | 'createdAt'>>) {
      const db = getDb()
      const idx = db.products.findIndex((p) => p.id === productId)
      if (idx === -1) return null
      db.products[idx] = { ...db.products[idx], ...data, updatedAt: now() }
      return withCategory(db.products[idx], db.categories)
    },
    delete(productId: string) {
      const db = getDb()
      const idx = db.products.findIndex((p) => p.id === productId)
      if (idx === -1) return false
      db.products.splice(idx, 1)
      return true
    },
    incrementQuantity(productId: string, amount: number) {
      const product = getDb().products.find((p) => p.id === productId)
      if (product) product.quantity += amount
    },
    decrementQuantity(productId: string, amount: number) {
      const product = getDb().products.find((p) => p.id === productId)
      if (product) product.quantity -= amount
    },
    findAllWithCategories() {
      const db = getDb()
      return db.products.map((p) => withCategory(p, db.categories))
    },
    findAllWithSaleItems() {
      const db = getDb()
      return db.products.map((p) => ({
        ...withCategory(p, db.categories),
        saleItems: db.salesItems.filter((si) => si.productId === p.id),
      }))
    },
  },

  customers: {
    findMany(opts: { search?: string; skip: number; limit: number }) {
      const db = getDb()
      let items = [...db.customers]
      if (opts.search) {
        items = items.filter(
          (c) => matches(c.name, opts.search!) || matches(c.phone, opts.search!) || matches(c.email, opts.search!),
        )
      }
      items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      const { items: page, total } = paginate(items, opts.skip, opts.limit)
      return { items: page.map((c) => withCustomer(c, db.debts)), total }
    },
    findById(customerId: string) {
      const db = getDb()
      const customer = db.customers.find((c) => c.id === customerId)
      return customer ? withCustomer(customer, db.debts) : null
    },
    create(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) {
      const customer: Customer = { ...data, id: id(), createdAt: now(), updatedAt: now() }
      getDb().customers.push(customer)
      return customer
    },
    update(customerId: string, data: Partial<Omit<Customer, 'id' | 'createdAt'>>) {
      const db = getDb()
      const idx = db.customers.findIndex((c) => c.id === customerId)
      if (idx === -1) return null
      db.customers[idx] = { ...db.customers[idx], ...data, updatedAt: now() }
      return db.customers[idx]
    },
    delete(customerId: string) {
      const db = getDb()
      const idx = db.customers.findIndex((c) => c.id === customerId)
      if (idx === -1) return false
      db.customers.splice(idx, 1)
      return true
    },
    findAllWithDebts() {
      const db = getDb()
      return db.customers.map((c) => ({
        ...c,
        debts: db.debts.filter(
          (d) => d.customerId === c.id && ['ACTIVE', 'PARTIAL'].includes(d.status),
        ),
      }))
    },
  },

  suppliers: {
    findMany(opts: { search?: string; skip: number; limit: number }) {
      let items = [...getDb().suppliers]
      if (opts.search) {
        items = items.filter(
          (s) => matches(s.name, opts.search!) || matches(s.phone, opts.search!) || matches(s.email, opts.search!),
        )
      }
      items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      return paginate(items, opts.skip, opts.limit)
    },
    findById(supplierId: string) {
      return getDb().suppliers.find((s) => s.id === supplierId) ?? null
    },
    create(data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt' | 'balance'>) {
      const supplier: Supplier = { ...data, balance: 0, id: id(), createdAt: now(), updatedAt: now() }
      getDb().suppliers.push(supplier)
      return supplier
    },
    update(supplierId: string, data: Partial<Omit<Supplier, 'id' | 'createdAt'>>) {
      const db = getDb()
      const idx = db.suppliers.findIndex((s) => s.id === supplierId)
      if (idx === -1) return null
      db.suppliers[idx] = { ...db.suppliers[idx], ...data, updatedAt: now() }
      return db.suppliers[idx]
    },
    delete(supplierId: string) {
      const db = getDb()
      const idx = db.suppliers.findIndex((s) => s.id === supplierId)
      if (idx === -1) return false
      db.suppliers.splice(idx, 1)
      return true
    },
  },

  sales: {
    findMany(opts: { search?: string; skip: number; limit: number }) {
      const db = getDb()
      let items = [...db.sales]
      if (opts.search) {
        items = items.filter((s) => {
          const customer = db.customers.find((c) => c.id === s.customerId)
          return matches(s.saleNumber, opts.search!) || matches(customer?.name, opts.search!)
        })
      }
      items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      const { items: page, total } = paginate(items, opts.skip, opts.limit)
      return { items: page.map((s) => enrichSale(s, db)), total }
    },
    findById(saleId: string) {
      const db = getDb()
      const sale = db.sales.find((s) => s.id === saleId)
      return sale ? enrichSale(sale, db) : null
    },
    findLastSaleNumber() {
      const sales = getDb().sales
      if (sales.length === 0) return null
      return [...sales].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].saleNumber
    },
    create(data: {
      saleNumber: string
      customerId: string
      totalAmount: number
      paymentMethod: PaymentMethod
      notes?: string | null
      items: { productId: string; quantity: number; price: number; total: number }[]
    }) {
      const db = getDb()
      const t = now()
      const sale: Sale = {
        id: id(),
        saleNumber: data.saleNumber,
        customerId: data.customerId,
        totalAmount: data.totalAmount,
        paidAmount: 0,
        status: 'PENDING',
        paymentMethod: data.paymentMethod,
        notes: data.notes ?? null,
        createdAt: t,
        updatedAt: t,
      }
      db.sales.push(sale)
      for (const item of data.items) {
        db.salesItems.push({
          id: id(),
          saleId: sale.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
          createdAt: t,
        })
        store.products.decrementQuantity(item.productId, item.quantity)
      }
      return enrichSale(sale, db)
    },
    update(saleId: string, data: Partial<Pick<Sale, 'status' | 'paidAmount' | 'notes'>>) {
      const db = getDb()
      const idx = db.sales.findIndex((s) => s.id === saleId)
      if (idx === -1) return null
      db.sales[idx] = { ...db.sales[idx], ...data, updatedAt: now() }
      return enrichSale(db.sales[idx], db)
    },
    delete(saleId: string) {
      const db = getDb()
      const sale = db.sales.find((s) => s.id === saleId)
      if (!sale) return false
      const items = db.salesItems.filter((i) => i.saleId === saleId)
      for (const item of items) {
        store.products.incrementQuantity(item.productId, item.quantity)
      }
      db.salesItems = db.salesItems.filter((i) => i.saleId !== saleId)
      db.debts = db.debts.filter((d) => d.saleId !== saleId)
      db.sales = db.sales.filter((s) => s.id !== saleId)
      return true
    },
    findInDateRange(start: Date, end: Date) {
      const db = getDb()
      return db.sales
        .filter((s) => isDateInRange(s.createdAt, start, end))
        .map((s) => enrichSale(s, db))
    },
  },

  debts: {
    findMany(opts: { customerId?: string; status?: string; skip: number; limit: number }) {
      const db = getDb()
      let items = [...db.debts]
      if (opts.customerId) items = items.filter((d) => d.customerId === opts.customerId)
      if (opts.status) items = items.filter((d) => d.status === opts.status)
      items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      const { items: page, total } = paginate(items, opts.skip, opts.limit)
      return { items: page.map((d) => enrichDebt(d, db)), total }
    },
    findById(debtId: string) {
      const db = getDb()
      const debt = db.debts.find((d) => d.id === debtId)
      return debt ? enrichDebt(debt, db) : null
    },
    create(data: {
      saleId?: string | null
      customerId: string
      originalAmount: number
      remainingAmount: number
      status?: DebtStatus
      dueDate?: Date | null
      description?: string | null
    }) {
      const db = getDb()
      const debt: Debt = {
        id: id(),
        saleId: data.saleId ?? null,
        customerId: data.customerId,
        originalAmount: data.originalAmount,
        remainingAmount: data.remainingAmount,
        status: data.status ?? 'ACTIVE',
        dueDate: data.dueDate ?? null,
        description: data.description ?? null,
        createdAt: now(),
        updatedAt: now(),
      }
      db.debts.push(debt)
      return enrichDebt(debt, db)
    },
    update(debtId: string, data: Partial<Pick<Debt, 'remainingAmount' | 'status'>>) {
      const db = getDb()
      const idx = db.debts.findIndex((d) => d.id === debtId)
      if (idx === -1) return null
      db.debts[idx] = { ...db.debts[idx], ...data, updatedAt: now() }
      return enrichDebt(db.debts[idx], db)
    },
    findAll() {
      return getDb().debts.map((d) => enrichDebt(d, getDb()))
    },
  },

  payments: {
    findByDebtId(debtId: string) {
      return getDb().payments.filter((p) => p.debtId === debtId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    },
    create(data: {
      debtId: string
      customerId: string
      amount: number
      paymentMethod?: PaymentMethod
      method?: PaymentMethod
      notes?: string | null
    }) {
      const payment: Payment = {
        id: id(),
        debtId: data.debtId,
        customerId: data.customerId,
        amount: data.amount,
        method: data.method ?? data.paymentMethod ?? 'CASH',
        paymentMethod: data.paymentMethod ?? data.method ?? 'CASH',
        reference: null,
        notes: data.notes ?? null,
        createdAt: now(),
      }
      getDb().payments.push(payment)
      return payment
    },
  },

  returns: {
    findMany(opts: { status: string; skip: number; limit: number }) {
      const db = getDb()
      let items = db.returns.filter((r) => r.status === opts.status)
      items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      const { items: page, total } = paginate(items, opts.skip, opts.limit)
      return { items: page.map((r) => enrichReturn(r, db)), total }
    },
    findById(returnId: string) {
      const db = getDb()
      const record = db.returns.find((r) => r.id === returnId)
      return record ? enrichReturn(record, db) : null
    },
    findLastReturnNumber() {
      const returns = getDb().returns
      if (returns.length === 0) return null
      return [...returns].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].returnNumber
    },
    create(data: {
      returnNumber: string
      saleId: string
      customerId: string
      totalReturnAmount: number
      reason: ReturnReason
      notes?: string | null
      items: { saleItemId?: string; productId: string; quantity: number; price: number; returnAmount: number }[]
    }) {
      const db = getDb()
      const t = now()
      const record: ReturnRecord = {
        id: id(),
        returnNumber: data.returnNumber,
        saleId: data.saleId,
        customerId: data.customerId,
        totalAmount: data.totalReturnAmount,
        totalReturnAmount: data.totalReturnAmount,
        reason: data.reason,
        status: 'PENDING',
        notes: data.notes ?? null,
        createdAt: t,
        updatedAt: t,
      }
      db.returns.push(record)
      for (const item of data.items) {
        db.returnItems.push({
          id: id(),
          returnId: record.id,
          saleItemId: item.saleItemId,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          amount: item.returnAmount,
          returnAmount: item.returnAmount,
        })
      }
      return enrichReturn(record, db)
    },
    update(returnId: string, data: Partial<Pick<ReturnRecord, 'status' | 'notes'>>) {
      const db = getDb()
      const idx = db.returns.findIndex((r) => r.id === returnId)
      if (idx === -1) return null
      db.returns[idx] = { ...db.returns[idx], ...data, updatedAt: now() }
      return enrichReturn(db.returns[idx], db)
    },
  },

  treasury: {
    findMany(opts: { date?: string; skip: number; limit: number }) {
      const db = getDb()
      let items = [...db.treasuries]
      if (opts.date === 'today') {
        items = items.filter((t) => isSameDay(t.date, now()))
      } else if (opts.date) {
        const selected = new Date(opts.date)
        items = items.filter((t) => isSameDay(t.date, selected))
      }
      items.sort((a, b) => b.date.getTime() - a.date.getTime())
      const { items: page, total } = paginate(items, opts.skip, opts.limit)
      return { items: page.map((t) => enrichTreasury(t, db)), total }
    },
    findById(treasuryId: string) {
      const db = getDb()
      const treasury = db.treasuries.find((t) => t.id === treasuryId)
      return treasury ? enrichTreasury(treasury, db) : null
    },
    findByDate(date: Date) {
      const db = getDb()
      const treasury = db.treasuries.find((t) => isSameDay(t.date, date))
      return treasury ? enrichTreasury(treasury, db) : null
    },
    findPreviousDay(beforeDate: Date) {
      const db = getDb()
      const target = startOfDay(beforeDate)
      const sorted = [...db.treasuries]
        .filter((t) => startOfDay(t.date).getTime() < target.getTime())
        .sort((a, b) => b.date.getTime() - a.date.getTime())
      if (sorted.length === 0) return null
      return enrichTreasury(sorted[0], db)
    },
    create(data: { date: Date; openingBalance: number; closingBalance: number; notes?: string }) {
      const db = getDb()
      const treasury: Treasury = {
        id: id(),
        date: data.date,
        openingBalance: data.openingBalance,
        closingBalance: data.closingBalance,
        notes: data.notes ?? null,
        createdAt: now(),
        updatedAt: now(),
      }
      db.treasuries.push(treasury)
      return enrichTreasury(treasury, db)
    },
    findInDateRange(start: Date, end: Date) {
      const db = getDb()
      return db.treasuries
        .filter((t) => isDateInRange(t.date, start, end))
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map((t) => enrichTreasury(t, db))
    },
  },

  treasuryTransactions: {
    findMany(opts: {
      treasuryId?: string
      startDate?: string
      endDate?: string
      type?: string
      skip: number
      limit: number
    }) {
      let items = [...getDb().treasuryTransactions]
      if (opts.treasuryId) items = items.filter((t) => t.treasuryId === opts.treasuryId)
      if (opts.type) items = items.filter((t) => t.type === opts.type)
      if (opts.startDate && opts.endDate) {
        const start = new Date(opts.startDate)
        const end = new Date(opts.endDate)
        items = items.filter((t) => isDateInRange(t.createdAt, start, end))
      }
      items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      return paginate(items, opts.skip, opts.limit)
    },
    create(data: Omit<TreasuryTransaction, 'id' | 'createdAt'>) {
      const transaction: TreasuryTransaction = { ...data, id: id(), createdAt: now() }
      getDb().treasuryTransactions.push(transaction)
      return transaction
    },
  },
}
