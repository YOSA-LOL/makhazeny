import { apiFetch } from '@/lib/api'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowDown, ArrowUp, TrendingUp, TrendingDown, Minus, ShieldAlert, Lock, Unlock, ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner'

interface Treasury {
  id: string
  date: string
  openingBalance: number
  closingBalance: number
  isClosed: boolean
  closedBySystem?: boolean
  transactions: Array<{ type: string; amount: number }>
  dailyBalance?: {
    dailyIncome: number
    dailyExpense: number
    dailyProfit: number
  }
}

interface TreasuryListProps {
  onView?: (treasury: Treasury) => void
}

export function TreasuryList({ onView: _onView }: TreasuryListProps) {
  const [treasuries, setTreasuries] = useState<Treasury[]>([])
  const [loading, setLoading] = useState(true)
  const [ascending, setAscending] = useState(false)

  useEffect(() => { fetchTreasuries() }, [])

  async function fetchTreasuries() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: '1', limit: '999' })
      const response = await apiFetch(`/api/treasury?${params}`)
      const result = await response.json()

      if (result.success) {
        // Store in chronological order (oldest first) as source of truth
        const sorted = [...result.data].sort(
          (a: Treasury, b: Treasury) => new Date(a.date).getTime() - new Date(b.date).getTime()
        )
        setTreasuries(sorted)
      } else {
        toast.error(result.error || 'Failed to fetch treasury records')
      }
    } catch (error) {
      console.error('Failed to fetch treasury:', error)
      toast.error('Failed to fetch treasury records')
    } finally {
      setLoading(false)
    }
  }

  // Display order: default newest first (descending)
  const displayed = ascending ? treasuries : [...treasuries].reverse()

  const fmt = (v: number) =>
    new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(v)

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-EG', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (treasuries.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">No treasury history yet.</div>
    )
  }

  // newest day is always treasuries[length-1] (source is always oldest→newest)
  const newestTreasury = treasuries[treasuries.length - 1]

  return (
    <div className="space-y-0">
      {/* Sort toggle header */}
      <div className="flex items-center justify-end mb-3">
        <button
          onClick={() => setAscending(!ascending)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-full px-3 py-1.5 transition-colors hover:border-foreground/30"
        >
          <ArrowUpDown className="h-3 w-3" />
          {ascending ? 'Oldest first' : 'Newest first'}
        </button>
      </div>

      {displayed.map((treasury, idx) => {
        const txns = treasury.transactions ?? []
        const income =
          treasury.dailyBalance?.dailyIncome ??
          txns.filter((t) => ['SALES_INCOME', 'INSTALLMENT_PAYMENT', 'MANUAL_INCOME'].includes(t.type))
              .reduce((s, t) => s + t.amount, 0)
        const expense =
          treasury.dailyBalance?.dailyExpense ??
          txns.filter((t) => ['SUPPLIER_PAYMENT', 'MANUAL_EXPENSE', 'RETURN_REFUND'].includes(t.type))
              .reduce((s, t) => s + t.amount, 0)
        const profit = income - expense
        const txCount = txns.filter((t) => t.type !== 'BALANCE_CARRYOVER').length
        const isLast = idx === displayed.length - 1

        const isToday = (() => {
          const d = new Date(treasury.date); d.setHours(0,0,0,0)
          const now = new Date(); now.setHours(0,0,0,0)
          return d.getTime() === now.getTime()
        })()

        const nextDay = displayed[idx + 1]

        return (
          <div key={treasury.id} className="relative">
            <Card className={`shadow-sm border ${isToday ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{fmtDate(treasury.date)}</span>
                    {isToday && (
                      <Badge variant="outline" className="text-xs border-primary text-primary">
                        Today
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {treasury.isClosed ? (
                      treasury.closedBySystem ? (
                        <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                          <ShieldAlert className="h-3 w-3" />
                          Auto Closed
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 border-amber-200">
                          <Lock className="h-3 w-3" />
                          Closed
                        </Badge>
                      )
                    ) : (
                      <Badge variant="outline" className="flex items-center gap-1 text-xs border-green-400 text-green-600">
                        <Unlock className="h-3 w-3" />
                        Open
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Opening</p>
                    <p className="font-semibold text-foreground">{fmt(treasury.openingBalance)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Income</p>
                    <p className="font-semibold text-green-600">+{fmt(income)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Expense</p>
                    <p className="font-semibold text-red-500">-{fmt(expense)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Profit</p>
                    <p className={`font-semibold flex items-center gap-1 ${profit > 0 ? 'text-green-600' : profit < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {profit > 0 ? <TrendingUp className="h-3 w-3" /> : profit < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                      {fmt(profit)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Closing</p>
                    <p className="font-bold text-foreground text-base">{fmt(treasury.closingBalance)}</p>
                    <p className="text-muted-foreground text-xs">{txCount} transactions</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Carryover arrow between days */}
            {!isLast && nextDay && (
              <div className="flex flex-col items-center my-0 py-1 relative z-10">
                <div className="flex items-center gap-2 bg-muted/60 border border-border rounded-full px-3 py-1 text-xs text-muted-foreground shadow-sm">
                  {ascending ? <ArrowDown className="h-3 w-3 text-primary" /> : <ArrowUp className="h-3 w-3 text-primary" />}
                  <span>
                    <span className="font-semibold text-foreground">{fmt(treasury.closingBalance)}</span>
                    {' '}carries over →{' '}
                    <span className="font-semibold text-foreground">{fmt(nextDay.openingBalance)}</span>
                    {' '}opening
                  </span>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Summary footer — always uses newest treasury's closing balance */}
      <Card className="mt-2 bg-muted/30 border-dashed">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <span className="text-muted-foreground">{treasuries.length} days of history</span>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-muted-foreground text-xs">Total Income</p>
                <p className="font-semibold text-green-600">
                  +{fmt(treasuries.reduce((s, t) => {
                    const inc = t.dailyBalance?.dailyIncome ?? (t.transactions ?? [])
                      .filter((tx) => ['SALES_INCOME', 'INSTALLMENT_PAYMENT', 'MANUAL_INCOME'].includes(tx.type))
                      .reduce((a, tx) => a + tx.amount, 0)
                    return s + inc
                  }, 0))}
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground text-xs">Total Expense</p>
                <p className="font-semibold text-red-500">
                  -{fmt(treasuries.reduce((s, t) => {
                    const exp = t.dailyBalance?.dailyExpense ?? (t.transactions ?? [])
                      .filter((tx) => ['SUPPLIER_PAYMENT', 'MANUAL_EXPENSE', 'RETURN_REFUND'].includes(tx.type))
                      .reduce((a, tx) => a + tx.amount, 0)
                    return s + exp
                  }, 0))}
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground text-xs">Current Balance</p>
                <p className="font-bold text-lg">
                  {fmt(newestTreasury?.closingBalance ?? 0)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
