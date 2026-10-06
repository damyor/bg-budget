// Health: what the Health Insurance Fund (NHIF, НЗОК) pays each hospital and for which medicines, from the
// extracts in data/sources/health/ (made by scripts/extract/nhif_hospitals.py, moh_hospitals.py and
// nhif_medicines.py; see the folder's README):
//   hospitals   every establishment the NHIF pays for hospital care, 2024 – August 2026: payments by year and
//               month (hospital care, medical devices, medicines outside the clinical pathway) and, where matched,
//               the Ministry of Health's financial indicators; linked from the NHIF hospital-care node, from each
//               municipality and from each hospital's own node in the 2024 and 2025 actuals
//   medicines   NHIF-reimbursed medicines by active ingredient (INN) and year, 2021 – July 2026
// In the actual (report) trees the hospitals are also the children of the NHIF hospital-care line, by region
// (hospitalCare), because their payments add up to that line; the part the monthly reports do not attribute to a
// hospital is an explicit remainder. Medicines never become tree nodes: their amounts are gross of refunds.

import type { Dataset, DatasetFamily, ListCell, ListColumn, ListLinkSpec, LocalizedText } from '../src/lib/types.ts'
import { readCsv } from './lib/csv.ts'
import { toEuro } from './lib/kfp.ts'
import { nodeLabels, type ListGroup, type ListSpec } from './lib/lists.ts'
import { PLACE_KIND, provinceKey, provinceName, slug, transliterate, type Register } from './lib/places.ts'
import type { Spec } from './lib/tree-builder.ts'

const t = (bg: string, en: string): LocalizedText => ({ bg, en })

export const HEALTH: ListGroup = {
  id: 'health',
  title: t('Здравеопазване', 'Health'),
  description: t(
    'Какво плаща здравната каса (НЗОК) на всяка болница — по години и по месеци от 2024 г. насам, — какво е финансовото състояние на държавните и общинските болници според Министерството на здравеопазването и за кои лекарства плаща касата. Това не са отделни парчета от кръговата диаграма: парите са част от разходите на НЗОК за болнична помощ и лекарства, които вече са в „Разходи“.',
    'What the health insurance fund (NHIF) pays each hospital, by year and by month since 2024; how the state and municipal hospitals stand financially according to the Ministry of Health; and which medicines the fund pays for. They are not slices of the donut: the money is part of the NHIF spending on hospital care and medicines already counted in “Spending”.',
  ),
}

// ---------- hospitals: reading the extracts ----------

export type PaymentSeries = 'care' | 'devices' | 'medicines'
export const PAYMENT_SERIES: PaymentSeries[] = ['care', 'devices', 'medicines']

/** The Ministry of Health's indicators, as they are kept: money in thousand leva, the rest as counts. */
export const MOH_INDICATORS = ['revenue_kBGN', 'costs_kBGN', 'liabilities_kBGN', 'overdue_kBGN', 'patients', 'doctors', 'nurses', 'beds'] as const
export type MohIndicator = (typeof MOH_INDICATORS)[number]

export interface Hospital {
  /** The NHIF registration number ("Рег. № на ЛЗ"): RZOK, municipality (EKATTE), type of establishment, serial. */
  reg: string
  name: string
  otherNames: string[]
  rzok: string
  province: string
  /** Id of the municipality in the register (places.ts), or null where the number does not make it clear. */
  municipality: string | null
  /** Euro paid in each month, by series ("2026-08" → €). */
  months: Record<PaymentSeries, Map<string, number>>
  /** Euro paid in each year, by series: the year to date of the year's last report. */
  years: Record<PaymentSeries, Map<number, number>>
  /** The Ministry of Health's figures by period ("2024-12", "2025-09"), where the hospital is matched. */
  moh: Map<string, Record<MohIndicator, number | null>>
  ownership: 'state' | 'municipal' | null
  mohName: string | null
}

/** The last month of each year the reports of a series reach ("care|2026" → "2026-08"). */
function lastMonths(rows: Record<string, string>[]): Map<string, string> {
  const last = new Map<string, string>()
  for (const r of rows) {
    const key = `${r.series}|${r.month.slice(0, 4)}`
    if ((last.get(key) ?? '') < r.month) last.set(key, r.month)
  }
  return last
}

export function readHospitals(dir: URL, register: Register): Hospital[] {
  const byCode = new Map(register.all.map((m) => [m.code, m]))
  const hospitals = new Map<string, Hospital>()
  for (const r of readCsv(new URL('hospitals.csv', dir))) {
    const place = r.ebk_code ? byCode.get(r.ebk_code) : undefined
    if (r.ebk_code && !place) throw new Error(`hospitals.csv: ${r.reg_no} has an unknown ЕБК code ${r.ebk_code}`)
    hospitals.set(r.reg_no, {
      reg: r.reg_no,
      name: r.name,
      otherNames: r.other_names ? r.other_names.split(' | ') : [],
      rzok: r.rzok,
      province: r.province,
      municipality: place?.key ?? null,
      months: { care: new Map(), devices: new Map(), medicines: new Map() },
      years: { care: new Map(), devices: new Map(), medicines: new Map() },
      moh: new Map(),
      ownership: null,
      mohName: null,
    })
  }
  const payments = readCsv(new URL('nhif-hospital-payments.csv', dir))
  const last = lastMonths(payments)
  for (const r of payments) {
    const h = hospitals.get(r.reg_no)
    const series = r.series as PaymentSeries
    if (!h || !PAYMENT_SERIES.includes(series)) throw new Error(`nhif-hospital-payments.csv: unknown ${r.reg_no} or ${r.series}`)
    h.months[series].set(r.month, toEuro(Number(r.paid), r.currency))
    // The year's amount is the year to date printed in its last report (restatements included).
    if (last.get(`${r.series}|${r.month.slice(0, 4)}`) === r.month) h.years[series].set(Number(r.month.slice(0, 4)), toEuro(Number(r.ytd), r.currency))
  }
  for (const h of hospitals.values()) {
    for (const series of PAYMENT_SERIES) {
      for (const month of h.months[series].keys()) {
        if (!h.years[series].has(Number(month.slice(0, 4)))) throw new Error(`${h.reg}: ${series} payments in ${month} but none in the year's last report`)
      }
    }
  }
  for (const r of readCsv(new URL('moh-hospital-finances.csv', dir))) {
    if (!r.reg_no) continue
    const h = hospitals.get(r.reg_no)
    if (!h) throw new Error(`moh-hospital-finances.csv: unknown ${r.reg_no}`)
    h.moh.set(r.period, Object.fromEntries(MOH_INDICATORS.map((k) => [k, r[k] === '' ? null : Number(r[k])])) as Record<MohIndicator, number | null>)
    h.ownership = r.ownership as 'state' | 'municipal'
    h.mohName = r.moh_name
  }
  return [...hospitals.values()]
}

