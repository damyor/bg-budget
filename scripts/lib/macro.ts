// GDP and population for each budget year: the denominators of the
// "% of GDP" and "per person" views. Past years come from Eurostat, future
// years from the Ministry of Finance forecast (data/sources/macro/).

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import type { LocalizedText } from '../../src/lib/types.ts'
import { num, readCsv } from './csv.ts'
import { fetchEurostat, JsonStatCube, type JsonStat } from './jsonstat.ts'

const RAW = new URL('../../data/raw/', import.meta.url)
const SRC = new URL('../../data/sources/macro/', import.meta.url)

export interface YearMacro {
  /** Nominal GDP, EUR. */
  gdp: number
  gdpNote: LocalizedText
  population: number
  populationNote: LocalizedText
}

export type MacroLookup = (year: number) => YearMacro

export async function loadMacro(refresh: boolean): Promise<MacroLookup> {
  const file = new URL('eurostat-nama_10_gdp-BG.json', RAW)
  let raw: JsonStat
  if (!refresh && existsSync(file)) raw = JSON.parse(readFileSync(file, 'utf8')) as JsonStat
  else {
    raw = await fetchEurostat('nama_10_gdp', { geo: 'BG', na_item: 'B1GQ', unit: 'CP_MEUR', sinceTimePeriod: '2015' })
    writeFileSync(file, JSON.stringify(raw))
  }
  const cube = new JsonStatCube(raw)
  const gdpActual = new Map<number, { value: number; provisional: boolean }>()
  for (const year of cube.categories('time')) {
    const coord = { freq: 'A', unit: 'CP_MEUR', na_item: 'B1GQ', geo: 'BG', time: year }
    const value = cube.get(coord)
    if (value !== undefined) gdpActual.set(Number(year), { value: value * 1e6, provisional: cube.status(coord) === 'p' })
  }

  const forecast = new Map(readCsv(new URL('gdp-forecast.csv', SRC)).map((r) => [Number(r.year), r]))
  const population = new Map(readCsv(new URL('population.csv', SRC)).map((r) => [Number(r.year), r]))

  return (year) => {
    const pop = population.get(year)
    if (!pop) throw new Error(`No population for ${year}`)
    const actual = gdpActual.get(year)
    const fc = forecast.get(year)
    let gdp: number
    let gdpNote: LocalizedText
    if (actual) {
      gdp = actual.value
      gdpNote = actual.provisional
        ? { bg: `БВП за ${year} г. — предварителни данни на Евростат (nama_10_gdp)`, en: `${year} GDP — Eurostat provisional data (nama_10_gdp)` }
        : { bg: `БВП за ${year} г. — Евростат (nama_10_gdp)`, en: `${year} GDP — Eurostat (nama_10_gdp)` }
    } else if (fc) {
      gdp = num(fc.gdp_mEUR) * 1e6
      gdpNote = { bg: `БВП за ${year} г. — прогноза: ${fc.source_bg}`, en: `${year} GDP — forecast: ${fc.source_en}` }
    } else {
      throw new Error(`No GDP for ${year}`)
    }
    return {
      gdp: Math.round(gdp),
      gdpNote,
      population: Number(pop.population),
      populationNote: { bg: pop.source_bg, en: pop.source_en },
    }
  }
}
