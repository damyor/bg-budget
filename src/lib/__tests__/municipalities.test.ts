import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { municipalityKey, municipalityName, placeOf as placeOfRow, provinceFromHeading, readRegister } from '../../../scripts/lib/places.ts'
import { buildMunicipalities, type MunicipalitiesConfig } from '../../../scripts/municipalities.ts'
import { placeOf } from '../tree'
import type { BudgetNode, Dataset, SeriesFile } from '../types'

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

describe('places', () => {
  it('reads province headings and puts Sofia in its own province', () => {
    expect(provinceFromHeading('ОБЛАСТ ВЕЛИКО ТЪРНОВО')).toBe('Велико Търново')
    // The 2025 Gazette splits one heading into "ОБ" + "ЛАСТ …".
    expect(provinceFromHeading('ОБ ЛАСТ СТАРА ЗАГОРА')).toBe('Стара Загора')
    expect(placeOfRow('ОБЛАСТ СМОЛЯН', 'СТОЛИЧНА ОБЩИНА')).toEqual({ province: 'София-град', municipality: 'Столична община' })
  })

  it('gives a municipality the same id however its name is printed', () => {
    // Latin look-alike "T" and quotes, as in the 2026 act.
    const { province, municipality } = placeOfRow('ОБЛАСТ ЯМБОЛ', '„Tунджа“')
    expect(municipalityKey(province, municipality)).toBe('yambol-tundzha')
    expect(municipalityKey('Варна', 'Бяла')).not.toBe(municipalityKey('Русе', 'Бяла'))
    expect(municipalityName('„Марица“')).toEqual({ bg: 'Община „Марица“', en: 'Maritsa municipality' })
  })

  it('has a register of the 265 municipalities with ЕБК codes and residents', () => {
    const register = readRegister(new URL('places/municipalities.csv', sources))
    expect(register.all).toHaveLength(265)
    expect(new Set(register.all.map((m) => m.province)).size).toBe(28)
    expect(register.byCode('7225').key).toBe('sofiya-grad-stolichna-obshtina')
    expect(register.find('ОБЛАСТ ПЛЕВЕН', 'Кнежа').code).toBe('6511')
    // The NSI municipalities add up to the population the site uses for each year (data/sources/macro/population.csv).
    for (const [year, population] of [[2023, 6_445_481], [2024, 6_437_360], [2025, 6_423_207]]) {
      expect(register.all.reduce((s, m) => s + m.residents.get(year)!, 0)).toBe(population)
    }
  })
})

