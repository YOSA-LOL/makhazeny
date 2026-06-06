import { apiFetch } from '@/lib/api'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowDown, ArrowUp, TrendingUp, TrendingDown, Minus, ShieldAlert, Lock, Unlock, ArrowUpDown, CalendarDays } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/i18n'
import { useSelectedDate, getHistoryDateRange } from '@/lib/date-context'

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
  refreshKey?: number
}

export function TreasuryList({ onView: _onView, refreshKey = 0 }: TreasuryListProps) {
  const { t, te, formatCurrency, formatDate } = useLanguage()
  const { selectedDate, isToday } = useSelectedDate()
  const { start: rangeStart, end: rangeEnd, fromStr, toStr } = getHistoryDateRange(selectedDate)
  const [treasuries, setTreasuries] = useState<Treasury[]>([])
  const [loading, setLoading] = useState(true)
  const [ascending, setAscending] = useState(false)

  useEffect(() => { fetchTreasuries() }, [refreshKey, fromStr, toStr])

  async function fetchTreasuries() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: '1', limit: '999', from: fromStr, to: toStr })
      const response = await apiFetch(`/api/treasury?${params}`)
      const result = await response.json()

      if (result.success) {
        // Store in chronological order (oldest first) as source of truth
        const sorted = [...result.data].sort(
          (a: Treasury, b: Treasury) => new Date(a.date).getTime() - new Date(b.date).getTime()
        )
        setTreasuries(sorted)
      } else {
        toast.error(result.error ? te(result.error) : t('Failed to fetch treasury records'))
      }
    } catch (error) {
      console.error('Failed to fetch treasury:', error)
      toast.error(t('Failed to fetch treasury records'))
    } finally {
      setLoading(false)
    }
  }

  // Display order: default newest first (descending)
  const displayed = ascending ? treasuries : [...treasuries].reverse()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const rangeLabel = `${formatDate(rangeStart, { day: 'numeric', month: 'short' })} – ${formatDate(rangeEnd, { day: 'numeric', month: 'short', year: 'numeric' })}`
  const endDayLabel = isToday
    ? t('Today')
    : formatDate(rangeEnd, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  if (treasuries.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground space-y-2">
        <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground/50" />
        <p>{t('No treasury records in this period.')}</p>
        <p className="text-xs">{rangeLabel}</p>
      </div>
    )
  }

  // newest day is always treasuries[length-1] (source is always oldest→newest)
  const newestTreasury = treasuries[treasuries.length - 1]

  return (
    <div className="space-y-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-primary" />
          <p className="text-xs text-primary font-medium">
            {t('7 days before')} {endDayLabel}
          </p>
          <span className="text-xs text-muted-foreground">({rangeLabel})</span>
        </div>
      {/* Sort toggle */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => setAscending(!ascending)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-full px-3 py-1.5 transition-colors hover:border-foreground/30"
        >
          <ArrowUpDown className="h-3 w-3" />
          {ascending ? t('Oldest first') : t('Newest first')}
        </button>
      </div>
      </div>

      {displayed.map((treasury, idx) => {
        const txns = treasury.transactions ?? []
        const income =
          treasury.dailyBalance?.dailyIncome ??
          txns.filter((t) => ['SALES_INCOME', 'INSTALLMENT_PAYMENT', 'MANUAL_INCOME', 'RETURN_REFUND'].includes(t.type))
              .reduce((s, t) => s + t.amount, 0)
        const expense =
          treasury.dailyBalance?.dailyExpense ??
          txns.filter((t) => ['SUPPLIER_PAYMENT', 'MANUAL_EXPENSE', 'INVENTORY_PURCHASE'].includes(t.type))
              .reduce((s, t) => s + t.amount, 0)
        const profit = income - expense
        const txCount = txns.filter((t) => t.type !== 'BALANCE_CARRYOVER').length
        const isLast = idx === displayed.length - 1

        const isSelectedDay = (() => {
          const d = new Date(treasury.date); d.setHours(0, 0, 0, 0)
          const sel = new Date(selectedDate); sel.setHours(0, 0, 0, 0)
          return d.getTime() === sel.getTime()
        })()
        const isActualToday = (() => {
          const d = new Date(treasury.date); d.setHours(0, 0, 0, 0)
          const now = new Date(); now.setHours(0, 0, 0, 0)
          return d.getTime() === now.getTime()
        })()

        const adjacentDay = displayed[idx + 1]
        const earlierDay =
          adjacentDay && new Date(treasury.date).getTime() < new Date(adjacentDay.date).getTime()
            ? treasury
            : adjacentDay
        const laterDay =
          adjacentDay && earlierDay === treasury ? adjacentDay : treasury

        return (
          <div key={treasury.id} className="relative">
            <Card className={`shadow-sm border ${isSelectedDay ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatDate(treasury.date, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    {isActualToday && (
                      <Badge variant="outline" className="text-xs border-primary text-primary">
                        {t('Today')}
                      </Badge>
                    )}
                    {isSelectedDay && !isActualToday && (
                      <Badge variant="outline" className="text-xs border-primary text-primary">
                        {t('Selected')}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {treasury.isClosed ? (
                      treasury.closedBySystem ? (
                        <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                          <ShieldAlert className="h-3 w-3" />
                          {t('Auto Closed')}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 border-amber-200">
                          <Lock className="h-3 w-3" />
                          {t('Closed')}
                        </Badge>
                      )
                    ) : (
                      <Badge variant="outline" className="flex items-center gap-1 text-xs border-green-400 text-green-600">
                        <Unlock className="h-3 w-3" />
                        {t('Open')}
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">{t('Opening')}</p>
                    <p className="font-semibold text-foreground">{formatCurrency(treasury.openingBalance)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">{t('Income')}</p>
                    <p className="font-semibold text-green-600">+{formatCurrency(income)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">{t('Expense')}</p>
                    <p className="font-semibold text-red-500">-{formatCurrency(expense)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">{t('Profit')}</p>
                    <p className={`font-semibold flex items-center gap-1 ${profit > 0 ? 'text-green-600' : profit < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {profit > 0 ? <TrendingUp className="h-3 w-3" /> : profit < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                      {formatCurrency(profit)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">{t('Closing')}</p>
                    <p className="font-bold text-foreground text-base">{formatCurrency(treasury.closingBalance)}</p>
                    <p className="text-muted-foreground text-xs">{txCount} {t('transactions')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Carryover: always earlier day's closing → later day's opening */}
            {!isLast && adjacentDay && earlierDay && laterDay && (
              <div className="flex flex-col items-center my-0 py-1 relative z-10">
                <div className="flex items-center gap-2 bg-muted/60 border border-border rounded-full px-3 py-1 text-xs text-muted-foreground shadow-sm">
                  {ascending ? <ArrowDown className="h-3 w-3 text-primary" /> : <ArrowUp className="h-3 w-3 text-primary" />}
                  <span>
                    <span className="font-semibold text-foreground">{formatCurrency(earlierDay.closingBalance)}</span>
                    {' '}{t('carries over →')}{' '}
                    <span className="font-semibold text-foreground">{formatCurrency(laterDay.openingBalance)}</span>
                    {' '}{t('opening')}
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
            <span className="text-muted-foreground">{treasuries.length} {t('days of history')}</span>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-muted-foreground text-xs">{t('Total Income')}</p>
                <p className="font-semibold text-green-600">
                  +{formatCurrency(treasuries.reduce((s, t) => {
                    const inc = t.dailyBalance?.dailyIncome ?? (t.transactions ?? [])
                      .filter((tx) => ['SALES_INCOME', 'INSTALLMENT_PAYMENT', 'MANUAL_INCOME'].includes(tx.type))
                      .reduce((a, tx) => a + tx.amount, 0)
                    return s + inc
                  }, 0))}
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground text-xs">{t('Total Expense')}</p>
                <p className="font-semibold text-red-500">
                  -{formatCurrency(treasuries.reduce((s, t) => {
                    const exp = t.dailyBalance?.dailyExpense ?? (t.transactions ?? [])
                      .filter((tx) => ['SUPPLIER_PAYMENT', 'MANUAL_EXPENSE', 'RETURN_REFUND'].includes(tx.type))
                      .reduce((a, tx) => a + tx.amount, 0)
                    return s + exp
                  }, 0))}
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground text-xs">{t('Current Balance')}</p>
                <p className="font-bold text-lg">
                  {formatCurrency(newestTreasury?.closingBalance ?? 0)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
