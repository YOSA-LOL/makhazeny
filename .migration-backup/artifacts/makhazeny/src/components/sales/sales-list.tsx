import { apiFetch } from '@/lib/api'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Eye, Search, ShoppingCart, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n'

interface SalesItem {
  id: string; productId: string; product: { name: string }; quantity: number; price: number
}
interface Sale {
  id: string; saleNumber: string; customer: { name: string }
  totalAmount: number; paidAmount: number; status: string
  paymentMethod: string; items: SalesItem[]; createdAt: string
}
interface SalesListProps {
  onView?: (sale: Sale) => void
  onDelete?: (saleId: string) => void
}

const fmt = (v: number | string) => {
  const n = typeof v === 'string' ? parseFloat(v) : v
  return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(n)
}

const statusStyle: Record<string, string> = {
  PAID:    'text-success bg-success/10 border-success/20',
  PARTIAL: 'text-warning bg-warning/10 border-warning/20',
  UNPAID:  'text-destructive bg-destructive/10 border-destructive/20',
}
const methodStyle: Record<string, string> = {
  CASH:         'text-success bg-success/10 border-success/20',
  CREDIT:       'text-info bg-info/10 border-info/20',
  BANK_TRANSFER:'text-primary bg-primary/10 border-primary/20',
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

export function SalesList({ onView, onDelete }: SalesListProps) {
  const [sales, setSales] = useState<Sale[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10
  const { t } = useLanguage()

  useEffect(() => { fetchSales() }, [search, page])

  async function fetchSales() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ search, page: String(page), limit: String(limit) })
      const response = await apiFetch(`/api/sales?${params}`)
      const result = await response.json()
      if (result.success) { setSales(result.data); setTotal(result.pagination.total) }
      else toast.error(result.error || 'Failed to fetch sales')
    } catch { toast.error('Failed to fetch sales') }
    finally { setLoading(false) }
  }

  async function handleDelete(saleId: string) {
    if (!confirm('Delete this sale?')) return
    try {
      const response = await apiFetch(`/api/sales/${saleId}`, { method: 'DELETE' })
      const result = await response.json()
      if (result.success) { toast.success('Sale deleted'); fetchSales(); onDelete?.(saleId) }
      else toast.error(result.error || 'Failed to delete')
    } catch { toast.error('Failed to delete sale') }
  }

  const pages = Math.ceil(total / limit)

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-base">{t('Sales Transactions')}</CardTitle>
          {!loading && <p className="text-xs text-muted-foreground mt-0.5">{total} {t('sales total')}</p>}
        </div>
        <div className="relative w-64">
          <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('Search sales...')} value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="ps-8 h-9" />
        </div>
      </CardHeader>
      <CardContent className="p-0 pb-4">
        {loading ? (
          <div className="px-4"><TableSkeleton /></div>
        ) : sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="rounded-full bg-muted p-4 mb-3"><ShoppingCart className="h-6 w-6 text-muted-foreground" /></div>
            <p className="text-sm font-medium text-foreground">{t('No sales found')}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {search ? t('Try a different search term.') : t('Create your first sale using the POS.')}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="ps-4 font-semibold text-xs uppercase tracking-wide">{t('Sale #')}</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wide">{t('Customer')}</TableHead>
                    <TableHead className="text-end font-semibold text-xs uppercase tracking-wide">{t('Total')}</TableHead>
                    <TableHead className="text-end font-semibold text-xs uppercase tracking-wide">{t('Paid')}</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wide">{t('Status')}</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wide">{t('Method')}</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wide">{t('Date')}</TableHead>
                    <TableHead className="text-end pe-4 font-semibold text-xs uppercase tracking-wide">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id} className="group">
                      <TableCell className="ps-4">
                        <code className="text-xs font-mono font-semibold text-foreground">{sale.saleNumber}</code>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{sale.customer?.name || '—'}</TableCell>
                      <TableCell className="text-end text-sm font-semibold tabular-nums">{fmt(sale.totalAmount)}</TableCell>
                      <TableCell className="text-end text-sm tabular-nums text-muted-foreground">{fmt(sale.paidAmount)}</TableCell>
                      <TableCell>
                        <span className={cn('inline-flex text-xs font-semibold border rounded-full px-2 py-0.5',
                          statusStyle[sale.status] ?? 'text-muted-foreground bg-muted border-border')}>
                          {sale.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={cn('inline-flex text-xs font-medium border rounded-full px-2 py-0.5',
                          methodStyle[sale.paymentMethod] ?? 'text-muted-foreground bg-muted border-border')}>
                          {sale.paymentMethod.replace('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(sale.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-end pe-4">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => onView?.(sale)} title="View"><Eye className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(sale.id)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
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
