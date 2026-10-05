import { formatMoney } from '../lib/format'
import { useLang } from '../lib/i18n'
import { formatFilters, linksFor, linkText } from '../lib/listData'
import { useDatasetLinks } from '../lib/lists'
import { navigate } from '../lib/route'
import type { Dataset } from '../lib/types'

interface Props {
  dataset: Dataset
  nodeId: string
  /** The dataset has list links (DatasetIndexEntry.lists); otherwise none are loaded. */
  enabled: boolean
}

/**
 * Links from a tree node to the rows of a list that belong to it, e.g.
 * "34 investment projects, €842 m in 2026 →" or "Who gets paid: €1.2 bn in 2025 →".
 * Projects and payments never become slices.
 */
export function ListLinks({ dataset, nodeId, enabled }: Props) {
  const lang = useLang()
  const index = useDatasetLinks(enabled ? dataset.id : null)
  if (!enabled || index.status !== 'ready') return null
  const links = linksFor(index.value, dataset, nodeId)
  if (!links.length) return null
  return (
    <ul className="list-links">
      {links.map((link) => {
        const params = { l: link.list.id, f: formatFilters(link.filters), d: dataset.id }
        return (
          <li key={`${link.list.id}:${link.column}:${formatFilters(link.filters)}`}>
            <a
              href={`#/lists?${new URLSearchParams(params)}`}
              onClick={(e) => {
                e.preventDefault()
                navigate({ page: 'lists', params })
              }}
            >
              <span className="list-link-text">{linkText(link, lang, (v) => formatMoney(v, lang))}</span>
              <span aria-hidden="true" className="list-link-arrow">
                →
              </span>
              <span className="list-link-source">{link.list.title[lang]}</span>
            </a>
          </li>
        )
      })}
    </ul>
  )
}
