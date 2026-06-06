import { apiFetch } from '@/lib/api'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Trash2, Plus, Truck, AlertCircle, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { SaleReceipt } from './sale-receipt'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { useLanguage } from '@/lib/i18n'

interface Product {
  id: string
  name: string
  sku: string
  sellingPrice: number
  quantity: number
  supplier: { id: string; name: string } | null
}

interface Customer {
  id: string
  name: string
  phone?: string | null
  email?: string | null
}

interface CartItem {
  productId: string
  productName: string
  supplierName: string | null
  quantity: number
  price: number
  total: number
}

interface CompletedSale {
  id: string
  saleNumber: string
  createdAt: string | Date
  totalAmount: number
  paidAmount: number
  status: string
  paymentMethod: string
  notes?: string | null
  customer: { id: string; name: string; phone?: string | null; email?: string | null }
  items: Array<{
    id: string
    productId: string
    quantity: number
    price: number
    total: number
    product: { id: string; name: string; sku?: string; supplier?: { id: string; name: string } | null }
  }>
}

interface POSFormProps {
  onSuccess?: () => void
}

type PaymentType = 'FULL' | 'INSTALLMENT'

const PAYMENT_CHANNELS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'TRANSFER', label: 'Bank Transfer' },
  { value: 'CARD', label: 'Card / Credit Card' },
  { value: 'CHECK', label: 'Check' },
  { value: 'OTHER', label: 'Other' },
]

