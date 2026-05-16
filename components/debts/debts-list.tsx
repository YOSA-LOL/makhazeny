'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { getDebtStatusBadgeVariant } from '@/lib/status-styles'

interface Debt {
  id: string
  customer: { id: string; name: string }
  originalAmount: number
  remainingAmount: number
  status: string
  dueDate?: string
  createdAt: string
  payments: Array<{ id: string }>
}

interface DebtsListProps {
  onPayment?: (debt: Debt) => void
}

export function DebtsList({ onPayment }: DebtsListProps) {
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ACTIVE')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10

  useEffect(() => {
    fetchDebts()
  }, [statusFilter, page])

  async function fetchDebts() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        page: String(page),
        limit: String(limit),
      })
      const response = await fetch(`/api/debts?${params}`)
      const result = await response.json()
      if (result.success) {
        setDebts(result.data)
        setTotal(result.pagination.total)
      } else {
        toast.error('Failed to fetch debts')
      }
    } catch (error) {
      console.error('Failed to fetch debts:', error)
      toast.error('Failed to fetch debts')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(num)
  }

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  const pages = Math.ceil(total / limit)

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Outstanding Debts</span>
          <div className="flex gap-2">
            {['ACTIVE', 'PARTIAL', 'PAID'].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setStatusFilter(status); setPage(1) }}
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
        ) : debts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No {statusFilter} debts found.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Original</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debts.map((debt) => {
                    const paid = Number(debt.originalAmount) - Number(debt.remainingAmount)
                    const overdue = isOverdue(debt.dueDate)
                    return (
                      <TableRow key={debt.id} className={overdue ? 'bg-destructive/5' : ''}>
                        <TableCell className="font-medium">{debt.customer.name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(debt.originalAmount)}</TableCell>
                        <TableCell className="text-right font-medium text-destructive">{formatCurrency(debt.remainingAmount)}</TableCell>
                        <TableCell className="text-right text-success">{formatCurrency(paid)}</TableCell>
                        <TableCell>
                          {debt.dueDate ? (
                            <div className="flex items-center gap-1">
                              {overdue && <AlertCircle className="h-4 w-4 text-destructive" />}
                              <span className={overdue ? 'text-destructive font-medium' : ''}>
                                {new Date(debt.dueDate).toLocaleDateString('ar-EG')}
                              </span>
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getDebtStatusBadgeVariant(debt.status)}>{debt.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="default" size="sm" onClick={() => onPayment?.(debt)} disabled={debt.status === 'PAID'}>
                            <CreditCard className="h-4 w-4 mr-1" /> Pay
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
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
