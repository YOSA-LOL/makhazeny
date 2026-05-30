'use client'
import { useTranslations } from 'next-intl'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Calendar, Eye } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Decimal } from 'decimal.js'

interface Treasury {
  id: string
  date: string
  openingBalance: number
  closingBalance: number
  transactions: Array<{ type: string; amount: number }>
  dailyBalance?: {
    dailyIncome: number
    dailyExpense: number
    dailyProfit: number
  }
}

interface TreasuryListProps {
  onView?: (treasury: Treasury) => void
}

export function TreasuryList({ onView }: TreasuryListProps) {
  const t = useTranslations('treasury')
  const tc = useTranslations('common')

  const [treasuries, setTreasuries] = useState<Treasury[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedDate, setSelectedDate] = useState('')
  const limit = 10

  useEffect(() => {
    fetchTreasuries()
  }, [page, selectedDate])

  async function fetchTreasuries() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      })

      if (selectedDate) {
        params.append('date', selectedDate)
      }

      const response = await fetch(`/api/treasury?${params}`)
      const result = await response.json()

      if (result.success) {
        setTreasuries(result.data)
        setTotal(result.pagination.total)
      } else {
        toast.error(result.error || t('failedFetchRecords'))
      }
    } catch (error) {
      console.error('Failed to fetch treasury:', error)
      toast.error(t('failedFetchRecords'))
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ar-EG')
  }

  const pages = Math.ceil(total / limit)

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Treasury History</span>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value)
                  setPage(1)
                }}
                className="w-40"
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
        ) : treasuries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No treasury records found for the selected date.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-end">Opening Balance</TableHead>
                    <TableHead className="text-end">Daily Income</TableHead>
                    <TableHead className="text-end">Daily Expense</TableHead>
                    <TableHead className="text-end">Daily Profit</TableHead>
                    <TableHead className="text-end">Closing Balance</TableHead>
                    <TableHead className="text-end">Transactions</TableHead>
                    <TableHead className="text-end">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {treasuries.map((treasury) => {
                    const dailyIncome =
                      treasury.dailyBalance?.dailyIncome || treasury.transactions
                        .filter((t) => ['SALES_INCOME', 'INSTALLMENT_PAYMENT', 'MANUAL_INCOME'].includes(t.type))
                        .reduce((sum, t) => sum + t.amount, 0)

                    const dailyExpense =
                      treasury.dailyBalance?.dailyExpense || treasury.transactions
                        .filter((t) => ['SUPPLIER_PAYMENT', 'MANUAL_EXPENSE', 'RETURN_REFUND'].includes(t.type))
                        .reduce((sum, t) => sum + t.amount, 0)

                    const dailyProfit = dailyIncome - dailyExpense

                    return (
                      <TableRow key={treasury.id}>
                        <TableCell className="font-medium">{formatDate(treasury.date)}</TableCell>
                        <TableCell className="text-end">{formatCurrency(treasury.openingBalance)}</TableCell>
                        <TableCell className="text-end text-success font-medium">
                          {formatCurrency(dailyIncome)}
                        </TableCell>
                        <TableCell className="text-end text-destructive font-medium">
                          {formatCurrency(dailyExpense)}
                        </TableCell>
                        <TableCell className="text-end">
                          <Badge variant={dailyProfit >= 0 ? 'success' : 'destructive'}>
                            {formatCurrency(dailyProfit)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-end font-bold">{formatCurrency(treasury.closingBalance)}</TableCell>
                        <TableCell className="text-end">
                          <Badge variant="outline">{treasury.transactions?.length || 0}</Badge>
                        </TableCell>
                        <TableCell className="text-end">
                          <Button variant="ghost" size="sm" onClick={() => onView?.(treasury)}>
                            <Eye className="h-4 w-4" />
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
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} records
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
