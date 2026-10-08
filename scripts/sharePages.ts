// Vite plugin: link previews for every view of the site.
//
// The views live behind "#" (hash routes), which link previews never see: every link would show the
// same card. So the build writes one small page per view, for every dataset and both languages —
//   <base><lang>/<dataset>/<node>     (sharePath in src/lib/share.ts; GitHub Pages serves <node>.html)
//   <base><lang>/<dataset>/           (the dataset's root)
//   <base><lang>/                     (the site in that language)
// — with the view's headline and summary as Open Graph tags (Facebook, LinkedIn, Viber, Telegram,
// WhatsApp …) and an X card, and a script that forwards people to #/explore?d=<dataset>&n=<node>&lang=<lang>
// (an "m" parameter — per person, % of GDP — is passed on). The pages are not committed: every build
// writes them from public/data, so they follow the data.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { Logger, Plugin } from 'vite'
import { defaultTitle, summary } from '../src/clip/caption.ts'
import { translate } from '../src/lib/i18n.ts'
import { sharePath } from '../src/lib/share.ts'
import { buildIndex, pathTo } from '../src/lib/tree.ts'
import type { Dataset, DatasetIndexEntry, Lang } from '../src/lib/types.ts'

const LANGS: Lang[] = ['bg', 'en']
const LOCALE: Record<Lang, string> = { bg: 'bg_BG', en: 'en_GB' }

/** The preview image, 1200 × 630 (public/og/, made by scripts/og-image.ts). */
export const OG_IMAGE = { path: (lang: Lang) => `og/${lang}.png`, width: 1200, height: 630 }
const IMAGE_ALT: Record<Lang, string> = {
  bg: 'Бюджетът на България — накъде отиват публичните пари',
  en: "Bulgaria's Budget — where public money goes",
}

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export interface SharePage {
  lang: Lang
  /** Absolute address of the page itself (og:url). */
  url: string
  title: string
  description: string
  /** Absolute address of the preview image. */
  image: string
  /** Where people are sent: the view's hash route, under the site's base path. */
  target: string
}

export function sharePageHtml(page: SharePage): string {
  const { lang } = page
  const name = translate(lang, 'appName')
  const title = escape(page.title)
  const description = escape(page.description)
  // Only the display modes travel along; anything else in the query (fbclid …) is dropped.
  const forward = `var m=new URLSearchParams(location.search).get('m');location.replace(${JSON.stringify(page.target).replace(/</g, '\\u003c')}+(/^(pp|gdp|mine)$/.test(m)?'&m='+m:''))`
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title} · ${escape(name)}</title>
<meta property="og:type" content="website">
<meta property="og:site_name" content="${escape(name)}">
<meta property="og:locale" content="${LOCALE[lang]}">
<meta property="og:url" content="${escape(page.url)}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${escape(page.image)}">
<meta property="og:image:width" content="${OG_IMAGE.width}">
<meta property="og:image:height" content="${OG_IMAGE.height}">
<meta property="og:image:alt" content="${escape(IMAGE_ALT[lang])}">
<meta name="twitter:card" content="summary_large_image">
<script>${forward}</script>
</head>
<body>
<p><a href="${escape(page.target)}">${title}</a></p>
</body>
</html>
`
}

/** File of a share page under the output directory: "bg/budget-2026/health.html", "bg/budget-2026/index.html". */
export function shareFile(lang: Lang, datasetId: string, nodeId: string): string {
  const path = sharePath(lang, datasetId, nodeId)
  return path.endsWith('/') ? `${path}index.html` : `${path}.html`
}

/** Every share page of a dataset, in both languages. */
export function* datasetSharePages(dataset: Dataset, site: string, base: string): Generator<{ file: string; html: string }> {
  const tree = buildIndex(dataset.root)
  // Case-insensitive file systems (macOS, Windows) would merge "GF03" and "gf03"; "index" is the root's file.
  const seen = new Set<string>(['index'])
  for (const id of tree.byId.keys()) {
    if (id === 'root') continue
    const key = id.toLowerCase()
    if (seen.has(key)) throw new Error(`share pages: node id "${id}" of ${dataset.id} clashes with another file name`)
    seen.add(key)
  }
  for (const lang of LANGS) {
    for (const id of tree.byId.keys()) {
      const path = pathTo(tree, id)
      const query = new URLSearchParams({ d: dataset.id, ...(id === 'root' ? {} : { n: id }), lang })
      const html = sharePageHtml({
        lang,
        url: site + sharePath(lang, dataset.id, id),
        title: defaultTitle(path, lang, dataset.family),
        description: summary(dataset, path, lang),
        image: site + OG_IMAGE.path(lang),
        target: `${base}#/explore?${query}`,
      })
      yield { file: shareFile(lang, dataset.id, id), html }
    }
  }
}

/** The site's front page in each language ("<base>bg/", "<base>en/"). */
export function* homeSharePages(site: string, base: string): Generator<{ file: string; html: string }> {
  for (const lang of LANGS) {
    const html = sharePageHtml({
      lang,
      url: `${site}${lang}/`,
      title: translate(lang, 'appName'),
      description: translate(lang, 'tagline'),
      image: site + OG_IMAGE.path(lang),
      target: `${base}#/explore?lang=${lang}`,
    })
    yield { file: `${lang}/index.html`, html }
  }
}

/**
 * `site` is the public address the pages are served from, with a trailing slash (absolute addresses are
 * required in previews). Runs on `vite build` only.
 */
export function sharePages(site: string): Plugin {
  let base = '/'
  let outDir = 'dist'
  let dataDir = 'public/data'
  let logger: Logger | null = null
  return {
    name: 'share-pages',
    apply: 'build',
    configResolved(config) {
      base = config.base
      outDir = resolve(config.root, config.build.outDir)
      dataDir = resolve(config.root, config.publicDir, 'data')
      logger = config.logger
    },
    closeBundle() {
      const started = Date.now()
      const index = JSON.parse(readFileSync(join(dataDir, 'index.json'), 'utf8')) as DatasetIndexEntry[]
      const dirs = new Set<string>()
      const write = (file: string, html: string) => {
        const target = join(outDir, file)
        const dir = join(target, '..')
        if (!dirs.has(dir)) mkdirSync(dir, { recursive: true })
        dirs.add(dir)
        writeFileSync(target, html)
      }
      let count = 0
      for (const page of homeSharePages(site, base)) {
        write(page.file, page.html)
        count++
      }
      for (const entry of index) {
        const dataset = JSON.parse(readFileSync(join(dataDir, entry.file), 'utf8')) as Dataset
        for (const page of datasetSharePages(dataset, site, base)) {
          write(page.file, page.html)
          count++
        }
      }
      logger?.info(`share pages: ${count} for ${site} in ${Date.now() - started} ms`)
    },
  }
}
