import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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
  const [editingSupplier, setEditingSupplier] = useState<Supplier | undefined>()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const { t } = useLanguage()

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setSheetOpen(true)
  }

  const handleEditSuccess = () => {
    setSheetOpen(false)
    setEditingSupplier(undefined)
    setRefreshKey((prev) => prev + 1)
  }

  const handleAddSuccess = () => {
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
          <TabsTrigger value="form">{t('Add Supplier')}</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="space-y-4">
          <SupplierList key={refreshKey} onEdit={handleEdit} />
        </TabsContent>
        <TabsContent value="form" className="space-y-4">
          <SupplierForm onSuccess={handleAddSuccess} />
        </TabsContent>
      </Tabs>

      <Sheet open={sheetOpen} onOpenChange={(open) => { setSheetOpen(open); if (!open) setEditingSupplier(undefined) }}>
        <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{t('Edit Supplier')}</SheetTitle>
          </SheetHeader>
          {editingSupplier && (
            <SupplierForm supplier={editingSupplier} onSuccess={handleEditSuccess} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
