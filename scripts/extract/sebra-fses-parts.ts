// Parts of the reports' Electricity System Security Fund box (`e-energy.fses`, report-2024 and report-2025) from the
// fund's own SEBRA payments (data/sources/sebra/): every recipient paid €1 m or more in the year by name, natural
// persons as one group that is never named, the other recipients as one part. Names stay as published; the English
// name is their official transliteration, as for the hospitals. See data/sources/sebra/README.md,
// "The Electricity System Security Fund's recipients".
//
//   node scripts/extract/sebra-fses-parts.ts
//
// Writes data/sources/sebra/sebra-fses.parts.csv. Stops unless the payments cover 95–100% of the КФП box.

import { writeFileSync } from 'node:fs'
import { readCsv } from '../lib/csv.ts'
import { latinName } from '../health.ts'
import { payeeMatches, type ProcurementData } from '../procurement.ts'

const ROOT = new URL('../../', import.meta.url)
const SEBRA = new URL('data/sources/sebra/', ROOT)
const LEVA = 1.95583
const SYSTEM = '124'
const PARENT = 'e-energy.fses'
const THRESHOLD = 100_000_000 // cents: €1 m

/** Payment codes of spending: running costs, other, interest, subsidies, benefits, capital. Transfers to other
 * budgets (60), financing (70, 80, 88, 89) and refunds of revenue (90) are not spending of the box. */
const SPENDING = new Set(['10', '18', '20', '30', '40', '50'])

/** Payees in the consolidated fiscal programme (КФП): money paid to them is not a recipient's in a consolidated tree. */
const KFP_BODIES: Record<string, string> = { yvs1kecs: 'СТОЛИЧНА ОБЩИНА' }
/** Public-sector payees outside the КФП: recipients like any company. */
const OUTSIDE_KFP: Record<string, string> = { bxa4m2np: 'ДП НК ЖИ (a state enterprise)' }

/** Payments the source lists that came back to the fund (the КФП does not count them). */
const RETURNED = [
  {
    year: '2024',
    quarter: '2024Q4',
    payee: '8qp9kfty',
    code: '30',
    cents: 163_967_146,
    why: '13.11.2024, 3 206 918,64 BGN to a closed account: back the next day (SEBRA daily totals 14.11.2024, code 98: −3 206 918,64 BGN) and paid again on 14.11.2024',
  },
]

/** The КФП box: function VIII.А, column ФСЕС, of the year's report (million leva, one decimal). */
function kfpBox(year: string): number {
  const rows = readCsv(new URL(`data/sources/report-${year}/kfp-${year}-report-by-function.csv`, ROOT))
  const row = rows.find((r) => r.row_kind === 'subfunction' && r.subfunction.startsWith('А. МИННО ДЕЛО') && r.column === 'ФСЕС')
  if (!row) throw new Error(`report-${year}: no ФСЕС row in sub-function VIII.А`)
  return Math.round((Number(row.value_mBGN.replace(/\s/g, '').replace(',', '.')) * 1e6 * 100) / LEVA)
}

const payees = new Map(readCsv(new URL('payees.csv.gz', SEBRA)).map((r) => [r.id, r]))
const flows = readCsv(new URL('flows.csv.gz', SEBRA)).filter((f) => f.unit.startsWith(`${SYSTEM}-`))

// ЕИК (company number) of a payee, by the rule the procurement supplier pages use to link to SEBRA payees: the
// normalised name with its legal form matches exactly one supplier and one payee.
const suppliers = new Map(readCsv(new URL('data/sources/procurement/suppliers.csv.gz', ROOT)).map((r) => [r.key, { kind: r.kind, eik: r.eik, name: r.name, members: [] }]))
const named = new Map([...payees.values()].filter((p) => p.class !== 'person' && p.class !== 'sole-trader').map((p) => [p.id, p.name]))
const eikOf = new Map<string, string>()
for (const [key, payee] of payeeMatches({ suppliers } as unknown as ProcurementData, named)) {
  const eik = suppliers.get(key)!.eik
  if (/^\d{9}(\d{4})?$/.test(eik) && Number(eik) > 1000) eikOf.set(payee.id, eik)
}

