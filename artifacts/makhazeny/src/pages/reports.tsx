import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Download, Printer, Calendar } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import type { StatTone } from '@/lib/status-styles'
import { useLanguage } from '@/lib/i18n'
import { PAYMENT_METHODS } from '@/lib/constants'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'
import { printHtml } from '@/lib/print'

function ReportStatsGrid({ stats }: { stats: { label: string; value: React.ReactNode; tone?: StatTone }[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <StatCard key={stat.label} label={stat.label} value={stat.value} tone={stat.tone} />
      ))}
    </div>
  )
}

interface SaleRow {
  id: string
  saleNumber: string
  createdAt: string
  customerName: string
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  status: string
  paymentMethod: string
  itemCount: number
}

interface Report {
  type: string
  data: Record<string, unknown>
  generatedAt: string
  startDate: string
  endDate: string
}

const PAYMENT_LABELS: Record<string, string> = { ...PAYMENT_METHODS }

const STATUS_STYLE: Record<string, string> = {
  PAID: 'text-green-600 bg-green-50 border-green-200',
  PARTIAL: 'text-amber-600 bg-amber-50 border-amber-200',
  PENDING: 'text-red-600 bg-red-50 border-red-200',
}

const REPORT_TYPES = ['sales', 'products', 'customers', 'debts', 'inventory'] as const

