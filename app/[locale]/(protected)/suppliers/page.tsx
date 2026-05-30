'use client'
import { useTranslations } from 'next-intl'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SupplierForm } from '@/components/suppliers/supplier-form'
import { SupplierList } from '@/components/suppliers/supplier-list'
import { PageHeader } from '@/components/ui/page-header'

interface Supplier {
  id: string
  name: string
  phone?: string
  email?: string
  city?: string
  balance: number
}

export default function SuppliersPage() {
  const t = useTranslations('suppliers')

  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | undefined>()
  const [refreshKey, setRefreshKey] = useState(0)

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    // Scroll to form
    const formElement = document.getElementById('supplier-form')
    formElement?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSuccess = () => {
    setSelectedSupplier(undefined)
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('pageTitle')} description={t('pageDescription')} />

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">{t('suppliersList')}</TabsTrigger>
          <TabsTrigger value="form">{selectedSupplier ? t('titleEdit') : t('addSupplier')}</TabsTrigger>
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
