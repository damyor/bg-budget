import { Fragment, useState, type ReactNode } from 'react'
import { Segmented } from '../components/Segmented'
import { FAMILY_LABEL, STAGE_HINT, STAGE_LABEL } from '../lib/datasets'
import { formatGdpPercent, formatMoney, formatPercent } from '../lib/format'
import { useLang, useT } from '../lib/i18n'
import { navigate, useRoute } from '../lib/route'
import { executionRate, pointsFor, useSeries, type SeriesPoint } from '../lib/series'
import { AREA_ORDER } from '../lib/tree'
import type { DatasetFamily, DatasetIndexEntry, Lang, SeriesFile } from '../lib/types'
import { formatPersonal } from '../lib/valueMode'

type Unit = 'total' | 'perPerson' | 'gdp' | 'share'
const UNIT_PARAM: Record<Unit, string> = { total: '', perPerson: 'pp', gdp: 'gdp', share: 'share' }
const unitFromParam = (p: string | undefined): Unit => (p === 'pp' ? 'perPerson' : p === 'gdp' ? 'gdp' : p === 'share' ? 'share' : 'total')

const TEXT = {
  bg: {
    title: 'Сравнение по години',
    intro:
      'Всички години и версии една до друга: какво е планирано, какво е похарчено и какво се прогнозира. Сравнявай в евро, на човек, като дял от БВП (най-честното сравнение между години, защото отчита ръста на икономиката и цените) или като дял от всички разходи.',
    unit: 'Мярка',
    total: 'Евро',
    perPerson: 'На човек',
    gdp: '% от БВП',
    share: '% от разходите',
    category: 'Категория',
    expandAll: 'Покажи всички подкатегории',
    collapseAll: 'Скрий подкатегориите',
    expand: 'Покажи подкатегориите на „{name}“',
    collapse: 'Скрий подкатегориите на „{name}“',
    planShare: 'от плана',
    open: 'Отвори „{name}“ — {dataset}',
    notes: [
      'Отчетът показва под стойността каква част от плана за същата година е изпълнена.',
      'Сумите за 2024 и 2025 г. са в лева в изходните документи и са превърнати в евро по фиксирания курс 1,95583.',
      'БВП: за 2024 и 2025 г. — Евростат; за 2026 и 2027 г. — есенната прогноза на Министерството на финансите (2026). Официалните проценти в бюджета за 2026 г. са изчислени с по-стара, по-ниска прогноза за БВП и затова са по-високи.',
      'Сравняват се категориите, които съществуват във всички версии (функциите и подфункциите на консолидираната фискална програма). По-подробните нива — отделните фондове, общини и бюджети — са в „Разходи“.',
    ],
    none: 'За тази разбивка има данни само за една година.',
  },
  en: {
    title: 'Compare years',
    intro:
      'Every year and version side by side: what was planned, what was spent and what is forecast. Compare in euro, per person, as a share of GDP (the fairest comparison across years, since it accounts for economic growth and prices) or as a share of all spending.',
    unit: 'Measure',
    total: 'Euro',
    perPerson: 'Per person',
    gdp: '% of GDP',
    share: '% of spending',
    category: 'Category',
    expandAll: 'Show all subcategories',
    collapseAll: 'Hide subcategories',
    expand: 'Show the subcategories of “{name}”',
    collapse: 'Hide the subcategories of “{name}”',
    planShare: 'of plan',
    open: 'Open “{name}” — {dataset}',
    notes: [
      'Under each actual value: the share of the same year’s plan that was spent.',
      'Amounts for 2024 and 2025 are in leva in the source documents and are converted to euro at the fixed rate of 1.95583.',
      'GDP: Eurostat for 2024 and 2025; the Ministry of Finance autumn 2026 forecast for 2026 and 2027. The official shares in the 2026 budget used an older, lower GDP forecast, so they are higher.',
      'The categories compared are those that exist in every version (functions and sub-functions of the consolidated fiscal programme). Deeper levels — individual funds, municipalities and budgets — are under “Spending”.',
    ],
    none: 'This breakdown has data for a single year only.',
  },
} satisfies Record<Lang, unknown>

