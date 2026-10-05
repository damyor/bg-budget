// Extracts the SEBRA individual payments (data.egov.bg dataset 20439) from the cached downloads
// (data/cache/sebra/, see scripts/extract/sebra-download.ts) into compact, aggregated extracts in
// data/sources/sebra/ (see its README), which the site's build reads.
//
//   node --max-old-space-size=8192 scripts/extract/sebra.ts
//
// Every published row is kept: rows whose columns are shifted are realigned (scripts/lib/sebra.ts),
// amounts are converted to euro, payee spellings are grouped into payees and classified, and payer
// units are grouped by name and code. IBANs are used only for grouping and never written out;
// natural persons and sole traders — by the rules of the EU-funds and farm-subsidy extracts, which
// scripts/extract/persons.py applies to every spelling (it needs python3) — are one group without
// names, and the purposes of payments to them are dropped. Stops on any failed check.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync, gzipSync } from 'node:zlib'
import { parseCsv } from '../lib/csv.ts'
import { readRegister } from '../lib/places.ts'
import {
  classify,
  COLUMNS,
  euroCents,
  groupPayees,
  isPerson,
  keyCore,
  learnGivenNames,
  maskIds,
  mentionsId,
  nameKey,
  normalizeName,
  parsePayment,
  PERSONS,
  quarterOf,
  shortId,
  unitKey,
  unmaskedIds,
  setPersonalKeys,
  type ClassSignals,
  type NamePair,
  type PayeeClass,
  type Payment,
} from '../lib/sebra.ts'

const CACHE = new URL('../../data/cache/sebra/', import.meta.url)
const OUT = new URL('../../data/sources/sebra/', import.meta.url)
/** Payments of at least this much (euro) are kept one by one, with their purpose. */
export const LARGE = 500_000

function fail(message: string): never {
  console.error(`✗ sebra: ${message}`)
  process.exit(1)
}

/** What the anonymised group of natural persons and sole traders is called in the extracts. */
const PERSONS_NAME = 'ФИЗИЧЕСКИ ЛИЦА И ЕДНОЛИЧНИ ТЪРГОВЦИ'

/** The kind of each name by scripts/extract/persons.py: "sole-trader", "person" or "" (an organisation). */
function personKinds(names: string[]): string[] {
  if (names.some((n) => /[\r\n]/.test(n))) fail('a name with a line break')
  const out = execFileSync('python3', [new URL('persons.py', import.meta.url).pathname], { input: names.map((n) => `${n}\n`).join(''), maxBuffer: 1 << 28 })
  const kinds = out.toString('utf8').split('\n').slice(0, -1)
  if (kinds.length !== names.length) fail(`persons.py answered ${kinds.length} lines for ${names.length} names`)
  return kinds
}

// ---------- reading ----------

interface SourceFile {
  file: string
  period: string
  rows: string[][]
}

function* sources(): Generator<SourceFile> {
  const files = readdirSync(CACHE).filter((f) => /^\d{4}Q\d\.json$|^\d{4}-\d{4}\.zip$/.test(f)).sort()
  for (const file of files) {
    let table: string[][]
    if (file.endsWith('.zip')) {
      const csv = execFileSync('unzip', ['-p', new URL(file, CACHE).pathname], { maxBuffer: 1 << 30 }).toString('utf8')
      table = parseCsv(csv.replace(/^﻿/, ''))
    } else {
      const json = JSON.parse(readFileSync(new URL(file, CACHE), 'utf8'))
      if (!json.success || !Array.isArray(json.data)) fail(`${file}: no data`)
      table = json.data
    }
    const header = table[0].map((h) => String(h).replace(/^﻿/, '').trim())
    if (header.join() !== COLUMNS.join()) fail(`${file}: unexpected columns ${header.join()}`)
    yield { file, period: file.replace(/\.(json|zip)$/, ''), rows: table.slice(1).filter((r) => r.length > 1 || (r[0] ?? '').trim()) }
  }
}

interface Row extends Payment {
  period: string
  cents: number
}

