import { readdirSync, readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { parseCsv } from '../../../scripts/lib/csv.ts'
import { unmaskedIds } from '../../../scripts/lib/sebra.ts'
import { LARGE, TOP_BY_PAYER } from '../../../scripts/payments.ts'
import { bucketOf, resolveRef, unpackShard } from '../listData'
import type { ListCell, ListFile, ListIndex, ListShardFile } from '../types'

const sources = new URL('../../../data/sources/sebra/', import.meta.url)
const data = new URL('../../../public/data/', import.meta.url)
const read = <T,>(file: string) => JSON.parse(readFileSync(new URL(file, data), 'utf8')) as T

function table(file: string): Record<string, string>[] {
  const raw = readFileSync(new URL(file, sources))
  const [header, ...rows] = parseCsv((file.endsWith('.gz') ? gunzipSync(raw) : raw).toString('utf8'))
  return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])))
}

/** Every row of a list, from its file or all its shards. */
function rowsOf(list: ListFile): Record<string, ListCell>[] {
  const rows = list.rows ?? (list.shards?.files ?? []).flatMap((f) => unpackShard(list.columns, read<ListShardFile>(f.file), list.shards?.by))
  return rows.map((row) => Object.fromEntries(list.columns.map((c, i) => [c.id, row[i]])))
}

const cents = (s: string) => Math.round(Number(s) * 100)
const flows = table('flows.csv.gz')
const flowTotal = flows.reduce((s, f) => s + cents(f.amount_eur), 0) / 100

describe('the extracts (data/sources/sebra)', () => {
  const quarters = table('quarters.csv')

  it('keep every published payment and its amount', () => {
    expect(quarters.reduce((s, q) => s + Number(q.rows), 0)).toBe(1_801_465)
    expect(flows.reduce((s, f) => s + Number(f.payments), 0)).toBe(1_801_465)
    expect(flowTotal).toBeCloseTo(quarters.reduce((s, q) => s + cents(q.amount_eur), 0) / 100, 2)
    // The quarter checked by hand when the source was surveyed: 122,647 payments, €10.34 bn.
    const q2 = quarters.find((q) => q.period === '2026Q2')!
    expect([Number(q2.rows), Number(q2.amount_eur)]).toEqual([122_647, 10_344_931_935.05])
    // Leva files convert at the fixed rate, each payment rounded to the cent.
    const q1 = quarters.find((q) => q.period === '2024Q1')!
    expect(Math.abs(Number(q1.amount_eur) - Number(q1.amount) / 1.95583)).toBeLessThan(Number(q1.rows) * 0.005)
  })

  it('never hold bank accounts, nor purposes of payments to natural persons', () => {
    const large = table('payments-large.csv.gz')
    const persons = new Set(table('payees.csv.gz').filter((p) => p.class === 'person').map((p) => p.id))
    expect(large.filter((r) => persons.has(r.payee) && r.purpose)).toEqual([])
    for (const file of ['payees.csv.gz', 'payments-large.csv.gz', 'payer-units.csv']) {
      const raw = readFileSync(new URL(file, sources))
      const text = (file.endsWith('.gz') ? gunzipSync(raw) : raw).toString('utf8')
      expect(text, file).not.toMatch(/\bBG\d{2}[A-Z]{4}\d{6}[A-Z0-9]{8}\b/)
    }
  })
})

describe('personal identity numbers', () => {
  it('are masked in every published list and every payment extract', () => {
    for (const dir of [new URL('lists/', data), sources]) {
      for (const file of readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((f) => /\.(json|csv|csv\.gz)$/.test(f))) {
        const raw = readFileSync(new URL(file, dir))
        expect(unmaskedIds((file.endsWith('.gz') ? gunzipSync(raw) : raw).toString('utf8')), file).toEqual([])
      }
    }
  })
})

