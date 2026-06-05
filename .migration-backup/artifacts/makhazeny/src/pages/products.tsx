import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProductForm } from '@/components/products/product-form'
import { ProductList } from '@/components/products/product-list'
import { PageHeader } from '@/components/ui/page-header'
import { useLanguage } from '@/lib/i18n'

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
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>()
  const [refreshKey, setRefreshKey] = useState(0)
  const { t } = useLanguage()

  const handleEdit = (product: Product) => {
    setSelectedProduct(product)
    document.getElementById('product-form')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSuccess = () => {
    setSelectedProduct(undefined)
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Products Management')}
        description={t('Manage inventory, pricing, and stock levels for all warehouse products.')}
      />
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">{t('Products List')}</TabsTrigger>
          <TabsTrigger value="form">{selectedProduct ? t('Edit Product') : t('Add Product')}</TabsTrigger>
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
