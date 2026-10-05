import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { translate } from './i18n'
import type { Mode } from './palette'
import type { Lang } from './types'

export type ThemeChoice = 'system' | Mode

export interface Settings {
  lang: Lang
  theme: ThemeChoice
}

const KEY = 'bg-budget:settings'
const DEFAULTS: Settings = { lang: 'bg', theme: 'system' }

// Browser storage is a convenience only: it can be missing or throw.
export function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? { ...fallback, ...(JSON.parse(raw) as T) } : fallback
  } catch {
    return fallback
  }
}

export function writeStored(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable — nothing to do */
  }
}

interface SettingsApi extends Settings {
  update: (patch: Partial<Settings>) => void
  /** The theme actually in effect (system preference resolved). */
  mode: Mode
}

const SettingsContext = createContext<SettingsApi | null>(null)

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

function useSystemDark(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const q = darkQuery()
      q.addEventListener('change', cb)
      return () => q.removeEventListener('change', cb)
    },
    () => darkQuery().matches,
  )
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => readStored(KEY, DEFAULTS))
  const systemDark = useSystemDark()
  const mode: Mode = settings.theme === 'system' ? (systemDark ? 'dark' : 'light') : settings.theme

  useEffect(() => {
    const root = document.documentElement
    if (settings.theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', settings.theme)
    root.lang = settings.lang
    document.title = translate(settings.lang, 'appName')
  }, [settings.theme, settings.lang])

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      writeStored(KEY, next)
      return next
    })
  }, [])

  const api = useMemo(() => ({ ...settings, update, mode }), [settings, update, mode])
  return <SettingsContext.Provider value={api}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsApi {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings outside SettingsProvider')
  return ctx
}
