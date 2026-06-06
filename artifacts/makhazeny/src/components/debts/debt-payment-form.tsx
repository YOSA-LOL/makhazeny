import { apiFetch } from '@/lib/api'


import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PAYMENT_METHODS } from '@/lib/constants'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/i18n'

interface Debt {
  id: string
  customer: { id: string; name: string }
  originalAmount: number
  remainingAmount: number
  status: string
}

interface DebtPaymentFormProps {
  debt?: Debt
  onSuccess?: () => void
}

export function DebtPaymentForm({ debt, onSuccess }: DebtPaymentFormProps) {
  const { t, formatCurrency, te } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    setAmount('')
    setNotes('')
    setPaymentMethod('CASH')
  }, [debt?.id])

  if (!debt) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{t('Record Payment')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('Select a debt from the list to record a payment.')}
          </p>
        </CardContent>
      </Card>
    )
  }

  const remainingAmount = Number(debt.remainingAmount)
  const paidAmount = Number(debt.originalAmount) - remainingAmount
  const paymentPercent = Number(debt.originalAmount) > 0
    ? Math.round((paidAmount / Number(debt.originalAmount)) * 100)
    : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!debt) return
    const paymentAmount = parseFloat(amount)
    if (!paymentAmount || paymentAmount <= 0) {
      toast.error(t('Please enter a valid payment amount'))
      return
    }
    if (paymentAmount > remainingAmount) {
      toast.error(t('Payment exceeds remaining debt'))
      return
    }

    setLoading(true)
    try {
      const response = await apiFetch(`/api/debts/${debt.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: paymentAmount, paymentMethod, notes }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('Payment recorded successfully'))
        setAmount('')
        setNotes('')
        onSuccess?.()
      } else {
        toast.error(result.error ? te(result.error) : t('Failed to record payment'))
      }
    } catch (error) {
      console.error('Failed to record payment:', error)
      toast.error(t('Failed to record payment'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>{t('Record Payment')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="font-medium">{t('Customer:')}</span>
            <span>{debt.customer.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">{t('Original Debt:')}</span>
            <span>{formatCurrency(Number(debt.originalAmount))}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">{t('Already Paid:')}</span>
            <span className="text-success">
              {formatCurrency(paidAmount)} ({paymentPercent}%)
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t">
            <span className="font-bold">{t('Remaining:')}</span>
            <span className="text-destructive font-bold">{formatCurrency(remainingAmount)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">{t('Payment Amount *')}</Label>
            <div className="flex gap-2">
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                max={remainingAmount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setAmount(String(remainingAmount))}
              >
                {t('Pay Full')}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">{t('Payment Method')}</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="paymentMethod">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {t(label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t('Notes')}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('Optional payment notes')}
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('Processing...') : t('Record Payment')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
