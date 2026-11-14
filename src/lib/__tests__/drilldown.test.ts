import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  applyDrilldown,
  applyLedger,
  findNode,
  frontierReport,
  measure,
  openBoxes,
  parseGrafts,
  parseLedger,
  parsePartsFile,
  readPartsFiles,
  type LedgerEntry,
  type PartsMeta,
} from '../../../scripts/lib/drilldown.ts'
import { build } from '../../../scripts/lib/tree-builder.ts'
import { drilldownNote, formatDate, refSource } from '../nodeNotes'
import type { BudgetNode, Dataset, DatasetFamily, LocalizedText } from '../types'

const t = (bg: string, en: string): LocalizedText => ({ bg, en })
const M = 1_000_000
const LEVELS = [t('Област', 'Area'), t('Функция', 'Function'), t('Кой харчи', 'Spent by'), t('Вид разход', 'Type of expense')]

function dataset(id: string, root: BudgetNode, family: DatasetFamily = 'functions'): Dataset {
  return {
    id,
    year: 2026,
    kind: 'plan',
    stage: 'law',
    family,
    title: t(`Заглавие ${id}`, `Title ${id}`),
    subtitle: t('', ''),
    description: t('', ''),
    currency: 'EUR',
    sourceCurrency: 'EUR',
    population: 1,
    populationNote: t('', ''),
    gdp: 1,
    gdpNote: t('', ''),
    levels: LEVELS,
    sources: [],
    sourceShort: t(`Източник ${id}`, `Source ${id}`),
    retrieved: '2026-10-13',
    root,
  }
}

/** Economy (energy 100, transport 50) and education 80 (two parts and a 30 m remainder). */
const plan = () =>
  dataset(
    'plan',
    build({
      id: 'root',
      name: t('Всичко', 'All'),
      children: [
        {
          id: 'economy',
          name: t('Икономика', 'Economy'),
          children: [
            { id: 'e-energy', name: t('Енергетика', 'Energy'), value: 100 * M },
            { id: 'e-transport', name: t('Транспорт', 'Transport'), value: 50 * M },
          ],
        },
        {
          id: 'education',
          name: t('Образование', 'Education'),
          value: 80 * M,
          children: [
            { id: 'ed-municipal', name: t('Общини', 'Municipalities'), value: 30 * M },
            { id: 'ed-uni', name: t('Университети', 'Universities'), value: 20 * M },
          ],
          rest: { id: 'ed-other', name: t('Други', 'Other') },
        },
      ],
    }),
  )

/** A ministry with an area of two programmes; the area links elsewhere (a link the copies must not keep). */
const ministries = () => {
  const d = dataset(
    'ministries',
    build({
      id: 'root',
      name: t('Министерства', 'Ministries'),
      children: [
        {
          id: 'moen',
          name: t('Министерство на енергетиката', 'Ministry of Energy'),
          children: [
            {
              id: 'moen-energy',
              name: t('Енергетика', 'Energy'),
              children: [
                { id: 'p1', name: t('Програма 1', 'Programme 1'), value: 30 * M },
                { id: 'p2', name: t('Програма 2', 'Programme 2'), value: 8 * M },
              ],
            },
            { id: 'moen-admin', name: t('Администрация', 'Administration'), value: 5 * M },
          ],
        },
        { id: 'mof', name: t('Финанси', 'Finance'), value: 500 * M },
      ],
    }),
    'ministries',
  )
  findNode(d.root, 'moen-energy')!.seeAlso = [{ dataset: 'plan', node: 'e-energy', text: t('x', 'x'), value: 1 }]
  findNode(d.root, 'p1')!.seeAlso = [{ dataset: 'plan', node: 'e-energy', text: t('x', 'x'), value: 1 }]
  return d
}

const META: PartsMeta = {
  source: t('Средносрочна прогноза, приложение 8', 'Medium-term forecast, annex 8'),
  url: 'https://strategy.bg/download/1324547',
  basis: 'mapped',
  rest: { name: t('Неразпределено', 'Not itemised'), note: t('Разликата', 'The difference') },
}
const HEADER = 'dataset,parent,id,name_bg,name_en,value_eur,code,kind_bg,kind_en,note_bg,note_en'

