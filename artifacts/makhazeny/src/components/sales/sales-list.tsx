import { apiFetch } from '@/lib/api'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Printer, Search, ShoppingCart, Trash2, RotateCcw, CalendarDays } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n'
import { ReturnFromSaleDialog } from './return-from-sale-dialog'
import { useSelectedDate } from '@/lib/date-context'

export interface SaleItem {
  id: string
  productId: string
  quantity: number
  price: number
  total: number
  product: {
    id: string
    name: string
    sku?: string
    supplier?: { id: string; name: string } | null
  }
}

export interface Sale {
  id: string
  saleNumber: string
  createdAt: string
  totalAmount: number
  paidAmount: number
  status: string
  paymentMethod: string
  notes?: string | null
  customer: { id: string; name: string; phone?: string | null; email?: string | null }
  items: SaleItem[]
}

interface SalesListProps {
  onPrintReceipt?: (sale: Sale) => void
}

const fmt = (v: number | string) => {
  const n = typeof v === 'string' ? parseFloat(v) : v
  return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(n)
}

const statusStyle: Record<string, string> = {
  PAID:    'text-success bg-success/10 border-success/20',
  PARTIAL: 'text-warning bg-warning/10 border-warning/20',
  UNPAID:  'text-destructive bg-destructive/10 border-destructive/20',
  PENDING: 'text-destructive bg-destructive/10 border-destructive/20',
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash', CARD: 'Card', CHECK: 'Check', TRANSFER: 'Bank Transfer',
  INSTALLMENT: 'Installment', CREDIT: 'Credit', OTHER: 'Other',
}

function TableSkeleton() {
  return (
    <div className="space-y-2 py-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 px-2">
          <div className="h-4 bg-muted rounded-full w-28 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
          <div className="h-4 bg-muted rounded-full flex-1 animate-pulse" style={{ animationDelay: `${i * 60 + 30}ms` }} />
          <div className="h-4 bg-muted rounded-full w-20 animate-pulse" style={{ animationDelay: `${i * 60 + 60}ms` }} />
          <div className="h-4 bg-muted rounded-full w-16 animate-pulse" style={{ animationDelay: `${i * 60 + 90}ms` }} />
        </div>
      ))}
    </div>
  )
}

export function SalesList({ onPrintReceipt }: SalesListProps) {
  const [sales, setSales] = useState<Sale[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [fetchingId, setFetchingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [returnSale, setReturnSale] = useState<Sale | null>(null)
  const limit = 10
  const { t } = useLanguage()
  const { selectedDate, selectedDateStr, isToday } = useSelectedDate()

  useEffect(() => { setPage(1) }, [selectedDateStr])
  useEffect(() => { fetchSales() }, [search, page, selectedDateStr])

  async function fetchSales() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ search, page: String(page), limit: String(limit), date: selectedDateStr })
      const response = await apiFetch(`/api/sales?${params}`)
      const result = await response.json()
      if (result.success) { setSales(result.data); setTotal(result.pagination.total) }
      else toast.error(result.error || 'Failed to fetch sales')
    } catch { toast.error('Failed to fetch sales') }
    finally { setLoading(false) }
  }

  async function handlePrint(saleId: string) {
    setFetchingId(saleId)
    try {
      const response = await apiFetch(`/api/sales/${saleId}`)
      const result = await response.json()
      if (result.success && result.data) {
        onPrintReceipt?.(result.data as Sale)
      } else {
        toast.error(result.error || 'Could not load sale details')
      }
    } catch {
      toast.error('Failed to load sale')
    } finally {
      setFetchingId(null)
    }
  }

  async function handleDelete(saleId: string) {
    if (!confirm('Delete this sale? This cannot be undone.')) return
    try {
      const response = await apiFetch(`/api/sales/${saleId}`, { method: 'DELETE' })
      const result = await response.json()
      if (result.success) { toast.success('Sale deleted'); fetchSales() }
      else toast.error(result.error || 'Failed to delete')
    } catch { toast.error('Failed to delete sale') }
  }

  const pages = Math.ceil(total / limit)

  const dayLabel = isToday
    ? 'Today'
    : selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-base">{t('Sales Transactions')}</CardTitle>
          <div className="flex items-center gap-1.5 mt-0.5">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            <p className="text-xs text-primary font-medium">{dayLabel}</p>
            {!loading && (
              <span className="text-xs text-muted-foreground">· {total} {t('sales total')}</span>
            )}
          </div>
        </div>
        <div className="relative w-64">
          <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('Search sales...')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="ps-8 h-9"
          />
        </div>
      </CardHeader>

      <CardContent className="p-0 pb-4">
        {loading ? (
          <div className="px-4"><TableSkeleton /></div>
        ) : sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="rounded-full bg-muted p-4 mb-3">
              <ShoppingCart className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">{t('No sales found')}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {search
                ? t('Try a different search term.')
                : `No sales recorded for ${dayLabel}.`}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="ps-4 font-semibold text-xs uppercase tracking-wide">{t('Sale #')}</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wide">{t('Date')}</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wide">{t('Customer')}</TableHead>
                    <TableHead className="text-right font-semibold text-xs uppercase tracking-wide">{t('Total')}</TableHead>
                    <TableHead className="text-right font-semibold text-xs uppercase tracking-wide">{t('Paid')}</TableHead>
                    <TableHead className="text-right font-semibold text-xs uppercase tracking-wide">{t('Remaining')}</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wide">{t('Status')}</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wide">{t('Method')}</TableHead>
                    <TableHead className="text-right pe-4 font-semibold text-xs uppercase tracking-wide">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => {
                    const remaining = Math.max(0, Number(sale.totalAmount) - Number(sale.paidAmount))
                    return (
                      <TableRow key={sale.id} className="group">
                        <TableCell className="ps-4">
                          <code className="text-xs font-mono font-semibold">{sale.saleNumber}</code>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(sale.createdAt).toLocaleTimeString('en-US', {
                            hour: '2-digit', minute: '2-digit', hour12: true,
                          })}
                        </TableCell>
                        <TableCell className="text-sm font-medium">{sale.customer?.name || '—'}</TableCell>
                        <TableCell className="text-right text-sm font-bold tabular-nums">{fmt(sale.totalAmount)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums text-green-600 font-semibold">{fmt(sale.paidAmount)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          <span className={cn('font-semibold', remaining > 0 ? 'text-destructive' : 'text-muted-foreground')}>
                            {fmt(remaining)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            'inline-flex text-xs font-semibold border rounded-full px-2 py-0.5',
                            statusStyle[sale.status] ?? 'text-muted-foreground bg-muted border-border',
                          )}>
                            {sale.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}
                        </TableCell>
                        <TableCell className="text-right pe-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-warning"
                              onClick={() => setReturnSale(sale)}
                              title={t('Return')}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-primary"
                              onClick={() => handlePrint(sale.id)}
                              disabled={fetchingId === sale.id}
                              title="Print / Reprint Receipt"
                            >
                              <Printer className={cn('h-3.5 w-3.5', fetchingId === sale.id && 'animate-pulse')} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(sale.id)}
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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
                    onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
                    {t('← Prev')}
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs"
                    onClick={() => setPage(Math.min(pages, page + 1))} disabled={page === pages}>
                    {t('Next →')}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      <ReturnFromSaleDialog
        sale={returnSale}
        open={returnSale !== null}
        onClose={() => setReturnSale(null)}
        onSuccess={fetchSales}
      />
    </Card>
  )
}
