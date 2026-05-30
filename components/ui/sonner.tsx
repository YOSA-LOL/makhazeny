'use client'

import { useTheme } from 'next-themes'
import { useLocale } from 'next-intl'
import { Toaster as Sonner, ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()
  const locale = useLocale()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
