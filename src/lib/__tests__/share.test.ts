import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { datasetSharePages, homeSharePages, shareFile, sharePageHtml } from '../../../scripts/sharePages.ts'
import { hashtags, measure, NETWORKS, placeTag, postTexts, summary } from '../../clip/caption'
import { graphemeLength, hashtagCount, sharePath, shareUrl, siteLabel, xLength } from '../share'
import { buildIndex, pathTo, realPathTo } from '../tree'
import type { BudgetNode, Dataset, DatasetIndexEntry, Lang } from '../types'

const dir = new URL('../../../public/data/', import.meta.url)
const index = JSON.parse(readFileSync(new URL('index.json', dir), 'utf8')) as DatasetIndexEntry[]
const load = (id: string) => JSON.parse(readFileSync(new URL(index.find((e) => e.id === id)!.file, dir), 'utf8')) as Dataset
const SITE = 'https://damyor.github.io/bg-budget/'

describe('share links', () => {
  it('point every view to its own share page', () => {
    expect(sharePath('bg', 'budget-2026', 'health')).toBe('bg/budget-2026/health')
    expect(sharePath('en', 'budget-2026', 'root')).toBe('en/budget-2026/')
    expect(shareUrl(SITE, 'en', 'municipalities-2026', 'plovdiv-plovdiv')).toBe('https://damyor.github.io/bg-budget/en/municipalities-2026/plovdiv-plovdiv')
    expect(shareFile('bg', 'budget-2026', 'health')).toBe('bg/budget-2026/health.html')
    expect(shareFile('bg', 'budget-2026', 'root')).toBe('bg/budget-2026/index.html')
  })

  it('label the site as people would type it', () => {
    expect(siteLabel(SITE)).toBe('damyor.github.io/bg-budget')
    expect(siteLabel('https://www.example.bg/')).toBe('example.bg')
  })
})

describe('counting characters', () => {
  it('counts like X: links 23, Cyrillic 1, € 2', () => {
    expect(xLength('Бюджет')).toBe(6)
    expect(xLength('„Здраве“ — 6 €')).toBe(15)
    expect(xLength(`виж ${SITE}bg/budget-2026/health-hospitals-very-long-id`)).toBe(4 + 23)
  })

  it('counts graphemes and hashtags', () => {
    expect(graphemeLength('е́ 👍🏽')).toBe(3)
    expect(hashtagCount('#бюджет #България текст #publicfinance')).toBe(3)
  })
})

describe('post texts', () => {
  const budget = load('budget-2026')
  const tree = buildIndex(budget.root)
  const health = realPathTo(tree, 'health')
  const url = shareUrl(SITE, 'bg', 'budget-2026', 'health')

  it('give each network the headline, the facts and the link where links work', () => {
    const posts = postTexts({ dataset: budget, path: health, lang: 'bg', title: 'Колко харчи България за „Здравеопазване“?', url, site: siteLabel(SITE) })
    expect(posts.facebook[0].text).toContain('Колко харчи България за „Здравеопазване“?')
    expect(posts.facebook[0].text).toContain('Бюджетът за 2026 г. предвижда')
    expect(posts.facebook[0].text).toContain(url)
    expect(posts.x[0].text).toContain(url)
    expect(posts.bluesky[0].text).toContain(url)
    expect(posts.messengers[0].text.endsWith(url)).toBe(true)
    // TikTok and Instagram do not open links: their captions carry the short address to type.
    expect(posts.tiktok[0].text).not.toContain('https://')
    expect(posts.instagram[0].text).toContain('Виж целия бюджет: damyor.github.io/bg-budget')
    expect(posts.youtube.map((f) => f.id)).toEqual(['title', 'description'])
    expect(hashtags(budget, health, 'bg').slice(0, 2)).toEqual(['#здравеопазване', '#бюджет'])
  })

  it('stay within every network’s limits, even for the longest names', { timeout: 30_000 }, () => {
    const datasets = ['budget-2026', 'municipalities-2026', 'cities-2025', 'ministries-2026', 'report-2025'].map(load)
    for (const dataset of datasets) {
      const t = buildIndex(dataset.root)
      const real = [...t.byId.entries()].filter(([, n]) => !n.synthetic)
      // The top levels, and the views with the longest names along their path (the hardest to fit).
      const weight = new Map(real.map(([id]) => [id, realPathTo(t, id).reduce((sum, n) => sum + n.name.bg.length, 0)]))
      const longest = real.map(([id]) => id).sort((a, b) => weight.get(b)! - weight.get(a)!)
      const ids = new Set([...real.filter(([, n]) => n.depth <= 2).map(([id]) => id), ...longest.slice(0, 40)])
      for (const id of ids) {
        const path = realPathTo(t, id)
        for (const lang of ['bg', 'en'] as Lang[]) {
          // The longest headline the studio allows is 120 characters.
          const title = 'Х'.repeat(120)
          const posts = postTexts({ dataset, path, lang, title, url: shareUrl(SITE, lang, dataset.id, id), site: siteLabel(SITE) })
          for (const network of NETWORKS) {
            for (const field of posts[network]) {
              if (field.limit !== undefined) expect(measure(field.text, field.counting), `${dataset.id}/${id} ${network}`).toBeLessThanOrEqual(field.limit)
              if (field.maxHashtags !== undefined) expect(hashtagCount(field.text)).toBeLessThanOrEqual(field.maxHashtags)
            }
          }
        }
      }
    }
  })

  it('name the place of municipal and city money', () => {
    const place = (bg: string, en: string): BudgetNode => ({ id: 'p', name: { bg, en }, value: 1 })
    expect(placeTag(place('Община Пловдив', 'Plovdiv municipality'), 'bg')).toBe('#Пловдив')
    expect(placeTag(place('Община Пловдив', 'Plovdiv municipality'), 'en')).toBe('#Plovdiv')
    expect(placeTag(place('Столична община (София)', 'Sofia (Stolichna municipality)'), 'bg')).toBe('#София')
    expect(placeTag(place('Столична община (София)', 'Sofia (Stolichna municipality)'), 'en')).toBe('#Sofia')
    expect(placeTag(place('Област Велико Търново', 'Veliko Tarnovo Province'), 'bg')).toBe('#ВеликоТърново')

    const cities = load('cities-2025')
    const plovdiv = realPathTo(buildIndex(cities.root), 'plovdiv-plovdiv')
    expect(summary(cities, plovdiv, 'bg')).toMatch(/^През 2025 г\. Община Пловдив е похарчила .+ на жител на Община Пловдив годишно\.$/)
    expect(summary(cities, plovdiv, 'en')).toMatch(/^In 2025, Plovdiv municipality spent /)
    expect(hashtags(cities, plovdiv, 'bg')[0]).toBe('#Пловдив')
  })
})

