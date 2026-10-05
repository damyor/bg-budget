import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { readCsv } from '../../../scripts/lib/csv.ts'
import { resolveRef } from '../listData'
import type { BudgetNode, Dataset, ListCell, ListFile, ListIndex } from '../types'

const sources = new URL('../../../data/sources/projects/', import.meta.url)
const data = new URL('../../../public/data/', import.meta.url)
const read = <T,>(file: string) => JSON.parse(readFileSync(new URL(file, data), 'utf8')) as T
const BGN = 1.95583
const kBgn = (k: number) => (k * 1000) / BGN

/** Rows of a list as objects keyed by column id. */
function rowsOf(list: ListFile): Record<string, ListCell>[] {
  return list.rows!.map((row) => Object.fromEntries(list.columns.map((c, i) => [c.id, row[i]])))
}

function nodes(root: BudgetNode): Map<string, BudgetNode> {
  const map = new Map<string, BudgetNode>()
  const walk = (n: BudgetNode) => {
    map.set(n.id, n)
    n.children?.forEach(walk)
  }
  walk(root)
  return map
}

const sum = (values: ListCell[]) => values.reduce<number>((s, v) => s + (typeof v === 'number' ? v : 0), 0)

describe('source extracts (data/sources/projects)', () => {
  it('add up to the totals printed in the documents', () => {
    const decree = readCsv(new URL('municipal-investment-2026-decree.csv', sources))
    const col = (rows: Record<string, string>[], c: string) => rows.reduce((s, r) => s + (Number(r[c]) || 0), 0)
    // ПМС № 103/2026, Annex 1, "Общо всичко:" (the printed totals were summed before rounding to the cent).
    expect(col(decree, 'agreement_EUR')).toBeCloseTo(3_006_870_159.18, -1)
    expect(col(decree, 'transfers_EUR')).toBeCloseTo(1_064_239_765.61, -1)
    expect(col(decree, 'forecast_2026_EUR')).toBeCloseTo(2_555_613_686.18, -1)
    expect(col(decree, 'later_EUR')).toBeCloseTo(923_459_145.22, -1)
    // 2025 report, attachment 7: transfers 749 999,99995 and Development Bank 76 795,1954 thousand leva.
    const report = readCsv(new URL('municipal-investment-2025-report.csv', sources))
    expect(col(report, 'transfer_2025_kBGN')).toBeCloseTo(750_000, 2)
    expect(col(report, 'bdb_2025_kBGN')).toBeCloseTo(76_795.195, 2)
    // Attachment 6, "ОБЩО": section I plan 2 924 945,9 and actual 2 401 383,7; section II 3 811 126,1 / 346 842,4.
    const national = readCsv(new URL('national-priority-projects-2025-report.csv', sources))
    const section = (s: string) => national.filter((r) => r.section === s)
    expect(col(section('I'), 'plan_2025_kBGN')).toBeCloseTo(2_924_945.9, 0)
    expect(col(section('I'), 'actual_2025_kBGN')).toBeCloseTo(2_401_383.7, 0)
    expect(col(section('II'), 'plan_2025_kBGN')).toBeCloseTo(3_811_126.1, 0)
    expect(section('I')).toHaveLength(176)
    expect(section('II')).toHaveLength(228)
  })
})

