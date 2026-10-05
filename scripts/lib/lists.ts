// Builds lists (public/data/lists/): checks every cell against its column's type,
// computes the totals, splits large lists into shards, and writes the index with
// the tree nodes that link to each list. The format is in src/lib/types.ts (ListFile).

import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { ALL, bucketOf, matchingRows, packShard, refNumber, resolveRef, shardsToLoad, totalsOf, type Filters } from '../../src/lib/listData.ts'
import type { BudgetNode, Dataset, DatasetLinks, ListCell, ListColumn, ListFile, ListIndex, ListMeta, LocalizedText } from '../../src/lib/types.ts'

/** A list as a builder makes it: everything but the computed count, totals and file names. */
export interface ListSpec extends Omit<ListMeta, 'count' | 'totals' | 'file'>, Pick<ListFile, 'titleColumn' | 'rowLink'> {
  columns: ListColumn[]
  key: string
  rows: ListCell[][]
  /** The column to split the rows by when they are too large to fetch at once. */
  shardBy?: string
  /** Split the rows by a hash of `shardBy` (the key column) into this many files, whatever their size. */
  shardHash?: number
  /** A search of at least this many letters loads every shard (see ListShards.search). */
  shardSearch?: number
  /** A filter on one of these columns loads every shard (see ListShards.filters). */
  shardFilters?: string[]
  /** A value of the shard column has to be chosen first, however small the list (see ListShards.choose). */
  shardChoose?: boolean
}

export interface ListGroup {
  id: string
  title: LocalizedText
  description: LocalizedText
}

/** Rows above this size (JSON, about 0.25 MB gzipped) are split into shards when the list names a shard column. */
export const SHARD_ABOVE = 1_500_000

const isText = (v: ListCell) => typeof v === 'string' || (typeof v === 'object' && v !== null && !Array.isArray(v) && 'bg' in v && 'en' in v)
const isNumber = (v: ListCell) => typeof v === 'number' && Number.isFinite(v)
const isBreakdown = (v: ListCell, column: ListColumn) =>
  Array.isArray(v) &&
  v.every(
    (part) =>
      Array.isArray(part) &&
      part.length >= 2 &&
      part.length <= (column.periods ?? []).length + 1 &&
      typeof part[0] === 'string' &&
      Boolean(column.labels?.[part[0]]) &&
      (!column.groups || Boolean(column.groups.labels[column.groups.of[part[0]]])) &&
      part.slice(1).every((x) => typeof x === 'number' && Number.isFinite(x)),
  )

/** The values a row has to have for a link or a filter set to count it, and the values left out by default. */
function rowFilter(columns: ListColumn[], filters: Record<string, string> = {}): (row: ListCell[]) => boolean {
  const tests = columns.flatMap((column, i) => {
    const value = filters[column.id]
    if (value && value !== ALL) return [(row: ListCell[]) => typeof row[i] === 'string' && (column.type === 'date' ? (row[i] as string).slice(0, 4) : row[i]) === value]
    if (!value && column.exclude?.length) return [(row: ListCell[]) => !column.exclude!.includes(row[i] as string)]
    return []
  })
  return (row) => tests.every((test) => test(row))
}

function nodeIds(root: BudgetNode): Set<string> {
  const ids = new Set<string>()
  const walk = (n: BudgetNode) => {
    ids.add(n.id)
    n.children?.forEach(walk)
  }
  walk(root)
  return ids
}

