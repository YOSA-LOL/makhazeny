import { apiFetch } from '@/lib/api'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Banknote } from 'lucide-react'
import { toast } from 'sonner'
import { isIncomeTransaction } from '@/lib/status-styles'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n'
import { useSelectedDate } from '@/lib/date-context'

interface Transaction {
  id: string; type: string; amount: number
  description: string; reference?: string; createdAt: string
}
interface TreasuryTransactionsProps {
  treasuryId?: string
  limit?: number
}

const fmt = (v: number | string) => {
  const n = typeof v === 'string' ? parseFloat(v) : v
  return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(n)
}

const formatTime = (dateStr: string) =>
  new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })

const typeLabel: Record<string, string> = {
  SALES_INCOME: 'Sales Income', INSTALLMENT_PAYMENT: 'Installment',
  MANUAL_INCOME: 'Manual Income', SUPPLIER_PAYMENT: 'Supplier Payment',
  MANUAL_EXPENSE: 'Manual Expense', RETURN_REFUND: 'Return Refund',
  BALANCE_CARRYOVER: 'Balance Carryover',
}
const typeBadgeStyle: Record<string, string> = {
  SALES_INCOME:        'bg-success/10 text-success border-success/20',
  INSTALLMENT_PAYMENT: 'bg-info/10 text-info border-info/20',
  MANUAL_INCOME:       'bg-success/10 text-success border-success/20',
  SUPPLIER_PAYMENT:    'bg-warning/10 text-warning border-warning/20',
  MANUAL_EXPENSE:      'bg-destructive/10 text-destructive border-destructive/20',
  RETURN_REFUND:       'bg-warning/10 text-warning border-warning/20',
  BALANCE_CARRYOVER:   'bg-blue-500/10 text-blue-600 border-blue-500/20',
}

function TableSkeleton() {
  return (
    <div className="space-y-2 py-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-4 px-2">
          <div className="h-4 bg-muted rounded-full w-16 animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
          <div className="h-4 bg-muted rounded-full w-28 animate-pulse" style={{ animationDelay: `${i * 50 + 25}ms` }} />
          <div className="h-4 bg-muted rounded-full flex-1 animate-pulse" style={{ animationDelay: `${i * 50 + 50}ms` }} />
          <div className="h-4 bg-muted rounded-full w-20 animate-pulse" style={{ animationDelay: `${i * 50 + 75}ms` }} />
        </div>
      ))}
    </div>
  )
}

export function TreasuryTransactions({ treasuryId, limit = 20 }: TreasuryTransactionsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [typeFilter, setTypeFilter] = useState('all')
  const { t } = useLanguage()
  const { selectedDateStr } = useSelectedDate()

  useEffect(() => { setPage(1) }, [selectedDateStr])
  useEffect(() => { fetchTransactions() }, [page, typeFilter, selectedDateStr, treasuryId])

  async function fetchTransactions() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (treasuryId) {
        params.append('treasuryId', treasuryId)
      } else {
        // Filter by selected date range
        params.append('startDate', `${selectedDateStr}T00:00:00.000Z`)
        params.append('endDate', `${selectedDateStr}T23:59:59.999Z`)
      }
      if (typeFilter && typeFilter !== 'all') params.append('type', typeFilter)
      const response = await apiFetch(`/api/treasury/transactions?${params}`)
      const result = await response.json()
      if (result.success) { setTransactions(result.data); setTotal(result.pagination.total) }
      else toast.error('Failed to fetch transactions')
    } catch { toast.error('Failed to fetch transactions') }
    finally { setLoading(false) }
  }

  const pages = Math.ceil(total / limit)

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-base">{t('Transactions')}</CardTitle>
          {!loading && <p className="text-xs text-muted-foreground mt-0.5">{total} {t('transactions')}</p>}
        </div>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue placeholder={t('All Types')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All Types')}</SelectItem>
            <SelectItem value="SALES_INCOME">{t('Sales Income')}</SelectItem>
            <SelectItem value="INSTALLMENT_PAYMENT">{t('Installments')}</SelectItem>
            <SelectItem value="MANUAL_INCOME">{t('Manual Income')}</SelectItem>
            <SelectItem value="SUPPLIER_PAYMENT">{t('Supplier Payment')}</SelectItem>
            <SelectItem value="MANUAL_EXPENSE">{t('Manual Expense')}</SelectItem>
            <SelectItem value="RETURN_REFUND">{t('Returns')}</SelectItem>
            <SelectItem value="BALANCE_CARRYOVER">{t('Balance Carryover')}</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="p-0 pb-4">
        {loading ? (
          <div className="px-4"><TableSkeleton /></div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="rounded-full bg-muted p-4 mb-3"><Banknote className="h-6 w-6 text-muted-foreground" /></div>
            <p className="text-sm font-medium text-foreground">{t('No transactions found')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('Try changing the filter or adding a transaction.')}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="ps-4 font-semibold text-xs uppercase tracking-wide">{t('Time')}</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wide">{t('Type')}</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wide">{t('Description')}</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wide">{t('Reference')}</TableHead>
                    <TableHead className="text-end pe-4 font-semibold text-xs uppercase tracking-wide">{t('Amount')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => {
                    const income = isIncomeTransaction(tx.type) || tx.type === 'BALANCE_CARRYOVER'
                    return (
                      <TableRow key={tx.id} className="group">
                        <TableCell className="ps-4 text-xs text-muted-foreground tabular-nums">{formatTime(tx.createdAt)}</TableCell>
                        <TableCell>
                          <span className={cn('inline-flex text-xs font-medium border rounded-full px-2 py-0.5',
                            typeBadgeStyle[tx.type] ?? 'bg-muted text-muted-foreground border-border')}>
                            {t(typeLabel[tx.type] ?? tx.type)}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm max-w-xs truncate">{tx.description}</TableCell>
                        <TableCell>
                          {tx.reference ? (
                            <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{tx.reference}</code>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-end pe-4">
                          <span className={cn('text-sm font-semibold tabular-nums', income ? 'text-success' : 'text-destructive')}>
                            {income ? '+' : '−'}{fmt(tx.amount)}
                          </span>
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