export default function ReportsPage() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [reports, setReports] = useState<Report[]>([])
  const { t, te, formatCurrency, formatDate } = useLanguage()

  function setToday() {
    const today = new Date().toISOString().split('T')[0]
    setStartDate(today)
    setEndDate(today)
  }

  function setThisWeek() {
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - today.getDay() + 1)
    setStartDate(monday.toISOString().split('T')[0])
    setEndDate(today.toISOString().split('T')[0])
  }

  function setThisMonth() {
    const today = new Date()
    const first = new Date(today.getFullYear(), today.getMonth(), 1)
    setStartDate(first.toISOString().split('T')[0])
    setEndDate(today.toISOString().split('T')[0])
  }

  const handleGenerateReport = async (reportType: string) => {
    if (!startDate || !endDate) { toast.error(t('Please select start and end dates')); return }
    if (new Date(startDate) > new Date(endDate)) { toast.error(t('Start date must be before end date')); return }
    setLoading(true)
    try {
      const res = await apiFetch(`/api/reports?type=${reportType}&startDate=${startDate}&endDate=${endDate}`)
      const result = await res.json()
      if (result.success) {
        setReports([
          ...reports.filter((r) => r.type !== reportType),
          { type: reportType, data: result.data, generatedAt: formatDate(new Date(), { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }), startDate, endDate },
        ])
        toast.success(`${t(reportType)} ${t('report generated')}`)
      } else {
        toast.error(result.error ? te(result.error) : t('Failed to generate report'))
      }
    } catch { toast.error(t('Failed to generate report')) } finally { setLoading(false) }
  }

  const exportReportAsCSV = (reportType: string) => {
    const report = reports.find((r) => r.type === reportType)
    if (!report) return
    let csv = `${t(reportType).toUpperCase()} ${t('Report').toUpperCase()}\n${t('Generated')}: ${report.generatedAt}\n${t('Period')}: ${report.startDate} ${t('to')} ${report.endDate}\n\n`
    if (reportType === 'sales' && Array.isArray(report.data.sales)) {
      const sales = report.data.sales as SaleRow[]
      csv += `${t('Sale #')},${t('Date')},${t('Customer')},${t('Items')},${t('Total')},${t('Paid')},${t('Remaining')},${t('Status')},${t('Method')}\n`
      sales.forEach((s) => {
        csv += `${s.saleNumber},${formatDate(s.createdAt)},${s.customerName},${s.itemCount},${s.totalAmount},${s.paidAmount},${s.remainingAmount},${t(s.status)},${t(PAYMENT_LABELS[s.paymentMethod] ?? s.paymentMethod)}\n`
      })
    } else {
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
    }
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  function printSalesReport(report: Report) {
    const sales = (report.data.sales as SaleRow[]) ?? []
    const dateRange =
      report.startDate === report.endDate
        ? formatDate(report.startDate, { day: 'numeric', month: 'long', year: 'numeric' })
        : `${formatDate(report.startDate)} – ${formatDate(report.endDate)}`

    const rowsHtml = sales
      .map(
        (s) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-family:monospace;font-size:11px;">${s.saleNumber}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:12px;">${formatDate(s.createdAt)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:12px;font-weight:600;">${s.customerName}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;font-size:12px;">${s.itemCount}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;font-size:12px;font-weight:700;">${formatCurrency(s.totalAmount)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;font-size:12px;color:#16a34a;font-weight:600;">${formatCurrency(s.paidAmount)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;font-size:12px;${s.remainingAmount > 0 ? 'color:#dc2626;font-weight:600;' : 'color:#888;'}">${formatCurrency(s.remainingAmount)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;font-size:11px;">
          <span style="border-radius:999px;padding:2px 8px;font-weight:700;${s.status === 'PAID' ? 'background:#dcfce7;color:#16a34a;border:1px solid #86efac;' : s.status === 'PARTIAL' ? 'background:#fef3c7;color:#d97706;border:1px solid #fcd34d;' : 'background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;'}">${t(s.status)}</span>
        </td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:12px;">${t(PAYMENT_LABELS[s.paymentMethod] ?? s.paymentMethod)}</td>
      </tr>
    `,
      )
      .join('')

    const totalRevenue = sales.reduce((s, r) => s + r.totalAmount, 0)
    const totalPaid = sales.reduce((s, r) => s + r.paidAmount, 0)
    const totalRemaining = sales.reduce((s, r) => s + r.remainingAmount, 0)

    const html = `<!DOCTYPE html>
<html dir="${document.documentElement.dir}" lang="${document.documentElement.lang}">
<head>
  <meta charset="utf-8">
  <title>${t('Sales Report')} – ${dateRange}</title>
  <style>
    @page { margin: 15mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #111; margin: 0; padding: 0; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f3f4f6; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; padding: 8px; text-align: left; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; }
    th.right { text-align: right; } th.center { text-align: center; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
    .stat { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
    .stat-label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .stat-value { font-size: 18px; font-weight: 800; }
    .footer-row td { background: #f9fafb; font-weight: 700; }
  </style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:2px solid #111;margin-bottom:20px;">
    <div>
      <h1 style="font-size:22px;font-weight:800;margin:0;letter-spacing:-0.5px;">${t('Makhazeny Warehouse')}</h1>
      <p style="margin:4px 0 0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">${t('Sales Report')}</p>
    </div>
    <div style="text-align:right;font-size:12px;color:#6b7280;">
      <div style="font-weight:700;color:#111;font-size:14px;">${dateRange}</div>
      <div style="margin-top:2px;">${t('Generated')}: ${report.generatedAt}</div>
    </div>
  </div>
  <div class="summary">
    <div class="stat"><div class="stat-label">${t('Total Sales')}</div><div class="stat-value" style="color:#3b82f6;">${sales.length}</div></div>
    <div class="stat"><div class="stat-label">${t('Total Revenue')}</div><div class="stat-value">${formatCurrency(totalRevenue)}</div></div>
    <div class="stat"><div class="stat-label">${t('Collected')}</div><div class="stat-value" style="color:#16a34a;">${formatCurrency(totalPaid)}</div></div>
    <div class="stat"><div class="stat-label">${t('Outstanding')}</div><div class="stat-value" style="color:${totalRemaining > 0 ? '#dc2626' : '#16a34a'};">${formatCurrency(totalRemaining)}</div></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>${t('Sale #')}</th><th>${t('Date')}</th><th>${t('Customer')}</th><th class="center">${t('Items')}</th>
        <th class="right">${t('Total')}</th><th class="right">${t('Paid')}</th><th class="right">${t('Remaining')}</th>
        <th class="center">${t('Status')}</th><th>${t('Method')}</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr class="footer-row">
        <td colspan="4" style="padding:8px;font-size:12px;">${t('TOTALS')} — ${sales.length} ${t('sale')}${sales.length !== 1 ? 's' : ''}</td>
        <td style="padding:8px;text-align:right;">${formatCurrency(totalRevenue)}</td>
        <td style="padding:8px;text-align:right;color:#16a34a;">${formatCurrency(totalPaid)}</td>
        <td style="padding:8px;text-align:right;${totalRemaining > 0 ? 'color:#dc2626;' : ''}">${formatCurrency(totalRemaining)}</td>
        <td colspan="2"></td>
      </tr>
    </tbody>
  </table>
  <div style="margin-top:24px;font-size:10px;color:#9ca3af;text-align:center;border-top:1px solid #e5e7eb;padding-top:12px;">
    ${t('Makhazeny Warehouse Management System')} — ${t('Confidential Report')}
  </div>
</body>
</html>`

    if (!printHtml(html, `${t('Sales Report')} – ${dateRange}`)) {
      toast.error(t('Failed to open print dialog'))
    }
  }

  const reportFieldLabel = (key: string) =>
    t(key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim())

  function printGenericReport(report: Report) {
    const rows = Object.entries(report.data)
      .filter(([, v]) => typeof v !== 'object' || v === null)
      .map(
        ([k, v]) =>
          `<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#6b7280;">${reportFieldLabel(k)}</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;text-align:right;">${v}</td></tr>`,
      )
      .join('')
    const reportTitle = `${t(report.type)} ${t('Report')}`
    const html = `<!DOCTYPE html><html dir="${document.documentElement.dir}" lang="${document.documentElement.lang}"><head><meta charset="utf-8"><title>${reportTitle}</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;max-width:600px;margin:0 auto;}table{width:100%;border-collapse:collapse;}@page{margin:15mm;}</style></head>
      <body><h1 style="font-size:18px;margin-bottom:4px;">${t('Makhazeny Warehouse')} — ${reportTitle}</h1>
      <p style="color:#6b7280;font-size:12px;margin-bottom:16px;">${t('Period')}: ${report.startDate} ${t('to')} ${report.endDate} | ${t('Generated')}: ${report.generatedAt}</p>
      <table><tbody>${rows}</tbody></table></body></html>`
    if (!printHtml(html, reportTitle)) {
      toast.error(t('Failed to open print dialog'))
    }
  }

  const salesReport = reports.find((r) => r.type === 'sales')
  const productsReport = reports.find((r) => r.type === 'products')
  const customersReport = reports.find((r) => r.type === 'customers')
  const debtsReport = reports.find((r) => r.type === 'debts')
  const inventoryReport = reports.find((r) => r.type === 'inventory')

  return (
    <div className="space-y-6 relative">
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-xl pointer-events-none">
        <div className="backdrop-blur-[3px] bg-background/30 absolute inset-0 rounded-xl" />
        <div className="relative z-10 flex flex-col items-center gap-3 select-none">
          <div className="rounded-full bg-primary/10 border border-primary/20 px-6 py-2.5">
            <span className="text-2xl font-bold tracking-widest text-primary">{t('Coming Soon')}</span>
          </div>
          <p className="text-sm text-muted-foreground">{t('Reports & Analytics will be available soon.')}</p>
        </div>
      </div>
      <PageHeader
        title={t('Reports & Analytics')}
        description={t('Generate sales, inventory, customer, and debt reports for any date range.')}
      />

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle>{t('Date Range')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={setToday} className="gap-1.5 h-8 text-xs">
              <Calendar className="h-3.5 w-3.5" />
              {t('Today')}
            </Button>
            <Button variant="outline" size="sm" onClick={setThisWeek} className="h-8 text-xs">
              {t('This Week')}
            </Button>
            <Button variant="outline" size="sm" onClick={setThisMonth} className="h-8 text-xs">
              {t('This Month')}
            </Button>
          </div>

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
            {reports.map((r) => (
              <TabsTrigger key={r.type} value={r.type}>
                {t(r.type)}
              </TabsTrigger>
            ))}
          </TabsList>

          {salesReport && (
            <TabsContent value="sales">
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle>{t('Sales Report')}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {salesReport.startDate === salesReport.endDate
                        ? salesReport.startDate
                        : `${salesReport.startDate} → ${salesReport.endDate}`}{' '}
                      · {t('Generated')} {salesReport.generatedAt}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => printSalesReport(salesReport)} className="gap-1.5">
                      <Printer className="h-3.5 w-3.5" />
                      {t('Print')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => exportReportAsCSV('sales')} className="gap-1.5">
                      <Download className="h-3.5 w-3.5" />
                      CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ReportStatsGrid
                    stats={[
                      { label: t('Total Sales'), value: (salesReport.data.totalSales as number) || 0, tone: 'info' },
                      { label: t('Total Revenue'), value: formatCurrency(salesReport.data.totalAmount || 0), tone: 'success' },
                      { label: t('Collected'), value: formatCurrency(salesReport.data.totalPaid || 0), tone: 'default' },
                      { label: t('Outstanding'), value: formatCurrency(salesReport.data.totalUnpaid || 0), tone: 'warning' },
                    ]}
                  />

                  {Array.isArray(salesReport.data.sales) && (salesReport.data.sales as SaleRow[]).length > 0 ? (
                    <div>
                      <h4 className="font-semibold text-sm mb-3">{t('Individual Sales')}</h4>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent bg-muted/40">
                              <TableHead className="text-xs uppercase tracking-wide font-semibold ps-4">{t('Sale #')}</TableHead>
                              <TableHead className="text-xs uppercase tracking-wide font-semibold">{t('Date')}</TableHead>
                              <TableHead className="text-xs uppercase tracking-wide font-semibold">{t('Customer')}</TableHead>
                              <TableHead className="text-xs uppercase tracking-wide font-semibold text-right">{t('Total')}</TableHead>
                              <TableHead className="text-xs uppercase tracking-wide font-semibold text-right">{t('Paid')}</TableHead>
                              <TableHead className="text-xs uppercase tracking-wide font-semibold text-right">{t('Remaining')}</TableHead>
                              <TableHead className="text-xs uppercase tracking-wide font-semibold text-center">{t('Status')}</TableHead>
                              <TableHead className="text-xs uppercase tracking-wide font-semibold pe-4">{t('Method')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(salesReport.data.sales as SaleRow[]).map((sale) => (
                              <TableRow key={sale.id}>
                                <TableCell className="ps-4 font-mono text-xs font-semibold">{sale.saleNumber}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {formatDate(sale.createdAt, { day: 'numeric', month: 'short' })}
                                </TableCell>
                                <TableCell className="font-medium text-sm">{sale.customerName}</TableCell>
                                <TableCell className="text-right tabular-nums font-bold text-sm">
                                  {formatCurrency(sale.totalAmount)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-sm text-green-600 font-semibold">
                                  {formatCurrency(sale.paidAmount)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-sm">
                                  <span className={cn('font-semibold', sale.remainingAmount > 0 ? 'text-destructive' : 'text-muted-foreground')}>
                                    {formatCurrency(sale.remainingAmount)}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span
                                    className={cn(
                                      'inline-flex text-xs font-semibold border rounded-full px-2 py-0.5',
                                      STATUS_STYLE[sale.status] ?? 'bg-muted border-border text-muted-foreground',
                                    )}
                                  >
                                    {t(sale.status)}
                                  </span>
                                </TableCell>
                                <TableCell className="pe-4 text-xs text-muted-foreground">
                                  {t(PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">{t('No sales found for this period.')}</p>
                  )}

                  {Array.isArray(salesReport.data.topProducts) &&
                    (salesReport.data.topProducts as Array<{ name: string; quantity: number; revenue: number }>).length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-3">{t('Top Products')}</h4>
                        <div className="space-y-2">
                          {(salesReport.data.topProducts as Array<{ name: string; quantity: number; revenue: number }>).map(
                            (product, idx) => (
                              <div key={idx} className="flex justify-between items-center p-2.5 bg-muted/50 rounded-lg border">
                                <span className="text-sm font-medium">{product.name}</span>
                                <div className="text-end">
                                  <p className="text-xs text-muted-foreground">{t('Qty:')} {product.quantity}</p>
                                  <p className="text-sm font-semibold">{formatCurrency(product.revenue)}</p>
                                </div>
                              </div>
                            ),
                          )}
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
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle>{t('Products Report')}</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => printGenericReport(productsReport)} className="gap-1.5">
                      <Printer className="h-3.5 w-3.5" />{t('Print')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => exportReportAsCSV('products')} className="gap-1.5">
                      <Download className="h-3.5 w-3.5" />CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ReportStatsGrid
                    stats={[
                      { label: t('Total Products'), value: (productsReport.data.totalProducts as number) || 0, tone: 'info' },
                      { label: t('Low Stock'), value: (productsReport.data.lowStockCount as number) || 0, tone: 'warning' },
                      { label: t('Out of Stock'), value: (productsReport.data.outOfStockCount as number) || 0, tone: 'danger' },
                      { label: t('Inventory Value'), value: formatCurrency(productsReport.data.totalInventoryValue || 0), tone: 'success' },
                    ]}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {customersReport && (
            <TabsContent value="customers">
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle>{t('Customers Report')}</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => printGenericReport(customersReport)} className="gap-1.5">
                      <Printer className="h-3.5 w-3.5" />{t('Print')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => exportReportAsCSV('customers')} className="gap-1.5">
                      <Download className="h-3.5 w-3.5" />CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ReportStatsGrid
                    stats={[
                      { label: t('Total Customers'), value: (customersReport.data.totalCustomers as number) || 0, tone: 'info' },
                      { label: t('With Debt'), value: (customersReport.data.customersWithDebt as number) || 0, tone: 'warning' },
                      { label: t('Total Debt'), value: formatCurrency(customersReport.data.totalOutstandingDebt || 0), tone: 'danger' },
                      { label: t('Overdue'), value: formatCurrency(customersReport.data.overdueDebt || 0), tone: 'danger' },
                    ]}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {debtsReport && (
            <TabsContent value="debts">
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle>{t('Debts Report')}</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => printGenericReport(debtsReport)} className="gap-1.5">
                      <Printer className="h-3.5 w-3.5" />{t('Print')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => exportReportAsCSV('debts')} className="gap-1.5">
                      <Download className="h-3.5 w-3.5" />CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ReportStatsGrid
                    stats={[
                      { label: t('Total Debts'), value: (debtsReport.data.totalDebts as number) || 0, tone: 'info' },
                      { label: t('Total Paid'), value: formatCurrency(debtsReport.data.totalPaid || 0), tone: 'success' },
                      { label: t('Still Unpaid'), value: formatCurrency(debtsReport.data.totalRemaining || 0), tone: 'danger' },
                      {
                        label: t('Payment Rate'),
                        value: `${parseFloat(String(debtsReport.data.paymentRate || 0)).toFixed(1)}%`,
                        tone: 'default',
                      },
                    ]}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {inventoryReport && (
            <TabsContent value="inventory">
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle>{t('Inventory Report')}</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => printGenericReport(inventoryReport)} className="gap-1.5">
                      <Printer className="h-3.5 w-3.5" />{t('Print')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => exportReportAsCSV('inventory')} className="gap-1.5">
                      <Download className="h-3.5 w-3.5" />CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-3">{t('Fast Moving Products')}</h4>
                      <div className="space-y-2">
                        {(inventoryReport.data.fastMovingProducts as Array<[string, { out: number }]>)
                          ?.slice(0, 5)
                          ?.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center p-2 bg-success/10 rounded border border-success/20">
                              <span className="text-sm">{item[0]}</span>
                              <span className="text-sm font-medium">
                                {item[1].out} {t('units')}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3">{t('Slow Moving Products')}</h4>
                      <div className="space-y-2">
                        {(inventoryReport.data.slowMovingProducts as Array<[string, unknown]>)?.slice(0, 5)?.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center p-2 bg-destructive/10 rounded border border-destructive/20">
                            <span className="text-sm">{item[0]}</span>
                            <span className="text-sm text-muted-foreground">{t('No sales')}</span>
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
