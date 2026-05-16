'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TreasuryDashboard } from '@/components/treasury/treasury-dashboard'
import { TreasuryList } from '@/components/treasury/treasury-list'
import { TreasuryTransactions } from '@/components/treasury/treasury-transactions'
import { PageHeader } from '@/components/ui/page-header'

export default function TreasuryPage() {
  const [selectedTreasuryId, setSelectedTreasuryId] = useState<string>()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Treasury & Cash Register"
        description="Track daily cash flow, income, expenses, and transaction history."
      />

      {/* Dashboard Summary */}
      <TreasuryDashboard />

      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transactions">All Transactions</TabsTrigger>
          <TabsTrigger value="history">Daily History</TabsTrigger>
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
