'use client'
import { useTranslations } from 'next-intl'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TreasuryDashboard } from '@/components/treasury/treasury-dashboard'
import { TreasuryList } from '@/components/treasury/treasury-list'
import { TreasuryTransactions } from '@/components/treasury/treasury-transactions'
import { PageHeader } from '@/components/ui/page-header'

export default function TreasuryPage() {
  const t = useTranslations('treasury')

  const [selectedTreasuryId, setSelectedTreasuryId] = useState<string>()

  return (
    <div className="space-y-6">
      <PageHeader title={t('pageTitle')} description={t('pageDescription')} />

      <TreasuryDashboard />

      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transactions">{t('allTransactions')}</TabsTrigger>
          <TabsTrigger value="history">{t('dailyHistory')}</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <TreasuryTransactions />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <TreasuryList onView={(treasury) => setSelectedTreasuryId(treasury.id)} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
