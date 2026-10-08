// Links for posting and sharing: the address of a view that shows a preview card when it is posted,
// and the "post" / "share" addresses of the social networks.
//
// The site uses hash routes, and link previews (Facebook, X, LinkedIn, Viber, Telegram …) never see the
// part after "#", so the build writes one small page per view (scripts/sharePages.ts):
// <site>/<lang>/<dataset>/<node> carries that view's title and summary for the preview and forwards
// people to #/explore?d=<dataset>&n=<node>.

import type { Lang } from './types.ts'

/** A view's share page under the site root: "bg/budget-2026/health"; a dataset's root is "bg/budget-2026/". */
export function sharePath(lang: Lang, datasetId: string, nodeId: string): string {
  return `${lang}/${datasetId}/${nodeId === 'root' ? '' : nodeId}`
}

/** Absolute address of a view's share page. `site` ends with a slash. */
export function shareUrl(site: string, lang: Lang, datasetId: string, nodeId: string): string {
  return site + sharePath(lang, datasetId, nodeId)
}

/** The site's address as people would type it: "damyor.github.io/bg-budget". */
export function siteLabel(site: string): string {
  return site.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '')
}

// ---------- how the networks count characters ----------

const URL_PATTERN = /https?:\/\/\S+/g

/**
 * Length of a post as X counts it: letters of most scripts (Latin, Cyrillic …) and common
 * punctuation count 1, other characters (€, …, emoji) 2, and every link 23 (it is shortened to t.co).
 */
export function xLength(text: string): number {
  let length = 0
  const rest = text.normalize('NFC').replace(URL_PATTERN, () => {
    length += 23
    return ''
  })
  for (const ch of rest) {
    const c = ch.codePointAt(0)!
    const light = c <= 0x10ff || (c >= 0x2000 && c <= 0x200d) || (c >= 0x2010 && c <= 0x201f) || (c >= 0x2032 && c <= 0x2037)
    length += light ? 1 : 2
  }
  return length
}

/** Characters as people see them (Bluesky counts these). */
export function graphemeLength(text: string): number {
  return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].length
}

export function hashtagCount(text: string): number {
  return text.match(/#[\p{L}\p{N}_]+/gu)?.length ?? 0
}

// ---------- the networks' own addresses ----------

const enc = encodeURIComponent

/** Pages that open a network's composer, filled in with the text where the network allows it. */
export const composeUrl = {
  x: (text: string) => `https://x.com/intent/tweet?text=${enc(text)}`,
  threads: (text: string) => `https://www.threads.com/intent/post?text=${enc(text)}`,
  bluesky: (text: string) => `https://bsky.app/intent/compose?text=${enc(text)}`,
  viber: (text: string) => `viber://forward?text=${enc(text)}`,
  whatsapp: (text: string) => `https://wa.me/?text=${enc(text)}`,
  telegram: (url: string, text: string) => `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`,
}

/** Where a video is uploaded on a computer (the text is pasted there). */
export const uploadUrl = {
  tiktok: 'https://www.tiktok.com/tiktokstudio/upload',
  instagram: 'https://www.instagram.com/',
  youtube: 'https://www.youtube.com/upload',
}

/** Share dialogs that take a link (the network builds the preview from the share page). */
export const shareLinkUrl = {
  facebook: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
  linkedin: (url: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
  reddit: (url: string, title: string) => `https://www.reddit.com/submit?url=${enc(url)}&title=${enc(title)}`,
  email: (url: string, subject: string, body: string) => `mailto:?subject=${enc(subject)}&body=${enc(`${body}\n\n${url}`)}`,
}
