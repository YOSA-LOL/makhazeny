'use client'

import { useState, useEffect } from 'react'
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
      toast.error('Please select a product and quantity')
      return
    }

    const product = products.find((p) => p.id === selectedProductId)
    if (!product) {
      toast.error('Product not found')
      return
    }

    const qty = parseInt(quantity)
    if (qty <= 0 || qty > product.quantity) {
      toast.error(`Invalid quantity. Available: ${product.quantity}`)
      return
    }

    // Check if product already in cart
    const existingItem = cart.find((item) => item.productId === selectedProductId)
    if (existingItem) {
      const newQty = existingItem.quantity + qty
      if (newQty > product.quantity) {
        toast.error(`Not enough stock. Available: ${product.quantity}`)
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
    toast.success(`${product.name} added to cart`)
  }

  function removeFromCart(productId: string) {
    setCart(cart.filter((item) => item.productId !== productId))
  }

  async function submitSale() {
    if (!customerId) {
      toast.error('Please select a customer')
      return
    }

    if (cart.length === 0) {
      toast.error('Cart is empty')
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
        toast.success('Sale created successfully')
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
      toast.error('Failed to create sale')
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
            <CardTitle>Add Products to Sale</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product">Select Product</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger id="product">
                  <SelectValue placeholder="Choose a product" />
                </SelectTrigger>
                <SelectContent>
                  {products
                    .filter((p) => p.quantity > 0)
                    .map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({product.sku}) - Stock: {product.quantity}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="1"
                />
              </div>
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button onClick={addToCart} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cart Items */}
        <Card>
          <CardHeader>
            <CardTitle>Cart Items</CardTitle>
          </CardHeader>
          <CardContent>
            {cart.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Cart is empty</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((item) => (
                      <TableRow key={item.productId}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat('ar-EG', {
                            style: 'currency',
                            currency: 'EGP',
                          }).format(item.price)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
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
          <CardTitle>Sale Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer">Customer *</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger id="customer">
                <SelectValue placeholder="Select customer" />
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
            <Label htmlFor="method">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="CARD">Card</SelectItem>
                <SelectItem value="CHECK">Check</SelectItem>
                <SelectItem value="TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              placeholder="Add notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Items:</span>
              <span className="font-medium">{cart.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Quantity:</span>
              <span className="font-medium">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total:</span>
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
            {loading ? 'Processing...' : 'Complete Sale'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