// ---------- hospitals in the tree ----------

export const HOSPITAL_KIND = t('Лечебно заведение', 'Medical establishment')

/** Cyrillic letters outside the Bulgarian alphabet that names use as Roman numerals ("Цар Борис ІІІ"). */
const NUMERAL_LETTERS: Record<string, string> = { І: 'I', і: 'i', Ѵ: 'V', ѵ: 'v' }

/** A published name in Latin letters: the official transliteration, words in capitals kept in capitals ("АДЖИБАДЕМ" → "ADZHIBADEM"). */
export function latinName(name: string): string {
  const latin = name
    .replace(/[Ііѵ\u0474]/g, (ch) => NUMERAL_LETTERS[ch] ?? ch)
    .replace(/\p{L}+/gu, (w) => (w.length > 1 && w === w.toLocaleUpperCase('bg-BG') ? transliterate(w).toUpperCase() : transliterate(w)))
  if (/[\u0400-\u04ff]/.test(latin)) throw new Error(`No Latin spelling for "${name}"`)
  return latin
}

/** The province of an RZOK, as the register names it (registration numbers start with the RZOK). */
const provinceOf = (hospitals: Hospital[]) => new Map(hospitals.map((h) => [h.rzok, h.province]))

/**
 * The children of the NHIF hospital-care line in an actual (report) tree: one node per region (RZOK), one per
 * establishment paid in the year, and, as the remainder, what the monthly reports do not attribute to one.
 * `line` is the line's actual (euro), to state in the notes how much the hospitals cover.
 */
export function hospitalCare(hospitals: Hospital[], year: number, line: number): Partial<Spec> {
  const paid = hospitals.filter((h) => (h.years.care.get(year) ?? 0) > 0)
  const provinces = provinceOf(hospitals)
  const regions = [...provinces.keys()].sort().flatMap((rzok): Spec[] => {
    const own = paid.filter((h) => h.rzok === rzok)
    if (!own.length) return []
    const province = provinces.get(rzok)!
    return [
      {
        id: `h-nhif-hospital-${provinceKey(province)}`,
        kind: PLACE_KIND.province,
        name: provinceName(province),
        children: own.map((h) => ({
          id: `hospital-${h.reg}`,
          kind: HOSPITAL_KIND,
          code: h.reg,
          name: t(h.name, latinName(h.name)),
          value: h.years.care.get(year)!,
        })),
      },
    ]
  })
  const covered = paid.reduce((s, h) => s + h.years.care.get(year)!, 0)
  const share = new Intl.NumberFormat('bg-BG', { maximumFractionDigits: 1 }).format((covered / line) * 100)
  const shareEn = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 }).format((covered / line) * 100)
  const m = (v: number, lang: 'bg' | 'en') => new Intl.NumberFormat(lang === 'bg' ? 'bg-BG' : 'en-GB', { maximumFractionDigits: 1 }).format(v / 1e6)
  return {
    note: t(
      `По региони (РЗОК) и лечебни заведения: колко НЗОК е платила на всяко от ${paid.length} заведения за болнична помощ през ${year} г. според месечните си отчети. Те покриват ${share}% от реда в отчета за изпълнението на бюджета; остатъкът е показан отделно. Плащанията по месеци и финансите на всяка болница са в „Списъци“ › „Болници“.`,
      `By region (RZOK) and establishment: what the NHIF paid each of ${paid.length} establishments for hospital care in ${year}, from its monthly reports. They cover ${shareEn}% of the line in the budget execution report; the rest is shown separately. Each hospital’s monthly payments and finances are under “Lists” › “Hospitals”.`,
    ),
    children: regions,
    rest: {
      id: 'h-nhif-hospital-unattributed',
      name: t('Не е разпределено по болници', 'Not attributed to a hospital'),
      kind: t('Разход', 'Expense'),
      note: t(
        `Разликата между реда „Болнична медицинска помощ“ в отчета за изпълнението на бюджета на НЗОК и сумата на месечните отчети на касата за платеното на всяка болница (${m(line - covered, 'bg')} млн. €). Месечните отчети не я разпределят по болници; възможна причина са плащания, отчетени в реда, но не и в отчетите по болници (напр. част от парите за медицински персонал по чл. 55, ал. 2, т. 3в от Закона за здравното осигуряване).`,
        `The difference between the “hospital care” line of the NHIF budget execution report and the sum of the fund’s monthly reports of what it paid each hospital (€${m(line - covered, 'en')} m). The monthly reports do not attribute it to hospitals; it may be payments booked on the line but not in the reports by hospital (e.g. part of the money for medical staff under Art. 55(2)(3в) of the Health Insurance Act).`,
      ),
    },
  }
}

// ---------- hospitals: the list ----------

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_FULL_BG = ['януари', 'февруари', 'март', 'април', 'май', 'юни', 'юли', 'август', 'септември', 'октомври', 'ноември', 'декември']
const MONTH_FULL_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MONTH_PERIODS = MONTHS_EN.map((_, i) => String(i + 1).padStart(2, '0'))

/** "2026 (I–VIII)" / "2026 (Jan–Aug)" for a year the data covers in part, else the year. */
function yearLabel(year: number, lastMonth: number): LocalizedText {
  if (lastMonth === 12) return t(String(year), String(year))
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
  return t(`${year} (I–${roman[lastMonth - 1]})`, `${year} (Jan–${MONTHS_EN[lastMonth - 1]})`)
}

/** "през 2025 г." / "in 2025", or "през януари–август 2026 г." / "in January–August 2026". */
function during(year: number, lastMonth: number): LocalizedText {
  if (lastMonth === 12) return t(`през ${year} г.`, `in ${year}`)
  return t(`през януари–${MONTH_FULL_BG[lastMonth - 1]} ${year} г.`, `in January–${MONTH_FULL_EN[lastMonth - 1]} ${year}`)
}

