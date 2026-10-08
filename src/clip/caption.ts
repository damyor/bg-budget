// The words that go with a clip or a shared view: its headline, a one-sentence summary of the facts,
// hashtags, and a ready-to-post text for each social network. The Clip studio shows the texts; the share
// pages written by the build (scripts/sharePages.ts) use the headline and the summary for their link
// previews — which is why the imports here carry .ts extensions (the build runs this file in Node).

import { formatPercent, moneyParts } from '../lib/format.ts'
import { translate } from '../lib/i18n.ts'
import { graphemeLength, xLength } from '../lib/share.ts'
import { placeOf } from '../lib/tree.ts'
import { publicTotal, type BudgetNode, type Dataset, type DatasetFamily, type Lang, type LocalizedText } from '../lib/types.ts'
import { formatPersonal } from '../lib/valueMode.ts'

const GEOGRAPHIC = new Set(['Община', 'Municipality', 'Област (регион)', 'Province'])
/** A programme's own staff, running and capital costs ("Персонал", "Издръжка" …) only mean something with the programme. */
const DEPARTMENTAL = 'Ведомствен разход'
const GENERIC = /^(администрация|други|друго|резерв|инвестиции|издръжка|заплати|членски внос|стипендии|administration|other|contingency|investment|running costs|staff pay|membership fees|scholarships)/i

const isPlace = (node: BudgetNode) => node.kind !== undefined && GEOGRAPHIC.has(node.kind.bg)

/** A node that only makes sense together with its parent ("Administration", a municipality …). */
function needsContext(node: BudgetNode): boolean {
  return (
    (node.kind !== undefined && (GEOGRAPHIC.has(node.kind.bg) || node.kind.bg === DEPARTMENTAL)) ||
    GENERIC.test(node.name.bg) ||
    node.id.endsWith('~other')
  )
}

/** Titles for the central budget's transfers to municipalities: what a place gets, and for what. */
function municipalTitle(path: BudgetNode[], lang: Lang): string {
  const target = path[path.length - 1]
  const place = path.findLast(isPlace)
  if (!place) return lang === 'bg' ? 'Колко пари получават общините от държавния бюджет?' : 'How much do municipalities get from the state budget?'
  const name = place.name[lang]
  if (place !== target) return lang === 'bg' ? `${name}: колко за „${target.name.bg}“?` : `${name}: how much for “${target.name.en}”?`
  if (place.kind?.en === 'Province') {
    return lang === 'bg' ? `Колко получават общините в ${name} от държавния бюджет?` : `How much do the municipalities of ${name} get from the state budget?`
  }
  return lang === 'bg' ? `Колко получава ${name} от държавния бюджет?` : `How much does ${name} get from the state budget?`
}

/** Titles for the big cities' whole budgets: what a city spends, and on what (with its activity when the item is generic). */
function cityTitle(path: BudgetNode[], lang: Lang): string {
  const city = path.find(isPlace)
  if (!city) return lang === 'bg' ? 'Колко харчат София, Пловдив и Бургас?' : 'How much do Sofia, Plovdiv and Burgas spend?'
  const target = path[path.length - 1]
  const name = city.name[lang]
  if (target === city) return lang === 'bg' ? `Колко харчи ${name}?` : `How much does ${name} spend?`
  return lang === 'bg' ? `Колко харчи ${name} за „${cityItem(path, lang)}“?` : `How much does ${name} spend on “${cityItem(path, lang)}”?`
}

/** "Running costs" or "Water, fuel and energy" mean something only with the activity they belong to. */
function cityItem(path: BudgetNode[], lang: Lang): string {
  const target = path[path.length - 1]
  const activity = path.find((n) => n.kind?.en === 'Activity')
  return activity && activity !== target ? `${activity.name[lang]} — ${target.name[lang]}` : target.name[lang]
}

export function defaultTitle(path: BudgetNode[], lang: Lang, family?: DatasetFamily): string {
  if (family === 'municipalities') return municipalTitle(path, lang)
  if (family === 'cities') return cityTitle(path, lang)
  const target = path[path.length - 1]
  if (path.length === 1) {
    return lang === 'bg' ? 'Накъде отиват публичните пари на България?' : "Where does Bulgaria's public money go?"
  }
  const name = target.name[lang]
  if (needsContext(target)) {
    const category = [...path.slice(1, -1)].reverse().find((n) => !needsContext(n))
    if (category) {
      if (isPlace(target)) return lang === 'bg' ? `${name}: колко за „${category.name.bg}“?` : `${name}: how much for “${category.name.en}”?`
      return lang === 'bg'
        ? `Колко харчи България за „${category.name.bg} — ${name}“?`
        : `How much does Bulgaria spend on “${category.name.en} — ${name}”?`
    }
  }
  return lang === 'bg' ? `Колко харчи България за „${name}“?` : `How much does Bulgaria spend on “${name}”?`
}

/** The target's name, with its category when the name alone says little ("Ministry of Finance — Administration"). */
function contextName(path: BudgetNode[], lang: Lang): string {
  const target = path[path.length - 1]
  if (!needsContext(target) || isPlace(target)) return target.name[lang]
  const category = [...path.slice(1, -1)].reverse().find((n) => !needsContext(n))
  return category ? `${category.name[lang]} — ${target.name[lang]}` : target.name[lang]
}

