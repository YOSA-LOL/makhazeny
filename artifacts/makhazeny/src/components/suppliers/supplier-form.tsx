import { apiFetch } from '@/lib/api'


import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/i18n'

interface Supplier {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
  city?: string
}

interface SupplierFormProps {
  supplier?: Supplier
  onSuccess?: () => void
}

export function SupplierForm({ supplier, onSuccess }: SupplierFormProps) {
  const { t, te } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
  })

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name,
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        city: supplier.city || '',
      })
    }
  }, [supplier])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const url = supplier ? `/api/suppliers/${supplier.id}` : '/api/suppliers'
      const method = supplier ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(supplier ? t('Supplier updated successfully') : t('Supplier created successfully'))
        onSuccess?.()
        if (!supplier) {
          setFormData({
            name: '',
            phone: '',
            email: '',
            address: '',
            city: '',
          })
        }
      } else {
        toast.error(result.error ? te(result.error) : t('Failed to save supplier'))
      }
    } catch (error) {
      console.error('Failed to save supplier:', error)
      toast.error(t('Failed to save supplier'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{supplier ? t('Edit Supplier') : t('Add New Supplier')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('Supplier Name *')}</Label>
              <Input
                id="name"
                placeholder={t('Enter supplier name')}
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
                placeholder="supplier@example.com"
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

            <div className="space-y-2 col-span-2">
              <Label htmlFor="address">{t('Address')}</Label>
              <Input
                id="address"
                placeholder={t('Enter address')}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? t('Saving...') : supplier ? t('Update Supplier') : t('Create Supplier')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
