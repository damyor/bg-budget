import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { defaultEntry, switchEntry, versionsFor, yearsOf } from '../datasets'
import { executionRate, pointsFor } from '../series'
import type { BudgetNode, Dataset, DatasetIndexEntry, SeriesFile } from '../types'

const dir = new URL('../../../public/data/', import.meta.url)
const read = <T,>(file: string) => JSON.parse(readFileSync(new URL(file, dir), 'utf8')) as T
const index = read<DatasetIndexEntry[]>('index.json')
const series = read<SeriesFile>('series-functions.json')

const flatten = (root: BudgetNode) => {
  const map = new Map<string, number>()
  const walk = (n: BudgetNode) => {
    map.set(n.id, n.value)
    n.children?.forEach(walk)
  }
  walk(root)
  return map
}

describe('dataset selection', () => {
  it('opens the latest budget voted by Parliament by default', () => {
    const entry = defaultEntry(index)
    expect(entry.stage).toBe('law')
    expect(entry.family).toBe('functions')
    expect(entry.year).toBe(Math.max(...index.filter((d) => d.stage === 'law').map((d) => d.year)))
  })

  it('keeps the version when switching years, and falls back when it is missing', () => {
    const report2024 = index.find((d) => d.id === 'report-2024')!
    expect(switchEntry(index, report2024, { year: 2025 }).id).toBe('report-2025')
    // 2027 has no actual: the closest version is the forecast.
    expect(switchEntry(index, report2024, { year: 2027 }).stage).toBe('forecast')
    // Eurostat exists only for 2024: moving to 2026 returns to the main breakdown.
    const cofog = index.find((d) => d.family === 'cofog')!
    expect(switchEntry(index, cofog, { year: 2026 }).family).toBe('functions')
  })

  it('lists plan before actual', () => {
    expect(versionsFor(index, 2025, 'functions').map((d) => d.stage)).toEqual(['law', 'report'])
    expect(yearsOf(index)).toEqual([...yearsOf(index)].sort())
  })
})

describe('series-functions.json', () => {
  it('lists the datasets of the family, oldest first and plan before actual', () => {
    const entries = series.datasets.map((id) => index.find((d) => d.id === id)!)
    expect(entries.every(Boolean)).toBe(true)
    expect(entries.every((e) => e.family === 'functions')).toBe(true)
    for (let i = 1; i < entries.length; i++) expect(entries[i].year).toBeGreaterThanOrEqual(entries[i - 1].year)
  })

  it('holds the same values as the datasets', () => {
    series.datasets.forEach((id, i) => {
      const values = flatten(read<Dataset>(`${id}.json`).root)
      for (const [nodeId, row] of Object.entries(series.values)) {
        expect(row[i], `${id} › ${nodeId}`).toBe(values.get(nodeId) ?? null)
      }
    })
  })

  it('compares every area and function across all six versions', () => {
    for (const id of ['root', 'social', 'health', 'education', 'defence', 'g-interest', 'e-transport']) {
      expect(series.values[id].every((v) => v !== null), id).toBe(true)
    }
  })

  it('computes the share of the plan spent', () => {
    const points = pointsFor(series, index, 'root')!
    const actual2025 = points.find((p) => p.entry.id === 'report-2025')!
    const rate = executionRate(points, actual2025)!
    // 2025: BGN 92 918.9 m spent of a BGN 96 706.0 m programme.
    expect(rate).toBeCloseTo(92918.9 / 96706.0, 4)
    expect(executionRate(points, points.find((p) => p.entry.id === 'budget-2025')!)).toBeNull()
  })
})
