import { Fragment, useId, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { formatMoney, formatNumber, formatPercent } from '../lib/format'
import {
  ALL,
  breakdownGroups,
  cellText,
  countText,
  facetOptions,
  filterColumns,
  hiddenByDefault,
  labelOf,
  matchingRows,
  periodLabel,
  queryWords,
  refTotal,
  resolveRef,
  searchTexts,
  sortRows,
  totalsOf,
  type ListState,
  type ValueRef,
} from '../lib/listData'
import { useLang } from '../lib/i18n'
import { navigate } from '../lib/route'
import type { Lang, ListCell, ListColumn, ListFile } from '../lib/types'

/** Rows shown at first, and added by "Show more". */
const PAGE = 100
const NO_ROWS: ListCell[][] = []

const TEXT = {
  bg: {
    search: 'Търси по име, номер, място…',
    searchLabel: 'Търсене в списъка',
    all: 'Всички',
    allBut: 'Всички без „{name}“',
    allWith: 'Всички, и „{name}“',
    sort: 'Подреди',
    largest: 'най-големите първо',
    smallest: 'най-малките първо',
    az: 'по азбучен ред',
    clear: 'Изчисти',
    of: 'от',
    total: 'Общо',
    shown: 'Показани {n} от {total}.',
    more: 'Покажи още {n}',
    none: 'Няма редове, които да отговарят на търсенето и филтрите.',
    choose: 'Списъкът е голям: изберете „{column}“, за да видите редовете.',
    chooseOrType: 'Списъкът е голям: изберете „{column}“ или напишете поне {n} букви, за да търсите сред {count}.',
    type: 'Напишете поне {n} букви, за да търсите сред {count}.',
    hidden: '{rows} в „{name}“ не са показани.',
    showHidden: 'Покажи и тях',
    details: 'Подробности за „{name}“',
    more_details: 'Подробности',
    remove: 'Махни филтъра „{name}“',
    sortBreakdown: 'Подреди по „{name}“, най-големите първо',
    empty: '—',
    loading: 'Зареждане…',
  },
  en: {
    search: 'Search by name, code, place…',
    searchLabel: 'Search the list',
    all: 'All',
    allBut: 'All but “{name}”',
    allWith: 'All, with “{name}”',
    sort: 'Sort',
    largest: 'largest first',
    smallest: 'smallest first',
    az: 'A to Z',
    clear: 'Clear',
    of: 'of',
    total: 'Total',
    shown: 'Showing {n} of {total}.',
    more: 'Show {n} more',
    none: 'No rows match the search and filters.',
    choose: 'This list is large: choose a “{column}” to see its rows.',
    chooseOrType: 'This list is large: choose a “{column}”, or type at least {n} letters to search {count}.',
    type: 'Type at least {n} letters to search {count}.',
    hidden: '{rows} in “{name}” are not shown.',
    showHidden: 'Show them too',
    details: 'Details of “{name}”',
    more_details: 'Details',
    remove: 'Remove the filter “{name}”',
    sortBreakdown: 'Sort by “{name}”, largest first',
    empty: '—',
    loading: 'Loading…',
  },
} satisfies Record<Lang, Record<string, string>>

const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''))

const Chevron = ({ open }: { open: boolean }) => (
  <svg className={open ? 'chevron open' : 'chevron'} viewBox="0 0 16 16" aria-hidden="true">
    <path d="M6 3.5L10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/** Narrow screens get cards instead of a table. */
function useNarrow(): boolean {
  const query = '(max-width: 720px)'
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
  )
}

const NUMERIC = new Set(['money', 'number', 'percent', 'series'])

/** The label of a value reference: the column, and for a series the period. */
function refLabel(ref: ValueRef, lang: Lang): string {
  const period = ref.period !== null ? ref.column.periods?.[ref.period] : null
  return period ? `${ref.column.label[lang].replace(/\s*\(.*\)$/, '')} ${periodLabel(ref.column, period, lang)}` : ref.column.label[lang]
}

