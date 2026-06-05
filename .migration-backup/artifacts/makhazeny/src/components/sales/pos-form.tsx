import { apiFetch } from '@/lib/api'


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
      const response = await apiFetch('/api/customers?limit=100')
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
      const response = await apiFetch('/api/products?limit=100')
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
      const response = await apiFetch('/api/sales', {
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
  const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0)

  const fmt = (v: number) =>
    new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(v)

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Left: product picker + cart */}
      <div className="col-span-2 space-y-4">
        {/* Product picker */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add Products to Sale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="product" className="text-xs font-medium">Product</Label>
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger id="product">
                    <SelectValue placeholder="Choose a product…" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.filter((p) => p.quantity > 0).map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        <span className="font-medium">{product.name}</span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          {product.sku} · {product.quantity} in stock · {fmt(product.sellingPrice)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-24 space-y-1.5">
                <Label htmlFor="quantity" className="text-xs font-medium">Qty</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="text-center"
                />
              </div>
              <Button onClick={addToCart} className="gap-1.5 shrink-0">
                <Plus className="h-4 w-4" />
                Add to Cart
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Cart */}
        <Card className="shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">Cart</CardTitle>
            {cart.length > 0 && (
              <span className="text-xs text-muted-foreground">{cart.length} item{cart.length !== 1 ? 's' : ''}</span>
            )}
          </CardHeader>
          <CardContent className="p-0 pb-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4 mb-3">
                  <Plus className="h-5 w-5 text-muted-foreground rotate-45" />
                </div>
                <p className="text-sm text-muted-foreground">Cart is empty</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Add products above to start a sale</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-4 font-semibold text-xs uppercase tracking-wide">Product</TableHead>
                    <TableHead className="text-right font-semibold text-xs uppercase tracking-wide">Qty</TableHead>
                    <TableHead className="text-right font-semibold text-xs uppercase tracking-wide">Unit Price</TableHead>
                    <TableHead className="text-right font-semibold text-xs uppercase tracking-wide">Subtotal</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.map((item) => (
                    <TableRow key={item.productId}>
                      <TableCell className="pl-4 font-medium text-sm">{item.productName}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{item.quantity}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                        {fmt(item.price)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold tabular-nums">
                        {fmt(item.total)}
                      </TableCell>
                      <TableCell className="pr-2 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeFromCart(item.productId)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right: sale summary */}
      <Card className="h-fit shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sale Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="customer" className="text-xs font-medium">Customer *</Label>
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

          <div className="space-y-1.5">
            <Label htmlFor="method" className="text-xs font-medium">Payment Method</Label>
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

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-medium">Notes</Label>
            <Input id="notes" placeholder="Add notes…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="rounded-xl bg-muted/50 p-3 space-y-2 border">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Line items</span>
              <span className="font-medium text-foreground">{cart.length}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Total units</span>
              <span className="font-medium text-foreground">{totalQty}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-xl font-bold text-primary tabular-nums">{fmt(totalAmount)}</span>
            </div>
          </div>

          <Button
            onClick={submitSale}
            disabled={loading || cart.length === 0 || !customerId}
            className="w-full gap-2"
            size="lg"
          >
            {loading ? 'Processing…' : 'Complete Sale'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
