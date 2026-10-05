// Draws one frame of a clip onto a 2D canvas. Pure function of (clip, time),
// so preview playback and frame-by-frame video export look identical.

import { arc as d3arc } from 'd3-shape'
import { easeInOut, layoutSlices, staticArcs, sweepArcs, zoomArcs, type DrawArc, type LaidSlice } from '../lib/donutLayout'
import { formatPercent, moneyParts } from '../lib/format'
import { translate } from '../lib/i18n'
import { arcFill, inkOn, seriesHex, type Mode } from '../lib/palette'
import { placeOf } from '../lib/tree'
import { publicTotal, type BudgetNode, type Dataset, type DatasetFamily, type Lang } from '../lib/types'
import { formatPersonal } from '../lib/valueMode'
import { clipLayout, type Box, type ClipFormat, type ClipLayout } from './layout'
import { buildTimeline, sceneAt, TOUR_STEPS, type Scene, type Speed, type Timeline } from './timeline'

export interface ClipSpec {
  dataset: Dataset
  /** Real nodes from the root down to the target. */
  path: BudgetNode[]
  format: ClipFormat
  theme: Mode
  lang: Lang
  speed: Speed
  title: string
  showPerPerson: boolean
  /** Annual taxes of the viewer, to show "your share" at the end. */
  myAnnualTaxes: number | null
  siteLabel: string
}

export interface PreparedClip {
  spec: ClipSpec
  layout: ClipLayout
  timeline: Timeline
  /** levels[i]: slices of path[i] (keeping path[i + 1] visible). */
  levels: LaidSlice[][]
}

const THEME = {
  dark: { bg: '#1a1a19', bgEdge: '#121211', primary: '#ffffff', secondary: '#c3c2b7', muted: '#8f8e87', hairline: '#2c2c2a' },
  light: { bg: '#fcfcfb', bgEdge: '#f1f0ec', primary: '#0b0b0b', secondary: '#52514e', muted: '#7a7973', hairline: '#e1e0d9' },
} as const

const FONT = '"Inter Variable", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif'

const GEOGRAPHIC = new Set(['Община', 'Municipality', 'Област (регион)', 'Province'])
/** A programme's own staff, running and capital costs ("Персонал", "Издръжка" …) only mean something with the programme. */
const DEPARTMENTAL = 'Ведомствен разход'
const GENERIC = /^(администрация|други|друго|резерв|инвестиции|издръжка|заплати|членски внос|стипендии|administration|other|contingency|investment|running costs|staff pay|membership fees|scholarships)/i

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
  const place = path.findLast((n) => n.kind !== undefined && GEOGRAPHIC.has(n.kind.bg))
  if (!place) return lang === 'bg' ? 'Колко пари получават общините от държавния бюджет?' : 'How much do municipalities get from the state budget?'
  const name = place.name[lang]
  if (place !== target) return lang === 'bg' ? `${name}: колко за „${target.name.bg}“?` : `${name}: how much for “${target.name.en}”?`
  if (place.kind?.en === 'Province') {
    return lang === 'bg' ? `Колко получават общините в ${name} от държавния бюджет?` : `How much do the municipalities of ${name} get from the state budget?`
  }
  return lang === 'bg' ? `Колко получава ${name} от държавния бюджет?` : `How much does ${name} get from the state budget?`
}

export function defaultTitle(path: BudgetNode[], lang: Lang, family?: DatasetFamily): string {
  if (family === 'municipalities') return municipalTitle(path, lang)
  const target = path[path.length - 1]
  if (path.length === 1) {
    return lang === 'bg' ? 'Накъде отиват публичните пари на България?' : "Where does Bulgaria's public money go?"
  }
  const name = target.name[lang]
  if (needsContext(target)) {
    const category = [...path.slice(1, -1)].reverse().find((n) => !needsContext(n))
    if (category) {
      const geographic = target.kind !== undefined && GEOGRAPHIC.has(target.kind.bg)
      if (geographic) return lang === 'bg' ? `${name}: колко за „${category.name.bg}“?` : `${name}: how much for “${category.name.en}”?`
      return lang === 'bg'
        ? `Колко харчи България за „${category.name.bg} — ${name}“?`
        : `How much does Bulgaria spend on “${category.name.en} — ${name}”?`
    }
  }
  return lang === 'bg' ? `Колко харчи България за „${name}“?` : `How much does Bulgaria spend on “${name}”?`
}

