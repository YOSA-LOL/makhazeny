import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise'
import { getPool } from '@workspace/db'
import {
  type Category,
  type Customer,
  type Debt,
  type DebtStatus,
  type Payment,
  type PaymentMethod,
  type Product,
  type ReturnItem,
  type ReturnRecord,
  type ReturnReason,
  type Sale,
  type SaleStatus,
  type SalesItem,
  type Supplier,
  type Treasury,
  type TreasuryTransaction,
  type TransactionType,
  type User,
  type DailyBalanceHistory,
  enrichDebt,
  enrichReturn,
  enrichSale,
  enrichTreasury,
  id,
  isDateInRange,
  isSameDay,
  matches,
  now,
  paginate,
  startOfDay,
  withCategory,
  withCustomer,
} from './store-types.js'

type Row = RowDataPacket & Record<string, unknown>

function toNum(v: unknown): number {
  return v == null ? 0 : Number(v)
}

function toDate(v: unknown): Date {
  return v instanceof Date ? v : new Date(String(v))
}

function toBool(v: unknown): boolean {
  return v === true || v === 1 || v === '1'
}

function mapUser(row: Row): User {
  return {
    id: String(row.id),
    email: String(row.email),
    password: String(row.password),
    name: String(row.name),
    role: row.role as User['role'],
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  }
}

function mapCategory(row: Row): Category {
  return {
    id: String(row.id),
    name: String(row.name),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  }
}

function mapSupplier(row: Row): Supplier {
  return {
    id: String(row.id),
    name: String(row.name),
    phone: row.phone ? String(row.phone) : null,
    email: row.email ? String(row.email) : null,
    address: row.address ? String(row.address) : null,
    city: row.city ? String(row.city) : null,
    balance: toNum(row.balance),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  }
}

function mapProduct(row: Row): Product {
  return {
    id: String(row.id),
    name: String(row.name),
    sku: String(row.sku),
    description: row.description ? String(row.description) : null,
    categoryId: String(row.category_id),
    supplierId: row.supplier_id ? String(row.supplier_id) : null,
    purchasePrice: toNum(row.purchase_price),
    sellingPrice: toNum(row.selling_price),
    quantity: toNum(row.quantity),
    lowStockLevel: toNum(row.low_stock_level),
    barcode: row.barcode ? String(row.barcode) : null,
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  }
}

function mapCustomer(row: Row): Customer {
  return {
    id: String(row.id),
    name: String(row.name),
    phone: row.phone ? String(row.phone) : null,
    email: row.email ? String(row.email) : null,
    address: row.address ? String(row.address) : null,
    city: row.city ? String(row.city) : null,
    creditLimit: toNum(row.credit_limit),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  }
}

function mapSale(row: Row): Sale {
  return {
    id: String(row.id),
    saleNumber: String(row.sale_number),
    customerId: String(row.customer_id),
    totalAmount: toNum(row.total_amount),
    paidAmount: toNum(row.paid_amount),
    status: row.status as SaleStatus,
    paymentMethod: row.payment_method as PaymentMethod,
    notes: row.notes ? String(row.notes) : null,
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  }
}

function mapSalesItem(row: Row): SalesItem {
  return {
    id: String(row.id),
    saleId: String(row.sale_id),
    productId: String(row.product_id),
    quantity: toNum(row.quantity),
    price: toNum(row.price),
    total: toNum(row.total),
    createdAt: toDate(row.created_at),
  }
}

function mapDebt(row: Row): Debt {
  return {
    id: String(row.id),
    saleId: row.sale_id ? String(row.sale_id) : null,
    customerId: String(row.customer_id),
    originalAmount: toNum(row.original_amount),
    remainingAmount: toNum(row.remaining_amount),
    dueDate: row.due_date ? toDate(row.due_date) : null,
    status: row.status as DebtStatus,
    description: row.description ? String(row.description) : null,
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  }
}

function mapPayment(row: Row): Payment {
  const method = row.method as PaymentMethod
  return {
    id: String(row.id),
    debtId: String(row.debt_id),
    customerId: String(row.customer_id),
    amount: toNum(row.amount),
    method,
    paymentMethod: method,
    reference: row.reference ? String(row.reference) : null,
    notes: row.notes ? String(row.notes) : null,
    createdAt: toDate(row.created_at),
  }
}

function mapReturn(row: Row): ReturnRecord {
  const total = toNum(row.total_amount)
  return {
    id: String(row.id),
    returnNumber: String(row.return_number),
    saleId: String(row.sale_id),
    customerId: String(row.customer_id),
    totalAmount: total,
    totalReturnAmount: total,
    reason: row.reason as ReturnReason,
    status: row.status as ReturnRecord['status'],
    notes: row.notes ? String(row.notes) : null,
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  }
}

