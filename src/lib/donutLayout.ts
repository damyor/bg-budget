// Geometry shared by the interactive SVG donut and the canvas clip renderer.
//
// A drill-down is drawn as a zoom: the view window over the parent's angle
// space shrinks from the full circle to the clicked slice's extent, so the
// slice grows to 360° while its siblings are pushed out of the window. The
// slice's own children are laid out inside its extent and fade in on top.

import type { BudgetNode } from './types'
import { slicesFor, type Slice } from './tree'

const TAU = Math.PI * 2

export interface LaidSlice extends Slice {
  start: number
  end: number
  /** Share of the sum of slices (0..1). */
  share: number
}

/** Angles (radians, clockwise from 12 o'clock) for each slice of `node`. */
export function layoutSlices(node: BudgetNode, keepId?: string): LaidSlice[] {
  const slices = slicesFor(node, keepId)
  const total = slices.reduce((s, sl) => s + sl.node.value, 0) || 1
  let angle = 0
  return slices.map((sl) => {
    const share = sl.node.value / total
    const start = angle
    angle += share * TAU
    return { ...sl, start, end: angle, share }
  })
}

export interface DrawArc {
  key: string
  node: BudgetNode
  slot: number | 'other'
  start: number
  end: number
  opacity: number
  /** Whether this arc belongs to the destination (child) level. */
  incoming: boolean
  /**
   * While a slice splits into its children, each child starts in the parent's
   * colour (`blendFrom`) and turns into its own: 0 = parent colour, 1 = own.
   */
  blendFrom?: number | 'other'
  blend?: number
}

/** Smooth in-out curve used by every transition. */
export function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
/** Maps x from [a, b] to [0, 1], clamped. */
const progress = (x: number, a: number, b: number) => clamp01((x - a) / (b - a))

/**
 * Arcs to draw at progress `t` (0 = parent level, 1 = child level) of a zoom
 * from `parent` slices into `focus`, whose own slices are `children`.
 * Running t from 1 to 0 gives the zoom-out.
 */
export function zoomArcs(parent: LaidSlice[], focus: LaidSlice, children: LaidSlice[], t: number): DrawArc[] {
  const e = easeInOut(clamp01(t))
  const w0 = lerp(0, focus.start, e)
  const w1 = lerp(TAU, focus.end, e)
  const span = w1 - w0 || 1e-9
  const toScreen = (a: number) => Math.min(TAU, Math.max(0, ((a - w0) / span) * TAU))

  const arcs: DrawArc[] = []
  for (const sl of parent) {
    const isFocus = sl.node.id === focus.node.id
    const start = toScreen(sl.start)
    const end = toScreen(sl.end)
    if (end - start < 1e-4) continue
    // Siblings fade as they are pushed out; the focus slice stays underneath
    // its children (same colour at first) until they have taken over.
    const opacity = isFocus ? 1 - progress(t, 0.8, 1) : 1 - progress(t, 0, 0.6)
    if (opacity <= 0.001) continue
    arcs.push({ key: `p:${sl.node.id}`, node: sl.node, slot: sl.slot, start, end, opacity, incoming: false })
  }
  const width = focus.end - focus.start
  const opacity = progress(t, 0.15, 0.35)
  const blend = progress(t, 0.35, 0.85)
  for (const sl of children) {
    const start = toScreen(focus.start + (sl.start / TAU) * width)
    const end = toScreen(focus.start + (sl.end / TAU) * width)
    if (opacity <= 0.001 || end - start < 1e-4) continue
    arcs.push({
      key: `c:${sl.node.id}`,
      node: sl.node,
      slot: sl.slot,
      start,
      end,
      opacity,
      incoming: true,
      blendFrom: focus.slot,
      blend,
    })
  }
  return arcs
}

/** Arcs for a level at rest. */
export function staticArcs(slices: LaidSlice[]): DrawArc[] {
  return slices.map((sl) => ({
    key: `c:${sl.node.id}`,
    node: sl.node,
    slot: sl.slot,
    start: sl.start,
    end: sl.end,
    opacity: 1,
    incoming: true,
  }))
}

/** Intro animation: slices sweep in clockwise one after another. */
export function sweepArcs(slices: LaidSlice[], t: number): DrawArc[] {
  const e = easeInOut(clamp01(t))
  const limit = e * TAU
  return slices
    .filter((sl) => sl.start < limit)
    .map((sl) => ({
      key: `c:${sl.node.id}`,
      node: sl.node,
      slot: sl.slot,
      start: sl.start,
      end: Math.min(sl.end, limit),
      opacity: 1,
      incoming: true,
    }))
}
