import { useEffect, useState } from 'react'
import { buildIndex, type TreeIndex } from './tree'
import type { Dataset, DatasetIndexEntry } from './types'

export interface LoadedDataset {
  dataset: Dataset
  tree: TreeIndex
}

const BASE = import.meta.env.BASE_URL

/** A file of public/data/. */
export async function getJson<T>(file: string): Promise<T> {
  const res = await fetch(`${BASE}data/${file}`)
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`)
  return (await res.json()) as T
}

let indexPromise: Promise<DatasetIndexEntry[]> | null = null
const datasetPromises = new Map<string, Promise<LoadedDataset>>()

export function loadIndex(): Promise<DatasetIndexEntry[]> {
  indexPromise ??= getJson<DatasetIndexEntry[]>('index.json')
  return indexPromise
}

export function loadDataset(entry: DatasetIndexEntry): Promise<LoadedDataset> {
  let promise = datasetPromises.get(entry.id)
  if (!promise) {
    promise = getJson<Dataset>(entry.file).then((dataset) => ({ dataset, tree: buildIndex(dataset.root) }))
    datasetPromises.set(entry.id, promise)
  }
  return promise
}

export type Loadable<T> = { status: 'loading' } | { status: 'error'; error: string } | { status: 'ready'; value: T }

export function useDatasetIndex(): Loadable<DatasetIndexEntry[]> {
  const [state, setState] = useState<Loadable<DatasetIndexEntry[]>>({ status: 'loading' })
  useEffect(() => {
    let alive = true
    loadIndex().then(
      (value) => alive && setState({ status: 'ready', value }),
      (e: unknown) => alive && setState({ status: 'error', error: String(e) }),
    )
    return () => {
      alive = false
    }
  }, [])
  return state
}

/** Loads a dataset; keeps returning the previous one while the next loads. */
export function useDataset(entry: DatasetIndexEntry | undefined): Loadable<LoadedDataset> {
  const [state, setState] = useState<Loadable<LoadedDataset>>({ status: 'loading' })
  useEffect(() => {
    if (!entry) return
    let alive = true
    loadDataset(entry).then(
      (value) => alive && setState({ status: 'ready', value }),
      (e: unknown) => alive && setState({ status: 'error', error: String(e) }),
    )
    return () => {
      alive = false
    }
  }, [entry])
  return state
}
