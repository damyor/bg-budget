// Turns a path through the budget tree into a sequence of timed scenes.
//
// Path to a category:  intro → (highlight → zoom → settle)* → highlight target → outro
// Whole budget:        intro → highlight the largest areas one by one → outro

import type { BudgetNode } from '../lib/types'

export type SceneKind = 'intro' | 'highlight' | 'zoom' | 'settle' | 'outro'

export interface Scene {
  kind: SceneKind
  start: number
  duration: number
  /** Index in the path of the ring being shown (for zoom: the ring zoomed from). */
  level: number
  /** Node highlighted (or zoomed into) within that ring. */
  focusId: string | null
  /** For highlights: whether a zoom follows (the caption fades out). */
  leadsToZoom?: boolean
}

export interface Timeline {
  scenes: Scene[]
  duration: number
}

export type Speed = 'fast' | 'normal' | 'slow'
export const SPEED_FACTOR: Record<Speed, number> = { fast: 0.75, normal: 1, slow: 1.35 }

const BASE = { intro: 2.6, highlight: 1.8, tour: 1.6, zoom: 1.1, settle: 0.45, outro: 3.6 }
/** How many of the largest areas an overview clip walks through. */
export const TOUR_STEPS = 3

export function buildTimeline(path: BudgetNode[], speed: Speed, tourIds: string[] = []): Timeline {
  const k = SPEED_FACTOR[speed]
  const scenes: Scene[] = []
  let t = 0
  const add = (kind: SceneKind, level: number, base: number, focusId: string | null, leadsToZoom = false) => {
    scenes.push({ kind, start: t, duration: base * k, level, focusId, leadsToZoom })
    t += base * k
  }

  add('intro', 0, BASE.intro, null)
  const last = path.length - 1
  if (last === 0) {
    for (const id of tourIds) add('highlight', 0, BASE.tour, id)
    add('outro', 0, BASE.outro, null)
  } else {
    for (let i = 1; i < last; i++) {
      add('highlight', i - 1, BASE.highlight, path[i].id, true)
      add('zoom', i - 1, BASE.zoom, path[i].id)
      add('settle', i, BASE.settle, null)
    }
    // The target is shown as a part of its parent, then summarised.
    add('highlight', last - 1, BASE.highlight, path[last].id)
    add('outro', last - 1, BASE.outro, path[last].id)
  }
  return { scenes, duration: t }
}

export function sceneAt(timeline: Timeline, time: number): { scene: Scene; p: number } {
  const t = Math.min(Math.max(time, 0), timeline.duration - 1e-6)
  const scene = timeline.scenes.find((s) => t >= s.start && t < s.start + s.duration) ?? timeline.scenes.at(-1)!
  return { scene, p: Math.min(1, Math.max(0, (t - scene.start) / scene.duration)) }
}
