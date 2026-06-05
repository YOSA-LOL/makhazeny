import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, X } from 'lucide-react'
import { toast } from 'sonner'

interface ReceiptItem {
  id: string
  productId: string
  quantity: number
  price: number
  total: number
  product: {
    id: string
    name: string
    sku?: string
    supplier?: { id: string; name: string } | null
  }
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
  customer: {
    id: string
    name: string
    phone?: string | null
    email?: string | null
  }
  items: ReceiptItem[]
}

interface SaleReceiptProps {
  sale: CompletedSale | null
  open: boolean
  onClose: () => void
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  CHECK: 'Check',
  TRANSFER: 'Bank Transfer',
  INSTALLMENT: 'Installment',
  CREDIT: 'Credit (Pay Later)',
  OTHER: 'Other',
}

const STATUS_LABELS: Record<string, string> = {
  PAID: 'Fully Paid',
  PARTIAL: 'Partially Paid',
  PENDING: 'Unpaid / On Credit',
}

function fmt(v: number) {
  return `EGP\u00A0${Math.round(v).toLocaleString('en')}`
}

function fmtDisplay(v: number) {
  return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(v)
}

export function SaleReceipt({ sale, open, onClose }: SaleReceiptProps) {
  if (!sale) return null

  const currentSale = sale
  const remainingAmount = Math.max(0, Number(currentSale.totalAmount) - Number(currentSale.paidAmount))
  const createdAt = new Date(currentSale.createdAt)
  const dateStr = createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const timeStr = createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })

  function handlePrint() {
    const itemRows = currentSale.items.map(item => `
      <tr>
        <td style="padding:6px 8px 6px 0;border-bottom:1px dashed #ccc;font-size:12px;vertical-align:top;">
          <div style="font-weight:600;">${item.product?.name ?? '—'}</div>
          ${item.product?.supplier?.name ? `<div style="font-size:10px;color:#888;margin-top:2px;">${item.product.supplier.name}</div>` : ''}
        </td>
        <td style="padding:6px 4px;border-bottom:1px dashed #ccc;text-align:center;font-size:12px;">${item.quantity}</td>
        <td style="padding:6px 4px;border-bottom:1px dashed #ccc;text-align:right;font-size:12px;color:#555;">${fmt(item.price)}</td>
        <td style="padding:6px 0 6px 8px;border-bottom:1px dashed #ccc;text-align:right;font-size:12px;font-weight:600;">${fmt(item.total)}</td>
      </tr>
    `).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${currentSale.saleNumber}</title>
  <style>
    @page { margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #111; max-width: 420px; margin: 0 auto; padding: 16px; }
    .center { text-align: center; }
    .dashed { border-top: 1px dashed #bbb; margin: 10px 0; }
    .row { display: flex; justify-content: space-between; margin: 5px 0; font-size: 12px; }
    .muted { color: #666; }
    .bold { font-weight: 700; }
    .green { color: #16a34a; font-weight: 700; }
    .red { color: #dc2626; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    th { font-size: 10px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; padding: 4px 0; border-bottom: 2px solid #999; text-align: left; }
    th.right { text-align: right; }
    th.center { text-align: center; }
  </style>
</head>
<body>
  <div class="center" style="margin-bottom:14px;padding-bottom:14px;border-bottom:2px solid #111;">
    <h1 style="font-size:20px;margin:0;font-weight:800;letter-spacing:-0.5px;">Makhazeny Warehouse</h1>
    <p style="font-size:11px;color:#888;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px;">Sales Receipt</p>
  </div>

  <div class="row"><span class="muted">Receipt #</span><span class="bold" style="font-family:monospace;">${currentSale.saleNumber}</span></div>
  <div class="row"><span class="muted">Date</span><span>${dateStr}</span></div>
  <div class="row"><span class="muted">Time</span><span>${timeStr}</span></div>
  <div class="row"><span class="muted">Customer</span><span class="bold">${currentSale.customer.name}</span></div>
  ${currentSale.customer.phone ? `<div class="row"><span class="muted">Phone</span><span>${currentSale.customer.phone}</span></div>` : ''}

  <div class="dashed"></div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="center">Qty</th>
        <th class="right">Price</th>
        <th class="right">Total</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="dashed"></div>

  <div class="row bold" style="font-size:15px;padding:4px 0;"><span>Grand Total</span><span>${fmt(Number(currentSale.totalAmount))}</span></div>
  <div class="row green"><span>Amount Paid</span><span>${fmt(Number(currentSale.paidAmount))}</span></div>
  ${remainingAmount > 0 ? `<div class="dashed"></div><div class="row red" style="font-size:13px;"><span>Remaining Balance</span><span>${fmt(remainingAmount)}</span></div>` : ''}

  <div class="dashed"></div>

  <div class="row"><span class="muted">Payment Method</span><span>${PAYMENT_LABELS[currentSale.paymentMethod] ?? currentSale.paymentMethod}</span></div>
  <div class="row"><span class="muted">Status</span><span style="font-weight:700;color:${currentSale.status === 'PAID' ? '#16a34a' : currentSale.status === 'PARTIAL' ? '#d97706' : '#dc2626'};">${STATUS_LABELS[currentSale.status] ?? currentSale.status}</span></div>
  ${currentSale.notes ? `<div class="row"><span class="muted">Notes</span><span style="text-align:right;max-width:60%;">${currentSale.notes}</span></div>` : ''}

  <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #bbb;text-align:center;color:#888;font-size:11px;">
    <p style="margin:0;">Thank you for your business!</p>
    <p style="margin:4px 0 0;font-size:10px;opacity:0.6;">Makhazeny Warehouse Management System</p>
  </div>
</body>
</html>`

    const printWindow = window.open('', '_blank', 'width=520,height=720')
    if (!printWindow) {
      toast.error('Please allow pop-ups in your browser to print the receipt')
      return
    }
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 400)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden [&>button:last-child]:hidden">
        <DialogTitle className="sr-only">Sale Receipt — {currentSale.saleNumber}</DialogTitle>
        <DialogDescription className="sr-only">Printable receipt for sale {currentSale.saleNumber}</DialogDescription>

        <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/40">
          <span className="font-semibold text-sm">Sale Receipt — {currentSale.saleNumber}</span>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint} className="gap-1.5 h-8">
              <Printer className="h-3.5 w-3.5" />
              Print / PDF
            </Button>
            <DialogClose className="rounded-sm text-muted-foreground hover:text-foreground transition-colors opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4 bg-white max-h-[80vh] overflow-y-auto">
          <div className="text-center space-y-0.5 pb-3 border-b border-dashed">
            <h1 className="text-lg font-bold tracking-tight">Makhazeny Warehouse</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Sales Receipt</p>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Receipt #</span>
              <span className="font-mono font-semibold">{currentSale.saleNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span>{dateStr}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time</span>
              <span>{timeStr}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer</span>
              <span className="font-medium">{currentSale.customer.name}</span>
            </div>
            {currentSale.customer.phone && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span>{currentSale.customer.phone}</span>
              </div>
            )}
          </div>

          <div className="border-t border-dashed pt-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-dashed">
                  <th className="text-left font-semibold pb-1.5 text-muted-foreground uppercase tracking-wide">Item</th>
                  <th className="text-center font-semibold pb-1.5 text-muted-foreground uppercase tracking-wide w-10">Qty</th>
                  <th className="text-right font-semibold pb-1.5 text-muted-foreground uppercase tracking-wide">Price</th>
                  <th className="text-right font-semibold pb-1.5 text-muted-foreground uppercase tracking-wide">Total</th>
                </tr>
              </thead>
              <tbody>
                {currentSale.items.map((item) => (
                  <tr key={item.id} className="border-b border-dashed/50">
                    <td className="py-1.5 pr-2">
                      <div className="font-medium">{item.product?.name ?? '—'}</div>
                      {item.product?.supplier?.name && (
                        <div className="text-muted-foreground text-[10px]">{item.product.supplier.name}</div>
                      )}
                    </td>
                    <td className="py-1.5 text-center tabular-nums">{item.quantity}</td>
                    <td className="py-1.5 text-right tabular-nums text-muted-foreground">{fmtDisplay(item.price)}</td>
                    <td className="py-1.5 text-right tabular-nums font-medium">{fmtDisplay(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-1.5 text-xs pt-1">
            <div className="flex justify-between font-bold text-sm border-t pt-2">
              <span>Grand Total</span>
              <span className="tabular-nums">{fmtDisplay(currentSale.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-green-600 font-semibold">
              <span>Amount Paid</span>
              <span className="tabular-nums">{fmtDisplay(currentSale.paidAmount)}</span>
            </div>
            {remainingAmount > 0 && (
              <div className="flex justify-between text-destructive font-semibold border-t border-dashed pt-1.5">
                <span>Remaining Balance</span>
                <span className="tabular-nums">{fmtDisplay(remainingAmount)}</span>
              </div>
            )}
          </div>

          <div className="border-t border-dashed pt-3 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Method</span>
              <span className="font-medium">{PAYMENT_LABELS[currentSale.paymentMethod] ?? currentSale.paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className={`font-semibold ${
                currentSale.status === 'PAID' ? 'text-green-600' :
                currentSale.status === 'PARTIAL' ? 'text-amber-600' : 'text-red-600'
              }`}>
                {STATUS_LABELS[currentSale.status] ?? currentSale.status}
              </span>
            </div>
            {currentSale.notes && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground shrink-0">Notes</span>
                <span className="text-right">{currentSale.notes}</span>
              </div>
            )}
          </div>

          <div className="text-center text-xs text-muted-foreground pt-2 border-t border-dashed">
            <p>Thank you for your business!</p>
            <p className="text-[10px] mt-0.5 opacity-60">Makhazeny Warehouse Management System</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
