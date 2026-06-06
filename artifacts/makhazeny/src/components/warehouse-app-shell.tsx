import { Link, useLocation } from 'wouter'
import { useState, useEffect } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Globe,
  History,
  LayoutGrid,
  Moon,
  Package,
  RotateCcw,
  ShoppingCart,
  Sun,
  Truck,
  Users,
  Wallet,
  Warehouse,
  type LucideIcon,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { MENU_ITEMS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n'
import { useSelectedDate } from '@/lib/date-context'
import { DbConnectionIndicator } from '@/components/db-connection-indicator'
import { getSettingsHistory, logSettingChange, type SettingChange } from '@/lib/settings-history'
import { useAppAlerts } from '@/lib/use-app-alerts'

const NAV_ICONS: Record<(typeof MENU_ITEMS)[number]['icon'], LucideIcon> = {
  LayoutGrid,
  Package,
  Users,
  Truck,
  ShoppingCart,
  Wallet,
  AlertCircle,
  RotateCcw,
  BarChart3,
}

function navItemIsActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function getCurrentPageTitle(pathname: string): string {
  const item = MENU_ITEMS.find((menuItem) => navItemIsActive(pathname, menuItem.href))
  return item?.label ?? 'Makhazeny'
}

function useCurrentTime() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])
  return time
}

function useDarkMode(t: (s: string) => string) {
  const [dark, setDark] = useState(() => {
    try {
      const stored = localStorage.getItem('makhazeny-theme')
      if (stored === 'dark') return true
      if (stored === 'light') return false
    } catch { /* ignore */ }
    return document.documentElement.classList.contains('dark')
  })
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try { localStorage.setItem('makhazeny-theme', dark ? 'dark' : 'light') } catch { /* ignore */ }
  }, [dark])
  const toggle = () => {
    const next = !dark
    setDark(next)
    logSettingChange('theme', t('Theme'), next ? t('Dark mode') : t('Light mode'))
  }
  return { dark, toggle }
}

