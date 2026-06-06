import { apiFetch } from '@/lib/api'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CheckCircle, XCircle, Clock, RotateCcw, CalendarDays } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n'
import { useSelectedDate } from '@/lib/date-context'
import { RETURN_REASONS } from '@/lib/constants'

interface ReturnItem { id: string; productId: string; quantity: number; returnAmount: number }
interface Return {
  id: string; returnNumber: string
  sale: { saleNumber: string; customer: { name: string } }
  totalReturnAmount: number; reason: string; status: string
  items: ReturnItem[]; createdAt: string
}

const statusStyle: Record<string, string> = {
  PENDING:   'text-warning bg-warning/10 border-warning/20',
  APPROVED:  'text-success bg-success/10 border-success/20',
  PROCESSED: 'text-success bg-success/10 border-success/20',
  REJECTED:  'text-destructive bg-destructive/10 border-destructive/20',
}

const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'APPROVED' || status === 'PROCESSED') return <CheckCircle className="h-3.5 w-3.5" />
  if (status === 'REJECTED') return <XCircle className="h-3.5 w-3.5" />
  return <Clock className="h-3.5 w-3.5" />
}

function TableSkeleton() {
  return (
    <div className="space-y-2 py-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 px-2">
          <div className="h-4 bg-muted rounded-full w-24 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
          <div className="h-4 bg-muted rounded-full flex-1 animate-pulse" style={{ animationDelay: `${i * 60 + 30}ms` }} />
          <div className="h-4 bg-muted rounded-full flex-1 animate-pulse" style={{ animationDelay: `${i * 60 + 60}ms` }} />
          <div className="h-4 bg-muted rounded-full w-20 animate-pulse" style={{ animationDelay: `${i * 60 + 90}ms` }} />
        </div>
      ))}
    </div>
  )
}

export function ReturnsList() {
  const [returns, setReturns] = useState<Return[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10
  const { t, te, formatCurrency, formatDate } = useLanguage()
  const { selectedDate, selectedDateStr, isToday } = useSelectedDate()
  const reasonLabel = (reason: string) =>
    t(RETURN_REASONS[reason as keyof typeof RETURN_REASONS] ?? reason)

  useEffect(() => { setPage(1) }, [selectedDateStr])
  useEffect(() => { fetchReturns() }, [page, selectedDateStr])

  async function fetchReturns() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), date: selectedDateStr })
      const response = await apiFetch(`/api/returns?${params}`)
      const result = await response.json()
      if (result.success) { setReturns(result.data); setTotal(result.pagination.total) }
      else toast.error(t('Failed to fetch returns'))
    } catch { toast.error(t('Failed to fetch returns')) }
    finally { setLoading(false) }
  }

  async function handleApprove(returnId: string) {
    try {
      const response = await apiFetch(`/api/returns/${returnId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      })
      const result = await response.json()
      if (result.success) { toast.success(t('Return approved')); fetchReturns() }
      else toast.error(result.error ? te(result.error) : t('Failed to approve'))
    } catch { toast.error(t('Failed to approve return')) }
  }

  async function handleReject(returnId: string) {
    try {
      const response = await apiFetch(`/api/returns/${returnId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED' }),
      })
      const result = await response.json()
      if (result.success) { toast.success(t('Return rejected')); fetchReturns() }
      else toast.error(t('Failed to reject return'))
    } catch { toast.error(t('Failed to reject return')) }
  }

  const pages = Math.ceil(total / limit)

  const dayLabel = isToday
    ? t('Today')
    : formatDate(selectedDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-base">{t('Sales Returns')}</CardTitle>
          <div className="flex items-center gap-1.5 mt-0.5">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            <p className="text-xs text-primary font-medium">{dayLabel}</p>
            {!loading && (
              <span className="text-xs text-muted-foreground">· {total} {t('records')}</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 pb-4">
        {loading ? (
          <div className="px-4"><TableSkeleton /></div>
        ) : returns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="rounded-full bg-muted p-4 mb-3"><RotateCcw className="h-6 w-6 text-muted-foreground" /></div>
            <p className="text-sm font-medium text-foreground">{t('No returns yet')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('Returns will appear here once processed.')}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="ps-4 font-semibold text-xs uppercase tracking-wide">{t('Return #')}</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wide">{t('Sale #')}</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wide">{t('Customer')}</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wide">{t('Reason')}</TableHead>
                    <TableHead className="text-end font-semibold text-xs uppercase tracking-wide">{t('Items')}</TableHead>
                    <TableHead className="text-end font-semibold text-xs uppercase tracking-wide">{t('Return Amount')}</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wide">{t('Status')}</TableHead>
                    <TableHead className="text-end pe-4 font-semibold text-xs uppercase tracking-wide">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returns.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="ps-4">
                        <code className="text-xs font-mono font-semibold">{r.returnNumber}</code>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.sale.saleNumber}</TableCell>
                      <TableCell className="text-sm font-medium">{r.sale.customer.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">{reasonLabel(r.reason)}</TableCell>
                      <TableCell className="text-end text-sm">{r.items.length}</TableCell>
                      <TableCell className="text-end text-sm font-semibold tabular-nums">{formatCurrency(r.totalReturnAmount)}</TableCell>
                      <TableCell>
                        <span className={cn('inline-flex items-center gap-1 text-xs font-semibold border rounded-full px-2 py-0.5',
                          statusStyle[r.status] ?? 'bg-muted text-muted-foreground border-border')}>
                          <StatusIcon status={r.status} /> {t(r.status)}
                        </span>
                      </TableCell>
                      <TableCell className="text-end pe-4">
                        {r.status === 'PENDING' && (
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" className="h-7 text-xs" onClick={() => handleApprove(r.id)}>{t('Approve')}</Button>
                            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleReject(r.id)}>{t('Reject')}</Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
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
                  {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map((p) => (
                    <Button key={p} variant={p === page ? 'default' : 'outline'}
                      size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setPage(p)}>{p}</Button>
                  ))}
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
