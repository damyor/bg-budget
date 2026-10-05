import type { BudgetNode, LocalizedText } from '../../src/lib/types.ts'

/** Declarative description of a node; values in euro. */
export interface Spec {
  id: string
  name: LocalizedText
  /** Total for the node; defaults to the sum of its children. */
  value?: number
  code?: string
  kind?: LocalizedText
  note?: LocalizedText
  children?: Spec[]
  /**
   * When the itemised children cover only part of `value`, the difference
   * becomes this extra child, so every level still adds up.
   */
  rest?: { id: string; name: LocalizedText; note?: LocalizedText; kind?: LocalizedText }
}

/** Rounding tolerance: €0.2 m (sources are in thousands or millions with one decimal). */
const TOLERANCE = 200_000

export function build(spec: Spec, path = spec.name.bg): BudgetNode {
  const children = (spec.children ?? []).map((c) => build(c, `${path} › ${c.name.bg}`)).filter((c) => c.value > 0)
  const sum = children.reduce((s, c) => s + c.value, 0)
  const value = spec.value ?? sum
  // An item explicitly worth nothing (e.g. an unspent reserve) is dropped by its parent.
  if (spec.value === 0 && !children.length) return { id: spec.id, name: spec.name, value: 0 }
  if (!(value > 0)) throw new Error(`${path}: no value`)
  if (children.length && sum > value + TOLERANCE) {
    throw new Error(`${path}: children (${(sum / 1e6).toFixed(1)} m) exceed the total (${(value / 1e6).toFixed(1)} m)`)
  }
  const gap = value - sum
  if (children.length && gap > TOLERANCE) {
    if (!spec.rest) throw new Error(`${path}: children miss ${(gap / 1e6).toFixed(1)} m and no rest node is defined`)
    // The remainder is the same kind of item as its siblings unless it says otherwise.
    const kind = spec.rest.kind ?? children.find((c) => c.kind)?.kind
    children.push({ id: spec.rest.id, name: spec.rest.name, value: Math.round(gap), note: spec.rest.note, ...(kind ? { kind } : {}) })
  }
  const node: BudgetNode = { id: spec.id, name: spec.name, value: Math.round(value) }
  if (spec.code) node.code = spec.code
  if (spec.kind) node.kind = spec.kind
  if (spec.note) node.note = spec.note
  if (children.length > 1) node.children = children.sort((a, b) => b.value - a.value)
  return node
}

export const MILLION = 1_000_000
export const THOUSAND = 1_000
