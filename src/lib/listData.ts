// Lists of items that do not add up to the budget (projects, payments, contracts …):
// reading values, totals, search, filters, sorting and the URL state. Shared by the
// data build (scripts/lib/lists.ts) and the Lists page, so it has no runtime imports.

import type { DatasetFamily, DatasetLinks, DatasetStage, Lang, ListCell, ListColumn, ListFile, ListMeta, ListShardFile, ListShards, LocalizedText } from './types.ts'

// ---------- values ----------

/** A value a summary, sort or link refers to: a column, or one period of a series ("capex.2026"). */
export interface ValueRef {
  column: ListColumn
  /** Position of the column in a row. */
  index: number
  /** Position of the period in a series, or null. */
  period: number | null
}

export function resolveRef(columns: ListColumn[], ref: string): ValueRef | null {
  const dot = ref.indexOf('.')
  const id = dot < 0 ? ref : ref.slice(0, dot)
  const index = columns.findIndex((c) => c.id === id)
  if (index < 0) return null
  const column = columns[index]
  if (column.type === 'series') {
    const period = dot < 0 ? 0 : (column.periods ?? []).indexOf(ref.slice(dot + 1))
    return period < 0 ? null : { column, index, period }
  }
  return dot < 0 ? { column, index, period: null } : null
}

/** The number a value reference reads from a row, or null when there is none. */
export function refNumber(row: ListCell[], ref: ValueRef): number | null {
  const cell = row[ref.index]
  if (ref.period !== null) {
    const v = Array.isArray(cell) ? cell[ref.period] : null
    return typeof v === 'number' ? v : null
  }
  return typeof cell === 'number' ? cell : null
}

const SUMMED = new Set(['money', 'number', 'series'])

/** Totals of the columns marked `total` (an array per period for series). */
export function totalsOf(columns: ListColumn[], rows: ListCell[][]): Record<string, number | number[]> {
  const totals: Record<string, number | number[]> = {}
  columns.forEach((column, i) => {
    if (!column.total || !SUMMED.has(column.type)) return
    if (column.type === 'series') {
      const sums = (column.periods ?? []).map(() => 0)
      for (const row of rows) {
        const cell = row[i]
        if (Array.isArray(cell)) cell.forEach((v, p) => (sums[p] += typeof v === 'number' ? v : 0))
      }
      totals[column.id] = sums
    } else {
      totals[column.id] = rows.reduce((s, row) => s + (typeof row[i] === 'number' ? (row[i] as number) : 0), 0)
    }
  })
  return totals
}

/** A total read the way a value reference reads a row. */
export function refTotal(totals: Record<string, number | number[]>, ref: ValueRef): number | null {
  const total = totals[ref.column.id]
  if (total === undefined) return null
  return Array.isArray(total) ? (total[ref.period ?? 0] ?? null) : total
}

/** How a period of a series or breakdown is shown: its label (a month's name …), or the period itself. */
export const periodLabel = (column: ListColumn, period: string, lang: Lang): string => column.periodLabels?.[period]?.[lang] ?? period

/** The display name of a value of a node, category or breakdown column, if it has one. */
export function labelOf(column: ListColumn, value: string, lang: Lang): string | undefined {
  const label = column.labels?.[value]
  return label === undefined ? undefined : typeof label === 'string' ? label : label[lang]
}

/** The display text of a cell that holds a name: text, code, node or category values. */
export function cellText(column: ListColumn, cell: ListCell, lang: Lang): string {
  if (cell === null || cell === undefined) return ''
  if ((column.type === 'node' || column.type === 'category') && typeof cell === 'string') return labelOf(column, cell, lang) ?? cell
  if (typeof cell === 'string') return cell
  if (typeof cell === 'object' && !Array.isArray(cell)) return (cell as LocalizedText)[lang]
  return ''
}

export interface BreakdownPart {
  id: string
  label: string
  /** Euro per period. */
  values: number[]
  total: number
}

