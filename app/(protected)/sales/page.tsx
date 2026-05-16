'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { POSForm } from '@/components/sales/pos-form'
import { SalesList } from '@/components/sales/sales-list'
import { PageHeader } from '@/components/ui/page-header'

interface Sale {
  id: string
  saleNumber: string
  customer: { name: string }
  totalAmount: number
  paidAmount: number
  status: string
  paymentMethod: string
  createdAt: string
}

export default function SalesPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleSuccess = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales & POS System"
        description="Process point-of-sale transactions and review sales history."
      />

      <Tabs defaultValue="pos" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pos">Point of Sale (POS)</TabsTrigger>
          <TabsTrigger value="list">Sales History</TabsTrigger>
        </TabsList>

        <TabsContent value="pos" className="space-y-4">
          <POSForm onSuccess={handleSuccess} />
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <SalesList key={refreshKey} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