/**
 * One sentence with the facts: how much, its share of all public spending, and how much that is per
 * person (or per resident of the place it belongs to).
 */
export function summary(dataset: Dataset, path: BudgetNode[], lang: Lang): string {
  const root = path[0]
  const target = path[path.length - 1]
  const amount = moneyParts(target.value, lang).text
  const place = placeOf(path)
  const pp = formatPersonal(target.value / (place?.residents ?? dataset.population), lang)
  const year = dataset.year
  const plan = dataset.kind === 'plan'
  const all = publicTotal(dataset)
  const share = target.value === all ? '' : ` (${formatPercent(target.value / all, lang)} ${translate(lang, 'clipOfAll')})`
  // The root is all public spending only when the dataset covers all of it.
  const everything = target === root && root.value === all
  // A part of a place's money (a transfer of one municipality) names the place too.
  const within = place && place.id !== target.id ? place : null
  const what = contextName(path, lang)
  if (lang === 'bg') {
    const per = `— около ${pp} ${place ? `на жител на ${place.name.bg}` : 'на човек'} годишно.`
    if (dataset.family === 'cities') {
      const city = path.find(isPlace)
      if (!city) return `През ${year} г. София, Пловдив и Бургас са похарчили ${amount}${share} ${per}`
      return `През ${year} г. ${city.name.bg} е похарчила ${amount}${target === city ? '' : ` за „${cityItem(path, lang)}“`}${share} ${per}`
    }
    const name = `„${what}“${within ? ` на ${within.name.bg}` : ''}`
    const plans =
      dataset.stage === 'forecast'
        ? `Прогнозата на МФ за ${year} г. предвижда`
        : dataset.stage === 'draft'
          ? `Проектобюджетът за ${year} г. предвижда`
          : `Бюджетът за ${year} г. предвижда`
    const head = everything
      ? plan
        ? `${plans} публични разходи от ${amount}`
        : `През ${year} г. публичните разходи на България са ${amount}`
      : plan
        ? `${plans} ${amount} за ${name}${share}`
        : `През ${year} г. за ${name} са похарчени ${amount}${share}`
    return `${head} ${per}`
  }
  const per = `— about ${pp} ${place ? `per resident of ${place.name.en}` : 'per person'} a year.`
  if (dataset.family === 'cities') {
    const city = path.find(isPlace)
    if (!city) return `In ${year}, Sofia, Plovdiv and Burgas spent ${amount}${share} ${per}`
    return `In ${year}, ${city.name.en} spent ${amount}${target === city ? '' : ` on “${cityItem(path, lang)}”`}${share} ${per}`
  }
  const name = `“${what}”${within ? ` in ${within.name.en}` : ''}`
  const plans =
    dataset.stage === 'forecast'
      ? `The Ministry of Finance forecast for ${year} plans`
      : dataset.stage === 'draft'
        ? `Bulgaria's draft ${year} budget plans`
        : `Bulgaria's ${year} budget plans`
  const head = everything
    ? plan
      ? `${plans} ${amount} of public spending`
      : `Bulgaria's public spending in ${year}: ${amount}`
    : plan
      ? `${plans} ${amount} for ${name}${share}`
      : `In ${year}, Bulgaria spent ${amount} on ${name}${share}`
  return `${head} ${per}`
}

// ---------- hashtags ----------

/** One tag per top-level area of the "by purpose" breakdowns. */
const AREA_TAG: Record<string, LocalizedText> = {
  social: { bg: '#пенсии', en: '#pensions' },
  economy: { bg: '#икономика', en: '#economy' },
  health: { bg: '#здравеопазване', en: '#healthcare' },
  education: { bg: '#образование', en: '#education' },
  government: { bg: '#администрация', en: '#government' },
  order: { bg: '#сигурност', en: '#security' },
  community: { bg: '#околнасреда', en: '#environment' },
  defence: { bg: '#отбрана', en: '#defence' },
}

const COMMON_TAGS: Record<Lang, string[]> = {
  bg: ['#бюджет', '#България', '#данъци', '#публичнифинанси'],
  en: ['#Bulgaria', '#budget', '#taxes', '#publicfinance'],
}

/** "#Пловдив" for "Община Пловдив", "#София" for "Столична община (София)", "#Sofia" for "Sofia (Stolichna municipality)". */
export function placeTag(place: BudgetNode, lang: Lang): string {
  let name = place.name[lang]
  const paren = /^(.*?)\s*\((.+)\)$/.exec(name)
  if (paren) name = /община|municipality/iu.test(paren[2]) ? paren[1] : paren[2]
  name = name.replace(/(^|\s)(община|област|municipality|province)(?=\s|$)/giu, ' ')
  return `#${name.replace(/[^\p{L}\p{N}]+/gu, '')}`
}

