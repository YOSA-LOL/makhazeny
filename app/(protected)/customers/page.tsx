'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CustomerForm } from '@/components/customers/customer-form'
import { CustomerList } from '@/components/customers/customer-list'
import { PageHeader } from '@/components/ui/page-header'

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

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer)
    // Scroll to form
    const formElement = document.getElementById('customer-form')
    formElement?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSuccess = () => {
    setSelectedCustomer(undefined)
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers Management"
        description="Manage customer profiles, credit limits, and outstanding balances."
      />

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Customers List</TabsTrigger>
          <TabsTrigger value="form">{selectedCustomer ? 'Edit Customer' : 'Add Customer'}</TabsTrigger>
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
