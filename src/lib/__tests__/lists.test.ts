import { describe, expect, it } from 'vitest'
import { checkLinks, checkList, datasetLinks, finishList, nodeLinks, type ListSpec } from '../../../scripts/lib/lists.ts'
import {
  ALL,
  breakdownGroups,
  bucketOf,
  countText,
  facetOptions,
  formatFilters,
  hiddenByDefault,
  LOAD_ALL_LIMIT,
  linksFor,
  linkText,
  matchingRows,
  packShard,
  paramsFromState,
  parseFilters,
  queryWords,
  refNumber,
  resolveRef,
  searchTexts,
  shardsToLoad,
  sortRows,
  stateFromParams,
  totalsOf,
  unpackShard,
} from '../listData'
import type { BudgetNode, Dataset, ListCell, ListColumn, ListIndex, ListMeta } from '../types'

const t = (bg: string, en: string) => ({ bg, en })

const columns: ListColumn[] = [
  { id: 'code', type: 'code', label: t('Номер', 'Code'), search: true },
  { id: 'name', type: 'text', label: t('Проект', 'Project'), search: true },
  {
    id: 'place',
    type: 'node',
    label: t('Община', 'Municipality'),
    family: 'municipalities',
    dataset: 'test-places',
    filter: true,
    labels: { a: t('Община Аксаково', 'Aksakovo municipality'), b: t('Община Бургас', 'Burgas municipality') },
  },
  {
    id: 'region',
    type: 'category',
    label: t('Област', 'Province'),
    hidden: true,
    filter: true,
    labels: { varna: t('Област Варна', 'Varna Province'), burgas: t('Област Бургас', 'Burgas Province') },
  },
  { id: 'paid', type: 'money', label: t('Изплатено', 'Paid'), total: true },
  { id: 'capex', type: 'series', label: t('Капиталови разходи', 'Capital spending'), periods: ['2026', '2027'], total: true },
  { id: 'date', type: 'date', label: t('Дата', 'Date'), filter: true },
  { id: 'note', type: 'text', label: t('Бележка', 'Note'), detail: true },
]

const rows: ListCell[][] = [
  ['OP-1', 'Ремонт на ул. „Пирин“', 'a', 'varna', 100, [10, null], '2025-03-01', null],
  ['OP-2', 'Водопровод в кв. Меден рудник', 'b', 'burgas', null, [5, 7], '2026-01-15', t('Бележка', 'A note')],
  ['OP-3', 'Улично осветление', 'b', 'burgas', 300, [null, 1], '2026-06-30', null],
]

const texts = searchTexts(columns, rows)
const match = (query: string, filters: Record<string, string> = {}) => matchingRows(columns, rows, texts, queryWords(query), filters)

describe('list values and totals', () => {
  it('resolves columns and series periods', () => {
    expect(resolveRef(columns, 'paid')).toMatchObject({ index: 4, period: null })
    expect(resolveRef(columns, 'capex.2027')).toMatchObject({ index: 5, period: 1 })
    expect(resolveRef(columns, 'capex')).toMatchObject({ index: 5, period: 0 })
    expect(resolveRef(columns, 'capex.2030')).toBeNull()
    expect(resolveRef(columns, 'paid.2026')).toBeNull()
    expect(resolveRef(columns, 'nothing')).toBeNull()
    expect(refNumber(rows[1], resolveRef(columns, 'capex.2027')!)).toBe(7)
    expect(refNumber(rows[1], resolveRef(columns, 'paid')!)).toBeNull()
  })

  it('totals money columns and each period of a series, empty cells as nothing', () => {
    expect(totalsOf(columns, rows)).toEqual({ paid: 400, capex: [15, 8] })
    expect(totalsOf(columns, [])).toEqual({ paid: 0, capex: [0, 0] })
  })
})

