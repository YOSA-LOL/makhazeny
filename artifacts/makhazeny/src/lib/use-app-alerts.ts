import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/api'
import { useLanguage } from '@/lib/i18n'

export type AlertSeverity = 'warning' | 'danger' | 'info'

export interface AppAlert {
  id: string
  type: 'low_stock' | 'out_of_stock' | 'overdue_debt' | 'pending_return'
  severity: AlertSeverity
  title: string
  message: string
  href: string
}

const POLL_INTERVAL_MS = 60_000

export function useAppAlerts() {
  const [alerts, setAlerts] = useState<AppAlert[]>([])
  const [loading, setLoading] = useState(true)
  const { t, formatCurrency } = useLanguage()

  const fetchAlerts = useCallback(async () => {
    try {
      const [productsRes, debtsRes, returnsRes] = await Promise.all([
        apiFetch('/api/products?limit=1000'),
        apiFetch('/api/debts?status=UNPAID&limit=1000'),
        apiFetch('/api/returns?status=PENDING&limit=100'),
      ])
      const [productsData, debtsData, returnsData] = await Promise.all([
        productsRes.json(),
        debtsRes.json(),
        returnsRes.json(),
      ])

      const next: AppAlert[] = []
      const products = productsData.data ?? []
      const debts = debtsData.data ?? []
      const returns = returnsData.data ?? []
      const now = new Date()

      for (const p of products) {
        if (p.quantity === 0) {
          next.push({
            id: `out-${p.id}`,
            type: 'out_of_stock',
            severity: 'danger',
            title: p.name,
            message: t('Out of stock'),
            href: '/products',
          })
        } else if (p.quantity <= p.lowStockLevel) {
          next.push({
            id: `low-${p.id}`,
            type: 'low_stock',
            severity: 'warning',
            title: p.name,
            message: `${p.quantity} ${t('left (min')} ${p.lowStockLevel})`,
            href: '/products',
          })
        }
      }

      for (const d of debts) {
        if (d.dueDate && new Date(d.dueDate) < now && d.remainingAmount > 0) {
          next.push({
            id: `debt-${d.id}`,
            type: 'overdue_debt',
            severity: 'danger',
            title: d.customer?.name ?? 'Customer',
            message: `${t('Overdue')} — ${formatCurrency(d.remainingAmount)}`,
            href: '/debts',
          })
        }
      }

      for (const r of returns) {
        next.push({
          id: `ret-${r.id}`,
          type: 'pending_return',
          severity: 'info',
          title: r.returnNumber,
            message: `${t('Pending approval')} — ${r.sale?.customer?.name ?? ''}`,
          href: '/returns',
        })
      }

      setAlerts(next)
    } catch {
      /* keep previous alerts on fetch failure */
    } finally {
      setLoading(false)
    }
  }, [t, formatCurrency])

  useEffect(() => {
    fetchAlerts()
    const id = setInterval(fetchAlerts, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [fetchAlerts])

  return { alerts, count: alerts.length, loading, refresh: fetchAlerts }
}
