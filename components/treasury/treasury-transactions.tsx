'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useEnumLabels } from '@/hooks/use-enum-labels'
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

const TYPE_OPTIONS = [
  'SALES_INCOME',
  'INSTALLMENT_PAYMENT',
  'MANUAL_INCOME',
  'SUPPLIER_PAYMENT',
  'MANUAL_EXPENSE',
  'RETURN_REFUND',
] as const

export function TreasuryTransactions({ treasuryId, limit = 20 }: TreasuryTransactionsProps) {
  const t = useTranslations('treasury')
  const tc = useTranslations('common')
  const enumLabels = useEnumLabels()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [typeFilter, setTypeFilter] = useState('all')

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

      if (typeFilter !== 'all') {
        params.append('type', typeFilter)
      }

      const response = await fetch(`/api/treasury/transactions?${params}`)
      const result = await response.json()

      if (result.success) {
        setTransactions(result.data)
        setTotal(result.pagination.total)
      } else {
        toast.error(t('failedFetchTransactions'))
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
      toast.error(t('failedFetchTransactions'))
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

  const pages = Math.ceil(total / limit)

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t('transactionsTitle')}</span>
          <Select
            value={typeFilter}
            onValueChange={(value) => {
              setTypeFilter(value)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t('filterPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filterAllTypes')}</SelectItem>
              {TYPE_OPTIONS.map((type) => (
                <SelectItem key={type} value={type}>
                  {enumLabels.treasuryType(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">{t('transactionsEmpty')}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-medium text-muted-foreground">{tc('time')}</TableHead>
                    <TableHead>{tc('type')}</TableHead>
                    <TableHead>{tc('description')}</TableHead>
                    <TableHead>{tc('reference')}</TableHead>
                    <TableHead className="text-end">{tc('amount')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="text-sm">{formatTime(transaction.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant={getTreasuryTransactionBadgeVariant(transaction.type)}>
                          {enumLabels.treasuryType(transaction.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {transaction.reference || tc('emptyDash')}
                      </TableCell>
                      <TableCell className="text-end font-medium">
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
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {tc('showingRange', {
                    from: (page - 1) * limit + 1,
                    to: Math.min(page * limit, total),
                    total,
                    entity: t('transactionsEntity'),
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