function partsFile(rows: string[], meta: Partial<PartsMeta> = {}, file = 'budget-2026/fses.parts.csv') {
  return parsePartsFile([HEADER, ...rows].join('\n'), JSON.stringify({ ...META, ...meta }), file)
}

const childIds = (node: BudgetNode | undefined) => node?.children?.map((c) => c.id)

describe('remainders', () => {
  it('build() marks the remainder it creates', () => {
    const d = plan()
    const other = findNode(d.root, 'ed-other')!
    expect(other.rest).toBe(true)
    expect(other.value).toBe(30 * M)
    expect(findNode(d.root, 'ed-uni')!.rest).toBeUndefined()
  })
})

describe('parts files', () => {
  it('split a leaf, with the gap as an explicit remainder and the source once per dataset', () => {
    const d = plan()
    const file = partsFile(['plan,e-energy,e-energy.fses,ФСЕС,Electricity System Security Fund,53000000,,,,,', 'plan,e-energy,moen-energy,Министерство на енергетиката,Ministry of Energy,2000000.4,2400.01,,,,'])
    applyDrilldown([d], [file], [])
    const energy = findNode(d.root, 'e-energy')!
    expect(childIds(energy)).toEqual(['e-energy.fses', 'e-energy.rest', 'moen-energy'])
    const rest = findNode(d.root, 'e-energy.rest')!
    expect(rest).toMatchObject({ value: 45 * M, rest: true, name: META.rest.name, note: META.rest.note })
    expect(rest.ref).toBeUndefined()
    expect(findNode(d.root, 'e-energy.fses')).toMatchObject({ value: 53 * M, ref: 'fses' })
    expect(findNode(d.root, 'moen-energy')).toMatchObject({ value: 2 * M, code: '2400.01' })
    expect(d.refs).toEqual({ fses: { name: META.source, url: META.url, basis: 'mapped' } })
    expect(energy.value).toBe(100 * M)
  })

  it('nest rows under other rows, at any depth', () => {
    const d = plan()
    const file = partsFile([
      'plan,e-energy,a,А,A,60000000,,,,,',
      'plan,a,a1,А1,A1,40000000,,,,,',
      'plan,a,a2,А2,A2,15000000,,,,,',
      'plan,a1,a1x,А1х,A1x,25000000,,,,,',
      'plan,a1,a1y,А1у,A1y,15000000,,,,,',
    ])
    applyDrilldown([d], [file], [])
    expect(childIds(findNode(d.root, 'e-energy'))).toEqual(['a', 'e-energy.rest'])
    expect(childIds(findNode(d.root, 'a'))).toEqual(['a1', 'a2', 'a.rest'])
    expect(findNode(d.root, 'a.rest')!.value).toBe(5 * M)
    // a1's parts cover it exactly: no remainder.
    expect(childIds(findNode(d.root, 'a1'))).toEqual(['a1x', 'a1y'])
  })

  it('append into a remainder, which shrinks and goes when it reaches rounding', () => {
    const d = plan()
    applyDrilldown([d], [partsFile(['plan,education,ed-ministry,МОН,Ministry of Education,10000000,,,,,'], {}, 'a/one.parts.csv')], [])
    const education = findNode(d.root, 'education')!
    expect(childIds(education)).toEqual(['ed-municipal', 'ed-other', 'ed-uni', 'ed-ministry'])
    expect(findNode(d.root, 'ed-other')!.value).toBe(20 * M)
    // A second file takes the rest (to within rounding): the remainder goes.
    applyDrilldown([d], [partsFile(['plan,education,ed-own,Собствени средства,Own funds,19900000,,,,,'], {}, 'b/two.parts.csv')], [])
    expect(childIds(education)).toEqual(['ed-municipal', 'ed-uni', 'ed-own', 'ed-ministry'])
    expect(d.refs && Object.keys(d.refs)).toEqual(['one', 'two'])
  })

  it('replace the children only when the sidecar says so', () => {
    const rows = ['plan,economy,x1,Х1,X1,90000000,,,,,', 'plan,economy,x2,Х2,X2,40000000,,,,,']
    expect(() => applyDrilldown([plan()], [partsFile(rows)], [])).toThrow(/economy already has children and no remainder/)
    const d = plan()
    applyDrilldown([d], [partsFile(rows, { replace: true })], [])
    expect(childIds(findNode(d.root, 'economy'))).toEqual(['x1', 'x2', 'economy.rest'])
    expect(findNode(d.root, 'e-energy')).toBeUndefined()
  })

  it('fail on parts larger than their box, unknown parents and datasets, and remainders that would go negative', () => {
    expect(() => applyDrilldown([plan()], [partsFile(['plan,e-energy,big,Голямо,Big,120000000,,,,,'])], [])).toThrow(
      'budget-2026/fses.parts.csv (plan › e-energy): the parts (€120.0 m) exceed e-energy (€100.0 m)',
    )
    expect(() => applyDrilldown([plan()], [partsFile(['plan,nowhere,x,Х,X,1000000,,,,,'])], [])).toThrow(/no node nowhere in plan/)
    expect(() => applyDrilldown([plan()], [partsFile(['other,e-energy,x,Х,X,1000000,,,,,'])], [])).toThrow(/unknown dataset other/)
    expect(() => applyDrilldown([plan()], [partsFile(['plan,education,x,Х,X,31000000,,,,,'])], [])).toThrow(
      /the parts \(€31.0 m\) exceed the remainder ed-other \(€30.0 m\) of education \(€80.0 m\)/,
    )
    expect(() => applyDrilldown([plan()], [partsFile(['plan,ed-other,x,Х,X,1000000,,,,,'])], [])).toThrow(/ed-other is a remainder/)
    expect(() => applyDrilldown([plan()], [partsFile(['plan,e-energy,e-transport,Х,X,1000000,,,,,'])], [])).toThrow(/id e-transport already exists/)
    expect(() => applyDrilldown([plan()], [partsFile(['plan,e-energy,whole,Х,X,100000000,,,,,'])], [])).toThrow(/a single part equal to e-energy/)
  })

  it('check the file and its sidecar', () => {
    expect(() => partsFile(['plan,e-energy,x,Х,X,"1 000",,,,,'])).toThrow(/value_eur "1 000"/)
    expect(() => partsFile(['plan,e-energy,a b,Х,X,1,,,,,'])).toThrow(/not URL-safe/)
    expect(() => partsFile(['plan,e-energy,x,Х,X,1,,,,,'], { basis: 'guess' as never })).toThrow(/"basis" must be one of/)
    expect(() => parsePartsFile('dataset,parent,id,name_bg,name_en\n', JSON.stringify(META), 'x.parts.csv')).toThrow(/missing column\(s\) value_eur/)
    // Latin look-alike letters in Cyrillic names are normalised.
    expect(partsFile(['plan,e-energy,x,Cмолян,Smolyan,1,,,,,']).rows[0].name.bg).toBe('Смолян')
  })

  it('are found anywhere under data/sources, each with its sidecar', () => {
    const dir = mkdtempSync(join(tmpdir(), 'parts-'))
    mkdirSync(join(dir, 'budget-2026'))
    writeFileSync(join(dir, 'budget-2026', 'fses.parts.csv'), `${HEADER}\nplan,e-energy,x,Х,X,1000000,,,,,\n`)
    writeFileSync(join(dir, 'budget-2026', 'fses.parts.json'), JSON.stringify(META))
    writeFileSync(join(dir, 'budget-2026', 'other.csv'), 'a,b\n')
    const files = readPartsFiles(pathToFileURL(dir + '/'))
    expect(files.map((f) => [f.key, f.file])).toEqual([['fses', 'budget-2026/fses.parts.csv']])
    writeFileSync(join(dir, 'lonely.parts.csv'), `${HEADER}\n`)
    expect(() => readPartsFiles(pathToFileURL(dir + '/'))).toThrow(/no sidecar lonely.parts.json/)
  })
})