const rows: Row[] = []
const perFile: Record<string, string | number>[] = []
/** The names each system is published under (PRIMARY_ORGANIZATION). */
const systemNames = new Map<string, Map<string, number>>()
for (const source of sources()) {
  const currency = source.period >= '2026' ? 'EUR' : 'BGN'
  let repaired = 0
  let amount = 0
  let cents = 0
  let first = '9999'
  let last = ''
  for (const fields of source.rows) {
    let p: Payment
    try {
      p = parsePayment(fields.map((v) => (v === null || v === undefined ? '' : String(v))), currency)
    } catch (e) {
      fail(`${source.file}: ${String(e)}`)
    }
    if (p.currency !== currency) fail(`${source.file}: a payment in ${p.currency}`)
    if (!(p.amount > 0)) fail(`${source.file}: amount ${p.amount}`)
    const row = { ...p, period: source.period, cents: euroCents(p.amount, p.currency) }
    rows.push(row)
    const systemName = maskIds(String(fields[14] ?? '').replace(/\s+/g, ' ').trim())
    if (!p.repaired && fields[15] === p.system && systemName && !/^\d+$/.test(systemName)) {
      const names = systemNames.get(p.system) ?? new Map<string, number>()
      names.set(systemName, (names.get(systemName) ?? 0) + 1)
      systemNames.set(p.system, names)
    }
    if (p.repaired) repaired++
    amount += p.amount
    cents += row.cents
    if (p.date < first) first = p.date
    if (p.date > last) last = p.date
    // Every quarterly file holds its quarter only.
    if (source.period.includes('Q') && quarterOf(p.date) !== source.period) fail(`${source.file}: a payment of ${p.date}`)
  }
  perFile.push({
    file: source.file,
    period: source.period,
    rows: source.rows.length,
    repaired,
    currency,
    amount: amount.toFixed(2),
    amount_eur: (cents / 100).toFixed(2),
    first_date: first,
    last_date: last,
  })
  console.log(`✓ ${source.file}: ${source.rows.length} payments (${repaired} realigned), ${(cents / 1e11).toFixed(3)} bn EUR`)
}

// ---------- payer systems and units ----------

// Rows that lost both their system column and their unit code take the system of their unit's name.
const systemsByUnit = new Map<string, Set<string>>()
for (const r of rows) if (r.system) systemsByUnit.set(unitKey(r.unitName), (systemsByUnit.get(unitKey(r.unitName)) ?? new Set()).add(r.system))
let lookedUp = 0
for (const r of rows) {
  if (r.system) continue
  const found = [...(systemsByUnit.get(unitKey(r.unitName)) ?? [])]
  if (found.length !== 1) fail(`no system for unit "${r.unitName}" (${r.date}, ${r.amount})`)
  r.system = found[0]
  lookedUp++
}
// Rows cut off before their payment code take the code their payer used most for the same payee,
// or else for any payee.
const codeCounts = new Map<string, Map<string, number>>()
const count = (key: string, code: string) => {
  const m = codeCounts.get(key) ?? new Map<string, number>()
  m.set(code, (m.get(code) ?? 0) + 1)
  codeCounts.set(key, m)
}
const codeKeys = (r: Row) => [`${r.system}|${unitKey(r.unitName)}|${r.account || nameKey(r.name)}`, `${r.system}|${unitKey(r.unitName)}`]
for (const r of rows) if (r.code) codeKeys(r).forEach((k) => count(k, r.code))
let inferred = 0
for (const r of rows) {
  if (r.code) continue
  const found = codeKeys(r).map((k) => codeCounts.get(k)).find(Boolean)
  if (!found) fail(`no payment code for a payment of ${r.date} by "${r.unitName}"`)
  r.code = [...found].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0]
  inferred++
}
console.log(`✓ payment codes: ${inferred} rows cut off before their code took their payer's usual one`)
const badCodes = rows.filter((r) => !/^(10|18|20|30|40|50|60|70|80|88|89|90)$/.test(r.code))
if (badCodes.length) fail(`unknown payment codes: ${[...new Set(badCodes.map((r) => r.code))].join(', ')}`)

const mismatched = rows.filter((r) => r.unitCode && r.unitCode.slice(0, 3) !== r.system).length
console.log(`✓ systems: ${lookedUp} rows took the system of their unit's name; ${mismatched} unit codes outside their system`)
if (mismatched > 50) fail(`${mismatched} unit codes do not start with their system code`)

