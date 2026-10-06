export type Lang = 'bg' | 'en'

export interface LocalizedText {
  bg: string
  en: string
}

/** One node of a spending hierarchy. `value` is always in euro. */
export interface BudgetNode {
  /** Unique within its dataset and URL-safe; used for deep links. */
  id: string
  name: LocalizedText
  value: number
  /** Official classification code (COFOG, ЕБК, program code …). */
  code?: string
  /** What kind of item this is ("Министерство", "Програма" …); overrides the dataset's level names. */
  kind?: LocalizedText
  note?: LocalizedText
  /** Residents of the place the node stands for (a municipality or province), for amounts per resident. */
  residents?: number
  /** The same place or thing in other datasets, shown as links (a city's central-budget transfers ↔ its whole budget). */
  seeAlso?: NodeSeeAlso[]
  children?: BudgetNode[]
}

/** A link from a tree node to a node of another dataset, with that node's amount. */
export interface NodeSeeAlso {
  dataset: string
  node: string
  /** What the other node is, e.g. "Целият бюджет на общината, отчет 2025". */
  text: LocalizedText
  /** The other node's amount, euro. */
  value: number
}

export interface DatasetSource {
  name: LocalizedText
  url: string
}

/**
 * How spending is broken down: by purpose (functions of the consolidated
 * fiscal programme), by ministry, by Eurostat's COFOG classification, by
 * municipality (the central budget's transfers to each one), or the big
 * cities' whole budgets by ЕБК activity.
 * Datasets of one family share node ids and can be compared across years.
 */
export type DatasetFamily = 'functions' | 'ministries' | 'cofog' | 'municipalities' | 'cities'

/** law = budget voted by Parliament; draft = bill; forecast = medium-term forecast; report = actual outturn. */
export type DatasetStage = 'law' | 'draft' | 'forecast' | 'report'

export interface Dataset {
  id: string
  year: number
  kind: 'plan' | 'actual'
  stage: DatasetStage
  family: DatasetFamily
  title: LocalizedText
  subtitle: LocalizedText
  description: LocalizedText
  currency: 'EUR'
  /** Currency of the source documents; leva are converted at 1.95583 per euro. */
  sourceCurrency: 'BGN' | 'EUR'
  /** Population used for per-person figures. */
  population: number
  populationNote: LocalizedText
  /** What `residents` of the nodes are, e.g. "residents on 31 Dec 2025 (NSI)". */
  residentsNote?: LocalizedText
  /** Nominal GDP of the year (EUR), for "% of GDP". */
  gdp: number
  gdpNote: LocalizedText
  /** Human names of the hierarchy levels, top first. */
  levels: LocalizedText[]
  sources: DatasetSource[]
  /** One-line source credit for clips, e.g. "Евростат (COFOG), 2024". */
  sourceShort: LocalizedText
  /** ISO date the source data was retrieved / published. */
  retrieved: string
  /**
   * All public spending in the year, when the dataset covers only part of it
   * (e.g. ministries only). Shares "of all public spending" and personal
   * shares are computed against this. Defaults to the root's value.
   */
  publicTotal?: number
  root: BudgetNode
}

export function publicTotal(dataset: Dataset): number {
  return dataset.publicTotal ?? dataset.root.value
}

/** public/data/about.json: what the About page shows of each dataset — all but the tree, and its total. */
export type DatasetInfo = Omit<Dataset, 'root'> & { total: number }

export interface DatasetIndexEntry {
  id: string
  year: number
  kind: 'plan' | 'actual'
  stage: DatasetStage
  family: DatasetFamily
  title: LocalizedText
  subtitle: LocalizedText
  file: string
  total: number
  /** All public spending in the year (see Dataset.publicTotal). */
  publicTotal: number
  gdp: number
  population: number
  /** Some nodes link to lists (projects …): their links are in lists/links/<id>.json (DatasetLinks). */
  lists?: boolean
}

// ---------- lists: items that do not add up to the budget (projects, payments, contracts …) ----------

/**
 * How a list column's values look and behave:
 * text (a string, or {bg, en} for notes), code (a short identifier), money (euro),
 * number, percent (a share, 0.5 = 50%), date ("2026-07-31"), series (one euro amount per
 * period, e.g. 2026–2028 or months), node (the id of a tree node of a dataset family,
 * shown as a link to it), category (an id with a display name), url (an external link),
 * breakdown (parts of a row's amount — e.g. who paid it — each with one euro amount per
 * period: [[part id, amount, amount …], …], shown as a small table in the row's details).
 */
export type ListColumnType = 'text' | 'code' | 'money' | 'number' | 'percent' | 'date' | 'series' | 'node' | 'category' | 'url' | 'breakdown'