/** Problems with a list: cells that do not fit their column, duplicate keys, unknown node ids, bad references. */
export function checkList(spec: ListSpec, datasets: Dataset[]): string[] {
  const problems: string[] = []
  const where = `list ${spec.id}`
  const ids = new Set(spec.columns.map((c) => c.id))
  if (ids.size !== spec.columns.length) problems.push(`${where}: duplicate column ids`)
  const keyIndex = spec.columns.findIndex((c) => c.id === spec.key)
  if (keyIndex < 0) problems.push(`${where}: no key column ${spec.key}`)
  const keys = new Set<string>()
  spec.rows.forEach((row, r) => {
    const at = `${where}, row ${r + 1}`
    if (row.length !== spec.columns.length) {
      problems.push(`${at}: ${row.length} cells for ${spec.columns.length} columns`)
      return
    }
    const key = row[keyIndex]
    if (typeof key !== 'string' || !key || keys.has(key)) problems.push(`${at}: missing or duplicate key ${String(key)}`)
    else keys.add(key)
    spec.columns.forEach((column, i) => {
      const v = row[i]
      if (v === null) return
      const ok =
        column.type === 'text' ? isText(v)
        : column.type === 'code' || column.type === 'url' ? typeof v === 'string'
        : column.type === 'money' || column.type === 'number' || column.type === 'percent' ? isNumber(v)
        : column.type === 'date' ? typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
        : column.type === 'series' ? Array.isArray(v) && v.length === (column.periods ?? []).length && v.every((x) => x === null || (typeof x === 'number' && Number.isFinite(x)))
        : column.type === 'breakdown' ? isBreakdown(v, column)
        : typeof v === 'string' && Boolean(column.labels?.[v])
      if (!ok) problems.push(`${at}: ${column.id} = ${JSON.stringify(v)} is not a valid ${column.type}${column.labels ? ' with a name' : ''}`)
    })
  })
  for (const column of spec.columns) {
    if ((column.type === 'series' || column.type === 'breakdown') && !column.periods?.length) problems.push(`${where}: ${column.type} ${column.id} has no periods`)
    for (const value of column.exclude ?? []) if (!column.labels?.[value]) problems.push(`${where}: ${column.id} excludes unknown value ${value}`)
    if (column.type === 'url' && !column.href?.includes('{value}')) problems.push(`${where}: url ${column.id} has no {value} template`)
    if (column.type !== 'node') continue
    const target = datasets.find((d) => d.id === column.dataset)
    if (!target || target.family !== column.family) {
      problems.push(`${where}: ${column.id} links to ${column.dataset}, not a ${column.family} dataset`)
      continue
    }
    const known = nodeIds(target.root)
    const missing = Object.keys(column.labels ?? {}).filter((id) => !known.has(id))
    if (missing.length) problems.push(`${where}: ${column.id} has nodes missing from ${target.id}: ${missing.slice(0, 5).join(', ')}`)
  }
  for (const ref of [...spec.summary, spec.sort.replace(/^-/, '')]) {
    if (!resolveRef(spec.columns, ref)) problems.push(`${where}: unknown value ${ref}`)
  }
  for (const link of spec.links ?? []) {
    const index = spec.columns.findIndex((c) => c.id === link.column)
    const column = spec.columns[index]
    if (!column || (link.nodes ? column.type !== 'category' : column.type !== 'node' || column.family !== link.family)) {
      problems.push(`${where}: link column ${link.column} is not a ${link.nodes ? 'category' : `${link.family} node`}`)
      continue
    }
    if (link.value && !resolveRef(spec.columns, link.value)) problems.push(`${where}: unknown link value ${link.value}`)
    for (const id of Object.keys(link.filters ?? {})) if (!spec.columns.some((c) => c.id === id)) problems.push(`${where}: link filter on unknown column ${id}`)
    // Every node a counted row links to exists in each dataset whose tree shows the link.
    const counted = rowFilter(spec.columns, link.filters)
    const linked = new Set(
      link.nodes
        ? spec.rows.filter(counted).flatMap((row) => [link.nodes![row[index] as string] ?? []].flat())
        : Object.keys(column.labels ?? {}),
    )
    for (const dataset of datasets.filter((d) => d.family === link.family && link.years.includes(d.year) && (!link.stages || link.stages.includes(d.stage)))) {
      const known = nodeIds(dataset.root)
      const missing = [...linked].filter((id) => !known.has(id))
      if (missing.length) problems.push(`${where}: nodes missing from ${dataset.id}: ${missing.slice(0, 5).join(', ')}`)
    }
  }
  if (spec.shardBy && !spec.shardHash && !spec.columns.some((c) => c.id === spec.shardBy && c.filter)) problems.push(`${where}: shard column ${spec.shardBy} is not a filter`)
  if (spec.shardHash && spec.shardBy !== spec.key) problems.push(`${where}: a list split by a hash must be split by its key`)
  for (const id of spec.shardFilters ?? []) if (!spec.columns.some((c) => c.id === id && c.filter)) problems.push(`${where}: shard filter ${id} is not a filter column`)
  if (spec.titleColumn && !spec.columns.some((c) => c.id === spec.titleColumn)) problems.push(`${where}: no title column ${spec.titleColumn}`)
  if (spec.rowLink && !spec.columns.some((c) => c.id === spec.rowLink!.column)) problems.push(`${where}: no row link column ${spec.rowLink.column}`)
  for (const column of spec.columns.filter((c) => c.link)) {
    if (column.type !== 'text' && column.type !== 'code') problems.push(`${where}: ${column.id} links to a list but is a ${column.type}`)
    if (column.link!.column && !spec.columns.some((c) => c.id === column.link!.column)) problems.push(`${where}: ${column.id} links by an unknown column ${column.link!.column}`)
  }
  if (spec.back && !spec.hidden) problems.push(`${where}: only a hidden list leads back to another`)
  return problems
}

