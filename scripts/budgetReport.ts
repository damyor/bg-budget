// "Report <year>": actual spending of the consolidated fiscal programme by
// function and sub-function, from the annual report on the execution of the
// State Budget. Below each sub-function the report says through whose budget
// the money was spent (state budget, social security funds, municipalities,
// EU funds …) and whether it was current or capital spending — those become
// the two deepest levels.
//
// Node ids down to sub-function level are the same as in the plans, so plan
// and actual can be compared.

import type { Dataset, DatasetSource, LocalizedText } from '../src/lib/types.ts'
import { num, readCsv } from './lib/csv.ts'
import { readKfpReport, reportKey, SUB, toEur, WHOLE, type KfpSlot, type KfpTotals, type ReportCell, type ReportLine, type ReportRow } from './lib/kfp.ts'
import type { YearMacro } from './lib/macro.ts'
import { build, MILLION, type Spec } from './lib/tree-builder.ts'
import { KIND, nhifTree } from './budgetPlan.ts'

const t = (bg: string, en: string): LocalizedText => ({ bg, en })

const SPENT_BY = t('Кой харчи', 'Spent by')
const TYPE = t('Вид разход', 'Type of expense')

/** Report columns grouped into the budgets people recognise. */
const PAYERS: { id: string; columns: RegExp; name: LocalizedText; note?: LocalizedText }[] = [
  {
    id: 'state',
    columns: /^ДБ$/,
    name: t('Държавен бюджет (министерства и ведомства)', 'State budget (ministries & agencies)'),
  },
  { id: 'nhif', columns: /^НЗОК$/, name: t('Здравна каса (НЗОК)', 'Health Insurance Fund (NHIF)') },
  {
    id: 'social-security',
    columns: /^Соц\.\s*осигу\s*ряване$/,
    name: t('Социалноосигурителни фондове', 'Social security funds'),
    note: t('Бюджетите на държавното обществено осигуряване (НОИ), Учителския пенсионен фонд и др.', 'The state social security (NOI) budgets, the Teachers’ Pension Fund etc.'),
  },
  { id: 'municipalities', columns: /^Общи\s*-?\s*ни$/i, name: t('Общини', 'Municipalities'), note: t('Общинските бюджети — с държавни трансфери и собствени приходи.', 'Municipal budgets — state transfers and their own revenue.') },
  {
    id: 'eu',
    columns: /^(Европ|Евр)\.?\s*(средства|ср-ва|ср\/ва)$/i,
    name: t('Европейски средства', 'EU funds'),
    note: t('Разходи по сметките за средства от Европейския съюз, вкл. националното съфинансиране.', 'Spending from the EU-funds accounts, including national co-financing.'),
  },
  { id: 'universities', columns: /^ДВУ$/, name: t('Държавни университети', 'State universities') },
  { id: 'academies', columns: /^(БАН|ССА)$/, name: t('БАН и Селскостопанска академия', 'Academy of Sciences & Agricultural Academy') },
  { id: 'media', columns: /^(БНР|БНТ|БТА)$/, name: t('Обществени медии (БНТ, БНР, БТА)', 'Public media (BNT, BNR, BTA)') },
  {
    id: 'fses',
    columns: /^ФСЕС$/,
    name: t('Фонд „Сигурност на електроенергийната система“', 'Electricity System Security Fund'),
    note: t('Компенсации за цените на електроенергията и подкрепа за производителите, финансирани основно от продажбата на въглеродни квоти.', 'Electricity price compensation and support for producers, funded mainly by the sale of carbon allowances.'),
  },
  {
    id: 'other',
    columns: /^(ДМП|ДП НПЦ|ПУДООС|ДПУСЯ|др\. сметки.*)$/,
    name: t('Други (международни програми, държавни предприятия и др.)', 'Other (international programmes, state enterprises etc.)'),
  },
]

