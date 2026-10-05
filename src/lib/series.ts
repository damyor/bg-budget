import { useEffect, useState } from 'react'
import type { Loadable } from './data'
import type { DatasetFamily, DatasetIndexEntry, SeriesFile } from './types'

const BASE = import.meta.env.BASE_URL
const cache = new Map<DatasetFamily, Promise<SeriesFile | null>>()

/** The comparison series of a family, or null when the family has a single dataset. */
export function loadSeries(family: DatasetFamily): Promise<SeriesFile | null> {
  let promise = cache.get(family)
  if (!promise) {
    promise = fetch(`${BASE}data/series-${family}.json`).then((res) => (res.ok ? (res.json() as Promise<SeriesFile>) : null))
    cache.set(family, promise)
  }
  return promise
}

export function useSeries(family: DatasetFamily): Loadable<SeriesFile | null> {
  const [state, setState] = useState<{ family: DatasetFamily; value: Loadable<SeriesFile | null> }>({ family, value: { status: 'loading' } })
  useEffect(() => {
    let alive = true
    loadSeries(family).then(
      (value) => alive && setState({ family, value: { status: 'ready', value } }),
      (e: unknown) => alive && setState({ family, value: { status: 'error', error: String(e) } }),
    )
    return () => {
      alive = false
    }
  }, [family])
  return state.family === family ? state.value : { status: 'loading' }
}

export interface SeriesPoint {
  entry: DatasetIndexEntry
  /** EUR, or null when the category does not exist in that dataset. */
  value: number | null
}

/** The value of one category in every dataset of the series, oldest first. */
export function pointsFor(series: SeriesFile, index: DatasetIndexEntry[], nodeId: string): SeriesPoint[] | null {
  const values = series.values[nodeId]
  if (!values) return null
  return series.datasets.flatMap((id, i) => {
    const entry = index.find((d) => d.id === id)
    return entry ? [{ entry, value: values[i] }] : []
  })
}

/** Plan and actual of the same year side by side: actual as a share of the plan. */
export function executionRate(points: SeriesPoint[], point: SeriesPoint): number | null {
  if (point.entry.kind !== 'actual' || point.value === null) return null
  const plan = points.find((p) => p.entry.year === point.entry.year && p.entry.stage === 'law')
  return plan?.value ? point.value / plan.value : null
}
