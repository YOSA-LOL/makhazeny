import { apiFetch } from '@/lib/api'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Edit2, Search, Trash2, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n'

interface Supplier {
  id: string
  name: string
  phone?: string
  email?: string
  city?: string
  balance: number
}

interface SupplierListProps {
  onEdit?: (supplier: Supplier) => void
  onDelete?: (supplierId: string) => void
}

const fmt = (v: number) =>
  new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(v)

function TableSkeleton() {
  return (
    <div className="space-y-2 py-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-4 px-2">
          <div className="h-4 bg-muted rounded-full flex-[3] animate-pulse" style={{ animationDelay: `${i * 70}ms` }} />
          <div className="h-4 bg-muted rounded-full flex-[2] animate-pulse" style={{ animationDelay: `${i * 70 + 35}ms` }} />
          <div className="h-4 bg-muted rounded-full flex-1 animate-pulse" style={{ animationDelay: `${i * 70 + 70}ms` }} />
          <div className="h-4 bg-muted rounded-full w-20 animate-pulse" style={{ animationDelay: `${i * 70 + 105}ms` }} />
        </div>
      ))}
    </div>
  )
}

export function SupplierList({ onEdit, onDelete }: SupplierListProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10
  const { t } = useLanguage()

  useEffect(() => { fetchSuppliers() }, [search, page])

  async function fetchSuppliers() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ search, page: String(page), limit: String(limit) })
      const response = await apiFetch(`/api/suppliers?${params}`)
      const result = await response.json()
      if (result.success) {
        setSuppliers(result.data)
        setTotal(result.pagination.total)
      } else {
        toast.error(result.error || 'Failed to fetch suppliers')
      }
    } catch {
      toast.error('Failed to fetch suppliers')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(supplierId: string) {
    if (!confirm('Delete this supplier?')) return
    try {
      const response = await apiFetch(`/api/suppliers/${supplierId}`, { method: 'DELETE' })
      const result = await response.json()
      if (result.success) {
        toast.success('Supplier deleted')
        fetchSuppliers()
        onDelete?.(supplierId)
      } else {
        toast.error(result.error || 'Failed to delete')
      }
    } catch {
      toast.error('Failed to delete supplier')
    }
  }

  const pages = Math.ceil(total / limit)

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-base">{t('Suppliers')}</CardTitle>
          {!loading && <p className="text-xs text-muted-foreground mt-0.5">{total} {t('suppliers total')}</p>}
        </div>
        <div className="relative w-64">
          <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('Search suppliers...')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="ps-8 h-9"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0 pb-4">
        {loading ? (
          <div className="px-4"><TableSkeleton /></div>
        ) : suppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="rounded-full bg-muted p-4 mb-3">
              <Truck className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">{t('No suppliers found')}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {search ? t('Try a different search term.') : t('Add your first supplier to get started.')}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="ps-4 font-semibold text-xs uppercase tracking-wide">{t('Supplier')}</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wide">{t('Phone')}</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wide">{t('City')}</TableHead>
                    <TableHead className="text-end font-semibold text-xs uppercase tracking-wide">{t('Balance')}</TableHead>
                    <TableHead className="text-end pe-4 font-semibold text-xs uppercase tracking-wide">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((supplier) => (
                    <TableRow key={supplier.id} className="group">
                      <TableCell className="ps-4">
                        <div>
                          <p className="font-medium text-sm">{supplier.name}</p>
                          {supplier.email && <p className="text-xs text-muted-foreground">{supplier.email}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{supplier.phone || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{supplier.city || '—'}</TableCell>
                      <TableCell className="text-end">
                        <span className={cn(
                          'text-sm font-semibold tabular-nums',
                          Number(supplier.balance) > 0 ? 'text-warning' : 'text-success'
                        )}>
                          {fmt(Number(supplier.balance))}
                        </span>
                      </TableCell>
                      <TableCell className="text-end pe-4">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => onEdit?.(supplier)} title={t('Edit')}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(supplier.id)} title={t('Delete')}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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
                  {Array.from({ length: Math.min(pages, 7) }, (_, i) => i + 1).map((p) => (
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
