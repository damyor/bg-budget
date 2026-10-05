// The consolidated fiscal programme (КФП) by function and sub-function: the
// common skeleton of every "by purpose" dataset, so that plans, reports and
// forecasts of different years share their node ids and can be compared.

import type { LocalizedText } from '../../src/lib/types.ts'
import { num, readCsv } from './csv.ts'
import { MILLION } from './tree-builder.ts'

/** Fixed conversion rate of the lev to the euro (Bulgaria adopted the euro on 1 January 2026). */
export const BGN_PER_EUR = 1.95583

export type Unit = 'mBGN' | 'mEUR' | 'kBGN' | 'kEUR'

/** Converts an amount in the given unit to euro. */
export function toEur(value: number, unit: Unit): number {
  const scale = unit.startsWith('m') ? MILLION : 1_000
  const rate = unit.endsWith('BGN') ? 1 / BGN_PER_EUR : 1
  return value * scale * rate
}

const t = (bg: string, en: string): LocalizedText => ({ bg, en })

/** КФП function names as printed in the medium-term budget forecasts. */
export const F = {
  general: 'Общи държавни служби',
  security: 'Отбрана и сигурност',
  education: 'Образование',
  health: 'Здравеопазване',
  social: 'Социално осигуряване, подпомагане и грижи',
  housing: 'Жилищно строителство, благоустройство, комунално стопанство и опазване на околната среда',
  culture: 'Култура, спорт, почивни дейности и религиозно дело',
  economy: 'Икономически дейности и услуги',
  unclassified: 'Р-ди некласифицирани в другите функции',
} as const

export type FunctionKey = keyof typeof F

/**
 * Every КФП position the trees use: the function, the sub-function (as named
 * in the forecasts) and, for the execution reports, the roman numeral of the
 * function and the letter of the group. `id` is the node id in every dataset.
 */
export interface KfpSlot {
  id: string
  fn: FunctionKey
  sub?: string
  /** Position in the execution reports: function numeral and group letter. */
  report: { fn: number; group?: string }
  name: LocalizedText
}

