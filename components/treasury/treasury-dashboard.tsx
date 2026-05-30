'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { StatCard, StatCardSkeleton } from '@/components/ui/stat-card'
import { DollarSign, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { toast } from 'sonner'

interface TreasuryDashboard {
  openingBalance: number
  income: number
  expenses: number
  profit: number
  closingBalance: number
  transactionCount: number
}

export function TreasuryDashboard() {
  const t = useTranslations('treasury')
  const tc = useTranslations('common')

  const [treasury, setTreasury] = useState<TreasuryDashboard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTodayTreasury()
  }, [])

  async function fetchTodayTreasury() {
    setLoading(true)
    try {
      const response = await fetch('/api/treasury', {
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
        toast.error(t('failedLoad'))
      }
    } catch (error) {
      console.error('Failed to fetch treasury:', error)
      toast.error(t('failedLoad'))
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
    }).format(value)
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (!treasury) {
    return null
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
      <StatCard
        label={t('currentBalance')}
        value={formatCurrency(treasury.closingBalance)}
        subtitle={t('currentBalanceSubtitle')}
        icon={Wallet}
        tone="default"
      />
      <StatCard
        label={t('todayIncome')}
        value={formatCurrency(treasury.income)}
        subtitle={t('todayIncomeSubtitle')}
        icon={TrendingUp}
        tone="success"
      />
      <StatCard
        label={t('todayExpenses')}
        value={formatCurrency(treasury.expenses)}
        subtitle={t('todayExpensesSubtitle')}
        icon={TrendingDown}
        tone="danger"
      />
      <StatCard
        label={t('todayProfit')}
        value={formatCurrency(treasury.profit)}
        subtitle={t('todayProfitSubtitle')}
        icon={DollarSign}
        tone={treasury.profit >= 0 ? 'default' : 'danger'}
      />
      <StatCard
        label={t('transactionsLabel')}
        value={treasury.transactionCount}
        subtitle={t('transactionsSubtitle')}
        badge={
          <Badge variant="outline" className="text-xs">
            {tc('today')}
          </Badge>
        }
      />
    </div>
  )
}