/** Types of establishment by digits 5–7 of the registration number. */
const TYPES: { id: string; codes: string[]; name: LocalizedText }[] = [
  { id: 'general', codes: ['211'], name: t('Многопрофилна болница за активно лечение', 'General hospital (acute care)') },
  { id: 'specialised', codes: ['212', '214'], name: t('Специализирана болница за активно лечение', 'Specialised hospital (acute care)') },
  { id: 'ministry', codes: ['911'], name: t('Болница на Министерството на отбраната, на вътрешните работи или на транспорта', 'Hospital of the defence, interior or transport ministry') },
  { id: 'long-term', codes: ['221', '222', '251', '252', '253'], name: t('Болница за продължително лечение и долекуване', 'Long-term care and aftercare hospital') },
  { id: 'rehabilitation', codes: ['232', '233', '234'], name: t('Болница за рехабилитация', 'Rehabilitation hospital') },
  { id: 'centre', codes: ['331', '333', '334'], name: t('Онкологичен, психиатричен или кожно-венерологичен център', 'Oncology, mental-health or skin-disease centre') },
  { id: 'dialysis', codes: ['391'], name: t('Диализен център', 'Dialysis centre') },
  { id: 'outpatient', codes: ['131', '133', '134'], name: t('Медицински или диагностично-консултативен център', 'Medical or diagnostic centre') },
]

export function establishmentType(reg: string): string {
  const type = TYPES.find((x) => x.codes.includes(reg.slice(4, 7)))
  if (!type) throw new Error(`hospitals: unknown type of establishment in ${reg}`)
  return type.id
}

const OWNERSHIP = {
  state: t('Държавна', 'State'),
  municipal: t('Общинска', 'Municipal'),
  other: t('Частна или на друго министерство', 'Private or of another ministry'),
}

const SERIES_NAMES: Record<PaymentSeries, LocalizedText> = {
  care: t('Болнична помощ', 'Hospital care'),
  devices: t('Медицински изделия', 'Medical devices'),
  medicines: t('Лекарства', 'Medicines'),
}

/** How each of the ministry's indicators is shown: its name, and whether it is money (thousand leva) or a count. */
const MOH_LABELS: Record<MohIndicator, { label: LocalizedText; money: boolean }> = {
  revenue_kBGN: { label: t('Приходи', 'Revenue'), money: true },
  costs_kBGN: { label: t('Разходи', 'Costs'), money: true },
  liabilities_kBGN: { label: t('Задължения (в края на периода)', 'Liabilities (at the end of the period)'), money: true },
  overdue_kBGN: { label: t('Просрочени задължения', 'Overdue liabilities'), money: true },
  patients: { label: t('Преминали болни', 'Patients treated'), money: false },
  doctors: { label: t('Лекари (средно на месец)', 'Doctors (monthly average)'), money: false },
  nurses: { label: t('Специалисти по здравни грижи (средно на месец)', 'Nurses and other care staff (monthly average)'), money: false },
  beds: { label: t('Легла (средно на месец)', 'Beds (monthly average)'), money: false },
}

const NHIF_PAGE = (year: number) => ({
  name: t(
    `НЗОК — заплатени здравноосигурителни плащания за болнична медицинска помощ, медицински изделия и лекарствени продукти по лечебни заведения, ${year} г. (месечни отчети)`,
    `NHIF — payments for hospital care, medical devices and medicines by medical establishment, ${year} (monthly reports)`,
  ),
  url: `https://www.nhif.bg/bg/hospitals/bmp/${year}`,
})
const MOH_PAGE = {
  name: t(
    'Министерство на здравеопазването — финансови показатели на лечебните заведения за болнична помощ (тримесечно, 2019 – III тримесечие на 2025 г.)',
    'Ministry of Health — financial indicators of hospitals (quarterly, 2019 – Q3 2025)',
  ),
  url: 'https://mh.government.bg/bg/politiki/standart-za-finansovo-upravlenie-na-drzhavnite-lechebni-zavedeni/',
}
const REUSE = t(
  'НЗОК обявява съдържанието на сайта си за защитено („всички права запазени“). Тук са само числата (факти) от отчетите ѝ, с източника и връзка към него; самите файлове не се публикуват наново.',
  'The NHIF marks its site “all rights reserved”. Only the figures (facts) from its reports are used here, with the source and a link to it; the files themselves are not republished.',
)

const round = (v: number | undefined) => (v === undefined ? null : Math.round(v))

/** "2025-09" → "30.09.2025" / "30 Sep 2025": the last day of the period. */
function quarterEnd(period: string): LocalizedText {
  const [year, month] = period.split('-').map(Number)
  const day = new Date(year, month, 0).getDate()
  return t(`${day}.${String(month).padStart(2, '0')}.${year}`, `${day} ${MONTHS_EN[month - 1]} ${year}`)
}

function findNode(d: Dataset, id: string): number | null {
  const walk = (n: Dataset['root']): number | null => (n.id === id ? n.value : (n.children ?? []).reduce<number | null>((found, c) => found ?? walk(c), null))
  return walk(d.root)
}

export interface HealthConfig {
  dir: URL
  hospitals: Hospital[]
  datasets: Dataset[]
}

function dataset(datasets: Dataset[], id: string): Dataset {
  const found = datasets.find((d) => d.id === id)
  if (!found) throw new Error(`health: no dataset ${id}`)
  return found
}

const yearsOf = (datasets: Dataset[], family: DatasetFamily) => [...new Set(datasets.filter((d) => d.family === family).map((d) => d.year))].sort()