function mapReturnItem(row: Row): ReturnItem {
  const amount = toNum(row.return_amount)
  return {
    id: String(row.id),
    returnId: String(row.return_id),
    saleItemId: row.sale_item_id ? String(row.sale_item_id) : undefined,
    productId: String(row.product_id),
    quantity: toNum(row.quantity),
    price: toNum(row.price),
    amount,
    returnAmount: amount,
  }
}

function mapTreasury(row: Row): Treasury {
  return {
    id: String(row.id),
    date: toDate(row.date),
    openingBalance: toNum(row.opening_balance),
    closingBalance: toNum(row.closing_balance),
    isClosed: toBool(row.is_closed),
    closedAt: row.closed_at ? toDate(row.closed_at) : null,
    closedBySystem: toBool(row.closed_by_system),
    notes: row.notes ? String(row.notes) : null,
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  }
}

function mapTreasuryTransaction(row: Row): TreasuryTransaction {
  return {
    id: String(row.id),
    treasuryId: String(row.treasury_id),
    type: row.type as TransactionType,
    amount: toNum(row.amount),
    description: String(row.description),
    saleId: row.sale_id ? String(row.sale_id) : null,
    paymentId: row.payment_id ? String(row.payment_id) : null,
    supplierPaymentId: row.supplier_payment_id ? String(row.supplier_payment_id) : null,
    supplierId: row.supplier_id ? String(row.supplier_id) : null,
    returnId: row.return_id ? String(row.return_id) : null,
    expenseId: row.expense_id ? String(row.expense_id) : null,
    reference: row.reference ? String(row.reference) : null,
    createdAt: toDate(row.created_at),
  }
}

function mapDailyBalance(row: Row): DailyBalanceHistory {
  return {
    id: String(row.id),
    treasuryId: String(row.treasury_id),
    date: toDate(row.date),
    openingBalance: toNum(row.opening_balance),
    closingBalance: toNum(row.closing_balance),
    dailyIncome: toNum(row.daily_income),
    dailyExpense: toNum(row.daily_expense),
    dailyProfit: toNum(row.daily_profit),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  }
}

async function loadCategories(): Promise<Category[]> {
  const [rows] = await getPool().query<RowDataPacket[]>('SELECT * FROM categories')
  return rows.map(mapCategory)
}

async function loadSuppliers(): Promise<Supplier[]> {
  const [rows] = await getPool().query<RowDataPacket[]>('SELECT * FROM suppliers')
  return rows.map(mapSupplier)
}

async function loadCustomers(): Promise<Customer[]> {
  const [rows] = await getPool().query<RowDataPacket[]>('SELECT * FROM customers')
  return rows.map(mapCustomer)
}

async function loadProducts(): Promise<Product[]> {
  const [rows] = await getPool().query<RowDataPacket[]>('SELECT * FROM products')
  return rows.map(mapProduct)
}

async function loadDebts(): Promise<Debt[]> {
  const [rows] = await getPool().query<RowDataPacket[]>('SELECT * FROM debts')
  return rows.map(mapDebt)
}

async function loadSales(): Promise<Sale[]> {
  const [rows] = await getPool().query<RowDataPacket[]>('SELECT * FROM sales')
  return rows.map(mapSale)
}

async function loadSalesItems(): Promise<SalesItem[]> {
  const [rows] = await getPool().query<RowDataPacket[]>('SELECT * FROM sales_items')
  return rows.map(mapSalesItem)
}

async function loadPayments(): Promise<Payment[]> {
  const [rows] = await getPool().query<RowDataPacket[]>('SELECT * FROM payments')
  return rows.map(mapPayment)
}

async function loadTreasuryTransactions(): Promise<TreasuryTransaction[]> {
  const [rows] = await getPool().query<RowDataPacket[]>('SELECT * FROM treasury_transactions')
  return rows.map(mapTreasuryTransaction)
}

async function loadDailyBalances(): Promise<DailyBalanceHistory[]> {
  const [rows] = await getPool().query<RowDataPacket[]>('SELECT * FROM daily_balance_histories')
  return rows.map(mapDailyBalance)
}

