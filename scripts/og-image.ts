// Draws the link-preview image (1200 × 630) that every share page and the front page use, in Bulgarian and
// English, into public/og/<lang>.png. The card has no figures, so it does not go out of date with the data;
// the headline and the facts of each view are in its preview text (scripts/sharePages.ts).
//
//   npm run og        (needs Google Chrome or Chromium; set CHROME=/path/to/chrome if it is elsewhere)
//
// The donut is the latest adopted budget's eight areas, in the site's colours and order.

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { arc, pie } from 'd3-shape'
import { OG_IMAGE } from './sharePages.ts'
import { translate } from '../src/lib/i18n.ts'
import { SERIES } from '../src/lib/palette.ts'
import { siteLabel } from '../src/lib/share.ts'
import { AREA_ORDER } from '../src/lib/tree.ts'
import type { Dataset, DatasetIndexEntry, Lang } from '../src/lib/types.ts'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const { homepage } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { homepage: string }

const TEXT: Record<Lang, { headline: string; sub: string }> = {
  bg: {
    headline: 'Накъде отиват публичните пари?',
    sub: 'Интерактивно — от общата сума до най\u2011подробното ниво, което държавата публикува.',
  },
  en: {
    headline: 'Where does public money go?',
    sub: 'Interactive — from the total down to the finest level the state publishes.',
  },
}

function chrome(): string {
  const candidates = [
    process.env.CHROME,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ]
  const found = candidates.find((c) => c && existsSync(c))
  if (!found) throw new Error('Chrome not found — set CHROME=/path/to/chrome')
  return found
}

/** Inter (Latin and Cyrillic) embedded, so the page needs no files. */
function fontFaces(): string {
  const files = join(ROOT, 'node_modules/@fontsource-variable/inter/files')
  const face = (subset: string, range: string) => {
    const data = readFileSync(join(files, `inter-${subset}-wght-normal.woff2`)).toString('base64')
    return `@font-face{font-family:'Inter Variable';font-weight:100 900;src:url(data:font/woff2;base64,${data}) format('woff2-variations');unicode-range:${range}}`
  }
  return [
    face('latin', 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'),
    face('cyrillic', 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116'),
  ].join('\n')
}

function donut(dataset: Dataset): string {
  const areas = AREA_ORDER.map((id) => dataset.root.children?.find((c) => c.id === id)).filter((c) => c !== undefined)
  const r = 236
  const slices = pie<number>().sort(null).padAngle(0.012)(areas.map((a) => a.value))
  const path = arc<{ startAngle: number; endAngle: number; padAngle: number }>()
    .innerRadius(r * 0.6)
    .outerRadius(r)
    .cornerRadius(6)
  return slices.map((s, i) => `<path d="${path(s)}" fill="${SERIES.dark[i]}"/>`).join('')
}

function card(lang: Lang, dataset: Dataset, fonts: string): string {
  const { headline, sub } = TEXT[lang]
  const kicker = translate(lang, 'appName').toLocaleUpperCase(lang === 'bg' ? 'bg-BG' : 'en-GB')
  return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><style>
${fonts}
*{margin:0;box-sizing:border-box}
html,body{width:${OG_IMAGE.width}px;height:${OG_IMAGE.height}px;overflow:hidden}
body{font-family:'Inter Variable',sans-serif;color:#fff;background:radial-gradient(circle at 78% 50%,#1f1f1d 0,#121211 75%);position:relative}
.text{position:absolute;left:72px;top:64px;bottom:60px;width:600px;display:flex;flex-direction:column}
.kicker{display:flex;align-items:center;gap:16px;font-size:22px;font-weight:650;letter-spacing:2px;color:#c3c2b7}
.flag{width:34px;height:24px;display:grid;grid-template-rows:repeat(3,1fr);outline:1.5px solid #2c2c2a}
.flag i:nth-child(1){background:#fff}.flag i:nth-child(2){background:#00966e}.flag i:nth-child(3){background:#d62612}
h1{margin-top:44px;font-size:70px;line-height:1.06;font-weight:800;letter-spacing:-1.5px}
p{margin-top:26px;font-size:27px;line-height:1.35;font-weight:500;color:#c3c2b7}
.site{margin-top:auto;padding-top:18px;border-top:2px solid #2c2c2a;font-size:23px;font-weight:650;color:#c3c2b7}
svg{position:absolute;left:${930 - 260}px;top:${315 - 260}px}
</style></head><body>
<div class="text">
<div class="kicker"><span class="flag"><i></i><i></i><i></i></span>${kicker}</div>
<h1>${headline}</h1>
<p>${sub}</p>
<div class="site">${siteLabel(homepage)}</div>
</div>
<svg width="520" height="520" viewBox="-260 -260 520 520">${donut(dataset)}</svg>
</body></html>`
}

const index = JSON.parse(readFileSync(join(ROOT, 'public/data/index.json'), 'utf8')) as DatasetIndexEntry[]
const latest = index.filter((d) => d.family === 'functions' && d.stage === 'law').sort((a, b) => b.year - a.year)[0]
const dataset = JSON.parse(readFileSync(join(ROOT, 'public/data', latest.file), 'utf8')) as Dataset
const fonts = fontFaces()
const work = mkdtempSync(join(tmpdir(), 'og-image-'))
const outDir = join(ROOT, 'public/og')
mkdirSync(outDir, { recursive: true })
try {
  for (const lang of ['bg', 'en'] as Lang[]) {
    const html = join(work, `${lang}.html`)
    writeFileSync(html, card(lang, dataset, fonts))
    const out = join(outDir, `${lang}.png`)
    await screenshot(out, html, join(work, `profile-${lang}`))
    console.log(`${out} (${latest.id})`)
  }
} finally {
  rmSync(work, { recursive: true, force: true })
}

/** Headless Chrome writes the screenshot but may stay open afterwards, so it is stopped once the file is complete. */
async function screenshot(out: string, html: string, profile: string): Promise<void> {
  const started = Date.now()
  const written = () => existsSync(out) && statSync(out).mtimeMs >= started && statSync(out).size > 0
  const child = spawn(
    chrome(),
    [
      '--headless=new',
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--use-mock-keychain',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${OG_IMAGE.width},${OG_IMAGE.height}`,
      '--virtual-time-budget=3000',
      `--screenshot=${out}`,
      `file://${html}`,
    ],
    { stdio: 'ignore' },
  )
  const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()))
  try {
    let size = -1
    for (let waited = 0; waited < 60_000; waited += 250) {
      if (written() && statSync(out).size === size) return
      size = written() ? statSync(out).size : -1
      if (await Promise.race([exited.then(() => true), new Promise<false>((r) => setTimeout(() => r(false), 250))])) break
    }
    if (!written()) throw new Error(`Chrome did not write ${out}`)
  } finally {
    child.kill('SIGKILL')
  }
}
