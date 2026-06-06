import type { VariantProps } from 'class-variance-authority'

import { badgeVariants } from '@/components/ui/badge'

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>

export type StatTone = 'default' | 'success' | 'danger' | 'warning' | 'info'

const INCOME_TYPES = ['SALES_INCOME', 'INSTALLMENT_PAYMENT', 'MANUAL_INCOME', 'RETURN_REFUND']

export function isIncomeTransaction(type: string): boolean {
  return INCOME_TYPES.includes(type)
}

export function getSaleStatusBadgeVariant(status: string): BadgeVariant {
  switch (status.toUpperCase()) {
    case 'PAID':
      return 'success'
    case 'PARTIAL':
      return 'info'
    case 'PENDING':
      return 'warning'
    case 'CANCELLED':
      return 'destructive'
    default:
      return 'outline'
  }
}

export function getDebtStatusBadgeVariant(status: string): BadgeVariant {
  switch (status.toUpperCase()) {
    case 'PAID':
      return 'success'
    case 'PARTIAL':
      return 'info'
    case 'OVERDUE':
      return 'destructive'
    case 'ACTIVE':
      return 'warning'
    case 'CANCELLED':
      return 'outline'
    default:
      return 'outline'
  }
}

export function getReturnStatusBadgeVariant(status: string): BadgeVariant {
  switch (status.toUpperCase()) {
    case 'PROCESSED':
    case 'APPROVED':
      return 'success'
    case 'PENDING':
      return 'warning'
    case 'REJECTED':
      return 'destructive'
    default:
      return 'outline'
  }
}

export function getTreasuryTransactionBadgeVariant(type: string): BadgeVariant {
  const upper = type.toUpperCase()
  if (
    upper.includes('INCOME') ||
    upper.includes('SALES') ||
    upper.includes('INSTALLMENT')
  ) {
    return 'success'
  }
  if (upper === 'RETURN_REFUND') return 'success'
  if (upper.includes('EXPENSE') || upper.includes('PAYMENT') || upper.includes('REFUND')) {
    return 'destructive'
  }
  return 'outline'
}

export function getTransactionTone(type: string): StatTone {
  const upper = type.toUpperCase()
  if (
    upper.includes('INCOME') ||
    upper.includes('SALES') ||
    upper.includes('INSTALLMENT') ||
    upper === 'RETURN_REFUND'
  ) {
    return 'success'
  }
  if (upper.includes('EXPENSE') || upper.includes('PAYMENT') || (upper.includes('REFUND') && upper !== 'RETURN_REFUND')) {
    return 'danger'
  }
  return 'default'
}

export const statToneClasses: Record<
  StatTone,
  { border: string; icon: string; value: string; iconBg: string }
> = {
  default: {
    border: 'border-l-primary',
    icon: 'text-primary',
    value: 'text-foreground',
    iconBg: 'bg-primary/10',
  },
  success: {
    border: 'border-l-success',
    icon: 'text-success',
    value: 'text-success',
    iconBg: 'bg-success/10',
  },
  danger: {
    border: 'border-l-destructive',
    icon: 'text-destructive',
    value: 'text-destructive',
    iconBg: 'bg-destructive/10',
  },
  warning: {
    border: 'border-l-warning',
    icon: 'text-warning-foreground',
    value: 'text-warning-foreground',
    iconBg: 'bg-warning/20',
  },
  info: {
    border: 'border-l-info',
    icon: 'text-info',
    value: 'text-info',
    iconBg: 'bg-info/10',
  },
}
