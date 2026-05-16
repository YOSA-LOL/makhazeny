'use client'

import { useState } from 'react'
import { ReturnsList } from '@/components/returns/returns-list'
import { PageHeader } from '@/components/ui/page-header'

export default function ReturnsPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleSuccess = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Returns Management"
        description="Review, approve, or reject customer return requests."
      />

      <ReturnsList key={refreshKey} />
    </div>
  )
}
