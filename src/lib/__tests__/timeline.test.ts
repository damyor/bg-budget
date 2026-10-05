import { describe, expect, it } from 'vitest'
import { buildTimeline, sceneAt } from '../../clip/timeline'
import type { BudgetNode } from '../types'

const n = (id: string, children?: BudgetNode[]): BudgetNode => ({
  id,
  name: { bg: id, en: id },
  value: children ? children.reduce((s, c) => s + c.value, 0) : 10,
  children,
})

const leafC = n('c')
const nodeB = n('b', [leafC, n('c2')])
const root = n('root', [nodeB, n('b2')])

describe('buildTimeline', () => {
  it('zooms through every level and ends on the target inside its parent', () => {
    const tl = buildTimeline([root, nodeB, leafC], 'normal')
    expect(tl.scenes.map((s) => `${s.kind}:${s.level}:${s.focusId ?? '-'}`)).toEqual([
      'intro:0:-',
      'highlight:0:b',
      'zoom:0:b',
      'settle:1:-',
      'highlight:1:c',
      'outro:1:c',
    ])
  })

  it('tours the largest areas for a whole-budget clip', () => {
    const tl = buildTimeline([root], 'normal', ['b', 'b2'])
    expect(tl.scenes.map((s) => s.kind)).toEqual(['intro', 'highlight', 'highlight', 'outro'])
  })

  it('scales with speed and is contiguous', () => {
    const normal = buildTimeline([root, nodeB], 'normal')
    const fast = buildTimeline([root, nodeB], 'fast')
    expect(fast.duration).toBeCloseTo(normal.duration * 0.75)
    normal.scenes.slice(1).forEach((s, i) => expect(s.start).toBeCloseTo(normal.scenes[i].start + normal.scenes[i].duration))
    expect(sceneAt(normal, normal.duration + 5).scene.kind).toBe('outro')
    expect(sceneAt(normal, -1).scene.kind).toBe('intro')
  })
})
