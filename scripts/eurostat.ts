// Builds the "actual spending" dataset from Eurostat's COFOG table
// (gov_10a_exp: general government expenditure by function and by economic
// transaction). Raw API responses are cached in data/raw/.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import type { BudgetNode, Dataset } from '../src/lib/types.ts'
import { COFOG_GROUPS, COFOG_LABELS, ECONOMIC_TYPES } from './lib/cofog.ts'
import { fetchEurostat, JsonStatCube, type JsonStat } from './lib/jsonstat.ts'
import type { MacroLookup } from './lib/macro.ts'

const RAW_DIR = new URL('../data/raw/', import.meta.url)

async function cached(name: string, load: () => Promise<JsonStat>, refresh: boolean): Promise<JsonStat> {
  const file = new URL(name, RAW_DIR)
  if (!refresh && existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')) as JsonStat
  const data = await load()
  writeFileSync(file, JSON.stringify(data))
  return data
}

const MILLION = 1_000_000

export async function buildEurostatDataset(options: { macro: MacroLookup; refresh?: boolean; year?: number }): Promise<Dataset> {
  const refresh = options.refresh ?? false
  const cofog = new JsonStatCube(
    await cached(
      'eurostat-gov_10a_exp-BG.json',
      () => fetchEurostat('gov_10a_exp', { geo: 'BG', unit: 'MIO_EUR', sector: 'S13', sinceTimePeriod: '2015' }),
      refresh,
    ),
  )

  const at = (code: string, item: string, year: number) =>
    cofog.get({ freq: 'A', unit: 'MIO_EUR', sector: 'S13', cofog99: code, na_item: item, geo: 'BG', time: String(year) })

  // Latest year that has the detailed (level 2) breakdown.
  const years = cofog.categories('time').map(Number).sort((a, b) => b - a)
  const year = options.year ?? years.find((y) => at('GF0703', 'TE', y) !== undefined)
  if (!year) throw new Error('No year with COFOG level 2 data')

  const economicChildren = (code: string): { children: BudgetNode[]; excluded: number } => {
    const children: BudgetNode[] = []
    let excluded = 0
    for (const type of ECONOMIC_TYPES) {
      const v = at(code, type.code, year) ?? 0
      if (v > 0) {
        children.push({
          id: `${code}-${type.slug}`,
          code: type.code,
          name: type.name,
          note: type.note,
          value: Math.round(v * MILLION),
        })
      } else if (v < 0) {
        excluded += v
      }
    }
    return { children: children.sort((a, b) => b.value - a.value), excluded }
  }

  const groupNode = (code: string): BudgetNode | null => {
    const te = at(code, 'TE', year)
    if (te === undefined || te <= 0) return null
    const { children, excluded } = economicChildren(code)
    const node: BudgetNode = { id: code, code, name: COFOG_LABELS[code], value: Math.round(te * MILLION) }
    if (children.length > 1) node.children = children
    if (excluded < 0) {
      const amount = (-excluded).toLocaleString('bg-BG', { maximumFractionDigits: 1 })
      const amountEn = (-excluded).toLocaleString('en-GB', { maximumFractionDigits: 1 })
      node.note = {
        bg: `Нетните постъпления от продажба на активи (${amount} млн. €) намаляват инвестициите и не са показани отделно.`,
        en: `Net proceeds from asset sales (€${amountEn} m) reduce investment and are not shown separately.`,
      }
    }
    return node
  }

  const divisionNode = (division: string): BudgetNode => {
    const te = at(division, 'TE', year)
    if (te === undefined) throw new Error(`Missing ${division} for ${year}`)
    const children = cofog
      .categories('cofog99')
      .filter((c) => c.length === 6 && c.startsWith(division))
      .map(groupNode)
      .filter((n): n is BudgetNode => n !== null)
      .sort((a, b) => b.value - a.value)
    return { id: division, code: division, name: COFOG_LABELS[division], value: Math.round(te * MILLION), children }
  }

  const groups: BudgetNode[] = COFOG_GROUPS.map((group) => {
    const divisions = group.divisions.map(divisionNode)
    if (divisions.length === 1) {
      // A one-division group is the division itself; keep the friendlier group name.
      return { ...divisions[0], id: group.id, name: group.name, note: group.note }
    }
    return {
      id: group.id,
      name: group.name,
      note: group.note,
      value: divisions.reduce((s, d) => s + d.value, 0),
      children: divisions.sort((a, b) => b.value - a.value),
    }
  })

  const total = at('TOTAL', 'TE', year)
  if (total === undefined) throw new Error('Missing total')

  const macro = options.macro(year)

  return {
    id: `eurostat-${year}`,
    year,
    kind: 'actual',
    stage: 'report',
    family: 'cofog',
    title: { bg: `Евростат ${year}`, en: `Eurostat ${year}` },
    subtitle: {
      bg: 'Реално изразходвани средства по международната класификация COFOG (сектор „Държавно управление“)',
      en: 'Actual spending by the international COFOG classification (general government sector)',
    },
    description: {
      bg: `Всички разходи на държавата, общините, НОИ и НЗОК през ${year} г., по функции (COFOG) и по вид на разхода. Данни на Евростат, подадени от НСИ и Министерството на финансите.`,
      en: `All spending by central government, municipalities and the social security and health funds in ${year}, by function (COFOG) and type of expense. Eurostat data reported by the Bulgarian NSI and Ministry of Finance.`,
    },
    currency: 'EUR',
    sourceCurrency: 'EUR',
    population: macro.population,
    populationNote: macro.populationNote,
    gdp: macro.gdp,
    gdpNote: macro.gdpNote,
    levels: [
      { bg: 'Област', en: 'Area' },
      { bg: 'Функция', en: 'Function' },
      { bg: 'Вид разход', en: 'Type of expense' },
    ],
    sources: [
      {
        name: {
          bg: 'Евростат — разходи на държавното управление по функции (gov_10a_exp)',
          en: 'Eurostat — general government expenditure by function (gov_10a_exp)',
        },
        url: 'https://ec.europa.eu/eurostat/databrowser/view/gov_10a_exp/default/table',
      },
      {
        name: { bg: 'Евростат — население към 1 януари (demo_pjan)', en: 'Eurostat — population on 1 January (demo_pjan)' },
        url: 'https://ec.europa.eu/eurostat/databrowser/view/demo_pjan/default/table',
      },
      {
        name: { bg: 'Евростат — брутен вътрешен продукт (nama_10_gdp)', en: 'Eurostat — gross domestic product (nama_10_gdp)' },
        url: 'https://ec.europa.eu/eurostat/databrowser/view/nama_10_gdp/default/table',
      },
    ],
    sourceShort: { bg: `Евростат, разходи по функции (COFOG), ${year} г.`, en: `Eurostat, expenditure by function (COFOG), ${year}` },
    retrieved: cofog.updated.slice(0, 10),
    root: {
      id: 'root',
      name: { bg: 'Всички публични разходи', en: 'All public spending' },
      value: Math.round(total * MILLION),
      children: groups.sort((a, b) => b.value - a.value),
    },
  }
}
