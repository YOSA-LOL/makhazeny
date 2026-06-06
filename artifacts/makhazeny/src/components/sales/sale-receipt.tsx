import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, X } from 'lucide-react'
import { toast } from 'sonner'
import { printHtml } from '@/lib/print'
import { useLanguage } from '@/lib/i18n'
import { PAYMENT_METHODS } from '@/lib/constants'

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

const STATUS_LABELS: Record<string, string> = {
  PAID: 'Fully Paid',
  PARTIAL: 'Partially Paid',
  PENDING: 'Unpaid / On Credit',
}

export function SaleReceipt({ sale, open, onClose }: SaleReceiptProps) {
  const { t, formatCurrency, formatDate, formatTime } = useLanguage()
  if (!sale) return null

  const currentSale = sale
  const remainingAmount = Math.max(0, Number(currentSale.totalAmount) - Number(currentSale.paidAmount))
  const createdAt = new Date(currentSale.createdAt)
  const dateStr = formatDate(createdAt, { day: 'numeric', month: 'short', year: 'numeric' })
  const timeStr = formatTime(createdAt)

  const paymentLabel = (method: string) =>
    t(PAYMENT_METHODS[method as keyof typeof PAYMENT_METHODS] ?? method)
  const statusLabel = (status: string) => t(STATUS_LABELS[status] ?? status)

  function handlePrint() {
    const itemRows = currentSale.items.map(item => `
      <tr>
        <td style="padding:6px 8px 6px 0;border-bottom:1px dashed #ccc;font-size:12px;vertical-align:top;">
          <div style="font-weight:600;">${item.product?.name ?? '—'}</div>
          ${item.product?.supplier?.name ? `<div style="font-size:10px;color:#888;margin-top:2px;">${item.product.supplier.name}</div>` : ''}
        </td>
        <td style="padding:6px 4px;border-bottom:1px dashed #ccc;text-align:center;font-size:12px;">${item.quantity}</td>
        <td style="padding:6px 4px;border-bottom:1px dashed #ccc;text-align:right;font-size:12px;color:#555;">${formatCurrency(item.price)}</td>
        <td style="padding:6px 0 6px 8px;border-bottom:1px dashed #ccc;text-align:right;font-size:12px;font-weight:600;">${formatCurrency(item.total)}</td>
      </tr>
    `).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${t('Receipt #')} ${currentSale.saleNumber}</title>
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
    <h1 style="font-size:20px;margin:0;font-weight:800;letter-spacing:-0.5px;">${t('Makhazeny Warehouse')}</h1>
    <p style="font-size:11px;color:#888;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px;">${t('Sales Receipt')}</p>
  </div>

  <div class="row"><span class="muted">${t('Receipt #')}</span><span class="bold" style="font-family:monospace;">${currentSale.saleNumber}</span></div>
  <div class="row"><span class="muted">${t('Date')}</span><span>${dateStr}</span></div>
  <div class="row"><span class="muted">${t('Time')}</span><span>${timeStr}</span></div>
  <div class="row"><span class="muted">${t('Customer')}</span><span class="bold">${currentSale.customer.name}</span></div>
  ${currentSale.customer.phone ? `<div class="row"><span class="muted">${t('Phone')}</span><span>${currentSale.customer.phone}</span></div>` : ''}

  <div class="dashed"></div>

  <table>
    <thead>
      <tr>
        <th>${t('Item')}</th>
        <th class="center">${t('Qty')}</th>
        <th class="right">${t('Price')}</th>
        <th class="right">${t('Total')}</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="dashed"></div>

  <div class="row bold" style="font-size:15px;padding:4px 0;"><span>${t('Grand Total')}</span><span>${formatCurrency(Number(currentSale.totalAmount))}</span></div>
  <div class="row green"><span>${t('Amount Paid')}</span><span>${formatCurrency(Number(currentSale.paidAmount))}</span></div>
  ${remainingAmount > 0 ? `<div class="dashed"></div><div class="row red" style="font-size:13px;"><span>${t('Remaining Balance')}</span><span>${formatCurrency(remainingAmount)}</span></div>` : ''}

  <div class="dashed"></div>

  <div class="row"><span class="muted">${t('Payment Method')}</span><span>${paymentLabel(currentSale.paymentMethod)}</span></div>
  <div class="row"><span class="muted">${t('Status')}</span><span style="font-weight:700;color:${currentSale.status === 'PAID' ? '#16a34a' : currentSale.status === 'PARTIAL' ? '#d97706' : '#dc2626'};">${statusLabel(currentSale.status)}</span></div>
  ${currentSale.notes ? `<div class="row"><span class="muted">${t('Notes')}</span><span style="text-align:right;max-width:60%;">${currentSale.notes}</span></div>` : ''}

  <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #bbb;text-align:center;color:#888;font-size:11px;">
    <p style="margin:0;">${t('Thank you for your business!')}</p>
    <p style="margin:4px 0 0;font-size:10px;opacity:0.6;">${t('Makhazeny Warehouse Management System')}</p>
  </div>
</body>
</html>`

    if (!printHtml(html, `${t('Receipt #')} ${currentSale.saleNumber}`)) {
      toast.error(t('Failed to open print dialog'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden [&>button:last-child]:hidden">
        <DialogTitle className="sr-only">{t('Sale Receipt')} — {currentSale.saleNumber}</DialogTitle>
        <DialogDescription className="sr-only">{t('Printable receipt for sale')} {currentSale.saleNumber}</DialogDescription>

        <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/40">
          <span className="font-semibold text-sm">{t('Sale Receipt')} — {currentSale.saleNumber}</span>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint} className="gap-1.5 h-8">
              <Printer className="h-3.5 w-3.5" />
              {t('Print / PDF')}
            </Button>
            <DialogClose className="rounded-sm text-muted-foreground hover:text-foreground transition-colors opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring">
              <X className="h-4 w-4" />
              <span className="sr-only">{t('Close')}</span>
            </DialogClose>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4 bg-white max-h-[80vh] overflow-y-auto">
          <div className="text-center space-y-0.5 pb-3 border-b border-dashed">
            <h1 className="text-lg font-bold tracking-tight">{t('Makhazeny Warehouse')}</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('Sales Receipt')}</p>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('Receipt #')}</span>
              <span className="font-mono font-semibold">{currentSale.saleNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('Date')}</span>
              <span>{dateStr}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('Time')}</span>
              <span>{timeStr}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('Customer')}</span>
              <span className="font-medium">{currentSale.customer.name}</span>
            </div>
            {currentSale.customer.phone && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Phone')}</span>
                <span>{currentSale.customer.phone}</span>
              </div>
            )}
          </div>

          <div className="border-t border-dashed pt-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-dashed">
                  <th className="text-left font-semibold pb-1.5 text-muted-foreground uppercase tracking-wide">{t('Item')}</th>
                  <th className="text-center font-semibold pb-1.5 text-muted-foreground uppercase tracking-wide w-10">{t('Qty')}</th>
                  <th className="text-right font-semibold pb-1.5 text-muted-foreground uppercase tracking-wide">{t('Price')}</th>
                  <th className="text-right font-semibold pb-1.5 text-muted-foreground uppercase tracking-wide">{t('Total')}</th>
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
                    <td className="py-1.5 text-right tabular-nums text-muted-foreground">{formatCurrency(item.price)}</td>
                    <td className="py-1.5 text-right tabular-nums font-medium">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-1.5 text-xs pt-1">
            <div className="flex justify-between font-bold text-sm border-t pt-2">
              <span>{t('Grand Total')}</span>
              <span className="tabular-nums">{formatCurrency(currentSale.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-green-600 font-semibold">
              <span>{t('Amount Paid')}</span>
              <span className="tabular-nums">{formatCurrency(currentSale.paidAmount)}</span>
            </div>
            {remainingAmount > 0 && (
              <div className="flex justify-between text-destructive font-semibold border-t border-dashed pt-1.5">
                <span>{t('Remaining Balance')}</span>
                <span className="tabular-nums">{formatCurrency(remainingAmount)}</span>
              </div>
            )}
          </div>

          <div className="border-t border-dashed pt-3 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('Payment Method')}</span>
              <span className="font-medium">{paymentLabel(currentSale.paymentMethod)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('Status')}</span>
              <span className={`font-semibold ${
                currentSale.status === 'PAID' ? 'text-green-600' :
                currentSale.status === 'PARTIAL' ? 'text-amber-600' : 'text-red-600'
              }`}>
                {statusLabel(currentSale.status)}
              </span>
            </div>
            {currentSale.notes && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground shrink-0">{t('Notes')}</span>
                <span className="text-right">{currentSale.notes}</span>
              </div>
            )}
          </div>

          <div className="text-center text-xs text-muted-foreground pt-2 border-t border-dashed">
            <p>{t('Thank you for your business!')}</p>
            <p className="text-[10px] mt-0.5 opacity-60">{t('Makhazeny Warehouse Management System')}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
