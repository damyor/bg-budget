import { useEffect, useState } from 'react'
import { getJson, type Loadable } from './data'
import { addShardLabels, shardsToLoad, unpackShard, type Filters } from './listData'
import type { DatasetLinks, ListCell, ListFile, ListIndex, ListMeta, ListShardFile } from './types'

// Loading lists (public/data/lists/): the index, a dataset's links to them, a list file and,
// for large lists, the shards its filters need. Every file is fetched once.

let indexPromise: Promise<ListIndex> | null = null
const linkPromises = new Map<string, Promise<DatasetLinks>>()
const filePromises = new Map<string, Promise<ListFile>>()
const shardPromises = new Map<string, Promise<ListCell[][]>>()

export function loadListIndex(): Promise<ListIndex> {
  indexPromise ??= getJson<ListIndex>('lists/index.json')
  return indexPromise
}

/** The links of one dataset's tree nodes to lists (lists/links/<dataset>.json): a small file, not the whole index. */
export function loadDatasetLinks(dataset: string): Promise<DatasetLinks> {
  let promise = linkPromises.get(dataset)
  if (!promise) {
    promise = getJson<DatasetLinks>(`lists/links/${dataset}.json`)
    linkPromises.set(dataset, promise)
  }
  return promise
}

export function loadList(meta: ListMeta): Promise<ListFile> {
  let promise = filePromises.get(meta.id)
  if (!promise) {
    promise = getJson<ListFile>(meta.file)
    filePromises.set(meta.id, promise)
  }
  return promise
}

function loadShard(list: ListFile, file: string): Promise<ListCell[][]> {
  let promise = shardPromises.get(file)
  if (!promise) {
    promise = getJson<ListShardFile>(file).then((shard) => {
      // Names that come with the shard (a buyer's suppliers) join the list's before its rows are shown.
      addShardLabels(list.columns, shard.labels)
      return unpackShard(list.columns, shard, list.shards?.by)
    })
    shardPromises.set(file, promise)
  }
  return promise
}

/**
 * The rows of a list for the current filters and search: its own rows, or the shards they need,
 * or null when a large list waits for a shard value to be chosen or a search to be typed.
 */
export async function loadRows(list: ListFile, filters: Filters, query = ''): Promise<ListCell[][] | null> {
  if (list.rows) return list.rows
  if (!list.shards) return []
  const files = shardsToLoad(list.shards, list.count, filters, query)
  if (!files) return null
  return (await Promise.all(files.map((f) => loadShard(list, f.file)))).flat()
}

/** What decides which shards a list needs: their files (the same files give the same rows). */
function shardKey(list: ListFile, filters: Filters, query: string): string {
  if (!list.shards) return list.id
  const files = shardsToLoad(list.shards, list.count, filters, query)
  return `${list.id}:${files ? files.map((f) => f.file).join(',') : '-'}`
}

/** Loads a value whenever `key` changes; `key` null means nothing to load. */
function useLoad<T>(key: string | null, load: () => Promise<T>): Loadable<T> {
  const [state, setState] = useState<{ key: string | null; value: Loadable<T> }>({ key, value: { status: 'loading' } })
  useEffect(() => {
    if (key === null) return
    let alive = true
    load().then(
      (value) => alive && setState({ key, value: { status: 'ready', value } }),
      (e: unknown) => alive && setState({ key, value: { status: 'error', error: String(e) } }),
    )
    return () => {
      alive = false
    }
    // `load` belongs to `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return state.key === key ? state.value : { status: 'loading' }
}

export function useListIndex(): Loadable<ListIndex> {
  return useLoad('index', loadListIndex)
}

/** A dataset's links to lists; null skips loading them (the dataset has none). */
export function useDatasetLinks(dataset: string | null): Loadable<DatasetLinks> {
  return useLoad(dataset, () => loadDatasetLinks(dataset!))
}

export function useListFile(meta: ListMeta | undefined): Loadable<ListFile> {
  return useLoad(meta?.id ?? null, () => loadList(meta!))
}

export interface ListRows {
  status: 'loading' | 'ready' | 'error'
  /** The rows, or null while a large list waits for a value or a search; while more shards load, the rows loaded before. */
  rows: ListCell[][] | null
  /** More shards are loading (the rows shown are the earlier ones). */
  busy: boolean
}

/** The rows of a list for its filters and search; keeps showing the earlier rows of the same list while more load. */
export function useListRows(list: ListFile | null, filters: Filters, query = ''): ListRows {
  const key = list ? shardKey(list, filters, query) : null
  const [state, setState] = useState<{ key: string | null; value: Loadable<ListCell[][] | null> }>({ key: null, value: { status: 'loading' } })
  useEffect(() => {
    if (key === null) return
    let alive = true
    loadRows(list!, filters, query).then(
      (value) => alive && setState({ key, value: { status: 'ready', value } }),
      (e: unknown) => alive && setState({ key, value: { status: 'error', error: String(e) } }),
    )
    return () => {
      alive = false
    }
    // The key says which shards the filters and search need.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  const { value } = state
  if (state.key === key && value.status !== 'loading') {
    return value.status === 'ready' ? { status: 'ready', rows: value.value, busy: false } : { status: 'error', rows: null, busy: false }
  }
  // Still loading: the earlier rows of the same list stay until the new ones arrive.
  if (list && state.key?.startsWith(`${list.id}:`) && value.status === 'ready') return { status: 'ready', rows: value.value, busy: true }
  return { status: 'loading', rows: null, busy: true }
}
