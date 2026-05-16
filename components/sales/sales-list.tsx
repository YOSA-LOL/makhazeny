'use client'

import { useState, useEffect } from 'react'
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
        toast.error(result.error || 'Failed to fetch sales')
      }
    } catch (error) {
      console.error('Failed to fetch sales:', error)
      toast.error('Failed to fetch sales')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(saleId: string) {
    if (!confirm('Are you sure you want to delete this sale?')) return
    try {
      const response = await fetch(`/api/sales/${saleId}`, { method: 'DELETE' })
      const result = await response.json()
      if (result.success) {
        toast.success('Sale deleted successfully')
        fetchSales()
        onDelete?.(saleId)
      } else {
        toast.error(result.error || 'Failed to delete sale')
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
          <span>Sales Transactions</span>
          <div className="flex-1 max-w-sm ml-auto">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sales..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-8"
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
          <div className="text-center py-8 text-muted-foreground">No sales found.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sale #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">{sale.saleNumber}</TableCell>
                      <TableCell>{sale.customer?.name || '-'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(sale.totalAmount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(sale.paidAmount)}</TableCell>
                      <TableCell>
                        <Badge variant={getSaleStatusBadgeVariant(sale.status)}>{sale.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{sale.paymentMethod}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(sale.createdAt).toLocaleDateString('ar-EG')}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
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
                  <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>Previous</Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(Math.min(pages, page + 1))} disabled={page === pages}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
