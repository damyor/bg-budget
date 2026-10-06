import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { LARGE, LISTED_FROM, payeeMatches, readProcurement, VALUE_ERRORS, type ProcurementData } from '../../../scripts/procurement.ts'
import { readCsv } from '../../../scripts/lib/csv.ts'
import { checkList, finishList, readNodeLinks, type ListSpec } from '../../../scripts/lib/lists.ts'
import { breakdownGroups, cellText, labelOf, searchTexts, shardsToLoad, unpackShard } from '../listData'
import type { ListCell, ListColumn, ListFile, ListIndex, ListShardFile } from '../types'

const sourcesDir = new URL('../../../data/sources/', import.meta.url)
const data = new URL('../../../public/data/', import.meta.url)
const read = <T,>(file: string) => JSON.parse(readFileSync(new URL(file, data), 'utf8')) as T
const YEARS = ['2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026']

/** Rows of a list (its own or every shard's) as objects keyed by column id. */
function rowsOf(list: ListFile): Record<string, ListCell>[] {
  const rows = list.rows ?? list.shards!.files.flatMap((f) => unpackShard(list.columns, read<ListShardFile>(f.file), list.shards?.hash ? undefined : list.shards?.by))
  return rows.map((row) => Object.fromEntries(list.columns.map((c, i) => [c.id, row[i]])))
}

const t = (s: string) => ({ bg: s, en: s })

describe('list format: shards to choose, links between lists, breakdowns sorted by a period', () => {
  const columns: ListColumn[] = [
    { id: 'k', type: 'code', label: t('K') },
    { id: 'name', type: 'text', label: t('Name'), link: { list: 'page', filter: 'id', column: 'pageId' } },
    { id: 'pageId', type: 'code', label: t('Page'), hidden: true },
    { id: 'year', type: 'category', label: t('Year'), filter: true, labels: { '2025': t('2025'), '2026': t('2026') } },
    { id: 'amount', type: 'money', label: t('Amount'), total: true },
  ]
  const spec: ListSpec = {
    id: 'demo',
    group: 'g',
    title: t('Demo'),
    short: t('Demo'),
    description: t('Demo'),
    sources: [],
    caveats: [],
    asOf: '2026-09-30',
    retrieved: '2026-10-05',
    unit: { one: t('row'), other: t('rows') },
    summary: ['amount'],
    sort: '-amount',
    columns,
    key: 'k',
    rows: [
      ['a', 'Alpha', 'p1', '2025', 10],
      ['b', 'Beta', null, '2026', 20],
    ],
    shardBy: 'year',
    shardChoose: true,
  }

  it('waits for a value of the shard column when the list says so, however few its rows', () => {
    const { file } = finishList(spec, 1)
    expect(file.shards?.choose).toBe(true)
    expect(shardsToLoad(file.shards!, file.count, {})).toBeNull()
    expect(shardsToLoad(file.shards!, file.count, { year: '2026' })!.map((f) => f.value)).toEqual(['2026'])
    const { file: open } = finishList({ ...spec, shardChoose: false }, 1)
    expect(shardsToLoad(open.shards!, open.count, {})).toHaveLength(2)
  })

  it('checks that a linked column is text or code and links by a column the list has', () => {
    expect(checkList(spec, [])).toEqual([])
    const bad = { ...spec, columns: columns.map((c) => (c.id === 'name' ? { ...c, link: { list: 'page', filter: 'id', column: 'nope' } } : c.id === 'amount' ? { ...c, link: { list: 'page', filter: 'id' } } : c)) }
    expect(checkList(bad, []).join('\n')).toMatch(/name links by an unknown column nope[\s\S]*amount links to a list but is a money/)
  })

  it('reads names that are the same in both languages from plain strings', () => {
    const column: ListColumn = { id: 'buyer', type: 'category', label: t('Buyer'), labels: { a: 'ОБЩИНА ВАРНА', b: { bg: 'Други', en: 'Others' } } }
    expect(labelOf(column, 'a', 'en')).toBe('ОБЩИНА ВАРНА')
    expect(labelOf(column, 'b', 'en')).toBe('Others')
    expect(labelOf(column, 'c', 'bg')).toBeUndefined()
    expect(cellText(column, 'a', 'bg')).toBe('ОБЩИНА ВАРНА')
    expect(searchTexts([column], [['a'], ['b']])).toEqual(['община варна', 'други others'])
    const parts: ListColumn = { id: 'p', type: 'breakdown', label: t('P'), periods: ['2026'], labels: { a: 'ОБЩИНА ВАРНА' } }
    expect(breakdownGroups(parts, [['a', 5]], 'en')[0].parts[0].label).toBe('ОБЩИНА ВАРНА')
  })

  it('orders a breakdown’s parts by their total or by one period', () => {
    const column: ListColumn = { id: 'b', type: 'breakdown', label: t('B'), periods: ['2025', '2026'], labels: { x: t('X'), y: t('Y'), z: t('Z') } }
    const cell = [
      ['x', 50, 1],
      ['y', 0, 30],
      ['z', 10, 25],
    ]
    expect(breakdownGroups(column, cell, 'en')[0].parts.map((p) => p.id)).toEqual(['x', 'z', 'y'])
    expect(breakdownGroups(column, cell, 'en', 1)[0].parts.map((p) => p.id)).toEqual(['y', 'z', 'x'])
  })
})