export interface ListColumn {
  id: string
  type: ListColumnType
  label: LocalizedText
  /** Which document the values come from and as of when; shown with the list's notes. */
  source?: LocalizedText
  /** Shown only when a row is opened (long texts, secondary amounts). */
  detail?: boolean
  /** Not shown at all; used for filtering (e.g. the province of a municipality). */
  hidden?: boolean
  /** Text and code columns: matched by the search box (the names of node and category values always are). */
  search?: boolean
  /** Node, category and date (by year) columns: offered as a filter. */
  filter?: boolean
  /**
   * Money, number and series columns: summed in the totals. Breakdown: false when its periods are not parts of one
   * amount (a budget and what was paid of it), so that no total across them is shown.
   */
  total?: boolean
  /** Series and breakdown: the period of each value, e.g. ["2026", "2027", "2028"]. */
  periods?: string[]
  /** Series and breakdown: how a period is shown when not as itself (months "01" → "яну" / "Jan", "2026" → "2026 (I–VIII)"). */
  periodLabels?: Record<string, LocalizedText>
  /** Series: the values are counts (beds, staff …), not euro. */
  unit?: 'count'
  /** A heading shown before this column in a row's details; detail series of the same periods that follow it form one table. */
  section?: LocalizedText
  /** Detail series: their table has the periods down the side (one row per month …) and the series across. */
  transpose?: boolean
  /** Node: the breakdown the ids belong to and the dataset its links open by default. */
  family?: DatasetFamily
  dataset?: string
  /**
   * Node, category and breakdown: the display name of every value (of every part); a plain string is a name that is the
   * same in both languages (a supplier's name as published).
   */
  labels?: Record<string, LocalizedText | string>
  /** Breakdown: parts are grouped (e.g. payer units by ministry) — the group of each part and the groups' names. */
  groups?: { of: Record<string, string>; labels: Record<string, LocalizedText> }
  /**
   * Category filters: values left out while the filter is not set ("all but the public sector");
   * the filter value "*" shows them too.
   */
  exclude?: string[]
  /** Category: the values have an order, that of `labels` (bands of value …), which its filter and choices follow. */
  ordered?: boolean
  /** Url: a template in which {value} is replaced by the cell value. */
  href?: string
  /**
   * Text and code: the cell links to another list filtered on this row's value of `column` (default: this column),
   * e.g. a contract's buyer → the buyer's page.
   */
  link?: { list: string; filter: string; column?: string }
  /**
   * Node, category and breakdown columns of a list split into shards, whose values are many and few of them in each
   * shard (a buyer's suppliers): their `labels` come with the shards that use them (ListShardFile.labels), not with
   * the list file.
   */
  shardLabels?: boolean
}

/** A breakdown cell: [part id, amount per period …] for every part; periods missing at the end are 0. */
export type ListBreakdown = (string | number)[][]

export type ListCell = string | number | LocalizedText | (number | null)[] | ListBreakdown | null

/**
 * A link from tree nodes to a list: in the family's datasets of these years
 * (and stages), a node with rows links to the list filtered to it.
 */
export interface ListLinkSpec {
  family: DatasetFamily
  /** The node column. */
  column: string
  years: number[]
  /** Only datasets of these stages (default: all). */
  stages?: DatasetStage[]
  /** The value totalled in the link: a money column, or "<series>.<period>"; none for a count only. */
  value?: string
  /** What the total is, e.g. "за 2026 г." / "in 2026". */
  label: LocalizedText
  /**
   * The link's own wording instead of "<count>, <total> <label>": {count} and {total} are filled in,
   * e.g. "Кой получава парите: {total} през 2025 г.".
   */
  text?: LocalizedText
  /**
   * The column holds other values than node ids: the node of each value (e.g. a payer system → its ministry),
   * or several nodes (every "EU funds" slice of a tree → the one value all rows share).
   */
  nodes?: Record<string, string | string[]>
  /** Only rows with these filter values count, and the link opens the list with them (e.g. {year: '2025'}). */
  filters?: Record<string, string>
}

