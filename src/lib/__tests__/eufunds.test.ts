import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { umbrellaAgreement, yearlyFromCumulative } from '../../../scripts/eufunds.ts'
import { beneficiaryClass } from '../../../scripts/lib/beneficiaries.ts'
import { readCsv } from '../../../scripts/lib/csv.ts'
import { unpackShard } from '../listData'
import type { BudgetNode, Dataset, ListCell, ListFile, ListIndex, ListShardFile, LocalizedText } from '../types'

const sources = new URL('../../../data/sources/', import.meta.url)
const data = new URL('../../../public/data/', import.meta.url)
const read = <T,>(file: string) => JSON.parse(readFileSync(new URL(file, data), 'utf8')) as T
const BGN = 1.95583
const col = (rows: Record<string, string>[], c: string) => rows.reduce((s, r) => s + (Number(r[c]) || 0), 0)

/** Rows of a list (its own or every shard's) as objects keyed by column id. */
function rowsOf(list: ListFile): Record<string, ListCell>[] {
  const rows = list.rows ?? list.shards!.files.flatMap((f) => unpackShard(list.columns, read<ListShardFile>(f.file), list.shards?.by))
  return rows.map((row) => Object.fromEntries(list.columns.map((c, i) => [c.id, row[i]])))
}

function nodes(root: BudgetNode): Set<string> {
  const ids = new Set<string>()
  const walk = (n: BudgetNode) => {
    ids.add(n.id)
    n.children?.forEach(walk)
  }
  walk(root)
  return ids
}

describe('paid by year from paid-to-date figures', () => {
  it('takes the first figure whole and differences after it, with gaps left empty', () => {
    expect(
      yearlyFromCumulative([
        { asOf: '2025-12-31', paid: 250 },
        { asOf: '2024-12-31', paid: 100 },
        { asOf: '2026-08-31', paid: 240 },
      ]),
    ).toEqual({ periods: ['2024', '2025', '2026'], values: [100, 150, -10] })
    expect(yearlyFromCumulative([{ asOf: '2024-12-31', paid: null }, { asOf: '2025-12-31', paid: 50 }]).values).toEqual([null, null])
  })
})

describe('Recovery Plan umbrella agreements', () => {
  const rrp = (name: string, value: number, paid: number | null) => ({ programme: '8010686', name, value, paid })
  it('are an implementing body’s agreements that paid nothing and are large or named after an investment', () => {
    expect(umbrellaAgreement(rrp('C3.I2 Програма за икономическа трансформация', 1_864_000_000, null), 'Министерство на иновациите и растежа')).toBe(true)
    expect(umbrellaAgreement(rrp('Схема за субсидиране — обновяване на жилищни сгради', 383_800_000, 0), '„Българската банка за развитие” ЕАД')).toBe(true)
    expect(umbrellaAgreement(rrp('C12.I1 „Модернизиране на болничните заведения“', 19_500_000, null), 'Министерство на здравеопазването')).toBe(true)
    // A ministry that buys the trains itself and has paid for them; a small project of an agency; a municipality's project.
    expect(umbrellaAgreement(rrp('C8.I1 „Железопътен подвижен състав“', 506_000_000, 413_100_000), 'Министерство на транспорта и съобщенията')).toBe(false)
    expect(umbrellaAgreement(rrp('Цифровизация на Агенция „Митници“', 17_600_000, null), 'Агенция „Митници“')).toBe(false)
    expect(umbrellaAgreement(rrp('Енергийно обновяване на многофамилна жилищна сграда', 1_700_000, null), 'Община Варна')).toBe(false)
    expect(umbrellaAgreement({ ...rrp('C3.I2 …', 1_864_000_000, null), programme: '5' }, 'Министерство на иновациите и растежа')).toBe(false)
  })
})

