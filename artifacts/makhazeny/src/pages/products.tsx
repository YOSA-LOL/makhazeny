import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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
  categoryId: string
  category: { name: string }
  supplier: { id: string; name: string } | null
  supplierId: string | null
  lowStockLevel: number
  description?: string
  barcode?: string
}

export default function ProductsPage() {
  const [editingProduct, setEditingProduct] = useState<Product | undefined>()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const { t } = useLanguage()

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setSheetOpen(true)
  }

  const handleEditSuccess = () => {
    setSheetOpen(false)
    setEditingProduct(undefined)
    setRefreshKey((prev) => prev + 1)
  }

  const handleAddSuccess = () => {
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
          <TabsTrigger value="form">{t('Add Product')}</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="space-y-4">
          <ProductList key={refreshKey} onEdit={handleEdit} />
        </TabsContent>
        <TabsContent value="form" className="space-y-4">
          <ProductForm onSuccess={handleAddSuccess} />
        </TabsContent>
      </Tabs>

      <Sheet open={sheetOpen} onOpenChange={(open) => { setSheetOpen(open); if (!open) setEditingProduct(undefined) }}>
        <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{t('Edit Product')}</SheetTitle>
          </SheetHeader>
          {editingProduct && (
            <ProductForm product={editingProduct} onSuccess={handleEditSuccess} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
