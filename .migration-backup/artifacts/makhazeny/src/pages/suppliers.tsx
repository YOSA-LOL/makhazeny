import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SupplierForm } from '@/components/suppliers/supplier-form'
import { SupplierList } from '@/components/suppliers/supplier-list'
import { PageHeader } from '@/components/ui/page-header'
import { useLanguage } from '@/lib/i18n'

interface Supplier {
  id: string
  name: string
  phone?: string
  email?: string
  city?: string
  balance: number
}

export default function SuppliersPage() {
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | undefined>()
  const [refreshKey, setRefreshKey] = useState(0)
  const { t } = useLanguage()

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    document.getElementById('supplier-form')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSuccess = () => {
    setSelectedSupplier(undefined)
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Suppliers Management')}
        description={t('Manage supplier contacts and track purchase balances.')}
      />
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">{t('Suppliers List')}</TabsTrigger>
          <TabsTrigger value="form">{selectedSupplier ? t('Edit Supplier') : t('Add Supplier')}</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="space-y-4">
          <SupplierList key={refreshKey} onEdit={handleEdit} />
        </TabsContent>
        <TabsContent value="form" className="space-y-4">
          <div id="supplier-form">
            <SupplierForm supplier={selectedSupplier} onSuccess={handleSuccess} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
