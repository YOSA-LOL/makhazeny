import { apiFetch } from '@/lib/api'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertCircle, Edit2, Search, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n'

interface Customer {
  id: string
  name: string
  phone?: string
  email?: string
  city?: string
  creditLimit: number
  totalDebt: number
}

interface CustomerListProps {
  onEdit?: (customer: Customer) => void
  onDelete?: (customerId: string) => void
}

const fmt = (v: number) =>
  new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(v)

function TableSkeleton() {
  return (
    <div className="space-y-2 py-2">
      {Array.from({ length: 5 }).map((_, i) => (
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

export function CustomerList({ onEdit, onDelete }: CustomerListProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10
  const { t } = useLanguage()

  useEffect(() => { fetchCustomers() }, [search, page])

  async function fetchCustomers() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ search, page: String(page), limit: String(limit) })
      const response = await apiFetch(`/api/customers?${params}`)
      const result = await response.json()
      if (result.success) {
        setCustomers(result.data)
        setTotal(result.pagination.total)
      } else {
        toast.error(result.error || 'Failed to fetch customers')
      }
    } catch {
      toast.error('Failed to fetch customers')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(customerId: string) {
    if (!confirm('Delete this customer?')) return
    try {
      const response = await apiFetch(`/api/customers/${customerId}`, { method: 'DELETE' })
      const result = await response.json()
      if (result.success) {
        toast.success('Customer deleted')
        fetchCustomers()
        onDelete?.(customerId)
      } else {
        toast.error(result.error || 'Failed to delete')
      }
    } catch {
      toast.error('Failed to delete customer')
    }
  }

  const isOverdue = (c: Customer) => c.totalDebt > c.creditLimit
  const hasDebt = (c: Customer) => c.totalDebt > 0
  const pages = Math.ceil(total / limit)

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-base">{t('Customers')}</CardTitle>
          {!loading && <p className="text-xs text-muted-foreground mt-0.5">{total} {t('customers total')}</p>}
        </div>
        <div className="relative w-64">
          <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('Search customers...')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="ps-8 h-9"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0 pb-4">
        {loading ? (
          <div className="px-4"><TableSkeleton /></div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="rounded-full bg-muted p-4 mb-3">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">{t('No customers found')}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {search ? t('Try a different search term.') : t('Add your first customer to get started.')}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="ps-4 font-semibold text-xs uppercase tracking-wide">{t('Name')}</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wide">{t('Phone')}</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wide">{t('City')}</TableHead>
                    <TableHead className="text-end font-semibold text-xs uppercase tracking-wide">{t('Outstanding')}</TableHead>
                    <TableHead className="text-end font-semibold text-xs uppercase tracking-wide">{t('Credit Limit')}</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wide">{t('Status')}</TableHead>
                    <TableHead className="text-end pe-4 font-semibold text-xs uppercase tracking-wide">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id} className="group">
                      <TableCell className="ps-4">
                        <div>
                          <p className="font-medium text-sm">{customer.name}</p>
                          {customer.email && <p className="text-xs text-muted-foreground">{customer.email}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{customer.phone || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{customer.city || '—'}</TableCell>
                      <TableCell className="text-end">
                        <span className={cn(
                          'text-sm font-semibold tabular-nums',
                          isOverdue(customer) && 'text-destructive',
                          !isOverdue(customer) && hasDebt(customer) && 'text-warning',
                        )}>
                          {fmt(customer.totalDebt)}
                        </span>
                      </TableCell>
                      <TableCell className="text-end text-sm tabular-nums text-muted-foreground">{fmt(customer.creditLimit)}</TableCell>
                      <TableCell>
                        {isOverdue(customer) ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-full px-2 py-0.5">
                            <AlertCircle className="h-3 w-3" /> {t('Overdue')}
                          </span>
                        ) : hasDebt(customer) ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-warning bg-warning/10 border border-warning/20 rounded-full px-2 py-0.5">
                            {t('Has debt')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-success bg-success/10 border border-success/20 rounded-full px-2 py-0.5">
                            {t('Good standing')}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-end pe-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => onEdit?.(customer)} title={t('Edit')}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(customer.id)} title={t('Delete')}>
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