describe('grafts', () => {
  const GRAFT_HEADER = 'dataset,parent,source_dataset,source_node,mode,id,name_bg,name_en,note_bg,note_en'
  const grafts = (...rows: string[]) => parseGrafts([GRAFT_HEADER, ...rows].join('\n'), 'data/drilldown/grafts.csv')

  it('copy a subtree under a box, with stable ids, a link back and the source dataset as provenance', () => {
    const d = plan()
    const m = ministries()
    applyDrilldown([d, m], [], grafts('plan,e-energy,ministries,moen-energy,,,,,,'))
    const copy = findNode(d.root, 'e-energy.moen-energy')!
    expect(copy).toMatchObject({ value: 38 * M, name: t('Енергетика', 'Energy'), ref: 'ministries' })
    expect(copy.seeAlso).toEqual([{ dataset: 'ministries', node: 'moen-energy', text: t('Същото в „Заглавие ministries“', 'The same in “Title ministries”'), value: 38 * M }])
    expect(childIds(copy)).toEqual(['e-energy.moen-energy.p1', 'e-energy.moen-energy.p2'])
    expect(findNode(d.root, 'e-energy.moen-energy.p1')).toMatchObject({ value: 30 * M, ref: 'ministries' })
    expect(findNode(d.root, 'e-energy.moen-energy.p1')!.seeAlso).toBeUndefined()
    expect(childIds(findNode(d.root, 'e-energy'))).toEqual(['e-energy.rest', 'e-energy.moen-energy'])
    expect(findNode(d.root, 'e-energy.rest')).toMatchObject({ value: 62 * M, rest: true })
    expect(d.refs).toEqual({ ministries: { name: t('Източник ministries', 'Source ministries'), basis: 'mapped' } })
    // The source is untouched.
    expect(childIds(findNode(m.root, 'moen-energy'))).toEqual(['p1', 'p2'])
  })

  it('take an id, a name and a note of their own', () => {
    const d = plan()
    applyDrilldown([d, ministries()], [], grafts('plan,e-energy,ministries,moen-energy,part,moen,Министерство,Ministry,Бележка,Note'))
    expect(findNode(d.root, 'moen')).toMatchObject({ name: t('Министерство', 'Ministry'), note: t('Бележка', 'Note') })
    expect(findNode(d.root, 'moen.p2')).toBeDefined()
  })

  it('only link when the scope does not fit', () => {
    const d = plan()
    applyDrilldown([d, ministries()], [], grafts('plan,e-transport,ministries,mof,link,,,,,'))
    const transport = findNode(d.root, 'e-transport')!
    expect(transport.children).toBeUndefined()
    expect(transport.seeAlso).toEqual([{ dataset: 'ministries', node: 'mof', text: t('Финанси', 'Finance'), value: 500 * M }])
    expect(d.refs).toBeUndefined()
    // A link larger than its box is fine; a copy is not.
    expect(() => applyDrilldown([plan(), ministries()], [], grafts('plan,e-transport,ministries,mof,,,,,,'))).toThrow(/exceed e-transport/)
    expect(() => grafts('plan,e-transport,ministries,mof,link,x,,,,')).toThrow(/a link takes no id or note/)
  })

  it('run after the parts and grafts they build on, and fail on cycles', () => {
    const d = plan()
    // The parts file splits a node that only the graft creates.
    const file = partsFile(['plan,e-energy.moen-energy.p1,p1-staff,Персонал,Staff,10000000,,,,,'])
    applyDrilldown([d, ministries()], [file], grafts('plan,e-energy,ministries,moen-energy,,,,,,'))
    expect(childIds(findNode(d.root, 'e-energy.moen-energy.p1'))).toEqual(['e-energy.moen-energy.p1.rest', 'p1-staff'])
    // A graft copies what parts added to its source first.
    const d2 = plan()
    const m2 = ministries()
    applyDrilldown([d2, m2], [partsFile(['ministries,p2,p2-a,П2а,P2a,5000000,,,,,'])], grafts('plan,e-energy,ministries,moen-energy,,,,,,'))
    expect(findNode(d2.root, 'e-energy.moen-energy.p2-a')).toMatchObject({ value: 5 * M, ref: 'fses' })
    expect(d2.refs?.fses).toEqual({ name: META.source, url: META.url, basis: 'mapped' })
    // Each graft copies a node the other creates.
    expect(() =>
      applyDrilldown([plan(), ministries()], [], grafts('plan,e-energy,ministries,copy-b,part,copy-a,,,,', 'ministries,mof,plan,copy-a,part,copy-b,,,,')),
    ).toThrow(/cycle/)
  })
})

