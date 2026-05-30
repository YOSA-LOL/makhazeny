'use client'
import { useTranslations } from 'next-intl'

import { useState } from 'react'
import { ReturnsList } from '@/components/returns/returns-list'
import { PageHeader } from '@/components/ui/page-header'

export default function ReturnsPage() {
  const t = useTranslations('returns')

  const [refreshKey, setRefreshKey] = useState(0)

  const handleSuccess = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('pageTitle')} description={t('pageDescription')} />

      <ReturnsList key={refreshKey} />
    </div>
  )
}
