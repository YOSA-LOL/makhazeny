'use client'

import { useState, useEffect } from 'react'
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
        toast.error('Failed to load treasury data')
      }
    } catch (error) {
      console.error('Failed to fetch treasury:', error)
      toast.error('Failed to load treasury data')
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
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <StatCard
        label="Current Balance"
        value={formatCurrency(treasury.closingBalance)}
        subtitle="Today's closing balance"
        icon={Wallet}
        tone="default"
      />
      <StatCard
        label="Today Income"
        value={formatCurrency(treasury.income)}
        subtitle="Sales + Installments"
        icon={TrendingUp}
        tone="success"
      />
      <StatCard
        label="Today Expenses"
        value={formatCurrency(treasury.expenses)}
        subtitle="Payments + Operational"
        icon={TrendingDown}
        tone="danger"
      />
      <StatCard
        label="Today Profit"
        value={formatCurrency(treasury.profit)}
        subtitle="Income - Expenses"
        icon={DollarSign}
        tone={treasury.profit >= 0 ? 'default' : 'danger'}
      />
      <StatCard
        label="Transactions"
        value={treasury.transactionCount}
        subtitle="Cash movements"
        badge={
          <Badge variant="outline" className="text-xs">
            Today
          </Badge>
        }
      />
    </div>
  )
}
