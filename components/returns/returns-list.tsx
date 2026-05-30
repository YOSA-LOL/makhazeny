'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useEnumLabels } from '@/hooks/use-enum-labels'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { getReturnStatusBadgeVariant } from '@/lib/status-styles'
import { NUMBER_FORMATS } from '@/lib/constants'

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
  const t = useTranslations('returns')
  const tc = useTranslations('common')
  const enumLabels = useEnumLabels()

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
        toast.error(t('failedFetch'))
      }
    } catch (error) {
      console.error('Failed to fetch returns:', error)
      toast.error(t('failedFetch'))
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
        toast.success(t('approved'))
        fetchReturns()
        onApprove?.(returns.find((r) => r.id === returnId)!)
      } else {
        toast.error(result.error || t('failedApprove'))
      }
    } catch (error) {
      console.error('Failed to approve return:', error)
      toast.error(t('failedApprove'))
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
        toast.success(t('rejected'))
        fetchReturns()
      } else {
        toast.error(result.error || t('failedReject'))
      }
    } catch (error) {
      console.error('Failed to reject return:', error)
      toast.error(t('failedReject'))
    }
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
          <span>{t('listTitle')}</span>
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
                {enumLabels.returnStatus(status)}
              </Button>
            ))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        ) : returns.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            {t('emptyState', { status: enumLabels.returnStatus(statusFilter) })}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('returnNumber')}</TableHead>
                    <TableHead>{t('saleNumber')}</TableHead>
                    <TableHead>{tc('customer')}</TableHead>
                    <TableHead>{tc('reason')}</TableHead>
                    <TableHead className="text-end">{tc('items')}</TableHead>
                    <TableHead className="text-end">{tc('returnAmount')}</TableHead>
                    <TableHead>{tc('status')}</TableHead>
                    <TableHead className="text-end">{tc('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returns.map((returnRecord) => (
                    <TableRow key={returnRecord.id}>
                      <TableCell className="font-medium">{returnRecord.returnNumber}</TableCell>
                      <TableCell>{returnRecord.sale.saleNumber}</TableCell>
                      <TableCell>{returnRecord.sale.customer.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {enumLabels.returnReason(returnRecord.reason)}
                      </TableCell>
                      <TableCell className="text-end">{returnRecord.items.length}</TableCell>
                      <TableCell className="text-end font-medium">
                        {NUMBER_FORMATS.CURRENCY.format(returnRecord.totalReturnAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getReturnStatusBadgeVariant(returnRecord.status)}>
                          {getStatusIcon(returnRecord.status)} {enumLabels.returnStatus(returnRecord.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex justify-end gap-2 text-end">
                        {returnRecord.status === 'PENDING' && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleApprove(returnRecord.id)}
                            >
                              {tc('approve')}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleReject(returnRecord.id)}
                            >
                              {tc('reject')}
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
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {tc('showingRange', {
                    from: (page - 1) * limit + 1,
                    to: Math.min(page * limit, total),
                    total,
                    entity: t('paginationEntity'),
                  })}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                  >
                    {tc('previous')}
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
                    {tc('next')}
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
