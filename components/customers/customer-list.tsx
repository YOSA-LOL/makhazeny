'use client'
import { useTranslations } from 'next-intl'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Edit2, Trash2, Search, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

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

export function CustomerList({ onEdit, onDelete }: CustomerListProps) {
  const t = useTranslations('customers')
  const tc = useTranslations('common')

  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10

  useEffect(() => {
    fetchCustomers()
  }, [search, page])

  async function fetchCustomers() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        search,
        page: String(page),
        limit: String(limit),
      })
      const response = await fetch(`/api/customers?${params}`)
      const result = await response.json()

      if (result.success) {
        setCustomers(result.data)
        setTotal(result.pagination.total)
      } else {
        toast.error(result.error || t('failedFetch'))
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error)
      toast.error(t('failedFetch'))
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(customerId: string) {
    if (!confirm(tc('confirmDeleteCustomer'))) return

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
      })
      const result = await response.json()

      if (result.success) {
        toast.success(t('deleted'))
        fetchCustomers()
        onDelete?.(customerId)
      } else {
        toast.error(result.error || t('failedDelete'))
      }
    } catch (error) {
      console.error('Failed to delete customer:', error)
      toast.error(t('failedDelete'))
    }
  }

  const hasOverdueDebt = (customer: Customer) => customer.totalDebt > customer.creditLimit
  const pages = Math.ceil(total / limit)

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Customers</span>
          <div className="flex-1 max-w-sm ms-auto">
            <div className="relative">
              <Search className="absolute start-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
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
        ) : customers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No customers found. Try creating one or adjusting your search.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead className="text-end">Outstanding Debt</TableHead>
                    <TableHead className="text-end">Credit Limit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-end">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.phone || '-'}</TableCell>
                      <TableCell>{customer.email || '-'}</TableCell>
                      <TableCell>{customer.city || '-'}</TableCell>
                      <TableCell className="text-end">
                        {new Intl.NumberFormat('ar-EG', {
                          style: 'currency',
                          currency: 'EGP',
                        }).format(Number(customer.totalDebt))}
                      </TableCell>
                      <TableCell className="text-end">
                        {new Intl.NumberFormat('ar-EG', {
                          style: 'currency',
                          currency: 'EGP',
                        }).format(Number(customer.creditLimit))}
                      </TableCell>
                      <TableCell>
                        {hasOverdueDebt(customer) ? (
                          <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                            <AlertCircle className="h-3 w-3" />
                            Overdue
                          </Badge>
                        ) : customer.totalDebt > 0 ? (
                          <Badge variant="secondary">Has Debt</Badge>
                        ) : (
                          <Badge variant="outline">Good Standing</Badge>
                        )}
                      </TableCell>
                      <TableCell className="flex justify-end gap-2 text-end">
                        <Button variant="ghost" size="sm" onClick={() => onEdit?.(customer)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(customer.id)}>
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
                  {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
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
