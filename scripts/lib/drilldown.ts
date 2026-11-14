// The drill-down mechanism (docs/drilldown.md): splitting a box of a built tree with parts taken from other documents
// (parts files), copying a subtree another dataset already has (grafts), the ledger of what is known about each box
// that cannot be split yet, and the frontier report of where the data stops.
//
// Everything here works on built Dataset trees, after the builders and before validation, series, list links and
// writing. Values are never scaled or estimated: parts add up to at most their parent and the gap stays an explicit
// remainder.

import { readdirSync, readFileSync } from 'node:fs'
import type {
  BudgetNode,
  Dataset,
  DatasetFamily,
  DatasetRef,
  DrilldownState,
  LocalizedText,
  NodeStatus,
  RefBasis,
} from '../../src/lib/types.ts'
import { fixCyrillic, parseCsv } from './csv.ts'
import { TOLERANCE } from './tree-builder.ts'

const t = (bg: string, en: string): LocalizedText => ({ bg, en })

/** In the order the frontier lists them. */
const FAMILIES: DatasetFamily[] = ['functions', 'ministries', 'municipalities', 'cities', 'cofog']
const STATES: DrilldownState[] = ['todo', 'no-source', 'blocked', 'final']
const BASES: RefBasis[] = ['exact', 'mapped', 'payments']
const ACCESS = ['script', 'browser', 'unknown'] as const
/** Ids are used in links: letters, digits, '-', '.', '_'; never the donut's own "~other" buckets. */
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

/** The remainder of a split made by a graft (parts files name their own). */
const GRAFT_REST = { name: t('Други (неразпределени)', 'Other (not itemised)') }

// ---------- kinds: which levels are only an economic (accounting) split ----------

/**
 * Levels that split a box only by economic category, not by purpose or recipient: the reports' current / capital
 * split and Eurostat's transactions („Вид разход“; the big cities' kinds of spending carry the same name), the
 * ministries' departmental staff / running costs / capital („Ведомствен разход“), and the cities' ЕБК paragraphs and
 * sub-paragraphs. Matched on the Bulgarian name of the node's kind (or of its level when it has none).
 */
export const ACCOUNTING_KINDS = new Set(['Вид разход', 'Ведомствен разход', 'Параграф', 'Подпараграф'])

/** The kind of a node at this depth (root = 0): its own, else its level's (the deepest level beyond the list). */
export function kindOf(node: BudgetNode, depth: number, levels: LocalizedText[]): LocalizedText | undefined {
  return node.kind ?? levels[Math.min(depth, levels.length) - 1]
}

export function isAccounting(node: BudgetNode, depth: number, levels: LocalizedText[]): boolean {
  const kind = kindOf(node, depth, levels)
  return Boolean(kind && ACCOUNTING_KINDS.has(kind.bg))
}

/** A node whose children are all economic splits (current / capital, staff / running costs …). */
export function accountingOnly(node: BudgetNode, depth: number, levels: LocalizedText[]): boolean {
  return Boolean(node.children?.length) && node.children!.every((c) => isAccounting(c, depth + 1, levels))
}

/** The reports' rounding remainders (`<slot>.rounding`) are not boxes of their own. */
const isRounding = (node: BudgetNode) => node.id.endsWith('.rounding')

// ---------- reading: parts files and grafts ----------

export interface PartsMeta {
  source: LocalizedText
  url?: string
  basis: RefBasis
  /** The remainder a split leaves: its name and note. */
  rest: { name: LocalizedText; note?: LocalizedText }
  /** The parts replace the parent's children (only with a stated reason, see docs/drilldown.md). */
  replace?: true
}

export interface PartRow {
  dataset: string
  parent: string
  id: string
  name: LocalizedText
  /** Euro. */
  value: number
  code?: string
  kind?: LocalizedText
  note?: LocalizedText
  /** Line in the file (the header is line 1). */
  line: number
}

export interface PartsFile {
  /** Key of Dataset.refs and of each node's `ref`: the file name without `.parts.csv`. */
  key: string
  /** The file, for messages. */
  file: string
  meta: PartsMeta
  rows: PartRow[]
}

export interface GraftRow {
  dataset: string
  parent: string
  sourceDataset: string
  sourceNode: string
  mode: 'part' | 'link'
  id?: string
  name?: LocalizedText
  note?: LocalizedText
  line: number
}

const isText = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''
const isLocalized = (v: unknown): v is LocalizedText =>
  typeof v === 'object' && v !== null && isText((v as LocalizedText).bg) && isText((v as LocalizedText).en) && Object.keys(v).length === 2
const isDate = (v: unknown): v is string => typeof v === 'string' && DATE.test(v) && !Number.isNaN(Date.parse(v))

function unknownKeys(value: object, known: string[], where: string): string[] {
  return Object.keys(value)
    .filter((k) => !known.includes(k))
    .map((k) => `${where}: unknown field "${k}"`)
}