function DatePicker() {
  const { selectedDate, setSelectedDate, isToday } = useSelectedDate()
  const [open, setOpen] = useState(false)
  const { isAr, t, formatDate } = useLanguage()
  const locale = isAr ? 'ar-EG' : 'en-GB'

  function logDateChange(d: Date) {
    const label = formatDate(d, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    logSettingChange('date', t('Selected date'), label)
  }

  function goBack() {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 1)
    setSelectedDate(d)
    logDateChange(d)
  }
  function goForward() {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 1)
    setSelectedDate(d)
    logDateChange(d)
  }
  function goToday() {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    setSelectedDate(d)
    logDateChange(d)
  }

  const label = isToday
    ? t('Today')
    : selectedDate.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="flex items-center gap-0.5 rounded-lg border bg-background px-1 py-0.5 shadow-sm">
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={goBack}>
        <ChevronLeft className="h-3.5 w-3.5" />
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-6 gap-1.5 px-2 text-xs font-medium',
              isToday ? 'text-primary' : 'text-foreground'
            )}
          >
            <CalendarDays className="h-3 w-3" />
            {label}
            {isToday && (
              <Badge variant="secondary" className="h-3.5 px-1 text-[9px] leading-none">
                {t('Today')}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <div className="p-2 border-b flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">{t('Select a date')}</span>
            {!isToday && (
              <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={() => { goToday(); setOpen(false) }}>
                {t('Go to Today')}
              </Button>
            )}
          </div>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => {
              if (d) {
                d.setHours(0, 0, 0, 0)
                setSelectedDate(d)
                logDateChange(d)
                setOpen(false)
              }
            }}
            disabled={(d) => d > new Date()}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={goForward} disabled={isToday}>
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

const ALERT_ICONS = {
  low_stock: AlertTriangle,
  out_of_stock: AlertCircle,
  overdue_debt: AlertCircle,
  pending_return: RotateCcw,
} as const

const ALERT_COLORS = {
  warning: 'text-warning',
  danger: 'text-destructive',
  info: 'text-info',
} as const

function SettingsHistoryButton() {
  const { t, formatDate, formatTime } = useLanguage()
  const [history, setHistory] = useState<SettingChange[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function refresh() { setHistory(getSettingsHistory()) }
    refresh()
    window.addEventListener('settings-history-updated', refresh)
    return () => window.removeEventListener('settings-history-updated', refresh)
  }, [])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title={t('Settings history')}>
          <History className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <p className="text-sm font-semibold">{t('Settings History')}</p>
          <p className="text-xs text-muted-foreground">{t('Recent changes to app settings')}</p>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">{t('No settings changes yet')}</p>
          ) : (
            history.map((entry) => (
              <div key={entry.id} className="px-3 py-2.5 border-b last:border-0 hover:bg-muted/50">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium">{t(entry.label)}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                    {formatDate(entry.timestamp, { day: 'numeric', month: 'short' })}
                    {' '}{formatTime(entry.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{t(entry.value) !== entry.value ? t(entry.value) : entry.value}</p>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function NotificationBell() {
  const { t } = useLanguage()
  const { alerts, count } = useAppAlerts()
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground relative" title={t('Notifications')}>
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold px-0.5">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <p className="text-sm font-semibold">{t('Notifications')}</p>
          <p className="text-xs text-muted-foreground">
            {count > 0 ? `${count} ${t('active alerts')}` : t('No active alerts')}
          </p>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {alerts.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">{t('All clear — no alerts right now')}</p>
          ) : (
            alerts.map((alert) => {
              const Icon = ALERT_ICONS[alert.type]
              return (
                <Link
                  key={alert.id}
                  href={alert.href}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-2.5 px-3 py-2.5 border-b last:border-0 hover:bg-muted/50 transition-colors"
                >
                  <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', ALERT_COLORS[alert.severity])} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">{alert.message}</p>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function WarehouseAppShell({ children }: { children: React.ReactNode }) {
  const [pathname] = useLocation()
  const { t, isAr, toggleLang } = useLanguage()
  const pageTitle = t(getCurrentPageTitle(pathname))
  const now = useCurrentTime()
  const { dark, toggle } = useDarkMode(t)

  const locale = isAr ? 'ar-EG' : 'en-GB'
  const timeStr = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: !isAr })

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" variant="inset" side={isAr ? 'right' : 'left'}>
        {/* Logo */}
        <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
          <Link
            href="/"
            className="flex items-center gap-3 overflow-hidden group-data-[collapsible=icon]:justify-center"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sidebar-primary to-sidebar-primary/70 text-sidebar-primary-foreground shadow-sm">
              <Warehouse className="h-5 w-5" />
            </div>
            <div className="flex min-w-0 flex-col gap-0.5 group-data-[collapsible=icon]:hidden">
              <span className="truncate text-sm font-bold tracking-tight text-sidebar-foreground">
                {t('Makhazeny')}
              </span>
              <span className="truncate text-[10px] uppercase tracking-widest text-muted-foreground/70 font-medium">
                {t('Warehouse Management')}
              </span>
            </div>
          </Link>
        </SidebarHeader>

        {/* Nav */}
        <SidebarContent className="py-2">
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider px-2 mb-0.5 text-muted-foreground/60">
              {t('Menu')}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {MENU_ITEMS.map((item) => {
                  const Icon = NAV_ICONS[item.icon]
                  const active = navItemIsActive(pathname, item.href)
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={t(item.label)}
                        className={cn(
                          'mx-1 rounded-lg transition-all duration-150',
                          active && 'font-semibold'
                        )}
                      >
                        <Link href={item.href}>
                          <Icon className={cn('h-4 w-4 shrink-0', active && 'text-sidebar-primary')} />
                          <span>{t(item.label)}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Footer user info */}
        <SidebarFooter className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold select-none">
              AD
            </div>
            <div className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-xs font-semibold text-sidebar-foreground truncate">{t('Admin User')}</span>
              <span className="text-[10px] text-muted-foreground truncate">admin@makhazeny.local</span>
            </div>
            <Badge variant="secondary" className="shrink-0 text-[9px] px-1.5 group-data-[collapsible=icon]:hidden">
              {t('ADMIN')}
            </Badge>
          </div>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        {/* Topbar */}
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6">
          <SidebarTrigger className="-ml-1" />
          <SidebarSeparator orientation="vertical" className="mr-1 h-5" />
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-foreground">{pageTitle}</h2>
          </div>
          <div className="flex items-center gap-2">
            <DbConnectionIndicator />
            {/* Global date picker */}
            <DatePicker />

            <div className="hidden md:flex items-center gap-1 text-muted-foreground">
              <span className="text-[11px] font-semibold tabular-nums">{timeStr}</span>
            </div>

            {/* Language toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground relative"
              onClick={toggleLang}
              title={isAr ? t('Switch to English') : t('Switch to Arabic')}
            >
              <Globe className="h-4 w-4" />
              <span className="absolute -bottom-0.5 -right-0.5 text-[8px] font-bold leading-none bg-primary text-primary-foreground rounded px-0.5">
                {isAr ? 'EN' : 'عر'}
              </span>
            </Button>
            {/* Dark mode toggle */}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={toggle}>
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <SettingsHistoryButton />
            <NotificationBell />
          </div>
        </header>

        {/* Page content */}
        <div className="flex flex-1 flex-col overflow-auto bg-muted/30">
          <div className={cn('mx-auto w-full max-w-7xl flex-1 p-4 md:p-6 lg:p-8')}>{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
