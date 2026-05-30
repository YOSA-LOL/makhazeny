'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Edit2, Trash2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { NUMBER_FORMATS } from '@/lib/constants'

interface Product {
  id: string
  name: string
  sku: string
  quantity: number
  sellingPrice: number
  purchasePrice: number
  category: { name: string }
  lowStockLevel: number
}

interface ProductListProps {
  onEdit?: (product: Product) => void
  onDelete?: (productId: string) => void
}

export function ProductList({ onEdit, onDelete }: ProductListProps) {
  const t = useTranslations('products')
  const tc = useTranslations('common')
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10

  useEffect(() => {
    fetchProducts()
  }, [search, page])

  async function fetchProducts() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        search,
        page: String(page),
        limit: String(limit),
      })
      const response = await fetch(`/api/products?${params}`)
      const result = await response.json()

      if (result.success) {
        setProducts(result.data)
        setTotal(result.pagination.total)
      } else {
        toast.error(result.error || t('failedFetch'))
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
      toast.error(t('failedFetch'))
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(productId: string) {
    if (!confirm(tc('confirmDeleteProduct'))) return

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      })
      const result = await response.json()

      if (result.success) {
        toast.success(t('deleted'))
        fetchProducts()
        onDelete?.(productId)
      } else {
        toast.error(result.error || t('failedDelete'))
      }
    } catch (error) {
      console.error('Failed to delete product:', error)
      toast.error(t('failedDelete'))
    }
  }

  const isLowStock = (product: Product) => product.quantity <= product.lowStockLevel
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
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        ) : products.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">{t('emptyState')}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('productName')}</TableHead>
                    <TableHead>{tc('sku')}</TableHead>
                    <TableHead>{tc('category')}</TableHead>
                    <TableHead className="text-end">{tc('quantity')}</TableHead>
                    <TableHead className="text-end">{tc('price')}</TableHead>
                    <TableHead className="text-end">{tc('cost')}</TableHead>
                    <TableHead>{tc('status')}</TableHead>
                    <TableHead className="text-end">{tc('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.sku}</TableCell>
                      <TableCell>{product.category.name}</TableCell>
                      <TableCell className="text-end">{product.quantity}</TableCell>
                      <TableCell className="text-end">
                        {NUMBER_FORMATS.CURRENCY.format(Number(product.sellingPrice))}
                      </TableCell>
                      <TableCell className="text-end">
                        {NUMBER_FORMATS.CURRENCY.format(Number(product.purchasePrice))}
                      </TableCell>
                      <TableCell>
                        {isLowStock(product) ? (
                          <Badge variant="destructive" className="flex w-fit items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {tc('lowStock')}
                          </Badge>
                        ) : (
                          <Badge variant="outline">{tc('inStock')}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="flex justify-end gap-2 text-end">
                        <Button variant="ghost" size="sm" onClick={() => onEdit?.(product)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