/** Everything about a list except its rows: shown in the list picker and before the rows load. */
export interface ListMeta {
  id: string
  /** Lists of a group are offered together (projects, payments …). */
  group: string
  title: LocalizedText
  /** A shorter title for the picker. */
  short: LocalizedText
  description: LocalizedText
  sources: DatasetSource[]
  /** What to keep in mind when reading the list. */
  caveats: LocalizedText[]
  /** The date the figures describe ("2025-12-31" for a report, the download date for a live register). */
  asOf: string
  /** ISO date the source was downloaded. */
  retrieved: string
  /** What one row is, for counts: "1 проект" / "2 проекта". */
  unit: { one: LocalizedText; other: LocalizedText }
  count: number
  /** The values whose totals the summary shows: money columns or "<series>.<period>". */
  summary: string[]
  /** Totals over all rows: column id → euro (an array for series). */
  totals: Record<string, number | number[]>
  /** Default order: a column id or "<series>.<period>", with "-" first for largest first. */
  sort: string
  links?: ListLinkSpec[]
  /** Not offered in the list picker: reached through links (e.g. one payee's payers). */
  hidden?: boolean
  /** The list a hidden list's page leads back to (e.g. the search of all payees). */
  back?: string
  file: string
}

/**
 * A list (public/data/lists/<id>.json). Small lists carry their rows; large
 * ones are split into shards by the values of one column, fetched when needed.
 */
export interface ListFile extends ListMeta {
  columns: ListColumn[]
  /** The column whose values identify a row. */
  key: string
  /** The column that names a row (default: the first visible text column). */
  titleColumn?: string
  /** Each row's title links to another list filtered on this row's value of `column` (e.g. a payee's page). */
  rowLink?: { list: string; filter: string; column: string }
  /** One array per row, in the order of the columns. */
  rows?: ListCell[][]
  shards?: ListShards
}

/**
 * One shard file: the rows with one value of the shard column (or one hash bucket). `count` and `totals` are those of
 * the rows the list shows by default (not those a column leaves out until they are chosen, ListColumn.exclude): what a
 * list that waits for a value to be chosen offers for each.
 */
export interface ListShardInfo {
  value: string
  file: string
  count: number
  totals: Record<string, number | number[]>
}

export interface ListShards {
  /** The column the rows are split by (a filter column, or the key column with `hash`). */
  by: string
  /** Rows are split by a hash of the column's value into this many files (see bucketOf); `value` is the bucket. */
  hash?: number
  /** A search of at least this many letters loads every shard (lists too large to load whole otherwise). */
  search?: number
  /** A value of the shard column has to be chosen even when the list is small enough to load whole (each shard is large). */
  choose?: boolean
  files: ListShardInfo[]
  /**
   * The rows split again by other filter columns (lists/<list>/<column>/<value>.json; only rows with a value there),
   * so that a filter on one of them loads one file too: the EU projects of a municipality in a list split by programme.
   */
  also?: { by: string; files: ListShardInfo[] }[]
}

/**
 * A list shard (public/data/lists/<list>/<value>.json). Values that repeat within the shard (texts, plain or
 * bilingual, and node and category ids) are stored once in `texts`, and the cells hold their index instead; the
 * shard column, the same in every row, is stored once in `value` (see packShard).
 */
export interface ListShardFile {
  rows: ListCell[][]
  texts?: (string | LocalizedText)[]
  /** Every row's value of the shard column, left out of the rows. */
  value?: string
  /** The column `value` belongs to, when it is not the list's shard column (ListShards.also). */
  by?: string
  /** The names of the values in this shard of the columns whose names come with the shards (ListColumn.shardLabels). */
  labels?: Record<string, Record<string, LocalizedText | string>>
}

/** public/data/lists/index.json: every list, by group (what the "Lists" page needs before a list loads). */
export interface ListIndex {
  groups: { id: string; title: LocalizedText; description: LocalizedText }[]
  lists: ListMeta[]
}

/** The tree nodes a list links from: node id → [rows, total] (`nodes` of the spec becomes `values`: node id → the column's value). */
export type NodeLink = Omit<ListLinkSpec, 'nodes'> & { list: string; nodes: Record<string, [number, number]>; values?: Record<string, string> }

/**
 * public/data/lists/links/<dataset>.json: the links of one dataset's tree nodes, with what they show of each list —
 * all "Spending" loads. The build writes one for each dataset that has links; no file holds all of them.
 */
export interface DatasetLinks {
  lists: Pick<ListMeta, 'id' | 'title' | 'unit'>[]
  links: NodeLink[]
}

/**
 * Values of every node that appears in more than one dataset of a family,
 * for comparing years and plan against actual (public/data/series-<family>.json).
 */
export interface SeriesFile {
  family: DatasetFamily
  /** Dataset ids, oldest year first, plan before actual. */
  datasets: string[]
  /** Node id → value in each dataset (EUR), null where the node does not exist. */
  values: Record<string, (number | null)[]>
  /** Node id → parent id and names, for nodes missing from a given dataset. */
  nodes: Record<string, { parent: string | null; name: LocalizedText }>
}
