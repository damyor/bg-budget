import { useState } from 'react'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { ChildList } from '../components/ChildList'
import { DatasetPicker } from '../components/DatasetPicker'
import { Donut } from '../components/Donut'
import { SearchBox } from '../components/SearchBox'
import { Segmented } from '../components/Segmented'
import { TrendChart } from '../components/TrendChart'
import { useDataset } from '../lib/data'
import { findEntry, STAGE_LABEL } from '../lib/datasets'
import { formatGdpPercent, formatPercent, moneyParts } from '../lib/format'
import { useLang, useT } from '../lib/i18n'
import { navigate, routeUrl, useRoute, type Route } from '../lib/route'
import { pointsFor, useSeries, type SeriesPoint } from '../lib/series'
import { useTaxesByYear } from '../lib/taxProfile'
import { OTHER_SUFFIX, parentOf, pathTo, slicesFor } from '../lib/tree'
import { publicTotal, type DatasetIndexEntry } from '../lib/types'
import { MODE_PARAM, formatPersonal, modeFromParam, valueScale, type ValueMode } from '../lib/valueMode'

export function Explorer({ datasets }: { datasets: DatasetIndexEntry[] }) {
  const t = useT()
  const lang = useLang()
  const route = useRoute()
  const entry = findEntry(datasets, route.params.d)
  const loaded = useDataset(entry)
  const series = useSeries(entry.family)
  const taxesByYear = useTaxesByYear()
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  if (loaded.status === 'loading') return <p className="page-status">{t('loading')}</p>
  if (loaded.status === 'error') return <p className="page-status">{t('loadError')}</p>

  const { dataset, tree } = loaded.value
  const myTaxes = taxesByYear(dataset.year)
  const requested = route.params.n
  const nodeId = requested && tree.byId.has(requested) ? requested : 'root'
  // The selected node; a leaf is shown inside its parent's ring, highlighted.
  const node = tree.byId.get(nodeId)!.node
  const isLeaf = !node.children?.length
  const path = pathTo(tree, nodeId)
  const parent = parentOf(tree, nodeId)
  const view = isLeaf && parent ? parent : node
  const viewParent = parentOf(tree, view.id)
  const viewSlices = slicesFor(view)
  const leafSliceId = isLeaf
    ? (viewSlices.find((sl) => sl.node.id === nodeId) ?? viewSlices.find((sl) => sl.slot === 'other'))?.node.id ?? null
    : null

  const mode = modeFromParam(route.params.m)
  const effectiveMode: ValueMode = mode === 'mine' && myTaxes === null ? 'total' : mode
  const values = valueScale(effectiveMode, dataset, lang, myTaxes)

  const go = (params: Partial<Record<'d' | 'n' | 'm', string>>, replace = false) => {
    const next: Route = { page: 'explore', params: { ...route.params, ...params } }
    if (next.params.n === 'root') next.params.n = ''
    navigate(next, { replace })
  }
  // Clicking a category opens it; clicking the selected leaf again deselects it.
  const open = (id: string) => {
    setHoveredId(null)
    go({ n: id === nodeId && isLeaf ? view.id : id })
  }

  const allSpending = publicTotal(dataset)
  const partial = allSpending !== dataset.root.value
  const shareOfAll = node.value / allSpending
  const hero = moneyParts(values.scale(node.value), lang)
  const depth = path.length - 1
  const levelName = depth > 0 ? (node.kind ?? dataset.levels[depth - 1])?.[lang] ?? null : null

  const clipRoute: Route = { page: 'clip', params: { d: dataset.id, n: nodeId === 'root' ? '' : nodeId } }

  // The same category in the other years and versions of this breakdown.
  const points = series.status === 'ready' && series.value && !nodeId.endsWith(OTHER_SUFFIX) ? pointsFor(series.value, datasets, nodeId) : null
  const trendScale = (p: SeriesPoint) => {
    if (p.value === null) return null
    const taxes = taxesByYear(p.entry.year)
    return valueScale(effectiveMode, p.entry, lang, taxes).scale(p.value)
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(routeUrl({ page: 'explore', params: route.params }))
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard blocked — the address bar still has the link */
    }
  }

  return (
    <div className="explorer">
      <div className="toolbar">
        {/* Datasets share their node ids, so the selected category survives a switch when it exists. */}
        <DatasetPicker datasets={datasets} value={dataset.id} onChange={(d) => go({ d })} />
      </div>
      <div className="toolbar">
        <Segmented<ValueMode>
          label={t('show')}
          value={effectiveMode}
          onChange={(m) => go({ m: MODE_PARAM[m] }, true)}
          options={[
            { value: 'total', label: t('modeTotal') },
            { value: 'perPerson', label: t('modePerPerson') },
            { value: 'gdp', label: t('modeGdp'), title: t('modeGdpHint') },
            {
              value: 'mine',
              label: t('modeMine'),
              disabled: myTaxes === null,
              title: myTaxes === null ? t('modeMineHint') : undefined,
            },
          ]}
        />
        <SearchBox tree={tree} globalShortcut onSelect={(hit) => open(hit.node.id)} />
      </div>

      <Breadcrumbs path={path} onSelect={(id) => go({ n: id })} />

      <div className="explorer-grid">
        <section className="chart-card" aria-label={view.name[lang]}>
          <Donut
            tree={tree}
            nodeId={view.id}
            onOpen={open}
            onUp={viewParent ? () => go({ n: viewParent.id }) : null}
            hoveredId={hoveredId ?? leafSliceId}
            onHover={setHoveredId}
            formatValue={values.format}
            center={
              <>
                <span className="center-name">{view.name[lang]}</span>
                <span className="center-value">{effectiveMode === 'gdp' ? formatGdpPercent(values.scale(view.value), lang) : values.format(view.value)}</span>
                {effectiveMode === 'gdp' ? (
                  <span className="center-share">{t('ofGdp')}</span>
                ) : (
                  (view !== tree.root || partial) && <span className="center-share">{formatPercent(view.value / allSpending, lang)}</span>
                )}
              </>
            }
          />
        </section>

        <section className="detail-card">
          {levelName && <p className="eyebrow">{levelName}</p>}
          <h1 className="detail-title">{node.name[lang]}</h1>
          <p className="hero-figure">
            {effectiveMode === 'gdp' ? (
              <>
                {formatGdpPercent(values.scale(node.value), lang)}
                <span className="hero-unit"> {t('ofGdp')}</span>
              </>
            ) : effectiveMode === 'total' && lang === 'bg' ? (
              <>
                {hero.number}
                <span className="hero-unit"> {hero.scale ? `${hero.scale} €` : '€'}</span>
              </>
            ) : effectiveMode === 'total' ? (
              <>
                €{hero.number}
                {hero.scale && <span className="hero-unit"> {hero.scale}</span>}
              </>
            ) : (
              values.format(node.value)
            )}
          </p>
          <p className="hero-context muted small">
            {dataset.year} · {STAGE_LABEL[dataset.stage][lang]}
            {dataset.sourceCurrency === 'BGN' && ` · ${t('convertedFromLeva')}`}
          </p>
          <ul className="facts">
            {effectiveMode === 'perPerson' && <li>{t('perPersonYear')}</li>}
            {effectiveMode === 'mine' && myTaxes !== null && (
              <li>
                {t('fromMyTaxesYear', { year: dataset.year })} · <strong>{formatPersonal(values.scale(node.value) / 12, lang)}</strong> {t('perMonth')}
              </li>
            )}
            {effectiveMode !== 'total' && (
              <li>
                <strong>{moneyParts(node.value, lang).text}</strong> {t('inTotal')}
              </li>
            )}
            {(depth > 0 || partial) && (
              <li>
                <strong>{formatPercent(shareOfAll, lang)}</strong> {t('ofAll')}
              </li>
            )}
            {parent && depth > 1 && (
              <li>
                <strong>{formatPercent(node.value / parent.value, lang)}</strong> {t('ofParent', { parent: parent.name[lang] })}
              </li>
            )}
            {effectiveMode !== 'gdp' && (
              <li>
                <strong>{formatGdpPercent(node.value / dataset.gdp, lang)}</strong> {t('ofGdp')}
              </li>
            )}
            {effectiveMode === 'total' && (
              <>
                <li>
                  <strong>{formatPersonal(node.value / dataset.population, lang)}</strong> {t('perPersonYear')}
                </li>
                <li>
                  <strong>{moneyParts(node.value / 365, lang).text}</strong> {t('perDayCountry')}
                </li>
              </>
            )}
          </ul>
          {node.note && <p className="note">{node.note[lang]}</p>}
          {isLeaf && node !== tree.root && <p className="muted small">{t('noDeeper')}</p>}
          <div className="actions">
            <button type="button" className="btn btn-primary" onClick={() => navigate(clipRoute)}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <rect x="2.5" y="4.5" width="11" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <path d="M13.5 8.5l4-2.5v8l-4-2.5z" fill="currentColor" />
              </svg>
              {t('makeClip')}
            </button>
            <button type="button" className="btn" onClick={copyLink}>
              {copied ? t('copied') : t('copyLink')}
            </button>
          </div>

          {points && points.filter((p) => p.value !== null).length > 1 && (
            <section className="trend-section" aria-labelledby="trend-title">
              <div className="section-head">
                <h2 id="trend-title" className="group-title">
                  {t('trendTitle')}
                </h2>
                <a
                  href={`#/compare?f=${dataset.family}&n=${encodeURIComponent(nodeId)}`}
                  className="small"
                  onClick={(e) => {
                    e.preventDefault()
                    navigate({ page: 'compare', params: { f: dataset.family, n: nodeId === 'root' ? '' : nodeId, m: MODE_PARAM[effectiveMode] } })
                  }}
                >
                  {t('compareAll')} →
                </a>
              </div>
              <TrendChart points={points} currentId={dataset.id} mode={effectiveMode} scale={trendScale} onSelect={(d) => go({ d })} />
            </section>
          )}

          <ChildList
            node={view}
            selectedId={isLeaf ? nodeId : null}
            hoveredId={hoveredId}
            onHover={setHoveredId}
            onOpen={open}
            formatValue={values.format}
          />
        </section>
      </div>

      <footer className="dataset-footer">
        <p>{dataset.description[lang]}</p>
        {partial && <p>{t('partialNote', { total: moneyParts(allSpending, lang).text })}</p>}
        <p>
          {dataset.gdpNote[lang]}: {moneyParts(dataset.gdp, lang).text}. {dataset.populationNote[lang]}.
        </p>
        <p>
          {t('source')}:{' '}
          {dataset.sources.map((s, i) => (
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