const LINES: Record<ReportLine, LocalizedText> = {
  current: t('Текущи разходи (заплати, издръжка, помощи)', 'Current spending (pay, running costs, benefits)'),
  capital: t('Капиталови разходи (инвестиции)', 'Capital spending (investment)'),
  abroad: t('Трансфери за чужбина', 'Transfers abroad'),
  interest: t('Лихви', 'Interest'),
  disaster: t('Предотвратяване и ликвидиране на последиците от бедствия', 'Disaster prevention & recovery'),
}

/** Negative cells below this size are rounding noise and are dropped. */
const NOISE = 0.15 * MILLION

function payerOf(column: string) {
  const payer = PAYERS.find((p) => p.columns.test(column))
  if (!payer) throw new Error(`Report: unknown column "${column}"`)
  return payer
}

/** Sums cells by payer group, keeping the order of PAYERS. */
function byPayer(cells: ReportCell[]): Map<string, number> {
  const sums = new Map<string, number>()
  for (const cell of cells) {
    if (cell.column === 'КФП') continue
    const id = payerOf(cell.column).id
    sums.set(id, (sums.get(id) ?? 0) + cell.value)
  }
  return sums
}

const kfpTotal = (cells: ReportCell[] | undefined) => cells?.find((c) => c.column === 'КФП')?.value ?? 0

/** True when every value is positive or rounding noise. */
const splittable = (values: number[]) => values.every((v) => v > -NOISE)

/**
 * The levels below a КФП slot: by payer, then by economic line. Where a split
 * would contain a real negative amount (e.g. a consolidation adjustment in the
 * state budget), that split is skipped and the node says why.
 */
function reportChildren(slotId: string, row: ReportRow): Partial<Spec> {
  const payers = byPayer(row.total)
  const lineKeys = Object.keys(row.lines) as ReportLine[]
  const lineSplit = (id: string, pick: (cells: ReportCell[]) => number): Spec[] | undefined => {
    const values = lineKeys.map((line) => [line, pick(row.lines[line]!)] as const).filter(([, v]) => Math.abs(v) > 0)
    if (values.length < 2 || !splittable(values.map(([, v]) => v))) return undefined
    return values.filter(([, v]) => v > 0).map(([line, v]) => ({ id: `${id}.${line}`, kind: TYPE, name: LINES[line], value: v }))
  }

  if (splittable([...payers.values()])) {
    const children: Spec[] = []
    for (const payer of PAYERS) {
      const value = payers.get(payer.id)
      if (!(value && value > 0)) continue
      const id = `${slotId}.${payer.id}`
      const cols = (cells: ReportCell[]) => cells.filter((c) => c.column !== 'КФП' && payerOf(c.column).id === payer.id).reduce((s, c) => s + c.value, 0)
      children.push({ id, kind: SPENT_BY, name: payer.name, note: payer.note, value, children: lineSplit(id, cols) })
    }
    return { children, rest: { id: `${slotId}.rounding`, name: t('Закръгляне', 'Rounding') } }
  }

  // A negative payer amount: split by economic line only (whole-programme figures).
  const children = lineSplit(slotId, kfpTotal)
  const negatives = [...payers].filter(([, v]) => v <= -NOISE)
  const amount = (v: number, lang: 'bg' | 'en') => {
    const m = (v / MILLION).toLocaleString(lang === 'bg' ? 'bg-BG' : 'en-GB', { maximumFractionDigits: 0 })
    return lang === 'bg' ? `${m} млн. €` : `€${m} m`
  }
  const list = (lang: 'bg' | 'en') =>
    negatives.map(([id, v]) => `${PAYERS.find((p) => p.id === id)!.name[lang]}: ${amount(v, lang)}`).join('; ')
  return {
    children,
    rest: { id: `${slotId}.rounding`, name: t('Закръгляне', 'Rounding') },
    note: t(
      `Разбивката по бюджети не е показана, защото в отчета има отрицателна сума (${list('bg')}) — корекция при консолидацията: тези средства са отчетени като разход в другите бюджети.`,
      `The split by budget is not shown because the report has a negative amount (${list('en')}) — a consolidation adjustment: the money is recorded as spending in the other budgets.`,
    ),
  }
}

