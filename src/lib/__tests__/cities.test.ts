import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { buildCities, readCityReport, withoutNegatives, type CitiesConfig } from '../../../scripts/cities.ts'
import { activityOf, economicGroupOf, economicItemOf, FUNCTIONS, readActivities } from '../../../scripts/lib/ebk.ts'
import { readCsv } from '../../../scripts/lib/csv.ts'
import { defaultTitle } from '../../clip/render'
import type { BudgetNode, Dataset, ListFile, SeriesFile } from '../types'

const sources = new URL('../../../data/sources/', import.meta.url)
const data = new URL('../../../public/data/', import.meta.url)
const read = <T,>(file: string) => JSON.parse(readFileSync(new URL(file, data), 'utf8')) as T
const BGN = 1.95583

function index(root: BudgetNode): Map<string, { node: BudgetNode; parent: string | null }> {
  const map = new Map<string, { node: BudgetNode; parent: string | null }>()
  const walk = (node: BudgetNode, parent: string | null) => {
    map.set(node.id, { node, parent })
    node.children?.forEach((c) => walk(c, node.id))
  }
  walk(root, null)
  return map
}

describe('ЕБК codes', () => {
  it('reads a municipal report’s four-digit activity code as function + activity', () => {
    expect(activityOf('3322')).toEqual({ fn: 3, activity: '322' })
    expect(activityOf('6604')).toEqual({ fn: 6, activity: '604' })
    expect(activityOf('311')).toEqual({ fn: 3, activity: '311' })
    // The leading digit repeats the function, which is the activity's own first digit.
    expect(() => activityOf('4322')).toThrow()
    expect(() => activityOf('33221')).toThrow()
    expect(FUNCTIONS[activityOf('1122').fn].id).toBe('general')
  })

  it('names every activity of the ЕБК 2026 in both languages', () => {
    const activities = readActivities(new URL('cities/ebk-activities.csv', sources))
    expect(activities.size).toBe(302)
    expect(activities.get('311')!.name).toEqual({ bg: 'Детски градини', en: 'Kindergartens' })
    expect(activities.get('604')!.name.en).toBe('Street and square lighting')
    expect(activities.get('335')!.closed).toBe(true)
    for (const a of activities.values()) expect(FUNCTIONS[a.fn], a.code).toBeDefined()
  })

  it('sorts paragraphs into kinds of spending, with running costs by sub-paragraph', () => {
    expect(economicGroupOf('01').id).toBe('staff')
    expect(economicGroupOf('05').id).toBe('staff')
    expect(economicGroupOf('19').id).toBe('running')
    expect(economicGroupOf('43').id).toBe('subsidies')
    expect(economicGroupOf('52').id).toBe('capital')
    expect(() => economicGroupOf('33')).toThrow()
    expect(economicItemOf('10', '1016')).toMatchObject({ code: '1016', label: '10-16', name: { en: 'Water, fuel and energy' } })
    // Other paragraphs stop at the paragraph: the sub-paragraphs of § 52 add up to "Purchase of fixed assets".
    expect(economicItemOf('52', '5203')).toMatchObject({ code: '5200', label: '52-00' })
    expect(economicItemOf('05', '0551').code).toBe('0500')
  })
})

describe('negative amounts', () => {
  const t = (s: string) => ({ bg: s, en: s })
  it('merges refunds with the smallest positive parts into “Other (net)”', () => {
    const spec = withoutNegatives({
      id: 'a',
      name: t('a'),
      value: 96,
      children: [
        { id: 'food', name: t('food'), value: 60 },
        { id: 'energy', name: t('energy'), value: 30 },
        { id: 'travel', name: t('travel'), value: 8 },
        { id: 'taxes', name: t('taxes'), value: -2 },
      ],
    })
    expect(spec.children!.map((c) => [c.id, c.value])).toEqual([
      ['energy', 30],
      ['food', 60],
      ['a-net', 6],
    ])
    expect(spec.children!.find((c) => c.id === 'a-net')!.note!.en).toContain('taxes')
  })

  it('stops at the node when the refund outweighs all but everything', () => {
    const spec = withoutNegatives({
      id: 'a',
      name: t('a'),
      value: 5,
      children: [
        { id: 'services', name: t('services'), value: 10 },
        { id: 'taxes', name: t('taxes'), value: -5 },
      ],
    })
    expect(spec.children).toBeUndefined()
    expect(spec.note!.en).toMatch(/net amount/)
  })
})

