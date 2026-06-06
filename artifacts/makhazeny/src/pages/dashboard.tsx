import { useEffect, useState } from 'react'
import {
  Package, Users, ShoppingCart, AlertCircle,
  TrendingUp, AlertTriangle, ArrowRight, Banknote,
  Activity,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { StatCard, StatCardSkeleton } from '@/components/ui/stat-card'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { Link } from 'wouter'
import { apiFetch } from '@/lib/api'
import { useLanguage, type Lang } from '@/lib/i18n'
import { getLocale } from '@/lib/format'

interface DashboardData {
  products: { total: number; lowStock: number; outOfStock: number }
  customers: { total: number; withDebt: number }
  sales: { total: number; totalRevenue: number; todayRevenue: number }
  debts: { total: number; totalRemaining: number; overdue: number }
  recentSales: Array<{
    id: string; saleNumber: string
    customer: { name: string }
    totalAmount: number; status: string; createdAt: string
  }>
  lowStockProducts: Array<{
    id: string; name: string; sku: string
    quantity: number; lowStockLevel: number
  }>
  revenueTrend: Array<{ day: string; revenue: number; sales: number }>
}

const statusColor: Record<string, string> = {
  PAID: 'bg-success/10 text-success border-success/20',
  PARTIAL: 'bg-warning/10 text-warning border-warning/20',
  UNPAID: 'bg-destructive/10 text-destructive border-destructive/20',
}

function generateRevenueTrend(sales: Array<{ createdAt: string; totalAmount: number }>, lang: Lang) {
  const locale = getLocale(lang)
  const days: Record<string, { revenue: number; sales: number }> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric' })
    days[key] = { revenue: 0, sales: 0 }
  }
  for (const sale of sales) {
    const d = new Date(sale.createdAt)
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
    if (diff <= 6) {
      const key = d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric' })
      if (days[key]) {
        days[key].revenue += sale.totalAmount
        days[key].sales += 1
      }
    }
  }
  return Object.entries(days).map(([day, v]) => ({ day, ...v }))
}

function RevenueTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  const { formatCurrency } = useLanguage()
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background p-2.5 shadow-md text-xs">
      <p className="font-semibold mb-1 text-foreground">{label}</p>
      <p className="text-muted-foreground">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

function SalesTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  const { t } = useLanguage()
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background p-2.5 shadow-md text-xs">
      <p className="font-semibold mb-1 text-foreground">{label}</p>
      <p className="text-muted-foreground">{payload[0].value} {t('orders')}</p>
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const { t, lang, formatCurrency } = useLanguage()

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [productsRes, customersRes, salesRes, debtsRes] = await Promise.all([
          apiFetch('/api/products?limit=1000'),
          apiFetch('/api/customers?limit=1000'),
          apiFetch('/api/sales?limit=1000'),
          apiFetch('/api/debts?limit=1000'),
        ])
        const [productsData, customersData, salesData, debtsData] = await Promise.all([
          productsRes.json(),
          customersRes.json(),
          salesRes.json(),
          debtsRes.json(),
        ])

        const products = productsData.data || []
        const customers = customersData.data || []
        const sales = salesData.data || []
        const debts = debtsData.data || []
        const today = new Date().toISOString().split('T')[0]

        setData({
          products: {
            total: products.length,
            lowStock: products.filter((p: { quantity: number; lowStockLevel: number }) =>
              p.quantity <= p.lowStockLevel && p.quantity > 0).length,
            outOfStock: products.filter((p: { quantity: number }) => p.quantity === 0).length,
          },
          customers: {
            total: customers.length,
            withDebt: customers.filter((c: { totalDebt: number }) => c.totalDebt > 0).length,
          },
          sales: {
            total: sales.length,
            totalRevenue: sales.reduce((s: number, sale: { totalAmount: number }) => s + sale.totalAmount, 0),
            todayRevenue: sales
              .filter((sale: { createdAt: string }) => sale.createdAt?.startsWith(today))
              .reduce((s: number, sale: { totalAmount: number }) => s + sale.totalAmount, 0),
          },
          debts: {
            total: debts.length,
            totalRemaining: debts.reduce((s: number, d: { remainingAmount: number }) => s + d.remainingAmount, 0),
            overdue: debts.filter((d: { dueDate?: string; status: string }) =>
              d.dueDate && new Date(d.dueDate) < new Date() && d.status !== 'PAID').length,
          },
          recentSales: sales.slice(0, 6),
          lowStockProducts: products
            .filter((p: { quantity: number; lowStockLevel: number }) => p.quantity <= p.lowStockLevel)
            .slice(0, 5),
          revenueTrend: generateRevenueTrend(sales, lang),
        })
      } catch (err) {
        console.error('Dashboard load error:', err)
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [lang])

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Dashboard')}
        description={t('Live overview of your warehouse operations.')}
        actions={
          <Link href="/sales">
            <Button size="sm" className="gap-1.5">
              <ShoppingCart className="h-3.5 w-3.5" />
              {t('New Sale')}
            </Button>
          </Link>
        }
      />

      {/* Stat cards */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={t('Total Products')}
            value={data?.products.total ?? 0}
            subtitle={`${data?.products.lowStock} ${t('low stock')} · ${data?.products.outOfStock} ${t('out')}`}
            icon={Package}
            tone="info"
          />
          <StatCard
            label={t('Customers')}
            value={data?.customers.total ?? 0}
            subtitle={`${data?.customers.withDebt} ${t('with outstanding debt')}`}
            icon={Users}
            tone="default"
          />
          <StatCard
            label={t('Total Sales')}
            value={formatCurrency(data?.sales.totalRevenue ?? 0)}
            subtitle={`${data?.sales.total ?? 0} ${t('transactions')}`}
            icon={ShoppingCart}
            tone="success"
          />
          <StatCard
            label={t('Outstanding Debts')}
            value={formatCurrency(data?.debts.totalRemaining ?? 0)}
            subtitle={`${data?.debts.overdue} ${t('overdue')}`}
            icon={AlertCircle}
            tone={data?.debts.overdue ? 'danger' : 'warning'}
          />
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  {t('Revenue — Last 7 Days')}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {t('All time total')}: {formatCurrency(data?.sales.totalRevenue ?? 0)}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-52 bg-muted/50 rounded-lg animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data?.revenueTrend ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.45 0.12 250)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="oklch(0.45 0.12 250)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : String(v)} />
                  <Tooltip content={<RevenueTooltip />} />
                  <Area
                    type="monotone" dataKey="revenue"
                    stroke="oklch(0.45 0.12 250)" strokeWidth={2}
                    fill="url(#revenueGrad)"
                    dot={{ r: 3, fill: 'oklch(0.45 0.12 250)', strokeWidth: 0 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Banknote className="h-4 w-4 text-success" />
              {t('Orders / Day')}
            </CardTitle>
            <CardDescription className="text-xs">{t('Sales volume last 7 days')}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-52 bg-muted/50 rounded-lg animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data?.revenueTrend ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<SalesTooltip />} />
                  <Bar dataKey="sales" fill="oklch(0.55 0.15 150)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Sales */}
        <Card className="shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              {t('Recent Sales')}
            </CardTitle>
            <Link href="/sales">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground">
                {t('View all')} <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {!data?.recentSales?.length ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ShoppingCart className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">{t('No sales yet.')}</p>
              </div>
            ) : (
              <div className="divide-y">
                {data.recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium">{sale.saleNumber}</p>
                      <p className="text-xs text-muted-foreground">{sale.customer?.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums">{formatCurrency(sale.totalAmount)}</span>
                      <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 ${statusColor[sale.status] ?? 'bg-muted text-muted-foreground border-border'}`}>
                        {t(sale.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock */}
        <Card className="shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              {t('Low Stock Alerts')}
            </CardTitle>
            <Link href="/products">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground">
                {t('Manage')} <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {!data?.lowStockProducts?.length ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Package className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">{t('All stock levels are healthy!')}</p>
              </div>
            ) : (
              <div className="divide-y">
                {data.lowStockProducts.map((product) => {
                  const pct = product.lowStockLevel > 0
                    ? Math.min(100, Math.round((product.quantity / (product.lowStockLevel * 2)) * 100))
                    : 0
                  return (
                    <div key={product.id} className="py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <p className="text-sm font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.sku}</p>
                        </div>
                        <Badge variant={product.quantity === 0 ? 'destructive' : 'secondary'} className="text-xs">
                          {product.quantity === 0 ? t('Out of stock') : `${product.quantity} ${t('left')}`}
                        </Badge>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${product.quantity === 0 ? 'bg-destructive' : 'bg-warning'}`}
                          style={{ width: `${Math.max(4, pct)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
