import { WarehouseAppShell } from '@/components/warehouse-app-shell'

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <WarehouseAppShell>{children}</WarehouseAppShell>
}
