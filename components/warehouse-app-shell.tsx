'use client'

import {
  AlertCircle,
  BarChart3,
  LayoutGrid,
  Package,
  RotateCcw,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  Warehouse,
  type LucideIcon,
} from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/routing'
import { LiveClock } from '@/components/shell/live-clock'
import { LocaleSwitcher } from '@/components/shell/locale-switcher'
import { ThemeToggle } from '@/components/shell/theme-toggle'
import {
  Sidebar,
  SidebarContent,
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
import { MENU_ITEMS } from '@/lib/constants'
import { cn } from '@/lib/utils'

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
  if (href === '/') {
    return pathname === '/' || pathname === ''
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function WarehouseAppShell({ children }: { children: React.ReactNode }) {
  const locale = useLocale()
  const pathname = usePathname()
  const tNav = useTranslations('nav')
  const tCommon = useTranslations('common')
  const sidebarSide = locale === 'ar' ? 'right' : 'left'

  const activeItem = MENU_ITEMS.find((menuItem) => navItemIsActive(pathname, menuItem.href))
  const pageTitle = activeItem ? tNav(activeItem.key) : tCommon('brandFallback')
  const pageSubtitle = activeItem ? tNav('subtitle') : undefined

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" variant="inset" side={sidebarSide}>
        <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
          <Link
            href="/"
            className="flex items-center gap-3 overflow-hidden group-data-[collapsible=icon]:justify-center"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sidebar-primary to-sidebar-primary/80 text-sidebar-primary-foreground shadow-md ring-1 ring-sidebar-primary/20">
              <Warehouse className="h-5 w-5" />
            </div>
            <div className="flex min-w-0 flex-col gap-0.5 group-data-[collapsible=icon]:hidden">
              <span className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
                {tCommon('brand')}
              </span>
              <span className="truncate text-xs text-muted-foreground">{tNav('subtitle')}</span>
            </div>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{tNav('navigation')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {MENU_ITEMS.map((item) => {
                  const Icon = NAV_ICONS[item.icon]
                  const active = navItemIsActive(pathname, item.href)
                  const label = tNav(item.key)

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={label}
                        className={cn(
                          active &&
                            'bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-sm'
                        )}
                      >
                        <Link href={item.href}>
                          <Icon className={cn(active && 'text-sidebar-primary')} />
                          <span>{label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6">
          <SidebarTrigger className="-ms-1" />
          <SidebarSeparator orientation="vertical" className="me-1 h-6" />
          <div className="flex min-w-0 flex-1 flex-col">
            <h2 className="truncate text-sm font-semibold text-foreground">{pageTitle}</h2>
            {pageSubtitle ? (
              <p className="truncate text-xs text-muted-foreground">{pageSubtitle}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <LiveClock />
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </header>
        <div className="flex flex-1 flex-col overflow-auto bg-muted/40">
          <div className={cn('mx-auto w-full max-w-7xl flex-1 p-4 md:p-6 lg:p-8')}>{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