describe('the ledger', () => {
  const entries = (raw: unknown[]) => parseLedger(raw, 'ledger.json')

  it('rejects malformed entries, naming each problem', () => {
    expect(() => entries([{ family: 'functions', node: 'x', state: 'maybe' }])).toThrow(/state must be one of/)
    expect(() => entries([{ family: 'functions', node: 'x', state: 'todo', checked: '13.10.2026' }])).toThrow(/checked must be a date/)
    expect(() => entries([{ family: 'functions', node: 'x', state: 'todo', leads: [{ url: 'x' }] }])).toThrow(/source is required[\s\S]*url must be/)
    expect(() => entries([{ family: 'functions', node: 'x', state: 'todo', owner: 'me' }])).toThrow(/unknown field "owner"/)
    expect(() => entries([{ family: 'functions', node: 'x', state: 'todo', note: { bg: 'само' } }])).toThrow(/note must be \{bg, en\}/)
    expect(entries([{ family: 'functions', node: 'x', state: 'final' }])).toHaveLength(1)
  })

  it('copies state, note and date onto the nodes, and keeps leads and attempts in the repo', () => {
    const d = plan()
    const ledger = entries([
      {
        family: 'functions',
        node: 'e-energy',
        state: 'todo',
        note: t('Бележка', 'Note'),
        checked: '2026-10-13',
        leads: [{ source: 'Annex 8', access: 'script' }],
        tried: [{ date: '2026-10-13', what: 'Table III-1' }],
      },
    ])
    expect(applyLedger([d], ledger)).toEqual([])
    expect(findNode(d.root, 'e-energy')!.status).toEqual({ state: 'todo', note: t('Бележка', 'Note'), checked: '2026-10-13' })
  })

  it('reports stale entries instead of failing', () => {
    const d = plan()
    const report = dataset('report', {
      id: 'root',
      name: t('Всичко', 'All'),
      value: 10 * M,
      children: [
        {
          id: 'fses',
          name: t('ФСЕС', 'FSES'),
          kind: LEVELS[2],
          value: 10 * M,
          children: [
            { id: 'fses.current', name: t('Текущи', 'Current'), kind: LEVELS[3], value: 9 * M },
            { id: 'fses.capital', name: t('Капиталови', 'Capital'), kind: LEVELS[3], value: 1 * M },
          ],
        },
      ],
    })
    const ledger: LedgerEntry[] = [
      { family: 'functions', node: 'economy', state: 'no-source' },
      { family: 'functions', node: 'gone', state: 'todo' },
      { family: 'functions', node: 'e-energy', datasets: ['plan', 'report'], state: 'todo' },
      // An economic split is not a finer breakdown: still no source.
      { family: 'functions', node: 'fses', state: 'no-source' },
    ]
    const stale = applyLedger([d, report], ledger)
    expect(stale.map((s) => [s.entry.node, s.dataset, s.reason])).toEqual([
      ['gone', undefined, 'node not in any functions dataset'],
      ['e-energy', 'report', 'node not in the dataset'],
      ['economy', 'plan', 'marked no-source but has parts now'],
    ])
    expect(() => applyLedger([plan()], [{ family: 'functions', node: 'e-energy', state: 'todo' }, { family: 'functions', node: 'e-energy', state: 'final' }])).toThrow(
      /two entries for e-energy in plan/,
    )
    expect(() => applyLedger([plan()], [{ family: 'functions', node: 'e-energy', datasets: ['nope'], state: 'todo' }])).toThrow(/unknown dataset nope/)
  })
})

