'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useEnumLabels } from '@/hooks/use-enum-labels'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Eye, Trash2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { getSaleStatusBadgeVariant } from '@/lib/status-styles'

interface SalesItem {
  id: string
  productId: string
  product: { name: string }
  quantity: number
  price: number
}

interface Sale {
  id: string
  saleNumber: string
  customer: { name: string }
  totalAmount: number
  paidAmount: number
  status: string
  paymentMethod: string
  items: SalesItem[]
  createdAt: string
}

interface SalesListProps {
  onView?: (sale: Sale) => void
  onDelete?: (saleId: string) => void
}

export function SalesList({ onView, onDelete }: SalesListProps) {
  const t = useTranslations('sales')
  const tc = useTranslations('common')
  const enumLabels = useEnumLabels()

  const [sales, setSales] = useState<Sale[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10

  useEffect(() => {
    fetchSales()
  }, [search, page])

  async function fetchSales() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ search, page: String(page), limit: String(limit) })
      const response = await fetch(`/api/sales?${params}`)
      const result = await response.json()
      if (result.success) {
        setSales(result.data)
        setTotal(result.pagination.total)
      } else {
        toast.error(result.error || t('failedFetch'))
      }
    } catch (error) {
      console.error('Failed to fetch sales:', error)
      toast.error(t('failedFetch'))
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(saleId: string) {
    if (!confirm(tc('confirmDeleteSale'))) return
    try {
      const response = await fetch(`/api/sales/${saleId}`, { method: 'DELETE' })
      const result = await response.json()
      if (result.success) {
        toast.success(t('deleted'))
        fetchSales()
        onDelete?.(saleId)
      } else {
        toast.error(result.error || t('failedDelete'))
      }
    } catch (error) {
      console.error('Failed to delete sale:', error)
      toast.error('Failed to delete sale')
    }
  }

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(num)
  }

  const pages = Math.ceil(total / limit)

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t('listTitle')}</span>
          <div className="ms-auto max-w-sm flex-1">
            <div className="relative">
              <Search className="absolute start-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="ps-8"
              />
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : sales.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">{t('emptyState')}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('saleNumber')}</TableHead>
                    <TableHead>{tc('customer')}</TableHead>
                    <TableHead className="text-end">{tc('total')}</TableHead>
                    <TableHead className="text-end">{tc('paid')}</TableHead>
                    <TableHead>{tc('status')}</TableHead>
                    <TableHead>{tc('method')}</TableHead>
                    <TableHead>{tc('date')}</TableHead>
                    <TableHead className="text-end">{tc('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">{sale.saleNumber}</TableCell>
                      <TableCell>{sale.customer?.name || '-'}</TableCell>
                      <TableCell className="text-end">{formatCurrency(sale.totalAmount)}</TableCell>
                      <TableCell className="text-end">{formatCurrency(sale.paidAmount)}</TableCell>
                      <TableCell>
                        <Badge variant={getSaleStatusBadgeVariant(sale.status)}>{enumLabels.saleStatus(sale.status)}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{enumLabels.paymentMethod(sale.paymentMethod)}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(sale.createdAt).toLocaleDateString('ar-EG')}
                      </TableCell>
                      <TableCell className="flex justify-end gap-2 text-end">
                        <Button variant="ghost" size="sm" onClick={() => onView?.(sale)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(sale.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {pages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>{tc('previous')}</Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(Math.min(pages, page + 1))} disabled={page === pages}>{tc('next')}</Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
