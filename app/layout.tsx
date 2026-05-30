import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Makhazeny Warehouse',
  description: 'Warehouse inventory, sales, treasury, and reporting management',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