describe('Big cities datasets', () => {
  const totals = readCsv(new URL('cities/report-totals.csv', sources))
  const printed = (city: string, year: number) =>
    totals.filter((r) => r.city === city && r.year === String(year)).reduce((s, r) => s + Number(r.actual), 0) / BGN

  it.each([2024, 2025])('cities-%i adds up to the totals each report prints', (year) => {
    const dataset = read<Dataset>(`cities-${year}.json`)
    expect(dataset.family).toBe('cities')
    expect(dataset.stage).toBe('report')
    const nodes = index(dataset.root)
    let all = 0
    for (const [file, id] of [['sofia', 'sofiya-grad-stolichna-obshtina'], ['plovdiv', 'plovdiv-plovdiv'], ['burgas', 'burgas-burgas']]) {
      const city = nodes.get(id)!.node
      expect(Math.abs(city.value - printed(file, year)), id).toBeLessThan(1)
      expect(city.residents).toBeGreaterThan(100_000)
      all += printed(file, year)
    }
    expect(Math.abs(dataset.root.value - all)).toBeLessThan(2)
    // Shares of all spending are against all public spending of the year (the КФП outturn).
    expect(dataset.publicTotal).toBe(read<Dataset>(`report-${year}.json`).root.value)
  })

  it('matches Sofia’s 2025 annual report and the sheets for single activities', () => {
    // Sofia's budget alone (form "БЮДЖЕТ"): 2 941 934 570 leva spent, as in its annual report to the council (annex 3).
    const sofia = readCityReport(new URL('cities/sofia-2025.csv', sources)).filter((r) => r.form === 'budget')
    expect(sofia.reduce((s, r) => s + r.actual, 0)).toBe(2_941_934_570)
    expect(sofia.filter((r) => r.code === '1016').reduce((s, r) => s + r.actual, 0)).toBe(57_973_119)
    const nodes = index(read<Dataset>('cities-2025.json').root)
    // The "99-99" totals of the activity's blocks in the budget and the EU-funds forms.
    expect(nodes.get('sofiya-grad-stolichna-obshtina-311')!.node.value).toBe(Math.round(370_883_015 / BGN))
    expect(nodes.get('plovdiv-plovdiv-604')!.node.value).toBe(Math.round(6_616_375 / BGN))
    expect(nodes.get('burgas-burgas-623')!.node.value).toBe(Math.round(30_408_453 / BGN))
    expect(nodes.get('plovdiv-plovdiv-604')!.parent).toBe('plovdiv-plovdiv-housing')
    expect(nodes.get('plovdiv-plovdiv-311-running')!.parent).toBe('plovdiv-plovdiv-311')
    expect(nodes.get('plovdiv-plovdiv-311-1011')!.parent).toBe('plovdiv-plovdiv-311-running')
  })

  it('keeps every city, function and activity under the same id in both years', () => {
    const series = read<SeriesFile>('series-cities.json')
    expect(series.datasets).toEqual(['cities-2024', 'cities-2025'])
    for (const id of ['root', 'plovdiv-plovdiv', 'plovdiv-plovdiv-education', 'plovdiv-plovdiv-311', 'sofiya-grad-stolichna-obshtina-604', 'burgas-burgas-322-staff']) {
      expect(series.values[id]?.every((v) => v !== null), id).toBe(true)
    }
  })

  it('links each city’s central-budget transfers and its whole budget both ways', () => {
    const municipal = index(read<Dataset>('municipalities-2025.json').root).get('plovdiv-plovdiv')!.node
    const city = index(read<Dataset>('cities-2025.json').root).get('plovdiv-plovdiv')!.node
    expect(municipal.seeAlso).toEqual([expect.objectContaining({ dataset: 'cities-2025', node: 'plovdiv-plovdiv', value: city.value })])
    expect(city.seeAlso).toEqual([expect.objectContaining({ dataset: 'municipalities-2025', node: 'plovdiv-plovdiv', value: municipal.value })])
    // The 2026 transfers lead to the latest outturn.
    const sofia2026 = index(read<Dataset>('municipalities-2026.json').root).get('sofiya-grad-stolichna-obshtina')!.node
    expect(sofia2026.seeAlso?.[0]).toMatchObject({ dataset: 'cities-2025', node: 'sofiya-grad-stolichna-obshtina' })
  })

  it('titles clips by city and activity', () => {
    const nodes = index(read<Dataset>('cities-2025.json').root)
    const path = ['root', 'plovdiv-plovdiv', 'plovdiv-plovdiv-education', 'plovdiv-plovdiv-311', 'plovdiv-plovdiv-311-running'].map((id) => nodes.get(id)!.node)
    expect(defaultTitle(path.slice(0, 2), 'en', 'cities')).toBe('How much does Plovdiv municipality spend?')
    expect(defaultTitle(path.slice(0, 4), 'bg', 'cities')).toBe('Колко харчи Община Пловдив за „Детски градини“?')
    expect(defaultTitle(path, 'en', 'cities')).toBe('How much does Plovdiv municipality spend on “Kindergartens — Running costs”?')
  })
})

