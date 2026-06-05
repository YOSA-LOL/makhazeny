import { apiFetch } from '@/lib/api'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

interface Category {
  id: string
  name: string
}

interface Supplier {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
  sku: string
  description?: string
  categoryId: string
  supplierId?: string | null
  purchasePrice: number
  sellingPrice: number
  quantity: number
  lowStockLevel: number
  barcode?: string
}

interface ProductFormProps {
  product?: Product
  onSuccess?: () => void
}

export function ProductForm({ product, onSuccess }: ProductFormProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [addCategoryOpen, setAddCategoryOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    categoryId: '',
    supplierId: '',
    purchasePrice: '',
    sellingPrice: '',
    quantity: '',
    lowStockLevel: '10',
    barcode: '',
  })

  useEffect(() => {
    fetchCategories()
    fetchSuppliers()
    if (product) {
      setFormData({
        name: product.name,
        sku: product.sku,
        description: product.description || '',
        categoryId: product.categoryId,
        supplierId: product.supplierId || '',
        purchasePrice: String(product.purchasePrice),
        sellingPrice: String(product.sellingPrice),
        quantity: String(product.quantity),
        lowStockLevel: String(product.lowStockLevel),
        barcode: product.barcode || '',
      })
    }
  }, [product])

  async function fetchCategories() {
    try {
      const response = await apiFetch('/api/categories')
      const result = await response.json()
      if (result.success) {
        setCategories(result.data)
        if (!product && result.data.length > 0) {
          setFormData((prev) => ({ ...prev, categoryId: result.data[0].id }))
        }
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  async function fetchSuppliers() {
    try {
      const response = await apiFetch('/api/suppliers')
      const result = await response.json()
      if (result.success) setSuppliers(result.data)
    } catch (error) {
      console.error('Failed to fetch suppliers:', error)
    }
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return
    setAddingCategory(true)
    try {
      const response = await apiFetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success('Category added successfully')
        await fetchCategories()
        setFormData((prev) => ({ ...prev, categoryId: result.data.id }))
        setAddCategoryOpen(false)
        setNewCategoryName('')
      } else {
        toast.error(result.error || 'Failed to add category')
      }
    } catch {
      toast.error('Failed to add category')
    } finally {
      setAddingCategory(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const url = product ? `/api/products/${product.id}` : '/api/products'
      const method = product ? 'PUT' : 'POST'

      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          supplierId: formData.supplierId || null,
          purchasePrice: parseFloat(formData.purchasePrice),
          sellingPrice: parseFloat(formData.sellingPrice),
          quantity: parseInt(formData.quantity),
          lowStockLevel: parseInt(formData.lowStockLevel),
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(product ? 'Product updated successfully' : 'Product created successfully')
        onSuccess?.()
        if (!product) {
          setFormData({
            name: '',
            sku: '',
            description: '',
            categoryId: categories[0]?.id || '',
            supplierId: '',
            purchasePrice: '',
            sellingPrice: '',
            quantity: '',
            lowStockLevel: '10',
            barcode: '',
          })
        }
      } else {
        toast.error(result.error || 'Failed to save product')
      }
    } catch (error) {
      console.error('Failed to save product:', error)
      toast.error('Failed to save product')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>{product ? 'Edit Product' : 'Add New Product'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                placeholder="Enter product name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU *</Label>
              <Input
                id="sku"
                placeholder="e.g., PROD-001"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                required
                disabled={!!product}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => {
                  if (value === '__add_new__') {
                    setAddCategoryOpen(true)
                  } else {
                    setFormData({ ...formData, categoryId: value })
                  }
                }}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="__add_new__">
                    <span className="flex items-center gap-1.5 text-primary font-medium">
                      <Plus className="h-3.5 w-3.5" />
                      Add New Category
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Select value={formData.supplierId || 'none'} onValueChange={(value) => setFormData({ ...formData, supplierId: value === 'none' ? '' : value })}>
                <SelectTrigger id="supplier">
                  <SelectValue placeholder="No supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No supplier</SelectItem>
                  {suppliers.map((sup) => (
                    <SelectItem key={sup.id} value={sup.id}>
                      {sup.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode</Label>
              <Input
                id="barcode"
                placeholder="Enter barcode"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Purchase Price (EGP) *</Label>
              <Input
                id="purchasePrice"
                type="number"
                placeholder="0.00"
                step="0.01"
                value={formData.purchasePrice}
                onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sellingPrice">Selling Price (EGP) *</Label>
              <Input
                id="sellingPrice"
                type="number"
                placeholder="0.00"
                step="0.01"
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Initial Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                placeholder="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lowStockLevel">Low Stock Level *</Label>
              <Input
                id="lowStockLevel"
                type="number"
                placeholder="10"
                value={formData.lowStockLevel}
                onChange={(e) => setFormData({ ...formData, lowStockLevel: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter product description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>

    <Dialog open={addCategoryOpen} onOpenChange={setAddCategoryOpen}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Add New Category</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Label htmlFor="new-category-name">Category Name</Label>
          <Input
            id="new-category-name"
            placeholder="e.g., Electronics"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory() } }}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setAddCategoryOpen(false); setNewCategoryName('') }}>
            Cancel
          </Button>
          <Button onClick={handleAddCategory} disabled={addingCategory || !newCategoryName.trim()}>
            {addingCategory ? 'Adding...' : 'Add Category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
