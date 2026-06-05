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
import { useLanguage } from '@/lib/i18n'
import { apiFetch } from '@/lib/api'

function ReportStatsGrid({ stats }: { stats: { label: string; value: React.ReactNode; tone?: StatTone }[] }) {
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
  data: Record<string, unknown>
  generatedAt: string
}

const formatCurrency = (value: unknown) => {
  const num = typeof value === 'object' ? parseFloat(String(value)) : Number(value)
  return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(num)
}

const REPORT_TYPES = ['sales', 'products', 'customers', 'debts', 'inventory'] as const

export default function ReportsPage() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [reports, setReports] = useState<Report[]>([])
  const { t } = useLanguage()

  const handleGenerateReport = async (reportType: string) => {
    if (!startDate || !endDate) { toast.error('Please select start and end dates'); return }
    if (new Date(startDate) > new Date(endDate)) { toast.error('Start date must be before end date'); return }
    setLoading(true)
    try {
      const res = await apiFetch(`/api/reports?type=${reportType}&startDate=${startDate}&endDate=${endDate}`)
      const result = await res.json()
      if (result.success) {
        setReports([...reports.filter((r) => r.type !== reportType), { type: reportType, data: result.data, generatedAt: new Date().toLocaleString('en-GB') }])
        toast.success(`${reportType} report generated`)
      } else {
        toast.error(result.error || 'Failed to generate report')
      }
    } catch { toast.error('Failed to generate report') } finally { setLoading(false) }
  }

  const exportReportAsCSV = (reportType: string) => {
    const report = reports.find((r) => r.type === reportType)
    if (!report) return
    let csv = `${reportType.toUpperCase()} REPORT\nGenerated: ${report.generatedAt}\n\n`
    Object.entries(report.data).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        csv += `\n${key}:\n`
        if (value.length > 0 && typeof value[0] === 'object') {
          csv += Object.keys(value[0] as object).join(',') + '\n'
          value.forEach((item) => { csv += Object.values(item as object).join(',') + '\n' })
        }
      } else if (typeof value === 'object' && value !== null) {
        csv += `${key}:\n`
        Object.entries(value as object).forEach(([k, v]) => { csv += `${k},${v}\n` })
      } else { csv += `${key},${value}\n` }
    })
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const salesReport = reports.find((r) => r.type === 'sales')
  const productsReport = reports.find((r) => r.type === 'products')
  const customersReport = reports.find((r) => r.type === 'customers')
  const debtsReport = reports.find((r) => r.type === 'debts')
  const inventoryReport = reports.find((r) => r.type === 'inventory')

  return (
    <div className="space-y-6">
      <PageHeader title={t('Reports & Analytics')} description={t('Generate sales, inventory, customer, and debt reports for any date range.')} />
      <Card className="shadow-sm">
        <CardHeader><CardTitle>{t('Generate Reports')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">{t('Start Date')}</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">{t('End Date')}</Label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {REPORT_TYPES.map((type) => (
              <Button key={type} onClick={() => handleGenerateReport(type)} disabled={loading} variant="outline">
                {t(type.charAt(0).toUpperCase() + type.slice(1))} {t('Report')}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {reports.length > 0 && (
        <Tabs defaultValue={reports[0]?.type} className="w-full">
          <TabsList className={`grid w-full grid-cols-${reports.length}`}>
            {reports.map((r) => <TabsTrigger key={r.type} value={r.type}>{t(r.type)}</TabsTrigger>)}
          </TabsList>

          {salesReport && (
            <TabsContent value="sales">
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{t('Sales Report')}</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => exportReportAsCSV('sales')}><Download className="h-4 w-4 me-2" />{t('Export')}</Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ReportStatsGrid stats={[
                    { label: t('Total Sales'), value: salesReport.data.totalSales as number || 0, tone: 'info' },
                    { label: t('Total Revenue'), value: formatCurrency(salesReport.data.totalAmount || 0), tone: 'success' },
                    { label: t('Paid'), value: formatCurrency(salesReport.data.totalPaid || 0), tone: 'default' },
                    { label: t('Unpaid'), value: formatCurrency(salesReport.data.totalUnpaid || 0), tone: 'warning' },
                  ]} />
                  {Array.isArray(salesReport.data.topProducts) && (
                    <div className="mt-6">
                      <h4 className="font-semibold mb-3">{t('Top 10 Products')}</h4>
                      <div className="space-y-2">
                        {(salesReport.data.topProducts as Array<{ name: string; quantity: number; revenue: number }>).map((product, idx) => (
                          <div key={idx} className="flex justify-between items-center p-2 bg-muted rounded">
                            <span>{product.name}</span>
                            <div className="text-end">
                              <p className="text-sm">Qty: {product.quantity}</p>
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

          {productsReport && (
            <TabsContent value="products">
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{t('Products Report')}</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => exportReportAsCSV('products')}><Download className="h-4 w-4 me-2" />{t('Export')}</Button>
                </CardHeader>
                <CardContent>
                  <ReportStatsGrid stats={[
                    { label: t('Total Products'), value: productsReport.data.totalProducts as number || 0, tone: 'info' },
                    { label: t('Low Stock'), value: productsReport.data.lowStockCount as number || 0, tone: 'warning' },
                    { label: t('Out of Stock'), value: productsReport.data.outOfStockCount as number || 0, tone: 'danger' },
                    { label: t('Inventory Value'), value: formatCurrency(productsReport.data.totalInventoryValue || 0), tone: 'success' },
                  ]} />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {customersReport && (
            <TabsContent value="customers">
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{t('Customers Report')}</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => exportReportAsCSV('customers')}><Download className="h-4 w-4 me-2" />{t('Export')}</Button>
                </CardHeader>
                <CardContent>
                  <ReportStatsGrid stats={[
                    { label: t('Total Customers'), value: customersReport.data.totalCustomers as number || 0, tone: 'info' },
                    { label: t('With Debt'), value: customersReport.data.customersWithDebt as number || 0, tone: 'warning' },
                    { label: t('Total Debt'), value: formatCurrency(customersReport.data.totalOutstandingDebt || 0), tone: 'danger' },
                    { label: t('Overdue'), value: formatCurrency(customersReport.data.overdueDebt || 0), tone: 'danger' },
                  ]} />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {debtsReport && (
            <TabsContent value="debts">
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{t('Debts Report')}</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => exportReportAsCSV('debts')}><Download className="h-4 w-4 me-2" />{t('Export')}</Button>
                </CardHeader>
                <CardContent>
                  <ReportStatsGrid stats={[
                    { label: t('Total Debts'), value: debtsReport.data.totalDebts as number || 0, tone: 'info' },
                    { label: t('Total Paid'), value: formatCurrency(debtsReport.data.totalPaid || 0), tone: 'success' },
                    { label: t('Still Unpaid'), value: formatCurrency(debtsReport.data.totalRemaining || 0), tone: 'danger' },
                    { label: t('Payment Rate'), value: `${parseFloat(String(debtsReport.data.paymentRate || 0)).toFixed(1)}%`, tone: 'default' },
                  ]} />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {inventoryReport && (
            <TabsContent value="inventory">
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{t('Inventory Report')}</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => exportReportAsCSV('inventory')}><Download className="h-4 w-4 me-2" />{t('Export')}</Button>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-3">{t('Fast Moving Products')}</h4>
                      <div className="space-y-2">
                        {(inventoryReport.data.fastMovingProducts as Array<[string, { out: number }]>)?.slice(0, 5)?.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center p-2 bg-success/10 rounded border border-success/20">
                            <span>{item[0]}</span>
                            <span className="text-sm">{item[1].out} {t('units')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3">{t('Slow Moving Products')}</h4>
                      <div className="space-y-2">
                        {(inventoryReport.data.slowMovingProducts as Array<[string, unknown]>)?.slice(0, 5)?.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center p-2 bg-destructive/10 rounded border border-destructive/20">
                            <span>{item[0]}</span>
                            <span className="text-sm">{t('No sales')}</span>
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
