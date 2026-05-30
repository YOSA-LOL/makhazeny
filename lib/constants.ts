// User Roles
export const USER_ROLES = {
  ADMIN: 'ADMIN',
  ACCOUNTANT: 'ACCOUNTANT',
  EMPLOYEE: 'EMPLOYEE',
} as const

export const ROLE_PERMISSIONS = {
  ADMIN: ['all'],
  ACCOUNTANT: ['read', 'create', 'update', 'treasury', 'reports'],
  EMPLOYEE: ['read', 'create'],
} as const

// Sale Statuses
export const SALE_STATUSES = {
  PENDING: 'PENDING',
  PARTIAL: 'PARTIAL',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
} as const

// Payment Methods
export const PAYMENT_METHODS = {
  CASH: 'CASH',
  CARD: 'CARD',
  CHECK: 'CHECK',
  TRANSFER: 'TRANSFER',
  OTHER: 'OTHER',
} as const

// Debt Statuses
export const DEBT_STATUSES = {
  ACTIVE: 'ACTIVE',
  PARTIAL: 'PARTIAL',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED',
} as const

// Return Reasons
export const RETURN_REASONS = {
  DEFECTIVE: 'Defective Product',
  WRONG_ITEM: 'Wrong Item Sent',
  CUSTOMER_REQUEST: 'Customer Request',
  DAMAGE: 'Damaged in Transit',
  OTHER: 'Other Reason',
} as const

// Return Statuses
export const RETURN_STATUSES = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  PROCESSED: 'PROCESSED',
  REJECTED: 'REJECTED',
} as const

// Treasury Transaction Types
export const TREASURY_TRANSACTION_TYPES = {
  SALES_INCOME: 'Sales Income',
  INSTALLMENT_PAYMENT: 'Installment Payment',
  SUPPLIER_PAYMENT: 'Supplier Payment',
  RETURN_REFUND: 'Return Refund',
  MANUAL_EXPENSE: 'Manual Expense',
  MANUAL_INCOME: 'Manual Income',
} as const

// Expense Categories
export const EXPENSE_CATEGORIES = {
  RENT: 'Rent',
  UTILITIES: 'Utilities',
  SALARY: 'Salary',
  MAINTENANCE: 'Maintenance',
  OFFICE_SUPPLIES: 'Office Supplies',
  TRANSPORT: 'Transport',
  INSURANCE: 'Insurance',
  MARKETING: 'Marketing',
  OTHER: 'Other',
} as const

// Order Statuses
export const ORDER_STATUSES = {
  PENDING: 'PENDING',
  RECEIVED: 'RECEIVED',
  PARTIAL: 'PARTIAL',
  CANCELLED: 'CANCELLED',
} as const

// Inventory Types
export const INVENTORY_TYPES = {
  PURCHASE: 'Purchase',
  SALE: 'Sale',
  RETURN: 'Return',
  ADJUSTMENT: 'Adjustment',
  DAMAGE: 'Damage',
} as const

// Status Messages
export const STATUS_MESSAGES = {
  SUCCESS: 'Operation completed successfully',
  ERROR: 'An error occurred. Please try again.',
  CREATED: 'Created successfully',
  UPDATED: 'Updated successfully',
  DELETED: 'Deleted successfully',
  NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'Unauthorized access',
  INVALID_INPUT: 'Invalid input provided',
} as const

// Validation Messages
export const VALIDATION_MESSAGES = {
  EMAIL_INVALID: 'Invalid email address',
  PASSWORD_WEAK: 'Password must be at least 6 characters',
  NAME_REQUIRED: 'Name is required',
  REQUIRED_FIELD: 'This field is required',
  INVALID_AMOUNT: 'Invalid amount',
  INVALID_QUANTITY: 'Invalid quantity',
  NEGATIVE_AMOUNT: 'Amount cannot be negative',
} as const

// Number Formats
export const NUMBER_FORMATS = {
  CURRENCY: new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
  DECIMAL: new Intl.NumberFormat('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
  INTEGER: new Intl.NumberFormat('ar-EG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }),
} as const

// Date Formats
export const DATE_FORMATS = {
  FULL: 'EEEE, d MMMM yyyy',
  SHORT: 'd/M/yyyy',
  TIME: 'HH:mm:ss',
  DATETIME: 'd/M/yyyy HH:mm',
} as const

// Navigation Menu Items (href must match an existing app route)
export const MENU_ITEMS = [
  { key: 'dashboard', href: '/', icon: 'LayoutGrid' },
  { key: 'products', href: '/products', icon: 'Package' },
  { key: 'customers', href: '/customers', icon: 'Users' },
  { key: 'suppliers', href: '/suppliers', icon: 'Truck' },
  { key: 'sales', href: '/sales', icon: 'ShoppingCart' },
  { key: 'treasury', href: '/treasury', icon: 'Wallet' },
  { key: 'debts', href: '/debts', icon: 'AlertCircle' },
  { key: 'returns', href: '/returns', icon: 'RotateCcw' },
  { key: 'reports', href: '/reports', icon: 'BarChart3' },
] as const

// API Response Helpers
export class ApiResponse<T> {
  constructor(
    public success: boolean,
    public data?: T,
    public error?: string,
    public message?: string
  ) {}

  static success<T>(data: T, message?: string) {
    return new ApiResponse(true, data, undefined, message)
  }

  static error<T>(error: string, message?: string) {
    return new ApiResponse<T>(false, undefined, error, message)
  }
}

// Error Types
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}