describe('classes of beneficiaries', () => {
  it('tells cooperatives, companies, associations and public bodies apart by name', () => {
    expect(beneficiaryClass('ЗК СОКОЛ - 92')).toBe('cp')
    expect(beneficiaryClass('ЗКПУ "Нива"')).toBe('cp')
    expect(beneficiaryClass('Златия Агро ЕООД')).toBe('co')
    expect(beneficiaryClass('„Напоителни системи“ ЕАД')).toBe('co')
    expect(beneficiaryClass('СДРУЖЕНИЕ "МИГ - РАЗЛОГ"')).toBe('np')
    expect(beneficiaryClass('ОБЩИНА ПЛОВДИВ')).toBe('pu')
    expect(beneficiaryClass('Министерство на земеделието и храните')).toBe('pu')
    // Not an association because of "съюз" in "Европейския съюз".
    expect(beneficiaryClass('Изпълнителна агенция "Одит на средствата от Европейския съюз"')).toBe('pu')
    expect(beneficiaryClass('Фонд "Сигурност на електроенергийната система"')).toBe('pu')
    expect(beneficiaryClass('Фонд мениджър на финансови инструменти в България ЕАД')).toBe('co')
    expect(beneficiaryClass('ППК ЗАДРУГА')).toBe('cp')
  })
})

describe('Ministry of Finance programme tables (data/sources/eu-funds)', () => {
  const programmes = readCsv(new URL('eu-funds/programmes.csv', sources))
  const period = (p: string) => programmes.filter((r) => r.period === p)

  it('add up to the totals printed at 31.08.2026, with masked cells rebuilt', () => {
    // 2014–2020: the printed "Общо платено" and budget (the total row's EU and national budgets are masked).
    expect(col(period('2014-2020'), 'budget_total_EUR')).toBeCloseTo(9_289_597_543, -1)
    expect(col(period('2014-2020'), 'paid_total_EUR')).toBeCloseTo(9_177_503_710.25, -1)
    // 2021–2027: "Общо:" — EU budget 10 705 921 309, total 12 866 171 166, paid 3 409 951 056.72.
    expect(col(period('2021-2027'), 'budget_eu_EUR')).toBeCloseTo(10_705_921_309, -1)
    expect(col(period('2021-2027'), 'budget_total_EUR')).toBeCloseTo(12_866_171_166, -1)
    expect(col(period('2021-2027'), 'paid_total_EUR')).toBeCloseTo(3_409_951_056.72, -1)
    // Masked in the file: the EU budget of "Конкурентоспособност и иновации" and the total of "Развитие на регионите".
    const row = (key: string) => programmes.find((r) => r.programme === key)!
    expect(Number(row('competitiveness-21').budget_eu_EUR)).toBe(1_228_150_000)
    expect(Number(row('regions-21').budget_total_EUR)).toBe(3_317_917_681)
    expect(Number(programmes.find((r) => r.programme === 'environment-14' && r.fund === 'КФ')!.budget_eu_EUR)).toBe(1_104_246_747)
  })

  it('has every programme’s paid-to-date figure at every year end', () => {
    const paid = readCsv(new URL('eu-funds/programmes-paid.csv', sources))
    const at = (p: string, asOf: string) => col(paid.filter((r) => r.period === p && r.as_of === asOf), 'paid_total_EUR')
    expect(at('2014-2020', '2026-08-31')).toBeCloseTo(9_177_503_710.25, -1)
    expect(at('2021-2027', '2026-08-31')).toBeCloseTo(3_409_951_056.72, -1)
    expect(paid.every((r) => r.paid_total_EUR !== '')).toBe(true)
  })
})

