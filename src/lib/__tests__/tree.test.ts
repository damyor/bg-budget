import { describe, expect, it } from 'vitest'
import { layoutSlices, zoomArcs } from '../donutLayout'
import { buildIndex, foldChildren, pathTo, realPathTo, searchNodes, slicesFor } from '../tree'
import type { BudgetNode } from '../types'

const leaf = (id: string, value: number): BudgetNode => ({ id, name: { bg: `Б ${id}`, en: `E ${id}` }, value })

function parentWith(values: number[]): BudgetNode {
  const children = values.map((v, i) => leaf(`c${i}`, v))
  return { id: 'p', name: { bg: 'Родител', en: 'Parent' }, value: values.reduce((a, b) => a + b, 0), children }
}

describe('foldChildren', () => {
  it('keeps up to eight children without an "Other" bucket', () => {
    const { visible, tail } = foldChildren(parentWith([30, 20, 15, 10, 10, 6, 5, 4]))
    expect(visible).toHaveLength(8)
    expect(tail).toHaveLength(0)
  })

  it('groups small children into "Other" when there are many', () => {
    const { visible, tail } = foldChildren(parentWith([40, 20, 10, 8, 6, 5, 4, 3, 2, 1, 1]))
    expect(visible).toHaveLength(7)
    expect(tail.map((c) => c.value)).toEqual([3, 2, 1, 1])
  })

  it('never hides a single small child on its own', () => {
    const { visible, tail } = foldChildren(parentWith([90, 9, 1]))
    expect(visible).toHaveLength(3)
    expect(tail).toHaveLength(0)
  })

  it('can force a folded child to stay visible', () => {
    const node = parentWith([40, 20, 10, 8, 6, 5, 4, 3, 2, 1, 1])
    const { visible, tail } = foldChildren(node, 'c9')
    expect(visible.map((c) => c.id)).toContain('c9')
    expect(visible).toHaveLength(7)
    expect(tail.map((c) => c.id)).not.toContain('c9')
    expect(visible.length + tail.length).toBe(11)
  })

  it('assigns palette slots in size order with grey for "Other"', () => {
    const slices = slicesFor(parentWith([40, 20, 10, 8, 6, 5, 4, 3, 2, 1, 1]))
    expect(slices.map((s) => s.slot)).toEqual([0, 1, 2, 3, 4, 5, 6, 'other'])
  })
})

describe('buildIndex', () => {
  const root: BudgetNode = { ...parentWith([40, 20, 10, 8, 6, 5, 4, 3, 2, 1, 1]), id: 'root' }
  const tree = buildIndex(root)

  it('registers the "Other" bucket as an openable node', () => {
    const other = tree.byId.get('root~other')
    expect(other?.synthetic).toBe(true)
    expect(other?.node.value).toBe(7)
    expect(pathTo(tree, 'root~other').map((n) => n.id)).toEqual(['root', 'root~other'])
  })

  it('keeps the real parent for children inside "Other"', () => {
    expect(realPathTo(tree, 'c9').map((n) => n.id)).toEqual(['root', 'c9'])
  })

  it('finds nodes by name in either language', () => {
    expect(searchNodes(tree, 'Б c3', 'bg')[0]?.node.id).toBe('c3')
    expect(searchNodes(tree, 'e c3', 'bg')[0]?.node.id).toBe('c3')
    expect(searchNodes(tree, 'няма такова', 'bg')).toHaveLength(0)
  })
})

describe('zoom geometry', () => {
  const node = parentWith([50, 30, 20])
  const focusChildren: BudgetNode = { ...leaf('c1', 30), children: [leaf('g0', 20), leaf('g1', 10)] }
  node.children![1] = focusChildren
  const parent = layoutSlices(node)
  const focus = parent.find((s) => s.node.id === 'c1')!
  const children = layoutSlices(focusChildren)

  it('starts at the parent level', () => {
    const arcs = zoomArcs(parent, focus, children, 0)
    expect(arcs.filter((a) => !a.incoming)).toHaveLength(3)
    expect(arcs.filter((a) => a.incoming)).toHaveLength(0)
  })

  it('ends with the children filling the circle', () => {
    const arcs = zoomArcs(parent, focus, children, 1).filter((a) => a.incoming)
    expect(arcs).toHaveLength(2)
    expect(arcs[0].start).toBeCloseTo(0)
    expect(arcs[1].end).toBeCloseTo(Math.PI * 2)
    expect(arcs[0].end).toBeCloseTo((Math.PI * 2 * 2) / 3)
  })
})