function hospitalsList(config: HealthConfig): ListSpec {
  const { hospitals, datasets } = config
  const months = hospitals.flatMap((h) => PAYMENT_SERIES.flatMap((s) => [...h.months[s].keys()]))
  const latest = months.reduce((a, b) => (a > b ? a : b))
  const years = [...new Set(months.map((m) => Number(m.slice(0, 4))))].sort()
  const lastMonth = (year: number) => (year < Number(latest.slice(0, 4)) ? 12 : Number(latest.slice(5)))
  const periods = years.map(String)
  const periodLabels = Object.fromEntries(years.map((y) => [String(y), yearLabel(y, lastMonth(y))]))
  const report = (year: number) => datasets.find((d) => d.family === 'functions' && d.stage === 'report' && d.year === year)
  const mohPeriods = [...new Set(hospitals.flatMap((h) => [...h.moh.keys()]))].sort()
  const mohLatest = mohPeriods.at(-1)!
  // A year end is shown as its year, the latest quarter as "2025 (I–IX)".
  const mohLabels = Object.fromEntries(mohPeriods.map((p) => [p, yearLabel(Number(p.slice(0, 4)), Number(p.slice(5)))]))
  const mohDate = quarterEnd(mohLatest)
  // All hospitals in the ministry's latest data, matched or not.
  const mohAll = readCsv(new URL('moh-hospital-finances.csv', config.dir)).filter((r) => r.period === mohLatest).length
  const line2024 = report(2024) ? findNode(report(2024)!, 'h-nhif-hospital') : null

  const reports = years.map(report).filter((d): d is Dataset => Boolean(d))
  const treeColumn = (d: Dataset): ListColumn => ({
    id: `tree${d.year}`,
    type: 'node',
    label: t('Болница', 'Hospital'),
    hidden: true,
    family: 'functions',
    dataset: d.id,
    labels: nodeLabels(
      d,
      hospitals.filter((h) => (h.years.care.get(d.year) ?? 0) > 0).map((h) => `hospital-${h.reg}`),
    ),
  })
  const target = dataset(datasets, 'municipalities-2026')
  const places = hospitals.filter((h) => h.municipality)
  const provinces = new Map(hospitals.map((h) => [provinceKey(h.province), provinceName(h.province)]))

  const columns: ListColumn[] = [
    { id: 'reg', type: 'code', label: t('Рег. № в НЗОК', 'NHIF reg. no.'), search: true },
    { id: 'name', type: 'text', label: t('Лечебно заведение', 'Medical establishment'), search: true },
    {
      id: 'municipality',
      type: 'node',
      label: t('Община', 'Municipality'),
      family: 'municipalities',
      dataset: target.id,
      filter: true,
      labels: nodeLabels(target, new Set(places.map((h) => h.municipality!))),
    },
    { id: 'province', type: 'category', label: t('Област (РЗОК)', 'Province (RZOK)'), hidden: true, filter: true, labels: Object.fromEntries(provinces) },
    { id: 'type', type: 'category', label: t('Вид', 'Type'), filter: true, detail: true, labels: Object.fromEntries(TYPES.map((x) => [x.id, x.name])) },
    { id: 'ownership', type: 'category', label: t('Собственост', 'Ownership'), filter: true, detail: true, labels: OWNERSHIP },
    {
      id: 'total',
      type: 'series',
      label: t('Платено от НЗОК', 'Paid by the NHIF'),
      periods,
      periodLabels,
      total: true,
      source: t('НЗОК, месечни отчети за плащанията по лечебни заведения (болнична помощ, медицински изделия и лекарства извън цената на пътеката)', 'NHIF, monthly reports of payments by establishment (hospital care, medical devices and medicines outside the pathway price)'),
    },
    {
      id: 'overdueLatest',
      type: 'money',
      label: t(`Просрочени задължения към ${mohDate.bg}`, `Overdue liabilities, ${mohDate.en}`),
      source: t('Министерство на здравеопазването, финансови показатели на лечебните заведения за болнична помощ', 'Ministry of Health, financial indicators of hospitals'),
    },
    ...PAYMENT_SERIES.map(
      (s, i): ListColumn => ({
        id: s,
        type: 'series',
        label: SERIES_NAMES[s],
        periods,
        periodLabels,
        detail: true,
        ...(i === 0
          ? {
              section: t(
                'Платено от НЗОК по години: за болнична помощ (клинични пътеки и процедури) и за медицински изделия и лекарства извън цената на пътеката',
                'Paid by the NHIF by year: for hospital care (clinical pathways and procedures), and for medical devices and medicines outside the pathway price',
              ),
            }
          : {}),
      }),
    ),
    // Every month of every year, all three kinds together: one row per month, one column per year.
    ...years.map(
      (year, i): ListColumn => ({
        id: `months${year}`,
        type: 'series',
        label: periodLabels[String(year)],
        periods: MONTH_PERIODS,
        periodLabels: Object.fromEntries(MONTH_PERIODS.map((p, j) => [p, t(MONTH_FULL_BG[j], MONTH_FULL_EN[j])])),
        detail: true,
        transpose: true,
        ...(i === 0 ? { section: t('Платено от НЗОК по месеци', 'Paid by the NHIF by month') } : {}),
      }),
    ),
    ...MOH_INDICATORS.map(
      (k, i): ListColumn => ({
        id: k.replace('_kBGN', ''),
        type: 'series',
        label: MOH_LABELS[k].label,
        periods: mohPeriods,
        periodLabels: mohLabels,
        detail: true,
        ...(MOH_LABELS[k].money ? {} : { unit: 'count' as const }),
        ...(i === 0
          ? { section: t('Финанси и дейност по данни на Министерството на здравеопазването', 'Finances and activity reported to the Ministry of Health') }
          : {}),
      }),
    ),
    { id: 'mohName', type: 'text', label: t('Име в данните на МЗ', 'Name in the Ministry of Health data'), detail: true },
    { id: 'otherNames', type: 'text', label: t('Други имена в отчетите на НЗОК', 'Other names in the NHIF reports'), detail: true, search: true },
    {
      id: 'fund',
      type: 'node',
      label: t('Болнична помощ (НЗОК)', 'Hospital care (NHIF)'),
      hidden: true,
      family: 'functions',
      dataset: reports.at(-1)!.id,
      labels: nodeLabels(reports.at(-1)!, ['h-nhif-hospital']),
    },
    ...reports.map(treeColumn),
  ]

  const rows: ListCell[][] = [...hospitals]
    .sort((a, b) => a.reg.localeCompare(b.reg))
    .map((h) => {
      const byYear = (s: PaymentSeries) => years.map((y) => round(h.years[s].get(y)))
      const total = years.map((y) => {
        const parts = PAYMENT_SERIES.map((s) => h.years[s].get(y))
        return parts.every((v) => v === undefined) ? null : Math.round(parts.reduce<number>((a, v) => a + (v ?? 0), 0))
      })
      const monthly = (year: number) => {
        const values = MONTH_PERIODS.map((m) => {
          const parts = PAYMENT_SERIES.map((s) => h.months[s].get(`${year}-${m}`))
          return parts.every((v) => v === undefined) ? null : Math.round(parts.reduce<number>((a, v) => a + (v ?? 0), 0))
        })
        return values.some((v) => v !== null) ? values : null
      }
      const moh = (k: MohIndicator) => {
        if (!h.moh.size) return null
        const values = mohPeriods.map((p) => {
          const v = h.moh.get(p)?.[k]
          return v === null || v === undefined ? null : MOH_LABELS[k].money ? Math.round(toEuro(v * 1000, 'BGN')) : Math.round(v)
        })
        return values.some((v) => v !== null) ? values : null
      }
      const overdue = h.moh.get(mohLatest)?.overdue_kBGN
      return [
        h.reg,
        h.name,
        h.municipality,
        provinceKey(h.province),
        establishmentType(h.reg),
        h.ownership ?? 'other',
        total,
        overdue === null || overdue === undefined ? null : Math.round(toEuro(overdue * 1000, 'BGN')),
        ...PAYMENT_SERIES.map((s) => (byYear(s).some((v) => v !== null) ? byYear(s) : null)),
        ...years.map(monthly),
        ...MOH_INDICATORS.map(moh),
        h.mohName && h.mohName !== h.name ? h.mohName : null,
        h.otherNames.length ? h.otherNames.join('; ') : null,
        'h-nhif-hospital',
        ...reports.map((d) => ((h.years.care.get(d.year) ?? 0) > 0 ? `hospital-${h.reg}` : null)),
      ]
    })

  const care = (year: number) => hospitals.reduce((s, h) => s + (h.years.care.get(year) ?? 0), 0)
  const matched = hospitals.filter((h) => h.moh.has(mohLatest)).length
  const count = (n: number, lang: 'bg' | 'en') => new Intl.NumberFormat(lang === 'bg' ? 'bg-BG' : 'en-GB').format(n)
  const mn = (v: number, lang: 'bg' | 'en') => new Intl.NumberFormat(lang === 'bg' ? 'bg-BG' : 'en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v / 1e6)
  const latestYear = years.at(-1)!
  const unplaced = hospitals.length - places.length
  const links: ListLinkSpec[] = [
    ...years
      .filter((y) => yearsOf(datasets, 'functions').includes(y))
      .map((year) => ({
        family: 'functions' as const,
        column: 'fund',
        years: [year],
        value: `care.${year}`,
        label: during(year, lastMonth(year)),
        text: t(`Колко е платила НЗОК на всяка болница: {total} ${during(year, lastMonth(year)).bg}`, `What the NHIF paid each hospital: {total} ${during(year, lastMonth(year)).en}`),
      })),
    ...years
      .filter((y) => yearsOf(datasets, 'municipalities').includes(y))
      .map((year) => ({
        family: 'municipalities' as const,
        column: 'municipality',
        years: [year],
        value: `total.${year}`,
        label: during(year, lastMonth(year)),
        text: t(`Болници в общината: {count}, {total} от НЗОК ${during(year, lastMonth(year)).bg}`, `Hospitals in the municipality: {count}, {total} from the NHIF ${during(year, lastMonth(year)).en}`),
      })),
    ...reports.map((d) => ({
      family: 'functions' as const,
      column: `tree${d.year}`,
      years: [d.year],
      stages: ['report' as const],
      label: t('', ''),
      text: t('Плащанията по месеци и финансите на болницата', 'The hospital’s monthly payments and finances'),
    })),
  ]
  return {
    id: 'hospitals',
    group: HEALTH.id,
    title: t('Болници: плащания от здравната каса и финанси', 'Hospitals: health insurance payments and finances'),
    short: t('Болници', 'Hospitals'),
    description: t(
      `Всички ${count(hospitals.length, 'bg')} лечебни заведения, на които НЗОК е платила за болнична помощ от януари ${years[0]} до ${MONTH_FULL_BG[lastMonth(latestYear) - 1]} ${latestYear} г.: колко е платила всяка година и всеки месец — за болничната помощ (клинични пътеки и процедури), за медицинските изделия и за лекарствата, които плаща извън цената на клиничната пътека, — а за ${count(matched, 'bg')} държавни и общински болници и приходите, разходите, задълженията, леглата и персонала им по данни на Министерството на здравеопазването.`,
      `All ${count(hospitals.length, 'en')} medical establishments the NHIF paid for hospital care from January ${years[0]} to ${MONTH_FULL_EN[lastMonth(latestYear) - 1]} ${latestYear}: what it paid each year and each month — for hospital care (clinical pathways and procedures), for medical devices and for the medicines it pays outside the clinical-pathway price — and, for ${count(matched, 'en')} state and municipal hospitals, their revenue, costs, liabilities, beds and staff as reported to the Ministry of Health.`,
    ),
    sources: [...years.map(NHIF_PAGE), MOH_PAGE],
    caveats: [
      t(
        `Сумите са платеното от касата през месеца (касово изпълнение), а не стойността на лечението през него. „Платено от НЗОК“ събира трите вида плащания; годишната сума е тази от последния отчет за годината. ${latestYear} г. е за януари–${MONTH_FULL_BG[lastMonth(latestYear) - 1]}.`,
        `Amounts are what the fund paid in the month (cash), not the value of the care given in it. “Paid by the NHIF” adds up the three kinds of payment; a year’s amount is the one in the year’s last report. ${latestYear} covers January–${MONTH_FULL_EN[lastMonth(latestYear) - 1]}.`,
      ),
      t(
        `Плащанията за болнична помощ са реда „Болнична медицинска помощ“ от бюджета на НЗОК${line2024 ? `: през 2024 г. те са ${mn(care(2024), 'bg')} млн. € от ${mn(line2024, 'bg')} млн. € по отчета за изпълнението на бюджета` : ''}. В „Разходи“ › Здравеопазване › Здравна каса › Болнична помощ (отчет ${reports.map((d) => d.year).join(' и ')}) всяка болница е отделно парче, по региони, а неразпределеното е показано отделно. Плащанията за лекарства са 99,9% от платеното на болниците за противотуморни лекарства по бюджета, а тези за медицински изделия — само около половината от реда им: останалото не минава през отчетите по болници.`,
        `Hospital-care payments are the NHIF budget line “hospital care”${line2024 ? `: in 2024 they come to €${mn(care(2024), 'en')} m of the €${mn(line2024, 'en')} m in the budget execution report` : ''}. In “Spending” › Health › NHIF › Hospital care (${reports.map((d) => d.year).join(' and ')} actual) each hospital is a slice, by region, with the unattributed rest shown separately. The medicines payments are 99.9% of what the budget paid hospitals for cancer medicines; the medical devices ones only about half of their line: the rest does not go through the reports by hospital.`,
      ),
      t(
        'Освен болниците тук са и медицинските и диагностично-консултативните центрове, диализните центрове и другите заведения, на които касата плаща процедури или пътеки, както и болниците на министерствата на отбраната, вътрешните работи и транспорта. Имената са както са в отчетите на НЗОК.',
        'Besides hospitals the list has the medical and diagnostic centres, dialysis centres and other establishments the fund pays for procedures or pathways, and the hospitals of the defence, interior and transport ministries. Names are as in the NHIF reports.',
      ),
      t(
        `Регистрационният номер започва с кода на региона (РЗОК), следван от кода на общината по ЕКАТТЕ и от вида на заведението; общината е взета от него (за една болница — от името ѝ). За ${unplaced} заведения общината не е ясна: код „90“, общински код, различен от града в името, или болница на Софийска област, която е в София.`,
        `The registration number starts with the region (RZOK), then the municipality’s EKATTE code and the type of establishment; the municipality comes from it (for one hospital from its name). For ${unplaced} establishments it is not clear: code “90”, a municipality code that differs from the town in the name, or a Sofia Province hospital located in Sofia.`,
      ),
      t(
        `Финансовите показатели подават само държавните (с над 50% държавно участие) и общинските болници. Министерството ги назовава само по име; тук са свързани с номерата на НЗОК по име (${count(matched, 'bg')} от ${count(mohAll, 'bg')} болници в последните данни; останалите — главно центровете за психично здраве — не получават плащания за болнична помощ от касата). Приходите, разходите и преминалите болни са за цялата година (за последното тримесечие — от началото на годината), задълженията са в края на периода, персоналът и леглата са средно на месец. Последните данни на министерството са за III тримесечие на 2025 г.`,
        `Only state (over 50% state-owned) and municipal hospitals report these indicators. The ministry names them only by name; they are matched to the NHIF numbers by name here (${count(matched, 'en')} of ${count(mohAll, 'en')} hospitals in the latest data; the rest — mostly mental-health centres — get no hospital-care payments from the fund). Revenue, costs and patients are for the whole year (for the latest quarter, since 1 January), liabilities at the end of the period, staff and beds monthly averages. The ministry’s latest data are for Q3 2025.`,
      ),
      t(
        'Месечните суми са както са в отчетите, а годишните — от последния отчет за годината. Понякога касата прехвърля вече платено между болници (напр. през април 2025 г. 3,8 млн. лв. за лекарства — от СБАЛО Хасково към МБАЛ Хасково); тогава месеците на тези няколко болници не дават точно годишната сума.',
        'Monthly amounts are as in the reports, yearly ones from the year’s last report. Now and then the fund moves money already paid from one hospital to another (e.g. 3.8 million leva for medicines from СБАЛО Хасково to МБАЛ Хасково in April 2025); the months of those few hospitals then do not add up exactly to the year.',
      ),
      t(
        'Сумите за 2024 и 2025 г. и всички данни на министерството са в лева в източника и са превърнати в евро по фиксирания курс 1,95583 лв. за 1 €.',
        'Amounts for 2024 and 2025 and all of the ministry’s data are in leva in the source and are converted to euro at the fixed rate of 1.95583 leva per euro.',
      ),
      REUSE,
    ],
    asOf: `${latest}-${new Date(Number(latest.slice(0, 4)), Number(latest.slice(5)), 0).getDate()}`,
    retrieved: '2026-10-05',
    unit: { one: t('лечебно заведение', 'establishment'), other: t('лечебни заведения', 'establishments') },
    summary: periods.map((p) => `total.${p}`),
    sort: `-total.${years.at(-2) ?? years.at(-1)}`,
    links,
    columns,
    key: 'reg',
    titleColumn: 'name',
    rows,
  }
}

// ---------- medicines ----------

export type MedicineKind = 'home' | 'devices' | 'hospital'

export interface MedicineRow {
  report: 'home' | 'hospital'
  year: number
  atc: string
  name: string
  /** Euro. */
  amount: number
  patients: number | null
}

export interface MedicineGroup {
  kind: MedicineKind
  /** The code of the group's largest amount in its latest year. */
  atc: string
  codes: string[]
  /** The name that goes with that code; the others as published. */
  name: string
  names: string[]
  /** Euro by year. */
  years: Map<number, number>
  /** People treated in a year (only where the report gives it for a whole year). */
  patients: Map<number, number>
}

/** The fund's own codes for medical devices (W, Y, Z) and dietary foods (X) in the home-treatment report. */
const DEVICE_LETTERS = new Set(['W', 'X', 'Y', 'Z'])

/** An active-ingredient name compared across years: lower case, the parts of a combination in one order. */
export function innKey(name: string): string {
  const parts = name
    .toLowerCase()
    .split(/\s*(?:[/,+;]|\band\b|\bи\b)\s*/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  return [...new Set(parts)].sort().join('/')
}

/**
 * Medicines by active ingredient across years. WHO revises ATC codes (rituximab L01XC02 → L01FA01,
 * upadacitinib L04AA44 → L04AF03), and a few ingredients have several codes at once (insulin human,
 * dexamethasone), so a code and a name that appear on one row belong together, and every code and name
 * linked that way is one medicine — within each kind (home treatment, devices and foods, hospital).
 */
export function groupMedicines(rows: MedicineRow[]): MedicineGroup[] {
  const parent = new Map<string, string>()
  const find = (x: string): string => {
    let root = x
    while (parent.get(root) !== root) root = parent.get(root)!
    parent.set(x, root)
    return root
  }
  const add = (x: string) => {
    if (!parent.has(x)) parent.set(x, x)
  }
  const union = (a: string, b: string) => {
    add(a)
    add(b)
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(rb, ra)
  }
  const kindOf = (r: MedicineRow): MedicineKind => (r.report === 'hospital' ? 'hospital' : DEVICE_LETTERS.has(r.atc[0]) ? 'devices' : 'home')
  for (const r of rows) {
    const kind = kindOf(r)
    add(`${kind}|code|${r.atc}`)
    if (r.name) union(`${kind}|code|${r.atc}`, `${kind}|name|${innKey(r.name)}`)
  }
  const groups = new Map<string, { kind: MedicineKind; rows: MedicineRow[] }>()
  for (const r of rows) {
    const kind = kindOf(r)
    const root = find(`${kind}|code|${r.atc}`)
    const g = groups.get(root) ?? { kind, rows: [] }
    g.rows.push(r)
    groups.set(root, g)
  }
  return [...groups.values()].map(({ kind, rows: members }) => {
    const latest = Math.max(...members.map((r) => r.year))
    const lead = members.filter((r) => r.year === latest).sort((a, b) => b.amount - a.amount)[0]
    const named = members.filter((r) => r.name)
    const name = lead.name || named.sort((a, b) => b.year - a.year || b.amount - a.amount)[0]?.name || lead.atc
    const years = new Map<number, number>()
    const patients = new Map<number, number>()
    for (const r of members) {
      years.set(r.year, (years.get(r.year) ?? 0) + r.amount)
      if (r.patients !== null) patients.set(r.year, (patients.get(r.year) ?? 0) + r.patients)
    }
    const byAmount = (list: string[]) => [...new Set(list)]
    return {
      kind,
      atc: lead.atc,
      codes: byAmount([lead.atc, ...members.sort((a, b) => b.year - a.year || b.amount - a.amount).map((r) => r.atc)]),
      name,
      names: [...new Set(named.map((r) => r.name))].filter((n) => n !== name),
      years,
      patients,
    }
  })
}

export function readMedicines(dir: URL): MedicineRow[] {
  return readCsv(new URL('nhif-medicines.csv', dir)).map((r) => ({
    report: r.report as 'home' | 'hospital',
    year: Number(r.year),
    atc: r.atc,
    name: r.name,
    amount: toEuro(Number(r.amount), r.currency),
    patients: r.patients === '' ? null : Number(r.patients),
  }))
}

const ATC_GROUPS: Record<string, LocalizedText> = {
  A: t('Храносмилателна система и метаболизъм', 'Alimentary tract and metabolism'),
  B: t('Кръв и кръвотворни органи', 'Blood and blood-forming organs'),
  C: t('Сърдечно-съдова система', 'Cardiovascular system'),
  D: t('Дерматологични средства', 'Dermatologicals'),
  G: t('Пикочо-полова система и полови хормони', 'Genito-urinary system and sex hormones'),
  H: t('Хормони за системно приложение (без полови хормони и инсулини)', 'Systemic hormones (excluding sex hormones and insulins)'),
  J: t('Антиинфекциозни средства за системно приложение', 'Anti-infectives for systemic use'),
  L: t('Противотуморни и имуномодулиращи средства', 'Antineoplastic and immunomodulating agents'),
  M: t('Мускулно-скелетна система', 'Musculo-skeletal system'),
  N: t('Нервна система', 'Nervous system'),
  P: t('Противопаразитни средства', 'Antiparasitic products'),
  R: t('Дихателна система', 'Respiratory system'),
  S: t('Сетивни органи', 'Sensory organs'),
  V: t('Други лекарства', 'Various'),
  W: t('Изделия при диабет (тест-ленти, сензори, инсулинови помпи)', 'Diabetes devices (test strips, sensors, insulin pumps)'),
  X: t('Диетични храни за специални медицински цели', 'Foods for special medical purposes'),
  Y: t('Изделия за стоми', 'Ostomy products'),
  Z: t('Превръзки, катетри и други изделия', 'Dressings, catheters and other devices'),
}

/** Where the fund pays for it: pharmacies (home treatment) or hospitals (outside the clinical-pathway price). */
const KINDS: Record<MedicineKind, LocalizedText> = {
  home: t('Аптеки: лекарства', 'Pharmacies: medicines'),
  devices: t('Аптеки: изделия и храни', 'Pharmacies: devices, foods'),
  hospital: t('Болници: извън пътеката', 'Hospitals: outside the pathway'),
}

function medicinesList(config: { dir: URL; datasets: Dataset[] }): ListSpec {
  const rows = readMedicines(config.dir)
  const groups = groupMedicines(rows)
  const years = [...new Set(rows.map((r) => r.year))].sort()
  const latestYear = years.at(-1)!
  // The months of the latest year: the extract records how many monthly files it adds up.
  const latestMonths = Number(readCsv(new URL('nhif-medicines.csv', config.dir)).find((r) => Number(r.year) === latestYear)?.months ?? 12)
  const periods = years.map(String)
  const periodLabels = Object.fromEntries(years.map((y) => [String(y), yearLabel(y, y === latestYear ? latestMonths : 12)]))
  const patientYears = [...new Set(groups.flatMap((g) => [...g.patients.keys()]))].sort()
  const patientYear = patientYears.at(-1)
  const report = config.datasets.filter((d) => d.family === 'functions' && d.stage === 'report').sort((a, b) => b.year - a.year)[0]
  const columns: ListColumn[] = [
    { id: 'id', type: 'code', label: t('Номер', 'Id'), hidden: true },
    { id: 'name', type: 'text', label: t('Активно вещество (INN)', 'Active ingredient (INN)'), search: true },
    { id: 'atc', type: 'code', label: t('ATC код', 'ATC code'), search: true },
    { id: 'kind', type: 'category', label: t('Плащане', 'Paid as'), filter: true, labels: KINDS },
    { id: 'group', type: 'category', label: t('Група (ATC)', 'Group (ATC)'), filter: true, detail: true, labels: ATC_GROUPS },
    {
      id: 'amount',
      type: 'series',
      label: t('Платено от НЗОК', 'Paid by the NHIF'),
      periods,
      periodLabels,
      total: true,
      source: t('НЗОК, справки 1 (домашно лечение) и 7 (в болница, извън цената на пътеката) — реимбурсната сума', 'NHIF, reports 1 (home treatment) and 7 (in hospital, outside the pathway price) — the reimbursed amount'),
    },
    ...(patientYear
      ? [{ id: 'patients', type: 'number' as const, label: t(`Лекувани пациенти през ${patientYear} г.`, `Patients treated in ${patientYear}`), detail: true }]
      : []),
    { id: 'codes', type: 'text', label: t('ATC кодове през годините', 'ATC codes over the years'), detail: true, search: true },
    { id: 'names', type: 'text', label: t('Други изписвания в отчетите', 'Other spellings in the reports'), detail: true, search: true },
    {
      id: 'fund',
      type: 'node',
      label: t('Лекарства (НЗОК)', 'Medicines (NHIF)'),
      hidden: true,
      family: 'functions',
      dataset: report.id,
      labels: nodeLabels(report, ['h-nhif-medicines']),
    },
  ]
  const ids = new Set<string>()
  const out: ListCell[][] = groups.map((g) => {
    let id = `${g.kind}-${slug(g.atc)}`
    for (let i = 2; ids.has(id); i++) id = `${g.kind}-${slug(g.atc)}-${i}`
    ids.add(id)
    return [
      id,
      g.name,
      g.atc,
      g.kind,
      g.atc[0] in ATC_GROUPS ? g.atc[0] : null,
      years.map((y) => (g.years.has(y) ? Math.round(g.years.get(y)!) : null)),
      ...(patientYear ? [g.patients.get(patientYear) ?? null] : []),
      g.codes.length > 1 ? g.codes.join(', ') : null,
      g.names.length ? g.names.join('; ') : null,
      'h-nhif-medicines',
    ]
  })
  const functionYears = yearsOf(config.datasets, 'functions')
  return {
    id: 'medicines',
    group: HEALTH.id,
    title: t('Лекарства, платени от здравната каса', 'Medicines paid for by the health insurance fund'),
    short: t('Лекарства', 'Medicines'),
    description: t(
      `Колко е платила НЗОК за всяко активно вещество (INN) от ${years[0]} г. насам: за лекарствата, медицинските изделия и диетичните храни за домашно лечение, които отпускат аптеките, и за противотуморните лекарства и лекарствата за вродени коагулопатии, които касата плаща на болниците извън цената на клиничната пътека.`,
      `What the NHIF paid for each active ingredient (INN) since ${years[0]}: for the medicines, medical devices and dietary foods for home treatment dispensed by pharmacies, and for the cancer medicines and medicines for congenital coagulopathies the fund pays hospitals outside the clinical-pathway price.`,
    ),
    sources: [
      {
        name: t('НЗОК — справка 1: разходи за лекарствени продукти, медицински изделия и диетични храни за домашно лечение по НЗОК код и МКБ код', 'NHIF — report 1: spending on medicines, medical devices and dietary foods for home treatment by NHIF code and ICD code'),
        url: 'https://www.nhif.bg/bg/nzok/medicine/1',
      },
      {
        name: t('НЗОК — справка 7: разходи за противотуморни лекарства и лекарства за коагулопатии, платени извън стойността на КП/АПр, по ATC', 'NHIF — report 7: spending on cancer and coagulopathy medicines paid outside the clinical-pathway price, by ATC'),
        url: 'https://www.nhif.bg/bg/nzok/medicine/7',
      },
    ],
    caveats: [
      t(
        `Сумата е реимбурсната (платената от касата) стойност, преди отстъпките, които притежателите на разрешения за употреба връщат на касата (за 2025 г. 1,1 млрд. лв. по отчета за изпълнението на бюджета, редовете „възстановени разходи от ПРУ“), затова не се добавя към кръговата диаграма. Отчетите са по месеца на отпускане, бюджетът — по месеца на плащане. ${latestYear} г. е за ${latestMonths === 12 ? 'цялата година' : `януари–${MONTH_FULL_BG[latestMonths - 1]}`}.`,
        `The amount is the reimbursed (fund-paid) value, before the discounts marketing-authorisation holders pay back to the fund (1.1 billion leva in 2025 in the budget execution report, the rows “refunds under ПРУ”), so it is not added to the donut. The reports go by month of dispensing, the budget by month of payment. ${latestYear} covers ${latestMonths === 12 ? 'the whole year' : `January–${MONTH_FULL_EN[latestMonths - 1]}`}.`,
      ),
      t(
        'Един ред е едно активно вещество: Световната здравна организация сменя ATC кодовете (напр. ритуксимаб L01XC02 → L01FA01), а някои вещества имат по няколко кода (човешки инсулин, дексаметазон), затова кодовете и имената, които се срещат заедно в отчетите, са събрани в един ред; всички кодове са в подробностите. Кодовете W, X, Y и Z са на касата — за медицински изделия и диетични храни, не по ATC.',
        'One row is one active ingredient: the World Health Organization revises ATC codes (e.g. rituximab L01XC02 → L01FA01) and some ingredients have several codes (human insulin, dexamethasone), so codes and names that appear together in the reports are one row; every code is in the details. Codes W, X, Y and Z are the fund’s own, for medical devices and dietary foods, not ATC.',
      ),
      t(
        'Годините са сбор от месечните справки, а 2025 г. — от годишната справка (с по-късните корекции и новите ATC кодове; разликата спрямо месечните е под 0,3%). През юли 2022 г. справка 1 дава сумата „с отстъпка“. Пациентите са само за лекарствата в болница и само за година с годишна справка.',
        'Years add up the monthly reports; 2025 is from the annual report (with later corrections and the new ATC codes; it differs from the monthly ones by under 0.3%). In July 2022 report 1 gives the amount “after discount”. Patients are given only for hospital medicines and only for a year with an annual report.',
      ),
      t(
        'До 2025 г. сумите са в лева в източника и са превърнати в евро по фиксирания курс 1,95583 лв. за 1 €.',
        'Until 2025 the amounts are in leva in the source and are converted to euro at the fixed rate of 1.95583 leva per euro.',
      ),
      REUSE,
    ],
    asOf: `${latestYear}-${String(latestMonths).padStart(2, '0')}-${new Date(latestYear, latestMonths, 0).getDate()}`,
    retrieved: '2026-10-05',
    unit: { one: t('активно вещество', 'active ingredient'), other: t('активни вещества', 'active ingredients') },
    summary: periods.map((p) => `amount.${p}`),
    sort: `-amount.${years.at(-2) ?? latestYear}`,
    links: years
      .filter((y) => functionYears.includes(y))
      .map((year) => ({
        family: 'functions' as const,
        column: 'fund',
        years: [year],
        value: `amount.${year}`,
        label: during(year, year === latestYear ? latestMonths : 12),
        text: t(
          `За кои лекарства плаща касата: {total} ${during(year, year === latestYear ? latestMonths : 12).bg}`,
          `Which medicines the fund pays for: {total} ${during(year, year === latestYear ? latestMonths : 12).en}`,
        ),
      })),
    columns,
    key: 'id',
    titleColumn: 'name',
    rows: out,
  }
}

export function buildHealthLists(config: HealthConfig): ListSpec[] {
  return [hospitalsList(config), medicinesList(config)]
}