/**
 * Health with the Health Insurance Fund's own execution report: the fund by
 * expense line (the same nodes as in the plans, so plan and actual compare),
 * municipalities from the consolidated report, and everything else as the
 * remainder — the same shape as the plans.
 */
function healthWithNhif(row: ReportRow, nhif: Spec): Spec {
  const total = kfpTotal(row.total)
  const municipalities = byPayer(row.total).get('municipalities') ?? 0
  const municipal = PAYERS.find((p) => p.id === 'municipalities')!
  const lineValue = (line: ReportLine) => (row.lines[line] ?? []).filter((c) => c.column !== 'КФП' && payerOf(c.column).id === 'municipalities').reduce((s, c) => s + c.value, 0)
  const lines = (Object.keys(row.lines) as ReportLine[]).map((line) => [line, lineValue(line)] as const).filter(([, v]) => v > 0)
  return {
    id: 'health',
    kind: KIND.area,
    name: t('Здравеопазване', 'Health'),
    value: total,
    children: [
      nhif,
      {
        id: 'health.municipalities',
        kind: KIND.fund,
        name: municipal.name,
        note: municipal.note,
        value: municipalities,
        children: lines.length > 1 ? lines.map(([line, v]) => ({ id: `health.municipalities.${line}`, kind: TYPE, name: LINES[line], value: v })) : undefined,
      },
    ],
    // Not 'h-other': the plans' remainder excludes only the state-delegated municipal funding, so the two differ in scope.
    rest: {
      id: 'health.other',
      name: t('Министерство на здравеопазването, болници, европейски средства и др.', 'Ministry of Health, hospitals, EU funds and other'),
      note: t(
        'Всички разходи за здравеопазване извън НЗОК и общините — Министерството на здравеопазването (спешна помощ, профилактика, държавни болници), ведомствените болници, европейските средства и др. Изчислени са като разлика, затова поемат и разликите в обхвата между отчета на НЗОК и консолидирания отчет.',
        'All health spending outside the NHIF and municipalities — the Ministry of Health (emergency care, prevention, state hospitals), the ministries’ own hospitals, EU funds and other. Computed as the remainder, so it also absorbs the difference in scope between the NHIF report and the consolidated report.',
      ),
    },
  }
}

/** The fund's execution table (row numbers of the 2025 budget act), actual column, EUR. */
function nhifActual(file: URL, year: number, note: LocalizedText): Spec {
  const rows = readCsv(file).filter((r) => r.table_idx === '2')
  const v = (rowNo: string) => {
    const row = rows.find((r) => r.row_no.trim() === rowNo)
    if (!row) throw new Error(`NHIF report ${year}: no row ${rowNo}`)
    const value = num(row.actual_kBGN)
    return Number.isNaN(value) ? 0 : toEur(value, 'kBGN')
  }
  return nhifTree(v, 2025, note)
}

export interface ReportConfig {
  year: number
  file: URL
  totals: KfpTotals
  /** The Health Insurance Fund's execution report (law / amended plan / actual by expense line). */
  nhif?: { file: URL; note: LocalizedText }
  macro: YearMacro
  description: LocalizedText
  sources: DatasetSource[]
  sourceShort: LocalizedText
  retrieved: string
}

