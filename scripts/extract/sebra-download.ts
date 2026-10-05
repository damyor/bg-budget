// Downloads the SEBRA payment data into data/cache/sebra/ (never committed). Files already
// cached are not fetched again; requests are sequential, with pauses, and back off on errors.
//
//   node scripts/extract/sebra-download.ts            # individual payments (data.egov.bg dataset 20439)
//   node scripts/extract/sebra-download.ts --daily    # also the daily totals (dataset 7806) from 2024 on
//
// Individual payments of 5,000 leva or more: every quarterly CSV resource (fetched through the API as
// JSON, <yyyy>Q<n>.json) and the one ZIP for 01.07.2022–31.12.2023 (2022-2023.zip). Daily totals: one
// file per working day (daily/<yyyy-mm-dd>.json), used to check how much of all SEBRA payments the
// individual list covers. MANIFEST.md lists every file with its URL and retrieval date.

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'

const CACHE = new URL('../../data/cache/sebra/', import.meta.url)
const API = 'https://data.egov.bg/api/'
const PAYMENTS = '57f1e2e7-b235-45e8-94c4-4d69f0b1a690'
const DAILY = '01293990-7330-49c6-92a2-cc73db73ec24'
const DAILY_FROM = '2024-01-01'

interface Resource {
  uri: string
  name: string
  file_format: string
  created_at: string
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function request(url: string, init?: RequestInit): Promise<Buffer> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(900_000) })
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`)
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
      return Buffer.from(await res.arrayBuffer())
    } catch (e) {
      if (attempt >= 4) throw e
      console.warn(`  ${String(e)}; retrying in ${30 * attempt} s`)
      await sleep(30_000 * attempt)
    }
  }
}

const post = (method: string, body: unknown) =>
  request(API + method, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

async function listResources(dataset: string, until?: (r: Resource) => boolean): Promise<Resource[]> {
  const all: Resource[] = []
  for (let page = 1; ; page++) {
    const res = JSON.parse((await post('listResources', { criteria: { dataset_uri: dataset }, records_per_page: 100, page_number: page })).toString())
    if (!res.success) throw new Error(`listResources ${dataset}: ${JSON.stringify(res).slice(0, 200)}`)
    const batch = res.resources as Resource[]
    all.push(...batch)
    if (batch.length < 100 || (until && batch.some(until))) return all
    await sleep(1000)
  }
}

/** "За периода 01.04.2026 г. - 30.06.2026 г." → "2026Q2"; the 2022–2023 ZIP → "2022-2023". */
export function periodOf(name: string): string {
  const dates = [...name.matchAll(/(\d\d)\.(\d\d)\.(\d{4})/g)]
  if (dates.length !== 2) throw new Error(`Unexpected resource name "${name}"`)
  const [from, to] = dates.map((m) => ({ month: Number(m[2]), year: Number(m[3]) }))
  if (from.year !== to.year) return `${from.year}-${to.year}`
  const q = Math.floor((from.month - 1) / 3) + 1
  if (Math.floor((to.month - 1) / 3) + 1 !== q) throw new Error(`"${name}" is not one quarter`)
  return `${from.year}Q${q}`
}

const manifest: string[] = []
const today = new Date().toISOString().slice(0, 10)
const note = (file: string, url: string, what: string) => manifest.push(`| ${file} | ${url} (${what}) | ${today} |`)

/** Downloads the payment files; returns the last day they cover. */
async function payments(): Promise<string> {
  const resources = await listResources(PAYMENTS)
  writeFileSync(new URL('resources.json', CACHE), JSON.stringify(resources, null, 1))
  for (const r of resources) {
    const period = periodOf(r.name)
    // The 2024 Q1 and 2025 Q4 ZIPs repeat their CSV resources; only 2022–2023 exists as a ZIP alone.
    const zip = r.file_format === 'ZIP'
    if (zip && !period.includes('-')) continue
    const file = zip ? `${period}.zip` : `${period}.json`
    const path = new URL(file, CACHE)
    const url = zip ? `https://data.egov.bg/resource/download/zip/${r.uri}` : `${API}getResourceData {"resource_uri":"${r.uri}"}`
    if (existsSync(path) && statSync(path).size > 1000) {
      console.log(`  cached ${file}`)
      continue
    }
    const data = zip ? await request(`https://data.egov.bg/resource/download/zip/${r.uri}`) : await post('getResourceData', { resource_uri: r.uri })
    writeFileSync(path, data)
    note(file, url, r.name)
    console.log(`  ${file}: ${(data.length / 1e6).toFixed(1)} MB`)
    await sleep(5000)
  }
  const last = resources.map((r) => periodOf(r.name)).filter((p) => p.includes('Q')).sort().at(-1)!
  const month = Number(last.slice(-1)) * 3
  return new Date(Date.UTC(Number(last.slice(0, 4)), month, 0)).toISOString().slice(0, 10)
}

/** The daily totals of the days the payment files cover, from DAILY_FROM on. */
async function daily(until: string) {
  mkdirSync(new URL('daily/', CACHE), { recursive: true })
  const day = (r: Resource) => r.name.slice(6)
  const resources = (await listResources(DAILY, (r) => day(r) < DAILY_FROM)).filter(
    (r) => /^SEBRA-\d{4}-\d\d-\d\d$/.test(r.name) && day(r) >= DAILY_FROM && day(r) <= until,
  )
  writeFileSync(new URL('daily/resources.json', CACHE), JSON.stringify(resources, null, 1))
  let fetched = 0
  for (const r of resources) {
    const file = `daily/${r.name.slice(6)}.json`
    const path = new URL(file, CACHE)
    if (existsSync(path)) continue
    const data = await post('getResourceData', { resource_uri: r.uri })
    // A day not yet processed answers {"success":true} without data.
    if (!Array.isArray(JSON.parse(data.toString()).data)) throw new Error(`${r.name}: no data`)
    writeFileSync(path, data)
    if (++fetched % 50 === 0) console.log(`  ${fetched} daily files`)
    await sleep(2500)
  }
  if (fetched) note(`daily/ (${fetched} files)`, `${API}getResourceData`, `dataset 7806, ${resources.length} days from ${DAILY_FROM}`)
  console.log(`  daily totals: ${resources.length} days to ${until}, ${fetched} fetched now`)
}

mkdirSync(CACHE, { recursive: true })
const until = await payments()
if (process.argv.includes('--daily')) await daily(until)
if (manifest.length) {
  const path = new URL('MANIFEST.md', CACHE)
  const head = existsSync(path) ? readFileSync(path, 'utf8').trimEnd() : '# SEBRA payments (cache)\n\n| File | URL | Retrieved |\n| --- | --- | --- |'
  writeFileSync(path, `${head}\n${manifest.join('\n')}\n`)
}
