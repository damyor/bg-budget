import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { readStored, writeStored } from './settings'
import { calculateTaxes, type TaxInputs, type TaxResult } from './tax/calc'
import { CURRENT_TAX_YEAR, paramsFor } from './tax/params'

const KEY = 'bg-budget:my-money'

export const DEFAULT_INPUTS: TaxInputs = {
  gross: Math.round(paramsFor(CURRENT_TAX_YEAR)!.averageWageMonthly),
  includeEmployer: true,
  spendShare: 0.9,
  fuelLitresPerMonth: 40,
  fuelType: 'petrol',
  cigarettePacksPerWeek: 0,
  beersPerWeek: 0,
  spiritBottlesPerMonth: 0,
}

interface Stored extends TaxInputs {
  /** Set once the viewer has used the calculator; until then "my taxes" stays off. */
  active: boolean
}

interface TaxProfile {
  inputs: TaxInputs
  active: boolean
  /** The viewer's taxes under a given year's rules (null when there are no rules for that year). */
  resultFor: (year: number) => TaxResult | null
  update: (patch: Partial<TaxInputs>) => void
  reset: () => void
}

const TaxContext = createContext<TaxProfile | null>(null)

export function TaxProfileProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<Stored>(() => readStored(KEY, { ...DEFAULT_INPUTS, active: false }))

  const update = useCallback((patch: Partial<TaxInputs>) => {
    setStored((prev) => {
      const next = { ...prev, ...patch, active: true }
      writeStored(KEY, next)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    const next = { ...DEFAULT_INPUTS, active: false }
    writeStored(KEY, next)
    setStored(next)
  }, [])

  const value = useMemo<TaxProfile>(() => {
    const { active, ...inputs } = stored
    const cache = new Map<number, TaxResult | null>()
    const resultFor = (year: number) => {
      if (!cache.has(year)) {
        const params = paramsFor(year)
        cache.set(year, params ? calculateTaxes(inputs, params) : null)
      }
      return cache.get(year)!
    }
    return { inputs, active, resultFor, update, reset }
  }, [stored, update, reset])

  return <TaxContext.Provider value={value}>{children}</TaxContext.Provider>
}

export function useTaxProfile(): TaxProfile {
  const ctx = useContext(TaxContext)
  if (!ctx) throw new Error('useTaxProfile outside TaxProfileProvider')
  return ctx
}

/**
 * The viewer's annual taxes under each year's rules, or null if they haven't
 * used the calculator (or there are no rules for that year).
 */
export function useTaxesByYear(): (year: number) => number | null {
  const { active, resultFor } = useTaxProfile()
  return useCallback((year: number) => (active ? (resultFor(year)?.totalAnnual ?? null) : null), [active, resultFor])
}