describe('national priority investment projects 2026–2028 (State Budget Act 2026, Annex 2)', () => {
  const list = read<ListFile>('lists/national-projects-2026.json')
  const rows = rowsOf(list)
  const byCode = new Map(rows.map((r) => [r.code as string, r]))

  it('has all 199 projects, €1.44 bn in 2026', () => {
    expect(list.count).toBe(199)
    expect(list.totals.capex).toEqual([1_438_621_100, 1_773_490_500, 2_244_940_100])
    expect(rows.filter((r) => r.institution === 'mod')).toHaveLength(34)
  })

  it('matches the annex for individual projects', () => {
    // No. 10: F-16 Block 70, phase II — 374 904,6 / 243 400,9 / 589 305,0 thousand euro.
    expect(byCode.get('NP-25.001-0016')).toMatchObject({ institution: 'mod', capex: [374_904_600, 243_400_900, 589_305_000], indicator: null })
    // No. 188: 274,8 in 2026, nothing printed for 2027, 4 864,8 in 2028.
    expect(byCode.get('NP-25.121-0006')).toMatchObject({ institution: 'moys', capex: [274_800, null, 4_864_800] })
    // No. 199 (Shipka monument) carries the "**" note; no. 142 is carried out by the railway infrastructure company.
    expect((byCode.get('NP-25.003-0019')!.note as { en: string }).en).toMatch(/Ministry of Culture/)
    expect(byCode.get('NP-25.001-0141')).toMatchObject({ institution: 'motc', implementer: 'nkzhi', capex: [30_053_400, 3_081_800, 5_136_300] })
    // Also in the 2025 programme: plan and actual from attachment 6.
    expect(byCode.get('NP-25.001-0016')).toMatchObject({ list2025: 'programme' })
  })

  it('equals the matching items of the programme budgets (ПМС № 102/2026) where the decree names them', () => {
    const ministries = nodes(read<Dataset>('ministries-2026.json').root)
    const total = (pick: (r: Record<string, ListCell>) => boolean) => sum(rows.filter(pick).map((r) => (r.capex as number[])[0]))
    expect(total((r) => r.implementer === 'nkzhi')).toBe(ministries.get('p2300-01-01-railway-infrastructure-upkeep-capital-transfers')!.value)
    expect(total((r) => r.implementer === 'bdz')).toBe(ministries.get('p2300-01-01-new-trains-and-rolling-stock-repairs')!.value)
    expect(total((r) => r.implementer === 'ports')).toBe(ministries.get('p2300-01-01-port-infrastructure')!.value)
    const health = ['p1600-02-02-priority-strategic-investment-projects', 'p1600-02-03-priority-strategic-investment-projects']
    expect(total((r) => r.institution === 'moh')).toBe(sum(health.map((id) => ministries.get(id)!.value)))
    expect((byCode.get('NP-25.001-0111')!.capex as number[])[0]).toBe(ministries.get('p2100-01-02-energy-efficiency-of-residential-buildings')!.value)
    // Defence's projects (€841.5 m) fit in its programmes' capital spending (€868.9 m).
    const capital = [...ministries.values()].filter((n) => n.id.startsWith('p1200-') && n.id.endsWith('-capital'))
    expect(total((r) => r.institution === 'mod')).toBeLessThan(sum(capital.map((n) => n.value)))
    expect(sum(capital.map((n) => n.value))).toBe(868_880_200)
  })
})

describe('national priority investment projects 2025 (2025 report, attachment 6)', () => {
  const list = read<ListFile>('lists/national-projects-2025.json')
  const rows = rowsOf(list)

  it('has the 176 projects of section I, in euro', () => {
    expect(list.count).toBe(176)
    expect(Math.abs((list.totals.plan as number) - kBgn(2_924_945.946))).toBeLessThan(100)
    expect(Math.abs((list.totals.actual as number) - kBgn(2_401_383.729))).toBeLessThan(100)
    // Without the six projects paid through transfers to other budgets: 170 projects, 2 891,8 million leva.
    const own = rows.filter((r) => !r.note)
    expect(own).toHaveLength(170)
    expect(Math.abs(sum(own.map((r) => r.plan)) - kBgn(2_891_827.604))).toBeLessThan(100)
  })

  it('shows plan, actual and the share spent per project', () => {
    const f16 = rows.find((r) => r.code === 'NP-25.001-0014')!
    expect(f16).toMatchObject({ institution: 'mod' })
    expect(f16.rate).toBeCloseTo((f16.actual as number) / (f16.plan as number), 6)
    // The transfers to universities report nothing here, and say so instead of showing 0% spent.
    const insait = rows.find((r) => r.code === 'NP-25.001-0048')!
    expect(insait).toMatchObject({ actual: null, rate: null })
    expect((insait.note as { bg: string }).bg).toMatch(/4\s?131,6 хил\. лв\./)
  })

  it('keeps both rows of the reserve-list project printed twice', () => {
    const reserve = read<ListFile>('lists/national-projects-2025-reserve.json')
    expect(reserve.count).toBe(228)
    expect(rowsOf(reserve).filter((r) => r.code === 'NP-25.002-0082').map((r) => r.no)).toEqual(['II-91', 'II-92'])
  })
})

