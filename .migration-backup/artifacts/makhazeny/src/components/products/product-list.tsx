import { apiFetch } from '@/lib/api'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Edit2, Package, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n'

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

const fmt = (v: number) =>
  new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(v)

function TableSkeleton() {
  return (
    <div className="space-y-2 py-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-4 px-2">
          <div className="h-4 bg-muted rounded-full flex-[3] animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
          <div className="h-4 bg-muted rounded-full flex-[2] animate-pulse" style={{ animationDelay: `${i * 60 + 30}ms` }} />
          <div className="h-4 bg-muted rounded-full flex-1 animate-pulse" style={{ animationDelay: `${i * 60 + 60}ms` }} />
          <div className="h-4 bg-muted rounded-full w-16 animate-pulse" style={{ animationDelay: `${i * 60 + 90}ms` }} />
          <div className="h-4 bg-muted rounded-full w-16 animate-pulse" style={{ animationDelay: `${i * 60 + 120}ms` }} />
        </div>
      ))}
    </div>
  )
}

export function ProductList({ onEdit, onDelete }: ProductListProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10
  const { t } = useLanguage()

  useEffect(() => { fetchProducts() }, [search, page])

  async function fetchProducts() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ search, page: String(page), limit: String(limit) })
      const response = await apiFetch(`/api/products?${params}`)
      const result = await response.json()
      if (result.success) {
        setProducts(result.data)
        setTotal(result.pagination.total)
      } else {
        toast.error(result.error || 'Failed to fetch products')
      }
    } catch {
      toast.error('Failed to fetch products')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(productId: string) {
    if (!confirm('Delete this product?')) return
    try {
      const response = await apiFetch(`/api/products/${productId}`, { method: 'DELETE' })
      const result = await response.json()
      if (result.success) {
        toast.success('Product deleted')
        fetchProducts()
        onDelete?.(productId)
      } else {
        toast.error(result.error || 'Failed to delete')
      }
    } catch {
      toast.error('Failed to delete product')
    }
  }

  const isLowStock = (p: Product) => p.quantity <= p.lowStockLevel && p.quantity > 0
  const isOutOfStock = (p: Product) => p.quantity === 0
  const pages = Math.ceil(total / limit)

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-base">{t('Products List')}</CardTitle>
          {!loading && <p className="text-xs text-muted-foreground mt-0.5">{total} {t('products total')}</p>}
        </div>
        <div className="relative w-64">
          <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('Search products...')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="ps-8 h-9"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0 pb-4">
        {loading ? (
          <div className="px-4"><TableSkeleton /></div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="rounded-full bg-muted p-4 mb-3">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">{t('No products found')}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {search ? t('Try a different search term.') : t('Add your first product to get started.')}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="ps-4 font-semibold text-xs uppercase tracking-wide">{t('Product')}</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wide">{t('SKU')}</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wide">{t('Category')}</TableHead>
                    <TableHead className="text-end font-semibold text-xs uppercase tracking-wide">{t('Stock')}</TableHead>
                    <TableHead className="text-end font-semibold text-xs uppercase tracking-wide">{t('Price')}</TableHead>
                    <TableHead className="text-end font-semibold text-xs uppercase tracking-wide">{t('Cost')}</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wide">{t('Status')}</TableHead>
                    <TableHead className="text-end pe-4 font-semibold text-xs uppercase tracking-wide">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id} className="group">
                      <TableCell className="ps-4">
                        <span className="font-medium text-sm">{product.name}</span>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                          {product.sku}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs font-normal">
                          {product.category.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-end">
                        <span className={cn(
                          'text-sm font-semibold tabular-nums',
                          isOutOfStock(product) && 'text-destructive',
                          isLowStock(product) && 'text-warning',
                        )}>
                          {product.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-end text-sm tabular-nums">{fmt(product.sellingPrice)}</TableCell>
                      <TableCell className="text-end text-sm tabular-nums text-muted-foreground">{fmt(product.purchasePrice)}</TableCell>
                      <TableCell>
                        {isOutOfStock(product) ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-full px-2 py-0.5">
                            <AlertCircle className="h-3 w-3" /> {t('Out of stock')}
                          </span>
                        ) : isLowStock(product) ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-warning bg-warning/10 border border-warning/20 rounded-full px-2 py-0.5">
                            <AlertCircle className="h-3 w-3" /> {t('Low stock')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-success bg-success/10 border border-success/20 rounded-full px-2 py-0.5">
                            {t('In stock')}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-end pe-4">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => onEdit?.(product)} title={t('Edit')}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(product.id)} title={t('Delete')}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {pages > 1 && (
              <div className="flex items-center justify-between px-4 mt-4">
                <p className="text-xs text-muted-foreground">
                  {(page - 1) * limit + 1}–{Math.min(page * limit, total)} {t('of')} {total}
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs"
                    onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>{t('← Prev')}</Button>
                  {Array.from({ length: Math.min(pages, 7) }, (_, i) => i + 1).map((p) => (
                    <Button key={p} variant={p === page ? 'default' : 'outline'}
                      size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setPage(p)}>{p}</Button>
                  ))}
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs"
                    onClick={() => setPage(Math.min(pages, page + 1))} disabled={page === pages}>{t('Next →')}</Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