describe('list search and filters', () => {
  it('needs every word, ignoring case and quotes, in the row or the names of its values', () => {
    expect(queryWords('  „Пирин“ ')).toEqual(['пирин'])
    expect(match('„пирин“')).toEqual([0])
    expect(match('OP-3')).toEqual([2])
    // Through the municipality's and the (hidden) province's names, in either language.
    expect(match('бургас')).toEqual([1, 2])
    expect(match('burgas осветление')).toEqual([2])
    expect(match('варна бургас')).toEqual([])
    expect(match('')).toEqual([0, 1, 2])
  })

  it('reads and writes filters, and filters dates by year', () => {
    expect(parseFilters('place:b,date:2026')).toEqual({ place: 'b', date: '2026' })
    expect(parseFilters('broken,:x,y:')).toEqual({})
    expect(parseFilters(formatFilters({ place: 'b', region: '' }))).toEqual({ place: 'b' })
    expect(match('', { date: '2026' })).toEqual([1, 2])
    expect(match('', { region: 'varna' })).toEqual([0])
    // A filter on a column the list does not have changes nothing.
    expect(match('', { institution: 'mod' })).toEqual([0, 1, 2])
  })

  it('offers the values of a filter that the other filters leave, with counts', () => {
    const lang = 'bg'
    expect(facetOptions(columns, rows, texts, [], { region: 'burgas' }, 'place', lang)).toEqual([{ value: 'b', count: 2, label: 'Община Бургас' }])
    expect(facetOptions(columns, rows, texts, [], {}, 'place', lang).map((o) => o.value)).toEqual(['a', 'b'])
    // The filter's own value does not narrow its options; dates offer years, latest first.
    expect(facetOptions(columns, rows, texts, [], { place: 'a' }, 'place', lang).map((o) => o.count)).toEqual([1, 2])
    expect(facetOptions(columns, rows, texts, [], {}, 'date', lang).map((o) => [o.value, o.count])).toEqual([
      ['2026', 2],
      ['2025', 1],
    ])
  })
})

describe('list sorting', () => {
  const all = [0, 1, 2]
  it('sorts numbers either way with empty cells last', () => {
    expect(sortRows(columns, rows, all, '-paid', 'bg')).toEqual([2, 0, 1])
    expect(sortRows(columns, rows, all, 'paid', 'bg')).toEqual([0, 2, 1])
    expect(sortRows(columns, rows, all, '-capex.2027', 'bg')).toEqual([1, 2, 0])
    expect(sortRows(columns, rows, all, 'capex.2026', 'bg')).toEqual([1, 0, 2])
  })

  it('sorts text in the language’s alphabet and nodes by their names', () => {
    expect(sortRows(columns, rows, all, 'name', 'bg')).toEqual([1, 0, 2])
    expect(sortRows(columns, rows, all, '-place', 'en')).toEqual([1, 2, 0])
    expect(sortRows(columns, rows, all, 'unknown', 'bg')).toEqual(all)
  })
})

describe('list URL state, counts and links', () => {
  const meta = (id: string): ListMeta =>
    ({ id, unit: { one: t('проект', 'project'), other: t('проекта', 'projects') } }) as ListMeta

  it('round-trips the state and defaults to the first list', () => {
    const lists = [meta('first'), meta('second')]
    const state = stateFromParams({ l: 'second', q: 'път', f: 'place:b', s: '-paid', d: 'municipalities-2026' }, lists)
    expect(state).toEqual({ list: 'second', query: 'път', filters: { place: 'b' }, sort: '-paid', dataset: 'municipalities-2026' })
    expect(stateFromParams(paramsFromState(state), lists)).toEqual(state)
    expect(stateFromParams({ l: 'missing' }, lists).list).toBe('first')
  })

  it('counts rows in words', () => {
    expect(countText(meta('x'), 1, 'bg')).toBe('1 проект')
    expect(countText(meta('x'), 34, 'bg')).toBe('34 проекта')
    expect(countText(meta('x'), 3492, 'en')).toBe('3,492 projects')
  })

  it('links a node only from datasets of the link’s family, years and stages', () => {
    const index: ListIndex = {
      groups: [],
      lists: [meta('plan')],
      links: [{ list: 'plan', family: 'ministries', column: 'institution', years: [2025], stages: ['law'], value: 'plan', label: t('план', 'plan'), nodes: { mod: [25, 1e9] } }],
    }
    expect(linksFor(index, { family: 'ministries', year: 2025, stage: 'law' }, 'mod')).toEqual([
      { list: index.lists[0], column: 'institution', filters: { institution: 'mod' }, count: 25, total: 1e9, label: t('план', 'plan') },
    ])
    expect(linksFor(index, { family: 'ministries', year: 2025, stage: 'report' }, 'mod')).toEqual([])
    expect(linksFor(index, { family: 'ministries', year: 2026, stage: 'law' }, 'mod')).toEqual([])
    expect(linksFor(index, { family: 'ministries', year: 2025, stage: 'law' }, 'moh')).toEqual([])
  })
})

