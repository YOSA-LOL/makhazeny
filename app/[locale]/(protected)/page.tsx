'use client'

import { useEffect, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Package,
  ShoppingCart,
  Wallet,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard, StatCardSkeleton } from '@/components/ui/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { NUMBER_FORMATS } from '@/lib/constants'
import { toast } from 'sonner'

interface DashboardStats {
  currentBalance: number
  weekIncome: number
  weekExpenses: number
  totalProducts: number
  lowStockCount: number
  pendingReturns: number
  activeDebts: number
}

export default function DashboardPage() {
  const t = useTranslations('dashboard')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [summaryRes, productsRes, returnsRes, debtsRes] = await Promise.all([
          fetch('/api/treasury/summary?days=7'),
          fetch('/api/products'),
          fetch('/api/returns'),
          fetch('/api/debts'),
        ])

        const [summary, products, returns, debts] = await Promise.all([
          summaryRes.json(),
          productsRes.json(),
          returnsRes.json(),
          debtsRes.json(),
        ])

        const productList = products.success ? products.data : []
        const returnList = returns.success ? returns.data : []
        const debtList = debts.success ? debts.data : []

        setStats({
          currentBalance: summary.success ? summary.data.currentBalance : 0,
          weekIncome: summary.success ? summary.data.totals.totalIncome : 0,
          weekExpenses: summary.success ? summary.data.totals.totalExpenses : 0,
          totalProducts: productList.length,
          lowStockCount: productList.filter(
            (p: { quantity: number; lowStockLevel: number }) => p.quantity <= p.lowStockLevel
          ).length,
          pendingReturns: returnList.filter((r: { status: string }) => r.status === 'PENDING').length,
          activeDebts: debtList.filter((d: { status: string }) => d.status !== 'PAID').length,
        })
      } catch {
        toast.error(t('failedLoad'))
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [t])

  const formatCurrency = (value: number) => NUMBER_FORMATS.CURRENCY.format(value)

  const quickLinks = [
    { href: '/products', label: t('viewProducts'), icon: Package },
    { href: '/sales', label: t('viewSales'), icon: ShoppingCart },
    { href: '/treasury', label: t('viewTreasury'), icon: Wallet },
    { href: '/reports', label: t('viewReports'), icon: BarChart3 },
  ] as const

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : stats ? (
          <>
            <StatCard
              label={t('currentBalance')}
              value={formatCurrency(stats.currentBalance)}
              subtitle={t('currentBalanceSubtitle')}
              icon={Wallet}
              tone="info"
            />
            <StatCard
              label={t('weekIncome')}
              value={formatCurrency(stats.weekIncome)}
              subtitle={t('weekIncomeSubtitle')}
              icon={ShoppingCart}
              tone="success"
            />
            <StatCard
              label={t('weekExpenses')}
              value={formatCurrency(stats.weekExpenses)}
              subtitle={t('weekExpensesSubtitle')}
              icon={Wallet}
              tone="warning"
            />
            <StatCard
              label={t('totalProducts')}
              value={stats.totalProducts}
              subtitle={t('totalProductsSubtitle')}
              icon={Package}
            />
            <StatCard
              label={t('lowStock')}
              value={stats.lowStockCount}
              subtitle={t('lowStockSubtitle')}
              icon={Package}
              tone={stats.lowStockCount > 0 ? 'warning' : 'success'}
            />
            <StatCard
              label={t('pendingReturns')}
              value={stats.pendingReturns}
              subtitle={t('pendingReturnsSubtitle')}
              icon={AlertCircle}
              tone={stats.pendingReturns > 0 ? 'warning' : 'default'}
            />
            <StatCard
              label={t('activeDebts')}
              value={stats.activeDebts}
              subtitle={t('activeDebtsSubtitle')}
              icon={AlertCircle}
              tone={stats.activeDebts > 0 ? 'danger' : 'success'}
            />
          </>
        ) : null}
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{t('quickActions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickLinks.map(({ href, label, icon: Icon }) => (
              <Button key={href} variant="outline" className="h-auto justify-between py-3" asChild>
                <Link href={href}>
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    {label}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
