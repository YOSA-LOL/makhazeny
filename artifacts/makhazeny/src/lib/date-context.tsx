import { createContext, useContext, useState } from 'react'

interface DateContextValue {
  selectedDate: Date
  setSelectedDate: (d: Date) => void
  isToday: boolean
  selectedDateStr: string
}

const DateContext = createContext<DateContextValue | null>(null)

function toDateStr(d: Date) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function DateProvider({ children }: { children: React.ReactNode }) {
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isToday = selectedDate.getTime() === today.getTime()

  return (
    <DateContext.Provider value={{ selectedDate, setSelectedDate, isToday, selectedDateStr: toDateStr(selectedDate) }}>
      {children}
    </DateContext.Provider>
  )
}

export function useSelectedDate() {
  const ctx = useContext(DateContext)
  if (!ctx) throw new Error('useSelectedDate must be used within DateProvider')
  return ctx
}