describe('the frontier', () => {
  /** Social 600 (pensions leaf, at depth 2), economy 400 split by payer: state 300 (current / capital only) and a 100 remainder. */
  const report = () =>
    dataset(
      'report',
      build({
        id: 'root',
        name: t('Всичко', 'All'),
        children: [
          { id: 'social', name: t('Социални', 'Social'), children: [{ id: 's-pensions', name: t('Пенсии', 'Pensions'), value: 600 * M }, { id: 's-other', name: t('Други', 'Other'), value: 0.1 * M }] },
          {
            id: 'economy',
            name: t('Икономика', 'Economy'),
            value: 400 * M,
            children: [
              {
                id: 'e-energy',
                name: t('Енергетика', 'Energy'),
                children: [
                  {
                    id: 'e-energy.state',
                    name: t('Държавен бюджет', 'State budget'),
                    kind: LEVELS[2],
                    children: [
                      { id: 'e-energy.state.current', name: t('Текущи', 'Current'), kind: LEVELS[3], value: 250 * M },
                      { id: 'e-energy.state.capital', name: t('Капиталови', 'Capital'), kind: LEVELS[3], value: 50 * M },
                    ],
                  },
                  { id: 'e-energy.eu', name: t('ЕС', 'EU'), kind: LEVELS[2], value: 0.1 * M },
                ],
                value: 300.5 * M,
                rest: { id: 'e-energy.rounding', name: t('Закръгляне', 'Rounding') },
              },
            ],
            rest: { id: 'economy.rest', name: t('Други', 'Other') },
          },
        ],
      }),
    )

  it('measures depth and where the money stops, each leaf counted once', () => {
    const x = measure(report())
    expect(x.total).toBe(1000.1 * M)
    // Leaves: pensions 600 at 2, the remainder ~99.5 at 2, current/capital 300 at 4, the EU 0.1 at 3, rounding 0.4 at 3, other 0.1 at 2.
    expect(x.shallow).toBeCloseTo(600.1 / 1000.1, 6)
    expect(x.remainder).toBeCloseTo(99.5 / 1000.1, 6)
    expect(x.accounting).toBeCloseTo(300 / 1000.1, 6)
    expect(x.depth).toBeCloseTo((600 * 2 + 0.1 * 2 + 99.5 * 2 + 300 * 4 + 0.1 * 3 + 0.4 * 3) / 1000.1, 6)
  })

  it('lists open boxes once: leaves, remainders, and economic splits at their parent', () => {
    const d = report()
    const boxes = openBoxes(d)
    expect(boxes.map((b) => [b.node.id, b.why, b.depth])).toEqual([
      ['s-pensions', 'leaf', 2],
      ['e-energy.state', 'accounting', 3],
      ['economy.rest', 'remainder', 2],
      ['e-energy.eu', 'leaf', 3],
      ['s-other', 'leaf', 2],
    ])
    expect(boxes[1].path.map((n) => n.id)).toEqual(['economy', 'e-energy', 'e-energy.state'])
    // no-source closes a leaf or an economic split; only final closes a remainder.
    const ledger: LedgerEntry[] = [
      { family: 'functions', node: 's-pensions', state: 'no-source' },
      { family: 'functions', node: 'e-energy.state', state: 'no-source' },
      { family: 'functions', node: 'economy.rest', state: 'no-source' },
      { family: 'functions', node: 'e-energy.eu', state: 'final' },
    ]
    const entries = new Map(ledger.map((e) => [e.node, e]))
    expect(openBoxes(d, entries).map((b) => [b.node.id, b.entry?.state])).toEqual([
      ['economy.rest', 'no-source'],
      ['s-other', undefined],
    ])
    expect(openBoxes(d, new Map([['economy.rest', { ...ledger[2], state: 'final' as const }]])).map((b) => b.node.id)).not.toContain('economy.rest')
  })

  it('writes the same report for the same trees, with the boxes that need a ledger entry', () => {
    const ledger: LedgerEntry[] = [{ family: 'functions', node: 'e-energy.state', state: 'todo', leads: [{ source: 'SEBRA | system 124', access: 'script' }] }]
    const a = frontierReport([report()], ledger, [])
    const b = frontierReport([report()], ledger, [])
    expect(a.markdown).toBe(b.markdown)
    expect(a.markdown).toContain('| report | functions | 1,000.1 | 2.60 | 60.0% | 9.9% | 30.0% | 5 |')
    expect(a.markdown).toContain('| 300.0 | 30.0% | Икономика › Енергетика › Държавен бюджет `e-energy.state` | 3 | economic split only | todo | SEBRA \\| system 124 (script) |')
    expect(a.markdown).toContain('  - €600.0 m Социални › Пенсии `s-pensions` (leaf)')
    expect(a.markdown).not.toContain('  - €300.0 m')
    expect(a.summary).toEqual(['report: depth 2.60, ≤2 levels 60.0%, remainders 9.9%, economic split 30.0%; 5 open boxes, largest Пенсии (€0.60 bn)'])
  })
})

