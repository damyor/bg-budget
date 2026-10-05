import type { BudgetNode, Lang } from './types'
import { MAX_SLOTS } from './palette'

export const OTHER_SUFFIX = '~other'

export interface IndexedNode {
  node: BudgetNode
  parentId: string | null
  depth: number
  /** True for the generated "Other" bucket that groups small slices. */
  synthetic: boolean
}

export interface TreeIndex {
  root: BudgetNode
  byId: Map<string, IndexedNode>
}

/** Children smaller than this share of their parent are grouped into "Other". */
const MIN_SLICE_SHARE = 0.015

/**
 * The eight top-level areas every dataset shares. They keep this order (and so
 * the same colour and position) in every dataset, so plan and actual compare at a glance.
 */
export const AREA_ORDER = ['social', 'economy', 'health', 'education', 'government', 'order', 'community', 'defence']

function ordered(children: BudgetNode[]): BudgetNode[] {
  if (children.every((c) => AREA_ORDER.includes(c.id))) {
    return [...children].sort((a, b) => AREA_ORDER.indexOf(a.id) - AREA_ORDER.indexOf(b.id))
  }
  return [...children].sort((a, b) => b.value - a.value)
}

/**
 * Splits children (largest first) into the slices that get their own colour
 * and a tail that is grouped into "Other". `keepId` forces one child to stay
 * visible (used by clips so the next step of the path is always a slice).
 */
export function foldChildren(node: BudgetNode, keepId?: string): { visible: BudgetNode[]; tail: BudgetNode[] } {
  const children = ordered(node.children ?? [])
  const total = children.reduce((s, c) => s + c.value, 0)
  const visible: BudgetNode[] = []
  let tail: BudgetNode[] = []
  for (const child of children) {
    if (visible.length < MAX_SLOTS - 1 && child.value / total >= MIN_SLICE_SHARE) visible.push(child)
    else tail.push(child)
  }
  // Grouping a single child into "Other" hides it for nothing.
  if (tail.length === 1) {
    visible.push(tail[0])
    tail = []
  }
  if (keepId && tail.some((c) => c.id === keepId)) {
    const kept = tail.find((c) => c.id === keepId)!
    tail = tail.filter((c) => c !== kept)
    if (visible.length >= MAX_SLOTS - 1) tail.unshift(visible.pop()!)
    visible.push(kept)
    visible.splice(0, visible.length, ...ordered(visible))
    if (tail.length === 1) {
      visible.push(tail[0])
      tail = []
    }
  }
  return { visible, tail }
}

export function otherNode(parent: BudgetNode, tail: BudgetNode[]): BudgetNode {
  return {
    id: parent.id + OTHER_SUFFIX,
    name: { bg: 'Други', en: 'Other' },
    value: tail.reduce((s, c) => s + c.value, 0),
    children: tail,
  }
}

export interface Slice {
  node: BudgetNode
  /** Palette slot, or 'other' for the grey bucket. */
  slot: number | 'other'
}

/** The slices a donut shows for `node`, in drawing order. */
export function slicesFor(node: BudgetNode, keepId?: string): Slice[] {
  const { visible, tail } = foldChildren(node, keepId)
  const slices: Slice[] = visible.map((child, i) => ({ node: child, slot: i }))
  if (tail.length) slices.push({ node: otherNode(node, tail), slot: 'other' })
  return slices
}

export function buildIndex(root: BudgetNode): TreeIndex {
  const byId = new Map<string, IndexedNode>()
  // "Other" buckets are registered too, so they can be opened like any node.
  // Their children keep their real parent; a long tail can nest another bucket.
  const registerOther = (node: BudgetNode, depth: number) => {
    const { tail } = foldChildren(node)
    if (!tail.length) return
    const other = otherNode(node, tail)
    byId.set(other.id, { node: other, parentId: node.id, depth: depth + 1, synthetic: true })
    registerOther(other, depth + 1)
  }
  const visit = (node: BudgetNode, parentId: string | null, depth: number) => {
    byId.set(node.id, { node, parentId, depth, synthetic: false })
    if (!node.children?.length) return
    for (const child of node.children) visit(child, node.id, depth + 1)
    registerOther(node, depth)
  }
  visit(root, null, 0)
  return { root, byId }
}

/** Ancestors from the root down to (and including) the node. */
export function pathTo(index: TreeIndex, id: string): BudgetNode[] {
  const path: BudgetNode[] = []
  let current = index.byId.get(id)
  while (current) {
    path.unshift(current.node)
    current = current.parentId ? index.byId.get(current.parentId) : undefined
  }
  return path
}

export function parentOf(index: TreeIndex, id: string): BudgetNode | null {
  const parentId = index.byId.get(id)?.parentId
  return parentId ? index.byId.get(parentId)!.node : null
}

/** The nearest place on a path (the node itself or an ancestor) whose residents are known: a municipality or province. */
export function placeOf(path: BudgetNode[]): (BudgetNode & { residents: number }) | null {
  const place = path.findLast((n) => n.residents)
  return place ? (place as BudgetNode & { residents: number }) : null
}

/** Real (non-synthetic) path, used for clips and breadcrumbs. */
export function realPathTo(index: TreeIndex, id: string): BudgetNode[] {
  return pathTo(index, id).filter((n) => !n.id.endsWith(OTHER_SUFFIX))
}

export interface SearchHit {
  node: BudgetNode
  path: BudgetNode[]
}

const normalize = (s: string) => s.toLocaleLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')

/** Finds nodes whose name (in either language) or code contains every query word. */
export function searchNodes(index: TreeIndex, query: string, lang: Lang, limit = 12): SearchHit[] {
  const words = normalize(query).split(/[\s›>/,]+/).filter(Boolean)
  if (!words.length) return []
  const hits: { node: BudgetNode; score: number }[] = []
  for (const { node, synthetic, depth } of index.byId.values()) {
    if (synthetic || node === index.root) continue
    const own = normalize(node.name[lang])
    const other = normalize(node.name[lang === 'bg' ? 'en' : 'bg'])
    const path = pathTo(index, node.id)
    const context = normalize(path.map((n) => n.name[lang]).join(' '))
    const code = normalize(node.code ?? '')
    let score = 0
    let ok = true
    for (const w of words) {
      if (own.startsWith(w) || own.includes(' ' + w)) score += 3
      else if (own.includes(w)) score += 2
      else if (other.includes(w) || code.startsWith(w)) score += 1.5
      else if (context.includes(w)) score += 0.5
      else {
        ok = false
        break
      }
    }
    if (!ok) continue
    // Prefer shallow and large nodes when the text match is equally good.
    score += 0.5 / (depth + 1) + Math.log10(1 + node.value / 1e9) * 0.1
    hits.push({ node, score })
  }
  hits.sort((a, b) => b.score - a.score)
  return hits.slice(0, limit).map(({ node }) => ({ node, path: pathTo(index, node.id) }))
}