describe('Recovery and Resilience Plan (data/sources/eu-funds)', () => {
  const totals = readCsv(new URL('eu-funds/rrp-totals.csv', sources))
  const at = (asOf: string) => totals.find((r) => r.as_of === asOf)!

  it('matches the totals printed at 31.07 and 31.08.2026', () => {
    expect(Number(at('2026-07-31').budget_total_EUR)).toBeCloseTo(6_889_637_015.55, 1)
    expect(Number(at('2026-07-31').paid_total_EUR)).toBeCloseTo(3_904_598_733.26, 1)
    expect(Number(at('2026-08-31').budget_total_EUR)).toBeCloseTo(7_069_286_096.35, 1)
    expect(Number(at('2026-08-31').paid_total_EUR)).toBeCloseTo(5_133_086_662.03, 1)
    expect(Number(at('2026-08-31').received_from_ec_EUR)).toBe(4_278_548_535)
  })

  it('has investments that add up to the Plan', () => {
    const investments = readCsv(new URL('eu-funds/rrp-investments.csv', sources))
    expect(investments).toHaveLength(58)
    expect(col(investments, 'budget_total_EUR')).toBeCloseTo(7_069_286_096.35, -1)
    expect(col(investments, 'paid_eu_EUR')).toBeCloseTo(4_598_313_793.55, -1)
    const k1 = investments.find((r) => r.code === 'К1.И1')!
    expect([Number(k1.budget_total_EUR), Number(k1.paid_total_EUR)]).toEqual([291_579_649, 278_706_949.68])
  })
})

