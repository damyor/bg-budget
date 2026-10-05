import { formatPercent } from '../lib/format'
import { useLang, useT } from '../lib/i18n'
import { seriesVar } from '../lib/palette'
import { slicesFor } from '../lib/tree'
import type { BudgetNode } from '../lib/types'

interface Props {
  node: BudgetNode
  /** A selected leaf among the children. */
  selectedId: string | null
  hoveredId: string | null
  onHover: (id: string | null) => void
  onOpen: (id: string) => void
  formatValue: (value: number) => string
}

/**
 * Every child of the current node with its amount and share — the readable
 * twin of the donut (and its legend). Children grouped into "Other" in the
 * donut are listed individually with a grey key.
 */
export function ChildList({ node, selectedId, hoveredId, onHover, onOpen, formatValue }: Props) {
  const t = useT()
  const lang = useLang()
  const slices = slicesFor(node)
  const other = slices.find((s) => s.slot === 'other')
  const slotOf = new Map(slices.filter((s) => s.slot !== 'other').map((s) => [s.node.id, s.slot]))
  // Same order as the donut: the shared areas in their fixed order, otherwise largest first.
  const order = new Map(slices.map((s, i) => [s.node.id, i]))
  const children = [...(node.children ?? [])].sort(
    (a, b) => (order.get(a.id) ?? slices.length) - (order.get(b.id) ?? slices.length) || b.value - a.value,
  )
  const total = children.reduce((s, c) => s + c.value, 0)
  const max = Math.max(1, ...children.map((c) => c.value))

  if (!children.length) return <p className="muted">{t('noDeeper')}</p>

  return (
    <div className="child-list">
      <div className="child-list-head" aria-hidden="true">
        <span>{t('colCategory')}</span>
        <span>{t('colAmount')}</span>
        <span>{t('colShare')}</span>
      </div>
      <ul>
        {children.map((child) => {
          const slot = slotOf.get(child.id) ?? 'other'
          // Hovering a grouped row highlights the "Other" slice it lives in.
          const sliceId = slot === 'other' && other ? other.node.id : child.id
          const open = Boolean(child.children?.length)
          const active = hoveredId === child.id || hoveredId === sliceId
          const content = (
            <>
              <span className="row-key" style={{ background: seriesVar(slot) }} aria-hidden="true" />
              <span className="row-name">
                {child.name[lang]}
                {open && <span className="row-chevron" aria-hidden="true">›</span>}
              </span>
              <span className="row-value">{formatValue(child.value)}</span>
              <span className="row-share">{formatPercent(child.value / total, lang)}</span>
              <span className="row-bar" aria-hidden="true">
                <span style={{ width: `${Math.max(0.4, (child.value / max) * 100)}%` }} />
              </span>
            </>
          )
          return (
            <li
              key={child.id}
              className={[active && 'active', selectedId === child.id && 'selected'].filter(Boolean).join(' ') || undefined}
              onPointerEnter={() => onHover(sliceId)}
              onPointerLeave={() => onHover(null)}
            >
              <button
                type="button"
                className="row-inner"
                aria-pressed={open ? undefined : selectedId === child.id}
                onClick={() => onOpen(child.id)}
              >
                {content}
              </button>
            </li>
          )
        })}
      </ul>
      {other && <p className="muted small">{t('groupedOther')}</p>}
    </div>
  )
}