describe('share pages', () => {
  it('carry the view’s preview and forward to it', () => {
    const html = sharePageHtml({
      lang: 'bg',
      url: `${SITE}bg/budget-2026/health`,
      title: 'Колко харчи България за „Здравеопазване“?',
      description: 'A "quoted" <b>fact</b> & more',
      image: `${SITE}og/bg.png`,
      target: '/bg-budget/#/explore?d=budget-2026&n=health&lang=bg',
    })
    expect(html).toContain('<meta property="og:url" content="https://damyor.github.io/bg-budget/bg/budget-2026/health">')
    expect(html).toContain('<meta property="og:description" content="A &quot;quoted&quot; &lt;b&gt;fact&lt;/b&gt; &amp; more">')
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image">')
    expect(html).toContain('location.replace("/bg-budget/#/explore?d=budget-2026&n=health&lang=bg"')
    expect(html).toContain('<meta name="robots" content="noindex">')
  })

  it('cover every node of a dataset in both languages, with the facts of that node', () => {
    const budget = load('budget-2027')
    const pages = [...datasetSharePages(budget, SITE, '/bg-budget/')]
    const nodes = buildIndex(budget.root).byId.size
    expect(pages).toHaveLength(nodes * 2)
    const health = pages.find((p) => p.file === 'en/budget-2027/health.html')!
    expect(health.html).toContain('How much does Bulgaria spend on “Health”?')
    expect(health.html).toContain('The Ministry of Finance forecast for 2027 plans')
    expect(health.html).toContain('"/bg-budget/#/explore?d=budget-2027&n=health&lang=en"')
    expect(pages.find((p) => p.file === 'bg/budget-2027/index.html')!.html).toContain('"/bg-budget/#/explore?d=budget-2027&lang=bg"')
    expect([...homeSharePages(SITE, '/bg-budget/')].map((p) => p.file)).toEqual(['bg/index.html', 'en/index.html'])
  })

  it('give every node a file name of its own, also on case-insensitive disks', () => {
    for (const entry of index) {
      const pages = datasetSharePages(load(entry.id), SITE, '/')
      expect(() => pages.next(), entry.id).not.toThrow()
    }
  })

  it('describe the "Other" bucket with its category', () => {
    const budget = load('budget-2026')
    const tree = buildIndex(budget.root)
    const other = [...tree.byId.values()].find((n) => n.synthetic && n.depth === 2)!
    const text = summary(budget, pathTo(tree, other.node.id), 'bg')
    expect(text).toMatch(/за „.+ — Други“/)
  })
})