/** A series value: euro, or a count for series of counts (beds, staff …). */
const seriesValue = (column: ListColumn, v: number, lang: Lang) => (column.unit === 'count' ? formatNumber(v, lang) : formatMoney(v, lang))

/**
 * Series shown only in a row's details that share their periods: one row per series and one column per
 * period, or, transposed (`transpose`, e.g. months), one row per period and one column per series.
 */
function SeriesTable({ columns, cells, lang }: { columns: ListColumn[]; cells: ListCell[]; lang: Lang }) {
  const periods = columns[0].periods ?? []
  const at = (i: number, j: number) => {
    const v = (cells[i] as (number | null)[] | null)?.[j]
    return typeof v === 'number' ? seriesValue(columns[i], v, lang) : '—'
  }
  const flip = Boolean(columns[0].transpose)
  const heads = flip ? columns.map((c) => c.label[lang]) : periods.map((p) => periodLabel(columns[0], p, lang))
  const rows = flip
    ? periods.map((p, j) => ({ key: p, label: periodLabel(columns[0], p, lang), values: columns.map((_, i) => at(i, j)) }))
    : columns.map((c, i) => ({ key: c.id, label: c.label[lang], values: periods.map((_, j) => at(i, j)) }))
  return (
    <div className="table-scroll breakdown-scroll">
      <table className="breakdown">
        <thead>
          <tr>
            <td />
            {heads.map((h, k) => (
              <th key={k} scope="col" className="num">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <th scope="row">{r.label}</th>
              {r.values.map((v, k) => (
                <td key={k} className="num">
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** The parts of a breakdown cell (e.g. who paid a payee), grouped, by period, with totals; largest first, in all or in one period. */
function Breakdown({ column, cell, lang }: { column: ListColumn; cell: ListCell; lang: Lang }) {
  // Periods that are not parts of one amount (budget, paid) get no total across them, and sort by the first.
  const across = column.total !== false
  const [period, setPeriod] = useState<number | null>(across ? null : 0)
  const groups = breakdownGroups(column, cell, lang, period)
  const periods = column.periods ?? []
  const sortable = periods.length > 1 && groups.reduce((n, g) => n + g.parts.length, 0) > 2
  const head = (label: string, index: number | null) => {
    if (!sortable) return label
    const active = period === index
    return (
      <button type="button" className="sort-btn" aria-pressed={active} title={fill(TEXT[lang].sortBreakdown, { name: label })} onClick={() => setPeriod(index)}>
        {label}
        <span className="sort-mark" aria-hidden="true">
          {active ? '↓' : ''}
        </span>
      </button>
    )
  }
  const grand = periods.map((_, i) => groups.reduce((s, g) => s + g.values[i], 0))
  const money = (v: number) => (v ? formatMoney(v, lang) : '—')
  const named = groups.some((g) => g.id !== null)
  return (
    <div className="table-scroll breakdown-scroll">
      <table className="breakdown">
        <thead>
          <tr>
            <th scope="col">{column.label[lang]}</th>
            {periods.map((p, i) => (
              <th key={p} scope="col" className="num" aria-sort={sortable && period === i ? 'descending' : undefined}>
                {head(periodLabel(column, p, lang), i)}
              </th>
            ))}
            {across && (
              <th scope="col" className="num" aria-sort={sortable && period === null ? 'descending' : undefined}>
                {head(TEXT[lang].total, null)}
              </th>
            )}
          </tr>
        </thead>
        {groups.map((g) => (
          <tbody key={g.id ?? ''}>
            {named && (
              <tr className="breakdown-group">
                <th scope="rowgroup">{g.label}</th>
                {g.values.map((v, i) => (
                  <td key={periods[i]} className="num">
                    {money(v)}
                  </td>
                ))}
                {across && <td className="num">{money(g.total)}</td>}
              </tr>
            )}
            {(named && g.parts.length === 1 && g.parts[0].label === g.label ? [] : g.parts).map((part) => (
              <tr key={part.id}>
                <th scope="row" className={named ? 'breakdown-part' : undefined}>
                  {part.label}
                </th>
                {part.values.map((v, i) => (
                  <td key={periods[i]} className="num">
                    {money(v)}
                  </td>
                ))}
                {across && <td className="num">{money(part.total)}</td>}
              </tr>
            ))}
          </tbody>
        ))}
        {groups.length > 1 || (groups[0]?.parts.length ?? 0) > 1 ? (
          <tfoot>
            <tr>
              <th scope="row">{TEXT[lang].total}</th>
              {grand.map((v, i) => (
                <td key={periods[i]} className="num">
                  {money(v)}
                </td>
              ))}
              {across && <td className="num">{money(grand.reduce((a, b) => a + b, 0))}</td>}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  )
}

interface Props {
  list: ListFile
  /** null while a large list waits for a shard value or a search. */
  rows: ListCell[][] | null
  /** More rows are loading (the rows shown are the earlier ones). */
  busy?: boolean
  state: ListState
  onChange: (next: Partial<ListState>, replace?: boolean) => void
  /** The dataset a node column links to (the one the viewer came from, when of the same family). */
  datasetFor: (column: ListColumn) => string
}

export function ListView({ list, rows, busy = false, state, onChange, datasetFor }: Props) {
  const lang = useLang()
  const text = TEXT[lang]
  const narrow = useNarrow()
  const id = useId()
  const all = rows ?? NO_ROWS
  const texts = useMemo(() => searchTexts(list.columns, all), [list, all])
  const words = useMemo(() => queryWords(state.query), [state.query])
  // The URL is parsed anew on every render; compare the filters by content.
  const filterKey = JSON.stringify(state.filters)
  const matched = useMemo(() => matchingRows(list.columns, all, texts, words, JSON.parse(filterKey)), [list, all, texts, words, filterKey])
  const hidden = useMemo(() => hiddenByDefault(list.columns, all, texts, words, JSON.parse(filterKey)), [list, all, texts, words, filterKey])
  const sort = state.sort || list.sort
  const ordered = useMemo(() => sortRows(list.columns, all, matched, sort, lang), [list, all, matched, sort, lang])
  const totals = useMemo(() => totalsOf(list.columns, matched.map((r) => all[r])), [list, all, matched])
  const keyIndex = list.columns.findIndex((c) => c.id === list.key)

  // How many rows are shown; back to one page whenever the selection changes.
  const signature = `${list.id}|${state.query}|${JSON.stringify(state.filters)}|${sort}`
  const [paging, setPaging] = useState({ signature, shown: PAGE })
  const shown = paging.signature === signature ? paging.shown : PAGE
  // Rows whose details are toggled; a single row (e.g. one payee's page) starts open.
  const [toggled, setToggled] = useState<Set<string>>(() => new Set())
  const toggle = (key: string) =>
    setToggled((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  // A column filtered to one value shows it in every row: it is left out (the filter says it).
  const fixed = (c: ListColumn) => (c.type === 'category' || c.type === 'node') && Boolean(state.filters[c.id]) && state.filters[c.id] !== ALL
  const visible = list.columns.filter((c) => !c.hidden && !c.detail && (c.id === list.titleColumn || !fixed(c)))
  const titleColumn = (list.titleColumn ? list.columns.find((c) => c.id === list.titleColumn) : undefined) ?? visible.find((c) => c.type === 'text')
  const codeColumn = visible.find((c) => c.type === 'code')
  const cellColumns = visible.filter((c) => c !== titleColumn && c !== codeColumn)
  const detailColumns = list.columns.filter((c) => c.detail && !c.hidden)
  const index = (c: ListColumn) => list.columns.indexOf(c)
  const hasDetails = (row: ListCell[]) => detailColumns.some((c) => row[index(c)] !== null && row[index(c)] !== '')
  // A page of one row, reached by its key (a payee's page): no search, filters or totals, details open. A list in the
  // picker filtered to one row (the payee carried over from its page) keeps its toolbar, so the filter can be removed.
  const pageView = Boolean(state.filters[list.key]) && Boolean(list.hidden)
  const single = matched.length === 1 && hasDetails(all[matched[0]])
  const isOpen = (key: string) => toggled.has(key) !== single

  // ---------- values ----------

  const nodeHref = (column: ListColumn, value: string) => `#/explore?d=${encodeURIComponent(datasetFor(column))}&n=${encodeURIComponent(value)}`
  const value = (column: ListColumn, cell: ListCell): ReactNode => {
    if (cell === null || cell === undefined || cell === '') return <span className="muted">{text.empty}</span>
    switch (column.type) {
      case 'money':
        return formatMoney(cell as number, lang)
      case 'number':
        return formatNumber(cell as number, lang)
      case 'percent':
        return formatPercent(cell as number, lang)
      case 'date':
        return new Date(`${cell as string}T00:00:00`).toLocaleDateString(lang === 'bg' ? 'bg-BG' : 'en-GB')
      case 'series':
        return (cell as (number | null)[])
          .map((v, p) => `${periodLabel(column, column.periods?.[p] ?? '', lang)}: ${v === null ? text.empty : seriesValue(column, v, lang)}`)
          .join(' · ')
      case 'breakdown':
        return <Breakdown column={column} cell={cell} lang={lang} />
      case 'node':
        return (
          <a
            href={nodeHref(column, cell as string)}
            onClick={(e) => {
              e.preventDefault()
              navigate({ page: 'explore', params: { d: datasetFor(column), n: cell as string } })
            }}
          >
            {cellText(column, cell, lang)}
          </a>
        )
      case 'url':
        return (
          <a href={column.href!.replace('{value}', encodeURIComponent(cell as string))} target="_blank" rel="noreferrer">
            {cell as string} ↗
          </a>
        )
      default:
        return cellText(column, cell, lang)
    }
  }
  // Text and code cells that lead to another list filtered on a value of their row (a contract's buyer → its page).
  const cellNode = (column: ListColumn, row: ListCell[]): ReactNode => {
    const cell = row[index(column)]
    const target = column.link ? row[column.link.column ? list.columns.findIndex((c) => c.id === column.link!.column) : index(column)] : null
    if (!column.link || typeof target !== 'string' || !target || cell === null || cell === '') return value(column, cell)
    const params = { l: column.link.list, f: `${column.link.filter}:${target}`, d: state.dataset }
    return (
      <a
        href={`#/lists?${new URLSearchParams(Object.entries(params).filter(([, v]) => v))}`}
        onClick={(e) => {
          e.preventDefault()
          navigate({ page: 'lists', params })
        }}
      >
        {cellText(column, cell, lang)}
      </a>
    )
  }

  // ---------- sorting ----------

  const sortDesc = sort.startsWith('-')
  const sortRef = sort.replace(/^-/, '')
  const sortBy = (ref: string, column: ListColumn) => {
    const numeric = NUMERIC.has(column.type)
    const next = sortRef === ref ? (sortDesc ? ref : `-${ref}`) : numeric ? `-${ref}` : ref
    onChange({ sort: next === list.sort ? '' : next })
  }
  const ariaSort = (ref: string) => (sortRef === ref ? (sortDesc ? 'descending' : 'ascending') : undefined)
  const sortOptions = [...(titleColumn ? [titleColumn] : []), ...cellColumns, ...(codeColumn ? [codeColumn] : [])].flatMap((column) => {
    const refs = column.type === 'series' ? (column.periods ?? []).map((p) => `${column.id}.${p}`) : [column.id]
    return refs.flatMap((ref) => {
      const label = refLabel(resolveRef(list.columns, ref)!, lang)
      return NUMERIC.has(column.type)
        ? [
            { value: `-${ref}`, label: `${label} — ${text.largest}` },
            { value: ref, label: `${label} — ${text.smallest}` },
          ]
        : [{ value: ref, label: `${label} — ${text.az}` }]
    })
  })

  // ---------- filters ----------

  const filters = filterColumns(list.columns)
  // Every filter's values with their counts: a pass over all the rows each, so only when the rows, search or filters change.
  const facets = useMemo(
    () => new Map(filterColumns(list.columns).map((c) => [c.id, facetOptions(list.columns, all, texts, words, JSON.parse(filterKey), c.id, lang)])),
    [list, all, texts, words, filterKey, lang],
  )
  const optionsFor = (column: ListColumn): { value: string; count: number | null; label: string }[] => {
    if (rows === null && list.shards?.by === column.id && !list.shards.hash) {
      return list.shards.files.map((f) => ({ value: f.value, count: f.count, label: labelOf(column, f.value, lang) ?? f.value }))
    }
    const options: { value: string; count: number | null; label: string }[] = [...(facets.get(column.id) ?? [])]
    // A value set by a link before the rows it filters are loaded (a category, until a year is chosen) still shows as chosen.
    const chosen = state.filters[column.id]
    if (chosen && chosen !== ALL && !options.some((o) => o.value === chosen)) options.unshift({ value: chosen, count: null, label: labelOf(column, chosen, lang) ?? chosen })
    return options
  }
  // A filter that no longer has rows after another one changes (a municipality outside the new province) is dropped —
  // unless the rows to check it against are not loaded yet (none yet, or another value of the shard column).
  const setFilter = (column: string, v: string) => {
    const next = { ...state.filters, [column]: v }
    const unknown = rows === null || (list.shards !== undefined && !list.shards.hash && list.shards.by === column)
    for (const other of unknown ? [] : Object.keys(next)) {
      if (other === column || !next[other] || next[other] === ALL) continue
      const otherColumn = list.columns.find((c) => c.id === other)
      if (!otherColumn || !filters.includes(otherColumn)) continue
      if (!facetOptions(list.columns, all, texts, words, next, other, lang).some((o) => o.value === next[other])) delete next[other]
    }
    onChange({ filters: next })
  }
  // Filters set by a link on columns without a menu (one payee's id): shown as chips that can be removed.
  const chips = Object.entries(state.filters).flatMap(([colId, v]) => {
    const column = list.columns.find((c) => c.id === colId)
    if (!column || !v || filters.includes(column)) return []
    // A row's own id (its key, or the id its title links by: a payee's) is shown as the row's name.
    const byTitle = colId === list.key || colId === list.rowLink?.column
    const row = byTitle && titleColumn ? all.find((r) => r[index(column)] === v) : undefined
    const named = column.type === 'node' || column.type === 'category' ? labelOf(column, v, lang) : undefined
    return [
      row && titleColumn
        ? { id: colId, label: titleColumn.label[lang], value: cellText(titleColumn, row[index(titleColumn)], lang) }
        : { id: colId, label: column.label[lang], value: named ?? v },
    ]
  })
  const removeFilter = (colId: string) => {
    const next = { ...state.filters }
    delete next[colId]
    onChange({ filters: next })
  }
  const excludedNames = (column: ListColumn) => (column.exclude ?? []).map((v) => labelOf(column, v, lang) ?? v).join(', ')
  const excludeColumns = list.columns.filter((c) => c.exclude?.length && !state.filters[c.id])
  const active = Boolean(state.query) || Object.values(state.filters).some(Boolean)

  // ---------- pieces ----------

  const series = cellColumns.filter((c) => c.type === 'series')
  const title = (row: ListCell[]) => (titleColumn ? cellText(titleColumn, row[index(titleColumn)], lang) : String(row[keyIndex]))
  const linkIndex = list.rowLink ? list.columns.findIndex((c) => c.id === list.rowLink!.column) : -1
  const titleNode = (row: ListCell[]): ReactNode => {
    const target = linkIndex >= 0 ? row[linkIndex] : null
    if (!list.rowLink || typeof target !== 'string' || !target) return title(row)
    const params = { l: list.rowLink.list, f: `${list.rowLink.filter}:${target}`, d: state.dataset }
    return (
      <a
        href={`#/lists?${new URLSearchParams(Object.entries(params).filter(([, v]) => v))}`}
        onClick={(e) => {
          e.preventDefault()
          navigate({ page: 'lists', params })
        }}
      >
        {title(row)}
      </a>
    )
  }
  const details = (row: ListCell[]) => {
    const items = detailColumns.filter((c) => row[index(c)] !== null && row[index(c)] !== '')
    if (!items.length) return null
    const pairs = items.filter((c) => c.type !== 'breakdown' && c.type !== 'series')
    // Tables after the pairs, in column order: a breakdown each, and one for every run of series with the same
    // periods; a column with a section heading starts a new one.
    const tables: { section?: string; columns: ListColumn[] }[] = []
    for (const c of items.filter((x) => x.type === 'breakdown' || x.type === 'series')) {
      const last = tables.at(-1)
      const joins =
        c.type === 'series' && !c.section && last?.columns[0].type === 'series' && (last.columns[0].periods ?? []).join() === (c.periods ?? []).join()
      if (joins) last!.columns.push(c)
      else tables.push({ section: c.section?.[lang], columns: [c] })
    }
    return (
      <>
        {pairs.length > 0 && (
          <dl className="list-details">
            {pairs.map((c) => (
              <Fragment key={c.id}>
                <dt>{c.label[lang]}</dt>
                <dd>{cellNode(c, row)}</dd>
              </Fragment>
            ))}
          </dl>
        )}
        {tables.map((table) => (
          <div key={table.columns[0].id} className="list-breakdown">
            {table.section && <p className="list-detail-section">{table.section}</p>}
            {table.columns[0].type === 'series' ? (
              <SeriesTable columns={table.columns} cells={table.columns.map((c) => row[index(c)])} lang={lang} />
            ) : (
              value(table.columns[0], row[index(table.columns[0])])
            )}
          </div>
        ))}
      </>
    )
  }
  const detailButton = (key: string, row: ListCell[], controls: string) => {
    if (!hasDetails(row)) return null
    const expanded = isOpen(key)
    return (
      <button
        type="button"
        className="row-toggle"
        aria-expanded={expanded}
        aria-controls={controls}
        aria-label={fill(text.details, { name: title(row).slice(0, 80) })}
        onClick={() => toggle(key)}
      >
        <Chevron open={expanded} />
      </button>
    )
  }
  const head = (column: ListColumn, ref: string, label: string, extra?: { colSpan?: number; rowSpan?: number; className?: string }) => (
    <th key={ref} scope={extra?.colSpan ? 'colgroup' : 'col'} aria-sort={ariaSort(ref)} {...extra}>
      <button type="button" className="sort-btn" onClick={() => sortBy(ref, column)}>
        {label}
        <span className="sort-mark" aria-hidden="true">
          {sortRef === ref ? (sortDesc ? '↓' : '↑') : ''}
        </span>
      </button>
    </th>
  )
  const totalCells = (column: ListColumn) => {
    const total = totals[column.id]
    if (column.type === 'series') {
      return (column.periods ?? []).map((p, i) => (
        <td key={`${column.id}.${p}`} className="num">
          {Array.isArray(total) ? seriesValue(column, total[i], lang) : ''}
        </td>
      ))
    }
    const shown = typeof total !== 'number' ? '' : column.type === 'money' ? formatMoney(total, lang) : formatNumber(total, lang)
    return [
      <td key={column.id} className="num">
        {shown}
      </td>,
    ]
  }

  const page = ordered.slice(0, shown)
  const unitText = (n: number) => countText(list, n, lang)
  const waiting = () => {
    const column = list.shards ? list.columns.find((c) => c.id === list.shards!.by) : undefined
    // A list split by a column's values (not by a hash) can also be opened by choosing one of them.
    if (list.shards?.search && !list.shards.hash) return fill(text.chooseOrType, { column: column?.label[lang] ?? '', n: list.shards.search, count: unitText(list.count) })
    if (list.shards?.search) return fill(text.type, { n: list.shards.search, count: unitText(list.count) })
    return fill(text.choose, { column: column?.label[lang] ?? '' })
  }

  return (
    <div className="list-view">
      {!pageView && (
        <div className="toolbar list-toolbar">
          <div className="search list-search">
            <svg className="search-icon" viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              aria-label={text.searchLabel}
              placeholder={text.search}
              value={state.query}
              onChange={(e) => onChange({ query: e.target.value }, true)}
            />
          </div>
          {filters.map((column) => (
            <label key={column.id} className="list-filter">
              <span>{column.label[lang]}</span>
              <select value={state.filters[column.id] ?? ''} onChange={(e) => setFilter(column.id, e.target.value)}>
                {column.exclude?.length ? (
                  <>
                    <option value="">{fill(text.allBut, { name: excludedNames(column) })}</option>
                    <option value={ALL}>{fill(text.allWith, { name: excludedNames(column) })}</option>
                  </>
                ) : (
                  <option value="">{text.all}</option>
                )}
                {optionsFor(column).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                    {o.count === null ? '' : ` (${formatNumber(o.count, lang)})`}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label className="list-filter">
            <span>{text.sort}</span>
            <select value={sort} onChange={(e) => onChange({ sort: e.target.value === list.sort ? '' : e.target.value })}>
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {active && (
            <button type="button" className="link-btn" onClick={() => onChange({ query: '', filters: {} })}>
              {text.clear}
            </button>
          )}
        </div>
      )}

      {!pageView && chips.length > 0 && (
        <ul className="list-chips">
          {chips.map((chip) => (
            <li key={chip.id}>
              <span className="muted">{chip.label}:</span> <strong>{chip.value}</strong>
              <button type="button" className="chip-remove" aria-label={fill(text.remove, { name: chip.label })} onClick={() => removeFilter(chip.id)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {!pageView && (
        <div className="list-summary" aria-live="polite">
          <p>
            {/* While a large list waits for a value or a search, it says how many rows it has. */}
            <strong>{unitText(rows === null ? list.count : matched.length)}</strong>
            {matched.length !== list.count && rows !== null && (
              <span className="muted">
                {' '}
                {text.of} {formatNumber(list.count, lang)}
              </span>
            )}
            {busy && <span className="muted"> · {text.loading}</span>}
          </p>
          {rows !== null && matched.length > 0 && (
            <ul className="list-totals">
              {list.summary.map((ref) => {
                const resolved = resolveRef(list.columns, ref)
                const total = resolved ? refTotal(totals, resolved) : null
                return resolved && total !== null ? (
                  <li key={ref}>
                    <span className="muted">{refLabel(resolved, lang)}</span>{' '}
                    <strong>{resolved.column.type === 'series' ? seriesValue(resolved.column, total, lang) : formatMoney(total, lang)}</strong>
                  </li>
                ) : null
              })}
            </ul>
          )}
        </div>
      )}

      {rows !== null && !pageView && hidden > 0 && excludeColumns.length > 0 && (
        <p className="note list-hidden-note">
          {fill(text.hidden, { rows: unitText(hidden), name: excludeColumns.map(excludedNames).join(', ') })}{' '}
          <button
            type="button"
            className="link-btn"
            onClick={() => onChange({ filters: { ...state.filters, ...Object.fromEntries(excludeColumns.map((c) => [c.id, ALL])) } })}
          >
            {text.showHidden}
          </button>
        </p>
      )}

      {rows === null || (busy && matched.length === 0) ? (
        <p className="note">{busy ? text.loading : waiting()}</p>
      ) : matched.length === 0 ? (
        <p className="note">{text.none}</p>
      ) : narrow ? (
        <ul className="list-cards">
          {page.map((r) => {
            const row = all[r]
            const key = String(row[keyIndex])
            const panel = `${id}-card-${r}`
            const expanded = isOpen(key)
            return (
              <li key={key} className="list-card">
                {codeColumn && <p className="list-code">{value(codeColumn, row[index(codeColumn)])}</p>}
                <p className="list-title">{titleNode(row)}</p>
                <dl className="list-card-values">
                  {cellColumns.flatMap((c) =>
                    c.type === 'series'
                      ? // A card shows only the periods with a value (a measure paid in one year of eight).
                        (c.periods ?? []).flatMap((p, i) => {
                          const v = (row[index(c)] as (number | null)[] | null)?.[i] ?? null
                          return v === null
                            ? []
                            : [
                                <Fragment key={`${c.id}.${p}`}>
                                  <dt>{refLabel({ column: c, index: index(c), period: i }, lang)}</dt>
                                  <dd>{value({ ...c, type: c.unit === 'count' ? 'number' : 'money' }, v)}</dd>
                                </Fragment>,
                              ]
                        })
                      : [
                          <Fragment key={c.id}>
                            <dt>{c.label[lang]}</dt>
                            <dd>{cellNode(c, row)}</dd>
                          </Fragment>,
                        ],
                  )}
                </dl>
                {hasDetails(row) && (
                  <>
                    <button type="button" className="list-card-more" aria-expanded={expanded} aria-controls={panel} onClick={() => toggle(key)}>
                      {text.more_details}
                      <Chevron open={expanded} />
                    </button>
                    <div id={panel} hidden={!expanded}>
                      {expanded && details(row)}
                    </div>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="table-scroll list-table-scroll">
          <table className="list-table">
            <caption className="visually-hidden">{list.title[lang]}</caption>
            <thead>
              <tr>
                {titleColumn && head(titleColumn, titleColumn.id, titleColumn.label[lang], { rowSpan: series.length ? 2 : undefined, className: 'list-title-head' })}
                {cellColumns.map((c) =>
                  c.type === 'series' ? (
                    <th key={c.id} scope="colgroup" colSpan={c.periods?.length} className="list-group-head">
                      {c.label[lang]}
                    </th>
                  ) : (
                    head(c, c.id, c.label[lang], { rowSpan: series.length ? 2 : undefined, className: NUMERIC.has(c.type) ? 'num' : undefined })
                  ),
                )}
              </tr>
              {series.length > 0 && <tr>{series.flatMap((c) => (c.periods ?? []).map((p) => head(c, `${c.id}.${p}`, periodLabel(c, p, lang), { className: 'num' })))}</tr>}
            </thead>
            <tbody>
              {page.map((r) => {
                const row = all[r]
                const key = String(row[keyIndex])
                const panel = `${id}-row-${r}`
                const expanded = isOpen(key)
                return (
                  <Fragment key={key}>
                    <tr className={expanded ? 'open' : undefined}>
                      {titleColumn && (
                        <th scope="row">
                          <span className="list-title-cell">
                            {detailButton(key, row, panel) ?? <span className="row-toggle-space" aria-hidden="true" />}
                            <span>
                              <span className="list-title">{titleNode(row)}</span>
                              {codeColumn && <span className="list-code">{value(codeColumn, row[index(codeColumn)])}</span>}
                            </span>
                          </span>
                        </th>
                      )}
                      {cellColumns.flatMap((c) =>
                        c.type === 'series'
                          ? (c.periods ?? []).map((p, i) => (
                              <td key={`${c.id}.${p}`} className="num">
                                {value({ ...c, type: c.unit === 'count' ? 'number' : 'money' }, (row[index(c)] as (number | null)[] | null)?.[i] ?? null)}
                              </td>
                            ))
                          : [
                              <td key={c.id} className={NUMERIC.has(c.type) ? 'num' : c.type === 'node' ? 'node' : undefined}>
                                {cellNode(c, row)}
                              </td>,
                            ],
                      )}
                    </tr>
                    {expanded && (
                      <tr className="list-detail-row" id={panel}>
                        <td colSpan={1 + cellColumns.reduce((s, c) => s + (c.type === 'series' ? (c.periods?.length ?? 1) : 1), 0)}>{details(row)}</td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">
                  {text.total} · {unitText(matched.length)}
                </th>
                {cellColumns.flatMap(totalCells)}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {rows !== null && ordered.length > shown && (
        <div className="list-more">
          <p className="muted small">{fill(text.shown, { n: formatNumber(shown, lang), total: formatNumber(ordered.length, lang) })}</p>
          <button type="button" className="btn" onClick={() => setPaging({ signature, shown: shown + PAGE })}>
            {fill(text.more, { n: formatNumber(Math.min(PAGE, ordered.length - shown), lang) })}
          </button>
        </div>
      )}
    </div>
  )
}