export function buildBudgetReport(config: ReportConfig): Dataset {
  const report = readKfpReport(config.file)
  const row = (slot: KfpSlot) => {
    const r = report.get(reportKey(slot))
    if (!r) throw new Error(`Report ${config.year}: no row ${reportKey(slot)} (${slot.id})`)
    return r
  }
  const fnTotal = (fn: number) => kfpTotal(report.get(String(fn))?.total)
  const slot = (id: string, kind = KIND.sub): Spec => {
    const s = SUB[id] ?? WHOLE[id]
    const r = row(s)
    return { id: s.id, kind, name: s.name, value: kfpTotal(r.total), ...reportChildren(s.id, r) }
  }
  const area = (id: string, name: LocalizedText, extra: Partial<Spec>): Spec => ({ id, kind: KIND.area, name, ...extra })

  const interest = fnTotal(9)
  if (Math.abs(interest - config.totals.interest) > 0.5 * MILLION) throw new Error(`Report ${config.year}: interest does not match`)

  const root: Spec = {
    id: 'root',
    name: t('Всички публични разходи', 'All public spending'),
    value: config.totals.totalWithEu,
    children: [
      area('social', t('Пенсии и социална защита', 'Pensions & social protection'), { value: fnTotal(5), children: [slot('s-pensions'), slot('s-benefits'), slot('s-services')] }),
      area('economy', t('Икономика и транспорт', 'Economy & transport'), {
        value: fnTotal(8),
        children: [slot('e-transport'), slot('e-energy'), slot('e-other'), slot('e-agriculture'), slot('e-tourism'), slot('e-industry')],
      }),
      config.nhif
        ? healthWithNhif(row(WHOLE.health), nhifActual(config.nhif.file, config.year, config.nhif.note))
        : { ...slot('health', KIND.area), name: t('Здравеопазване', 'Health') },
      { ...slot('education', KIND.area), name: t('Образование', 'Education') },
      area('government', t('Държавно управление, дълг и ЕС', 'Government, debt & EU'), {
        children: [
          { id: 'g-general', kind: KIND.func, name: t('Общи държавни служби', 'General public services'), value: fnTotal(1), children: [slot('g-executive'), slot('g-science'), slot('g-services')] },
          {
            id: 'g-eu',
            kind: KIND.func,
            name: t('Вноска в бюджета на ЕС', 'Contribution to the EU budget'),
            value: config.totals.euContribution,
            note: t(
              'Вноската на България в общия бюджет на Европейския съюз. Срещу нея страната получава европейски средства, които финансират част от разходите в другите области.',
              "Bulgaria's contribution to the EU budget. In return the country receives EU funds that pay for part of the spending in other areas.",
            ),
          },
          { ...slot('g-interest', KIND.func) },
        ],
      }),
      area('order', t('Ред, сигурност и правосъдие', 'Public order, safety & justice'), { children: [slot('o-police'), slot('o-judiciary'), slot('o-prisons'), slot('o-civil')] }),
      {
        ...slot('defence', KIND.area),
        note: t(
          'Групата „Отбрана“ в консолидираната фискална програма. Целият бюджет на Министерството на отбраната е по-голям, защото включва и военни болници, училища и др.',
          'The defence group of the consolidated fiscal programme. The whole Ministry of Defence budget is larger, as it also covers military hospitals, schools etc.',
        ),
      },
      area('community', t('Комунални дейности, култура и околна среда', 'Communities, culture & environment'), {
        children: [
          slot('c-housing', KIND.func),
          slot('c-environment', KIND.func),
          {
            id: 'c-culture',
            kind: KIND.func,
            name: t('Култура, спорт и религия', 'Culture, sport & religion'),
            value: fnTotal(7),
            children: [slot('c-culture-culture'), slot('c-sport'), slot('c-religion'), slot('c-recreation')],
          },
        ],
      }),
    ],
  }

  const tree = build(root)
  const sum = tree.children!.reduce((s, c) => s + c.value, 0)
  if (Math.abs(sum - tree.value) > MILLION) throw new Error(`Report ${config.year}: areas sum to ${sum}, total ${tree.value}`)

  return {
    id: `report-${config.year}`,
    year: config.year,
    kind: 'actual',
    stage: 'report',
    family: 'functions',
    title: t(`Отчет ${config.year}`, `${config.year} actual`),
    subtitle: t('Консолидирана фискална програма, изпълнение', 'Consolidated fiscal programme, outturn'),
    description: config.description,
    currency: 'EUR',
    sourceCurrency: 'BGN',
    population: config.macro.population,
    populationNote: config.macro.populationNote,
    gdp: config.macro.gdp,
    gdpNote: config.macro.gdpNote,
    levels: [KIND.area, KIND.func, SPENT_BY, TYPE],
    sources: config.sources,
    sourceShort: config.sourceShort,
    retrieved: config.retrieved,
    root: tree,
  }
}
