import { useLang } from '../lib/i18n'
import { seriesVar } from '../lib/palette'
import { slicesFor } from '../lib/tree'
import type { BudgetNode } from '../lib/types'

interface Props {
  path: BudgetNode[]
  onSelect: (id: string) => void
}

/** Path from the root to the current node; each step keeps the colour it had one level up. */
export function Breadcrumbs({ path, onSelect }: Props) {
  const lang = useLang()
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {path.map((node, i) => {
          const parent = path[i - 1]
          const slot = parent ? slicesFor(parent).find((s) => s.node.id === node.id)?.slot ?? 'other' : null
          const last = i === path.length - 1
          return (
            <li key={node.id}>
              {slot !== null && <span className="crumb-key" style={{ background: seriesVar(slot) }} aria-hidden="true" />}
              {last ? (
                <span aria-current="page">{node.name[lang]}</span>
              ) : (
                <button type="button" onClick={() => onSelect(node.id)}>
                  {node.name[lang]}
                </button>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
