'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface Product {
  id: string
  name: string
  sku: string
  sellingPrice: number
  quantity: number
}

interface Customer {
  id: string
  name: string
}

interface CartItem {
  productId: string
  productName: string
  quantity: number
  price: number
  total: number
}

interface POSFormProps {
  onSuccess?: () => void
}

export function POSForm({ onSuccess }: POSFormProps) {
  const t = useTranslations('sales')
  const tc = useTranslations('common')

  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [customerId, setCustomerId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    fetchCustomers()
    fetchProducts()
  }, [])

  async function fetchCustomers() {
    try {
      const response = await fetch('/api/customers?limit=100')
      const result = await response.json()
      if (result.success) {
        setCustomers(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error)
    }
  }

  async function fetchProducts() {
    try {
      const response = await fetch('/api/products?limit=100')
      const result = await response.json()
      if (result.success) {
        setProducts(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    }
  }

  function addToCart() {
    if (!selectedProductId || !quantity) {
      toast.error(t('selectProductAndQty'))
      return
    }

    const product = products.find((p) => p.id === selectedProductId)
    if (!product) {
      toast.error(t('productNotFound'))
      return
    }

    const qty = parseInt(quantity)
    if (qty <= 0 || qty > product.quantity) {
      toast.error(t('invalidQuantity', { available: product.quantity }))
      return
    }

    // Check if product already in cart
    const existingItem = cart.find((item) => item.productId === selectedProductId)
    if (existingItem) {
      const newQty = existingItem.quantity + qty
      if (newQty > product.quantity) {
        toast.error(t('notEnoughStock', { available: product.quantity }))
        return
      }
      setCart(
        cart.map((item) =>
          item.productId === selectedProductId
            ? {
                ...item,
                quantity: newQty,
                total: newQty * item.price,
              }
            : item
        )
      )
    } else {
      setCart([
        ...cart,
        {
          productId: selectedProductId,
          productName: product.name,
          quantity: qty,
          price: Number(product.sellingPrice),
          total: qty * Number(product.sellingPrice),
        },
      ])
    }

    setSelectedProductId('')
    setQuantity('1')
    toast.success(t('addedToCart', { productName: product.name }))
  }

  function removeFromCart(productId: string) {
    setCart(cart.filter((item) => item.productId !== productId))
  }

  async function submitSale() {
    if (!customerId) {
      toast.error(t('selectCustomerToast'))
      return
    }

    if (cart.length === 0) {
      toast.error(t('cartEmptyToast'))
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          paymentMethod,
          notes,
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('saleCreated'))
        setCart([])
        setCustomerId('')
        setPaymentMethod('CASH')
        setNotes('')
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to create sale')
      }
    } catch (error) {
      console.error('Failed to create sale:', error)
      toast.error(t('failedCreate'))
    } finally {
      setLoading(false)
    }
  }

  const totalAmount = cart.reduce((sum, item) => sum + item.total, 0)

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Product Selection */}
      <div className="col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('addProductsTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product">{t('selectProduct')}</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger id="product">
                  <SelectValue placeholder={t('chooseProduct')} />
                </SelectTrigger>
                <SelectContent>
                  {products
                    .filter((p) => p.quantity > 0)
                    .map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {t('productOption', {
                          name: product.name,
                          sku: product.sku,
                          quantity: product.quantity,
                        })}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">{tc('quantity')}</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder={tc('quantityOne')}
                />
              </div>
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button onClick={addToCart} className="w-full">
                  <Plus className="h-4 w-4 me-2" />
                  {tc('addToCart')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cart Items */}
        <Card>
          <CardHeader>
            <CardTitle>{t('cartItemsTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {cart.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">{tc('cartEmpty')}</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('selectProduct')}</TableHead>
                      <TableHead className="text-end">{tc('qty')}</TableHead>
                      <TableHead className="text-end">{tc('price')}</TableHead>
                      <TableHead className="text-end">{tc('total')}</TableHead>
                      <TableHead className="text-center">{tc('action')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((item) => (
                      <TableRow key={item.productId}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell className="text-end">{item.quantity}</TableCell>
                        <TableCell className="text-end">
                          {new Intl.NumberFormat('ar-EG', {
                            style: 'currency',
                            currency: 'EGP',
                          }).format(item.price)}
                        </TableCell>
                        <TableCell className="text-end font-medium">
                          {new Intl.NumberFormat('ar-EG', {
                            style: 'currency',
                            currency: 'EGP',
                          }).format(item.total)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.productId)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sale Summary */}
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>{t('saleSummaryTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer">{t('customerRequired')}</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger id="customer">
                <SelectValue placeholder={t('selectCustomer')} />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">{tc('paymentMethod')}</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">{tc('cash')}</SelectItem>
                <SelectItem value="CARD">{tc('card')}</SelectItem>
                <SelectItem value="CHECK">{tc('check')}</SelectItem>
                <SelectItem value="TRANSFER">{tc('bankTransfer')}</SelectItem>
                <SelectItem value="OTHER">{tc('other')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{tc('notes')}</Label>
            <Input
              id="notes"
              placeholder={tc('addNotes')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>{t('itemsCount')}</span>
              <span className="font-medium">{cart.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{t('quantityTotal')}</span>
              <span className="font-medium">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>{t('totalAmount')}</span>
              <span>
                {new Intl.NumberFormat('ar-EG', {
                  style: 'currency',
                  currency: 'EGP',
                }).format(totalAmount)}
              </span>
            </div>
          </div>

          <Button
            onClick={submitSale}
            disabled={loading || cart.length === 0 || !customerId}
            className="w-full"
            size="lg"
          >
            {loading ? tc('processing') : tc('completeSale')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