// Payer units: spellings of one name within a system, joined through the unit codes they share.
const unitParent = new Map<string, string>()
const unitFind = (x: string): string => {
  let root = x
  while (unitParent.has(root) && unitParent.get(root) !== root) root = unitParent.get(root)!
  unitParent.set(x, root)
  return root
}
const unitUnion = (a: string, b: string) => {
  const ra = unitFind(a)
  const rb = unitFind(b)
  if (ra !== rb) unitParent.set(ra < rb ? rb : ra, ra < rb ? ra : rb)
}
const unitOfRow = (r: Row) => `N:${r.system}|${unitKey(r.unitName)}`
for (const r of rows) {
  unitFind(unitOfRow(r))
  if (r.unitCode) unitUnion(unitOfRow(r), `C:${r.unitCode}`)
}
interface Unit {
  system: string
  names: Map<string, number>
  keys: Map<string, number>
  payments: number
  cents: number
}
const units = new Map<string, Unit>()
for (const r of rows) {
  const root = unitFind(unitOfRow(r))
  const u = units.get(root) ?? { system: r.system, names: new Map(), keys: new Map(), payments: 0, cents: 0 }
  if (u.system !== r.system) fail(`unit "${r.unitName}" is in systems ${u.system} and ${r.system}`)
  u.names.set(r.unitName, (u.names.get(r.unitName) ?? 0) + 1)
  u.keys.set(unitKey(r.unitName), (u.keys.get(unitKey(r.unitName)) ?? 0) + 1)
  u.payments++
  u.cents += r.cents
  units.set(root, u)
}
const top = <K>(counts: Map<K, number>): K => [...counts].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))[0][0]
const unitIds = new Map<string, string>()
const unitById = new Map<string, Unit>()
for (const [root, u] of units) {
  const id = `${u.system}-${shortId(`${u.system}|${top(u.keys)}`, 5)}`
  if (unitById.has(id)) fail(`duplicate unit id ${id}`)
  unitIds.set(root, id)
  unitById.set(id, u)
}
console.log(`✓ payer units: ${units.size} in ${new Set([...units.values()].map((u) => u.system)).size} systems`)

// ---------- payees ----------