describe('notes for visitors', () => {
  const parent: BudgetNode = { id: 'economy', name: t('Икономика', 'Economy'), value: 2 }
  const leaf = (extra: Partial<BudgetNode> = {}): BudgetNode => ({ id: 'e-energy', name: t('Енергетика', 'Energy'), value: 1, ...extra })

  it('say how far each box goes', () => {
    expect(drilldownNote(leaf(), { leaf: true, parent }, 'en')).toBe('For now this is the finest level in the site’s data.')
    expect(drilldownNote(leaf({ status: { state: 'todo', note: t('Половината е ФСЕС.', 'Half is the FSES.') } }), { leaf: true, parent }, 'bg')).toBe(
      'Засега това е най-подробното ниво в данните на сайта. Проучваме източници за по-подробна разбивка. Половината е ФСЕС.',
    )
    expect(drilldownNote(leaf({ status: { state: 'no-source', checked: '2026-10-05' } }), { leaf: true, parent }, 'bg')).toBe(
      'Не са публикувани по-подробни данни (проверено на 5 октомври 2026 г.).',
    )
    expect(drilldownNote(leaf({ status: { state: 'blocked', note: t('Брутни суми.', 'Gross amounts.') } }), { leaf: true, parent }, 'en')).toBe(
      'Finer data exists but cannot be used yet. Gross amounts.',
    )
    expect(drilldownNote(leaf({ status: { state: 'final' } }), { leaf: true, parent }, 'en')).toBeNull()
    expect(drilldownNote(leaf({ rest: true, status: { state: 'todo' } }), { leaf: true, parent }, 'en')).toBe(
      'Computed as the remainder — the part of “Economy” the sources do not itemise yet. We are looking into sources for a finer breakdown.',
    )
    // A box with parts says nothing unless the ledger does; the root never.
    expect(drilldownNote(leaf({ children: [leaf()] }), { leaf: false, parent }, 'en')).toBeNull()
    expect(drilldownNote(leaf(), { leaf: true, parent: null }, 'en')).toBeNull()
  })

  it('name the source of an amount added by a later split', () => {
    const refs = { fses: { name: t('Приложение 8', 'Annex 8'), url: 'https://strategy.bg/download/1324547', basis: 'mapped' as const } }
    expect(refSource(leaf({ ref: 'fses' }), { refs }, 'en')).toEqual({ name: 'Annex 8', url: 'https://strategy.bg/download/1324547', basis: 'placed here by a documented mapping' })
    expect(refSource(leaf({ ref: 'fses' }), { refs: { fses: { ...refs.fses, basis: 'exact' } } }, 'bg')?.basis).toBeNull()
    expect(refSource(leaf(), { refs }, 'en')).toBeNull()
    expect(formatDate('2026-10-13', 'en')).toBe('13 October 2026')
  })
})