export function prepareClip(spec: ClipSpec): PreparedClip {
  const levels = spec.path.map((node, i) => (node.children?.length ? layoutSlices(node, spec.path[i + 1]?.id) : []))
  // A whole-budget clip walks through the largest areas.
  const tourIds = spec.path.length === 1 ? levels[0].filter((sl) => sl.slot !== 'other').slice(0, TOUR_STEPS).map((sl) => sl.node.id) : []
  return { spec, layout: clipLayout(spec.format), timeline: buildTimeline(spec.path, spec.speed, tourIds), levels }
}

// ---------- small helpers ----------

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const progress = (x: number, a: number, b: number) => clamp01((x - a) / (b - a))

function font(ctx: CanvasRenderingContext2D, weight: number, size: number) {
  ctx.font = `${weight} ${size}px ${FONT}`
}

/** Greedy word wrap; the last allowed line gets an ellipsis if text remains. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (let i = 0; i < words.length; i++) {
    const candidate = line ? `${line} ${words[i]}` : words[i]
    if (ctx.measureText(candidate).width <= maxWidth || !line) {
      line = candidate
      continue
    }
    lines.push(line)
    line = words[i]
    if (lines.length === maxLines) {
      line = ''
      break
    }
  }
  if (line) lines.push(line)
  const used = lines.join(' ').split(/\s+/).length
  if (used < words.length || lines.length > maxLines) {
    lines.length = Math.min(lines.length, maxLines)
    let last = lines[lines.length - 1]
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1)
    lines[lines.length - 1] = `${last.replace(/[\s,.;:–-]+$/, '')}…`
  }
  return lines
}

/** Largest font size (≤ size) at which `text` wraps into ≤ maxLines within maxWidth without truncation. */
function fitWrapped(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, maxWidth: number, maxLines: number, minSize: number) {
  for (let s = size; s >= minSize; s -= 2) {
    font(ctx, weight, s)
    const lines = wrap(ctx, text, maxWidth, maxLines)
    if (!lines[lines.length - 1].endsWith('…')) return { size: s, lines }
  }
  font(ctx, weight, minSize)
  return { size: minSize, lines: wrap(ctx, text, maxWidth, maxLines) }
}

