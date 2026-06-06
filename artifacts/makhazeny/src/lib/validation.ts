import { z } from 'zod'

// Auth Schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
})

// Product Schemas
export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().min(1, 'Category is required'),
  purchasePrice: z.string().or(z.number()).pipe(z.coerce.number().positive('Price must be positive')),
  sellingPrice: z.string().or(z.number()).pipe(z.coerce.number().positive('Price must be positive')),
  quantity: z.string().or(z.number()).pipe(z.coerce.number().int().nonnegative('Quantity cannot be negative')),
  lowStockLevel: z.string().or(z.number()).pipe(z.coerce.number().int().nonnegative('Stock level cannot be negative')),
  barcode: z.string().optional(),
})

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
})

// Customer Schemas
export const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  creditLimit: z.string().or(z.number()).pipe(z.coerce.number().nonnegative('Credit limit cannot be negative')),
})

// Supplier Schemas
export const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
})

// Sale Schemas
export const saleSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  paymentMethod: z.enum(['CASH', 'CARD', 'CHECK', 'TRANSFER', 'OTHER']).default('CASH'),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string().min(1, 'Product is required'),
      quantity: z.number().int().positive('Quantity must be greater than 0'),
      price: z.number().positive('Price must be positive'),
    })
  ).min(1, 'At least one item is required'),
})

export const saleItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.number().int().positive('Quantity must be greater than 0'),
  price: z.number().positive('Price must be positive'),
})

// Payment Schemas
export const paymentSchema = z.object({
  debtId: z.string().min(1, 'Debt is required'),
  amount: z.string().or(z.number()).pipe(z.coerce.number().positive('Amount must be positive')),
  method: z.enum(['CASH', 'CARD', 'CHECK', 'TRANSFER', 'OTHER']).default('CASH'),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

// Treasury Schemas
export const treasurySchema = z.object({
  date: z.date(),
  openingBalance: z.string().or(z.number()).pipe(z.coerce.number()),
  closingBalance: z.string().or(z.number()).pipe(z.coerce.number()),
  notes: z.string().optional(),
})

export const treasuryTransactionSchema = z.object({
  treasuryId: z.string().min(1, 'Treasury is required'),
  type: z.enum(['SALES_INCOME', 'INSTALLMENT_PAYMENT', 'SUPPLIER_PAYMENT', 'RETURN_REFUND', 'MANUAL_EXPENSE', 'MANUAL_INCOME']),
  amount: z.string().or(z.number()).pipe(z.coerce.number().positive('Amount must be positive')),
  description: z.string().min(1, 'Description is required'),
  reference: z.string().optional(),
  saleId: z.string().optional(),
  paymentId: z.string().optional(),
  expenseId: z.string().optional(),
})

export const manualExpenseSchema = z.object({
  amount: z.string().or(z.number()).pipe(z.coerce.number().positive('Amount must be positive')),
  description: z.string().min(1, 'Description is required'),
})

export const manualIncomeSchema = z.object({
  amount: z.string().or(z.number()).pipe(z.coerce.number().positive('Amount must be positive')),
  description: z.string().min(1, 'Description is required'),
})

// Expense Schemas
export const expenseSchema = z.object({
  category: z.enum(['RENT', 'UTILITIES', 'SALARY', 'MAINTENANCE', 'OFFICE_SUPPLIES', 'TRANSPORT', 'INSURANCE', 'MARKETING', 'OTHER']),
  description: z.string().min(1, 'Description is required'),
  amount: z.string().or(z.number()).pipe(z.coerce.number().positive('Amount must be positive')),
  paymentMethod: z.enum(['CASH', 'CARD', 'CHECK', 'TRANSFER', 'OTHER']).default('CASH'),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

// Return Schemas
export const returnSchema = z.object({
  saleId: z.string().min(1, 'Sale is required'),
  customerId: z.string().min(1, 'Customer is required'),
  reason: z.enum(['DEFECTIVE', 'WRONG_ITEM', 'CUSTOMER_REQUEST', 'DAMAGE', 'OTHER']),
  items: z.array(
    z.object({
      productId: z.string().min(1, 'Product is required'),
      quantity: z.number().int().positive('Quantity must be greater than 0'),
      amount: z.number().positive('Amount must be positive'),
    })
  ).min(1, 'At least one item is required'),
  notes: z.string().optional(),
})

// Types
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ProductInput = z.infer<typeof productSchema>
export type CategoryInput = z.infer<typeof categorySchema>
export type CustomerInput = z.infer<typeof customerSchema>
export type SupplierInput = z.infer<typeof supplierSchema>
export type SaleInput = z.infer<typeof saleSchema>
export type PaymentInput = z.infer<typeof paymentSchema>
export type TreasuryInput = z.infer<typeof treasurySchema>
export type TreasuryTransactionInput = z.infer<typeof treasuryTransactionSchema>
export type ManualExpenseInput = z.infer<typeof manualExpenseSchema>
export type ManualIncomeInput = z.infer<typeof manualIncomeSchema>
export type ExpenseInput = z.infer<typeof expenseSchema>
export type ReturnInput = z.infer<typeof returnSchema>
