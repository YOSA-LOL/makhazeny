import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { POSForm } from '@/components/sales/pos-form'
import { SalesList } from '@/components/sales/sales-list'
import { PageHeader } from '@/components/ui/page-header'
import { useLanguage } from '@/lib/i18n'

export default function SalesPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const { t } = useLanguage()

  const handleSuccess = () => setRefreshKey((prev) => prev + 1)

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Sales & POS System')}
        description={t('Process point-of-sale transactions and review sales history.')}
      />
      <Tabs defaultValue="pos" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pos">{t('Point of Sale (POS)')}</TabsTrigger>
          <TabsTrigger value="list">{t('Sales History')}</TabsTrigger>
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
