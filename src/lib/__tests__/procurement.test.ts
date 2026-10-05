import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { payeeMatches, readProcurement, VALUE_ERRORS, type ProcurementData } from '../../../scripts/procurement.ts'
import { readCsv } from '../../../scripts/lib/csv.ts'
import { checkList, finishList, type ListSpec } from '../../../scripts/lib/lists.ts'
import { breakdownGroups, cellText, labelOf, searchTexts, shardsToLoad, unpackShard } from '../listData'
import type { ListCell, ListColumn, ListFile, ListIndex, ListShardFile } from '../types'

const sources = new URL('../../../data/sources/', import.meta.url)
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
    expect(shardsToLoad(file.shards!, file.count, {})).toEqual([])
    expect(shardsToLoad(file.shards!, file.count, { year: '2026' }).map((f) => f.value)).toEqual(['2026'])
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
    ted: [],
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
  const extract = readProcurement(new URL('procurement/', sources), YEARS)
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

  it('list every contract of 2024–2026 and the large ones of earlier years, by year', () => {
    const contracts = list('contracts')
    expect(contracts.shards?.choose).toBe(true)
    const byPeriod = Object.fromEntries(contracts.shards!.files.map((f) => [f.value, f.count]))
    // 2026 by quarter: every contract of an award notice, and the large ones signed earlier and amended in 2026.
    const quarters = Object.entries(byPeriod).filter(([p]) => p.startsWith('2026-'))
    expect(quarters.map(([p]) => p)).toEqual(['2026-1', '2026-2', '2026-3'])
    const of2026 = extract.contracts.filter((c) => c.year === '2026' && (c.basis === 'award' || (c.eur ?? 0) >= 1_000_000))
    expect(quarters.reduce((s, [, n]) => s + n, 0)).toBe(of2026.length)
    expect(byPeriod['2024']).toBe(extract.contracts.filter((c) => c.year === '2024').length)
    expect(byPeriod['2023']).toBe(extract.contracts.filter((c) => c.year === '2023' && ((c.eur ?? 0) >= 1_000_000 || VALUE_ERRORS[c.id])).length)
  })

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
    const names = readCsv(new URL('procurement/suppliers.csv.gz', sources)).map((r) => r.name)
    expect(names.filter((n) => /^(ЕТ|ET)[\s"„“'-]/.test(n))).toEqual([])
  })

  it('link ministries and municipalities to their buyer page, each node to one buyer', () => {
    const links = index.links.filter((l) => l.list === 'contract-buyer')
    expect(links.some((l) => l.family === 'municipalities' && l.nodes['sofiya-grad-stolichna-obshtina'])).toBe(true)
    expect(links.some((l) => l.family === 'ministries' && l.nodes.moh)).toBe(true)
    for (const l of links) for (const eik of Object.values(l.values ?? {})) expect(extract.nodes.some((n) => n.eik === eik)).toBe(true)
  })

  it('keep TED as its own partial list, with modification notices and corrected versions left out', () => {
    const ted = list('ted-awards')
    expect(ted.count).toBe(extract.ted.filter((n) => (n.eur ?? 0) >= 100_000).length)
    const ids = rowsOf(ted).map((r) => r.k)
    expect(new Set(ids).size).toBe(ids.length)
    // A person, a sole trader or a winner not published is said in English too.
    const winners = rowsOf(ted).map((r) => r.winners)
    const english = winners.flatMap((w) => (w && typeof w === 'object' && !Array.isArray(w) ? [(w as { en: string }).en] : []))
    expect(english.length).toBeGreaterThan(50)
    expect(english.filter((w) => /физическо лице|едноличен търговец|не е публикуван/.test(w))).toEqual([])
  })

  it('link a contract’s supplier only to a page that exists (not one only amended in 2026)', () => {
    const pages = new Set(rowsOf(list('contract-supplier')).map((r) => r.id))
    const linked = rowsOf(list('contracts')).flatMap((r) => (typeof r.supplierId === 'string' ? [r.supplierId] : []))
    expect(linked.length).toBeGreaterThan(30_000)
    expect(linked.filter((id) => !pages.has(id))).toEqual([])
  })
})

describe('SEBRA payees after the person rules', () => {
  it('name no sole trader and no person: they are the one anonymised group', () => {
    const payees = readCsv(new URL('sebra/payees.csv.gz', sources))
    expect(payees.filter((p) => p.class === 'person').map((p) => p.id)).toEqual(['persons'])
    expect(payees.filter((p) => /^(ЕТ|ET)[\s"„“'-]/.test(p.name) || /(^| )ЕТ$/.test(p.name))).toEqual([])
    const index = read<ListIndex>('lists/index.json')
    const search = read<ListFile>(index.lists.find((l) => l.id === 'payees')!.file)
    const names = rowsOf(search).flatMap((r) => [r.payee, r.aliases].filter((v): v is string => typeof v === 'string'))
    expect(names.filter((n) => /(^|[|] )(ЕТ|ET)[\s"„“'-]/.test(n))).toEqual([])
  })
})