describe('building lists', () => {
  const places: BudgetNode = { id: 'root', name: t('', ''), value: 2, children: [{ id: 'a', name: t('', ''), value: 1 }, { id: 'b', name: t('', ''), value: 1 }] }
  const datasets = [{ id: 'test-places', family: 'municipalities', year: 2026, stage: 'law', root: places } as Dataset]
  const spec = (over: Partial<ListSpec> = {}): ListSpec => ({
    id: 'test',
    group: 'projects',
    title: t('', ''),
    short: t('', ''),
    description: t('', ''),
    sources: [],
    caveats: [],
    asOf: '2026-10-05',
    retrieved: '2026-10-05',
    unit: { one: t('', ''), other: t('', '') },
    summary: ['paid', 'capex.2026'],
    sort: '-paid',
    links: [{ family: 'municipalities', column: 'place', years: [2026], value: 'capex.2027', label: t('', '') }],
    columns,
    key: 'code',
    rows,
    ...over,
  })

  it('accepts a valid list and finds what is wrong with others', () => {
    expect(checkList(spec(), datasets)).toEqual([])
    const bad = (r: ListCell[][]) => checkList(spec({ rows: r }), datasets)
    expect(bad([...rows, ['OP-1', 'x', 'a', 'varna', 1, [1, 1], '2026-01-01', null]])[0]).toMatch(/duplicate key/)
    expect(bad([['OP-9', 'x', 'a', 'varna', 'много', [1, 1], '2026-01-01', null]])[0]).toMatch(/paid = "много" is not a valid money/)
    expect(bad([['OP-9', 'x', 'zzz', 'varna', 1, [1, 1], '2026-01-01', null]])[0]).toMatch(/place = "zzz" is not a valid node/)
    expect(bad([['OP-9', 'x', 'a', 'varna', 1, [1], '2026-01-01', null]])[0]).toMatch(/capex .* not a valid series/)
    expect(bad([['OP-9', 'x', 'a', 'varna', 1, [1, 1], '1.1.2026', null]])[0]).toMatch(/date .* not a valid date/)
    expect(checkList(spec({ sort: '-capex.2031' }), datasets)).toEqual(['list test: unknown value capex.2031'])
    // Node names the target dataset does not have.
    const unknown = columns.map((c) => (c.id === 'place' ? { ...c, labels: { ...c.labels, c: t('', '') } } : c))
    expect(checkList(spec({ columns: unknown }), datasets).join()).toMatch(/nodes missing from test-places: c/)
  })

  it('keeps small lists whole and splits large ones by the shard column', () => {
    const whole = finishList(spec({ shardBy: 'region' }))
    expect(whole.file.rows).toHaveLength(3)
    expect(whole.file).toMatchObject({ count: 3, totals: { paid: 400, capex: [15, 8] }, file: 'lists/test.json' })
    const split = finishList(spec({ shardBy: 'region' }), 10)
    expect(split.file.rows).toBeUndefined()
    expect(split.file.shards).toEqual({
      by: 'region',
      files: [
        { value: 'burgas', file: 'lists/test/burgas.json', count: 2, totals: { paid: 300, capex: [5, 8] } },
        { value: 'varna', file: 'lists/test/varna.json', count: 1, totals: { paid: 100, capex: [10, 0] } },
      ],
    })
    expect(split.shards.get('lists/test/burgas.json')).toEqual(rows.slice(1))
  })

  it('loads the shard a filter needs, every shard of a small list, none of a huge one', () => {
    const shards = finishList(spec({ shardBy: 'region' }), 10).file.shards!
    expect(shardsToLoad(shards, 3, { region: 'burgas' }).map((f) => f.value)).toEqual(['burgas'])
    expect(shardsToLoad(shards, 3, {}).map((f) => f.value)).toEqual(['burgas', 'varna'])
    expect(shardsToLoad(shards, LOAD_ALL_LIMIT + 1, {})).toEqual([])
  })

  it('counts and totals the rows of each linked node', () => {
    expect(nodeLinks(spec())[0].nodes).toEqual({ a: [1, 0], b: [2, 8] })
  })

  it('links one value to several nodes, each opening the list on that value', () => {
    const many = spec({
      columns: [...columns, { id: 'all', type: 'category', label: t('', ''), hidden: true, labels: { x: t('', '') } }],
      rows: rows.map((r) => [...r, 'x']),
      links: [{ family: 'municipalities', column: 'all', years: [2026], nodes: { x: ['a', 'b'] }, value: 'paid', label: t('', '') }],
    })
    expect(checkList(many, datasets)).toEqual([])
    const [link] = nodeLinks(many)
    expect(link.nodes).toEqual({ a: [3, 400], b: [3, 400] })
    expect(link.values).toEqual({ a: 'x', b: 'x' })
    const index: ListIndex = { groups: [], lists: [{ id: 'test', unit: { one: t('', ''), other: t('', '') } } as ListMeta], links: [link] }
    expect(linksFor(index, { family: 'municipalities', year: 2026, stage: 'law' }, 'b')[0].filters).toEqual({ all: 'x' })
    // Every node of the value must exist in the linked datasets.
    const missing = { ...many, links: [{ ...many.links![0], nodes: { x: ['a', 'zz'] } }] }
    expect(checkList(missing, datasets).join()).toMatch(/nodes missing from test-places: zz/)
  })

  it('loads every shard for a filter that allows it, and checks that it is a filter', () => {
    const shards = finishList(spec({ shardBy: 'region', shardFilters: ['place'] }), 10).file.shards!
    expect(shards.filters).toEqual(['place'])
    expect(shardsToLoad(shards, LOAD_ALL_LIMIT + 1, { place: 'b' })).toHaveLength(2)
    expect(shardsToLoad(shards, LOAD_ALL_LIMIT + 1, { date: '2026' })).toEqual([])
    expect(checkList(spec({ shardBy: 'region', shardFilters: ['name'] }), datasets)).toEqual(['list test: shard filter name is not a filter column'])
  })

  it('stores texts and ids repeated in a shard once and puts them back', () => {
    const repeated: ListCell[][] = [
      ['OP-1', 'Ремонт', 'a', 'varna', 1, null, null, 'Бележка'],
      ['OP-2', 'Ремонт', 'b', 'burgas', 2, null, null, t('Ремонт', 'Repair')],
      ['OP-3', 'Улица', 'b', 'burgas', 3, null, null, 'Бележка'],
    ]
    const packed = packShard(columns, [...repeated, ['OP-4', 'Улица 2', 'a', 'varna', 4, null, null, t('Ремонт', 'Repair')]])
    // Texts (plain or bilingual) and node and category ids, in the order they first appear.
    expect(packed.texts).toEqual(['Ремонт', 'a', 'varna', 'Бележка', 'b', 'burgas', t('Ремонт', 'Repair')])
    expect(packed.rows.map((r) => [r[1], r[2], r[3], r[7]])).toEqual([
      [0, 1, 2, 3],
      [0, 4, 5, 6],
      ['Улица', 4, 5, 3],
      ['Улица 2', 1, 2, 6],
    ])
    expect(unpackShard(columns, packed).slice(0, 3)).toEqual(repeated)
    // Codes and amounts are left alone, and so is a shard without repeats.
    expect(packed.rows.map((r) => [r[0], r[4]])).toEqual([
      ['OP-1', 1],
      ['OP-2', 2],
      ['OP-3', 3],
      ['OP-4', 4],
    ])
    // A row's empty cells at its end are left out and put back.
    const plain = packShard(columns, rows.slice(0, 2))
    expect(plain.texts).toBeUndefined()
    expect(plain.rows.every((r, i) => r.length <= rows[i].length && r.at(-1) !== null)).toBe(true)
    expect(unpackShard(columns, plain)).toEqual(rows.slice(0, 2))
    expect(unpackShard(columns, { rows })).toEqual(rows)
  })

  it('gives each dataset only its own links, with the names and units of the lists they open', () => {
    const plan = spec()
    const report = spec({ id: 'report', links: [{ family: 'municipalities', column: 'place', years: [2026], stages: ['report'], label: t('', '') }] })
    const index: ListIndex = {
      groups: [],
      lists: [plan, report].map((s) => ({ ...finishList(s).file, rows: undefined }) as ListMeta),
      links: [plan, report].flatMap(nodeLinks),
    }
    const law = datasetLinks(index, { family: 'municipalities', year: 2026, stage: 'law' })!
    expect(law.links.map((l) => l.list)).toEqual(['test'])
    expect(law.lists).toEqual([{ id: 'test', title: plan.title, unit: plan.unit }])
    expect(datasetLinks(index, { family: 'municipalities', year: 2026, stage: 'report' })!.links.map((l) => l.list)).toEqual(['test', 'report'])
    expect(datasetLinks(index, { family: 'municipalities', year: 2025, stage: 'law' })).toBeNull()
    expect(datasetLinks(index, { family: 'ministries', year: 2026, stage: 'law' })).toBeNull()
    // What a node of the dataset shows, from the small file as from the whole index.
    expect(linksFor(law, { family: 'municipalities', year: 2026, stage: 'law' }, 'b')).toEqual(linksFor(index, { family: 'municipalities', year: 2026, stage: 'law' }, 'b').map((l) => ({ ...l, list: law.lists[0] })))
  })

  it('checks that every link between trees and lists, and between lists, opens rows', () => {
    const other = { id: 'test-places-2025', family: 'municipalities', year: 2025, stage: 'law', root: places } as Dataset
    const all = [...datasets, other]
    const page = (over: Partial<ListSpec> = {}) =>
      spec({ id: 'page', links: [], rowLink: undefined, hidden: true, back: 'test', shardBy: 'code', shardHash: 2, ...over })
    const lists = (...specs: ListSpec[]) => specs.map((s) => finishList(s, 10))
    const indexOf = (...specs: ListSpec[]): ListIndex => ({ groups: [], lists: [], links: specs.flatMap(nodeLinks) })
    // Each place's projects, each project's own page (split by a hash of its code).
    const good = spec({ rowLink: { list: 'page', filter: 'code', column: 'code' } })
    expect(checkLinks(lists(good, page()), indexOf(good), all)).toEqual([])
    // A link that says more rows than the list shows, one to a list that waits for a choice, and a node not in the tree.
    const index = indexOf(good)
    const counts = { ...index, links: [{ ...index.links[0], nodes: { ...index.links[0].nodes, b: [5, 0] as [number, number] } }] }
    expect(checkLinks(lists(good, page()), counts, all).join()).toMatch(/to test: b \(5 rows linked, 2 shown\)/)
    const choose = spec({ shardBy: 'region', shardChoose: true })
    expect(checkLinks(lists(choose), indexOf(choose), all).join()).toMatch(/a \(1 rows linked, the list waits for a choice\)/)
    const lost = { ...index, links: [{ ...index.links[0], nodes: { zz: [0, 0] as [number, number] } }] }
    expect(checkLinks(lists(good, page()), lost, all).join()).toMatch(/zz \(not in the tree\)/)
    // A page without the rows the titles lead to, a link to no list, and one back to no list.
    expect(checkLinks(lists(good, page({ rows: rows.slice(1) })), indexOf(good), all).join()).toMatch(/rows → page: code values that open no rows: OP-1/)
    expect(checkLinks(lists(good), indexOf(good), all).join()).toMatch(/rows → page: no list page/)
    expect(checkLinks(lists(page({ back: 'nowhere' })), indexOf(), all).join()).toMatch(/leads back to unknown list nowhere/)
    // A node cell links back to the dataset the viewer came from: it has to exist there too.
    const linked2025 = spec({ links: [{ family: 'municipalities', column: 'place', years: [2025], label: t('', '') }] })
    const smaller = { ...other, root: { ...places, children: places.children!.slice(0, 1) } }
    expect(checkLinks(lists(linked2025), indexOf(linked2025), [...datasets, smaller]).join()).toMatch(/place links to nodes missing from test-places-2025: b/)
  })

  it('stores the shard column once when every row has the same value', () => {
    const burgas = rows.slice(1)
    const packed = packShard(columns, burgas, 'region')
    expect(packed.value).toBe('burgas')
    expect(packed.rows.every((r) => r.length <= columns.length - 1 && !r.includes('burgas'))).toBe(true)
    expect(unpackShard(columns, packed, 'region')).toEqual(burgas)
    // Not for a shard by a date's year, nor when the rows differ.
    expect(packShard(columns, burgas, 'date').value).toBeUndefined()
    expect(packShard(columns, rows, 'region').value).toBeUndefined()
  })
})

