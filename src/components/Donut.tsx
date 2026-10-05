import { arc as d3arc } from 'd3-shape'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { layoutSlices, staticArcs, sweepArcs, zoomArcs, type DrawArc, type LaidSlice } from '../lib/donutLayout'
import { formatPercent } from '../lib/format'
import { useLang, useT } from '../lib/i18n'
import { arcFill, inkOn, seriesHex, seriesVar } from '../lib/palette'
import { useSettings } from '../lib/settings'
import { foldChildren, type TreeIndex } from '../lib/tree'
import type { BudgetNode } from '../lib/types'

const ZOOM_MS = 750
const SWEEP_MS = 650
const GAP_PX = 2
const LIFT_PX = 8

interface Animation {
  kind: 'in' | 'out' | 'sweep'
  parent: LaidSlice[]
  focus: LaidSlice | null
  children: LaidSlice[]
  startedAt: number
  duration: number
}

interface Props {
  tree: TreeIndex
  nodeId: string
  onOpen: (id: string) => void
  onUp: (() => void) | null
  hoveredId: string | null
  onHover: (id: string | null) => void
  formatValue: (value: number) => string
  center: ReactNode
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Finds the slice of `parent`'s layout that contains `childId` (itself or its "Other" bucket). */
function containingSlice(slices: LaidSlice[], parentNode: BudgetNode, childId: string): LaidSlice | undefined {
  const direct = slices.find((s) => s.node.id === childId)
  if (direct) return direct
  const { tail } = foldChildren(parentNode)
  return tail.some((c) => c.id === childId) ? slices.find((s) => s.slot === 'other') : undefined
}

export function Donut({ tree, nodeId, onOpen, onUp, hoveredId, onHover, formatValue, center }: Props) {
  const t = useT()
  const lang = useLang()
  const { mode } = useSettings()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState(440)
  const [shown, setShown] = useState<{ tree: TreeIndex; nodeId: string; slices: LaidSlice[] }>(() => {
    const node = tree.byId.get(nodeId)?.node ?? tree.root
    return { tree, nodeId: node.id, slices: layoutSlices(node) }
  })
  const [anim, setAnim] = useState<Animation | null>(null)
  const [progress, setProgress] = useState(1)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: BudgetNode; share: number } | null>(null)

  // Track the rendered size so the gap stays 2 px regardless of scale.
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setSize(Math.max(220, Math.min(560, entry.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Decide how to animate when the requested node changes.
  useLayoutEffect(() => {
    const next = tree.byId.get(nodeId)?.node ?? tree.root
    if (next.id === shown.nodeId && tree === shown.tree) return
    // Zoom only within the same dataset; a new dataset sweeps in.
    const current = tree === shown.tree ? tree.byId.get(shown.nodeId)?.node : undefined
    const nextSlices = layoutSlices(next)
    const reduced = prefersReducedMotion()
    const now = performance.now()

    const focusIn = current && shown.slices.find((s) => s.node.id === next.id)
    const focusOut = current && containingSlice(nextSlices, next, current.id)
    if (focusIn && !reduced) {
      setAnim({ kind: 'in', parent: shown.slices, focus: focusIn, children: nextSlices, startedAt: now, duration: ZOOM_MS })
    } else if (focusOut && !reduced) {
      setAnim({ kind: 'out', parent: nextSlices, focus: focusOut, children: shown.slices, startedAt: now, duration: ZOOM_MS })
    } else if (!reduced) {
      setAnim({ kind: 'sweep', parent: [], focus: null, children: nextSlices, startedAt: now, duration: SWEEP_MS })
    }
    setShown({ tree, nodeId: next.id, slices: nextSlices })
    setProgress(reduced ? 1 : 0)
    setTooltip(null)
  }, [nodeId, shown, tree])

  useEffect(() => {
    if (!anim) return
    let frame = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - anim.startedAt) / anim.duration)
      setProgress(p)
      if (p < 1) frame = requestAnimationFrame(tick)
      else setAnim(null)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [anim])

  const animating = anim !== null
  const arcs: DrawArc[] = useMemo(() => {
    if (!anim) return staticArcs(shown.slices)
    if (anim.kind === 'sweep') return sweepArcs(anim.children, progress)
    const tt = anim.kind === 'in' ? progress : 1 - progress
    return zoomArcs(anim.parent, anim.focus!, anim.children, tt)
  }, [anim, progress, shown.slices])

  const radius = size / 2
  const outer = radius - LIFT_PX - 2
  const inner = outer * 0.62
  const path = useMemo(
    () =>
      d3arc<{ start: number; end: number; lift: number }>()
        .innerRadius(inner)
        .outerRadius((d) => outer + d.lift)
        .startAngle((d) => d.start)
        .endAngle((d) => d.end)
        .padAngle(GAP_PX / outer)
        .padRadius(outer)
        .cornerRadius(3),
    [inner, outer],
  )

  const total = shown.slices.reduce((s, sl) => s + sl.node.value, 0)
  const currentNode = shown.tree.byId.get(shown.nodeId)?.node ?? shown.tree.root
  const canOpen = (node: BudgetNode) => Boolean(node.children?.length)

  const showTooltip = (node: BudgetNode, x: number, y: number) => {
    setTooltip({ x, y, node, share: total ? node.value / total : 0 })
    onHover(node.id)
  }

  const onKey = (e: KeyboardEvent, node: BudgetNode) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpen(node.id)
    }
  }

