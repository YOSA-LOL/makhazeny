import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { CustomerForm } from '@/components/customers/customer-form'
import { CustomerList } from '@/components/customers/customer-list'
import { PageHeader } from '@/components/ui/page-header'
import { useLanguage } from '@/lib/i18n'

interface Customer {
  id: string
  name: string
  phone?: string
  email?: string
  city?: string
  creditLimit: number
  totalDebt: number
}

export default function CustomersPage() {
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const { t } = useLanguage()

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setSheetOpen(true)
  }

  const handleEditSuccess = () => {
    setSheetOpen(false)
    setEditingCustomer(undefined)
    setRefreshKey((prev) => prev + 1)
  }

  const handleAddSuccess = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Customers Management')}
        description={t('Manage customer profiles, credit limits, and outstanding balances.')}
      />
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">{t('Customers List')}</TabsTrigger>
          <TabsTrigger value="form">{t('Add Customer')}</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="space-y-4">
          <CustomerList key={refreshKey} onEdit={handleEdit} />
        </TabsContent>
        <TabsContent value="form" className="space-y-4">
          <CustomerForm onSuccess={handleAddSuccess} />
        </TabsContent>
      </Tabs>

      <Sheet open={sheetOpen} onOpenChange={(open) => { setSheetOpen(open); if (!open) setEditingCustomer(undefined) }}>
        <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{t('Edit Customer')}</SheetTitle>
          </SheetHeader>
          {editingCustomer && (
            <CustomerForm customer={editingCustomer} onSuccess={handleEditSuccess} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