const fill = (s: string, vars: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`)

/** Nodes shown as rows: those present in at least half of the datasets (the shared skeleton). */
function rowChildren(series: SeriesFile, parent: string): string[] {
  const min = Math.ceil(series.datasets.length / 2)
  const ids = Object.entries(series.nodes)
    .filter(([id, n]) => n.parent === parent && series.values[id].filter((v) => v !== null).length >= min)
    .map(([id]) => id)
  const latest = (id: string) => [...series.values[id]].reverse().find((v) => v !== null) ?? 0
  if (parent === 'root') return ids.sort((a, b) => AREA_ORDER.indexOf(a) - AREA_ORDER.indexOf(b))
  return ids.sort((a, b) => latest(b) - latest(a))
}

function cellText(unit: Unit, point: SeriesPoint, lang: Lang): string {
  if (point.value === null) return '—'
  const e = point.entry
  if (unit === 'perPerson') return formatPersonal(point.value / e.population, lang)
  if (unit === 'gdp') return formatGdpPercent(point.value / e.gdp, lang)
  if (unit === 'share') return formatPercent(point.value / e.publicTotal, lang)
  return formatMoney(point.value, lang)
}

export function Compare({ datasets }: { datasets: DatasetIndexEntry[] }) {
  const t = useT()
  const lang = useLang()
  const text = TEXT[lang]
  const route = useRoute()
  const families = (['functions', 'ministries', 'cofog'] as DatasetFamily[]).filter((f) => datasets.filter((d) => d.family === f).length > 1)
  const family = (families as string[]).includes(route.params.f) ? (route.params.f as DatasetFamily) : (families[0] ?? 'functions')
  const series = useSeries(family)
  const unit = unitFromParam(route.params.m)
  const focus = route.params.n
  /** Rows the viewer opened or closed, relative to the default (closed, except the focused category's ancestors). */
  const [toggled, setToggled] = useState<Set<string>>(() => new Set())
  const data = series.status === 'ready' ? series.value : null

  const setParam = (params: Record<string, string>) => navigate({ page: 'compare', params: { ...route.params, ...params } }, { replace: true })

  if (series.status === 'loading') return <p className="page-status">{t('loading')}</p>
  if (series.status === 'error') return <p className="page-status">{t('loadError')}</p>
  if (!data) return <p className="page-status">{text.none}</p>

  const entries = data.datasets.map((id) => datasets.find((d) => d.id === id)!).filter(Boolean)
  const years = [...new Set(entries.map((e) => e.year))]
  // The total row is always followed by the areas; every other row can be opened.
  const childrenOf = (id: string) => (id === 'root' ? [] : rowChildren(data, id))
  // A category linked to from "Spending" starts visible: its ancestors are open.
  const ancestors = new Set<string>()
  for (let id = focus ? data.nodes[focus]?.parent : null; id && id !== 'root'; id = data.nodes[id]?.parent ?? null) ancestors.add(id)
  const isOpen = (id: string) => ancestors.has(id) !== toggled.has(id)
  const allIds = Object.keys(data.nodes).filter((id) => childrenOf(id).length > 0)
  const allOpen = allIds.length > 0 && allIds.every(isOpen)

  const toggle = (id: string) =>
    setToggled((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  /** Opens or closes every row (toggles are relative to the default). */
  const setAll = (openAll: boolean) => setToggled(new Set(allIds.filter((id) => ancestors.has(id) !== openAll)))

  const renderRow = (id: string, depth: number): ReactNode => {
    const node = data.nodes[id]
    const points = pointsFor(data, datasets, id) ?? []
    const kids = childrenOf(id)
    const expanded = kids.length > 0 && isOpen(id)
    return (
      <Fragment key={id}>
        <tr className={[depth === 0 && 'total-row', id === focus && 'focus'].filter(Boolean).join(' ') || undefined}>
          <th scope="row" style={{ paddingLeft: 8 + depth * 18 }}>
            <span className="cat-cell">
              {kids.length > 0 ? (
                <button
                  type="button"
                  className="row-toggle"
                  aria-expanded={expanded}
                  aria-label={fill(expanded ? text.collapse : text.expand, { name: node.name[lang] })}
                  onClick={() => toggle(id)}
                >
                  <span aria-hidden="true">{expanded ? '▾' : '▸'}</span>
                </button>
              ) : (
                <span className="row-toggle-space" aria-hidden="true" />
              )}
              <span>{node.name[lang]}</span>
            </span>
          </th>
          {points.map((p) => {
            const rate = executionRate(points, p)
            return (
              <td key={p.entry.id} className={p.entry.kind === 'actual' ? 'actual' : undefined}>
                {p.value === null ? (
                  <span className="muted">—</span>
                ) : (
                  <a
                    href={`#/explore?d=${p.entry.id}&n=${id}`}
                    title={fill(text.open, { name: node.name[lang], dataset: `${p.entry.year} ${STAGE_LABEL[p.entry.stage][lang]}` })}
                    onClick={(e) => {
                      e.preventDefault()
                      navigate({ page: 'explore', params: { d: p.entry.id, n: id === 'root' ? '' : id, m: unit === 'share' ? '' : UNIT_PARAM[unit] } })
                    }}
                  >
                    {cellText(unit, p, lang)}
                  </a>
                )}
                {rate !== null && (
                  <span className="cell-rate">
                    {formatPercent(rate, lang)} {text.planShare}
                  </span>
                )}
              </td>
            )
          })}
        </tr>
        {expanded && kids.map((k) => renderRow(k, depth + 1))}
      </Fragment>
    )
  }

  return (
    <div className="compare">
      <h1 className="page-title">{text.title}</h1>
      <p className="muted compare-intro">{text.intro}</p>
      <div className="toolbar">
        {families.length > 1 && (
          <Segmented<DatasetFamily>
            label={t('breakdown')}
            value={family}
            onChange={(f) => setParam({ f, n: '' })}
            options={families.map((f) => ({ value: f, label: FAMILY_LABEL[f][lang] }))}
          />
        )}
        <Segmented<Unit>
          label={text.unit}
          value={unit}
          onChange={(u) => setParam({ m: UNIT_PARAM[u] })}
          options={[
            { value: 'total', label: text.total },
            { value: 'perPerson', label: text.perPerson },
            { value: 'gdp', label: text.gdp },
            { value: 'share', label: text.share },
          ]}
        />
        <button type="button" className="link-btn" onClick={() => setAll(!allOpen)}>
          {allOpen ? text.collapseAll : text.expandAll}
        </button>
      </div>

      <div className="table-scroll">
        <table className="compare-table">
          <thead>
            <tr>
              <th scope="col" rowSpan={2} className="cat-head">
                {text.category}
              </th>
              {years.map((y) => (
                <th key={y} scope="colgroup" colSpan={entries.filter((e) => e.year === y).length} className="year-head">
                  {y}
                </th>
              ))}
            </tr>
            <tr>
              {entries.map((e) => (
                <th key={e.id} scope="col" title={STAGE_HINT[e.stage][lang]} className={e.kind === 'actual' ? 'actual' : undefined}>
                  {STAGE_LABEL[e.stage][lang]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {renderRow('root', 0)}
            {rowChildren(data, 'root').map((id) => renderRow(id, 1))}
          </tbody>
        </table>
      </div>

      <ul className="compare-notes muted small">
        {text.notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </div>
  )
}