export const SUB: Record<string, KfpSlot> = {
  'g-executive': {
    id: 'g-executive',
    fn: 'general',
    sub: 'изпълнителни и законодателни органи',
    report: { fn: 1, group: 'А' },
    name: t('Изпълнителна и законодателна власт', 'Executive & legislative bodies'),
  },
  'g-services': { id: 'g-services', fn: 'general', sub: 'общи служби', report: { fn: 1, group: 'Б' }, name: t('Общи служби', 'General services') },
  'g-science': { id: 'g-science', fn: 'general', sub: 'наука', report: { fn: 1, group: 'В' }, name: t('Наука', 'Science') },
  defence: { id: 'defence', fn: 'security', sub: 'отбрана', report: { fn: 2, group: 'А' }, name: t('Отбрана', 'Defence') },
  'o-police': {
    id: 'o-police',
    fn: 'security',
    sub: 'полиция, вътрешен ред и сигурност',
    report: { fn: 2, group: 'Б' },
    name: t('Полиция, вътрешен ред и сигурност', 'Police, public order & security'),
  },
  'o-judiciary': { id: 'o-judiciary', fn: 'security', sub: 'съдебна власт', report: { fn: 2, group: 'В' }, name: t('Съдебна власт', 'Judiciary') },
  'o-prisons': { id: 'o-prisons', fn: 'security', sub: 'администрация на затворите', report: { fn: 2, group: 'Г' }, name: t('Затвори', 'Prisons') },
  'o-civil': {
    id: 'o-civil',
    fn: 'security',
    sub: 'защита на населението, управление и дейности при стихийни бедствия и аварии',
    report: { fn: 2, group: 'Д' },
    name: t('Защита при бедствия и аварии', 'Civil protection & disaster response'),
  },
  's-pensions': { id: 's-pensions', fn: 'social', sub: 'пенсии', report: { fn: 5, group: 'А' }, name: t('Пенсии', 'Pensions') },
  's-benefits': {
    id: 's-benefits',
    fn: 'social',
    sub: 'социални помощи и обезщетения',
    report: { fn: 5, group: 'Б' },
    name: t('Социални помощи и обезщетения', 'Social assistance & benefits'),
  },
  's-services': {
    id: 's-services',
    fn: 'social',
    sub: 'програми, дейности и служби по социалното осигуряване, подпомагане и заетостта',
    report: { fn: 5, group: 'В' },
    name: t('Социални услуги, програми за заетост и администрация', 'Social services, employment programmes & administration'),
  },
  'c-housing': {
    id: 'c-housing',
    fn: 'housing',
    sub: 'жилищно строителство, благоустройство, комунално стопанство',
    report: { fn: 6, group: 'А' },
    name: t('Жилища, благоустройство и комунални дейности', 'Housing, urban development & utilities'),
  },
  'c-environment': {
    id: 'c-environment',
    fn: 'housing',
    sub: 'опазване на околната среда',
    report: { fn: 6, group: 'Б' },
    name: t('Опазване на околната среда', 'Environmental protection'),
  },
  'c-recreation': { id: 'c-recreation', fn: 'culture', sub: 'почивни дейности', report: { fn: 7, group: 'А' }, name: t('Почивни дейности', 'Recreation') },
  'c-sport': { id: 'c-sport', fn: 'culture', sub: 'физическа култура и спорт', report: { fn: 7, group: 'Б' }, name: t('Спорт', 'Sport') },
  'c-culture-culture': { id: 'c-culture-culture', fn: 'culture', sub: 'култура', report: { fn: 7, group: 'В' }, name: t('Култура', 'Culture') },
  'c-religion': { id: 'c-religion', fn: 'culture', sub: 'религиозно дело', report: { fn: 7, group: 'Г' }, name: t('Религиозни дейности', 'Religion') },
  'e-energy': {
    id: 'e-energy',
    fn: 'economy',
    sub: 'минно дело, горива и енергия',
    report: { fn: 8, group: 'А' },
    name: t('Енергетика, горива и минно дело', 'Energy, fuel & mining'),
  },
  'e-agriculture': {
    id: 'e-agriculture',
    fn: 'economy',
    sub: 'селско стопанство, горско стопанство, лов и риболов',
    report: { fn: 8, group: 'Б' },
    name: t('Земеделие, гори, лов и риболов', 'Agriculture, forestry, hunting & fishing'),
  },
  'e-transport': {
    id: 'e-transport',
    fn: 'economy',
    sub: 'транспорт и съобщения',
    report: { fn: 8, group: 'В' },
    name: t('Транспорт и съобщения', 'Transport & communications'),
  },
  'e-industry': {
    id: 'e-industry',
    fn: 'economy',
    sub: 'промишленост и строителство',
    report: { fn: 8, group: 'Г' },
    name: t('Промишленост и строителство', 'Industry & construction'),
  },
  'e-tourism': { id: 'e-tourism', fn: 'economy', sub: 'туризъм', report: { fn: 8, group: 'Д' }, name: t('Туризъм', 'Tourism') },
  'e-other': {
    id: 'e-other',
    fn: 'economy',
    sub: 'други дейности по икономиката',
    report: { fn: 8, group: 'Е' },
    name: t('Други икономически дейности', 'Other economic affairs'),
  },
}

/** Functions without groups in the reports (the whole function is one node). */
export const WHOLE: Record<string, KfpSlot> = {
  health: { id: 'health', fn: 'health', report: { fn: 4 }, name: t('Здравеопазване', 'Health') },
  education: { id: 'education', fn: 'education', report: { fn: 3 }, name: t('Образование', 'Education') },
  'g-interest': { id: 'g-interest', fn: 'unclassified', report: { fn: 9 }, name: t('Лихви по държавния дълг', 'Interest on public debt') },
}

// ---------- plan / forecast tables (medium-term budget forecasts) ----------

export interface KfpPlan {
  /** Function total, EUR. */
  fn: (key: FunctionKey) => number
  /** Sub-function total, EUR. */
  sub: (key: FunctionKey, name: string) => number
}

/**
 * Reads one column of a "by function" table: rows with level=function|subfunction,
 * function and subfunction names, and one value column per year.
 */