export interface BreakdownGroup {
  id: string | null
  label: string
  parts: BreakdownPart[]
  values: number[]
  total: number
}

/**
 * A breakdown cell as named parts in groups (one group without a name when the column has no groups), largest first:
 * by their total, or by their value in one period (`period`, its index).
 */
export function breakdownGroups(column: ListColumn, cell: ListCell, lang: Lang, period: number | null = null): BreakdownGroup[] {
  if (!Array.isArray(cell)) return []
  const periods = column.periods?.length ?? 0
  const groups = new Map<string | null, BreakdownGroup>()
  for (const entry of cell) {
    if (!Array.isArray(entry)) continue
    const [id, ...amounts] = entry as [string, ...number[]]
    const values = Array.from({ length: periods }, (_, i) => Number(amounts[i]) || 0)
    const part = { id, label: labelOf(column, id, lang) ?? id, values, total: values.reduce((a, b) => a + b, 0) }
    const groupId = column.groups?.of[id] ?? null
    let group = groups.get(groupId)
    if (!group) {
      group = { id: groupId, label: groupId === null ? '' : (column.groups?.labels[groupId]?.[lang] ?? groupId), parts: [], values: values.map(() => 0), total: 0 }
      groups.set(groupId, group)
    }
    group.parts.push(part)
    values.forEach((v, i) => (group.values[i] += v))
    group.total += part.total
  }
  const list = [...groups.values()]
  const size = (x: { total: number; values: number[] }) => (period === null ? x.total : (x.values[period] ?? 0))
  for (const g of list) g.parts.sort((a, b) => size(b) - size(a) || b.total - a.total)
  return list.sort((a, b) => size(b) - size(a) || b.total - a.total)
}

// ---------- search and filters ----------