describe('Municipalities datasets', () => {
  // State Budget Act, art. 1(2), row "Общините": the transfers to municipalities.
  const totals: [string, number][] = [
    ['municipalities-2024', (7_872_497.4 / BGN) * 1000],
    ['municipalities-2025', (8_925_909.1 / BGN) * 1000],
    ['municipalities-2026', 4_927_964_000],
  ]

  it.each(totals)('%s adds up to the act’s transfers to municipalities', (id, total) => {
    const dataset = read<Dataset>(`${id}.json`)
    expect(dataset.family).toBe('municipalities')
    expect(Math.abs(dataset.root.value - total)).toBeLessThan(1)
    // 27 provinces and Sofia, which is a province of its own.
    expect(dataset.root.children).toHaveLength(28)
    const municipalities = [...index(dataset.root).values()].filter(({ node }) => node.kind?.en === 'Municipality')
    expect(municipalities).toHaveLength(265)
    for (const { node } of municipalities) {
      expect(node.code, node.id).toMatch(/^\d{4}$/)
      expect(node.residents, node.id).toBeGreaterThan(0)
    }
    // Shares of all spending are computed against all public spending of the year.
    expect(dataset.publicTotal).toBe(read<Dataset>(id.replace('municipalities', 'budget') + '.json').root.value)
  })

  it('matches the act for individual municipalities', () => {
    const n2026 = index(read<Dataset>('municipalities-2026.json').root)
    // Art. 51: Банско 11 681,1 + 125,9; delegated 11 086,6, winter roads 71,3, capital 523,2, no equalising subsidy.
    expect(n2026.get('blagoevgrad-bansko')!.node.value).toBe(11_807_000)
    expect(n2026.get('blagoevgrad-bansko-delegated')!.node.value).toBe(11_086_600)
    expect(n2026.get('blagoevgrad-bansko-winter-roads')!.node.value).toBe(71_300)
    expect(n2026.get('blagoevgrad-bansko-equalising')).toBeUndefined()
    // Sofia: 714 014,5 + 4 246,7, directly under the root.
    expect(n2026.get('sofiya-grad-stolichna-obshtina')).toMatchObject({ parent: 'root', node: { value: 718_261_200, code: '7225' } })
    // Art. 52: Банско's delegated activities by function, administration split into mayors and staff.
    expect(n2026.get('blagoevgrad-bansko-delegated-education')!.node.value).toBe(7_076_800)
    expect(n2026.get('blagoevgrad-bansko-delegated-admin-mayors')!.node.value).toBe(151_500)
    const n2025 = index(read<Dataset>('municipalities-2025.json').root)
    // Art. 53 (2025): Пловдив 404 557,9 + 5 271,3 thousand leva (each type is rounded to the euro).
    expect(Math.abs(n2025.get('plovdiv-plovdiv')!.node.value - ((404_557.9 + 5_271.3) / BGN) * 1000)).toBeLessThan(3)
    const n2024 = index(read<Dataset>('municipalities-2024.json').root)
    // Art. 53 (2024): Благоевград's equalising subsidy 2 341,7 thousand leva.
    expect(n2024.get('blagoevgrad-blagoevgrad-equalising')!.node.value).toBe(Math.round((2_341.7 / BGN) * 1000))
  })

  it('uses the same municipality ids as the by-purpose trees', () => {
    const municipalities = index(read<Dataset>('municipalities-2026.json').root)
    const budget = index(read<Dataset>('budget-2026.json').root)
    // Kindergartens & schools in "Budget 2026" › Plovdiv province › Plovdiv = the education part of Plovdiv's delegated subsidy.
    expect(budget.get('ed-municipal-plovdiv-plovdiv')!.node.value).toBe(municipalities.get('plovdiv-plovdiv-delegated-education')!.node.value)
    expect(budget.get('ed-municipal-plovdiv-plovdiv')!.node.code).toBe(municipalities.get('plovdiv-plovdiv')!.node.code)
  })

  it('compares every municipality across the three years', () => {
    const series = read<SeriesFile>('series-municipalities.json')
    expect(series.datasets).toEqual(['municipalities-2024', 'municipalities-2025', 'municipalities-2026'])
    for (const id of ['root', 'plovdiv', 'plovdiv-plovdiv', 'plovdiv-plovdiv-delegated-education', 'sofiya-grad-stolichna-obshtina', 'kyustendil-treklyano']) {
      expect(series.values[id]?.every((v) => v !== null), id).toBe(true)
    }
  })

  it('finds the place whose residents a node is counted against', () => {
    const nodes = index(read<Dataset>('municipalities-2026.json').root)
    const path = ['root', 'blagoevgrad', 'blagoevgrad-bansko', 'blagoevgrad-bansko-delegated'].map((id) => nodes.get(id)!.node)
    expect(placeOf(path)?.id).toBe('blagoevgrad-bansko')
    expect(placeOf(path.slice(0, 2))?.id).toBe('blagoevgrad')
    expect(placeOf(path.slice(0, 1))).toBeNull()
  })
})

describe('buildMunicipalities', () => {
  const macro = { gdp: 1, gdpNote: { bg: '', en: '' }, population: 1, populationNote: { bg: '', en: '' } }
  const config = (transfers: URL): MunicipalitiesConfig => ({
    id: 'test',
    year: 2026,
    transfers,
    delegated: new URL('budget-2026/municipal-delegated-2026.csv', sources),
    register: new URL('places/municipalities.csv', sources),
    articles: { transfers: { bg: 'чл. 51', en: 'Art. 51' }, delegated: { bg: 'чл. 52', en: 'Art. 52' } },
    residentsAt: 2025,
    publicTotal: 1,
    macro,
    title: { bg: '', en: '' },
    subtitle: { bg: '', en: '' },
    description: { bg: '', en: '' },
    sources: [],
    sourceShort: { bg: '', en: '' },
    retrieved: '',
  })

  it('refuses amounts that do not add up to the printed totals', () => {
    const dir = mkdtempSync(join(tmpdir(), 'municipalities-'))
    const file = join(dir, 'transfers.csv')
    copyFileSync(new URL('budget-2026/municipal-transfers-2026.csv', sources), file)
    expect(() => buildMunicipalities(config(pathToFileURL(file)))).not.toThrow()
    writeFileSync(file, readFileSync(file, 'utf8').replace('Благоевград,Банско,5101,capital,6,523.2', 'Благоевград,Банско,5101,capital,6,532.2'))
    expect(() => buildMunicipalities(config(pathToFileURL(file)))).toThrow(/capital adds up to/)
  })
})
