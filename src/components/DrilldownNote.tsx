import { useLang, useT } from '../lib/i18n'
import { drilldownNote, refSource } from '../lib/nodeNotes'
import type { BudgetNode, Dataset } from '../lib/types'

interface Props {
  node: BudgetNode
  parent: BudgetNode | null
  dataset: Dataset
  leaf: boolean
}

/**
 * How far a box goes: where its amount comes from when a later split added it, and whether it is computed as a
 * remainder, the finest level so far, or a box the sources go no further on (data/drilldown/ledger.json).
 */
export function DrilldownNote({ node, parent, dataset, leaf }: Props) {
  const t = useT()
  const lang = useLang()
  const source = refSource(node, dataset, lang)
  const note = drilldownNote(node, { leaf, parent }, lang)
  if (!source && !note) return null
  return (
    <>
      {source && (
        <p className="muted small drilldown-source">
          {t('refSource')}:{' '}
          {source.url ? (
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.name}
            </a>
          ) : (
            source.name
          )}
          {source.basis && ` — ${source.basis}`}
        </p>
      )}
      {note && <p className="muted small drilldown-note">{note}</p>}
    </>
  )
}
