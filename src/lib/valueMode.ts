import { formatGdpShare, formatMoney, formatMoneyExact } from './format.ts'
import { publicTotal, type Dataset, type Lang } from './types.ts'

/** What amounts on screen mean: the full budget, one resident's share, a share of GDP, or the viewer's own taxes. */
export type ValueMode = 'total' | 'perPerson' | 'gdp' | 'mine'

export const MODE_PARAM: Record<ValueMode, string> = { total: '', perPerson: 'pp', gdp: 'gdp', mine: 'mine' }

export function modeFromParam(param: string | undefined): ValueMode {
  return param === 'pp' ? 'perPerson' : param === 'gdp' ? 'gdp' : param === 'mine' ? 'mine' : 'total'
}

export interface ValueScale {
  mode: ValueMode
  /** Converts a budget amount (EUR) into the displayed amount (EUR, or a fraction of GDP). */
  scale: (value: number) => number
  format: (value: number) => string
}

/** The numbers a dataset's amounts are scaled by. */
export type ScaleBase = Pick<Dataset, 'population' | 'gdp'> & { publicTotal: number }

export function scaleBase(dataset: Dataset): ScaleBase {
  return { population: dataset.population, gdp: dataset.gdp, publicTotal: publicTotal(dataset) }
}

export function valueScale(mode: ValueMode, base: ScaleBase | Dataset, lang: Lang, myAnnualTaxes: number | null): ValueScale {
  const b = 'root' in base ? scaleBase(base) : base
  if (mode === 'perPerson') {
    const scale = (v: number) => v / b.population
    return { mode, scale, format: (v) => formatPersonal(scale(v), lang) }
  }
  if (mode === 'gdp') {
    const scale = (v: number) => v / b.gdp
    return { mode, scale, format: (v) => formatGdpShare(scale(v), lang) }
  }
  if (mode === 'mine' && myAnnualTaxes !== null) {
    const scale = (v: number) => (v / b.publicTotal) * myAnnualTaxes
    return { mode, scale, format: (v) => formatPersonal(scale(v), lang) }
  }
  return { mode: 'total', scale: (v) => v, format: (v) => formatMoney(v, lang) }
}

/** Personal-size amounts: cents below €10, whole euros above. */
export function formatPersonal(value: number, lang: Lang): string {
  if (value >= 1e6) return formatMoney(value, lang)
  return formatMoneyExact(value, lang, value < 10 ? 2 : 0)
}

export interface CompactScale {
  /** Unit shown once for a whole table or chart, e.g. "млрд. €" or "% от БВП". */
  unit: string
  format: (displayValue: number) => string
}

/**
 * One unit and number of decimals for a set of values in the same view, so
 * columns of numbers line up ("6,66 · 19,2 · 0,82" in billions of euro).
 */
export function compactScale(mode: ValueMode, maxDisplayValue: number, lang: Lang): CompactScale {
  const nf = (v: number, d: number) => new Intl.NumberFormat(lang === 'bg' ? 'bg-BG' : 'en-GB', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v)
  if (mode === 'gdp') {
    const pct = maxDisplayValue * 100
    const digits = pct >= 10 ? 1 : pct >= 0.1 ? 2 : 3
    return { unit: lang === 'bg' ? '% от БВП' : '% of GDP', format: (v) => nf(v * 100, digits) }
  }
  const steps = [
    { min: 1e9, div: 1e9, bg: 'млрд. €', en: '€ bn' },
    { min: 1e6, div: 1e6, bg: 'млн. €', en: '€ m' },
    { min: 1e4, div: 1e3, bg: 'хил. €', en: '€ thousand' },
    { min: 0, div: 1, bg: '€', en: '€' },
  ]
  const step = steps.find((s) => maxDisplayValue >= s.min)!
  const top = maxDisplayValue / step.div
  const digits = top >= 100 ? 0 : top >= 10 ? 1 : 2
  const suffix =
    mode === 'perPerson' ? (lang === 'bg' ? ' на човек' : ' per person') : mode === 'mine' ? (lang === 'bg' ? ' от твоите данъци' : ' of your taxes') : ''
  return { unit: `${step[lang]}${suffix}`, format: (v) => nf(v / step.div, digits) }
}
