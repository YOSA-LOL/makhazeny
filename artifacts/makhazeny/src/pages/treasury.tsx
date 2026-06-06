import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TreasuryDashboard } from '@/components/treasury/treasury-dashboard'
import { TreasuryList } from '@/components/treasury/treasury-list'
import { TreasuryTransactions } from '@/components/treasury/treasury-transactions'
import { PageHeader } from '@/components/ui/page-header'
import { useLanguage } from '@/lib/i18n'

export default function TreasuryPage() {
  const [_selectedTreasuryId, setSelectedTreasuryId] = useState<string>()
  const [refreshKey, setRefreshKey] = useState(0)
  const [treasuryId, setTreasuryId] = useState<string | undefined>()
  const { t } = useLanguage()

  function handleTreasuryUpdated() {
    setRefreshKey((key) => key + 1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Treasury & Cash Register')}
        description={t('Track daily cash flow, income, expenses, and transaction history.')}
      />
      <TreasuryDashboard
        refreshKey={refreshKey}
        onTreasuryIdChange={setTreasuryId}
        onUpdated={handleTreasuryUpdated}
      />
      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transactions">{t('All Transactions')}</TabsTrigger>
          <TabsTrigger value="history">{t('Daily History')}</TabsTrigger>
        </TabsList>
        <TabsContent value="transactions" className="space-y-4">
          <TreasuryTransactions treasuryId={treasuryId} refreshKey={refreshKey} />
        </TabsContent>
        <TabsContent value="history" className="space-y-4">
          <TreasuryList refreshKey={refreshKey} onView={(treasury: { id: string }) => setSelectedTreasuryId(treasury.id)} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