describe('payment lists', () => {
  const index = read<ListIndex>('lists/index.json')
  const list = (id: string) => read<ListFile>(index.lists.find((l) => l.id === id)!.file)

  it('add up, with the rest of each payer’s payees in one row per class', () => {
    const byPayer = rowsOf(list('payments-by-payer'))
    const sum = (rows: Record<string, ListCell>[]) => rows.reduce((s, r) => s + (r.amount as number), 0)
    // Whole euros per row: the totals differ from the cents by rounding only.
    expect(Math.abs(sum(byPayer) - flowTotal)).toBeLessThan(byPayer.length)
    const mlsp2025 = byPayer.filter((r) => r.system === '015' && r.year === '2025')
    const fromFlows = flows.filter((f) => f.unit.startsWith('015') && f.quarter.startsWith('2025')).reduce((s, f) => s + cents(f.amount_eur), 0) / 100
    expect(Math.abs(sum(mlsp2025) - fromFlows)).toBeLessThan(mlsp2025.length)
    // At most the largest 150 + 30 payees, then one "other payees" row per class.
    expect(mlsp2025.filter((r) => r.id !== null).length).toBeLessThanOrEqual(TOP_BY_PAYER.other + TOP_BY_PAYER.public)
    expect(mlsp2025.filter((r) => r.id === null).every((r) => typeof r.payee === 'object')).toBe(true)
    // The quarters add up to the year.
    for (const r of mlsp2025) expect(Math.abs((r.quarters as number[]).reduce((s, v) => s + (v ?? 0), 0) - (r.amount as number))).toBeLessThanOrEqual(2)
  })

  it('give each payee a page whose payers add up to its total', () => {
    const page = list('payee')
    const rows = rowsOf(page)
    expect(rows.length).toBe(rowsOf(list('payees')).length)
    let all = 0
    for (const r of rows) {
      const parts = r.payers as (string | number)[][]
      const total = parts.reduce((s, p) => s + p.slice(1).reduce<number>((a, b) => a + (b as number), 0), 0)
      expect(Math.abs(total - (r.amount as number))).toBeLessThanOrEqual(parts.length * 5)
      all += r.amount as number
    }
    expect(Math.abs(all - flowTotal)).toBeLessThan(rows.length)
    // The page of a payee is in the shard its id hashes to.
    const id = rows[1234].id as string
    const shard = page.shards!.files.find((f) => f.value === String(bucketOf(id, page.shards!.hash!)))!
    expect(unpackShard(page.columns, read<ListShardFile>(shard.file), page.shards?.by).some((row) => row[0] === id)).toBe(true)
  })

  it('total the payment codes as the flows do, and list single payments of €1 m or more', () => {
    const codes = rowsOf(list('payment-codes'))
    expect(Math.abs(codes.reduce((s, r) => s + (r.amount as number), 0) - flowTotal)).toBeLessThan(codes.length)
    const large = rowsOf(list('payments-large'))
    expect(large.every((r) => (r.amount as number) >= LARGE)).toBe(true)
    expect(large.filter((r) => r.cls === 'pe' && r.purpose !== null)).toEqual([])
    // A payment checked against the published row: КОНСОРЦИУМ БУЛЕМУ, 1 Jul 2025, 278 541 485,28 leva, code 50.
    expect(large.find((r) => r.payee === 'КОНСОРЦИУМ БУЛЕМУ' && r.date === '2025-07-01')).toMatchObject({ amount: 142_416_000, code: '50', system: '983' })
  })

  it('link each ministry (system × 100 = its ЕБК code) and Sofia to its payees', () => {
    const links = index.links.filter((l) => l.list === 'payments-by-payer')
    const of = (family: string, year: number) => links.find((l) => l.family === family && l.years.includes(year))!
    expect(of('ministries', 2025).values?.molsp).toBe('015')
    expect(of('ministries', 2025).filters).toEqual({ year: '2025' })
    // The innovation ministry is "mig" until 2025 and "mid" in 2026; SEBRA keeps code 074.
    expect(of('ministries', 2025).values?.mig).toBe('074')
    expect(of('ministries', 2026).values?.mid).toBe('074')
    expect(of('municipalities', 2026).values?.['sofiya-grad-stolichna-obshtina']).toBe('422')
    // The total of a link is what the list shows by default (without the public sector).
    const rows = rowsOf(list('payments-by-payer')).filter((r) => r.system === '015' && r.year === '2025' && r.cls !== 'pu')
    expect(of('ministries', 2025).nodes.molsp[1]).toBe(rows.reduce((s, r) => s + (r.amount as number), 0))
  })

  it('show summaries and sorts the list files can resolve', () => {
    for (const meta of index.lists.filter((l) => l.group === 'payments')) {
      const file = read<ListFile>(meta.file)
      for (const ref of [...meta.summary, meta.sort.replace(/^-/, '')]) expect(resolveRef(file.columns, ref), `${meta.id}: ${ref}`).not.toBeNull()
    }
  })
})
