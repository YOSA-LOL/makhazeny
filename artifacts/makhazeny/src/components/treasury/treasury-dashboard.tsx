import { apiFetch } from '@/lib/api'
import { useState, useEffect, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatCard, StatCardSkeleton } from '@/components/ui/stat-card'
import { DollarSign, TrendingDown, TrendingUp, Wallet, Lock, LockOpen, RefreshCw, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/i18n'
import { useSelectedDate } from '@/lib/date-context'
import { TreasuryCashActions } from '@/components/treasury/treasury-cash-actions'

interface TreasuryData {
  openingBalance: number
  income: number
  expenses: number
  profit: number
  closingBalance: number
  transactionCount: number
  isClosed: boolean
  closedBySystem: boolean
  closedAt: string | null
  treasuryId: string
}

function isPast2359() {
  const n = new Date()
  return n.getHours() === 23 && n.getMinutes() >= 59
}

interface TreasuryDashboardProps {
  refreshKey?: number
  onTreasuryIdChange?: (treasuryId: string | undefined) => void
  onUpdated?: () => void
}

export function TreasuryDashboard({ refreshKey = 0, onTreasuryIdChange, onUpdated }: TreasuryDashboardProps) {
  const [treasury, setTreasury] = useState<TreasuryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const { t, te, formatCurrency, formatDate, formatTime } = useLanguage()
  const { selectedDate, isToday, selectedDateStr } = useSelectedDate()
  const autoClosedRef = useRef(false)
  const midnightLockedRef = useRef(false)

  // Refresh clock every 30s so the Reopen button hides at 11:59 PM live
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    autoClosedRef.current = false
    midnightLockedRef.current = false
    fetchTreasuryForDate()
  }, [selectedDateStr, refreshKey])

  // Auto-close at 11:59 PM if treasury is still open
  useEffect(() => {
    if (!isToday) return

    const tick = () => {
      const n = new Date()
      const isPM2359 = n.getHours() === 23 && n.getMinutes() >= 59

      if (isPM2359 && !autoClosedRef.current) {
        setTreasury((current) => {
          if (current && !current.isClosed) {
            autoClosedRef.current = true
            performClose(current, true)
          }
          return current
        })
      }

      // Midnight lock: when a new calendar day begins, permanently lock any manually-closed treasury
      if (n.getHours() === 0 && n.getMinutes() === 0 && !midnightLockedRef.current) {
        midnightLockedRef.current = true
        setTreasury((current) => {
          if (current && current.isClosed && !current.closedBySystem) {
            // Force system-close flag on previous day's manually-closed treasury
            performClose(current, true)
          }
          return current
        })
      }
    }

    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [isToday])

  async function fetchTreasuryForDate() {
    setLoading(true)
    try {
      const response = await apiFetch('/api/treasury', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-by-date', date: selectedDateStr }),
      })
      const result = await response.json()
      if (result.success && result.data?.summary) {
        setTreasury({
          openingBalance: Number(result.data.summary.openingBalance),
          income: Number(result.data.summary.income),
          expenses: Number(result.data.summary.expenses),
          profit: Number(result.data.summary.profit),
          closingBalance: Number(result.data.summary.closingBalance),
          transactionCount: result.data.summary.transactionCount,
          isClosed: result.data.summary.isClosed ?? false,
          closedBySystem: result.data.summary.closedBySystem ?? false,
          closedAt: result.data.summary.closedAt ?? null,
          treasuryId: result.data.treasury.id,
        })
        onTreasuryIdChange?.(result.data.treasury.id)
      } else {
        setTreasury(null)
        onTreasuryIdChange?.(undefined)
      }
    } catch {
      toast.error(t('Failed to load treasury data'))
    } finally {
      setLoading(false)
    }
  }

  async function performClose(current: TreasuryData, closedBySystem: boolean) {
    try {
      const response = await apiFetch('/api/treasury', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close-day', treasuryId: current.treasuryId, closedBySystem }),
      })
      const result = await response.json()
      if (result.success) {
        if (closedBySystem) {
          toast.info(t('Treasury was automatically closed at 11:59 PM.'))
        }
        await fetchTreasuryForDate()
      }
    } catch {
      // silent
    }
  }

  async function handleCloseDay() {
    if (!treasury) return
    setClosing(true)
    try {
      const response = await apiFetch('/api/treasury', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close-day', treasuryId: treasury.treasuryId, closedBySystem: false }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('Day closed successfully. Balance will carry over to tomorrow.'))
        await fetchTreasuryForDate()
      } else {
        toast.error(result.error ? te(result.error) : t('Failed to close day'))
      }
    } catch {
      toast.error(t('Failed to close day'))
    } finally {
      setClosing(false)
    }
  }

  async function handleReopenDay() {
    if (!treasury) return
    setClosing(true)
    try {
      const response = await apiFetch('/api/treasury', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reopen-day', treasuryId: treasury.treasuryId }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('Day reopened successfully.'))
        await fetchTreasuryForDate()
      } else {
        toast.error(result.error ? te(result.error) : t('Failed to reopen day'))
      }
    } catch {
      toast.error(t('Failed to reopen day'))
    } finally {
      setClosing(false)
    }
  }

  const dateLabel = isToday
    ? t('Today')
    : formatDate(selectedDate, { day: 'numeric', month: 'long', year: 'numeric' })

  // Reopen is allowed only if: manual close + today + before 11:59 PM
  const canReopen =
    isToday &&
    treasury?.isClosed === true &&
    treasury?.closedBySystem === false &&
    !isPast2359()

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded-md bg-muted animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  if (!treasury) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
        {t('No treasury record found for')} {dateLabel}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {treasury.isClosed ? (
            <Badge
              variant="destructive"
              className="gap-1 text-sm px-3 py-1"
            >
              {treasury.closedBySystem ? <ShieldAlert className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              {treasury.closedBySystem ? t('Auto Closed') : t('Day Closed')}
            </Badge>
          ) : (
            <Badge variant="success" className="gap-1 text-sm px-3 py-1">
              <LockOpen className="h-3.5 w-3.5" />
              {t('Day Open')}
            </Badge>
          )}
          {treasury.isClosed && treasury.closedAt && (
            <span className="text-xs text-muted-foreground">
              {t('Closed at')} {formatTime(treasury.closedAt)}
            </span>
          )}
          <span className="text-xs text-muted-foreground font-medium">— {dateLabel}</span>
        </div>

        <div className="flex items-center gap-2">
          {canReopen && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReopenDay}
              disabled={closing}
              className="gap-2 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950"
            >
              <RefreshCw className="h-4 w-4" />
              {closing ? t('Reopening...') : t('Reopen Day')}
            </Button>
          )}

          {isToday && !treasury.isClosed && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCloseDay}
              disabled={closing}
              className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950"
            >
              <Lock className="h-4 w-4" />
              {closing ? t('Closing...') : t('Close Day & Carry Over Balance')}
            </Button>
          )}
        </div>
      </div>

      {!treasury.isClosed && (
        <TreasuryCashActions
          treasuryId={treasury.treasuryId}
          disabled={!isToday}
          onSuccess={() => {
            fetchTreasuryForDate()
            onUpdated?.()
          }}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard
          label={t('Current Balance')}
          value={formatCurrency(treasury.closingBalance)}
          subtitle={treasury.isClosed ? t('Final closing balance') : t('Closing balance')}
          icon={Wallet}
          tone="default"
        />
        <StatCard
          label={t('Opening Balance')}
          value={formatCurrency(treasury.openingBalance)}
          subtitle={t('Carried over from previous day')}
          icon={TrendingUp}
          tone="default"
        />
        <StatCard label={t('Income')} value={formatCurrency(treasury.income)}
          subtitle={t('Sales + Installments')} icon={TrendingUp} tone="success" />
        <StatCard label={t('Expenses')} value={formatCurrency(treasury.expenses)}
          subtitle={t('Payments + Operational')} icon={TrendingDown} tone="danger" />
        <StatCard label={t('Profit')} value={formatCurrency(treasury.profit)}
          subtitle={t('Income - Expenses')} icon={DollarSign}
          tone={treasury.profit >= 0 ? 'default' : 'danger'} />
      </div>

      {treasury.isClosed && treasury.closedBySystem && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 px-4 py-3 text-sm text-red-800 dark:text-red-300 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>
            {t('This day was automatically closed by the system and cannot be reopened.')}{' '}
            <strong>{formatCurrency(treasury.closingBalance)}</strong>{' '}
            {t('will automatically carry over as the opening balance for the next day.')}
          </span>
        </div>
      )}

      {treasury.isClosed && !treasury.closedBySystem && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <Lock className="h-4 w-4 shrink-0" />
          <span>
            {t('This day is closed.')}{' '}
            {canReopen && <span>{t('You can reopen it until 11:59 PM.')}{' '}</span>}
            <strong>{formatCurrency(treasury.closingBalance)}</strong>{' '}
            {t('will automatically carry over as the opening balance for the next day.')}
          </span>
        </div>
      )}
    </div>
  )
}