describe('procurement: the supplier ↔ SEBRA payee match', () => {
  const procurement = (names: Record<string, string>): ProcurementData => ({
    contracts: [],
    suppliers: new Map(Object.entries(names).map(([key, name]) => [key, { kind: 'legal', eik: key, name, members: [] }])),
    buyers: new Map(),
    nodes: [],
    cpv: new Map(),
    years: YEARS,
  })

  it('links only an exact name with its legal form that is unique on both sides', () => {
    const data = procurement({ '111': '„Фарма Юнион“ ООД', '222': 'Строй Инвест ЕООД', '333': 'Строй Инвест ЕООД', '444': 'АЛФА' })
    const payees = new Map([
      ['p1', 'ФАРМА ЮНИОН О.О.Д.'],
      ['p2', 'СТРОЙ ИНВЕСТ ЕООД'],
      ['p3', 'АЛФА'],
      ['p4', 'БЕТА ООД'],
    ])
    const matches = payeeMatches(data, payees)
    expect([...matches]).toEqual([['111', { id: 'p1', name: 'ФАРМА ЮНИОН О.О.Д.' }]])
  })
})

describe('procurement lists (built from data/sources/procurement)', () => {
  const index = read<ListIndex>('lists/index.json')
  const list = (id: string) => read<ListFile>(index.lists.find((l) => l.id === id)!.file)
  const extract = readProcurement(new URL('procurement/', sourcesDir), YEARS)
  const awarded = extract.contracts.filter((c) => c.basis === 'award')
  const sum = (values: (number | null)[]) => values.reduce<number>((s, v) => s + (v ?? 0), 0)

  it('count every contract of the extract once in the suppliers’ and buyers’ totals', () => {
    const total = sum(awarded.map((c) => c.eur))
    const suppliers = list('contract-suppliers')
    expect(Math.abs((suppliers.totals.amount as number) - total)).toBeLessThan(suppliers.count)
    expect(suppliers.totals.n).toBe(awarded.length)
    const buyers = list('contract-buyers')
    const withBuyer = awarded.filter((c) => c.buyer)
    expect(Math.abs((buyers.totals.amount as number) - sum(withBuyer.map((c) => c.eur)))).toBeLessThan(buyers.count)
  })

  it('list every contract of 2026, the larger ones of 2024–2025 and the large ones of earlier years, by year', () => {
    const contracts = list('contracts')
    expect(contracts.shards?.choose).toBe(true)
    const byPeriod = Object.fromEntries(contracts.shards!.files.map((f) => [f.value, f.count]))
    // 2026 by quarter: every contract of an award notice (what each quarter offers to choose), and the large ones signed
    // earlier and amended in 2026 (hidden until chosen).
    const quarters = Object.entries(byPeriod).filter(([p]) => p.startsWith('2026-'))
    expect(quarters.map(([p]) => p)).toEqual(['2026-1', '2026-2', '2026-3'])
    expect(quarters.reduce((s, [, n]) => s + n, 0)).toBe(extract.contracts.filter((c) => c.year === '2026' && c.basis === 'award').length)
    const amended = rowsOf(contracts).filter((r) => r.basis === 'amended')
    expect(amended.length).toBe(extract.contracts.filter((c) => c.basis === 'amended' && (c.eur ?? 0) >= LARGE).length)
    const listed = (year: string, from: number) => extract.contracts.filter((c) => c.year === year && c.basis === 'award' && ((c.eur ?? 0) >= from || VALUE_ERRORS[c.id])).length
    expect(byPeriod['2025']).toBe(listed('2025', LISTED_FROM['2025']))
    expect(byPeriod['2024']).toBe(listed('2024', LISTED_FROM['2024']))
    expect(byPeriod['2024']).toBeGreaterThan(3000)
    expect(byPeriod['2023']).toBe(listed('2023', LARGE))
    // A category's listed contracts of 2024–2026 are one file of their own.
    const division = (code: string) => (code && extract.cpv.has(code.slice(0, 2)) ? code.slice(0, 2) : null)
    const cpv = contracts.shards!.also!.find((a) => a.by === 'cpv')!.files
    for (const f of cpv) {
      const shown = extract.contracts.filter((c) => c.basis === 'award' && division(c.cpv) === f.value && ((c.eur ?? 0) >= (LISTED_FROM[c.year] ?? 0) || VALUE_ERRORS[c.id]))
      expect(f.count).toBe(shown.length)
    }
  })

  it('count every contract of 2024–2026 in the categories, by year', () => {
    const categories = rowsOf(list('contract-categories'))
    ;['2024', '2025', '2026'].forEach((year, i) => {
      const n = categories.reduce((s, r) => s + ((r.n as (number | null)[])[i] ?? 0), 0)
      expect(n).toBe(awarded.filter((c) => c.year === year).length)
    })
    // ЦАИС ЕОП's JSON files hold the platform's contracts of 2024–2025: tens of thousands a year, every one with a category.
    for (const year of ['2024', '2025']) {
      const json = awarded.filter((c) => c.year === year && c.source === 'json')
      expect(json.length).toBeGreaterThan(30_000)
      expect(json.filter((c) => !c.cpv).length).toBeLessThan(json.length / 100)
    }
  })

  it('hold every contract of the platform once, whichever source it comes from', () => {
    // Each year from one source of the platform: its yearly files to 2023, its JSON files for 2024–2025, OCDS for 2026.
    const bySource = new Map<string, Set<string>>()
    for (const c of extract.contracts) bySource.set(c.year, (bySource.get(c.year) ?? new Set()).add(c.source))
    expect([...bySource.get('2023')!].sort()).toEqual(['eop', 'rop'])
    expect([...bySource.get('2024')!].sort()).toEqual(['json', 'rop'])
    expect([...bySource.get('2026')!]).toEqual(['ocds'])
    // The platform's contract number is the same in all three: no contract of OCDS is one of the other years' (same
    // number and buyer), and none is in two years.
    // (The platform's years: from 2020.)
    const rows = YEARS.filter((y) => y >= '2020').flatMap((year) => readCsv(new URL(`procurement/contracts-${year}.csv.gz`, sourcesDir)))
    const earlier = new Set(rows.filter((r) => (r.source === 'eop' || r.source === 'json') && r.contract_no).map((r) => `${r.contract_no}|${r.buyer}`))
    const ocds = rows.filter((r) => r.source === 'ocds')
    expect(ocds.length).toBeGreaterThan(25_000)
    expect(ocds.filter((r) => earlier.has(`${r.contract_no}|${r.buyer}`)).map((r) => r.id)).toEqual([])
    const ids = rows.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  }, 30_000)

  it('leave out of the totals the two values that are entry errors, and say so on their rows', () => {
    expect(Object.keys(VALUE_ERRORS).sort()).toEqual(['e274233-1', 'e336694-1'])
    for (const id of Object.keys(VALUE_ERRORS)) expect(extract.contracts.find((c) => c.id === id)!.eur).toBeNull()
    const sofia = list('contract-buyer')
    expect(sofia.count).toBeGreaterThan(3000)
  })

  it('never name a natural person or a sole trader, nor the subject of their contracts', () => {
    const rows = list('contracts').shards!.files.flatMap((f) => {
      const file = list('contracts')
      return unpackShard(file.columns, read<ListShardFile>(f.file), 'period').map((row) => Object.fromEntries(file.columns.map((c, i) => [c.id, row[i]])))
    })
    const persons = rows.filter((r) => r.cls === 'pe')
    expect(persons.length).toBeGreaterThan(100)
    for (const r of persons) {
      expect(r.supplierId).toBe('persons')
      expect(['Физическо лице', 'Едноличен търговец']).toContain((r.supplier as { bg: string }).bg)
      expect((r.subject as { bg: string }).bg).toBe('Договор с физическо лице или едноличен търговец')
    }
    // No name in the extract's suppliers is a sole trader's written "ЕТ …".
    const names = readCsv(new URL('procurement/suppliers.csv.gz', sourcesDir)).map((r) => r.name)
    expect(names.filter((n) => /^(ЕТ|ET)[\s"„“'-]/.test(n))).toEqual([])
  })

  it('link ministries and municipalities to their buyer page, each node to one buyer', () => {
    const links = readNodeLinks(data).filter((l) => l.list === 'contract-buyer')
    expect(links.some((l) => l.family === 'municipalities' && l.nodes['sofiya-grad-stolichna-obshtina'])).toBe(true)
    expect(links.some((l) => l.family === 'ministries' && l.nodes.moh)).toBe(true)
    for (const l of links) for (const eik of Object.values(l.values ?? {})) expect(extract.nodes.some((n) => n.eik === eik)).toBe(true)
  })

  it('offer the suppliers by the value of their contracts, in order, before any is loaded', () => {
    const suppliers = list('contract-suppliers')
    expect(suppliers.shards).toMatchObject({ by: 'band', choose: true, search: 2 })
    expect(suppliers.shards!.files.reduce((s, f) => s + f.count, 0)).toBe(suppliers.count)
    const band = suppliers.columns.find((c) => c.id === 'band')!
    expect(Object.keys(band.labels!)).toEqual(['100m', '10m', '1m', '100k', '10k', 'small'])
    for (const r of rowsOf(suppliers).slice(0, 2000)) {
      const amount = r.amount as number
      const from = { '100m': 1e8, '10m': 1e7, '1m': 1e6, '100k': 1e5, '10k': 1e4, small: -Infinity }[r.band as string]!
      expect(amount).toBeGreaterThanOrEqual(from)
    }
  })

  it('link a contract’s supplier only to a page that exists (not one only amended in 2026)', () => {
    const pages = new Set(rowsOf(list('contract-supplier')).map((r) => r.id))
    const linked = rowsOf(list('contracts')).flatMap((r) => (typeof r.supplierId === 'string' ? [r.supplierId] : []))
    expect(linked.length).toBeGreaterThan(30_000)
    expect(linked.filter((id) => !pages.has(id))).toEqual([])
  })
})

describe('SEBRA payees after the person rules', () => {
  it('name sole traders, in a class of their own, and no person: persons are the one anonymised group', () => {
    const payees = readCsv(new URL('sebra/payees.csv.gz', sourcesDir))
    expect(payees.filter((p) => p.class === 'person').map((p) => p.id)).toEqual(['persons'])
    const soleTraders = payees.filter((p) => p.class === 'sole-trader')
    expect(soleTraders.length).toBeGreaterThan(5000)
    // A name written "ЕТ …" or "… ЕТ" is a sole trader's (one with a company form in the middle, "САЛВИЯ- ЕТ ЕООД", is a company).
    expect(payees.filter((p) => (/^(ЕТ|ET)[\s"„“'-]/.test(p.name) || /(^| )ЕТ$/.test(p.name)) && p.class !== 'sole-trader').map((p) => p.name)).toEqual([])
    // The search names them; the supplier pages, which keep the strict rule, link to none of them.
    const index = read<ListIndex>('lists/index.json')
    const search = rowsOf(read<ListFile>(index.lists.find((l) => l.id === 'payees')!.file))
    expect(search.filter((r) => r.cls === 'st').length).toBe(soleTraders.length)
    const ids = new Set(soleTraders.map((p) => p.id))
    expect(rowsOf(read<ListFile>('lists/contract-supplier.json')).filter((r) => typeof r.payeeId === 'string' && ids.has(r.payeeId))).toEqual([])
  })
})
