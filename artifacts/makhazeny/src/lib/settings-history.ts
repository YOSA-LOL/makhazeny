export type SettingChangeType = 'language' | 'theme' | 'date'

export interface SettingChange {
  id: string
  type: SettingChangeType
  label: string
  value: string
  timestamp: string
}

const STORAGE_KEY = 'makhazeny-settings-history'
const MAX_ENTRIES = 100

function readHistory(): SettingChange[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SettingChange[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeHistory(entries: SettingChange[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)))
  } catch { /* ignore */ }
}

export function logSettingChange(type: SettingChangeType, label: string, value: string) {
  const entry: SettingChange = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    label,
    value,
    timestamp: new Date().toISOString(),
  }
  const history = readHistory()
  writeHistory([entry, ...history])
  window.dispatchEvent(new CustomEvent('settings-history-updated'))
  return entry
}

export function getSettingsHistory(): SettingChange[] {
  return readHistory()
}

export function clearSettingsHistory() {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent('settings-history-updated'))
}
