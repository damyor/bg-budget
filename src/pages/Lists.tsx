import { useState } from 'react'
import { ListView } from '../components/ListView'
import { Segmented } from '../components/Segmented'
import { useLang, useT } from '../lib/i18n'
import { columnSources, paramsFromState, stateFromParams, type ListState } from '../lib/listData'
import { useListFile, useListIndex, useListRows } from '../lib/lists'
import { navigate, routeUrl, useRoute } from '../lib/route'
import type { DatasetIndexEntry, Lang, ListColumn } from '../lib/types'

const TEXT = {
  bg: {
    section: 'Раздел',
    lists: 'Списък',
    asOf: 'Данни към {date}',
    retrieved: 'изтеглени на {date}',
    notes: 'Какво да имаш предвид',
    columns: 'Откъде е всяка колона',
  },
  en: {
    section: 'Section',
    lists: 'List',
    asOf: 'Data as of {date}',
    retrieved: 'downloaded on {date}',
    notes: 'Good to know',
    columns: 'Where each column comes from',
  },
} satisfies Record<Lang, Record<string, string>>

const date = (iso: string, lang: Lang) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(lang === 'bg' ? 'bg-BG' : 'en-GB', { day: 'numeric', month: lang === 'bg' ? '2-digit' : 'short', year: 'numeric' })

/**
 * Lists of things that do not add up to the budget — projects, payments, hospitals, EU funds,
 * procurement contracts: search, filters, sort, totals and deep links
 * (#/lists?l=<list>&q=<search>&f=<column>:<value>,…&s=<sort>&d=<dataset>).
 */
export function Lists({ datasets }: { datasets: DatasetIndexEntry[] }) {
  const t = useT()
  const lang = useLang()
  const text = TEXT[lang]
  const route = useRoute()
  const index = useListIndex()
  const lists = index.status === 'ready' ? index.value.lists : []
  const state = stateFromParams(route.params, lists)
  const meta = lists.find((l) => l.id === state.list)
  const file = useListFile(meta)
  const list = file.status === 'ready' ? file.value : null
  const rows = useListRows(list, state.filters, state.query)
  const [copied, setCopied] = useState(false)

  if (index.status === 'loading') return <p className="page-status">{t('loading')}</p>
  if (index.status === 'error' || !meta) return <p className="page-status">{t('loadError')}</p>

  const groups = index.value.groups
  const group = groups.find((g) => g.id === meta.group)
  const members = lists.filter((l) => l.group === meta.group && !l.hidden)
  const back = meta.back ? lists.find((l) => l.id === meta.back) : undefined
  const change = (next: Partial<ListState>, replace = false) => navigate({ page: 'lists', params: paramsFromState({ ...state, ...next }) }, { replace })
  // Search and filters carry over to another list of the group; filters on columns it lacks are ignored.
  const switchList = (id: string) => change({ list: id, sort: '' })
  const switchGroup = (id: string) => {
    const first = lists.find((l) => l.group === id && !l.hidden)
    if (first) change({ list: first.id, sort: '', query: '', filters: {} })
  }
  // Node links go back to the dataset the viewer came from when it is of the column's breakdown.
  const origin = datasets.find((d) => d.id === state.dataset)
  const datasetFor = (column: ListColumn) => (origin && origin.family === column.family ? origin.id : column.dataset!)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(routeUrl({ page: 'lists', params: paramsFromState(state) }))
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard blocked — the address bar still has the link */
    }
  }

  return (
    <div className="lists-page">
      <h1 className="page-title">{group?.title[lang]}</h1>
      {group && <p className="muted lists-intro">{group.description[lang]}</p>}
      <div className="toolbar lists-pickers">
        {groups.length > 1 && (
          <Segmented label={text.section} value={meta.group} onChange={switchGroup} options={groups.map((g) => ({ value: g.id, label: g.title[lang] }))} />
        )}
        <Segmented
          label={text.lists}
          value={meta.hidden ? '' : meta.id}
          onChange={switchList}
          options={members.map((l) => ({ value: l.id, label: l.short[lang], title: l.title[lang] }))}
        />
      </div>

      <section className="list-head" aria-labelledby="list-title">
        {back && (
          <p className="list-back">
            <a
              href={`#/lists?${new URLSearchParams({ l: back.id })}`}
              onClick={(e) => {
                e.preventDefault()
                change({ list: back.id, filters: {}, sort: '' })
              }}
            >
              ← {back.title[lang]}
            </a>
          </p>
        )}
        <h2 id="list-title" className="list-heading">
          {meta.title[lang]}
        </h2>
        <p className="list-description">{meta.description[lang]}</p>
        <p className="muted small">
          {text.asOf.replace('{date}', date(meta.asOf, lang))}
          {meta.retrieved !== meta.asOf && ` · ${text.retrieved.replace('{date}', date(meta.retrieved, lang))}`} ·{' '}
          <button type="button" className="link-btn" onClick={copyLink}>
            {copied ? t('copied') : t('copyLink')}
          </button>
        </p>
      </section>

      {file.status === 'error' || rows.status === 'error' ? (
        <p className="page-status">{t('loadError')}</p>
      ) : list && rows.status === 'ready' ? (
        <ListView key={list.id} list={list} rows={rows.rows} busy={rows.busy} state={state} onChange={change} datasetFor={datasetFor} />
      ) : (
        <p className="page-status">{t('loading')}</p>
      )}

      <footer className="dataset-footer list-notes">
        <h2 className="group-title">{text.notes}</h2>
        <ul>
          {meta.caveats.map((c) => (
            <li key={c.en}>{c[lang]}</li>
          ))}
        </ul>
        {list && columnSources(list, lang).length > 0 && (
          <>
            <h2 className="group-title">{text.columns}</h2>
            <ul>
              {columnSources(list, lang).map((s) => (
                <li key={s.source}>
                  <strong>{s.label}</strong>: {s.source}
                </li>
              ))}
            </ul>
          </>
        )}
        <p>
          {t('source')}:{' '}
          {meta.sources.map((s, i) => (
            <span key={s.url}>
              {i > 0 && ' · '}
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.name[lang]}
              </a>
            </span>
          ))}
        </p>
      </footer>
    </div>
  )
}