/** Lower case, without accents and quotes, so "„Пирин“" finds "Пирин". */
export const normalizeText = (s: string) =>
  s
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[„“”"«»'’]/g, ' ')

export function queryWords(query: string): string[] {
  return normalizeText(query).split(/\s+/).filter(Boolean)
}

/** The text each row is searched in: searchable columns, and the names of its node and category values in both languages. */
export function searchTexts(columns: ListColumn[], rows: ListCell[][]): string[] {
  const parts = columns.flatMap((column, i) => {
    if (column.type === 'node' || column.type === 'category') {
      return [(row: ListCell[]) => {
        const value = row[i]
        const label = typeof value === 'string' ? column.labels?.[value] : undefined
        return !label ? '' : typeof label === 'string' ? label : `${label.bg} ${label.en}`
      }]
    }
    if (!column.search) return []
    return [(row: ListCell[]) => {
      const value = row[i]
      if (typeof value === 'string') return value
      if (value && typeof value === 'object' && !Array.isArray(value)) return `${value.bg} ${value.en}`
      return ''
    }]
  })
  return rows.map((row) => normalizeText(parts.map((part) => part(row)).join(' ')))
}

/** Filters: column id → value ("institution:mod,year:2026" in the URL). Date columns filter by year. */
export type Filters = Record<string, string>

export function parseFilters(param: string | undefined): Filters {
  const filters: Filters = {}
  for (const part of (param ?? '').split(',')) {
    const colon = part.indexOf(':')
    if (colon > 0 && colon < part.length - 1) filters[part.slice(0, colon)] = part.slice(colon + 1)
  }
  return filters
}

export function formatFilters(filters: Filters): string {
  return Object.entries(filters)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}:${v}`)
    .join(',')
}

/** The value a filter compares: the id of a node or category, the year of a date. */
function filterValue(column: ListColumn, cell: ListCell): string | null {
  if (typeof cell !== 'string') return null
  return column.type === 'date' ? cell.slice(0, 4) : cell
}

export const filterColumns = (columns: ListColumn[]) =>
  columns.filter((c) => c.filter && (c.type === 'node' || c.type === 'category' || c.type === 'date'))

/** The filter value that shows every row, also those a column leaves out by default (ListColumn.exclude). */
export const ALL = '*'

/** Indices of the rows that contain every query word and pass every filter (except the one in `skip`). */
export function matchingRows(columns: ListColumn[], rows: ListCell[][], texts: string[], words: string[], filters: Filters, skip?: string): number[] {
  const active = Object.entries(filters).flatMap(([id, value]) => {
    const index = columns.findIndex((c) => c.id === id)
    return index >= 0 && id !== skip && value && value !== ALL ? [{ column: columns[index], index, value }] : []
  })
  // Columns that leave values out while their filter is not set.
  const excluded = columns.flatMap((column, index) =>
    column.exclude?.length && column.id !== skip && !filters[column.id] ? [{ index, values: new Set(column.exclude) }] : [],
  )
  const out: number[] = []
  rows.forEach((row, r) => {
    if (!active.every((f) => filterValue(f.column, row[f.index]) === f.value)) return
    if (excluded.some((e) => e.values.has(row[e.index] as string))) return
    if (!words.every((w) => texts[r].includes(w))) return
    out.push(r)
  })
  return out
}

/** How many more rows would match if the columns that leave values out by default showed them. */
export function hiddenByDefault(columns: ListColumn[], rows: ListCell[][], texts: string[], words: string[], filters: Filters): number {
  const open = Object.fromEntries(columns.filter((c) => c.exclude?.length && !filters[c.id]).map((c) => [c.id, ALL]))
  if (!Object.keys(open).length) return 0
  return matchingRows(columns, rows, texts, words, { ...filters, ...open }).length - matchingRows(columns, rows, texts, words, filters).length
}

/** The values a filter can take given the other filters and the search, with how many rows each has. */
export function facetOptions(columns: ListColumn[], rows: ListCell[][], texts: string[], words: string[], filters: Filters, id: string, lang: Lang) {
  const index = columns.findIndex((c) => c.id === id)
  const column = columns[index]
  const counts = new Map<string, number>()
  for (const r of matchingRows(columns, rows, texts, words, filters, id)) {
    const value = filterValue(column, rows[r][index])
    if (value !== null) counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  const label = (v: string) => labelOf(column, v, lang) ?? v
  const collator = new Intl.Collator(lang === 'bg' ? 'bg' : 'en')
  return [...counts]
    .map(([value, count]) => ({ value, count, label: label(value) }))
    .sort((a, b) => (column.type === 'date' ? b.value.localeCompare(a.value) : collator.compare(a.label, b.label)))
}

// ---------- sorting ----------

/** Sorts row indices by a value reference ("-" first for descending); empty values always go last. */
export function sortRows(columns: ListColumn[], rows: ListCell[][], indices: number[], sort: string, lang: Lang): number[] {
  const desc = sort.startsWith('-')
  const ref = resolveRef(columns, desc ? sort.slice(1) : sort)
  if (!ref) return indices
  const sign = desc ? -1 : 1
  const numeric = ref.period !== null || ['money', 'number', 'percent'].includes(ref.column.type)
  const collator = new Intl.Collator(lang === 'bg' ? 'bg' : 'en', { numeric: true })
  const key = (r: number): number | string | null =>
    numeric ? refNumber(rows[r], ref) : cellText(ref.column, rows[r][ref.index], lang) || null
  return [...indices].sort((a, b) => {
    const ka = key(a)
    const kb = key(b)
    if (ka === null || kb === null) return ka === kb ? a - b : ka === null ? 1 : -1
    const order = typeof ka === 'number' && typeof kb === 'number' ? ka - kb : collator.compare(String(ka), String(kb))
    return order * sign || a - b
  })
}

// ---------- shards ----------

/** Lists above this many rows are not loaded whole: a value of the shard column has to be chosen first. */
export const LOAD_ALL_LIMIT = 50_000

/** The bucket of a value among `n` (FNV-1a over UTF-16 code units), for lists split by a hash (ListShards.hash). */
export function bucketOf(value: string, n: number): number {
  let h = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0) % n
}

/** The shard value of a filter value: itself, or its bucket when the list is split by a hash. */
export const shardValue = (shards: ListShards, value: string) => (shards.hash ? String(bucketOf(value, shards.hash)) : value)

/**
 * The shard files the current filters and search need: the matching one; all of them for a small list,
 * for a filter on a column that allows it (ListShards.filters) or for a search long enough when the list
 * allows it; or none until a value is chosen or typed.
 */
export function shardsToLoad(shards: ListShards, count: number, filters: Filters, query = ''): ListShards['files'] {
  const value = filters[shards.by]
  if (value && value !== ALL) return shards.files.filter((f) => f.value === shardValue(shards, value))
  if (count <= LOAD_ALL_LIMIT && !shards.choose) return shards.files
  if (shards.filters?.some((id) => filters[id] && filters[id] !== ALL)) return shards.files
  return shards.search && normalizeText(query).replace(/\s+/g, '').length >= shards.search ? shards.files : []
}

/** Columns whose repeated values a shard stores once: texts, and the ids of nodes and categories. */
const PACKED = new Set(['text', 'node', 'category'])

/** A row without its trailing empty cells (a shard stores rows that way; unpackShard puts them back). */
const trimmed = (row: ListCell[]) => {
  let end = row.length
  while (end > 0 && row[end - 1] === null) end--
  return end === row.length ? row : row.slice(0, end)
}

/**
 * A shard as written: every value that appears more than once in its text, node and category columns (a scheme's
 * name shared by thousands of projects, a municipality that runs hundreds of them, the "natural person" that
 * stands in for a name) is stored once, and the cells hold its index; empty cells at the end of a row are left out.
 */
export function packShard(columns: ListColumn[], rows: ListCell[][], by?: string): ListShardFile {
  // The shard column's value, when every row has the same one (a shard by value, not by a hash or a date's year),
  // is stored once instead of in every row.
  const at = by ? columns.findIndex((c) => c.id === by && c.type !== 'date') : -1
  const shared = at >= 0 && rows.length > 0 && typeof rows[0][at] === 'string' && rows.every((r) => r[at] === rows[0][at]) ? (rows[0][at] as string) : null
  if (shared !== null) {
    const packed = packShard(columns.filter((_, i) => i !== at), rows.map((r) => r.filter((_, i) => i !== at)))
    return { ...packed, value: shared }
  }
  const text = columns.flatMap((c, i) => (PACKED.has(c.type) ? [i] : []))
  const keyOf = (cell: ListCell) => (typeof cell === 'string' ? cell : cell && typeof cell === 'object' && !Array.isArray(cell) ? JSON.stringify(cell) : null)
  const seen = new Map<string, { value: string | LocalizedText; n: number }>()
  for (const row of rows) {
    for (const i of text) {
      const key = keyOf(row[i])
      if (key === null) continue
      const entry = seen.get(key)
      if (entry) entry.n++
      else seen.set(key, { value: row[i] as string | LocalizedText, n: 1 })
    }
  }
  const repeated = [...seen].filter(([, e]) => e.n > 1)
  if (!repeated.length) return { rows: rows.map(trimmed) }
  const index = new Map(repeated.map(([key], i) => [key, i]))
  const packed = rows.map((row) =>
    trimmed(
      row.map((cell, i) => {
        const key = text.includes(i) ? keyOf(cell) : null
        return key !== null && index.has(key) ? index.get(key)! : cell
      }),
    ),
  )
  return { rows: packed, texts: repeated.map(([, e]) => e.value) }
}

/** The rows of a shard file with its shared texts and its shard column's value put back (see packShard). */
export function unpackShard(columns: ListColumn[], shard: ListShardFile, by?: string): ListCell[][] {
  const at = shard.value !== undefined && by ? columns.findIndex((c) => c.id === by) : -1
  const stored = at >= 0 ? columns.filter((_, i) => i !== at) : columns
  const texts = shard.texts ?? []
  const text = stored.flatMap((c, i) => (PACKED.has(c.type) ? [i] : []))
  return shard.rows.map((row) => {
    const out = [...row]
    while (out.length < stored.length) out.push(null)
    for (const i of text) if (typeof out[i] === 'number') out[i] = texts[out[i] as number]
    if (at >= 0) out.splice(at, 0, shard.value!)
    return out
  })
}

// ---------- counts and links ----------

/** "1 проект" / "34 проекта". */
export function countText(meta: Pick<ListMeta, 'unit'>, n: number, lang: Lang): string {
  const unit = n === 1 ? meta.unit.one : meta.unit.other
  return `${new Intl.NumberFormat(lang === 'bg' ? 'bg-BG' : 'en-GB').format(n)} ${unit[lang]}`
}

export interface NodeListLink {
  list: DatasetLinks['lists'][number]
  /** The node column filtered on. */
  column: string
  /** The filters the link opens the list with. */
  filters: Filters
  count: number
  /** Total of the link's value, or null for a count only. */
  total: number | null
  label: LocalizedText
  text?: LocalizedText
}

/** The lists a tree node links to in a dataset of this family, year and stage. */
export function linksFor(index: DatasetLinks, dataset: { family: DatasetFamily; year: number; stage: DatasetStage }, nodeId: string): NodeListLink[] {
  return index.links.flatMap((link) => {
    if (link.family !== dataset.family || !link.years.includes(dataset.year)) return []
    if (link.stages && !link.stages.includes(dataset.stage)) return []
    const hit = link.nodes[nodeId]
    const list = index.lists.find((l) => l.id === link.list)
    if (!hit || !list) return []
    const filters = { ...link.filters, [link.column]: link.values?.[nodeId] ?? nodeId }
    return [{ list, column: link.column, filters, count: hit[0], total: link.value ? hit[1] : null, label: link.label, text: link.text }]
  })
}

/** "Кой получава парите: 1,2 млрд. € през 2025 г." from a link's own wording, or "34 проекта, 842 млн. € за 2026 г.". */
export function linkText(link: NodeListLink, lang: Lang, money: (value: number) => string): string {
  if (link.text) return link.text[lang].replace('{count}', countText(link.list, link.count, lang)).replace('{total}', link.total === null ? '' : money(link.total))
  return `${countText(link.list, link.count, lang)}${link.total ? `, ${money(link.total)} ${link.label[lang]}` : ''}`
}

// ---------- URL state ----------

/** What the URL says about the list shown: #/lists?l=<list>&q=<search>&f=<col>:<value>,…&s=<sort>&d=<dataset>. */
export interface ListState {
  list: string
  query: string
  filters: Filters
  /** Sort, or '' for the list's default. */
  sort: string
  /** The dataset the viewer came from: node links go back to it. */
  dataset: string
}

export function stateFromParams(params: Record<string, string>, lists: ListMeta[]): ListState {
  const list = lists.find((l) => l.id === params.l) ?? lists[0]
  return { list: list?.id ?? '', query: params.q ?? '', filters: parseFilters(params.f), sort: params.s ?? '', dataset: params.d ?? '' }
}

export function paramsFromState(state: ListState): Record<string, string> {
  return { l: state.list, q: state.query, f: formatFilters(state.filters), s: state.sort, d: state.dataset }
}

/** Where each column's values come from, for the notes under a list: source → the columns from it. */
export function columnSources(list: ListFile, lang: Lang): { label: string; source: string }[] {
  const seen = new Map<string, string[]>()
  for (const c of list.columns) {
    if (!c.source || c.hidden) continue
    seen.set(c.source[lang], [...(seen.get(c.source[lang]) ?? []), c.label[lang]])
  }
  return [...seen].map(([source, labels]) => ({ source, label: labels.join(', ') }))
}
