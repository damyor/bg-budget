import { useLayoutEffect, useRef, useState } from 'react'
import { STAGE_LABEL } from '../lib/datasets'
import { formatPercent } from '../lib/format'
import { useLang, useT } from '../lib/i18n'
import { executionRate, type SeriesPoint } from '../lib/series'
import { compactScale, type ValueMode } from '../lib/valueMode'

interface Props {
  points: SeriesPoint[]
  /** The dataset on screen; its column is marked. */
  currentId: string
  mode: ValueMode
  /** Value of a point in the unit on screen (EUR, or a share of GDP), null when missing. */
  scale: (point: SeriesPoint) => number | null
  onSelect: (datasetId: string) => void
}

const PLOT_H = 112
const TOP = 6
const AXIS_H = 14
const BAR_MAX = 24
const GAP = 2
/** Share of the width taken by the table's row labels; the chart's columns sit above the table's year columns. */
const GUTTER = 0.3

const isPlan = (p: SeriesPoint) => p.entry.kind === 'plan'

/**
 * Columns per year — the plan (or forecast) and the actual outturn side by
 * side — in the unit chosen on the page, with the exact values in a small
 * table underneath. Hovering or focusing a column highlights its value;
 * clicking switches to that dataset.
 */
export function TrendChart({ points, currentId, mode, scale, onSelect }: Props) {
  const t = useT()
  const lang = useLang()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(480)
  const [hover, setHover] = useState<string | null>(null)

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Only versions where the category exists: a level that only the plans itemise shows no empty "actual" row.
  const shown = points.filter((p) => p.value !== null)
  const years = [...new Set(shown.map((p) => p.entry.year))].sort((a, b) => a - b)
  const groups = years.map((year) => shown.filter((p) => p.entry.year === year).sort((a, b) => Number(isPlan(b)) - Number(isPlan(a))))
  const scaled = new Map(shown.map((p) => [p.entry.id, scale(p)]))
  const max = Math.max(...[...scaled.values()].map((v) => v ?? 0)) || 1
  const cells = compactScale(mode, max, lang)
  const gutter = width * GUTTER
  const slot = (width - gutter) / years.length
  const bar = Math.min(BAR_MAX, (slot * 0.6 - GAP) / 2)
  const height = TOP + PLOT_H + AXIS_H
  const hasActual = shown.some((p) => !isPlan(p))
  const hasPlan = shown.some(isPlan)

  const columnProps = (p: SeriesPoint) => ({
    onPointerEnter: () => setHover(p.entry.id),
    onPointerLeave: () => setHover(null),
    onFocus: () => setHover(p.entry.id),
    onBlur: () => setHover(null),
    onClick: () => onSelect(p.entry.id),
  })

  return (
    <div className="trend" ref={wrapRef}>
      <svg width={width} height={height} aria-hidden="true">
        <text x={0} y={TOP + 10} className="trend-unit">
          {cells.unit}
        </text>
        <line x1={gutter} x2={width} y1={TOP + PLOT_H + 0.5} y2={TOP + PLOT_H + 0.5} className="trend-axis" />
        {groups.map((group, gi) => {
          const groupWidth = group.length * bar + (group.length - 1) * GAP
          const x0 = gutter + gi * slot + (slot - groupWidth) / 2
          return (
            <g key={years[gi]}>
              {group.map((p, i) => {
                const v = scaled.get(p.entry.id)
                const x = x0 + i * (bar + GAP)
                const h = v ? Math.max(2, (v / max) * PLOT_H) : 0
                const y = TOP + PLOT_H - h
                const r = Math.min(4, bar / 2, h)
                return (
                  <g key={p.entry.id} className={`trend-col${hover === p.entry.id ? ' active' : ''}`} {...columnProps(p)}>
                    {/* The hit area is the whole column, not just the painted bar. */}
                    <rect x={x - GAP / 2} y={0} width={bar + GAP} height={TOP + PLOT_H} fill="transparent" />
                    {v !== null && (
                      <path
                        className={isPlan(p) ? 'bar plan' : 'bar actual'}
                        d={`M${x},${TOP + PLOT_H}V${y + r}a${r},${r} 0 0 1 ${r},${-r}H${x + bar - r}a${r},${r} 0 0 1 ${r},${r}V${TOP + PLOT_H}Z`}
                      />
                    )}
                    {p.entry.id === currentId && <circle cx={x + bar / 2} cy={TOP + PLOT_H + 7} r={3} className="trend-current" />}
                  </g>
                )
              })}
            </g>
          )
        })}
      </svg>

      <table className="trend-table">
        <caption className="visually-hidden">{`${t('trendLabel')} (${cells.unit})`}</caption>
        <thead>
          <tr>
            <th scope="col">
              <span className="visually-hidden">{t('version')}</span>
            </th>
            {years.map((y) => (
              <th key={y} scope="col">
                {y}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[true, false].filter((plan) => (plan ? hasPlan : hasActual)).map((plan) => (
            <tr key={String(plan)}>
              <th scope="row">
                <i className={`key ${plan ? 'plan' : 'actual'}`} aria-hidden="true" />
                {plan ? t('trendPlan') : t('trendActual')}
                {!plan && <span className="trend-rate">{t('trendRateHint')}</span>}
              </th>
              {years.map((y) => {
                const p = shown.find((q) => q.entry.year === y && isPlan(q) === plan)
                const v = p ? scaled.get(p.entry.id) : null
                const rate = p ? executionRate(points, p) : null
                if (!p) return <td key={y} className="empty" />
                return (
                  <td
                    key={y}
                    className={[hover === p.entry.id && 'active', p.entry.id === currentId && 'current'].filter(Boolean).join(' ') || undefined}
                  >
                    <button type="button" {...columnProps(p)} aria-pressed={p.entry.id === currentId} title={`${y} · ${STAGE_LABEL[p.entry.stage][lang]}`}>
                      {v === null || v === undefined ? '—' : cells.format(v)}
                      {p.entry.stage === 'forecast' && <span className="trend-tag">{t('forecastShort')}</span>}
                      {rate !== null && <span className="trend-rate">{formatPercent(rate, lang)}</span>}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
