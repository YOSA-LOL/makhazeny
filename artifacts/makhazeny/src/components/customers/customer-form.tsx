import { apiFetch } from '@/lib/api'


import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/i18n'

interface Customer {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
  city?: string
  creditLimit: number
}

interface CustomerFormProps {
  customer?: Customer
  onSuccess?: () => void
}

export function CustomerForm({ customer, onSuccess }: CustomerFormProps) {
  const { t, te } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    creditLimit: '0',
  })

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        city: customer.city || '',
        creditLimit: String(customer.creditLimit),
      })
    }
  }, [customer])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const url = customer ? `/api/customers/${customer.id}` : '/api/customers'
      const method = customer ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          creditLimit: parseFloat(formData.creditLimit),
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(customer ? t('Customer updated successfully') : t('Customer created successfully'))
        onSuccess?.()
        if (!customer) {
          setFormData({
            name: '',
            phone: '',
            email: '',
            address: '',
            city: '',
            creditLimit: '0',
          })
        }
      } else {
        toast.error(result.error ? te(result.error) : t('Failed to save customer'))
      }
    } catch (error) {
      console.error('Failed to save customer:', error)
      toast.error(t('Failed to save customer'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{customer ? t('Edit Customer') : t('Add New Customer')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('Customer Name *')}</Label>
              <Input
                id="name"
                placeholder={t('Enter customer name')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t('Phone Number')}</Label>
              <Input
                id="phone"
                placeholder="+201001234567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('Email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="customer@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">{t('City')}</Label>
              <Input
                id="city"
                placeholder={t('Enter city')}
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">{t('Address')}</Label>
              <Input
                id="address"
                placeholder={t('Enter address')}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="creditLimit">{t('Credit Limit (EGP)')}</Label>
              <Input
                id="creditLimit"
                type="number"
                placeholder="0.00"
                step="0.01"
                value={formData.creditLimit}
                onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? t('Saving...') : customer ? t('Update Customer') : t('Create Customer')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
