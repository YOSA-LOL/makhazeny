import { Link, useLocation } from 'wouter'
import { useState, useEffect } from 'react'
import {
  AlertCircle,
  BarChart3,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Globe,
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

function useDarkMode() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
  }
  return { dark, toggle }
}

function DatePicker() {
  const { selectedDate, setSelectedDate, isToday } = useSelectedDate()
  const [open, setOpen] = useState(false)
  const { isAr } = useLanguage()
  const locale = isAr ? 'ar-EG' : 'en-GB'

  function goBack() {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 1)
    setSelectedDate(d)
  }
  function goForward() {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 1)
    setSelectedDate(d)
  }
  function goToday() {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    setSelectedDate(d)
  }

  const label = isToday
    ? 'Today'
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
                Today
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <div className="p-2 border-b flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Select a date</span>
            {!isToday && (
              <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={() => { goToday(); setOpen(false) }}>
                Go to Today
              </Button>
            )}
          </div>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => { if (d) { d.setHours(0,0,0,0); setSelectedDate(d); setOpen(false) } }}
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

export function WarehouseAppShell({ children }: { children: React.ReactNode }) {
  const [pathname] = useLocation()
  const { t, isAr, toggleLang } = useLanguage()
  const pageTitle = t(getCurrentPageTitle(pathname))
  const now = useCurrentTime()
  const { dark, toggle } = useDarkMode()

  const locale = isAr ? 'ar-EG' : 'en-GB'
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })

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
                Makhazeny
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
              title={isAr ? 'Switch to English' : 'التبديل إلى العربية'}
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
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <Bell className="h-4 w-4" />
            </Button>
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