describe('buildCities', () => {
  const macro = { gdp: 1, gdpNote: { bg: '', en: '' }, population: 1, populationNote: { bg: '', en: '' } }
  const config = (dir: URL): CitiesConfig => ({
    id: 'test',
    year: 2025,
    dir,
    register: new URL('places/municipalities.csv', sources),
    residentsAt: 2024,
    publicTotal: 1,
    macro,
    title: { bg: '', en: '' },
    subtitle: { bg: '', en: '' },
    description: { bg: '', en: '' },
    sources: [],
    sourceShort: { bg: '', en: '' },
    retrieved: '2026-10-06',
  })

  it('stops when an extract does not add up to its report', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cities-'))
    for (const f of ['ebk-activities.csv', 'report-totals.csv', 'sofia-2025.csv', 'plovdiv-2025.csv']) copyFileSync(new URL(`cities/${f}`, sources), join(dir, f))
    // Burgas loses one lev on one row.
    const burgas = readFileSync(new URL('cities/burgas-2025.csv', sources), 'utf8').split('\n')
    const cells = burgas[1].split(',')
    cells[cells.length - 1] = String(Number(cells[cells.length - 1]) - 1)
    burgas[1] = cells.join(',')
    writeFileSync(join(dir, 'burgas-2025.csv'), burgas.join('\n'))
    expect(() => buildCities(config(pathToFileURL(`${dir}/`)))).toThrow(/burgas budget actual adds up to/)
  })
})

describe('Plovdiv schools list', () => {
  const list = read<ListFile>('lists/plovdiv-schools.json')

  it('adds up, year by year, to the allocation sheets', () => {
    // The sheets' total rows: 241 225 351 leva (2024), 272 470 783 leva (2025), €148 646 897 (2026).
    const expected = [241_225_351 / BGN, 272_470_783 / BGN, 148_646_897]
    ;(list.totals.total as number[]).forEach((v, i) => expect(Math.abs(v - expected[i])).toBeLessThan(list.count))
    expect(list.count).toBe(234)
  })

  it('links each school to its activity in “Big cities”', () => {
    const column = list.columns.find((c) => c.id === 'activity')!
    expect(column).toMatchObject({ type: 'node', family: 'cities' })
    expect(Object.keys(column.labels!).sort()).toEqual(['311', '312', '318', '322', '326', '332', '338'].map((a) => `plovdiv-plovdiv-${a}`))
    const row = list.rows!.find((r) => r[1] === 'ДГ "Буратино"' && r[2] === 'plovdiv-plovdiv-311')!
    // 2026: €645 645 by the formula and €120 006 for the abolished fees.
    expect((row[4] as number[])[2]).toBe(645_645 + 120_006)
  })
})