export function POSForm({ onSuccess }: POSFormProps) {
  const { t, te, formatCurrency } = useLanguage()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [customerId, setCustomerId] = useState('')
  const [paymentType, setPaymentType] = useState<PaymentType>('FULL')
  const [paymentChannel, setPaymentChannel] = useState('CASH')
  const [paidAmountInput, setPaidAmountInput] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)

  useEffect(() => {
    fetchCustomers()
    fetchProducts()
  }, [])

  async function fetchCustomers() {
    try {
      const response = await apiFetch('/api/customers?limit=100')
      const result = await response.json()
      if (result.success) setCustomers(result.data)
    } catch (error) {
      console.error('Failed to fetch customers:', error)
    }
  }

  async function fetchProducts() {
    try {
      const response = await apiFetch('/api/products?limit=100')
      const result = await response.json()
      if (result.success) setProducts(result.data)
    } catch (error) {
      console.error('Failed to fetch products:', error)
    }
  }

  function addToCart() {
    if (!selectedProductId || !quantity) {
      toast.error(t('Please select a product and quantity'))
      return
    }
    const product = products.find((p) => p.id === selectedProductId)
    if (!product) { toast.error(t('Product not found')); return }

    const qty = parseInt(quantity)
    if (qty <= 0 || qty > product.quantity) {
      toast.error(`${t('Invalid quantity. Available:')} ${product.quantity}`)
      return
    }

    const existingItem = cart.find((item) => item.productId === selectedProductId)
    if (existingItem) {
      const newQty = existingItem.quantity + qty
      if (newQty > product.quantity) {
        toast.error(`${t('Not enough stock. Available:')} ${product.quantity}`)
        return
      }
      setCart(cart.map((item) =>
        item.productId === selectedProductId
          ? { ...item, quantity: newQty, total: newQty * item.price }
          : item
      ))
    } else {
      setCart([...cart, {
        productId: selectedProductId,
        productName: product.name,
        supplierName: product.supplier?.name ?? null,
        quantity: qty,
        price: Number(product.sellingPrice),
        total: qty * Number(product.sellingPrice),
      }])
    }

    setSelectedProductId('')
    setQuantity('1')
    toast.success(`${product.name} ${t('added to cart')}`)
  }

  function removeFromCart(productId: string) {
    setCart(cart.filter((item) => item.productId !== productId))
  }

  async function submitSale() {
    if (!customerId) { toast.error(t('Please select a customer')); return }
    if (cart.length === 0) { toast.error(t('Cart is empty')); return }

    const paidAmount =
      paymentType === 'FULL'
        ? totalAmount
        : paidAmountInput === ''
        ? 0
        : Math.min(parseFloat(paidAmountInput) || 0, totalAmount)

    setLoading(true)
    try {
      const response = await apiFetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          paymentMethod: paymentChannel,
          paidAmount,
          dueDate: dueDate || undefined,
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
        setCompletedSale(result.data)
        setShowReceipt(true)
        setCart([])
        setCustomerId('')
        setPaymentType('FULL')
        setPaymentChannel('CASH')
        setPaidAmountInput('')
        setDueDate('')
        setNotes('')
        onSuccess?.()
      } else {
        toast.error(result.error ? te(result.error) : t('Failed to create sale'))
      }
    } catch (error) {
      console.error('Failed to create sale:', error)
      toast.error(t('Failed to create sale'))
    } finally {
      setLoading(false)
    }
  }

  const totalAmount = cart.reduce((sum, item) => sum + item.total, 0)
  const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0)

  const parsedPaid = paymentType === 'FULL'
    ? totalAmount
    : (paidAmountInput === '' ? 0 : (parseFloat(paidAmountInput) || 0))

  const remainingAmount = Math.max(0, totalAmount - parsedPaid)

  const cartHasItems = cart.length > 0

  // Validation errors
  const paidExceedsTotal = paymentType !== 'FULL' && paidAmountInput !== '' && parsedPaid > totalAmount && totalAmount > 0
  const installmentFullPay = paymentType === 'INSTALLMENT' && paidAmountInput !== '' && parsedPaid >= totalAmount && totalAmount > 0

  return (
    <>
      <div className="grid gap-6 grid-cols-3">
        <div className="space-y-4 col-span-2">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('Add Products to Sale')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="product" className="text-xs font-medium">{t('Product')}</Label>
                  <SearchableSelect
                    id="product"
                    value={selectedProductId}
                    onValueChange={setSelectedProductId}
                    placeholder={t('Choose a product…')}
                    searchPlaceholder={t('Search products…')}
                    options={products.filter((p) => p.quantity > 0).map((p) => ({
                      value: p.id,
                      label: p.name,
                      sublabel: `${p.sku} · ${p.quantity} ${t('in stock')} · ${formatCurrency(p.sellingPrice)}${p.supplier ? ` · ${p.supplier.name}` : ''}`,
                    }))}
                  />
                </div>
                <div className="w-24 space-y-1.5">
                  <Label htmlFor="quantity" className="text-xs font-medium">{t('Qty')}</Label>
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
                  {t('Add to Cart')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">{t('Cart')}</CardTitle>
              {cart.length > 0 && (
                <span className="text-xs text-muted-foreground">{cart.length} {cart.length !== 1 ? t('items') : t('item')}</span>
              )}
            </CardHeader>
            <CardContent className="p-0 pb-2">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="rounded-full bg-muted p-5 mb-3">
                    <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">{t('Cart is empty')}</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">{t('Add products above to start a sale')}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-4 font-semibold text-xs uppercase tracking-wide">{t('Product / Supplier')}</TableHead>
                      <TableHead className="text-right font-semibold text-xs uppercase tracking-wide">{t('Qty')}</TableHead>
                      <TableHead className="text-right font-semibold text-xs uppercase tracking-wide">{t('Unit Price')}</TableHead>
                      <TableHead className="text-right font-semibold text-xs uppercase tracking-wide">{t('Subtotal')}</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((item) => (
                      <TableRow key={item.productId}>
                        <TableCell className="pl-4">
                          <span className="font-medium text-sm block">{item.productName}</span>
                          {item.supplierName && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5 mt-0.5">
                              <Truck className="h-2.5 w-2.5" />
                              {item.supplierName}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{item.quantity}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums text-muted-foreground">{formatCurrency(item.price)}</TableCell>
                        <TableCell className="text-right text-sm font-semibold tabular-nums">{formatCurrency(item.total)}</TableCell>
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

        <div className={cn('transition-opacity duration-300', !cartHasItems && 'opacity-40 pointer-events-none select-none')}>
          <Card className="h-fit shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('Sale Summary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="customer" className="text-xs font-medium">{t('Customer *')}</Label>
                <SearchableSelect
                  id="customer"
                  value={customerId}
                  onValueChange={setCustomerId}
                  placeholder={t('Select customer…')}
                  searchPlaceholder={t('Search customers…')}
                  options={customers.map((c) => ({
                    value: c.id,
                    label: c.name,
                    sublabel: c.phone ?? undefined,
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">{t('Payment Type')}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentType('FULL')}
                    className={cn(
                      'rounded-lg border px-3 py-2.5 text-xs font-semibold transition-all text-center',
                      paymentType === 'FULL'
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-background border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                    )}
                  >
                    {t('Full Payment')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType('INSTALLMENT')}
                    className={cn(
                      'rounded-lg border px-3 py-2.5 text-xs font-semibold transition-all text-center',
                      paymentType === 'INSTALLMENT'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                        : 'bg-background border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                    )}
                  >
                    {t('Installment')}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="channel" className="text-xs font-medium">{t('Payment Method')}</Label>
                <Select value={paymentChannel} onValueChange={setPaymentChannel}>
                  <SelectTrigger id="channel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_CHANNELS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{t(opt.label)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {paymentType === 'INSTALLMENT' && (
                <>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="paid-amount" className="text-xs font-medium">{t('Amount Paid Now')}</Label>
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() => setPaidAmountInput(String(totalAmount))}
                      >
                        {t('Pay full')}
                      </button>
                    </div>
                    <Input
                      id="paid-amount"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={paidAmountInput}
                      onChange={(e) => setPaidAmountInput(e.target.value)}
                      className={cn((paidExceedsTotal || installmentFullPay) && 'border-destructive focus-visible:ring-destructive')}
                    />
                    {installmentFullPay && (
                      <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {t('Installment requires a partial payment — use Full Payment instead.')}
                      </p>
                    )}
                    {paidExceedsTotal && !installmentFullPay && (
                      <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {t('Amount paid cannot exceed the total')} ({formatCurrency(totalAmount)}).
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="due-date" className="text-xs font-medium">{t('Due Date')} <span className="text-muted-foreground font-normal">{t('(optional)')}</span></Label>
                    <Input
                      id="due-date"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-xs font-medium">{t('Notes')}</Label>
                <Input id="notes" placeholder={t('Add notes…')} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>

              <div className="rounded-xl bg-muted/50 p-3 space-y-2 border">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t('Line items')}</span>
                  <span className="font-medium text-foreground">{cart.length}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t('Total units')}</span>
                  <span className="font-medium text-foreground">{totalQty}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm font-semibold">{t('Total')}</span>
                  <span className="text-xl font-bold text-primary tabular-nums">{formatCurrency(totalAmount)}</span>
                </div>
                {paymentType === 'INSTALLMENT' && (
                  <>
                    <div className="flex justify-between items-center text-sm font-medium text-green-600">
                      <span>{t('Paid Now')}</span>
                      <span className="tabular-nums">{formatCurrency(parsedPaid)}</span>
                    </div>
                    {remainingAmount > 0 && (
                      <div className="flex justify-between items-center text-sm font-semibold text-destructive border-t pt-2">
                        <div className="flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span>{t('Remaining Debt')}</span>
                        </div>
                        <span className="tabular-nums">{formatCurrency(remainingAmount)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {paymentType === 'INSTALLMENT' && remainingAmount > 0 && (
                <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-800 flex items-start gap-2">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>{t('The remaining')} <strong>{formatCurrency(remainingAmount)}</strong> {t('will be automatically recorded in the')} <strong>{t('Debts')}</strong> {t('page.')}</span>
                </div>
              )}

              <Button
                onClick={submitSale}
                disabled={loading || cart.length === 0 || !customerId}
                className="w-full gap-2"
                size="lg"
              >
                {loading ? t('Processing…') : t('Complete Sale')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <SaleReceipt
        sale={completedSale}
        open={showReceipt}
        onClose={() => setShowReceipt(false)}
      />
    </>
  )
}