/** Rows of a CSV as objects; fails on missing required columns and unknown ones. */
function csvRows(text: string, required: string[], optional: string[], where: string): { row: Record<string, string>; line: number }[] {
  const [header, ...rows] = parseCsv(text.replace(/^﻿/, ''))
  if (!header) throw new Error(`${where}: empty file`)
  const columns = header.map((h) => h.trim())
  const missing = required.filter((c) => !columns.includes(c))
  if (missing.length) throw new Error(`${where}: missing column(s) ${missing.join(', ')}`)
  const extra = columns.filter((c) => !required.includes(c) && !optional.includes(c))
  if (extra.length) throw new Error(`${where}: unknown column(s) ${extra.join(', ')}`)
  return rows
    .map((r, i) => ({ row: Object.fromEntries(columns.map((c, j) => [c, (r[j] ?? '').trim()])), line: i + 2 }))
    .filter(({ row }) => Object.values(row).some(Boolean))
}

/** A {bg, en} pair from two optional columns: both or neither. */
function pair(row: Record<string, string>, prefix: string, where: string): LocalizedText | undefined {
  const bg = row[`${prefix}_bg`] ?? ''
  const en = row[`${prefix}_en`] ?? ''
  if (!bg && !en) return undefined
  if (!bg || !en) throw new Error(`${where}: ${prefix}_bg and ${prefix}_en go together`)
  return t(fixCyrillic(bg), en)
}

