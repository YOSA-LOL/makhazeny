import { useState } from 'react'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/lib/i18n'
import { RETURN_REASONS } from '@/lib/constants'
import { RotateCcw, Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Sale, SaleItem } from './sales-list'

interface ReturnFromSaleDialogProps {
  sale: Sale | null
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function ReturnFromSaleDialog({ sale, open, onClose, onSuccess }: ReturnFromSaleDialogProps) {
  const { t, formatCurrency, te } = useLanguage()
  const REASONS = Object.entries(RETURN_REASONS).map(([value, label]) => ({ value, label: t(label) }))
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [reason, setReason] = useState('CUSTOMER_REQUEST')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  function resetState() {
    setQuantities({})
    setReason('CUSTOMER_REQUEST')
    setNotes('')
  }

  function handleClose() {
    resetState()
    onClose()
  }

  function setQty(itemId: string, value: number, max: number) {
    setQuantities((prev) => ({ ...prev, [itemId]: Math.min(max, Math.max(0, value)) }))
  }

  const selectedItems = (sale?.items ?? []).filter((item) => (quantities[item.id] ?? 0) > 0)
  const totalReturnAmount = selectedItems.reduce((sum, item) => {
    const qty = quantities[item.id] ?? 0
    return sum + item.price * qty
  }, 0)

  async function handleSubmit() {
    if (!sale) return
    if (selectedItems.length === 0) {
      toast.error(t('Please select at least one item to return'))
      return
    }

    setLoading(true)
    try {
      const createRes = await apiFetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId: sale.id,
          reason,
          notes: notes || undefined,
          items: selectedItems.map((item) => ({
            saleItemId: item.id,
            productId: item.productId,
            quantity: quantities[item.id],
            amount: item.price * quantities[item.id],
          })),
        }),
      })
      const createResult = await createRes.json()
      if (!createResult.success) {
        toast.error(createResult.error ? te(createResult.error) : t('Failed to create return'))
        return
      }

      const approveRes = await apiFetch(`/api/returns/${createResult.data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      })
      const approveResult = await approveRes.json()
      if (!approveResult.success) {
        toast.error(approveResult.error ? te(approveResult.error) : t('Return created but approval failed'))
        return
      }

      toast.success(`${t('Return processed successfully')} — ${formatCurrency(totalReturnAmount)}`)
      handleClose()
      onSuccess?.()
    } catch {
      toast.error(t('Failed to process return'))
    } finally {
      setLoading(false)
    }
  }

  if (!sale) return null

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-warning" />
            {t('Return from Sale')} — <code className="text-sm font-mono">{sale.saleNumber}</code>
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {t('Customer')}: <span className="font-medium text-foreground">{sale.customer?.name}</span>
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="border rounded-lg divide-y overflow-hidden">
            {sale.items.map((item: SaleItem) => {
              const qty = quantities[item.id] ?? 0
              const max = item.quantity
              const lineTotal = item.price * qty
              return (
                <div key={item.id} className={cn('flex items-center gap-3 px-3 py-2.5 transition-colors', qty > 0 && 'bg-warning/5')}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(item.price)} × {max} {t('pcs')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setQty(item.id, qty - 1, max)}
                      disabled={qty === 0}
                      className="h-6 w-6 rounded border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className={cn('w-7 text-center text-sm font-semibold tabular-nums', qty > 0 ? 'text-warning' : 'text-muted-foreground')}>
                      {qty}
                    </span>
                    <button
                      onClick={() => setQty(item.id, qty + 1, max)}
                      disabled={qty >= max}
                      className="h-6 w-6 rounded border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="w-20 text-right">
                    {qty > 0 ? (
                      <span className="text-sm font-semibold text-warning tabular-nums">{formatCurrency(lineTotal)}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {totalReturnAmount > 0 && (
            <div className="flex items-center justify-between px-3 py-2 bg-warning/10 border border-warning/20 rounded-lg">
              <span className="text-sm font-medium text-warning">{t('Total Return Amount')}</span>
              <span className="text-base font-bold text-warning tabular-nums">{formatCurrency(totalReturnAmount)}</span>
            </div>
          )}

          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold">{t('Reason')}</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold">{t('Notes')} <span className="font-normal text-muted-foreground">({t('optional')})</span></Label>
            <Textarea
              placeholder={t('Any additional notes...')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-16 resize-none text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>{t('Cancel')}</Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || selectedItems.length === 0}
            className="bg-warning text-warning-foreground hover:bg-warning/90 gap-1.5"
          >
            <RotateCcw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            {loading ? t('Processing...') : `${t('Process Return')} ${selectedItems.length > 0 ? `(${formatCurrency(totalReturnAmount)})` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
