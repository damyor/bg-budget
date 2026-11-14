import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { readCsv } from '../../../scripts/lib/csv.ts'
import { readGrafts } from '../../../scripts/lib/drilldown.ts'
import type { BudgetNode, Dataset } from '../types'

// data/drilldown/programme-map.csv says, for every policy area / programme of the ministries' datasets, which КФП
// box it is grafted into (or why it is left out). These checks keep it, grafts.csv and the built datasets in step.

const root = new URL('../../../', import.meta.url)
const map = readCsv(new URL('data/drilldown/programme-map.csv', root))
const grafts = readGrafts(new URL('data/drilldown/grafts.csv', root))
const load = (id: string) => JSON.parse(readFileSync(new URL(`public/data/${id}.json`, root), 'utf8')) as Dataset

function index(tree: BudgetNode) {
  const nodes = new Map<string, BudgetNode>()
  const parent = new Map<string, string>()
  const walk = (n: BudgetNode) => {
    nodes.set(n.id, n)
    n.children?.forEach((c) => {
      parent.set(c.id, n.id)
      walk(c)
    })
  }
  walk(tree)
  return { nodes, parent }
}

const pairs = [...new Set(map.map((r) => `${r.dataset} ${r.source_dataset}`))].map((p) => p.split(' ') as [string, string])

describe.each(pairs)('programme map %s ← %s', (dataset, source) => {
  const rows = map.filter((r) => r.dataset === dataset && r.source_dataset === source)
  const src = index(load(source).root)
  const tgt = index(load(dataset).root)
  const byNode = new Map(rows.map((r) => [r.source_node, r]))

  it('covers every unit of the source once, down to what is mapped', () => {
    expect(byNode.size).toBe(rows.length)
    const visit = (n: BudgetNode) => {
      const row = byNode.get(n.id)
      expect(row, `${source}: ${n.id} is not in the map`).toBeDefined()
      expect(Number(row!.value_eur)).toBe(n.value)
      if (row!.target === 'split') n.children!.forEach(visit)
      else expect(row!.reason, n.id).not.toBe('')
    }
    load(source).root.children!.forEach(visit)
    for (const r of rows) expect(src.nodes.has(r.source_node), r.source_node).toBe(true)
  })

  it('has a graft for every mapped row, into the box or (for a remainder) its parent, and no other', () => {
    const mapped = rows.filter((r) => r.target !== 'split' && r.target !== 'left out')
    // Links (mode=link) only point across; they are not parts and need no row in the map.
    const ours = grafts.filter((g) => g.dataset === dataset && g.sourceDataset === source && g.mode === 'part')
    expect(ours.map((g) => g.sourceNode).sort()).toEqual(mapped.map((r) => r.source_node).sort())
    for (const r of mapped) {
      const g = ours.find((x) => x.sourceNode === r.source_node)!
      const box = tgt.nodes.get(r.target)
      expect(box, `${dataset}: no box ${r.target}`).toBeDefined()
      expect([r.target, tgt.parent.get(r.target)]).toContain(g.parent)
      if (g.parent !== r.target) expect(box!.rest, `${r.target} is grafted under its parent, so it is a remainder`).toBe(true)
    }
  })
})
