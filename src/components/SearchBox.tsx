import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { formatMoney } from '../lib/format'
import { useLang, useT } from '../lib/i18n'
import { searchNodes, type SearchHit, type TreeIndex } from '../lib/tree'

interface Props {
  tree: TreeIndex
  onSelect: (hit: SearchHit) => void
  placeholder?: string
  /** Focus with "/" or Ctrl/⌘+K. */
  globalShortcut?: boolean
  autoFocus?: boolean
}

export function SearchBox({ tree, onSelect, placeholder, globalShortcut = false, autoFocus = false }: Props) {
  const t = useT()
  const lang = useLang()
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const hits = useMemo(() => searchNodes(tree, query, lang, 10), [tree, query, lang])

  useEffect(() => {
    if (!globalShortcut) return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const typing = target.closest('input, textarea, select, [contenteditable="true"]')
      if ((e.key === '/' && !typing) || (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [globalShortcut])

  const choose = (hit: SearchHit | undefined) => {
    if (!hit) return
    onSelect(hit)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  const expanded = open && query.trim().length > 0
  return (
    <div className="search">
      <svg className="search-icon" viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-label={t('searchLabel')}
        aria-expanded={expanded}
        aria-controls={`${id}-list`}
        aria-activedescendant={expanded && hits[active] ? `${id}-${active}` : undefined}
        aria-autocomplete="list"
        placeholder={placeholder ?? t('searchPlaceholder')}
        value={query}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((a) => Math.min(hits.length - 1, a + 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => Math.max(0, a - 1))
          } else if (e.key === 'Enter') {
            e.preventDefault()
            choose(hits[active])
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
      />
      {expanded && (
        <ul className="search-results" id={`${id}-list`} role="listbox">
          {hits.length === 0 && <li className="search-empty">{t('searchEmpty')}</li>}
          {hits.map((hit, i) => (
            <li
              key={hit.node.id}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'active' : undefined}
              onPointerDown={(e) => {
                e.preventDefault()
                choose(hit)
              }}
              onPointerEnter={() => setActive(i)}
            >
              <span className="hit-name">{hit.node.name[lang]}</span>
              <span className="hit-value">{formatMoney(hit.node.value, lang)}</span>
              <span className="hit-path">
                {hit.path
                  .slice(1, -1)
                  .map((n) => n.name[lang])
                  .join(' › ')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
