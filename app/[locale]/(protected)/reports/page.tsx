'use client'
import { useTranslations } from 'next-intl'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Download } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import type { StatTone } from '@/lib/status-styles'

function ReportStatsGrid({
  stats,
}: {
  stats: { label: string; value: React.ReactNode; tone?: StatTone }[]
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <StatCard key={stat.label} label={stat.label} value={stat.value} tone={stat.tone} />
      ))}
    </div>
  )
}

interface Report {
  type: string
  data: any
  generatedAt: string
}

export default function ReportsPage() {
  const t = useTranslations('reports')
  const tc = useTranslations('common')

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [reports, setReports] = useState<Report[]>([])

  const handleGenerateReport = async (reportType: string) => {
    if (!startDate || !endDate) {
      toast.error(t('selectDates'))
      return
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error(t('startBeforeEnd'))
      return
    }

    setLoading(true)

    try {
      const response = await fetch(
        `/api/reports?type=${reportType}&startDate=${startDate}&endDate=${endDate}`
      )
      const result = await response.json()

      if (result.success) {
        setReports([
          ...reports.filter((r) => r.type !== reportType),
          {
            type: reportType,
            data: result.data,
            generatedAt: new Date().toLocaleString('ar-EG'),
          },
        ])
        toast.success(t('generatedSuccess', { reportType }))
      } else {
        toast.error(result.error || t('failedGenerate'))
      }
    } catch (error) {
      console.error('Failed to generate report:', error)
      toast.error(t('failedGenerate'))
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: any) => {
    const num = typeof value === 'object' ? parseFloat(value.toString()) : value
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
    }).format(num)
  }

  const exportReportAsCSV = (reportType: string) => {
    const report = reports.find((r) => r.type === reportType)
    if (!report) return

    let csv = `${reportType.toUpperCase()} REPORT\n`
    csv += `Generated: ${report.generatedAt}\n\n`

    const data = report.data
    Object.entries(data).forEach(([key, value]: [string, any]) => {
      if (typeof value === 'object' && Array.isArray(value)) {
        csv += `\n${key}:\n`
        if (value.length > 0 && typeof value[0] === 'object') {
          csv += Object.keys(value[0]).join(',') + '\n'
          value.forEach((item) => {
            csv += Object.values(item).join(',') + '\n'
          })
        }
      } else if (typeof value === 'object' && value !== null) {
        csv += `${key}:\n`
        Object.entries(value).forEach(([k, v]) => {
          csv += `${k},${v}\n`
        })
      } else {
        csv += `${key},${value}\n`
      }
    })

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('pageTitle')} description={t('pageDescription')} />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{t('generateTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">{tc('startDate')}</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">{tc('endDate')}</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Button
              onClick={() => handleGenerateReport('sales')}
              disabled={loading}
              variant="outline"
            >
              {t('salesReport')}
            </Button>
            <Button
              onClick={() => handleGenerateReport('products')}
              disabled={loading}
              variant="outline"
            >
              {t('productsReport')}
            </Button>
            <Button
              onClick={() => handleGenerateReport('customers')}
              disabled={loading}
              variant="outline"
            >
              {t('customersReport')}
            </Button>
            <Button
              onClick={() => handleGenerateReport('debts')}
              disabled={loading}
              variant="outline"
            >
              {t('debtsReport')}
            </Button>
            <Button
              onClick={() => handleGenerateReport('inventory')}
              disabled={loading}
              variant="outline"
            >
              {t('inventoryReport')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports Display */}
      {reports.length > 0 && (
        <Tabs defaultValue={reports[0]?.type} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            {reports.map((report) => (
              <TabsTrigger key={report.type} value={report.type}>
                {report.type}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Sales Report */}
          {reports.find((r) => r.type === 'sales') && (
            <TabsContent value="sales">
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{t('salesReportTitle')}</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportReportAsCSV('sales')}
                  >
                    <Download className="h-4 w-4 me-2" />
                    {tc('export')}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ReportStatsGrid
                    stats={[
                      { label: t('totalSales'), value: reports.find((r) => r.type === 'sales')?.data?.totalSales || 0, tone: 'info' },
                      { label: t('totalRevenue'), value: formatCurrency(reports.find((r) => r.type === 'sales')?.data?.totalAmount || 0), tone: 'success' },
                      { label: t('paid'), value: formatCurrency(reports.find((r) => r.type === 'sales')?.data?.totalPaid || 0), tone: 'default' },
                      { label: t('unpaid'), value: formatCurrency(reports.find((r) => r.type === 'sales')?.data?.totalUnpaid || 0), tone: 'warning' },
                    ]}
                  />

                  {reports.find((r) => r.type === 'sales')?.data?.topProducts && (
                    <div className="mt-6">
                      <h4 className="mb-3 font-semibold">{t('topProducts')}</h4>
                      <div className="space-y-2">
                        {reports.find((r) => r.type === 'sales')?.data?.topProducts?.map((product: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center p-2 bg-muted rounded">
                            <span>{product.name}</span>
                            <div className="text-end">
                              <p className="text-sm">{tc('qtyPrefix', { quantity: product.quantity })}</p>
                              <p className="font-medium">{formatCurrency(product.revenue)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Products Report */}
          {reports.find((r) => r.type === 'products') && (
            <TabsContent value="products">
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{t('productsReportTitle')}</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportReportAsCSV('products')}
                  >
                    <Download className="h-4 w-4 me-2" />
                    {tc('export')}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ReportStatsGrid
                    stats={[
                      { label: t('totalProducts'), value: reports.find((r) => r.type === 'products')?.data?.totalProducts || 0, tone: 'info' },
                      { label: t('lowStock'), value: reports.find((r) => r.type === 'products')?.data?.lowStockCount || 0, tone: 'warning' },
                      { label: t('outOfStock'), value: reports.find((r) => r.type === 'products')?.data?.outOfStockCount || 0, tone: 'danger' },
                      { label: t('inventoryValue'), value: formatCurrency(reports.find((r) => r.type === 'products')?.data?.totalInventoryValue || 0), tone: 'success' },
                    ]}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Customers Report */}
          {reports.find((r) => r.type === 'customers') && (
            <TabsContent value="customers">
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{t('customersReportTitle')}</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportReportAsCSV('customers')}
                  >
                    <Download className="h-4 w-4 me-2" />
                    {tc('export')}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ReportStatsGrid
                    stats={[
                      { label: t('totalCustomers'), value: reports.find((r) => r.type === 'customers')?.data?.totalCustomers || 0, tone: 'info' },
                      { label: t('withDebt'), value: reports.find((r) => r.type === 'customers')?.data?.customersWithDebt || 0, tone: 'warning' },
                      { label: t('totalDebt'), value: formatCurrency(reports.find((r) => r.type === 'customers')?.data?.totalOutstandingDebt || 0), tone: 'danger' },
                      { label: t('overdue'), value: formatCurrency(reports.find((r) => r.type === 'customers')?.data?.overdueDebt || 0), tone: 'danger' },
                    ]}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Debts Report */}
          {reports.find((r) => r.type === 'debts') && (
            <TabsContent value="debts">
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{t('debtsReportTitle')}</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportReportAsCSV('debts')}
                  >
                    <Download className="h-4 w-4 me-2" />
                    {tc('export')}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ReportStatsGrid
                    stats={[
                      { label: t('totalDebts'), value: reports.find((r) => r.type === 'debts')?.data?.totalDebts || 0, tone: 'info' },
                      { label: t('totalPaid'), value: formatCurrency(reports.find((r) => r.type === 'debts')?.data?.totalPaid || 0), tone: 'success' },
                      { label: t('stillUnpaid'), value: formatCurrency(reports.find((r) => r.type === 'debts')?.data?.totalRemaining || 0), tone: 'danger' },
                      { label: t('paymentRate'), value: parseFloat(reports.find((r) => r.type === 'debts')?.data?.paymentRate || 0).toFixed(1) + '%', tone: 'default' },
                    ]}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Inventory Report */}
          {reports.find((r) => r.type === 'inventory') && (
            <TabsContent value="inventory">
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{t('inventoryReportTitle')}</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportReportAsCSV('inventory')}
                  >
                    <Download className="h-4 w-4 me-2" />
                    {tc('export')}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="mb-3 font-semibold">{t('fastMoving')}</h4>
                      <div className="space-y-2">
                        {reports.find((r) => r.type === 'inventory')?.data?.fastMovingProducts?.slice(0, 5)?.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center p-2 bg-success/10 rounded border border-success/20">
                            <span>{item[0]}</span>
                            <span className="text-sm">{item[1].out} units</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="mb-3 font-semibold">{t('slowMoving')}</h4>
                      <div className="space-y-2">
                        {reports.find((r) => r.type === 'inventory')?.data?.slowMovingProducts?.slice(0, 5)?.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center p-2 bg-destructive/10 rounded border border-destructive/20">
                            <span>{item[0]}</span>
                            <span className="text-sm">{tc('noSales')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  )
}
