'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useEnumLabels } from '@/hooks/use-enum-labels'
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
import { PAYMENT_METHODS, NUMBER_FORMATS } from '@/lib/constants'
import { toast } from 'sonner'

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
  const t = useTranslations('debts')
  const tc = useTranslations('common')
  const enumLabels = useEnumLabels()

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
          <CardTitle>{t('paymentTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('paymentEmptyHint')}</p>
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
    const paymentAmount = parseFloat(amount)
    if (!paymentAmount || paymentAmount <= 0) {
      toast.error(t('invalidAmount'))
      return
    }
    if (paymentAmount > remainingAmount) {
      toast.error(t('exceedsRemaining'))
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/debts/${debt.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: paymentAmount, paymentMethod, notes }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('recorded'))
        setAmount('')
        setNotes('')
        onSuccess?.()
      } else {
        toast.error(result.error || t('failedRecord'))
      }
    } catch (error) {
      console.error('Failed to record payment:', error)
      toast.error(t('failedRecord'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>{t('paymentTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 rounded-lg border bg-muted/30 p-4 text-sm">
          <div className="flex justify-between">
            <span className="font-medium">{t('customerLabel')}</span>
            <span>{debt.customer.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">{t('originalDebt')}</span>
            <span>{NUMBER_FORMATS.CURRENCY.format(Number(debt.originalAmount))}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">{t('alreadyPaid')}</span>
            <span className="text-success">
              {NUMBER_FORMATS.CURRENCY.format(paidAmount)} ({paymentPercent}%)
            </span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="font-bold">{t('remainingLabel')}</span>
            <span className="font-bold text-destructive">
              {NUMBER_FORMATS.CURRENCY.format(remainingAmount)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">{t('paymentAmount')}</Label>
            <div className="flex gap-2">
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                max={remainingAmount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={tc('amountZero')}
                required
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setAmount(String(remainingAmount))}
              >
                {tc('payFull')}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">{tc('paymentMethod')}</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="paymentMethod">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(PAYMENT_METHODS).map((key) => (
                  <SelectItem key={key} value={key}>
                    {enumLabels.paymentMethod(key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{tc('notes')}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('paymentNotes')}
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? tc('processing') : tc('recordPayment')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
