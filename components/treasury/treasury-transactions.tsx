'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  getTreasuryTransactionBadgeVariant,
  isIncomeTransaction,
} from '@/lib/status-styles'

interface Transaction {
  id: string
  type: string
  amount: number
  description: string
  reference?: string
  createdAt: string
}

interface TreasuryTransactionsProps {
  treasuryId?: string
  limit?: number
}

export function TreasuryTransactions({ treasuryId, limit = 20 }: TreasuryTransactionsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [typeFilter, setTypeFilter] = useState('')

  useEffect(() => {
    fetchTransactions()
  }, [page, typeFilter])

  async function fetchTransactions() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      })

      if (treasuryId) {
        params.append('treasuryId', treasuryId)
      }

      if (typeFilter) {
        params.append('type', typeFilter)
      }

      const response = await fetch(`/api/treasury/transactions?${params}`)
      const result = await response.json()

      if (result.success) {
        setTransactions(result.data)
        setTotal(result.pagination.total)
      } else {
        toast.error('Failed to fetch transactions')
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
      toast.error('Failed to fetch transactions')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
    }).format(num)
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      SALES_INCOME: 'Sales Income',
      INSTALLMENT_PAYMENT: 'Installment',
      MANUAL_INCOME: 'Manual Income',
      SUPPLIER_PAYMENT: 'Supplier Payment',
      MANUAL_EXPENSE: 'Manual Expense',
      RETURN_REFUND: 'Return Refund',
    }
    return labels[type] || type
  }

  const pages = Math.ceil(total / limit)

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Transactions</span>
          <Select value={typeFilter} onValueChange={(value) => {
            setTypeFilter(value)
            setPage(1)
          }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              <SelectItem value="SALES_INCOME">Sales Income</SelectItem>
              <SelectItem value="INSTALLMENT_PAYMENT">Installments</SelectItem>
              <SelectItem value="MANUAL_INCOME">Manual Income</SelectItem>
              <SelectItem value="SUPPLIER_PAYMENT">Supplier Payment</SelectItem>
              <SelectItem value="MANUAL_EXPENSE">Manual Expense</SelectItem>
              <SelectItem value="RETURN_REFUND">Returns</SelectItem>
            </SelectContent>
          </Select>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No transactions found.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-muted-foreground font-medium">Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="text-sm">{formatTime(transaction.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant={getTreasuryTransactionBadgeVariant(transaction.type)}>
                          {getTypeLabel(transaction.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {transaction.reference || '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <span
                          className={
                            isIncomeTransaction(transaction.type)
                              ? 'text-success'
                              : 'text-destructive'
                          }
                        >
                          {isIncomeTransaction(transaction.type) ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} transactions
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