describe('municipal investment programme (three sources joined on the project code)', () => {
  const list = read<ListFile>('lists/municipal-projects.json')
  const rows = rowsOf(list)
  const project = (code: string) => rows.find((r) => r.code === code)!

  it('has every project once, with totals equal to the sources’', () => {
    expect(list.count).toBe(3492)
    expect(new Set(rows.map((r) => r.code)).size).toBe(3492)
    // Each row is rounded to the euro, so the totals may differ by up to €0.50 a row.
    const near = (id: string, value: number) => expect(Math.abs((list.totals[id] as number) - value)).toBeLessThan(2000)
    near('paid2025', kBgn(826_795.195))
    near('forecast2026', 2_555_613_686.26)
    near('agreement', 3_010_451_096.68)
    near('paid', 1_121_972_229.26)
  })

  it('takes each column from its source', () => {
    // ipop.mrrb.bg: agreement 2 789 097,21, paid 2 629 780,95 = 2 376 722,72 by the ministry + 253 058,23 by the Development Bank.
    // ПМС № 103/2026: application, agreement, "- €" for 2026. Attachment 7: nothing paid in 2025.
    expect(project('OP-24.001-0001')).toMatchObject({
      municipality: 'blagoevgrad-bansko',
      province: 'blagoevgrad',
      agreement: 2_789_097,
      paid: 2_629_781,
      paidMrrb2024: 2_376_723,
      paidBdb: 253_058,
      forecast2026: null,
      paid2025: null,
      application: 'ПРО-236/12.01.2024',
      agreementNo: 'РД-02-30-159/14.03.2024',
    })
    // Attachment 7: 1 254,21417 thousand leva in 2025.
    expect(project('OP-24.001-0003').paid2025).toBe(Math.round(kBgn(1_254.21417)))
    // The decree: 872 536,16 € forecast for 2026.
    expect(project('OP-24.001-2355').forecast2026).toBe(872_536)
    // Sofia: the decree and ipop.mrrb.bg call it "Столична", the register "Столична община".
    expect(project('OP-24.001-1222')).toMatchObject({ municipality: 'sofiya-grad-stolichna-obshtina', province: 'sofiya-grad' })
  })

  it('links every project to its municipality in each year’s “Municipalities”', () => {
    const municipalities = new Set(rows.map((r) => r.municipality as string))
    expect(municipalities.size).toBe(264)
    expect(municipalities.has('kyustendil-treklyano')).toBe(false)
    for (const year of [2024, 2025, 2026]) {
      const tree = nodes(read<Dataset>(`municipalities-${year}.json`).root)
      for (const id of municipalities) expect(tree.get(id)?.kind?.en, `${id} in ${year}`).toBe('Municipality')
    }
    // Each municipality is in the province the filter says.
    for (const r of rows) expect((r.municipality as string).startsWith(`${r.province}-`) || r.province === 'sofiya-grad').toBe(true)
  })
})

describe('links from the tree to the lists', () => {
  const index = read<ListIndex>('lists/index.json')
  const link = (list: string, value: string) => index.links.find((l) => l.list === list && l.value === value)!

  it('totals each ministry’s and municipality’s projects', () => {
    expect(link('national-projects-2026', 'capex.2026').nodes.mod).toEqual([34, 841_511_200])
    const municipal = read<ListFile>('lists/municipal-projects.json')
    const plovdiv = rowsOf(municipal).filter((r) => r.municipality === 'plovdiv-plovdiv')
    expect(link('municipal-projects', 'forecast2026').nodes['plovdiv-plovdiv']).toEqual([plovdiv.length, sum(plovdiv.map((r) => r.forecast2026))])
    expect(link('municipal-projects', 'paid2025').nodes['plovdiv-plovdiv'][1]).toBe(sum(plovdiv.map((r) => r.paid2025)))
  })

  it('shows plan and actual of 2025 in the matching version of “Ministries 2025”', () => {
    expect(link('national-projects-2025', 'plan').stages).toEqual(['law'])
    expect(link('national-projects-2025', 'actual').stages).toEqual(['report'])
    const datasets = read<{ id: string; lists?: boolean }[]>('index.json')
    const flagged = datasets.filter((d) => d.lists).map((d) => d.id).sort()
    // Payments link to the ministries and to Sofia in every year from 2024; hospitals and medicines to the NHIF lines
    // of the plans and actuals of 2024–2026 (the 2027 forecast has no NHIF lines).
    expect(flagged).toEqual([
      'budget-2024',
      'budget-2025',
      'budget-2026',
      'ministries-2024',
      'ministries-2025',
      'ministries-2026',
      'ministries-report-2025',
      'municipalities-2024',
      'municipalities-2025',
      'municipalities-2026',
      'report-2024',
      'report-2025',
    ])
  })

  it('lists summaries the list files can resolve', () => {
    for (const meta of index.lists) {
      const list = read<ListFile>(meta.file)
      for (const ref of meta.summary) expect(resolveRef(list.columns, ref), `${meta.id}: ${ref}`).not.toBeNull()
    }
  })
})
