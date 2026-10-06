import { formatMoney } from '../lib/format'
import { useLang } from '../lib/i18n'
import { navigate } from '../lib/route'
import type { BudgetNode, DatasetIndexEntry } from '../lib/types'

interface Props {
  node: BudgetNode
  datasets: DatasetIndexEntry[]
  /** The value mode of the page, kept when the link is followed. */
  mode: string
}

/**
 * Links from a tree node to the same place in another dataset, e.g. from a city's transfers from the central budget
 * ("Municipalities") to its whole budget ("Big cities") and back.
 */
export function SeeAlso({ node, datasets, mode }: Props) {
  const lang = useLang()
  const links = (node.seeAlso ?? []).flatMap((link) => {
    const entry = datasets.find((d) => d.id === link.dataset)
    return entry ? [{ link, entry }] : []
  })
  if (!links.length) return null
  return (
    <ul className="list-links">
      {links.map(({ link, entry }) => {
        const params: Record<string, string> = { d: link.dataset, n: link.node, ...(mode ? { m: mode } : {}) }
        return (
          <li key={`${link.dataset}:${link.node}`}>
            <a
              href={`#/explore?${new URLSearchParams(params)}`}
              onClick={(e) => {
                e.preventDefault()
                navigate({ page: 'explore', params })
              }}
            >
              <span className="list-link-text">
                {link.text[lang]}: {formatMoney(link.value, lang)}
              </span>
              <span aria-hidden="true" className="list-link-arrow">
                →
              </span>
              <span className="list-link-source">{entry.title[lang]}</span>
            </a>
          </li>
        )
      })}
    </ul>
  )
}