/** Display names for node ids, taken from the dataset the column links to (the names the tree shows). */
export function nodeLabels(dataset: Dataset, ids: Iterable<string>): Record<string, LocalizedText> {
  const names = new Map<string, LocalizedText>()
  const walk = (n: BudgetNode) => {
    names.set(n.id, n.name)
    n.children?.forEach(walk)
  }
  walk(dataset.root)
  const labels: Record<string, LocalizedText> = {}
  for (const id of ids) {
    const name = names.get(id)
    if (!name) throw new Error(`No node ${id} in ${dataset.id}`)
    labels[id] = name
  }
  return labels
}

const fileName = (value: string) => value.replace(/[^a-z0-9-]+/gi, '_')

/** The list file and, when it is split, its shards (path relative to the lists folder → content). */
export function finishList(spec: ListSpec, shardAbove = SHARD_ABOVE): { file: ListFile; shards: Map<string, ListCell[][]> } {
  const { rows, shardBy, shardHash, shardSearch, shardFilters, shardChoose, ...rest } = spec
  const meta = { ...rest, count: rows.length, totals: totalsOf(spec.columns, rows), file: `lists/${spec.id}.json` }
  const shards = new Map<string, ListCell[][]>()
  if (!shardBy || (!shardHash && JSON.stringify(rows).length <= shardAbove)) return { file: { ...meta, rows }, shards }
  const index = spec.columns.findIndex((c) => c.id === shardBy)
  const groups = new Map<string, ListCell[][]>()
  for (const row of rows) {
    const cell = String(row[index])
    const value = shardHash ? String(bucketOf(cell, shardHash)) : spec.columns[index].type === 'date' ? cell.slice(0, 4) : cell
    const group = groups.get(value)
    if (group) group.push(row)
    else groups.set(value, [row])
  }
  const files = [...groups]
    .sort((a, b) => a[0].localeCompare(b[0], 'en', { numeric: true }))
    .map(([value, part]) => {
      const file = `lists/${spec.id}/${fileName(value)}.json`
      shards.set(file, part)
      return { value, file, count: part.length, totals: totalsOf(spec.columns, part) }
    })
  const split = {
    by: shardBy,
    ...(shardHash ? { hash: shardHash } : {}),
    ...(shardSearch ? { search: shardSearch } : {}),
    ...(shardFilters?.length ? { filters: shardFilters } : {}),
    ...(shardChoose ? { choose: true } : {}),
    files,
  }
  return { file: { ...meta, shards: split }, shards }
}

