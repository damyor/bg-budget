import type { DatasetFamily, DatasetIndexEntry, DatasetStage, Lang, LocalizedText } from './types'

export const STAGE_ORDER: DatasetStage[] = ['law', 'draft', 'forecast', 'report']
export const FAMILY_ORDER: DatasetFamily[] = ['functions', 'ministries', 'cofog']

export const STAGE_LABEL: Record<DatasetStage, LocalizedText> = {
  law: { bg: 'План', en: 'Plan' },
  draft: { bg: 'Проект', en: 'Draft' },
  forecast: { bg: 'Прогноза', en: 'Forecast' },
  report: { bg: 'Отчет', en: 'Actual' },
}

export const STAGE_HINT: Record<DatasetStage, LocalizedText> = {
  law: { bg: 'Бюджетът, приет от Народното събрание', en: 'The budget voted by Parliament' },
  draft: { bg: 'Проектобюджетът, внесен в Народното събрание', en: 'The draft budget submitted to Parliament' },
  forecast: { bg: 'Средносрочна прогноза на Министерството на финансите', en: 'Ministry of Finance medium-term forecast' },
  report: { bg: 'Реално изразходваните средства', en: 'What was actually spent' },
}

export const FAMILY_LABEL: Record<DatasetFamily, LocalizedText> = {
  functions: { bg: 'По области', en: 'By purpose' },
  ministries: { bg: 'Министерства', en: 'Ministries' },
  cofog: { bg: 'Евростат (COFOG)', en: 'Eurostat (COFOG)' },
}

const byStage = (a: DatasetIndexEntry, b: DatasetIndexEntry) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage)

/** The dataset shown when none is chosen: the latest budget voted by Parliament. */
export function defaultEntry(index: DatasetIndexEntry[]): DatasetIndexEntry {
  const laws = index.filter((d) => d.family === 'functions' && d.stage === 'law').sort((a, b) => b.year - a.year)
  return laws[0] ?? index[0]
}

export function findEntry(index: DatasetIndexEntry[], id: string | undefined): DatasetIndexEntry {
  return index.find((d) => d.id === id) ?? defaultEntry(index)
}

export function yearsOf(index: DatasetIndexEntry[]): number[] {
  return [...new Set(index.map((d) => d.year))].sort((a, b) => a - b)
}

export function familiesFor(index: DatasetIndexEntry[], year: number): DatasetFamily[] {
  return FAMILY_ORDER.filter((f) => index.some((d) => d.year === year && d.family === f))
}

export function versionsFor(index: DatasetIndexEntry[], year: number, family: DatasetFamily): DatasetIndexEntry[] {
  return index.filter((d) => d.year === year && d.family === family).sort(byStage)
}

/**
 * The dataset to show after changing the year or the breakdown: the same
 * version (plan / actual) when it exists, otherwise the closest one.
 */
export function switchEntry(
  index: DatasetIndexEntry[],
  current: DatasetIndexEntry,
  change: { year?: number; family?: DatasetFamily },
): DatasetIndexEntry {
  const year = change.year ?? current.year
  const families = familiesFor(index, year)
  const family = change.family ?? (families.includes(current.family) ? current.family : families[0])
  const versions = versionsFor(index, year, family)
  return (
    versions.find((d) => d.stage === current.stage) ??
    versions.find((d) => d.kind === current.kind) ??
    versions[0] ??
    current
  )
}

/** "Бюджет 2025 · план" style label for lists of datasets. */
export function entryLabel(entry: DatasetIndexEntry, lang: Lang): string {
  return `${entry.year} · ${STAGE_LABEL[entry.stage][lang].toLocaleLowerCase(lang === 'bg' ? 'bg-BG' : 'en-GB')}`
}