export const store = {
  users: {
    async findByEmail(email: string) {
      const [rows] = await getPool().query<RowDataPacket[]>(
        'SELECT * FROM users WHERE email = ? LIMIT 1',
        [email],
      )
      return rows[0] ? mapUser(rows[0]) : null
    },
  },

  categories: {
    async findMany() {
      const [rows] = await getPool().query<RowDataPacket[]>(
        'SELECT * FROM categories ORDER BY name ASC',
      )
      return rows.map(mapCategory)
    },
    async findByName(name: string) {
      const [rows] = await getPool().query<RowDataPacket[]>(
        'SELECT * FROM categories WHERE name = ? LIMIT 1',
        [name],
      )
      return rows[0] ? mapCategory(rows[0]) : null
    },
    async create(name: string) {
      const categoryId = id()
      const t = now()
      await getPool().query(
        'INSERT INTO categories (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
        [categoryId, name, t, t],
      )
      return { id: categoryId, name, createdAt: t, updatedAt: t }
    },
  },

  products: {
    async findMany(opts: { search?: string; categoryId?: string; skip: number; limit: number }) {
      const categories = await loadCategories()
      const suppliers = await loadSuppliers()
      let sql = 'SELECT * FROM products WHERE 1=1'
      const params: unknown[] = []
      if (opts.search) {
        sql += ' AND (LOWER(name) LIKE ? OR LOWER(sku) LIKE ?)'
        const term = `%${opts.search.toLowerCase()}%`
        params.push(term, term)
      }
      if (opts.categoryId) {
        sql += ' AND category_id = ?'
        params.push(opts.categoryId)
      }
      sql += ' ORDER BY created_at DESC'
      const [rows] = await getPool().query<RowDataPacket[]>(sql, params)
      const products = rows.map(mapProduct)
      const { items, total } = paginate(products, opts.skip, opts.limit)
      return { items: items.map((p) => withCategory(p, categories, suppliers)), total }
    },
    async findById(productId: string) {
      const [rows] = await getPool().query<RowDataPacket[]>(
        'SELECT * FROM products WHERE id = ? LIMIT 1',
        [productId],
      )
      if (!rows[0]) return null
      const categories = await loadCategories()
      const suppliers = await loadSuppliers()
      return withCategory(mapProduct(rows[0]), categories, suppliers)
    },
    async findBySku(sku: string) {
      const [rows] = await getPool().query<RowDataPacket[]>(
        'SELECT * FROM products WHERE sku = ? LIMIT 1',
        [sku],
      )
      return rows[0] ? mapProduct(rows[0]) : null
    },
    async findByNameAndCategory(name: string, categoryId: string) {
      const [rows] = await getPool().query<RowDataPacket[]>(
        'SELECT * FROM products WHERE LOWER(name) = LOWER(?) AND category_id = ? LIMIT 1',
        [name, categoryId],
      )
      if (!rows[0]) return null
      const categories = await loadCategories()
      const suppliers = await loadSuppliers()
      return withCategory(mapProduct(rows[0]), categories, suppliers)
    },
    async create(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) {
      const productId = id()
      const t = now()
      await getPool().query(
        `INSERT INTO products (id, name, sku, description, category_id, supplier_id, purchase_price, selling_price, quantity, low_stock_level, barcode, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          productId, data.name, data.sku, data.description, data.categoryId, data.supplierId,
          data.purchasePrice, data.sellingPrice, data.quantity, data.lowStockLevel, data.barcode, t, t,
        ],
      )
      const categories = await loadCategories()
      const suppliers = await loadSuppliers()
      return withCategory({ ...data, id: productId, createdAt: t, updatedAt: t }, categories, suppliers)
    },
    async update(productId: string, data: Partial<Omit<Product, 'id' | 'createdAt'>>) {
      const fields: string[] = []
      const values: unknown[] = []
      const map: Record<string, unknown> = {
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        supplierId: data.supplierId,
        purchasePrice: data.purchasePrice,
        sellingPrice: data.sellingPrice,
        quantity: data.quantity,
        lowStockLevel: data.lowStockLevel,
        barcode: data.barcode,
      }
      const colMap: Record<string, string> = {
        categoryId: 'category_id',
        supplierId: 'supplier_id',
        purchasePrice: 'purchase_price',
        sellingPrice: 'selling_price',
        lowStockLevel: 'low_stock_level',
      }
      for (const [key, val] of Object.entries(map)) {
        if (val !== undefined) {
          fields.push(`${colMap[key] ?? key} = ?`)
          values.push(val)
        }
      }
      if (fields.length === 0) return this.findById(productId)
      fields.push('updated_at = ?')
      values.push(now(), productId)
      await getPool().query(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, values)
      return this.findById(productId)
    },
    async delete(productId: string) {
      const [result] = await getPool().query<ResultSetHeader>(
        'DELETE FROM products WHERE id = ?',
        [productId],
      )
      return result.affectedRows > 0
    },
    async incrementQuantity(productId: string, amount: number) {
      await getPool().query(
        'UPDATE products SET quantity = quantity + ?, updated_at = ? WHERE id = ?',
        [amount, now(), productId],
      )
    },
    async decrementQuantity(productId: string, amount: number) {
      await getPool().query(
        'UPDATE products SET quantity = quantity - ?, updated_at = ? WHERE id = ?',
        [amount, now(), productId],
      )
    },
    async findAllWithCategories() {
      const categories = await loadCategories()
      const suppliers = await loadSuppliers()
      const products = await loadProducts()
      return products.map((p) => withCategory(p, categories, suppliers))
    },
    async findAllWithSaleItems() {
      const categories = await loadCategories()
      const products = await loadProducts()
      const salesItems = await loadSalesItems()
      return products.map((p) => ({
        ...withCategory(p, categories),
        saleItems: salesItems.filter((si) => si.productId === p.id),
      }))
    },
  },

  customers: {
    async findMany(opts: { search?: string; skip: number; limit: number }) {
      const debts = await loadDebts()
      let sql = 'SELECT * FROM customers WHERE 1=1'
      const params: unknown[] = []
      if (opts.search) {
        sql += ' AND (LOWER(name) LIKE ? OR LOWER(phone) LIKE ? OR LOWER(email) LIKE ?)'
        const term = `%${opts.search.toLowerCase()}%`
        params.push(term, term, term)
      }
      sql += ' ORDER BY created_at DESC'
      const [rows] = await getPool().query<RowDataPacket[]>(sql, params)
      const customers = rows.map(mapCustomer)
      const { items, total } = paginate(customers, opts.skip, opts.limit)
      return { items: items.map((c) => withCustomer(c, debts)), total }
    },
    async findById(customerId: string) {
      const [rows] = await getPool().query<RowDataPacket[]>(
        'SELECT * FROM customers WHERE id = ? LIMIT 1',
        [customerId],
      )
      if (!rows[0]) return null
      const debts = await loadDebts()
      return withCustomer(mapCustomer(rows[0]), debts)
    },
    async create(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) {
      const customerId = id()
      const t = now()
      await getPool().query(
        `INSERT INTO customers (id, name, phone, email, address, city, credit_limit, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [customerId, data.name, data.phone, data.email, data.address, data.city, data.creditLimit, t, t],
      )
      return { ...data, id: customerId, createdAt: t, updatedAt: t }
    },
    async update(customerId: string, data: Partial<Omit<Customer, 'id' | 'createdAt'>>) {
      const fields: string[] = []
      const values: unknown[] = []
      const map: Record<string, unknown> = {
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        city: data.city,
        creditLimit: data.creditLimit,
      }
      for (const [key, val] of Object.entries(map)) {
        if (val !== undefined) {
          fields.push(`${key === 'creditLimit' ? 'credit_limit' : key} = ?`)
          values.push(val)
        }
      }
      if (fields.length === 0) return this.findById(customerId)
      fields.push('updated_at = ?')
      values.push(now(), customerId)
      await getPool().query(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`, values)
      const [rows] = await getPool().query<RowDataPacket[]>(
        'SELECT * FROM customers WHERE id = ? LIMIT 1',
        [customerId],
      )
      return rows[0] ? mapCustomer(rows[0]) : null
    },
    async delete(customerId: string) {
      const [result] = await getPool().query<ResultSetHeader>(
        'DELETE FROM customers WHERE id = ?',
        [customerId],
      )
      return result.affectedRows > 0
    },
    async findAllWithDebts() {
      const customers = await loadCustomers()
      const debts = await loadDebts()
      return customers.map((c) => ({
        ...c,
        debts: debts.filter(
          (d) => d.customerId === c.id && ['ACTIVE', 'PARTIAL'].includes(d.status),
        ),
      }))
    },
  },

  suppliers: {
    async findMany(opts: { search?: string; skip: number; limit: number }) {
      let sql = 'SELECT * FROM suppliers WHERE 1=1'
      const params: unknown[] = []
      if (opts.search) {
        sql += ' AND (LOWER(name) LIKE ? OR LOWER(phone) LIKE ? OR LOWER(email) LIKE ?)'
        const term = `%${opts.search.toLowerCase()}%`
        params.push(term, term, term)
      }
      sql += ' ORDER BY created_at DESC'
      const [rows] = await getPool().query<RowDataPacket[]>(sql, params)
      return paginate(rows.map(mapSupplier), opts.skip, opts.limit)
    },
    async findById(supplierId: string) {
      const [rows] = await getPool().query<RowDataPacket[]>(
        'SELECT * FROM suppliers WHERE id = ? LIMIT 1',
        [supplierId],
      )
      return rows[0] ? mapSupplier(rows[0]) : null
    },
    async create(data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt' | 'balance'>) {
      const supplierId = id()
      const t = now()
      await getPool().query(
        `INSERT INTO suppliers (id, name, phone, email, address, city, balance, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [supplierId, data.name, data.phone, data.email, data.address, data.city, t, t],
      )
      return { ...data, balance: 0, id: supplierId, createdAt: t, updatedAt: t }
    },
    async update(supplierId: string, data: Partial<Omit<Supplier, 'id' | 'createdAt'>>) {
      const fields: string[] = []
      const values: unknown[] = []
      for (const key of ['name', 'phone', 'email', 'address', 'city', 'balance'] as const) {
        if (data[key] !== undefined) {
          fields.push(`${key} = ?`)
          values.push(data[key])
        }
      }
      if (fields.length === 0) return this.findById(supplierId)
      fields.push('updated_at = ?')
      values.push(now(), supplierId)
      await getPool().query(`UPDATE suppliers SET ${fields.join(', ')} WHERE id = ?`, values)
      return this.findById(supplierId)
    },
    async delete(supplierId: string) {
      const [result] = await getPool().query<ResultSetHeader>(
        'DELETE FROM suppliers WHERE id = ?',
        [supplierId],
      )
      return result.affectedRows > 0
    },
  },

  sales: {
    async findMany(opts: { search?: string; date?: string; skip: number; limit: number }) {
      const customers = await loadCustomers()
      const products = await loadProducts()
      const suppliers = await loadSuppliers()
      const salesItems = await loadSalesItems()
      const debts = await loadDebts()
      let sql = 'SELECT * FROM sales WHERE 1=1'
      const params: unknown[] = []
      if (opts.date) {
        sql += ' AND DATE(created_at) = ?'
        params.push(opts.date.split('T')[0])
      }
      sql += ' ORDER BY created_at DESC'
      const [rows] = await getPool().query<RowDataPacket[]>(sql, params)
      let sales = rows.map(mapSale)
      if (opts.search) {
        sales = sales.filter((s) => {
          const customer = customers.find((c) => c.id === s.customerId)
          return matches(s.saleNumber, opts.search!) || matches(customer?.name, opts.search!)
        })
      }
      const { items, total } = paginate(sales, opts.skip, opts.limit)
      return {
        items: items.map((s) => enrichSale(s, customers, products, suppliers, salesItems, debts)),
        total,
      }
    },
    async findById(saleId: string) {
      const [rows] = await getPool().query<RowDataPacket[]>(
        'SELECT * FROM sales WHERE id = ? LIMIT 1',
        [saleId],
      )
      if (!rows[0]) return null
      const customers = await loadCustomers()
      const products = await loadProducts()
      const suppliers = await loadSuppliers()
      const salesItems = await loadSalesItems()
      const debts = await loadDebts()
      return enrichSale(mapSale(rows[0]), customers, products, suppliers, salesItems, debts)
    },
    async findLastSaleNumber() {
      const [rows] = await getPool().query<RowDataPacket[]>(
        'SELECT sale_number FROM sales ORDER BY created_at DESC LIMIT 1',
      )
      return rows[0] ? String(rows[0].sale_number) : null
    },
    async create(data: {
      saleNumber: string
      customerId: string
      totalAmount: number
      paidAmount?: number
      status?: SaleStatus
      paymentMethod: PaymentMethod
      notes?: string | null
      items: { productId: string; quantity: number; price: number; total: number }[]
    }) {
      const conn = await getPool().getConnection()
      try {
        await conn.beginTransaction()
        const saleId = id()
        const t = now()
        const paidAmount = data.paidAmount ?? data.totalAmount
        const status = data.status ?? 'PAID'
        await conn.query(
          `INSERT INTO sales (id, sale_number, customer_id, total_amount, paid_amount, status, payment_method, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [saleId, data.saleNumber, data.customerId, data.totalAmount, paidAmount, status, data.paymentMethod, data.notes ?? null, t, t],
        )
        for (const item of data.items) {
          await conn.query(
            `INSERT INTO sales_items (id, sale_id, product_id, quantity, price, total, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id(), saleId, item.productId, item.quantity, item.price, item.total, t],
          )
          await conn.query(
            'UPDATE products SET quantity = quantity - ?, updated_at = ? WHERE id = ?',
            [item.quantity, t, item.productId],
          )
        }
        await conn.commit()
        return (await this.findById(saleId))!
      } catch (err) {
        await conn.rollback()
        throw err
      } finally {
        conn.release()
      }
    },
    async update(saleId: string, data: Partial<Pick<Sale, 'status' | 'paidAmount' | 'notes'>>) {
      const fields: string[] = []
      const values: unknown[] = []
      if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status) }
      if (data.paidAmount !== undefined) { fields.push('paid_amount = ?'); values.push(data.paidAmount) }
      if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes) }
      if (fields.length === 0) return this.findById(saleId)
      fields.push('updated_at = ?')
      values.push(now(), saleId)
      await getPool().query(`UPDATE sales SET ${fields.join(', ')} WHERE id = ?`, values)
      return this.findById(saleId)
    },
    async delete(saleId: string) {
      const conn = await getPool().getConnection()
      try {
        await conn.beginTransaction()
        const [saleRows] = await conn.query<RowDataPacket[]>(
          'SELECT id FROM sales WHERE id = ? LIMIT 1',
          [saleId],
        )
        if (!saleRows[0]) { await conn.rollback(); return false }
        const [itemRows] = await conn.query<RowDataPacket[]>(
          'SELECT product_id, quantity FROM sales_items WHERE sale_id = ?',
          [saleId],
        )
        const t = now()
        for (const item of itemRows) {
          await conn.query(
            'UPDATE products SET quantity = quantity + ?, updated_at = ? WHERE id = ?',
            [item.quantity, t, item.product_id],
          )
        }
        await conn.query('DELETE FROM debts WHERE sale_id = ?', [saleId])
        await conn.query('DELETE FROM sales_items WHERE sale_id = ?', [saleId])
        await conn.query('DELETE FROM sales WHERE id = ?', [saleId])
        await conn.commit()
        return true
      } catch (err) {
        await conn.rollback()
        throw err
      } finally {
        conn.release()
      }
    },
    async findInDateRange(start: Date, end: Date) {
      const customers = await loadCustomers()
      const products = await loadProducts()
      const suppliers = await loadSuppliers()
      const salesItems = await loadSalesItems()
      const debts = await loadDebts()
      const [rows] = await getPool().query<RowDataPacket[]>(
        'SELECT * FROM sales WHERE created_at >= ? AND created_at <= ? ORDER BY created_at ASC',
        [start, end],
      )
      return rows
        .map(mapSale)
        .filter((s) => isDateInRange(s.createdAt, start, end))
        .map((s) => enrichSale(s, customers, products, suppliers, salesItems, debts))
    },
  },

  debts: {
    async findMany(opts: { customerId?: string; status?: string | string[]; date?: string; skip: number; limit: number }) {
      let sql = 'SELECT * FROM debts WHERE 1=1'
      const params: unknown[] = []
      if (opts.customerId) { sql += ' AND customer_id = ?'; params.push(opts.customerId) }
      if (opts.date) { sql += ' AND DATE(created_at) = ?'; params.push(opts.date.split('T')[0]) }
      if (opts.status) {
        const statuses = Array.isArray(opts.status) ? opts.status : [opts.status]
        sql += ` AND status IN (${statuses.map(() => '?').join(',')})`
        params.push(...statuses)
      }
      sql += ' ORDER BY created_at DESC'
      const [rows] = await getPool().query<RowDataPacket[]>(sql, params)
      const customers = await loadCustomers()
      const sales = await loadSales()
      const payments = await loadPayments()
      const debts = rows.map(mapDebt)
      const { items, total } = paginate(debts, opts.skip, opts.limit)
      return { items: items.map((d) => enrichDebt(d, customers, sales, payments)), total }
    },
    async findById(debtId: string) {
      const [rows] = await getPool().query<RowDataPacket[]>(
        'SELECT * FROM debts WHERE id = ? LIMIT 1',
        [debtId],
      )
      if (!rows[0]) return null
      const customers = await loadCustomers()
      const sales = await loadSales()
      const payments = await loadPayments()
      return enrichDebt(mapDebt(rows[0]), customers, sales, payments)
    },
    async create(data: {
      saleId?: string | null
      customerId: string
      originalAmount: number
      remainingAmount: number
      status?: DebtStatus
      dueDate?: Date | null
      description?: string | null
    }) {
      const debtId = id()
      const t = now()
      await getPool().query(
        `INSERT INTO debts (id, sale_id, customer_id, original_amount, remaining_amount, due_date, status, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          debtId, data.saleId ?? null, data.customerId, data.originalAmount, data.remainingAmount,
          data.dueDate ?? null, data.status ?? 'ACTIVE', data.description ?? null, t, t,
        ],
      )
      return (await this.findById(debtId))!
    },
    async update(debtId: string, data: Partial<Pick<Debt, 'remainingAmount' | 'status'>>) {
      const fields: string[] = []
      const values: unknown[] = []
      if (data.remainingAmount !== undefined) { fields.push('remaining_amount = ?'); values.push(data.remainingAmount) }
      if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status) }
      if (fields.length === 0) return this.findById(debtId)
      fields.push('updated_at = ?')
      values.push(now(), debtId)
      await getPool().query(`UPDATE debts SET ${fields.join(', ')} WHERE id = ?`, values)
      return this.findById(debtId)
    },
    async findAll() {
      const customers = await loadCustomers()
      const sales = await loadSales()
      const payments = await loadPayments()
      const debts = await loadDebts()
      return debts.map((d) => enrichDebt(d, customers, sales, payments))
    },
  },

  payments: {
    async findByDebtId(debtId: string) {
      const [rows] = await getPool().query<RowDataPacket[]>(
        'SELECT * FROM payments WHERE debt_id = ? ORDER BY created_at DESC',
        [debtId],
      )
      return rows.map(mapPayment)
    },
    async create(data: {
      debtId: string
      customerId: string
      amount: number
      paymentMethod?: PaymentMethod
      method?: PaymentMethod
      notes?: string | null
    }) {
      const paymentId = id()
      const method = data.method ?? data.paymentMethod ?? 'CASH'
      const t = now()
      await getPool().query(
        `INSERT INTO payments (id, debt_id, customer_id, amount, method, reference, notes, created_at)
         VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`,
        [paymentId, data.debtId, data.customerId, data.amount, method, data.notes ?? null, t],
      )
      return mapPayment({
        id: paymentId,
        debt_id: data.debtId,
        customer_id: data.customerId,
        amount: data.amount,
        method,
        reference: null,
        notes: data.notes ?? null,
        created_at: t,
      } as Row)
    },
  },

  returns: {
    async findMany(opts: { status?: string; date?: string; skip: number; limit: number }) {
      let sql = 'SELECT * FROM returns WHERE 1=1'
      const params: unknown[] = []
      if (opts.status) { sql += ' AND status = ?'; params.push(opts.status) }
      if (opts.date) { sql += ' AND DATE(created_at) = ?'; params.push(opts.date.split('T')[0]) }
      sql += ' ORDER BY created_at DESC'
      const [rows] = await getPool().query<RowDataPacket[]>(sql, params)
      const returns = rows.map(mapReturn)
      const { items, total } = paginate(returns, opts.skip, opts.limit)
      const products = await loadProducts()
      const enriched = await Promise.all(
        items.map(async (r) => {
          const sale = (await store.sales.findById(r.saleId))!
          const [itemRows] = await getPool().query<RowDataPacket[]>(
            'SELECT * FROM return_items WHERE return_id = ?',
            [r.id],
          )
          return enrichReturn(r, sale, itemRows.map(mapReturnItem), products)
        }),
      )
      return { items: enriched, total }
    },
    async findById(returnId: string) {
      const [rows] = await getPool().query<RowDataPacket[]>(
        'SELECT * FROM returns WHERE id = ? LIMIT 1',
        [returnId],
      )
      if (!rows[0]) return null
      const record = mapReturn(rows[0])
      const sale = (await store.sales.findById(record.saleId))!
      const [itemRows] = await getPool().query<RowDataPacket[]>(
        'SELECT * FROM return_items WHERE return_id = ?',
        [returnId],
      )
      const products = await loadProducts()
      return enrichReturn(record, sale, itemRows.map(mapReturnItem), products)
    },
    async findLastReturnNumber() {
      const [rows] = await getPool().query<RowDataPacket[]>(
        'SELECT return_number FROM returns ORDER BY created_at DESC LIMIT 1',
      )
      return rows[0] ? String(rows[0].return_number) : null
    },
    async create(data: {
      returnNumber: string
      saleId: string
      customerId: string
      totalReturnAmount: number
      reason: ReturnReason
      notes?: string | null
      items: { saleItemId?: string; productId: string; quantity: number; price: number; returnAmount: number }[]
    }) {
      const returnId = id()
      const t = now()
      const conn = await getPool().getConnection()
      try {
        await conn.beginTransaction()
        await conn.query(
          `INSERT INTO returns (id, return_number, sale_id, customer_id, total_amount, reason, status, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)`,
          [returnId, data.returnNumber, data.saleId, data.customerId, data.totalReturnAmount, data.reason, data.notes ?? null, t, t],
        )
        for (const item of data.items) {
          await conn.query(
            `INSERT INTO return_items (id, return_id, sale_item_id, product_id, quantity, price, return_amount, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id(), returnId, item.saleItemId ?? null, item.productId, item.quantity, item.price, item.returnAmount, t],
          )
        }
        await conn.commit()
        return (await this.findById(returnId))!
      } catch (err) {
        await conn.rollback()
        throw err
      } finally {
        conn.release()
      }
    },
    async update(returnId: string, data: Partial<Pick<ReturnRecord, 'status' | 'notes'>>) {
      const fields: string[] = []
      const values: unknown[] = []
      if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status) }
      if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes) }
      if (fields.length === 0) return this.findById(returnId)
      fields.push('updated_at = ?')
      values.push(now(), returnId)
      await getPool().query(`UPDATE returns SET ${fields.join(', ')} WHERE id = ?`, values)
      return this.findById(returnId)
    },
  },

  treasury: {
    async findMany(opts: { date?: string; from?: string; to?: string; skip: number; limit: number }) {
      let sql = 'SELECT * FROM treasuries'
      const params: unknown[] = []
      if (opts.from && opts.to) {
        sql += ' WHERE date >= ? AND date <= ?'
        params.push(opts.from.split('T')[0], opts.to.split('T')[0])
      } else if (opts.date === 'today') {
        sql += ' WHERE date = CURDATE()'
      } else if (opts.date) {
        sql += ' WHERE date = ?'
        params.push(opts.date.split('T')[0])
      }
      sql += ' ORDER BY date DESC'
      const [rows] = await getPool().query<RowDataPacket[]>(sql, params)
      const transactions = await loadTreasuryTransactions()
      const dailyBalances = await loadDailyBalances()
      const treasuries = rows.map(mapTreasury)
      const { items, total } = paginate(treasuries, opts.skip, opts.limit)
      return { items: items.map((t) => enrichTreasury(t, transactions, dailyBalances)), total }
    },
    async findById(treasuryId: string) {
      const [rows] = await getPool().query<RowDataPacket[]>(
        'SELECT * FROM treasuries WHERE id = ? LIMIT 1',
        [treasuryId],
      )
      if (!rows[0]) return null
      const transactions = await loadTreasuryTransactions()
      const dailyBalances = await loadDailyBalances()
      return enrichTreasury(mapTreasury(rows[0]), transactions, dailyBalances)
    },
    async findByDate(date: Date) {
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const [rows] = await getPool().query<RowDataPacket[]>(
        'SELECT * FROM treasuries WHERE date = ? LIMIT 1',
        [dateStr],
      )
      if (!rows[0]) return null
      const transactions = await loadTreasuryTransactions()
      const dailyBalances = await loadDailyBalances()
      return enrichTreasury(mapTreasury(rows[0]), transactions, dailyBalances)
    },
    async findPreviousDay(beforeDate: Date) {
      const dateStr = `${beforeDate.getFullYear()}-${String(beforeDate.getMonth() + 1).padStart(2, '0')}-${String(beforeDate.getDate()).padStart(2, '0')}`
      const [rows] = await getPool().query<RowDataPacket[]>(
        'SELECT * FROM treasuries WHERE date < ? ORDER BY date DESC LIMIT 1',
        [dateStr],
      )
      if (!rows[0]) return null
      const transactions = await loadTreasuryTransactions()
      const dailyBalances = await loadDailyBalances()
      return enrichTreasury(mapTreasury(rows[0]), transactions, dailyBalances)
    },
    async create(data: { date: Date; openingBalance: number; closingBalance: number; notes?: string }) {
      const treasuryId = id()
      const t = now()
      const dateStr = `${data.date.getFullYear()}-${String(data.date.getMonth() + 1).padStart(2, '0')}-${String(data.date.getDate()).padStart(2, '0')}`
      await getPool().query(
        `INSERT INTO treasuries (id, date, opening_balance, closing_balance, is_closed, closed_at, closed_by_system, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, NULL, 0, ?, ?, ?)`,
        [treasuryId, dateStr, data.openingBalance, data.closingBalance, data.notes ?? null, t, t],
      )
      return (await this.findById(treasuryId))!
    },
    async closeDay(treasuryId: string, closingBalance: number, closedBySystem = false) {
      const t = now()
      await getPool().query(
        `UPDATE treasuries SET is_closed = 1, closed_at = ?, closed_by_system = ?, closing_balance = ?, updated_at = ? WHERE id = ?`,
        [t, closedBySystem ? 1 : 0, closingBalance, t, treasuryId],
      )
      return this.findById(treasuryId)
    },
    async reopenDay(treasuryId: string) {
      const t = now()
      await getPool().query(
        `UPDATE treasuries SET is_closed = 0, closed_at = NULL, closed_by_system = 0, updated_at = ? WHERE id = ?`,
        [t, treasuryId],
      )
      return this.findById(treasuryId)
    },
    async findInDateRange(start: Date, end: Date) {
      const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
      const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
      const [rows] = await getPool().query<RowDataPacket[]>(
        'SELECT * FROM treasuries WHERE date >= ? AND date <= ? ORDER BY date ASC',
        [startStr, endStr],
      )
      const transactions = await loadTreasuryTransactions()
      const dailyBalances = await loadDailyBalances()
      return rows.map(mapTreasury).map((t) => enrichTreasury(t, transactions, dailyBalances))
    },
  },

  treasuryTransactions: {
    async findMany(opts: {
      treasuryId?: string
      startDate?: string
      endDate?: string
      type?: string
      skip: number
      limit: number
    }) {
      let sql = 'SELECT * FROM treasury_transactions WHERE 1=1'
      const params: unknown[] = []
      if (opts.treasuryId) { sql += ' AND treasury_id = ?'; params.push(opts.treasuryId) }
      if (opts.type) { sql += ' AND type = ?'; params.push(opts.type) }
      if (opts.startDate && opts.endDate) {
        sql += ' AND created_at >= ? AND created_at <= ?'
        params.push(new Date(opts.startDate), new Date(opts.endDate))
      }
      sql += ' ORDER BY created_at DESC'
      const [rows] = await getPool().query<RowDataPacket[]>(sql, params)
      return paginate(rows.map(mapTreasuryTransaction), opts.skip, opts.limit)
    },
    async create(data: Omit<TreasuryTransaction, 'id' | 'createdAt'>) {
      const transactionId = id()
      const t = now()
      await getPool().query(
        `INSERT INTO treasury_transactions (id, treasury_id, type, amount, description, reference, sale_id, payment_id, supplier_payment_id, supplier_id, return_id, expense_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          transactionId, data.treasuryId, data.type, data.amount, data.description, data.reference,
          data.saleId, data.paymentId, data.supplierPaymentId, data.supplierId, data.returnId, data.expenseId, t,
        ],
      )
      return { ...data, id: transactionId, createdAt: t }
    },
  },
}