export function readKfpPlan(file: URL, column: string, unit: Unit): KfpPlan {
  const rows = readCsv(file)
  if (!(column in rows[0])) throw new Error(`${file.pathname}: no column ${column}`)
  const fns = new Map<string, number>()
  const subs = new Map<string, number>()
  for (const r of rows) {
    const v = toEur(num(r[column]), unit)
    if (r.level === 'function') fns.set(r.function, v)
    else subs.set(`${r.function}|${r.subfunction}`, v)
  }
  const get = (map: Map<string, number>, key: string) => {
    const v = map.get(key)
    if (v === undefined || Number.isNaN(v)) throw new Error(`КФП ${column}: missing "${key}"`)
    return v
  }
  return { fn: (key) => get(fns, F[key]), sub: (key, name) => get(subs, `${F[key]}|${name}`) }
}

// ---------- totals ----------

export interface KfpTotals {
  /** Expenditure plus the contribution to the EU budget, EUR. */
  totalWithEu: number
  expenditure: number
  interest: number
  euContribution: number
  source: string
}

export function readKfpTotals(file: URL, dataset: string): KfpTotals {
  const row = readCsv(file).find((r) => r.dataset === dataset)
  if (!row) throw new Error(`КФП totals: no row for ${dataset}`)
  const unit = row.unit as Unit
  const v = (k: string) => toEur(num(row[k]), unit)
  const totals = { totalWithEu: v('total_with_eu'), expenditure: v('expenditure'), interest: v('interest'), euContribution: v('eu_contribution'), source: row.source }
  if (Math.abs(totals.expenditure + totals.euContribution - totals.totalWithEu) > 0.2 * MILLION) {
    throw new Error(`КФП totals ${dataset}: expenditure + EU contribution ≠ total`)
  }
  return totals
}

// ---------- execution reports ----------

/** Economic lines of the report tables. */
export type ReportLine = 'current' | 'capital' | 'abroad' | 'interest' | 'disaster'

export interface ReportCell {
  /** Column header as printed ("ДБ", "Общини" …). */
  column: string
  value: number
}

export interface ReportRow {
  /** Totals by column for the function or group. */
  total: ReportCell[]
  /** The same split for each economic line. */
  lines: Partial<Record<ReportLine, ReportCell[]>>
}

const ROMAN: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9 }

/** "VІ. ЖИЛИЩНО…" (with a Cyrillic І) → 6. */
function romanOf(label: string): number {
  const m = label.replace(/І/g, 'I').replace(/Х/g, 'X').match(/^([IVX]+)\./)
  if (!m || !ROMAN[m[1]]) throw new Error(`Report: no function numeral in "${label}"`)
  return ROMAN[m[1]]
}

function lineOf(label: string): ReportLine | null {
  const l = label.toLowerCase()
  if (l.startsWith('текущи нелихвени')) return 'current'
  if (l.startsWith('капиталови')) return 'capital'
  if (l.startsWith('пред') && l.includes('чужбина')) return 'abroad'
  if (l.startsWith('лихвени')) return 'interest'
  // Civil protection lists disaster recovery as a separate line next to current and capital spending.
  if (l.startsWith('предотвратяване и ликвидиране')) return 'disaster'
  return null // "в т.ч." lines are parts of the line above
}

/**
 * Reads the long-format CSV of the report's "expenditure by function" tables
 * (function, subfunction, row_kind, row, column, value_mBGN) into totals and
 * economic lines for each function and group, keyed "6" or "6А".
 */
export function readKfpReport(file: URL): Map<string, ReportRow> {
  const out = new Map<string, ReportRow>()
  for (const r of readCsv(file)) {
    const fn = romanOf(r.function)
    const group = r.subfunction ? r.subfunction.trim().charAt(0) : ''
    const key = `${fn}${group}`
    const row = out.get(key) ?? { total: [], lines: {} }
    out.set(key, row)
    const cell = { column: r.column.trim(), value: toEur(num(r.value_mBGN), 'mBGN') }
    if (r.row_kind === 'function' || r.row_kind === 'subfunction') {
      row.total.push(cell)
    } else {
      const line = lineOf(r.row)
      if (line) (row.lines[line] ??= []).push(cell)
    }
  }
  return out
}

export function reportKey(slot: KfpSlot): string {
  return `${slot.report.fn}${slot.report.group ?? ''}`
}