function fitSingle(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, maxWidth: number) {
  let s = size
  font(ctx, weight, s)
  while (s > 12 && ctx.measureText(text).width > maxWidth) {
    s -= 2
    font(ctx, weight, s)
  }
  return s
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

// ---------- frame ----------

export function renderFrame(ctx: CanvasRenderingContext2D, clip: PreparedClip, time: number): void {
  const { spec, layout: L, timeline } = clip
  const C = THEME[spec.theme]
  const { scene, p } = sceneAt(timeline, time)
  const previous: Scene | undefined = timeline.scenes[timeline.scenes.indexOf(scene) - 1]

  ctx.save()
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'

  // Background with a soft vignette.
  const g = ctx.createRadialGradient(L.donut.cx, L.donut.cy, L.donut.r * 0.2, L.donut.cx, L.donut.cy, Math.max(L.width, L.height) * 0.75)
  g.addColorStop(0, C.bg)
  g.addColorStop(1, C.bgEdge)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, L.width, L.height)

  drawHeader(ctx, clip, scene.kind === 'intro' ? easeInOut(progress(p, 0, 0.3)) : 1)

  // Breadcrumb: rings reached so far.
  let crumbDepth = scene.level
  let crumbFade = 1
  if (scene.kind === 'zoom') {
    crumbDepth = scene.level + (p > 0.5 ? 1 : 0)
    crumbFade = p > 0.5 ? progress(p, 0.5, 0.8) : 1
  }
  drawCrumbs(ctx, clip, crumbDepth, scene.kind === 'intro' ? progress(p, 0.2, 0.5) : 1, crumbFade)

  // Donut.
  const levelSlices = clip.levels[scene.level] ?? []
  const focusSlice = scene.focusId ? levelSlices.find((sl) => sl.node.id === scene.focusId) : undefined
  // Consecutive highlights in one ring hand the lift over instead of un-dimming.
  const handOver = scene.kind === 'highlight' && previous?.kind === 'highlight' && previous.level === scene.level
  const o: DonutOptions = { focusId: focusSlice?.node.id ?? null, lift: 0, dim: 0, labels: 0, zooming: false, prevFocusId: null, prevLift: 0 }
  let arcs: DrawArc[] = []
  if (scene.kind === 'intro') {
    arcs = sweepArcs(levelSlices, progress(p, 0.12, 0.7))
    o.labels = progress(p, 0.7, 0.9)
  } else if (scene.kind === 'highlight') {
    arcs = staticArcs(levelSlices)
    const h = easeInOut(progress(p, 0, 0.25))
    o.lift = h
    o.dim = handOver ? 1 : h
    o.labels = 1
    if (handOver) {
      o.prevFocusId = previous.focusId
      o.prevLift = 1 - h
    }
  } else if (scene.kind === 'zoom' && focusSlice) {
    arcs = zoomArcs(levelSlices, focusSlice, clip.levels[scene.level + 1] ?? [], p)
    o.lift = 1 - easeInOut(progress(p, 0, 0.35))
    o.dim = 1
    o.zooming = true
  } else if (scene.kind === 'settle') {
    arcs = staticArcs(levelSlices)
    o.labels = progress(p, 0, 0.7)
  } else if (scene.kind === 'outro') {
    arcs = staticArcs(levelSlices)
    o.labels = 1
    if (focusSlice) {
      o.lift = 1
      o.dim = 1
    }
  }
  drawDonut(ctx, clip, arcs, o)

  // Center label (cross-fades during a zoom).
  if (scene.kind === 'zoom') {
    drawCenter(ctx, clip, spec.path[scene.level], 1 - progress(p, 0.1, 0.45), 1)
    drawCenter(ctx, clip, spec.path[scene.level + 1], progress(p, 0.55, 0.9), 1)
  } else if (scene.kind === 'intro') {
    drawCenter(ctx, clip, spec.path[0], progress(p, 0.1, 0.35), easeInOut(progress(p, 0.15, 0.85)))
  } else {
    drawCenter(ctx, clip, spec.path[scene.level], 1, 1)
  }

  // Caption: what is being highlighted, or the final summary.
  if (scene.kind === 'highlight' && focusSlice) {
    const fadeIn = easeInOut(progress(p, 0.06, 0.32))
    const fadeOut = 1 - progress(p, 0.88, 1)
    drawCaption(ctx, clip, focusSlice, spec.path[scene.level], fadeIn * fadeOut)
  } else if (scene.kind === 'outro') {
    drawSummary(ctx, clip, easeInOut(progress(p, 0, 0.22)))
  }

  drawFooter(ctx, clip)
  ctx.restore()
}

