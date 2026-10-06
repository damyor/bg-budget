import type { Lang } from './types.ts'

const LOCALE: Record<Lang, string> = { bg: 'bg-BG', en: 'en-GB' }
const cache = new Map<string, Intl.NumberFormat>()

function nf(lang: Lang, digits: number): Intl.NumberFormat {
  const key = `${lang}:${digits}`
  let f = cache.get(key)
  if (!f) {
    f = new Intl.NumberFormat(LOCALE[lang], { minimumFractionDigits: digits, maximumFractionDigits: digits })
    cache.set(key, f)
  }
  return f
}

export function formatNumber(value: number, lang: Lang, digits = 0): string {
  return nf(lang, digits).format(value)
}

/** Three significant digits, without trailing noise ("41,1", "543", "5,84"). */
function sig3(value: number, lang: Lang): string {
  const abs = Math.abs(value)
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2
  return formatNumber(value, lang, digits)
}

const SCALE = [
  { min: 1e9, div: 1e9, bg: 'млрд.', en: 'bn' },
  { min: 1e6, div: 1e6, bg: 'млн.', en: 'm' },
] as const

export interface MoneyParts {
  /** Number as displayed, e.g. "41,1". */
  number: string
  /** Scale word, e.g. "млрд." / "bn" (empty for plain amounts). */
  scale: string
  /** Full string with currency, e.g. "41,1 млрд. €" / "€41.1 bn". */
  text: string
}

/** Formats euro amounts: large values compact (млн./млрд.), small values exact; a minus goes before the euro sign. */
export function moneyParts(value: number, lang: Lang): MoneyParts {
  if (value < 0) {
    const parts = moneyParts(-value, lang)
    return { number: `−${parts.number}`, scale: parts.scale, text: `−${parts.text}` }
  }
  const abs = Math.abs(value)
  for (const s of SCALE) {
    if (abs >= s.min) {
      const number = sig3(value / s.div, lang)
      const scale = s[lang]
      return { number, scale, text: lang === 'bg' ? `${number} ${scale} €` : `€${number} ${scale}` }
    }
  }
  const number = formatNumber(value, lang, abs < 100 && abs !== Math.round(abs) ? 2 : 0)
  return { number, scale: '', text: lang === 'bg' ? `${number} €` : `€${number}` }
}

export function formatMoney(value: number, lang: Lang): string {
  return moneyParts(value, lang).text
}

/** Exact euro amount, no compacting ("1 234 567 €"). */
export function formatMoneyExact(value: number, lang: Lang, digits = 0): string {
  const number = formatNumber(value, lang, digits)
  return lang === 'bg' ? `${number} €` : `€${number}`
}

/** Share in [0, 1] as a percentage ("36,8%", "<0,1%"). */
export function formatPercent(share: number, lang: Lang): string {
  if (share > 0 && share < 0.001) return `<${formatNumber(0.1, lang, 1)}%`
  const pct = share * 100
  const digits = pct >= 99.95 || pct === 0 ? 0 : 1
  return `${formatNumber(pct, lang, digits)}%`
}

/**
 * A share of GDP in [0, 1] with as many decimals as small values need
 * ("45,4%", "5,32%", "0,053%", "<0,001%").
 */
export function formatGdpPercent(share: number, lang: Lang): string {
  const pct = share * 100
  const abs = Math.abs(pct)
  if (abs > 0 && abs < 0.001) return `<${formatNumber(0.001, lang, 3)}%`
  const digits = abs >= 10 ? 1 : abs >= 0.1 ? 2 : 3
  return `${formatNumber(pct, lang, digits)}%`
}

/** "5,32% от БВП" / "5.32% of GDP". */
export function formatGdpShare(share: number, lang: Lang): string {
  return `${formatGdpPercent(share, lang)} ${lang === 'bg' ? 'от БВП' : 'of GDP'}`
}
