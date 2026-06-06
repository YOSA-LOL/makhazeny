import { apiFetch } from '@/lib/api'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertCircle, CreditCard, Receipt, CalendarDays } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n'
import { useSelectedDate } from '@/lib/date-context'

interface Debt {
  id: string
  customer: { id: string; name: string }
  originalAmount: number
  remainingAmount: number
  status: string
  dueDate?: string
  createdAt: string
  payments: Array<{ id: string }>
}

interface DebtsListProps {
  onPayment?: (debt: Debt) => void
}

const statusStyle: Record<string, string> = {
  ACTIVE:  'text-warning bg-warning/10 border-warning/20',
  PARTIAL: 'text-info bg-info/10 border-info/20',
  PAID:    'text-success bg-success/10 border-success/20',
}

function TableSkeleton() {
  return (
    <div className="space-y-2 py-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 px-2">
          <div className="h-4 bg-muted rounded-full flex-[2] animate-pulse" style={{ animationDelay: `${i * 70}ms` }} />
          <div className="h-4 bg-muted rounded-full flex-1 animate-pulse" style={{ animationDelay: `${i * 70 + 35}ms` }} />
          <div className="h-4 bg-muted rounded-full flex-1 animate-pulse" style={{ animationDelay: `${i * 70 + 70}ms` }} />
          <div className="h-4 bg-muted rounded-full w-24 animate-pulse" style={{ animationDelay: `${i * 70 + 105}ms` }} />
        </div>
      ))}
    </div>
  )
}

export function DebtsList({ onPayment }: DebtsListProps) {
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('UNPAID')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10
  const { t, formatCurrency, formatDate } = useLanguage()
  const { selectedDate, selectedDateStr, isToday } = useSelectedDate()

  useEffect(() => { setPage(1) }, [selectedDateStr])
  useEffect(() => { fetchDebts() }, [statusFilter, page, selectedDateStr])

  async function fetchDebts() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ status: statusFilter, page: String(page), limit: String(limit), date: selectedDateStr })
      const response = await apiFetch(`/api/debts?${params}`)
      const result = await response.json()
      if (result.success) { setDebts(result.data); setTotal(result.pagination.total) }
      else toast.error(t('Failed to fetch debts'))
    } catch { toast.error(t('Failed to fetch debts')) }
    finally { setLoading(false) }
  }

  const isOverdue = (dueDate?: string) => dueDate ? new Date(dueDate) < new Date() : false
  const pages = Math.ceil(total / limit)

  const filterLabels: Record<string, string> = {
    UNPAID: t('Unpaid'),
    PAID: t('Paid'),
  }

  const filterStyle: Record<string, string> = {
    UNPAID: 'text-warning bg-warning/10 border-warning/20',
    PAID:   'text-success bg-success/10 border-success/20',
  }

  const dayLabel = isToday
    ? t('Today')
    : formatDate(selectedDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-base">{t('Outstanding Debts')}</CardTitle>
          <div className="flex items-center gap-1.5 mt-0.5">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            <p className="text-xs text-primary font-medium">{dayLabel}</p>
            {!loading && (
              <span className="text-xs text-muted-foreground">· {total} {t('records')}</span>
            )}
          </div>
        </div>
        <div className="flex gap-1.5">
          {(['UNPAID', 'PAID'] as const).map((status) => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setPage(1) }}
              className={cn(
                'text-xs font-medium px-3 py-1.5 rounded-full border transition-all',
                statusFilter === status
                  ? filterStyle[status] + ' font-semibold'
                  : 'text-muted-foreground border-border hover:border-foreground/30'
              )}
            >
              {filterLabels[status]}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0 pb-4">
        {loading ? (
          <div className="px-4"><TableSkeleton /></div>
        ) : debts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="rounded-full bg-muted p-4 mb-3"><Receipt className="h-6 w-6 text-muted-foreground" /></div>
            <p className="text-sm font-medium text-foreground">{t('No active debts')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('All clear in this category.')}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="ps-4 font-semibold text-xs uppercase tracking-wide">{t('Customer')}</TableHead>
                    <TableHead className="text-end font-semibold text-xs uppercase tracking-wide">{t('Original')}</TableHead>
                    <TableHead className="text-end font-semibold text-xs uppercase tracking-wide">{t('Remaining')}</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wide">{t('Progress')}</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wide">{t('Due Date')}</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wide">{t('Status')}</TableHead>
                    <TableHead className="text-end pe-4 font-semibold text-xs uppercase tracking-wide">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debts.map((debt) => {
                    const paid = Number(debt.originalAmount) - Number(debt.remainingAmount)
                    const paidPct = Number(debt.originalAmount) > 0
                      ? Math.round((paid / Number(debt.originalAmount)) * 100) : 0
                    const overdue = isOverdue(debt.dueDate)
                    return (
                      <TableRow key={debt.id} className={cn('group', overdue && 'bg-destructive/3')}>
                        <TableCell className="ps-4 font-medium text-sm">{debt.customer.name}</TableCell>
                        <TableCell className="text-end text-sm tabular-nums text-muted-foreground">{formatCurrency(debt.originalAmount)}</TableCell>
                        <TableCell className="text-end">
                          <span className={cn('text-sm font-semibold tabular-nums',
                            Number(debt.remainingAmount) > 0 ? 'text-destructive' : 'text-success')}>
                            {formatCurrency(debt.remainingAmount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="w-28">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-muted-foreground">{paidPct}% {t('paid')}</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className={cn('h-full rounded-full transition-all', paidPct === 100 ? 'bg-success' : 'bg-primary')}
                                style={{ width: `${paidPct}%` }} />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {debt.dueDate ? (
                            <div className="flex items-center gap-1">
                              {overdue && <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                              <span className={cn('text-xs', overdue ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                                {formatDate(debt.dueDate, { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <span className={cn('inline-flex text-xs font-semibold border rounded-full px-2 py-0.5',
                            statusStyle[debt.status] ?? 'text-muted-foreground bg-muted border-border')}>
                            {t(debt.status)}
                          </span>
                        </TableCell>
                        <TableCell className="text-end pe-4">
                          <Button size="sm" className="h-7 text-xs gap-1"
                            onClick={() => onPayment?.(debt)} disabled={debt.status === 'PAID'}>
                            <CreditCard className="h-3 w-3" /> {t('Pay')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            {pages > 1 && (
              <div className="flex items-center justify-between px-4 mt-4">
                <p className="text-xs text-muted-foreground">
                  {(page - 1) * limit + 1}–{Math.min(page * limit, total)} {t('of')} {total}
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs"
                    onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>{t('← Prev')}</Button>
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs"
                    onClick={() => setPage(Math.min(pages, page + 1))} disabled={page === pages}>{t('Next →')}</Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
