import { useState } from 'react'
import { DebtsList } from '@/components/debts/debts-list'
import { DebtPaymentForm } from '@/components/debts/debt-payment-form'
import { PageHeader } from '@/components/ui/page-header'
import { useLanguage } from '@/lib/i18n'

interface Debt {
  id: string
  customer: { id: string; name: string }
  originalAmount: number
  remainingAmount: number
  status: string
  dueDate?: string
  createdAt: string
  payments: Array<{ id: string }>
}

export default function DebtsPage() {
  const [selectedDebt, setSelectedDebt] = useState<Debt>()
  const [refreshKey, setRefreshKey] = useState(0)
  const { t } = useLanguage()

  const handleSuccess = () => {
    setRefreshKey((prev) => prev + 1)
    setSelectedDebt(undefined)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Debt & Installment Management')}
        description={t('Monitor outstanding customer debts and record installment payments.')}
      />
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <DebtsList key={refreshKey} onPayment={setSelectedDebt} />
        </div>
        <div>
          <DebtPaymentForm debt={selectedDebt} onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  )
}
