'use client'



import Link from 'next/link'

import { usePathname } from 'next/navigation'

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

    return pathname === '/' || pathname === '/products'

  }

  return pathname === href || pathname.startsWith(`${href}/`)

}



function getCurrentPageTitle(pathname: string): string {

  const item = MENU_ITEMS.find((menuItem) => navItemIsActive(pathname, menuItem.href))

  return item?.label ?? 'Makhazeny'

}



export function WarehouseAppShell({ children }: { children: React.ReactNode }) {

  const pathname = usePathname()

  const pageTitle = getCurrentPageTitle(pathname)



  return (

    <SidebarProvider defaultOpen>

      <Sidebar collapsible="icon" variant="inset">

        <SidebarHeader className="border-b border-sidebar-border px-3 py-3">

          <Link

            href="/"

            className="flex items-center gap-3 overflow-hidden group-data-[collapsible=icon]:justify-center"

          >

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">

              <Warehouse className="h-5 w-5" />

            </div>

            <div className="flex min-w-0 flex-col gap-0.5 group-data-[collapsible=icon]:hidden">

              <span className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">

                Makhazeny

              </span>

              <span className="truncate text-xs text-muted-foreground">

                Warehouse Management

              </span>

            </div>

          </Link>

        </SidebarHeader>

        <SidebarContent>

          <SidebarGroup>

            <SidebarGroupLabel>Navigation</SidebarGroupLabel>

            <SidebarGroupContent>

              <SidebarMenu>

                {MENU_ITEMS.map((item) => {

                  const Icon = NAV_ICONS[item.icon]

                  const active = navItemIsActive(pathname, item.href)

                  return (

                    <SidebarMenuItem key={item.href}>

                      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>

                        <Link href={item.href}>

                          <Icon />

                          <span>{item.label}</span>

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

        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6">

          <SidebarTrigger className="-ml-1" />

          <SidebarSeparator orientation="vertical" className="mr-1 h-6" />

          <h2 className="text-sm font-semibold text-foreground">{pageTitle}</h2>

        </header>

        <div className="flex flex-1 flex-col overflow-auto bg-muted/40">

          <div className={cn('mx-auto w-full max-w-7xl flex-1 p-4 md:p-6 lg:p-8')}>{children}</div>

        </div>

      </SidebarInset>

    </SidebarProvider>

  )

}