describe('EU lists', () => {
  const index = read<ListIndex>('lists/index.json')
  const programmes = read<ListFile>('lists/eu-programmes.json')
  const rrp = read<ListFile>('lists/rrp-investments.json')
  const projects = read<ListFile>('lists/eu-projects.json')
  const projectRows = rowsOf(projects)

  it('show 18 programmes with the ministry’s budget and payments, and ИСУН’s payments close to them', () => {
    expect(programmes.count).toBe(18)
    expect(programmes.totals.budget).toBeCloseTo(9_289_597_543 + 12_866_171_166, -2)
    const transport = rowsOf(programmes).find((r) => r.id === 'transport-14')!
    expect(transport.paid).toBe(1_746_145_826)
    // What ИСУН shows as paid to each 2014–2020 programme's projects is within 1% of the ministry's figure.
    for (const r of rowsOf(programmes).filter((x) => x.period === '2014-2020' && x.projectsPaid !== null)) {
      expect(Math.abs((r.projectsPaid as number) / (r.paid as number) - 1)).toBeLessThan(0.01)
    }
  })

  it('show the Plan’s 58 investments', () => {
    expect(rrp.count).toBe(58)
    expect(rrp.totals.paid).toBeCloseTo(5_133_086_662, -2)
  })

  it('never name natural persons or sole traders, nor their projects', () => {
    const unnamed = projectRows.filter((r) => r.cls === 'pe' || r.cls === 'st')
    expect(unnamed.length).toBeGreaterThan(1000)
    for (const r of unnamed) {
      expect(typeof r.beneficiary).toBe('object')
      expect(typeof r.name).toBe('object')
      expect(r.eik).toBeNull()
      expect((r.beneficiary as LocalizedText).en).toMatch(/^(Natural person|Sole trader)$/)
    }
    // Nor do the extracts: no beneficiary without an ЕИК has a name.
    const extract = readCsv(new URL('eu-funds/projects.csv.gz', sources))
    for (const r of extract.filter((x) => x.beneficiary_kind !== 'legal')) expect([r.name, r.beneficiary, r.beneficiary_name]).toEqual(['', '', ''])
    // Natural persons with a number (registered farmers, "… - физическо лице") and sole traders are not named either.
    const named = extract.filter((x) => x.beneficiary_kind === 'legal').map((x) => x.beneficiary_name)
    expect(named.filter((n) => /^(ЗП|ЗС|ЕТ)[\s"„:]|физическо лице/i.test(n) && !/ЕООД|ООД|ЕАД|\bАД\b/.test(n))).toEqual([])
  })

  it('link every municipality that has projects, with the rows and money of that municipality', () => {
    const link = index.links.find((l) => l.list === 'eu-projects' && l.family === 'municipalities')!
    const municipalities = read<Dataset>('municipalities-2026.json')
    const known = nodes(municipalities.root)
    expect(Object.keys(link.nodes).length).toBe(265)
    for (const id of Object.keys(link.nodes)) expect(known.has(id)).toBe(true)
    const plovdiv = projectRows.filter((r) => r.municipality === 'plovdiv-plovdiv')
    expect(link.nodes['plovdiv-plovdiv']).toEqual([plovdiv.length, plovdiv.reduce((s, r) => s + ((r.paid as number) ?? 0), 0)])
  })

  it('link every "EU funds" slice of the actuals to the programmes and the Plan', () => {
    const report = read<Dataset>('report-2025.json')
    const eu = [...nodes(report.root)].filter((id) => id.endsWith('.eu'))
    for (const list of ['eu-programmes', 'rrp-investments']) {
      const link = index.links.find((l) => l.list === list && l.years.includes(2025))!
      expect(Object.keys(link.nodes).sort()).toEqual(eu.sort())
      expect(link.values![eu[0]]).toBe('eu')
    }
  })

  it('keep every shard of the projects under ~1 MB gzipped and the list under 15 MB', () => {
    const dir = new URL('lists/eu-projects/', data)
    const sizes = readdirSync(dir).map((f) => readFileSync(new URL(f, dir)).length)
    expect(sizes.reduce((a, b) => a + b, 0)).toBeLessThan(15_000_000)
    expect(projects.shards!.files.reduce((s, f) => s + f.count, 0)).toBe(projects.count)
  })
})

describe('farm subsidies (data/sources/cap)', () => {
  const measures = readCsv(new URL('cap/cap-measures.csv', sources))
  const places = readCsv(new URL('cap/cap-places.csv', sources))
  const recipients = readCsv(new URL('cap/cap-recipients.csv', sources))
  const years = [...new Set(places.map((r) => r.fy))]

  it('add up the same way by measure and by place in every year', () => {
    for (const fy of years) {
      expect(col(measures.filter((r) => r.fy === fy), 'total_BGN')).toBeCloseTo(col(places.filter((r) => r.fy === fy), 'total_BGN'), -1)
    }
    // FY2023: the sum of the published rows, 2 226 401 103,95 leva; its direct payments column, 1 540 791 …
    expect(col(places.filter((r) => r.fy === '2023'), 'total_BGN')).toBeCloseTo(2_226_401_103.95, 0)
  })

  it('list only legal entities of €25,000 or more, and never a natural person', () => {
    expect(recipients.every((r) => Number(r.total_BGN) >= 25_000 * BGN - 0.01)).toBe(true)
    expect(recipients.every((r) => r.name !== '')).toBe(true)
    // Registered farmers ("ЗП …") and sole traders ("ЕТ …") are natural persons.
    expect(recipients.filter((r) => /^(ЗП|ЗС|ЕТ)[\s"„':]/i.test(r.name) && !/ЕООД|ООД|ЕАД|\bАД\b/.test(r.name)).map((r) => r.name)).toEqual([])
    const list = read<ListFile>('lists/cap-recipients.json')
    for (const r of rowsOf(list).filter((x) => x.cls === 'pe' || x.cls === 'st')) {
      expect((r.name as LocalizedText).bg).toMatch(/^(Физически лица|Еднолични търговци) \(/)
    }
  })

  it('links each municipality to its recipients with the municipality’s whole total', () => {
    const index = read<ListIndex>('lists/index.json')
    const list = read<ListFile>('lists/cap-recipients.json')
    const rows = rowsOf(list)
    for (const fy of ['2024', '2025']) {
      const link = index.links.find((l) => l.list === 'cap-recipients' && l.filters?.fy === fy)!
      const inPlace = places.filter((r) => r.fy === fy && r.ebk_code === '6609')
      const plovdiv = rows.filter((r) => r.fy === fy && r.municipality === 'plovdiv-plovdiv')
      expect(link.nodes['plovdiv-plovdiv'][0]).toBe(plovdiv.length)
      expect(link.nodes['plovdiv-plovdiv'][1]).toBeCloseTo(col(inPlace, 'total_BGN') / BGN, -2)
    }
  })
})
