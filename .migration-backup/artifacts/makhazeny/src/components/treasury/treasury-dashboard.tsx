import { apiFetch } from '@/lib/api'
import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { StatCard, StatCardSkeleton } from '@/components/ui/stat-card'
import { DollarSign, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/i18n'

interface TreasuryDashboard {
  openingBalance: number
  income: number
  expenses: number
  profit: number
  closingBalance: number
  transactionCount: number
}

export function TreasuryDashboard() {
  const [treasury, setTreasury] = useState<TreasuryDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const { t } = useLanguage()

  useEffect(() => { fetchTodayTreasury() }, [])

  async function fetchTodayTreasury() {
    setLoading(true)
    try {
      const response = await apiFetch('/api/treasury', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-today' }),
      })
      const result = await response.json()
      if (result.success && result.data.summary) {
        setTreasury({
          openingBalance: Number(result.data.summary.openingBalance),
          income: Number(result.data.summary.income),
          expenses: Number(result.data.summary.expenses),
          profit: Number(result.data.summary.profit),
          closingBalance: Number(result.data.summary.closingBalance),
          transactionCount: result.data.summary.transactionCount,
        })
      } else {
        toast.error('Failed to load treasury data')
      }
    } catch {
      toast.error('Failed to load treasury data')
    } finally {
      setLoading(false)
    }
  }

  const fmt = (value: number) =>
    new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(value)

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
    )
  }

  if (!treasury) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <StatCard label={t('Current Balance')} value={fmt(treasury.closingBalance)}
        subtitle={t("Today's closing balance")} icon={Wallet} tone="default" />
      <StatCard label={t('Today Income')} value={fmt(treasury.income)}
        subtitle={t('Sales + Installments')} icon={TrendingUp} tone="success" />
      <StatCard label={t('Today Expenses')} value={fmt(treasury.expenses)}
        subtitle={t('Payments + Operational')} icon={TrendingDown} tone="danger" />
      <StatCard label={t('Today Profit')} value={fmt(treasury.profit)}
        subtitle={t('Income - Expenses')} icon={DollarSign}
        tone={treasury.profit >= 0 ? 'default' : 'danger'} />
      <StatCard label={t('Transactions')} value={treasury.transactionCount}
        subtitle={t('Cash movements')}
        badge={<Badge variant="outline" className="text-xs">{t('Today')}</Badge>} />
    </div>
  )
}
