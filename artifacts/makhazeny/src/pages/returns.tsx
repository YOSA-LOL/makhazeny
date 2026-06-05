import { useState } from 'react'
import { ReturnsList } from '@/components/returns/returns-list'
import { PageHeader } from '@/components/ui/page-header'
import { useLanguage } from '@/lib/i18n'

export default function ReturnsPage() {
  const [refreshKey] = useState(0)
  const { t } = useLanguage()

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Sales Returns Management')}
        description={t('Review, approve, or reject customer return requests.')}
      />
      <ReturnsList key={refreshKey} />
    </div>
  )
}