// Given names, from the sole traders among the payees, to recognise payees that are just a person's name.
console.log(`✓ ${learnGivenNames([...new Set(rows.map((r) => r.name))].map(normalizeName))} given names learnt from sole traders' names`)
const keyCache = new Map<string, string>()
const keys = rows.map((r) => {
  let key = keyCache.get(r.name)
  if (key === undefined) keyCache.set(r.name, (key = nameKey(r.name)))
  return key
})
// Natural persons by the rules the EU-funds and farm-subsidy extracts use: every spelling that scripts/extract/persons.py
// takes for a sole trader's or a person's name joins the anonymised group (with the publisher's "ФИЗИЧЕСКО ЛИЦЕ").
const spellings = [...keyCache.keys()]
const kindsOfSpellings = personKinds(spellings)
const personalKeys = new Set(spellings.filter((_, i) => kindsOfSpellings[i]).map((name) => keyCache.get(name)!))
console.log(
  `✓ persons.py: ${kindsOfSpellings.filter((k) => k === 'sole-trader').length} spellings of sole traders and ${kindsOfSpellings.filter((k) => k === 'person').length} of persons' names → ${setPersonalKeys(personalKeys)} name keys not named`,
)
const pairMap = new Map<string, NamePair>()
rows.forEach((r, i) => {
  const id = `${keys[i]}\t${r.account}`
  const pair = pairMap.get(id) ?? { key: keys[i], account: r.account, payments: 0, cents: 0 }
  pair.payments++
  pair.cents += r.cents
  pairMap.set(id, pair)
})
// Places that may follow a payee's name to name its branch: municipalities and provinces (and the first
// word of the two-word ones).
const register = readRegister(new URL('../../data/sources/places/municipalities.csv', import.meta.url))
const places = new Set(
  register.all.flatMap((m) => [m.name, m.province]).flatMap((name) => {
    const upper = name.toLocaleUpperCase('bg-BG').replace(/[„“"”-]/g, ' ').replace(/\s+/g, ' ').trim()
    return [upper, upper.split(' ')[0]]
  }),
)
const groupOf = groupPayees([...pairMap.values()], places)

interface Payee {
  root: string
  names: Map<string, number>
  keys: Map<string, number>
  accounts: Set<string>
  signals: ClassSignals
  /** Money by the class of each spelling, for the vote. */
  votes: Map<string, { cls: PayeeClass; rule: string; cents: number }>
  payments: number
  first: string
  last: string
}
const payees = new Map<string, Payee>()
const rowGroup = rows.map((r, i) => {
  const root = groupOf(keys[i], r.account)
  let p = payees.get(root)
  if (!p) {
    p = { root, names: new Map(), keys: new Map(), accounts: new Set(), signals: { bnb: 0, transfers: 0, total: 0 }, votes: new Map(), payments: 0, first: r.date, last: r.date }
    payees.set(root, p)
  }
  p.names.set(r.name, (p.names.get(r.name) ?? 0) + 1)
  p.keys.set(keys[i], (p.keys.get(keys[i]) ?? 0) + 1)
  if (r.account) p.accounts.add(r.account)
  p.signals.total += r.cents
  if (r.bic.startsWith('BNBG')) p.signals.bnb += r.cents
  if (r.code === '60') p.signals.transfers += r.cents
  p.payments++
  if (r.date < p.first) p.first = r.date
  if (r.date > p.last) p.last = r.date
  return root
})

// Class: the money-weighted vote of the classes of the payee's spellings (each judged with the
// payee's signals); "other" counts only when nothing else has a vote.
const keyCents = new Map<string, Map<string, number>>()
rows.forEach((r, i) => {
  const m = keyCents.get(rowGroup[i]) ?? new Map<string, number>()
  m.set(keys[i], (m.get(keys[i]) ?? 0) + r.cents)
  keyCents.set(rowGroup[i], m)
})
interface PayeeOut {
  id: string
  name: string
  cls: PayeeClass
  rule: string
  aliases: string[]
  spellings: number
}
const payeeOut = new Map<string, PayeeOut>()
const usedIds = new Map<string, string>()
for (const p of payees.values()) {
  const tally = new Map<PayeeClass, { cents: number; rule: string }>()
  for (const [key, cents] of keyCents.get(p.root)!) {
    const { cls, rule } = classify(key, p.signals)
    const t = tally.get(cls) ?? { cents: 0, rule }
    t.cents += cents
    tally.set(cls, t)
  }
  // The class with the most money, "other" only when no spelling says more.
  const ranked = [...tally].sort((a, b) => b[1].cents - a[1].cents)
  const [cls, { rule }] = ranked.find(([c]) => c !== 'other') ?? ranked[0]
  // The main spelling is one that does not mention an identity number, where there is one.
  const plain = <K>(counts: Map<K, number>) => new Map([...counts].filter(([k]) => !mentionsId(String(k))))
  const canonical = top(plain(p.keys).size ? plain(p.keys) : p.keys)
  const name = top(plain(p.names).size ? plain(p.names) : p.names)
  const id =
    p.root === PERSONS ? PERSONS
    : p.root.startsWith('K:') ? shortId(`K:${canonical}`)
    : p.root.startsWith('A:') ? shortId(`A:${canonical}#${[...p.accounts].sort()[0]}`)
    : shortId(`N:${canonical}`)
  if (usedIds.has(id)) fail(`payee id ${id} for both "${usedIds.get(id)}" and "${name}"`)
  usedIds.set(id, name)
  // Other spellings, for search: the most frequent ones that add words.
  const words = new Set(keyCore(nameKey(name)).split(' '))
  const aliases: string[] = []
  for (const [alias] of [...p.names].sort((a, b) => b[1] - a[1])) {
    if (aliases.length >= 3 || cls === 'person') break
    if (mentionsId(alias)) continue
    const extra = keyCore(nameKey(alias)).split(' ').filter((w) => w.length > 2 && !words.has(w))
    if (!extra.length) continue
    extra.forEach((w) => words.add(w))
    aliases.push(alias)
  }
  payeeOut.set(p.root, {
    id,
    name: cls === 'person' ? PERSONS_NAME : name,
    cls,
    rule,
    aliases,
    spellings: p.names.size,
  })
}
const classCounts = new Map<string, { payees: number; cents: number }>()
for (const p of payees.values()) {
  const c = payeeOut.get(p.root)!.cls
  const e = classCounts.get(c) ?? { payees: 0, cents: 0 }
  e.payees++
  e.cents += p.signals.total
  classCounts.set(c, e)
}
console.log(`✓ payees: ${payees.size} from ${new Set(keys).size} name keys and ${new Set(rows.map((r) => r.account).filter(Boolean)).size} accounts`)
for (const [c, e] of [...classCounts].sort()) console.log(`    ${c}: ${e.payees} payees, ${(e.cents / 1e11).toFixed(2)} bn EUR`)

// ---------- writing ----------

const csvCell = (v: string | number) => {
  const s = String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const toCsv = (header: string[], data: (string | number)[][]) => [header.join(','), ...data.map((r) => r.map(csvCell).join(','))].join('\n') + '\n'
const eur = (cents: number) => (cents / 100).toFixed(2)
function write(file: string, header: string[], data: (string | number)[][]) {
  const text = toCsv(header, data)
  const body = file.endsWith('.gz') ? gzipSync(text, { level: 9 }) : Buffer.from(text)
  writeFileSync(new URL(file, OUT), body)
  console.log(`  → data/sources/sebra/${file}: ${data.length} rows, ${(body.length / 1e6).toFixed(2)} MB`)
}
mkdirSync(OUT, { recursive: true })

write('quarters.csv', Object.keys(perFile[0]), perFile.map((f) => Object.values(f)))

// Systems: the name as published most often.
const systems = new Map<string, { names: Map<string, number>; payments: number; cents: number; first: string; last: string }>()
for (const r of rows) {
  const s = systems.get(r.system) ?? { names: systemNames.get(r.system) ?? new Map(), payments: 0, cents: 0, first: r.date, last: r.date }
  s.payments++
  s.cents += r.cents
  if (r.date < s.first) s.first = r.date
  if (r.date > s.last) s.last = r.date
  systems.set(r.system, s)
}
write(
  'systems.csv',
  ['code', 'name_bg', 'payments', 'amount_eur', 'first_date', 'last_date'],
  [...systems].sort().map(([code, s]) => [code, s.names.size ? top(s.names) : '', s.payments, eur(s.cents), s.first, s.last]),
)

write(
  'payer-units.csv',
  ['id', 'system', 'name', 'spellings', 'payments', 'amount_eur'],
  [...unitById].sort().map(([id, u]) => [id, u.system, top(u.names), u.names.size, u.payments, eur(u.cents)]),
)

const payeeRows = [...payees.values()]
  .map((p) => ({ p, o: payeeOut.get(p.root)! }))
  .sort((a, b) => a.o.id.localeCompare(b.o.id))
write(
  'payees.csv.gz',
  ['id', 'name', 'class', 'rule', 'spellings', 'aliases', 'payments', 'amount_eur', 'first_date', 'last_date'],
  payeeRows.map(({ p, o }) => [o.id, o.name, o.cls, o.rule, o.spellings, o.aliases.join(' | '), p.payments, eur(p.signals.total), p.first, p.last]),
)

// Flows: payee × payer unit × quarter × payment code.
const flows = new Map<string, { payments: number; cents: number }>()
rows.forEach((r, i) => {
  const key = `${quarterOf(r.date)}\t${payeeOut.get(rowGroup[i])!.id}\t${unitIds.get(unitFind(unitOfRow(r)))}\t${r.code}`
  const f = flows.get(key) ?? { payments: 0, cents: 0 }
  f.payments++
  f.cents += r.cents
  flows.set(key, f)
})
write(
  'flows.csv.gz',
  ['quarter', 'payee', 'unit', 'code', 'payments', 'amount_eur'],
  [...flows].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([k, f]) => [...k.split('\t'), f.payments, eur(f.cents)]),
)

// Large payments, one by one; no purpose for payments to natural persons.
const large = rows
  .map((r, i) => ({ r, i }))
  .filter(({ r }) => r.cents >= LARGE * 100)
  .sort((a, b) => a.r.date.localeCompare(b.r.date) || b.r.cents - a.r.cents || a.i - b.i)
const perQuarter = new Map<string, number>()
write(
  'payments-large.csv.gz',
  ['id', 'date', 'payee', 'unit', 'code', 'amount_eur', 'amount', 'currency', 'purpose'],
  large.map(({ r, i }) => {
    const q = quarterOf(r.date)
    const n = (perQuarter.get(q) ?? 0) + 1
    perQuarter.set(q, n)
    const payee = payeeOut.get(rowGroup[i])!
    return [`${q}-${n}`, r.date, payee.id, unitIds.get(unitFind(unitOfRow(r)))!, r.code, eur(r.cents), r.amount.toFixed(2), r.currency, payee.cls === 'person' || isPerson(keys[i]) ? '' : r.reason]
  }),
)

// ---------- daily totals (dataset 7806), to compare ----------

const dailyDir = new URL('daily/', CACHE)
const lastQuarter = rows.reduce((q, r) => (quarterOf(r.date) > q ? quarterOf(r.date) : q), '')
if (existsSync(dailyDir)) {
  const totals = new Map<string, { cents: number; days: Set<string> }>()
  const codeNames = new Map<string, string>()
  for (const file of readdirSync(dailyDir).filter((f) => /^\d{4}-\d\d-\d\d\.json$/.test(f)).sort()) {
    const json = JSON.parse(readFileSync(new URL(file, dailyDir), 'utf8'))
    if (!Array.isArray(json.data)) continue
    const day = file.slice(0, 10)
    // Only the quarters the payment files cover.
    if (quarterOf(day) > lastQuarter) continue
    // Two days come as objects keyed "0" … "3" instead of arrays.
    const table = (json.data as unknown[]).map((r) => (Array.isArray(r) ? r : [0, 1, 2, 3].map((i) => (r as Record<string, string | null>)[i]))) as (string | null)[][]
    const unit = String(table[0][0])
    const leva = /в лева/i.test(unit)
    if (!leva && !/в евро/i.test(unit)) fail(`daily/${file}: unknown currency "${unit}"`)
    let system: string | null = null
    for (const r of table) {
      const head = String(r[0] ?? '')
      if (head.startsWith('Общо')) system = null
      const m = /\(\s*(\d{3})\*+\s*\)/.exec(head)
      if (m) {
        system = m[1]
        continue
      }
      const code = /^(\d\d) xxxx$/.exec(head)
      if (!code) continue
      codeNames.set(code[1], maskIds(String(r[1] ?? '').trim()))
      if (!system) continue
      const value = Number(r[3])
      if (!Number.isFinite(value)) fail(`daily/${file}: amount ${r[3]}`)
      const key = `${quarterOf(day)}\t${system}\t${code[1]}`
      const t = totals.get(key) ?? { cents: 0, days: new Set() }
      t.cents += euroCents(value, leva ? 'BGN' : 'EUR')
      t.days.add(day)
      totals.set(key, t)
    }
  }
  write(
    'daily-totals.csv',
    ['quarter', 'system', 'code', 'amount_eur', 'days'],
    [...totals].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([k, t]) => [...k.split('\t'), eur(t.cents), t.days.size]),
  )
  write('codes.csv', ['code', 'name_bg'], [...codeNames].sort())
}

// ---------- checks ----------

// No name written as a payee's name or alias is a natural person's or a sole trader's (search must not find them).
{
  const written = payeeRows.flatMap(({ o }) => (o.cls === 'person' ? [] : [o.name, ...o.aliases]))
  const kinds = personKinds(written)
  const named = written.filter((_, i) => kinds[i])
  if (named.length) fail(`${named.length} payee names or aliases are a person's or a sole trader's, e.g. ${named.slice(0, 3).join('; ')}`)
  console.log(`✓ none of the ${written.length} payee names and aliases written is a person's or a sole trader's (persons.py)`)
}

// No file written here may hold a personal identity number (the publisher let some through in names and purposes).
for (const file of readdirSync(OUT).filter((f) => /\.csv(\.gz)?$/.test(f))) {
  const raw = readFileSync(new URL(file, OUT))
  const leaks = unmaskedIds((file.endsWith('.gz') ? gunzipSync(raw) : raw).toString('utf8'))
  if (leaks.length) fail(`${file} holds ${leaks.length} unmasked personal numbers`)
}

const total = (list: Row[]) => list.reduce((s, r) => s + r.cents, 0)
const flowCents = [...flows.values()].reduce((s, f) => s + f.cents, 0)
if (flowCents !== total(rows)) fail(`flows add up to ${flowCents}, the rows to ${total(rows)}`)
if ([...flows.values()].reduce((s, f) => s + f.payments, 0) !== rows.length) fail('flows lose payments')
console.log(`✓ ${rows.length} payments, ${eur(total(rows))} EUR; ${large.length} of at least ${LARGE} EUR`)