/** Hashtags for a view, the most specific first: its place, its area, then the general ones. */
export function hashtags(dataset: Dataset, path: BudgetNode[], lang: Lang): string[] {
  const tags: string[] = []
  const place = placeOf(path) ?? path.find(isPlace)
  if (place) tags.push(placeTag(place, lang))
  const area = (dataset.family === 'functions' || dataset.family === 'cofog') && path[1] ? AREA_TAG[path[1].id] : undefined
  if (area) tags.push(area[lang])
  for (const tag of COMMON_TAGS[lang]) if (!tags.includes(tag)) tags.push(tag)
  return tags
}

// ---------- posts ----------

export type Network = 'tiktok' | 'instagram' | 'facebook' | 'youtube' | 'x' | 'linkedin' | 'threads' | 'bluesky' | 'messengers'

export const NETWORKS: Network[] = ['tiktok', 'instagram', 'facebook', 'youtube', 'x', 'linkedin', 'threads', 'bluesky', 'messengers']

/** How a network measures text: characters, X's weighted length (links count 23), or graphemes (Bluesky). */
export type Counting = 'chars' | 'x' | 'graphemes'

export function measure(text: string, counting: Counting = 'chars'): number {
  if (counting === 'x') return xLength(text)
  if (counting === 'graphemes') return graphemeLength(text)
  return [...text].length
}

export interface PostField {
  /** 'text' for most networks; YouTube has a title and a description. */
  id: 'text' | 'title' | 'description'
  text: string
  /** The network's limit for the field, measured by `counting`. */
  limit?: number
  counting?: Counting
  maxHashtags?: number
}

export interface PostInput {
  dataset: Dataset
  /** Real nodes from the root down to the target. */
  path: BudgetNode[]
  lang: Lang
  /** The clip's headline. */
  title: string
  /** The view's share page (src/lib/share.ts), which shows a preview card where links are clickable. */
  url: string
  /** The site's address as people would type it ("damyor.github.io/bg-budget"), for captions whose links do not open. */
  site: string
}

const LINE = {
  // TikTok and Instagram do not open links in captions, so they get the short address to type.
  see: { bg: 'Виж целия бюджет:', en: 'See the whole budget:' },
  explore: { bg: 'Разгледай всяка категория:', en: 'Explore every category:' },
}

/** Cuts a text to at most `max` characters at a word boundary, with an ellipsis. */
function truncate(text: string, max: number): string {
  const chars = [...text]
  if (chars.length <= max) return text
  const cut = chars.slice(0, max - 1).join('')
  const space = cut.lastIndexOf(' ')
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,.;:–—-]+$/, '')}…`
}

/** A ready-to-post text for every network, within its limits and hashtag habits. */
export function postTexts({ dataset, path, lang, title, url, site }: PostInput): Record<Network, PostField[]> {
  const head = title.trim()
  const facts = summary(dataset, path, lang)
  const source = `${translate(lang, 'source')}: ${dataset.sourceShort?.[lang] ?? dataset.sources[0]?.name[lang] ?? ''}`
  const tags = hashtags(dataset, path, lang)
  const tagLine = (n: number) => tags.slice(0, n).join(' ')
  const join = (...parts: string[]) => parts.filter(Boolean).join('\n\n')
  const explore = `${LINE.explore[lang]} ${url}\n${source}`
  // The richest variant that fits; failing all, the headline is shortened to make room for the link.
  const fit = (limit: number, counting: Counting, ...variants: string[]) => {
    const fitting = variants.find((v) => measure(v, counting) <= limit)
    if (fitting !== undefined) return fitting
    let room = [...head].length
    let text = join(head, url)
    while (measure(text, counting) > limit && room > 10) {
      room -= 10
      text = join(truncate(head, room), url)
    }
    return text
  }
  const reel = join(head, facts, `${LINE.see[lang]} ${site}\n${source}`, tagLine(5))
  const article = join(head, facts, explore, tagLine(3))
  return {
    tiktok: [{ id: 'text', text: reel, limit: 2200 }],
    instagram: [{ id: 'text', text: reel, limit: 2200, maxHashtags: 5 }],
    facebook: [{ id: 'text', text: article }],
    youtube: [
      { id: 'title', text: truncate(head, 100), limit: 100 },
      { id: 'description', text: join(facts, explore, tagLine(3)), limit: 5000 },
    ],
    x: [
      {
        id: 'text',
        text: fit(280, 'x', join(head, facts, `${url}\n${tagLine(2)}`), join(head, facts, url), join(facts, url)),
        limit: 280,
        counting: 'x',
      },
    ],
    linkedin: [{ id: 'text', text: article, limit: 3000 }],
    threads: [
      {
        id: 'text',
        text: fit(500, 'chars', join(head, facts, `${url}\n${tagLine(1)}`), join(head, facts, url), join(facts, url)),
        limit: 500,
      },
    ],
    bluesky: [
      {
        id: 'text',
        text: fit(300, 'graphemes', join(head, facts, `${url}\n${tagLine(2)}`), join(head, facts, url), join(facts, url)),
        limit: 300,
        counting: 'graphemes',
      },
    ],
    messengers: [{ id: 'text', text: `${head}\n${facts}\n${url}` }],
  }
}