describe('payment-style lists: classes left out by default, hashed shards, breakdowns, links with filters', () => {
  const payers: ListColumn[] = [
    { id: 'id', type: 'code', label: t('Номер', 'Id') },
    { id: 'name', type: 'text', label: t('Получател', 'Payee'), search: true },
    {
      id: 'cls',
      type: 'category',
      label: t('Вид получател', 'Type of payee'),
      filter: true,
      labels: { co: t('Фирми', 'Companies'), pu: t('Публичен сектор', 'Public sector') },
      exclude: ['pu'],
    },
    { id: 'system', type: 'category', label: t('Платец', 'Payer'), filter: true, labels: { '015': t('МТСП', 'MLSP'), '444': t('Общини', 'Municipalities') } },
    { id: 'year', type: 'category', label: t('Година', 'Year'), filter: true, labels: { '2025': t('2025', '2025'), '2026': t('2026', '2026') } },
    { id: 'amount', type: 'money', label: t('Сума', 'Amount'), total: true },
    {
      id: 'payers',
      type: 'breakdown',
      label: t('Кой е платил', 'Paid by'),
      detail: true,
      periods: ['2025', '2026'],
      labels: { u1: t('РЗОК Пловдив', 'РЗОК Пловдив'), u2: t('РЗОК Варна', 'РЗОК Варна'), u3: t('МТСП', 'МТСП') },
      groups: { of: { u1: '056', u2: '056', u3: '015' }, labels: { '056': t('НЗОК', 'NHIF'), '015': t('МТСП', 'MLSP') } },
    },
  ]
  const payeeRows: ListCell[][] = [
    ['a1', 'ХЕМУС ЕООД', 'co', '015', '2025', 100, [['u3', 100]]],
    ['a2', 'ОБЩИНА ВАРНА', 'pu', '444', '2025', 500, null],
    ['a3', 'АПТЕКА ЕООД', 'co', '015', '2026', 30, [['u1', 10, 5], ['u2', 0, 10], ['u3', 5]]],
  ]
  const texts = searchTexts(payers, payeeRows)
  const match = (filters: Record<string, string> = {}, query = '') => matchingRows(payers, payeeRows, texts, queryWords(query), filters)

  it('leaves out the public sector until it is asked for, and says how many rows that hides', () => {
    expect(match()).toEqual([0, 2])
    expect(match({ cls: ALL })).toEqual([0, 1, 2])
    expect(match({ cls: 'pu' })).toEqual([1])
    expect(hiddenByDefault(payers, payeeRows, texts, [], {})).toBe(1)
    expect(hiddenByDefault(payers, payeeRows, texts, [], { cls: ALL })).toBe(0)
    // A filter's own menu offers every value, also the ones left out.
    expect(facetOptions(payers, payeeRows, texts, [], {}, 'cls', 'bg').map((o) => o.value)).toEqual(['pu', 'co'])
  })

  it('groups a breakdown by its parts’ groups, largest first, with missing periods as 0', () => {
    const groups = breakdownGroups(payers[6], payeeRows[2][6], 'en')
    expect(groups.map((g) => [g.label, g.values, g.total])).toEqual([
      ['NHIF', [10, 15], 25],
      ['MLSP', [5, 0], 5],
    ])
    expect(groups[0].parts.map((p) => [p.label, p.total])).toEqual([
      ['РЗОК Пловдив', 15],
      ['РЗОК Варна', 10],
    ])
  })

  it('checks breakdown cells against the parts’ names and periods', () => {
    const spec = (rows: ListCell[][]): ListSpec => ({
      id: 'payees',
      group: 'payments',
      title: t('', ''),
      short: t('', ''),
      description: t('', ''),
      sources: [],
      caveats: [],
      asOf: '2026-06-30',
      retrieved: '2026-10-05',
      unit: { one: t('', ''), other: t('', '') },
      summary: ['amount'],
      sort: '-amount',
      columns: payers,
      key: 'id',
      rows,
    })
    expect(checkList(spec(payeeRows), [])).toEqual([])
    expect(checkList(spec([['a9', 'X', 'co', '015', '2025', 1, [['u9', 1]]]]), [])[0]).toMatch(/payers .* not a valid breakdown/)
    expect(checkList(spec([['a9', 'X', 'co', '015', '2025', 1, [['u1', 1, 2, 3]]]]), [])[0]).toMatch(/not a valid breakdown/)
  })

  it('splits a list by a hash of its key and loads the shard of one key, or all of them for a search', () => {
    const many = Array.from({ length: 40 }, (_, i): ListCell[] => [`p${i}`, `ФИРМА ${i}`, 'co', '015', '2025', i, null])
    const spec: ListSpec = {
      id: 'payee',
      group: 'payments',
      title: t('', ''),
      short: t('', ''),
      description: t('', ''),
      sources: [],
      caveats: [],
      asOf: '2026-06-30',
      retrieved: '2026-10-05',
      unit: { one: t('', ''), other: t('', '') },
      summary: ['amount'],
      sort: '-amount',
      columns: payers,
      key: 'id',
      rows: many,
      shardBy: 'id',
      shardHash: 4,
      shardSearch: 2,
    }
    const { file, shards } = finishList(spec)
    expect(file.shards).toMatchObject({ by: 'id', hash: 4, search: 2 })
    expect(file.shards!.files.reduce((s, f) => s + f.count, 0)).toBe(40)
    const wanted = shardsToLoad(file.shards!, LOAD_ALL_LIMIT + 1, { id: 'p7' })
    expect(wanted.map((f) => f.value)).toEqual([String(bucketOf('p7', 4))])
    expect(shards.get(wanted[0].file)!.some((row) => row[0] === 'p7')).toBe(true)
    // A huge list loads nothing until a search of two letters or more.
    expect(shardsToLoad(file.shards!, LOAD_ALL_LIMIT + 1, {}, 'ф')).toEqual([])
    expect(shardsToLoad(file.shards!, LOAD_ALL_LIMIT + 1, {}, 'фи')).toHaveLength(file.shards!.files.length)
  })

  it('links a node through a map of values, counting only the rows of the link’s filters that the list shows', () => {
    const spec: ListSpec = {
      id: 'by-payer',
      group: 'payments',
      title: t('', ''),
      short: t('', ''),
      description: t('', ''),
      sources: [],
      caveats: [],
      asOf: '2026-06-30',
      retrieved: '2026-10-05',
      unit: { one: t('получател', 'payee'), other: t('получатели', 'payees') },
      summary: ['amount'],
      sort: '-amount',
      links: [{ family: 'ministries', column: 'system', nodes: { '015': 'molsp' }, years: [2025], filters: { year: '2025' }, value: 'amount', label: t('', ''), text: t('Плащания: {total}', 'Paid: {total}') }],
      columns: payers,
      key: 'id',
      rows: payeeRows,
    }
    const [link] = nodeLinks(spec)
    // Only 2025, and without the public sector: ХЕМУС (100), not АПТЕКА (2026).
    expect(link).toMatchObject({ nodes: { molsp: [1, 100] }, values: { molsp: '015' }, filters: { year: '2025' } })
    expect(link).not.toHaveProperty('nodes.444')
    const index: ListIndex = { groups: [], lists: [{ id: 'by-payer', unit: spec.unit } as ListMeta], links: [link] }
    const [found] = linksFor(index, { family: 'ministries', year: 2025, stage: 'law' }, 'molsp')
    expect(found.filters).toEqual({ year: '2025', system: '015' })
    expect(linkText(found, 'en', (v) => `€${v}`)).toBe('Paid: €100')
  })
})