/**
 * For each tree link of a list: node id → [rows, total of the link's value], over the rows the link's
 * filters keep (and that the list shows by default); with `nodes`, also each node's value of the column.
 */
export function nodeLinks(spec: ListSpec): ListIndex['links'] {
  return (spec.links ?? []).map(({ nodes: map, ...link }) => {
    const nodes: Record<string, [number, number]> = {}
    const values: Record<string, string> = {}
    const index = spec.columns.findIndex((c) => c.id === link.column)
    const ref = link.value ? resolveRef(spec.columns, link.value) : null
    const counted = rowFilter(spec.columns, link.filters)
    for (const row of spec.rows) {
      const value = row[index]
      if (typeof value !== 'string' || !counted(row)) continue
      for (const node of [map ? (map[value] ?? []) : value].flat()) {
        if (map && values[node] !== undefined && values[node] !== value) throw new Error(`list ${spec.id}: node ${node} stands for both ${values[node]} and ${value}`)
        if (map) values[node] = value
        const entry = (nodes[node] ??= [0, 0])
        entry[0] += 1
        entry[1] += ref ? (refNumber(row, ref) ?? 0) : 0
      }
    }
    return { ...link, list: spec.id, nodes, ...(map ? { values } : {}) }
  })
}

/** The links of one dataset's tree nodes to lists (public/data/lists/links/<dataset>.json), or null when it has none. */
export function datasetLinks(index: ListIndex, dataset: Pick<Dataset, 'family' | 'year' | 'stage'>): DatasetLinks | null {
  const links = index.links.filter(
    (l) => l.family === dataset.family && l.years.includes(dataset.year) && (!l.stages || l.stages.includes(dataset.stage)) && Object.keys(l.nodes).length > 0,
  )
  if (!links.length) return null
  const lists = index.lists.filter((l) => links.some((link) => link.list === l.id)).map(({ id, title, unit }) => ({ id, title, unit }))
  return { lists, links }
}

/** A list as written: its file and, when it is split, the rows of each shard file. */
export type WrittenList = ReturnType<typeof finishList>

/** Writes every list and public/data/lists/index.json; returns the index and the lists as written. */
export function writeLists(outDir: URL, groups: ListGroup[], specs: ListSpec[]): { index: ListIndex; written: WrittenList[] } {
  const dir = new URL('lists/', outDir)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  const lists: ListMeta[] = []
  const written: WrittenList[] = []
  for (const spec of specs) {
    const { file, shards } = finishList(spec)
    written.push({ file, shards })
    writeFileSync(new URL(file.file, outDir), JSON.stringify(file))
    for (const [path, rows] of shards) {
      mkdirSync(new URL('.', new URL(path, outDir)), { recursive: true })
      writeFileSync(new URL(path, outDir), JSON.stringify(packShard(spec.columns, rows, file.shards?.hash ? undefined : file.shards?.by)))
    }
    // The index carries what the picker and the page need before the rows load; the tree links are in `links`.
    const { columns: _columns, key: _key, rows: _rows, shards: _shards, titleColumn: _title, rowLink: _rowLink, links: _links, ...meta } = file
    lists.push(meta)
  }
  const index: ListIndex = { groups, lists, links: specs.flatMap(nodeLinks) }
  writeFileSync(new URL('index.json', dir), JSON.stringify(index))
  return { index, written }
}

/**
 * Every link between the trees and the lists leads somewhere, followed the way the site follows it:
 * - a tree node's link opens its list on rows (not on "choose a value first"), as many as the link says;
 * - every node a shown cell links to exists in each dataset of its breakdown that the list can be opened from
 *   (the cell links back to the dataset the viewer came from), and in the column's own dataset;
 * - every link from a row or a cell to another list (a payee's page, a contract's buyer …) finds rows there.
 */