function drawHeader(ctx: CanvasRenderingContext2D, clip: PreparedClip, alpha: number) {
  const { spec, layout: L } = clip
  const C = THEME[spec.theme]
  const u = L.u
  const box = L.header
  ctx.globalAlpha = alpha

  // Flag mark + kicker.
  const markW = 30 * u
  const stripe = 7 * u
  const ky = box.y
  ;['#ffffff', '#00966e', '#d62612'].forEach((c, i) => {
    ctx.fillStyle = c
    ctx.fillRect(box.x, ky + i * stripe, markW, stripe)
  })
  ctx.strokeStyle = C.hairline
  ctx.lineWidth = 1.5 * u
  ctx.strokeRect(box.x, ky, markW, stripe * 3)

  font(ctx, 650, 25 * u)
  ctx.fillStyle = C.secondary
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${2 * u}px`
  const kicker = `${translate(spec.lang, 'appName')} · ${spec.dataset.title[spec.lang]}`.toLocaleUpperCase(spec.lang === 'bg' ? 'bg-BG' : 'en-GB')
  ctx.fillText(kicker, box.x + markW + 16 * u, ky + stripe * 3 - 2 * u)
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'

  // Headline.
  const top = ky + stripe * 3 + 28 * u
  const { size, lines } = fitWrapped(ctx, spec.title, 800, L.titleSize * u, box.w, L.titleLines, 34 * u)
  font(ctx, 800, size)
  ctx.fillStyle = C.primary
  lines.forEach((line, i) => ctx.fillText(line, box.x, top + size * 0.9 + i * size * 1.12))
  ctx.globalAlpha = 1
}

function drawCrumbs(ctx: CanvasRenderingContext2D, clip: PreparedClip, depth: number, alpha: number, lastFade: number) {
  const { spec, layout: L } = clip
  const C = THEME[spec.theme]
  const u = L.u
  const box = L.crumbs
  const names = spec.path.slice(0, depth + 1).map((n) => n.name[spec.lang])
  font(ctx, 550, 27 * u)
  const sep = '  ›  '
  // Drop leading items until the trail fits.
  let start = 0
  const text = (from: number) => (from > 0 ? '…' + sep : '') + names.slice(from).join(sep)
  while (start < names.length - 1 && ctx.measureText(text(start)).width > box.w) start++
  let shown = text(start)
  if (ctx.measureText(shown).width > box.w) shown = wrap(ctx, shown, box.w, 1)[0]
  const prefix = names.length > 1 ? (start > 0 ? '…' + sep : '') + names.slice(start, -1).join(sep) + sep : ''
  ctx.globalAlpha = alpha
  ctx.fillStyle = C.muted
  const y = box.y + box.h * 0.7
  if (lastFade < 1 && names.length > 1) {
    ctx.fillText(prefix, box.x, y)
    ctx.globalAlpha = alpha * lastFade
    ctx.fillStyle = C.secondary
    ctx.fillText(names[names.length - 1], box.x + ctx.measureText(prefix).width, y)
  } else {
    ctx.fillText(shown, box.x, y)
  }
  ctx.globalAlpha = 1
}

interface DonutOptions {
  focusId: string | null
  lift: number
  dim: number
  labels: number
  zooming: boolean
  /** The previously highlighted slice, settling back while the focus moves on. */
  prevFocusId: string | null
  prevLift: number
}

function drawDonut(ctx: CanvasRenderingContext2D, clip: PreparedClip, arcs: DrawArc[], o: DonutOptions) {
  const { spec, layout: L } = clip
  const u = L.u
  const { cx, cy, r } = L.donut
  const outer = r
  const inner = r * 0.6
  const liftPx = 22 * u
  const gen = d3arc<{ start: number; end: number; outer: number }>()
    .innerRadius(inner)
    .outerRadius((d) => d.outer)
    .startAngle((d) => d.start)
    .endAngle((d) => d.end)
    .padAngle(3 * u / outer)
    .padRadius(outer)
    .cornerRadius(5 * u)
    .context(ctx)

  ctx.save()
  ctx.translate(cx, cy)
  for (const a of arcs) {
    // While zooming, the focus is the outgoing parent arc and the incoming
    // children are never dimmed; at rest every arc is "incoming".
    const isFocus = o.focusId !== null && a.node.id === o.focusId && a.incoming !== o.zooming
    const isPrev = o.prevFocusId !== null && a.node.id === o.prevFocusId
    const lifted = isFocus ? o.lift * liftPx : isPrev ? o.prevLift * liftPx : 0
    const dimmed = o.focusId !== null && !isFocus && !(o.zooming && a.incoming)
    const alpha = a.opacity * (dimmed ? 1 - 0.72 * o.dim : 1)
    if (alpha <= 0.002) continue
    ctx.globalAlpha = alpha
    ctx.fillStyle = arcFill(a.slot, spec.theme, a.blendFrom, a.blend)
    ctx.beginPath()
    gen({ start: a.start, end: a.end, outer: outer + lifted })
    ctx.fill()
  }
  // Percentage labels where they fit.
  if (o.labels > 0) {
    const total = arcs.filter((a) => a.incoming).reduce((s, a) => s + a.node.value, 0)
    font(ctx, 700, 30 * u)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const a of arcs) {
      if (!a.incoming || !total) continue
      const isFocus = o.focusId !== null && a.node.id === o.focusId
      if (o.dim > 0.5 && o.focusId !== null && !isFocus) continue
      const mid = (inner + outer) / 2 + (isFocus ? (o.lift * liftPx) / 2 : 0)
      const text = formatPercent(a.node.value / total, spec.lang)
      const room = (a.end - a.start) * mid
      if (room < ctx.measureText(text).width + 24 * u) continue
      const angle = (a.start + a.end) / 2
      ctx.globalAlpha = o.labels * a.opacity
      ctx.fillStyle = inkOn(seriesHex(a.slot, spec.theme))
      ctx.fillText(text, Math.sin(angle) * mid, -Math.cos(angle) * mid)
    }
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
  }
  ctx.restore()
  ctx.globalAlpha = 1
}

function drawCenter(ctx: CanvasRenderingContext2D, clip: PreparedClip, node: BudgetNode, alpha: number, countUp: number) {
  if (alpha <= 0.002) return
  const { spec, layout: L } = clip
  const C = THEME[spec.theme]
  const u = L.u
  const { cx, cy, r } = L.donut
  const maxW = r * 0.6 * 1.55
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.textAlign = 'center'

  const value = moneyParts(node.value * countUp, spec.lang).text
  const valueSize = fitSingle(ctx, value, 800, 64 * u * (r / 380), maxW)
  font(ctx, 600, 27 * u * (r / 380))
  const nameSize = 27 * u * (r / 380)
  const lines = wrap(ctx, node.name[spec.lang], maxW * 0.92, 3)
  const blockH = lines.length * nameSize * 1.22 + 14 * u + valueSize
  let y = cy - blockH / 2 + nameSize
  ctx.fillStyle = C.secondary
  for (const line of lines) {
    ctx.fillText(line, cx, y)
    y += nameSize * 1.22
  }
  y += 14 * u + valueSize * 0.78
  font(ctx, 800, valueSize)
  ctx.fillStyle = C.primary
  ctx.fillText(value, cx, y)
  ctx.restore()
}

/** "≈ €85 per resident a year" inside a place with known residents, else per person in the country. */
function perPersonLine(spec: ClipSpec, path: BudgetNode[]): string {
  const node = path[path.length - 1]
  const place = placeOf(path)
  if (place) return `≈ ${formatPersonal(node.value / place.residents, spec.lang)} ${translate(spec.lang, 'perResidentShort')}`
  return `≈ ${formatPersonal(node.value / spec.dataset.population, spec.lang)} ${translate(spec.lang, 'perPersonYear')}`
}

function shareLine(clip: PreparedClip, child: BudgetNode, parent: BudgetNode): string {
  const { spec } = clip
  if (parent === spec.path[0]) return `${formatPercent(child.value / publicTotal(spec.dataset), spec.lang)} ${translate(spec.lang, 'clipOfAll')}`
  const share = formatPercent(child.value / parent.value, spec.lang)
  return `${share} ${translate(spec.lang, 'ofParent', { parent: parent.name[spec.lang] })}`
}

function drawCaption(ctx: CanvasRenderingContext2D, clip: PreparedClip, focus: LaidSlice, parent: BudgetNode, alpha: number) {
  if (alpha <= 0.002) return
  const { spec, layout: L } = clip
  const C = THEME[spec.theme]
  const u = L.u
  const box: Box = L.caption
  const node = focus.node
  const slot = focus.slot
  ctx.save()
  ctx.globalAlpha = alpha
  const shift = (1 - alpha) * 24 * u
  let y = box.y + shift

  // Colour key + name.
  const key = 30 * u
  const nameFit = fitWrapped(ctx, node.name[spec.lang], 700, 50 * u, box.w - key - 20 * u, 2, 32 * u)
  ctx.fillStyle = seriesHex(slot, spec.theme)
  roundRect(ctx, box.x, y + nameFit.size * 0.18, key, key, 7 * u)
  ctx.fill()
  font(ctx, 700, nameFit.size)
  ctx.fillStyle = C.primary
  nameFit.lines.forEach((line, i) => ctx.fillText(line, box.x + key + 20 * u, y + nameFit.size * 0.92 + i * nameFit.size * 1.15))
  y += nameFit.lines.length * nameFit.size * 1.15 + 22 * u

  // Amount.
  const amount = moneyParts(node.value, spec.lang).text
  const amountSize = fitSingle(ctx, amount, 800, 84 * u, box.w)
  ctx.fillStyle = C.primary
  ctx.fillText(amount, box.x, y + amountSize * 0.82)
  y += amountSize + 16 * u

  // Share and per-person lines.
  font(ctx, 500, 34 * u)
  ctx.fillStyle = C.secondary
  const lines = [shareLine(clip, node, parent)]
  if (spec.showPerPerson) lines.push(perPersonLine(spec, [...spec.path.slice(0, spec.path.indexOf(parent) + 1), node]))
  for (const line of lines) {
    for (const part of wrap(ctx, line, box.w, 2)) {
      ctx.fillText(part, box.x, y + 34 * u * 0.8)
      y += 34 * u * 1.3
    }
  }
  ctx.restore()
}

function drawSummary(ctx: CanvasRenderingContext2D, clip: PreparedClip, alpha: number) {
  if (alpha <= 0.002) return
  const { spec, layout: L } = clip
  const C = THEME[spec.theme]
  const u = L.u
  const box = L.caption
  const target = spec.path[spec.path.length - 1]
  ctx.save()
  ctx.globalAlpha = alpha
  let y = box.y + (1 - alpha) * 24 * u

  const nameFit = fitWrapped(ctx, target.name[spec.lang], 650, 40 * u, box.w, 2, 28 * u)
  font(ctx, 650, nameFit.size)
  ctx.fillStyle = C.secondary
  nameFit.lines.forEach((line, i) => ctx.fillText(line, box.x, y + nameFit.size * 0.92 + i * nameFit.size * 1.15))
  y += nameFit.lines.length * nameFit.size * 1.15 + 10 * u

  const amount = moneyParts(target.value, spec.lang).text
  const amountSize = fitSingle(ctx, amount, 800, 112 * u, box.w)
  ctx.fillStyle = C.primary
  ctx.fillText(amount, box.x, y + amountSize * 0.84)
  y += amountSize + 18 * u

  const facts: string[] = []
  const all = publicTotal(spec.dataset)
  if (target.value !== all) facts.push(`${formatPercent(target.value / all, spec.lang)} ${translate(spec.lang, 'clipOfAll')}`)
  if (spec.showPerPerson) facts.push(perPersonLine(spec, spec.path))
  if (spec.myAnnualTaxes !== null) {
    const mine = (target.value / all) * spec.myAnnualTaxes
    facts.push(`≈ ${formatPersonal(mine, spec.lang)} ${translate(spec.lang, 'fromMyTaxesYear', { year: spec.dataset.year })}`)
  }
  font(ctx, 550, 34 * u)
  for (const fact of facts) {
    ctx.fillStyle = C.secondary
    for (const part of wrap(ctx, fact, box.w, 2)) {
      ctx.fillText(part, box.x, y + 34 * u * 0.8)
      y += 34 * u * 1.32
    }
  }
  ctx.restore()
}

function drawFooter(ctx: CanvasRenderingContext2D, clip: PreparedClip) {
  const { spec, layout: L } = clip
  const C = THEME[spec.theme]
  const u = L.u
  const box = L.footer
  const source = spec.dataset.sourceShort?.[spec.lang] ?? spec.dataset.sources[0]?.name[spec.lang] ?? ''
  font(ctx, 500, 22 * u)
  ctx.fillStyle = C.muted
  const right = spec.siteLabel
  const rightW = right ? ctx.measureText(right).width : 0
  const leftText = wrap(ctx, `${translate(spec.lang, 'source')}: ${source}`, box.w - rightW - 32 * u, 1)[0]
  const y = box.y + box.h * 0.7
  ctx.fillText(leftText, box.x, y)
  if (right) {
    font(ctx, 650, 22 * u)
    ctx.fillStyle = C.secondary
    ctx.textAlign = 'right'
    ctx.fillText(right, box.x + box.w, y)
    ctx.textAlign = 'left'
  }
  ctx.strokeStyle = C.hairline
  ctx.lineWidth = 2 * u
  ctx.beginPath()
  ctx.moveTo(box.x, box.y - 6 * u)
  ctx.lineTo(box.x + box.w, box.y - 6 * u)
  ctx.stroke()
}

/** Suggested text to post alongside the clip. */
export function postCaption(spec: ClipSpec): string {
  const { path, lang, dataset } = spec
  const root = path[0]
  const target = path[path.length - 1]
  const amount = moneyParts(target.value, lang).text
  const place = placeOf(path)
  const pp = formatPersonal(target.value / (place?.residents ?? dataset.population), lang)
  const year = dataset.year
  const plan = dataset.kind === 'plan'
  const forecast = dataset.stage === 'forecast'
  const all = publicTotal(dataset)
  const share = target.value === all ? '' : ` (${formatPercent(target.value / all, lang)} ${translate(lang, 'clipOfAll')})`
  const source = dataset.sourceShort?.[lang] ?? ''
  // The root is all public spending only when the dataset covers all of it.
  const everything = target === root && root.value === all
  // A part of a place's money (a transfer of one municipality) names the place too.
  const within = place && place.id !== target.id ? place : null
  if (lang === 'bg') {
    const name = `„${target.name.bg}“${within ? ` на ${within.name.bg}` : ''}`
    const plans = forecast ? `Прогнозата на МФ за ${year} г. предвижда` : `Бюджетът за ${year} г. предвижда`
    const head = everything
      ? plan
        ? `${plans} публични разходи от ${amount}`
        : `През ${year} г. публичните разходи на България са ${amount}`
      : plan
        ? `${plans} ${amount} за ${name}${share}`
        : `През ${year} г. за ${name} са похарчени ${amount}${share}`
    const per = place ? `на жител на ${place.name.bg}` : 'на човек'
    return `${head} — около ${pp} ${per} годишно.\n\nИзточник: ${source}\n#бюджет #България #публичнифинанси`
  }
  const name = `“${target.name.en}”${within ? ` in ${within.name.en}` : ''}`
  const plans = forecast ? `The Ministry of Finance forecast for ${year} plans` : `Bulgaria's ${year} budget plans`
  const head = everything
    ? plan
      ? `${plans} ${amount} of public spending`
      : `Bulgaria's public spending in ${year}: ${amount}`
    : plan
      ? `${plans} ${amount} for ${name}${share}`
      : `In ${year}, Bulgaria spent ${amount} on ${name}${share}`
  const per = place ? `per resident of ${place.name.en}` : 'per person'
  return `${head} — about ${pp} ${per} a year.\n\nSource: ${source}\n#Bulgaria #budget #publicfinance`
}
