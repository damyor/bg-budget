import { translate } from './i18n.ts'
import type { BudgetNode, Dataset, Lang, NodeStatus } from './types.ts'

const LOCALE: Record<Lang, string> = { bg: 'bg-BG', en: 'en-GB' }

/** An ISO date as people write it: "5 октомври 2026 г." / "5 October 2026". */
export function formatDate(iso: string, lang: Lang): string {
  const date = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
}

/** What a ledger state says about finer data (final says nothing of its own). */
function stateText(status: NodeStatus, lang: Lang): string | null {
  switch (status.state) {
    case 'todo':
      return translate(lang, 'statusTodo')
    case 'no-source':
      return status.checked ? translate(lang, 'statusNoSource', { date: formatDate(status.checked, lang) }) : translate(lang, 'statusNoSourceUndated')
    case 'blocked':
      return translate(lang, 'statusBlocked')
    case 'final':
      return null
  }
}

/**
 * The note under a box about how far its breakdown goes: a remainder says it is computed, a leaf that it is the
 * finest level so far (unless the ledger says why); then the ledger's state and its note. Null when there is nothing
 * to say (a box with parts and no ledger entry).
 */
export function drilldownNote(node: BudgetNode, { leaf, parent }: { leaf: boolean; parent: BudgetNode | null }, lang: Lang): string | null {
  const status = node.status
  const parts: (string | null)[] = []
  if (node.rest && parent) parts.push(translate(lang, 'remainderNote', { parent: parent.name[lang] }))
  else if (leaf && parent && (!status || status.state === 'todo')) parts.push(translate(lang, 'finestLevel'))
  if (status) parts.push(stateText(status, lang), status.note?.[lang] ?? null)
  const text = parts.filter(Boolean).join(' ')
  return text || null
}

/** Where a box's amount comes from when a parts file or graft added it: the source and how it relates to the box. */
export function refSource(node: BudgetNode, dataset: Pick<Dataset, 'refs'>, lang: Lang): { name: string; url?: string; basis: string | null } | null {
  const ref = node.ref ? dataset.refs?.[node.ref] : undefined
  if (!ref) return null
  const basis = ref.basis === 'mapped' ? translate(lang, 'refMapped') : ref.basis === 'payments' ? translate(lang, 'refPayments') : null
  return { name: ref.name[lang], url: ref.url, basis }
}