export function checkLinks(written: WrittenList[], index: ListIndex, datasets: Dataset[]): string[] {
  const problems: string[] = []
  const lists = new Map(written.map((w) => [w.file.id, w]))
  const ids = new Map(datasets.map((d) => [d.id, nodeIds(d.root)]))
  // The rows the page shows for these filters, or null while it waits for a value to be chosen or a search.
  const shown = (list: WrittenList, filters: Filters): number | null => {
    const { file, shards } = list
    let rows = file.rows
    if (!rows) {
      const files = shardsToLoad(file.shards!, file.count, filters)
      if (!files.length) return null
      rows = files.flatMap((f) => shards.get(f.file) ?? [])
    }
    return matchingRows(file.columns, rows, [], [], filters).length
  }
  const allRows = (list: WrittenList) => list.file.rows ?? [...list.shards.values()].flat()
  const sample = (values: string[]) => `${values.slice(0, 5).join(', ')}${values.length > 5 ? ` … (${values.length})` : ''}`

  // Tree node → list.
  const origins = new Set<string>()
  for (const link of index.links) {
    const where = `link from ${link.family} ${link.years.join('/')} to ${link.list}`
    const list = lists.get(link.list)
    if (!list) {
      problems.push(`${where}: no such list`)
      continue
    }
    const from = datasets.filter((d) => d.family === link.family && link.years.includes(d.year) && (!link.stages || link.stages.includes(d.stage)))
    from.forEach((d) => origins.add(d.id))
    const wrong: string[] = []
    for (const [node, [count]] of Object.entries(link.nodes)) {
      if (!from.some((d) => ids.get(d.id)!.has(node))) wrong.push(`${node} (not in the tree)`)
      const n = shown(list, { ...link.filters, [link.column]: link.values?.[node] ?? node })
      if (n !== count) wrong.push(`${node} (${count} rows linked, ${n === null ? 'the list waits for a choice' : `${n} shown`})`)
    }
    if (wrong.length) problems.push(`${where}: ${sample(wrong)}`)
  }

  for (const list of written) {
    const { file } = list
    const where = `list ${file.id}`
    // List row → tree node: in the column's dataset and in every dataset of its breakdown the viewer can come from.
    for (const column of file.columns.filter((c) => c.type === 'node' && !c.hidden)) {
      for (const dataset of datasets.filter((d) => d.family === column.family && (d.id === column.dataset || origins.has(d.id)))) {
        const missing = Object.keys(column.labels ?? {}).filter((id) => !ids.get(dataset.id)!.has(id))
        if (missing.length) problems.push(`${where}: ${column.id} links to nodes missing from ${dataset.id}: ${sample(missing)}`)
      }
    }
    if (file.back && !lists.has(file.back)) problems.push(`${where}: leads back to unknown list ${file.back}`)
    // List → list: a row's title (rowLink) and text or code cells (link), each to another list filtered on a value.
    const targets = [
      ...(file.rowLink ? [{ from: 'rows', ...file.rowLink }] : []),
      ...file.columns.filter((c) => c.link).map((c) => ({ from: c.id, ...c.link!, column: c.link!.column ?? c.id })),
    ]
    for (const target of targets) {
      const at = `${where}, ${target.from} → ${target.list}`
      const other = lists.get(target.list)
      const index = file.columns.findIndex((c) => c.id === target.column)
      if (!other || index < 0 || !other.file.columns.some((c) => c.id === target.filter)) {
        problems.push(`${at}: no list ${target.list} with a column ${target.filter}, or no column ${target.column} here`)
        continue
      }
      const values = new Set(allRows(list).flatMap((row) => (typeof row[index] === 'string' && row[index] ? [row[index] as string] : [])))
      // A list that asks for a value of its shard column first (contracts by year) keeps the filter until one is chosen.
      const filterAt = other.file.columns.findIndex((c) => c.id === target.filter)
      const there = new Set(allRows(other).map((row) => row[filterAt]))
      const wrong = [...values].filter((value) => {
        const n = shown(other, { [target.filter]: value })
        return n === null ? !there.has(value) : n === 0
      })
      if (wrong.length) problems.push(`${at}: ${target.filter} values that open no rows: ${sample(wrong)}`)
    }
  }
  return problems
}
