import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { publicTotal, type BudgetNode, type Dataset, type DatasetIndexEntry } from '../types'

const dir = new URL('../../../public/data/', import.meta.url)
const index = JSON.parse(readFileSync(new URL('index.json', dir), 'utf8')) as DatasetIndexEntry[]

describe.each(index.map((entry) => [entry.id, entry] as const))('dataset %s', (_, entry) => {
  const dataset = JSON.parse(readFileSync(new URL(entry.file, dir), 'utf8')) as Dataset
  const nodes: BudgetNode[] = []
  const walk = (n: BudgetNode) => {
    nodes.push(n)
    n.children?.forEach(walk)
  }
  walk(dataset.root)

  it('matches its index entry', () => {
    expect(dataset.id).toBe(entry.id)
    expect(dataset.root.value).toBe(entry.total)
  })

  it('has unique, URL-safe ids', () => {
    const ids = nodes.map((n) => n.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_.-]+$/)
  })

  it('names every node in both languages', () => {
    for (const n of nodes) {
      expect(n.name.bg.trim(), n.id).not.toBe('')
      expect(n.name.en.trim(), n.id).not.toBe('')
      // English names must not fall back to Cyrillic.
      expect(n.name.en, n.id).not.toMatch(/[Ѐ-ӿ]/)
    }
  })

  it('adds up at every level (within rounding)', () => {
    for (const n of nodes) {
      expect(n.value, n.id).toBeGreaterThan(0)
      if (!n.children) continue
      expect(n.children.length, n.id).toBeGreaterThan(1)
      const sum = n.children.reduce((s, c) => s + c.value, 0)
      expect(Math.abs(sum - n.value), n.id).toBeLessThanOrEqual(Math.max(1_000_000, n.value * 0.005))
    }
  })

  it('has sources, a population and the GDP of its year', () => {
    expect(dataset.sources.length).toBeGreaterThan(0)
    expect(dataset.population).toBeGreaterThan(6_000_000)
    expect(dataset.gdp).toBe(entry.gdp)
    // Public spending is 35–50% of GDP in every year covered; a dataset that covers part of it says how much all of it is.
    const all = publicTotal(dataset)
    expect(all / dataset.gdp).toBeGreaterThan(0.35)
    expect(all / dataset.gdp).toBeLessThan(0.5)
    expect(dataset.root.value).toBeLessThanOrEqual(all)
    expect(entry.publicTotal).toBe(all)
  })

  it('says what kind of data it is', () => {
    expect(['functions', 'ministries', 'municipalities', 'cities', 'cofog']).toContain(dataset.family)
    expect(['law', 'draft', 'forecast', 'report']).toContain(dataset.stage)
    expect(dataset.kind).toBe(dataset.stage === 'report' ? 'actual' : 'plan')
  })
})

// A draft is compared with the year before: its ministries, policy areas and municipalities keep that year's ids.
describe.each(index.filter((e) => e.stage === 'draft' && e.family !== 'functions').map((e) => [e.id, e] as const))('draft %s', (_, entry) => {
  const load = (file: string) => JSON.parse(readFileSync(new URL(file, dir), 'utf8')) as Dataset
  const before = index.find((e) => e.family === entry.family && e.year === entry.year - 1 && e.stage === 'law')
  const idsAt = (node: BudgetNode, depth: number): string[] =>
    depth === 0 ? [node.id] : (node.children ?? []).flatMap((c) => idsAt(c, depth - 1))

  it('keeps the previous year’s ids', () => {
    expect(before).toBeDefined()
    const draft = load(entry.file).root
    const law = load(before!.file).root
    // Ministries: unit → area; municipalities: province → municipality (Sofia is both).
    const known = new Set([...idsAt(law, 1), ...idsAt(law, 2)])
    const ids = [...idsAt(draft, 1), ...idsAt(draft, 2)].filter((id) => !/^p\d{4}-/.test(id))
    const unknown = ids.filter((id) => !known.has(id))
    // A unit or area that is new in the draft is allowed, but only a few.
    expect(unknown.length, unknown.join(', ')).toBeLessThanOrEqual(Math.ceil(ids.length * 0.02))
  })
})
