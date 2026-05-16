'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { getReturnStatusBadgeVariant } from '@/lib/status-styles'

interface ReturnItem {
  id: string
  productId: string
  quantity: number
  returnAmount: number
}

interface Return {
  id: string
  returnNumber: string
  sale: {
    saleNumber: string
    customer: { name: string }
  }
  totalReturnAmount: number
  reason: string
  status: string
  items: ReturnItem[]
  createdAt: string
}

interface ReturnsListProps {
  onApprove?: (returnRecord: Return) => void
}

export function ReturnsList({ onApprove }: ReturnsListProps) {
  const [returns, setReturns] = useState<Return[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10

  useEffect(() => {
    fetchReturns()
  }, [statusFilter, page])

  async function fetchReturns() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        page: String(page),
        limit: String(limit),
      })

      const response = await fetch(`/api/returns?${params}`)
      const result = await response.json()

      if (result.success) {
        setReturns(result.data)
        setTotal(result.pagination.total)
      } else {
        toast.error('Failed to fetch returns')
      }
    } catch (error) {
      console.error('Failed to fetch returns:', error)
      toast.error('Failed to fetch returns')
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(returnId: string) {
    try {
      const response = await fetch(`/api/returns/${returnId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Return approved successfully')
        fetchReturns()
      } else {
        toast.error(result.error || 'Failed to approve return')
      }
    } catch (error) {
      console.error('Failed to approve return:', error)
      toast.error('Failed to approve return')
    }
  }

  async function handleReject(returnId: string) {
    try {
      const response = await fetch(`/api/returns/${returnId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED' }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Return rejected')
        fetchReturns()
      } else {
        toast.error('Failed to reject return')
      }
    } catch (error) {
      console.error('Failed to reject return:', error)
      toast.error('Failed to reject return')
    }
  }

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
    }).format(num)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'PROCESSED':
        return <CheckCircle className="h-4 w-4 text-success" />
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-destructive" />
      case 'PENDING':
        return <Clock className="h-4 w-4 text-warning-foreground" />
      default:
        return null
    }
  }

  const pages = Math.ceil(total / limit)

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Sales Returns</span>
          <div className="flex gap-2">
            {['PENDING', 'APPROVED', 'REJECTED'].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setStatusFilter(status)
                  setPage(1)
                }}
              >
                {status}
              </Button>
            ))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : returns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No {statusFilter.toLowerCase()} returns found.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Return #</TableHead>
                    <TableHead>Sale #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Return Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returns.map((returnRecord) => (
                    <TableRow key={returnRecord.id}>
                      <TableCell className="font-medium">{returnRecord.returnNumber}</TableCell>
                      <TableCell>{returnRecord.sale.saleNumber}</TableCell>
                      <TableCell>{returnRecord.sale.customer.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{returnRecord.reason}</TableCell>
                      <TableCell className="text-right">{returnRecord.items.length}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(returnRecord.totalReturnAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getReturnStatusBadgeVariant(returnRecord.status)}>
                          {getStatusIcon(returnRecord.status)}
                          {' '}
                          {returnRecord.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {returnRecord.status === 'PENDING' && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleApprove(returnRecord.id)}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleReject(returnRecord.id)}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} returns
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map((p) => (
                    <Button
                      key={p}
                      variant={p === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.min(pages, page + 1))}
                    disabled={page === pages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