const csv = (v: string | number) => (typeof v === 'string' && /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : String(v))
const euros = (cents: number) => (cents / 100).toFixed(2)
const out: string[] = ['dataset,parent,id,name_bg,name_en,value_eur,code,kind_bg,kind_en,note_bg,note_en']
const KIND = ['Получател', 'Recipient']

for (const year of ['2024', '2025']) {
  const byPayee = new Map<string, number>()
  let excluded = 0
  for (const f of flows.filter((x) => x.quarter.startsWith(year))) {
    const cents = Math.round(Number(f.amount_eur) * 100)
    const payee = payees.get(f.payee)
    if (!payee) throw new Error(`unknown payee ${f.payee}`)
    if (!SPENDING.has(f.code) || KFP_BODIES[f.payee]) {
      excluded += cents
      continue
    }
    if (payee.class === 'public' && !OUTSIDE_KFP[f.payee]) throw new Error(`${year}: public payee ${f.payee} ${payee.name}: in the КФП or not? Decide and list it`)
    byPayee.set(f.payee, (byPayee.get(f.payee) ?? 0) + cents)
  }
  for (const r of RETURNED.filter((x) => x.year === year)) {
    const paid = flows.filter((f) => f.quarter === r.quarter && f.payee === r.payee && f.code === r.code).reduce((s, f) => s + Math.round(Number(f.amount_eur) * 100), 0)
    if (paid < 2 * r.cents) throw new Error(`${r.payee}: the returned payment is not in the flows twice`)
    byPayee.set(r.payee, byPayee.get(r.payee)! - r.cents)
    excluded += r.cents
  }
  const box = kfpBox(year)
  const total = [...byPayee.values()].reduce((s, c) => s + c, 0)
  const coverage = total / box
  console.log(`${year}: box €${euros(box)}, payments €${euros(total)} (${(coverage * 100).toFixed(2)}%), excluded €${euros(excluded)}`)
  if (coverage < 0.95 || total > box + 20_000_000) throw new Error(`${year}: the payments cover ${(coverage * 100).toFixed(2)}% of the box: not parts`)

  const dataset = `report-${year}`
  const sorted = [...byPayee].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  let persons = 0
  let rest = 0
  let others = 0
  let shown = 0
  for (const [id, cents] of sorted) {
    const payee = payees.get(id)!
    if (payee.class === 'person') {
      persons += cents
      continue
    }
    if (cents < THRESHOLD) {
      rest += cents
      others++
      continue
    }
    const eik = eikOf.get(id)
    out.push([dataset, PARENT, `${PARENT}.${eik ?? id}`, payee.name, latinName(payee.name), euros(cents), eik ?? '', ...KIND, '', ''].map(csv).join(','))
    shown++
  }
  if (persons) {
    out.push(
      [
        dataset,
        PARENT,
        `${PARENT}.persons`,
        'Физически лица',
        'Natural persons',
        euros(persons),
        '',
        ...KIND,
        'Плащания към получатели, които данните за плащанията публикуват като физически лица или чието име е на човек; имената им не се показват.',
        'Payments to recipients the payment data publishes as natural persons, or whose name is a person’s; their names are not shown.',
      ]
        .map(csv)
        .join(','),
    )
  }
  out.push(
    [
      dataset,
      PARENT,
      `${PARENT}.other-payees`,
      'Други получатели (под 1 млн. € всеки)',
      'Other recipients (under €1 m each)',
      euros(rest),
      '',
      ...KIND,
      `${others} фирми и организации с плащания под 1 млн. € всяка през ${year} г. Всички са в „Списъци“ › „Кой получава парите — по платци“ (платец: Фонд „Сигурност на електроенергийната система“).`,
      `${others} companies and organisations, each paid under €1 m in ${year}. All of them are in “Lists” › “Who gets paid — by payer” (payer: Electricity System Security Fund).`,
    ]
      .map(csv)
      .join(','),
  )
  console.log(`  ${shown} named (${[...eikOf.keys()].filter((id) => (byPayee.get(id) ?? 0) >= THRESHOLD).length} with an ЕИК), persons €${euros(persons)}, ${others} others €${euros(rest)}, remainder €${euros(box - total)}`)
}

writeFileSync(new URL('sebra-fses.parts.csv', SEBRA), out.join('\n') + '\n')
console.log(`✓ data/sources/sebra/sebra-fses.parts.csv: ${out.length - 1} rows`)
