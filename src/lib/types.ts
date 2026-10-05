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
  children?: BudgetNode[]
}

export interface DatasetSource {
  name: LocalizedText
  url: string
}

/**
 * How spending is broken down: by purpose (functions of the consolidated
 * fiscal programme), by ministry, or by Eurostat's COFOG classification.
 * Datasets of one family share node ids and can be compared across years.
 */
export type DatasetFamily = 'functions' | 'ministries' | 'cofog'

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