export function parsePartsMeta(raw: unknown, where: string): PartsMeta {
  const problems: string[] = []
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error(`${where}: not an object`)
  const m = raw as Record<string, unknown>
  problems.push(...unknownKeys(m, ['source', 'url', 'basis', 'rest', 'replace'], where))
  if (!isLocalized(m.source)) problems.push(`${where}: "source" must be {bg, en}`)
  if (m.url !== undefined && !(typeof m.url === 'string' && /^https?:\/\//.test(m.url))) problems.push(`${where}: "url" must be an http(s) address`)
  if (!BASES.includes(m.basis as RefBasis)) problems.push(`${where}: "basis" must be one of ${BASES.join(', ')}`)
  const rest = m.rest as Record<string, unknown> | undefined
  if (typeof rest !== 'object' || rest === null) problems.push(`${where}: "rest" must be {name, note?}`)
  else {
    problems.push(...unknownKeys(rest, ['name', 'note'], `${where} rest`))
    if (!isLocalized(rest.name)) problems.push(`${where}: "rest.name" must be {bg, en}`)
    if (rest.note !== undefined && !isLocalized(rest.note)) problems.push(`${where}: "rest.note" must be {bg, en}`)
  }
  if (m.replace !== undefined && m.replace !== true) problems.push(`${where}: "replace" can only be true`)
  if (problems.length) throw new Error(problems.join('\n'))
  return m as unknown as PartsMeta
}

/** One parts file and its sidecar (`<name>.parts.csv` + `<name>.parts.json`). */
export function parsePartsFile(csv: string, sidecar: string, file: string): PartsFile {
  const meta = parsePartsMeta(JSON.parse(sidecar), file.replace(/\.csv$/, '.json'))
  const rows = csvRows(csv, ['dataset', 'parent', 'id', 'name_bg', 'name_en', 'value_eur'], ['code', 'kind_bg', 'kind_en', 'note_bg', 'note_en'], file).map(
    ({ row, line }): PartRow => {
      const where = `${file}:${line}`
      for (const c of ['dataset', 'parent', 'id', 'name_bg', 'name_en']) if (!row[c]) throw new Error(`${where}: empty ${c}`)
      if (!ID.test(row.id)) throw new Error(`${where}: id "${row.id}" is not URL-safe (letters, digits, - . _)`)
      // Euro with a decimal point, no thousands separators.
      const value = /^\d+(\.\d+)?$/.test(row.value_eur) ? Number(row.value_eur) : NaN
      if (!(value > 0)) throw new Error(`${where}: value_eur "${row.value_eur}" must be a positive number of euro (e.g. 1487826000)`)
      return {
        dataset: row.dataset,
        parent: row.parent,
        id: row.id,
        name: t(fixCyrillic(row.name_bg), row.name_en),
        value,
        ...(row.code ? { code: row.code } : {}),
        ...(pair(row, 'kind', where) ? { kind: pair(row, 'kind', where) } : {}),
        ...(pair(row, 'note', where) ? { note: pair(row, 'note', where) } : {}),
        line,
      }
    },
  )
  if (!rows.length) throw new Error(`${file}: no rows`)
  const seen = new Set<string>()
  for (const r of rows) {
    const key = `${r.dataset}:${r.id}`
    if (seen.has(key)) throw new Error(`${file}:${r.line}: id ${r.id} appears twice for ${r.dataset}`)
    seen.add(key)
  }
  const key = file.split('/').pop()!.replace(/\.parts\.csv$/, '')
  return { key, file, meta, rows }
}

/** Every `*.parts.csv` under the folder (with its `.parts.json`), in path order. */
export function readPartsFiles(dir: URL): PartsFile[] {
  const files = readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.parts.csv'))
    .sort()
  const parsed = files.map((f) => {
    const sidecar = f.replace(/\.csv$/, '.json')
    let meta: string
    try {
      meta = readFileSync(new URL(sidecar, dir), 'utf8')
    } catch {
      throw new Error(`${f}: no sidecar ${sidecar}`)
    }
    return parsePartsFile(readFileSync(new URL(f, dir), 'utf8'), meta, f)
  })
  const keys = new Map<string, string>()
  for (const p of parsed) {
    if (keys.has(p.key)) throw new Error(`${p.file}: the name ${p.key} is taken by ${keys.get(p.key)} (names of parts files must be unique)`)
    keys.set(p.key, p.file)
  }
  return parsed
}

export function parseGrafts(csv: string, file: string): GraftRow[] {
  const rows = csvRows(csv, ['dataset', 'parent', 'source_dataset', 'source_node'], ['mode', 'id', 'name_bg', 'name_en', 'note_bg', 'note_en'], file)
  return rows.map(({ row, line }) => {
    const where = `${file}:${line}`
    for (const c of ['dataset', 'parent', 'source_dataset', 'source_node']) if (!row[c]) throw new Error(`${where}: empty ${c}`)
    const mode = (row.mode || 'part') as GraftRow['mode']
    if (mode !== 'part' && mode !== 'link') throw new Error(`${where}: mode must be part or link`)
    if (row.id && !ID.test(row.id)) throw new Error(`${where}: id "${row.id}" is not URL-safe`)
    if (mode === 'link' && (row.id || row.note_bg || row.note_en)) throw new Error(`${where}: a link takes no id or note (its name is the link's text)`)
    const name = pair(row, 'name', where)
    const note = pair(row, 'note', where)
    return {
      dataset: row.dataset,
      parent: row.parent,
      sourceDataset: row.source_dataset,
      sourceNode: row.source_node,
      mode,
      ...(row.id ? { id: row.id } : {}),
      ...(name ? { name } : {}),
      ...(note ? { note } : {}),
      line,
    }
  })
}

export function readGrafts(file: URL): GraftRow[] {
  return parseGrafts(readFileSync(file, 'utf8'), file.pathname.split('/').slice(-2).join('/'))
}

// ---------- applying parts and grafts ----------

/** Walks a tree to the node with this id. */
export function findNode(root: BudgetNode, id: string): BudgetNode | undefined {
  if (root.id === id) return root
  for (const child of root.children ?? []) {
    const found = findNode(child, id)
    if (found) return found
  }
  return undefined
}

function allIds(root: BudgetNode, into = new Set<string>()): Set<string> {
  into.add(root.id)
  root.children?.forEach((c) => allIds(c, into))
  return into
}

const m = (eur: number) => `€${(eur / 1e6).toFixed(1)} m`
const byValue = (a: BudgetNode, b: BudgetNode) => b.value - a.value

/** A remainder child: the parent's amount the parts do not cover. */
function remainder(id: string, gap: number, rest: PartsMeta['rest'], siblings: BudgetNode[]): BudgetNode {
  const kind = siblings.find((c) => c.kind)?.kind
  return { id, name: rest.name, value: Math.round(gap), ...(rest.note ? { note: rest.note } : {}), ...(kind ? { kind } : {}), rest: true }
}

/**
 * Puts parts under a node of a built tree: a leaf gets them as children (the gap becomes `<parent>.rest`); a node
 * with a remainder child gets them appended and the remainder shrinks by their sum (it goes when it reaches
 * rounding); a node with children and no remainder fails unless `replace`, in which case the parts replace them.
 */
export function attach(parent: BudgetNode, parts: BudgetNode[], rest: PartsMeta['rest'], replace: boolean, where: string): void {
  const sum = parts.reduce((s, p) => s + p.value, 0)
  if (parent.rest) throw new Error(`${where}: ${parent.id} is a remainder; put the parts under its parent instead, and the remainder shrinks`)
  const remainders = (parent.children ?? []).filter((c) => c.rest && !isRounding(c))
  if (!parent.children?.length || replace) {
    if (sum > parent.value + TOLERANCE) throw new Error(`${where}: the parts (${m(sum)}) exceed ${parent.id} (${m(parent.value)})`)
    const gap = parent.value - sum
    const children = [...parts]
    if (gap > TOLERANCE) children.push(remainder(`${parent.id}.rest`, gap, rest, parts))
    if (children.length < 2) throw new Error(`${where}: a single part equal to ${parent.id} splits nothing; say it in a note instead`)
    parent.children = children.sort(byValue)
    return
  }
  if (!remainders.length) {
    throw new Error(`${where}: ${parent.id} already has children and no remainder to take the parts from (replace them only with a stated reason: "replace": true)`)
  }
  if (remainders.length > 1) throw new Error(`${where}: ${parent.id} has more than one remainder (${remainders.map((r) => r.id).join(', ')})`)
  const [left] = remainders
  if (left.children?.length) throw new Error(`${where}: the remainder ${left.id} has parts of its own and cannot shrink`)
  const after = left.value - sum
  if (after < -TOLERANCE) {
    throw new Error(`${where}: the parts (${m(sum)}) exceed the remainder ${left.id} (${m(left.value)}) of ${parent.id} (${m(parent.value)})`)
  }
  // The remainder keeps its place among equals (or goes), the parts join, and the order is by value again.
  const kept = parent.children.flatMap((c) => (c !== left ? [c] : after > TOLERANCE ? [{ ...left, value: Math.round(after) }] : []))
  parent.children = [...kept, ...parts].sort(byValue)
}

type Op =
  | { kind: 'parts'; file: PartsFile; dataset: string; parent: string; rows: PartRow[]; creates: string[]; order: number }
  | { kind: 'graft'; row: GraftRow; file: string; dataset: string; parent: string; creates: string[]; order: number }

const graftRoot = (row: GraftRow) => row.id ?? `${row.parent}.${row.sourceNode}`

/** Parts of one file grouped by the node they split: rows whose parent is another row's id nest under that row. */
function partsOps(files: PartsFile[], start: number): Op[] {
  const ops: Op[] = []
  for (const file of files) {
    const byDataset = new Map<string, PartRow[]>()
    for (const r of file.rows) byDataset.set(r.dataset, [...(byDataset.get(r.dataset) ?? []), r])
    for (const [dataset, rows] of byDataset) {
      const ids = new Set(rows.map((r) => r.id))
      const top = (r: PartRow): PartRow => {
        let row = r
        const seen = new Set<string>()
        while (ids.has(row.parent)) {
          if (seen.has(row.id)) throw new Error(`${file.file}:${r.line}: rows nest in a cycle`)
          seen.add(row.id)
          row = rows.find((x) => x.id === row.parent)!
        }
        return row
      }
      const groups = new Map<string, PartRow[]>()
      for (const r of rows) {
        const parent = top(r).parent
        groups.set(parent, [...(groups.get(parent) ?? []), r])
      }
      for (const [parent, group] of groups) {
        ops.push({ kind: 'parts', file, dataset, parent, rows: group, creates: group.map((r) => r.id), order: start + ops.length })
      }
    }
  }
  return ops
}

/** Ops in dependency order: an op runs after the ops that create its parent, and a graft after every op inside the subtree it copies. */
function ordered(ops: Op[], datasets: Map<string, Dataset>): Op[] {
  // Parent of every node: those of the built trees, then those the ops create.
  const parents = new Map<string, Map<string, string>>()
  const built = new Map<string, Set<string>>()
  for (const [id, d] of datasets) {
    const map = new Map<string, string>()
    const walk = (n: BudgetNode) => n.children?.forEach((c) => (map.set(c.id, n.id), walk(c)))
    walk(d.root)
    parents.set(id, map)
    built.set(id, allIds(d.root))
  }
  const creator = new Map<string, Op>()
  for (const op of ops) {
    const map = parents.get(op.dataset)
    for (const id of op.creates) {
      const key = `${op.dataset}:${id}`
      if (creator.has(key)) throw new Error(`${opWhere(op)}: ${id} is also created by ${opWhere(creator.get(key)!)}`)
      creator.set(key, op)
      if (op.kind === 'parts') map?.set(id, op.rows.find((r) => r.id === id)!.parent)
      else map?.set(id, op.parent)
    }
  }
  const graftRoots = ops.filter((o) => o.kind === 'graft' && o.row.mode === 'part')
  /** The op that creates this node, if any (a graft's copies are `<root>.<their id>`). */
  const createdBy = (dataset: string, id: string): Op | undefined =>
    creator.get(`${dataset}:${id}`) ??
    (built.get(dataset)?.has(id) ? undefined : graftRoots.find((g) => g.dataset === dataset && id.startsWith(`${g.creates[0]}.`)))
  const ancestors = (dataset: string, id: string): string[] => {
    const chain: string[] = []
    let current: string | undefined = id
    const map = parents.get(dataset)
    while (current !== undefined && chain.length < 100) {
      chain.push(current)
      const created = createdBy(dataset, current)
      current = map?.get(current) ?? (created?.kind === 'graft' && created.creates[0] !== current ? created.creates[0] : undefined)
    }
    return chain
  }
  const deps = new Map<Op, Set<Op>>()
  for (const op of ops) {
    const set = new Set<Op>()
    for (const id of ancestors(op.dataset, op.parent)) {
      const by = createdBy(op.dataset, id)
      if (by && by !== op) set.add(by)
    }
    if (op.kind === 'graft') {
      const by = createdBy(op.row.sourceDataset, op.row.sourceNode)
      if (by) set.add(by)
      for (const other of ops) {
        if (other !== op && other.dataset === op.row.sourceDataset && ancestors(other.dataset, other.parent).includes(op.row.sourceNode)) set.add(other)
      }
    }
    deps.set(op, set)
  }
  const done = new Set<Op>()
  const result: Op[] = []
  while (result.length < ops.length) {
    const ready = ops.filter((op) => !done.has(op) && [...deps.get(op)!].every((d) => done.has(d)))
    if (!ready.length) {
      const stuck = ops.filter((op) => !done.has(op)).map(opWhere)
      throw new Error(`Parts and grafts depend on each other in a cycle: ${stuck.join('; ')}`)
    }
    const next = ready.sort((a, b) => a.order - b.order)[0]
    done.add(next)
    result.push(next)
  }
  return result
}

function opWhere(op: Op): string {
  return op.kind === 'parts' ? `${op.file.file} (${op.dataset} › ${op.parent})` : `${op.file}:${op.row.line}`
}

function addRef(dataset: Dataset, key: string, ref: DatasetRef) {
  const refs = (dataset.refs ??= {})
  const existing = refs[key]
  if (existing && JSON.stringify(existing) !== JSON.stringify(ref)) throw new Error(`${dataset.id}: two different sources under the key ${key}`)
  refs[key] = ref
}

/** The nodes of one parts op: its top-level parts, each with the rows nested under it (and their remainders). */
function partNodes(op: Extract<Op, { kind: 'parts' }>): BudgetNode[] {
  const { file, rows } = op
  const make = (row: PartRow): BudgetNode => {
    const node: BudgetNode = { id: row.id, name: row.name, value: Math.round(row.value) }
    if (row.code) node.code = row.code
    if (row.kind) node.kind = row.kind
    if (row.note) node.note = row.note
    node.ref = file.key
    const children = rows.filter((r) => r.parent === row.id).map(make)
    if (children.length) attach(node, children, file.meta.rest, false, `${file.file}:${row.line}`)
    return node
  }
  return rows.filter((r) => r.parent === op.parent).map(make)
}

/** A copy of a subtree for a graft: ids become `<root>.<id>`, the copies keep no links of their own. */
function copyTree(source: BudgetNode, rootId: string, ref: (node: BudgetNode) => string): BudgetNode {
  const copy = (node: BudgetNode, id: string): BudgetNode => {
    const out: BudgetNode = { id, name: node.name, value: node.value }
    if (node.code) out.code = node.code
    if (node.kind) out.kind = node.kind
    if (node.note) out.note = node.note
    if (node.rest) out.rest = true
    out.ref = ref(node)
    if (node.children?.length) out.children = node.children.map((c) => copy(c, `${rootId}.${c.id}`))
    return out
  }
  return copy(source, rootId)
}

/** Applies every parts file and graft to the datasets (in place), in dependency order. Fails on the first problem. */
export function applyDrilldown(datasets: Dataset[], parts: PartsFile[], grafts: GraftRow[], graftsFile = 'data/drilldown/grafts.csv'): void {
  const byId = new Map(datasets.map((d) => [d.id, d]))
  const graftOps: Op[] = grafts.map((row, i) => ({
    kind: 'graft',
    row,
    file: graftsFile,
    dataset: row.dataset,
    parent: row.parent,
    creates: row.mode === 'part' ? [graftRoot(row)] : [],
    order: 1_000_000 + i,
  }))
  const ops = [...partsOps(parts, 0), ...graftOps]
  for (const op of ops) {
    if (!byId.has(op.dataset)) throw new Error(`${opWhere(op)}: unknown dataset ${op.dataset}`)
    if (op.kind === 'graft' && !byId.has(op.row.sourceDataset)) throw new Error(`${opWhere(op)}: unknown source dataset ${op.row.sourceDataset}`)
  }
  for (const op of ordered(ops, byId)) {
    const dataset = byId.get(op.dataset)!
    const where = opWhere(op)
    const parent = findNode(dataset.root, op.parent)
    if (!parent) throw new Error(`${where}: no node ${op.parent} in ${op.dataset}`)
    // Ids in use, but not those of children that the parts replace.
    const replacing = op.kind === 'parts' && op.file.meta.replace === true
    const ids = allIds(dataset.root)
    if (replacing) parent.children?.forEach((c) => allIds(c).forEach((id) => ids.delete(id)))
    const clash = (nodes: BudgetNode[]) => {
      for (const n of nodes) {
        for (const id of allIds(n)) if (ids.has(id)) throw new Error(`${where}: id ${id} already exists in ${op.dataset}`)
      }
    }
    if (op.kind === 'parts') {
      const nodes = partNodes(op)
      clash(nodes)
      const { meta } = op.file
      addRef(dataset, op.file.key, { name: meta.source, ...(meta.url ? { url: meta.url } : {}), basis: meta.basis })
      attach(parent, nodes, meta.rest, meta.replace === true, where)
      continue
    }
    const { row } = op
    const source = byId.get(row.sourceDataset)!
    const original = findNode(source.root, row.sourceNode)
    if (!original) throw new Error(`${where}: no node ${row.sourceNode} in ${row.sourceDataset}`)
    if (original.rest) throw new Error(`${where}: ${row.sourceNode} is a remainder; graft what it is a remainder of, or nothing`)
    if (row.mode === 'link') {
      ;(parent.seeAlso ??= []).push({ dataset: source.id, node: original.id, text: row.name ?? original.name, value: original.value })
      continue
    }
    // Copies keep the provenance of nodes that came from a parts file; the rest come from the source dataset.
    const ref = (node: BudgetNode) => {
      const key = node.ref ?? source.id
      addRef(dataset, key, node.ref ? source.refs![node.ref] : { name: source.sourceShort, basis: 'mapped' })
      return key
    }
    const copy = copyTree(original, graftRoot(row), ref)
    if (row.name) copy.name = row.name
    if (row.note) copy.note = row.note
    copy.seeAlso = [{ dataset: source.id, node: original.id, text: t(`Същото в „${source.title.bg}“`, `The same in “${source.title.en}”`), value: original.value }]
    clash([copy])
    attach(parent, [copy], GRAFT_REST, false, where)
  }
}

// ---------- the ledger ----------

export interface LedgerLead {
  source: string
  url?: string
  basis?: RefBasis
  /** What part of the box it would cover ("ФСЕС, ≈53%"). */
  covers?: string
  access?: (typeof ACCESS)[number]
  note?: string
}

export interface LedgerEntry {
  family: DatasetFamily
  node: string
  /** Only these datasets of the family (default: every one that has the node). */
  datasets?: string[]
  state: DrilldownState
  /** Shown to visitors with the box; short. */
  note?: LocalizedText
  /** ISO date the sources were last checked. */
  checked?: string
  leads?: LedgerLead[]
  tried?: { date: string; what: string }[]
}

/** Checks the ledger's shape; fails listing every malformed entry. */
export function parseLedger(raw: unknown, where = 'data/drilldown/ledger.json'): LedgerEntry[] {
  if (!Array.isArray(raw)) throw new Error(`${where}: must be an array of entries`)
  const problems: string[] = []
  raw.forEach((e: unknown, i) => {
    const at = `${where} [${i}]${typeof e === 'object' && e && 'node' in e ? ` ${String((e as { node: unknown }).node)}` : ''}`
    if (typeof e !== 'object' || e === null || Array.isArray(e)) return problems.push(`${at}: not an object`)
    const entry = e as Record<string, unknown>
    problems.push(...unknownKeys(entry, ['family', 'node', 'datasets', 'state', 'note', 'checked', 'leads', 'tried'], at))
    if (!FAMILIES.includes(entry.family as DatasetFamily)) problems.push(`${at}: family must be one of ${FAMILIES.join(', ')}`)
    if (!isText(entry.node)) problems.push(`${at}: node must be a node id`)
    if (entry.datasets !== undefined && !(Array.isArray(entry.datasets) && entry.datasets.length && entry.datasets.every(isText))) {
      problems.push(`${at}: datasets must be a non-empty list of dataset ids`)
    }
    if (!STATES.includes(entry.state as DrilldownState)) problems.push(`${at}: state must be one of ${STATES.join(', ')}`)
    if (entry.note !== undefined && !isLocalized(entry.note)) problems.push(`${at}: note must be {bg, en}`)
    if (entry.checked !== undefined && !isDate(entry.checked)) problems.push(`${at}: checked must be a date YYYY-MM-DD`)
    if (entry.leads !== undefined) {
      if (!Array.isArray(entry.leads)) problems.push(`${at}: leads must be a list`)
      else {
        entry.leads.forEach((lead: unknown, j) => {
          const lat = `${at} lead ${j}`
          if (typeof lead !== 'object' || lead === null) return problems.push(`${lat}: not an object`)
          const l = lead as Record<string, unknown>
          problems.push(...unknownKeys(l, ['source', 'url', 'basis', 'covers', 'access', 'note'], lat))
          if (!isText(l.source)) problems.push(`${lat}: source is required`)
          if (l.url !== undefined && !(typeof l.url === 'string' && /^https?:\/\//.test(l.url))) problems.push(`${lat}: url must be an http(s) address`)
          if (l.basis !== undefined && !BASES.includes(l.basis as RefBasis)) problems.push(`${lat}: basis must be one of ${BASES.join(', ')}`)
          if (l.access !== undefined && !ACCESS.includes(l.access as (typeof ACCESS)[number])) problems.push(`${lat}: access must be one of ${ACCESS.join(', ')}`)
          for (const k of ['covers', 'note'] as const) if (l[k] !== undefined && !isText(l[k])) problems.push(`${lat}: ${k} must be text`)
        })
      }
    }
    if (entry.tried !== undefined) {
      if (!Array.isArray(entry.tried)) problems.push(`${at}: tried must be a list`)
      else {
        entry.tried.forEach((tr: unknown, j) => {
          const tat = `${at} tried ${j}`
          if (typeof tr !== 'object' || tr === null) return problems.push(`${tat}: not an object`)
          const x = tr as Record<string, unknown>
          problems.push(...unknownKeys(x, ['date', 'what'], tat))
          if (!isDate(x.date)) problems.push(`${tat}: date must be YYYY-MM-DD`)
          if (!isText(x.what)) problems.push(`${tat}: what is required`)
        })
      }
    }
  })
  if (problems.length) throw new Error(problems.join('\n'))
  return raw as LedgerEntry[]
}

export function readLedger(file: URL): LedgerEntry[] {
  return parseLedger(JSON.parse(readFileSync(file, 'utf8')), file.pathname.split('/').slice(-3).join('/'))
}

/** An entry that no longer matches the trees: its node is gone, or a box marked as done has been split since. */
export interface StaleEntry {
  entry: LedgerEntry
  dataset?: string
  reason: string
}

/** Every node a ledger entry is about, by dataset (an entry with no `datasets` covers each dataset of its family that has the node). */
export function ledgerIndex(datasets: Dataset[], ledger: LedgerEntry[]): { matches: Map<string, Map<string, LedgerEntry>>; stale: StaleEntry[] } {
  const matches = new Map<string, Map<string, LedgerEntry>>()
  const stale: StaleEntry[] = []
  for (const entry of ledger) {
    const family = datasets.filter((d) => d.family === entry.family)
    for (const id of entry.datasets ?? []) {
      const d = datasets.find((x) => x.id === id)
      if (!d) throw new Error(`ledger ${entry.node}: unknown dataset ${id}`)
      if (d.family !== entry.family) throw new Error(`ledger ${entry.node}: ${id} is not in the ${entry.family} family`)
    }
    const targets = entry.datasets ? family.filter((d) => entry.datasets!.includes(d.id)) : family
    const missing: string[] = []
    for (const d of targets) {
      if (!findNode(d.root, entry.node)) {
        missing.push(d.id)
        continue
      }
      const map = matches.get(d.id) ?? new Map<string, LedgerEntry>()
      if (map.has(entry.node)) throw new Error(`ledger: two entries for ${entry.node} in ${d.id}`)
      map.set(entry.node, entry)
      matches.set(d.id, map)
    }
    if (entry.datasets) missing.forEach((d) => stale.push({ entry, dataset: d, reason: 'node not in the dataset' }))
    else if (missing.length === targets.length) stale.push({ entry, reason: `node not in any ${entry.family} dataset` })
  }
  return { matches, stale }
}

/** Copies each entry's state, note and date onto its nodes (as `status`) and returns the stale entries. */
export function applyLedger(datasets: Dataset[], ledger: LedgerEntry[]): StaleEntry[] {
  const { matches, stale } = ledgerIndex(datasets, ledger)
  for (const d of datasets) {
    const map = matches.get(d.id)
    if (!map) continue
    const walk = (node: BudgetNode, depth: number) => {
      const entry = map.get(node.id)
      if (entry) {
        const status: NodeStatus = { state: entry.state }
        if (entry.note) status.note = entry.note
        if (entry.checked) status.checked = entry.checked
        node.status = status
        // "Nothing finer" no longer holds once the box has parts other than an economic split.
        if ((entry.state === 'final' || entry.state === 'no-source') && node.children?.length && !accountingOnly(node, depth, d.levels)) {
          stale.push({ entry, dataset: d.id, reason: `marked ${entry.state} but has parts now` })
        }
      }
      node.children?.forEach((c) => walk(c, depth + 1))
    }
    walk(d.root, 0)
  }
  return stale
}

// ---------- the frontier ----------

export interface Metrics {
  total: number
  /** Leaf depth weighted by money (root = 0). */
  depth: number
  /**
   * Shares of the total, each leaf counted once: in remainder leaves (≥ €1 m, without rounding), else in economic-split
   * leaves, else in leaves at depth ≤ 2.
   */
  shallow: number
  remainder: number
  accounting: number
}

export function measure(dataset: Dataset): Metrics {
  let leaves = 0
  let weighted = 0
  let shallow = 0
  let remainder = 0
  let accounting = 0
  const walk = (node: BudgetNode, depth: number) => {
    if (node.children?.length) return node.children.forEach((c) => walk(c, depth + 1))
    leaves += node.value
    weighted += node.value * depth
    if (node.rest && !isRounding(node) && node.value >= 1_000_000) remainder += node.value
    else if (isAccounting(node, depth, dataset.levels)) accounting += node.value
    else if (depth <= 2) shallow += node.value
  }
  walk(dataset.root, 0)
  const total = dataset.root.value
  return { total, depth: leaves ? weighted / leaves : 0, shallow: shallow / total, remainder: remainder / total, accounting: accounting / total }
}

export type OpenReason = 'leaf' | 'remainder' | 'accounting'

export interface OpenBox {
  node: BudgetNode
  /** Names from the area down to the box. */
  path: BudgetNode[]
  depth: number
  why: OpenReason
  entry?: LedgerEntry
}

/**
 * The boxes still open in a dataset: leaves not marked final or no-source, remainders (not marked final), and nodes
 * split only by economic category (listed once there, not again for their parts). Largest first.
 */
export function openBoxes(dataset: Dataset, entries: Map<string, LedgerEntry> = new Map()): OpenBox[] {
  const boxes: OpenBox[] = []
  const walk = (node: BudgetNode, depth: number, path: BudgetNode[]) => {
    const entry = entries.get(node.id)
    const closed = entry?.state === 'final' || entry?.state === 'no-source'
    if (depth > 0 && isRounding(node)) return
    if (depth > 0 && node.rest) {
      if (entry?.state !== 'final') boxes.push({ node, path, depth, why: 'remainder', entry })
      return
    }
    if (!node.children?.length) {
      if (depth > 0 && !closed) boxes.push({ node, path, depth, why: 'leaf', entry })
      return
    }
    if (depth > 0 && accountingOnly(node, depth, dataset.levels)) {
      if (!closed) boxes.push({ node, path, depth, why: 'accounting', entry })
      return
    }
    node.children.forEach((c) => walk(c, depth + 1, [...path, c]))
  }
  walk(dataset.root, 0, [])
  return boxes.sort((a, b) => b.node.value - a.node.value || a.node.id.localeCompare(b.node.id))
}

const STAGE_ORDER = ['law', 'draft', 'forecast', 'report']
/** Open boxes listed per dataset, and the size from which an open box needs a ledger entry. */
export const FRONTIER = { top: { functions: 40, other: 15 }, needsEntry: 250_000_000 }

const WHY: Record<OpenReason, string> = { leaf: 'leaf', remainder: 'remainder', accounting: 'economic split only' }
const eurM = (v: number) => (v / 1e6).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const pct = (share: number) => `${(share * 100).toFixed(1)}%`
const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ')

/** The frontier report (deterministic markdown) and one console line per dataset. */
export function frontierReport(datasets: Dataset[], ledger: LedgerEntry[], stale: StaleEntry[]): { markdown: string; summary: string[] } {
  const { matches } = ledgerIndex(datasets, ledger)
  const sorted = [...datasets].sort(
    (a, b) => FAMILIES.indexOf(a.family) - FAMILIES.indexOf(b.family) || a.year - b.year || STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage),
  )
  const out: string[] = []
  const summary: string[] = []
  out.push(
    '# The drill-down frontier',
    '',
    'Where the data stops, written by `npm run data` (scripts/lib/drilldown.ts); do not edit by hand. How a round of',
    'drilling down works, and what the columns mean: [docs/drilldown.md](../../docs/drilldown.md).',
    '',
    '## Depth by dataset',
    '',
    'Depth: leaf depth weighted by money (root = 0; area = 1). The three shares count each leaf once. Remainders: in',
    'remainder boxes of €1 m or more (computed as a difference; rounding left out). Economic split: in leaves that only',
    'split by economic category (current / capital, staff / running costs / capital, ЕБК paragraphs, Eurostat',
    'transactions). ≤ 2 levels: in other leaves that are an area, function or sub-function.',
    '',
    '| Dataset | Family | Total, € m | Depth | ≤ 2 levels | Remainders | Economic split | Open boxes |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |',
  )
  const open = new Map(sorted.map((d) => [d.id, openBoxes(d, matches.get(d.id))]))
  for (const d of sorted) {
    const x = measure(d)
    const boxes = open.get(d.id)!
    out.push(`| ${d.id} | ${d.family} | ${eurM(x.total)} | ${x.depth.toFixed(2)} | ${pct(x.shallow)} | ${pct(x.remainder)} | ${pct(x.accounting)} | ${boxes.length} |`)
    const top = boxes[0]
    summary.push(
      `${d.id}: depth ${x.depth.toFixed(2)}, ≤2 levels ${pct(x.shallow)}, remainders ${pct(x.remainder)}, economic split ${pct(x.accounting)}; ${boxes.length} open boxes` +
        (top ? `, largest ${top.node.name.bg} (€${(top.node.value / 1e9).toFixed(2)} bn)` : ''),
    )
  }
  out.push('', '## Open boxes', '', 'Largest first: the top 40 of each "by purpose" dataset and the top 15 of the others. State and first lead come from', '`data/drilldown/ledger.json`.', '')
  for (const d of sorted) {
    const boxes = open.get(d.id)!
    const top = boxes.slice(0, d.family === 'functions' ? FRONTIER.top.functions : FRONTIER.top.other)
    const sum = boxes.reduce((s, b) => s + b.node.value, 0)
    out.push(`### ${d.id} — ${d.title.en}`, '', `${boxes.length} open boxes, €${eurM(sum)} m (${pct(sum / d.root.value)} of the total).`, '')
    if (!top.length) continue
    out.push('| € m | Share | Path | Depth | Why open | State | First lead |', '| ---: | ---: | --- | ---: | --- | --- | --- |')
    for (const b of top) {
      const lead = b.entry?.leads?.[0]
      const source = lead && lead.source.length > 120 ? `${lead.source.slice(0, 119).trimEnd()}…` : lead?.source
      const leadText = lead ? `${source}${lead.access ? ` (${lead.access})` : ''}` : ''
      out.push(
        `| ${eurM(b.node.value)} | ${pct(b.node.value / d.root.value)} | ${cell(b.path.map((n) => n.name.bg).join(' › '))} \`${b.node.id}\` | ${b.depth} | ${WHY[b.why]} | ${b.entry?.state ?? '—'} | ${cell(leadText)} |`,
      )
    }
    out.push('')
  }
  out.push('## Ledger problems', '')
  if (stale.length) {
    out.push('Stale entries:', '')
    for (const s of stale) out.push(`- \`${s.entry.family}\` › \`${s.entry.node}\`${s.dataset ? ` in ${s.dataset}` : ''}: ${s.reason}`)
    out.push('')
  } else out.push('No stale entries.', '')
  const missing = sorted.flatMap((d) => open.get(d.id)!.filter((b) => !b.entry && b.node.value >= FRONTIER.needsEntry).map((b) => ({ d, b })))
  if (missing.length) {
    out.push(`Open boxes of €${FRONTIER.needsEntry / 1e6} m or more with no ledger entry (${missing.length}):`, '')
    let current = ''
    for (const { d, b } of missing) {
      if (d.id !== current) out.push(`- **${d.id}**`)
      current = d.id
      out.push(`  - €${eurM(b.node.value)} m ${cell(b.path.map((n) => n.name.bg).join(' › '))} \`${b.node.id}\` (${WHY[b.why]})`)
    }
    out.push('')
  } else out.push(`Every open box of €${FRONTIER.needsEntry / 1e6} m or more has a ledger entry.`, '')
  return { markdown: out.join('\n'), summary }
}
