'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProductForm } from '@/components/products/product-form'
import { ProductList } from '@/components/products/product-list'
import { PageHeader } from '@/components/ui/page-header'

interface Product {
  id: string
  name: string
  sku: string
  quantity: number
  sellingPrice: number
  purchasePrice: number
  category: { name: string }
  lowStockLevel: number
}

export default function ProductsPage() {
  const t = useTranslations('products')
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>()
  const [refreshKey, setRefreshKey] = useState(0)

  const handleEdit = (product: Product) => {
    setSelectedProduct(product)
    const formElement = document.getElementById('product-form')
    formElement?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSuccess = () => {
    setSelectedProduct(undefined)
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('pageTitle')} description={t('pageDescription')} />

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">{t('productsList')}</TabsTrigger>
          <TabsTrigger value="form">
            {selectedProduct ? t('editProduct') : t('addProduct')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <ProductList key={refreshKey} onEdit={handleEdit} />
        </TabsContent>

        <TabsContent value="form" className="space-y-4">
          <div id="product-form">
            <ProductForm product={selectedProduct} onSuccess={handleSuccess} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