  return (
    <div className="donut" ref={wrapRef}>
      <div className="donut-stage" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`${-radius} ${-radius} ${size} ${size}`}
          role="group"
          aria-label={t('chartLabel', { name: currentNode.name[lang] })}
        >
          {arcs.map((a) => {
            const hovered = !animating && hoveredId === a.node.id
            const dimmed = !animating && hoveredId !== null && !hovered && arcs.some((x) => x.node.id === hoveredId)
            const d = path({ start: a.start, end: a.end, lift: hovered ? LIFT_PX : 0 }) ?? ''
            const share = total ? a.node.value / total : 0
            const label = t('sliceLabel', { name: a.node.name[lang], amount: formatValue(a.node.value), share: formatPercent(share, lang) })
            const interactive = !animating && a.incoming
            return (
              <path
                key={a.key}
                d={d}
                fill={a.blendFrom !== undefined && (a.blend ?? 1) < 1 ? arcFill(a.slot, mode, a.blendFrom, a.blend) : seriesVar(a.slot)}
                opacity={a.opacity * (dimmed ? 0.4 : 1)}
                className="slice"
                tabIndex={interactive ? 0 : -1}
                role="button"
                aria-label={label}
                onPointerMove={interactive ? (e) => showTooltip(a.node, e.clientX, e.clientY) : undefined}
                onPointerLeave={() => {
                  setTooltip(null)
                  onHover(null)
                }}
                onClick={interactive ? () => onOpen(a.node.id) : undefined}
                onKeyDown={interactive ? (e) => onKey(e, a.node) : undefined}
                onFocus={
                  interactive
                    ? (e) => {
                        const r = e.currentTarget.getBoundingClientRect()
                        showTooltip(a.node, r.left + r.width / 2, r.top + r.height / 2)
                      }
                    : undefined
                }
                onBlur={() => {
                  setTooltip(null)
                  onHover(null)
                }}
              />
            )
          })}
          {!animating &&
            arcs.map((a) => {
              // Direct labels only where the percentage fits inside the slice.
              const share = total ? a.node.value / total : 0
              const mid = (inner + outer) / 2
              if ((a.end - a.start) * mid < 46 || outer - inner < 30) return null
              const angle = (a.start + a.end) / 2
              const x = Math.sin(angle) * mid
              const y = -Math.cos(angle) * mid
              return (
                <text
                  key={`l:${a.key}`}
                  x={x}
                  y={y}
                  className="slice-label"
                  fill={inkOn(seriesHex(a.slot, mode))}
                  textAnchor="middle"
                  dominantBaseline="central"
                  aria-hidden="true"
                >
                  {formatPercent(share, lang)}
                </text>
              )
            })}
        </svg>
        <div className="donut-center" style={{ width: inner * 1.5, height: inner * 1.5 }}>
          {center}
          {onUp && (
            <button type="button" className="donut-up" onClick={onUp}>
              <span aria-hidden="true">↑</span> {t('up')}
            </button>
          )}
        </div>
      </div>
      {tooltip && (
        <div className="tooltip" style={{ left: tooltip.x, top: tooltip.y }} role="status">
          <strong>{formatValue(tooltip.node.value)}</strong>
          <span className="tooltip-share">{formatPercent(tooltip.share, lang)}</span>
          <span className="tooltip-name">{tooltip.node.name[lang]}</span>
          {canOpen(tooltip.node) && <span className="tooltip-hint">{t('openDetails')}</span>}
        </div>
      )}
    </div>
  )
}
