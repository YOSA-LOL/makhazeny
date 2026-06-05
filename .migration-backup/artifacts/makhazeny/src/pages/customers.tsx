import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>()
  const [refreshKey, setRefreshKey] = useState(0)
  const { t } = useLanguage()

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer)
    document.getElementById('customer-form')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSuccess = () => {
    setSelectedCustomer(undefined)
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
          <TabsTrigger value="form">{selectedCustomer ? t('Edit Customer') : t('Add Customer')}</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="space-y-4">
          <CustomerList key={refreshKey} onEdit={handleEdit} />
        </TabsContent>
        <TabsContent value="form" className="space-y-4">
          <div id="customer-form">
            <CustomerForm customer={selectedCustomer} onSuccess={handleSuccess} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
