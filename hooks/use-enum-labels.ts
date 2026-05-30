'use client'

import { useTranslations } from 'next-intl'

const ENUM_GROUPS = {
  saleStatus: 'saleStatus',
  paymentMethod: 'paymentMethod',
  debtStatus: 'debtStatus',
  returnReason: 'returnReason',
  returnStatus: 'returnStatus',
  treasuryType: 'treasuryType',
  expenseCategory: 'expenseCategory',
  inventoryType: 'inventoryType',
} as const

export function useEnumLabels() {
  const t = useTranslations('enums')

  function label(group: keyof typeof ENUM_GROUPS, key: string) {
    try {
      return t(`${ENUM_GROUPS[group]}.${key}` as never)
    } catch {
      return key
    }
  }

  return {
    saleStatus: (status: string) => label('saleStatus', status),
    paymentMethod: (method: string) => label('paymentMethod', method),
    debtStatus: (status: string) => label('debtStatus', status),
    returnReason: (reason: string) => label('returnReason', reason),
    returnStatus: (status: string) => label('returnStatus', status),
    treasuryType: (type: string) => label('treasuryType', type),
    expenseCategory: (category: string) => label('expenseCategory', category),
    inventoryType: (type: string) => label('inventoryType', type),
  }
}
