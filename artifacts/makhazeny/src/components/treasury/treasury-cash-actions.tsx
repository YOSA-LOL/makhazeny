import { apiFetch } from '@/lib/api'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowDownCircle, ArrowUpCircle, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/i18n'

interface TreasuryCashActionsProps {
  treasuryId: string
  disabled?: boolean
  onSuccess?: () => void
}

type CashAction = 'deposit' | 'withdraw' | null

export function TreasuryCashActions({ treasuryId, disabled, onSuccess }: TreasuryCashActionsProps) {
  const [action, setAction] = useState<CashAction>(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const { t, te } = useLanguage()

  function openDialog(next: CashAction) {
    setAction(next)
    setAmount('')
    setDescription('')
  }

  function closeDialog() {
    setAction(null)
    setAmount('')
    setDescription('')
  }

  async function handleSubmit() {
    const value = parseFloat(amount)
    if (!value || value <= 0) {
      toast.error(t('Please enter a valid amount'))
      return
    }
    if (!description.trim()) {
      toast.error(t('Please enter a description'))
      return
    }

    setLoading(true)
    try {
      const response = await apiFetch('/api/treasury', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action === 'deposit' ? 'add-manual-income' : 'add-manual-expense',
          treasuryId,
          amount: value,
          description: description.trim(),
        }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(action === 'deposit' ? t('Money added to treasury') : t('Money withdrawn from treasury'))
        closeDialog()
        onSuccess?.()
      } else {
        toast.error(result.error ? te(result.error) : t('Operation failed'))
      }
    } catch {
      toast.error(t('Operation failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="rounded-lg border bg-gradient-to-r from-primary/5 via-background to-emerald-500/5 px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2.5 shrink-0">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">{t('Treasury Cash Control')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('Add money to the cash register or withdraw cash from it.')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            className="gap-1.5"
            disabled={disabled}
            onClick={() => openDialog('deposit')}
          >
            <ArrowUpCircle className="h-4 w-4" />
            {t('Add Money')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5"
            disabled={disabled}
            onClick={() => openDialog('withdraw')}
          >
            <ArrowDownCircle className="h-4 w-4" />
            {t('Withdraw Money')}
          </Button>
        </div>
      </div>

      <Dialog open={action !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {action === 'deposit' ? t('Add Money to Treasury') : t('Withdraw Money from Treasury')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="cash-amount">{t('Amount (EGP)')}</Label>
              <Input
                id="cash-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cash-description">{t('Description')}</Label>
              <Input
                id="cash-description"
                placeholder={t('Reason for this transaction')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>{t('Cancel')}</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? t('Saving...') : action === 'deposit' ? t('Add Money') : t('Withdraw Money')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
