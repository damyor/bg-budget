// "Who gets paid": the state's individual payments of 5,000 leva (€2,556.46) or more through SEBRA, the
// payment system of the budget, as lists (format: ListFile in src/lib/types.ts), from the extracts in
// data/sources/sebra/ (made by scripts/extract/sebra.ts, see the folder's README):
//   payments-by-payer   the largest payees of each payer system in each year, by quarter
//   payments-by-unit    the largest payees of each payer unit, by year
//   payees              every payee (search), linking to its page
//   payee               one payee: who paid it, by payer unit and year (reached through links)
//   payments-large      single payments of €1 m or more
//   payment-codes       totals by payer system, payment code and year, against SEBRA's daily totals
// Payments never become tree nodes; ministries (by the ЕБК code join: system × 100) and Sofia link to them.

import type { Dataset, ListCell, ListColumn, LocalizedText } from '../src/lib/types.ts'
import { readCsv } from './lib/csv.ts'
import type { ListGroup, ListSpec } from './lib/lists.ts'
import type { Register } from './lib/places.ts'
import { CLASSES, PAY_CODE_EN, systemName, systemOfCode, unitCodes } from './lib/sebra-labels.ts'

const t = (bg: string, en: string): LocalizedText => ({ bg, en })

/** Each payer system and year shows this many of its largest payees outside the public sector, and of public bodies. */
export const TOP_BY_PAYER = { other: 150, public: 30 }
/** Each payer unit shows the payees that are among its largest this many in some year. */
export const TOP_BY_UNIT = { other: 8, public: 4 }
/** Single payments of at least this much (euro) are listed one by one. */
export const LARGE = 1_000_000
/** The payees list and the payee pages are split into this many files by a hash of the payee id. */
const SEARCH_FILES = 4
const PAYEE_FILES = 64

const YEARS = ['2022', '2023', '2024', '2025', '2026']
const QUARTERS = ['I', 'II', 'III', 'IV']
const SOFIA_SYSTEM = '422'

export const PAYMENTS: ListGroup = {
  id: 'payments',
  title: t('Кой получава парите', 'Who gets paid'),
  description: t(
    'Плащанията на министерствата, фондовете и другите бюджетни организации от 5 000 лв. (2 556,46 €) нагоре, които минават през СЕБРА — системата за плащания на бюджета в БНБ: кой ги е получил, от кого, кога и за какво. От юли 2022 до юни 2026 г. — 1,8 милиона плащания за 150 млрд. €. Не са част от кръговата диаграма: това са плащанията, с които се изпълняват бюджетите, а не отделни разходи към тях.',
    'Payments of 5,000 leva (€2,556.46) or more made by ministries, funds and other budget bodies through SEBRA, the budget’s payment system at the central bank: who received them, from whom, when and what for. July 2022 to June 2026 — 1.8 million payments, €150 bn. They are not slices of the donut: they are the payments through which the budgets are spent, not extra spending.',
  ),
}

// ---------- reading the extracts ----------

const cents = (euro: string) => Math.round(Number(euro) * 100)
const euros = (c: number) => Math.round(c / 100)

interface Flow {
  year: string
  /** Quarter of the year, 0–3. */
  q: number
  payee: string
  unit: string
  system: string
  code: string
  payments: number
  cents: number
}

interface Payee {
  name: string | LocalizedText
  cls: string
  aliases: string
}

/** The one row that stands for every natural person and sole trader (the extracts call it "ФИЗИЧЕСКИ ЛИЦА И ЕДНОЛИЧНИ ТЪРГОВЦИ"). */
const PERSONS_ROW = t('Физически лица и еднолични търговци (без имена)', 'Natural persons and sole traders (not named)')

export interface PaymentsData {
  flows: Flow[]
  payees: Map<string, Payee>
  units: Map<string, { system: string; name: string }>
  large: Record<string, string>[]
  codes: Map<string, string>
  daily: Record<string, string>[]
}

export function readPayments(dir: URL): PaymentsData {
  const flows = readCsv(new URL('flows.csv.gz', dir)).map((r) => ({
    year: r.quarter.slice(0, 4),
    q: Number(r.quarter.slice(-1)) - 1,
    payee: r.payee,
    unit: r.unit,
    system: r.unit.slice(0, 3),
    code: r.code,
    payments: Number(r.payments),
    cents: cents(r.amount_eur),
  }))
  const payees = new Map(
    readCsv(new URL('payees.csv.gz', dir)).map((r) => [r.id, { name: r.class === 'person' ? PERSONS_ROW : r.name, cls: CLASSES[r.class].id, aliases: r.class === 'person' ? '' : r.aliases }]),
  )
  const units = new Map(readCsv(new URL('payer-units.csv', dir)).map((r) => [r.id, { system: r.system, name: r.name }]))
  return {
    flows,
    payees,
    units,
    large: readCsv(new URL('payments-large.csv.gz', dir)),
    codes: new Map(readCsv(new URL('codes.csv', dir)).map((r) => [r.code, r.name_bg])),
    daily: readCsv(new URL('daily-totals.csv', dir)),
  }
}

// ---------- shared pieces ----------

const SEBRA = {
  name: t(
    'Министерство на електронното управление — списък с индивидуалните плащания от 5 000 лв. нагоре, инициирани с бюджетни платежни искания и финализирани в СЕБРА, кодове 10–90 (data.egov.bg, набор 20439), 01.07.2022–30.06.2026 г.',
    'Ministry of e-Government — individual payments of 5,000 leva or more initiated by budget payment requests and settled in SEBRA, codes 10–90 (data.egov.bg dataset 20439), 1 Jul 2022 – 30 Jun 2026',
  ),
  url: 'https://data.egov.bg/data/view/57f1e2e7-b235-45e8-94c4-4d69f0b1a690',
}
const DAILY = {
  name: t(
    'Министерство на финансите — плащания в СЕБРА и други плащания в БНБ, ежедневно по първостепенни системи и кодове за вид плащане (data.egov.bg, набор 7806)',
    'Ministry of Finance — payments in SEBRA and other payments at the central bank, daily by primary system and payment code (data.egov.bg dataset 7806)',
  ),
  url: 'https://data.egov.bg/data/view/01293990-7330-49c6-92a2-cc73db73ec24',
}

const CAVEATS: LocalizedText[] = [
  t(
    'Тук са само плащанията от 5 000 лв. (2 556,46 €) нагоре с кодове за вид плащане от 10 до 90, които бюджетните организации правят през СЕБРА. Липсват: заплатите и осигуровките (кодове 01–05), плащанията под 5 000 лв., общините без София (те не са в СЕБРА — виждат се само трансферите към тях), службите за сигурност и разузнаване, НАП и Агенция „Митници“ и плащанията, отбелязани като поверителни.',
    'Only payments of 5,000 leva (€2,556.46) or more with payment codes 10 to 90 that budget bodies make through SEBRA are here. Missing: salaries and contributions (codes 01–05), payments under 5,000 leva, municipalities other than Sofia (they are not in SEBRA — only the transfers to them show), the security and intelligence services, the tax agency and Customs, and payments marked confidential.',
  ),
  t(
    'Имената са както платецът ги е написал в нареждането — често съкратени (до 26–35 знака) и изписани по различен начин. Изписванията на един получател са събрани в едно: по банкова сметка, по едно и също име без кавички и правна форма, по съкратено име. Банковите сметки не се показват никъде.',
    'Names are as the payer typed them in the payment order — often cut short (at 26–35 characters) and spelled in different ways. The spellings of one payee are grouped together: by bank account, by the same name without quotes and legal form, by a name cut short. Bank accounts are never shown.',
  ),
  t(
    'Физическите лица (публикуващият ги анонимизира като „ФИЗИЧЕСКО ЛИЦЕ“) и едноличните търговци, чието име съдържа името на собственика, не се показват по име: те са една група и основанията на плащанията към тях не се показват. По правилата на списъците с европейски средства и земеделски субсидии в групата са и получателите, чието име е на човек (собствено и фамилно име без нищо, което да показва организация; „ЗП …“), сред тях личните практики на лекари.',
    'Natural persons (anonymised by the publisher as “ФИЗИЧЕСКО ЛИЦЕ”) and sole traders, whose firm name contains the owner’s name, are not shown by name: they are one group, and the purposes of payments to them are not shown. By the rules of the EU-funds and farm-subsidy lists, the group also holds payees whose name is a person’s (a given name and a surname with nothing that marks an organisation; “ЗП …”), doctors’ practices among them.',
  ),
  t(
    'Плащанията към публичния сектор (общини, НОИ, здравната каса, министерства, училища, университети, държавни предприятия …) са скрити, докато не изберете „Всички, и „Публичен сектор““ във „Вид получател“. Получателят е от публичния сектор, ако името му го показва (община, министерство, агенция, училище …) и няма търговска правна форма, ако сметката му е в БНБ или ако повечето пари са му преведени с код 60 (трансфери между бюджети).',
    'Payments to the public sector (municipalities, the social security institute, the health insurance fund, ministries, schools, universities, state enterprises …) are hidden until you choose “All, with “Public sector”” under “Type of payee”. A payee is public when its name says so (municipality, ministry, agency, school …) and it has no commercial legal form, when its account is at the central bank, or when most of its money came with code 60 (transfers between budgets).',
  ),
  t(
    'До 2025 г. сумите са в лева в източника и са превърнати в евро по фиксирания курс 1,95583 лв. за 1 €. 2022 г. започва от 1 юли, 2026 г. стига до 30 юни. Публикуващият премахва данните след 5 години.',
    'Until 2025 the source amounts are in leva and are converted to euro at the fixed rate of 1.95583 leva per euro. 2022 starts on 1 July, 2026 ends on 30 June. The publisher removes the data after 5 years.',
  ),
]

const UNIT = { one: t('получател', 'payee'), other: t('получатели', 'payees') }
const PAYMENT_UNIT = { one: t('плащане', 'payment'), other: t('плащания', 'payments') }

const classColumn = (exclude: boolean): ListColumn => ({
  id: 'cls',
  type: 'category',
  label: t('Вид получател', 'Type of payee'),
  filter: true,
  labels: Object.fromEntries(Object.values(CLASSES).map((c) => [c.id, c.name])),
  ...(exclude ? { exclude: [CLASSES.public.id] } : {}),
})
const systemColumn = (codes: Iterable<string>): ListColumn => ({
  id: 'system',
  type: 'category',
  label: t('Платец', 'Payer'),
  filter: true,
  labels: Object.fromEntries([...new Set(codes)].sort().map((code) => [code, systemName(code)])),
})
const unitLabels = (units: PaymentsData['units'], ids: Iterable<string>) =>
  Object.fromEntries(
    [...new Set(ids)].sort().map((id) => {
      const u = units.get(id)
      if (!u) throw new Error(`payments: unknown payer unit ${id}`)
      return [id, u.name]
    }),
  )
const PAYEE_TITLE: ListColumn = { id: 'payee', type: 'text', label: t('Получател', 'Payee'), search: true }
const PAYEE_ID: ListColumn = { id: 'id', type: 'code', label: t('Номер на получателя', 'Payee id'), hidden: true }
const COUNT: ListColumn = { id: 'count', type: 'number', label: t('Брой плащания', 'Payments'), total: true }
const ROW_LINK = { list: 'payee', filter: 'id', column: 'id' }

/** "Други получатели (1 234)" — the payees of a class outside the largest. */
const rest = (n: number, cls: string): LocalizedText => {
  const name = Object.values(CLASSES).find((c) => c.id === cls)!.name
  const bg = new Intl.NumberFormat('bg-BG').format(n)
  const en = new Intl.NumberFormat('en-GB').format(n)
  return t(`Други получатели — ${name.bg.toLocaleLowerCase('bg-BG')} (${bg})`, `Other payees — ${name.en.toLowerCase()} (${en})`)
}

/** Ministries and agencies of the "Ministries" tree of each year, by SEBRA system: system → node id. */
function ministryNodes(datasets: Dataset[]): Map<number, Record<string, string>> {
  const codes = unitCodes()
  const byYear = new Map<number, Record<string, string>>()
  for (const d of datasets.filter((x) => x.family === 'ministries')) {
    const map = byYear.get(d.year) ?? {}
    for (const node of d.root.children ?? []) if (codes[node.id]) map[systemOfCode(codes[node.id])] = node.id
    byYear.set(d.year, map)
  }
  return byYear
}

const linkYears = (datasets: Dataset[], family: Dataset['family']) => [...new Set(datasets.filter((d) => d.family === family).map((d) => d.year))].sort()

/** "през 2025 г." / "in 2025", or "през януари–юни 2026 г." / "in January–June 2026" for a year the data covers in part. */
function during(data: PaymentsData, year: number): LocalizedText {
  const last = data.flows.reduce((m, f) => (f.year === String(year) && f.q > m ? f.q : m), -1)
  if (last === 3 || last < 0) return t(`през ${year} г.`, `in ${year}`)
  const bg = ['януари–март', 'януари–юни', 'януари–септември'][last]
  const en = ['January–March', 'January–June', 'January–September'][last]
  return t(`през ${bg} ${year} г.`, `in ${en} ${year}`)
}

// ---------- payments by payer: the largest payees of each system in each year ----------

interface PayerYear {
  system: string
  year: string
  payee: string
  cents: number
  /** Cents by quarter. */
  q: number[]
  n: number
}

function byPayer(data: PaymentsData, datasets: Dataset[], register: Register): ListSpec {
  const agg = new Map<string, PayerYear>()
  for (const f of data.flows) {
    const key = `${f.system}|${f.year}|${f.payee}`
    let a = agg.get(key)
    if (!a) agg.set(key, (a = { system: f.system, year: f.year, payee: f.payee, cents: 0, q: [0, 0, 0, 0], n: 0 }))
    a.cents += f.cents
    a.q[f.q] += f.cents
    a.n += f.payments
  }
  const groups = new Map<string, PayerYear[]>()
  for (const a of agg.values()) {
    const key = `${a.system}|${a.year}`
    const list = groups.get(key)
    if (list) list.push(a)
    else groups.set(key, [a])
  }
  const rows: ListCell[][] = []
  const quarters = (q: number[]) => q.map((c) => (c ? euros(c) : null))
  for (const [, list] of [...groups].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    list.sort((a, b) => b.cents - a.cents || a.payee.localeCompare(b.payee))
    const taken = { public: 0, other: 0 }
    const restOf = new Map<string, { cents: number; q: number[]; n: number; payees: number }>()
    for (const a of list) {
      const payee = data.payees.get(a.payee)!
      const kind = payee.cls === CLASSES.public.id ? 'public' : 'other'
      if (taken[kind] < TOP_BY_PAYER[kind]) {
        taken[kind]++
        rows.push([rows.length.toString(36), payee.name, a.payee, payee.cls, a.system, a.year, euros(a.cents), quarters(a.q), a.n])
        continue
      }
      const r = restOf.get(payee.cls) ?? { cents: 0, q: [0, 0, 0, 0], n: 0, payees: 0 }
      r.cents += a.cents
      a.q.forEach((c, i) => (r.q[i] += c))
      r.n += a.n
      r.payees++
      restOf.set(payee.cls, r)
    }
    for (const [cls, r] of restOf) rows.push([rows.length.toString(36), rest(r.payees, cls), null, cls, list[0].system, list[0].year, euros(r.cents), quarters(r.q), r.n])
  }

  const ministries = ministryNodes(datasets)
  const sofia = register.byCode('7225').key
  const links = [
    ...linkYears(datasets, 'ministries').map((year) => ({
      family: 'ministries' as const,
      column: 'system',
      nodes: ministries.get(year)!,
      years: [year],
      filters: { year: String(year) },
      value: 'amount',
      label: during(data, year),
      text: t(`Плащания към фирми, организации и лица: {total} ${during(data, year).bg}`, `Paid to companies, organisations and people: {total} ${during(data, year).en}`),
    })),
    ...linkYears(datasets, 'municipalities').map((year) => ({
      family: 'municipalities' as const,
      column: 'system',
      nodes: { [SOFIA_SYSTEM]: sofia },
      years: [year],
      filters: { year: String(year) },
      value: 'amount',
      label: during(data, year),
      text: t(`Плащания на общината към фирми, организации и лица: {total} ${during(data, year).bg}`, `Paid by the municipality to companies, organisations and people: {total} ${during(data, year).en}`),
    })),
  ]
  return {
    id: 'payments-by-payer',
    group: PAYMENTS.id,
    title: t('Кой получава парите — по платци', 'Who gets paid — by payer'),
    short: t('По платци', 'By payer'),
    description: t(
      `Най-големите получатели на плащания от всяко министерство, фонд и друга първостепенна система в СЕБРА за всяка година, с разбивка по тримесечия: до ${TOP_BY_PAYER.other} фирми, организации и лица и до ${TOP_BY_PAYER.public} публични организации на година, а останалите — събрани в един ред.`,
      `The largest payees of each ministry, fund and other primary system in SEBRA in each year, by quarter: up to ${TOP_BY_PAYER.other} companies, organisations and people and up to ${TOP_BY_PAYER.public} public bodies a year, with the rest summed in one row.`,
    ),
    sources: [SEBRA],
    caveats: [
      t(
        'Платецът е първостепенната система в СЕБРА — министерството или ведомството заедно с поделенията му (кодът ѝ × 100 е кодът на разпоредителя в ЕБК). Министерствата в „Разходи“ водят тук.',
        'The payer is the primary system in SEBRA — the ministry or agency together with the units under it (its code × 100 is the unit’s code in the Unified Budget Classification). The ministries in “Spending” link here.',
      ),
      ...CAVEATS,
    ],
    asOf: '2026-06-30',
    retrieved: '2026-10-05',
    unit: UNIT,
    summary: ['amount'],
    sort: '-amount',
    links,
    columns: [
      { id: 'k', type: 'code', label: t('Ред', 'Row'), hidden: true },
      PAYEE_TITLE,
      PAYEE_ID,
      classColumn(true),
      systemColumn(rows.map((r) => r[4] as string)),
      { id: 'year', type: 'category', label: t('Година', 'Year'), filter: true, labels: Object.fromEntries(YEARS.map((y) => [y, t(y, y)])) },
      { id: 'amount', type: 'money', label: t('Платено през годината', 'Paid in the year'), total: true, source: SEBRA.name },
      { id: 'quarters', type: 'series', label: t('По тримесечия', 'By quarter'), periods: QUARTERS, total: true },
      COUNT,
    ],
    key: 'k',
    rowLink: ROW_LINK,
    rows,
    shardBy: 'system',
  }
}

// ---------- payments by payer unit ----------

interface UnitPayee {
  unit: string
  payee: string
  /** Cents by year. */
  years: number[]
  n: number
}

function byUnit(data: PaymentsData): ListSpec {
  const agg = new Map<string, UnitPayee>()
  for (const f of data.flows) {
    const key = `${f.unit}|${f.payee}`
    let a = agg.get(key)
    if (!a) agg.set(key, (a = { unit: f.unit, payee: f.payee, years: YEARS.map(() => 0), n: 0 }))
    a.years[YEARS.indexOf(f.year)] += f.cents
    a.n += f.payments
  }
  const byUnitId = new Map<string, UnitPayee[]>()
  for (const a of agg.values()) {
    const list = byUnitId.get(a.unit)
    if (list) list.push(a)
    else byUnitId.set(a.unit, [a])
  }
  const rows: ListCell[][] = []
  const series = (c: number[]) => c.map((v) => (v ? euros(v) : null))
  for (const [unit, list] of [...byUnitId].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    // A payee is listed when it is among the unit's largest in some year.
    const keep = new Set<string>()
    YEARS.forEach((_, y) => {
      const taken = { public: 0, other: 0 }
      for (const a of [...list].sort((a, b) => b.years[y] - a.years[y] || a.payee.localeCompare(b.payee))) {
        if (!a.years[y]) break
        const kind = data.payees.get(a.payee)!.cls === CLASSES.public.id ? 'public' : 'other'
        if (taken[kind] < TOP_BY_UNIT[kind]) {
          taken[kind]++
          keep.add(a.payee)
        }
      }
    })
    const restOf = new Map<string, { years: number[]; n: number; payees: number }>()
    for (const a of list.sort((a, b) => b.years.reduce((s, v) => s + v, 0) - a.years.reduce((s, v) => s + v, 0) || a.payee.localeCompare(b.payee))) {
      const payee = data.payees.get(a.payee)!
      const total = a.years.reduce((s, v) => s + v, 0)
      if (keep.has(a.payee)) {
        rows.push([rows.length.toString(36), payee.name, a.payee, payee.cls, unit.slice(0, 3), unit, euros(total), series(a.years), a.n])
        continue
      }
      const r = restOf.get(payee.cls) ?? { years: YEARS.map(() => 0), n: 0, payees: 0 }
      a.years.forEach((v, i) => (r.years[i] += v))
      r.n += a.n
      r.payees++
      restOf.set(payee.cls, r)
    }
    for (const [cls, r] of restOf) rows.push([rows.length.toString(36), rest(r.payees, cls), null, cls, unit.slice(0, 3), unit, euros(r.years.reduce((s, v) => s + v, 0)), series(r.years), r.n])
  }
  return {
    id: 'payments-by-unit',
    group: PAYMENTS.id,
    title: t('Кой получава парите — по звена на платеца', 'Who gets paid — by paying unit'),
    short: t('По звена', 'By unit'),
    description: t(
      `Най-големите получатели на всяко звено, което плаща през СЕБРА — регионална здравноосигурителна каса, областна дирекция на МВР, училище, болница към министерство …: всеки получател, който поне в една година е сред първите ${TOP_BY_UNIT.other} фирми и организации или първите ${TOP_BY_UNIT.public} публични организации на звеното, със сумите по години.`,
      `The largest payees of every unit that pays through SEBRA — a regional health insurance fund, a regional police directorate, a school, a ministry hospital …: every payee that was among the unit’s ${TOP_BY_UNIT.other} largest companies and organisations or ${TOP_BY_UNIT.public} largest public bodies in at least one year, with the amounts by year.`,
    ),
    sources: [SEBRA],
    caveats: [
      t(
        'Звената са както са изписани в данните (полето „FIN_NAME“); изписванията на едно и също звено с един и същ код са събрани.',
        'Units are named as in the data (the FIN_NAME field); spellings of one unit with the same code are grouped.',
      ),
      ...CAVEATS,
    ],
    asOf: '2026-06-30',
    retrieved: '2026-10-05',
    unit: UNIT,
    summary: ['amount'],
    sort: '-amount',
    columns: [
      { id: 'k', type: 'code', label: t('Ред', 'Row'), hidden: true },
      PAYEE_TITLE,
      PAYEE_ID,
      classColumn(true),
      systemColumn(rows.map((r) => r[4] as string)),
      { id: 'unit', type: 'category', label: t('Звено', 'Unit'), filter: true, labels: unitLabels(data.units, rows.map((r) => r[5] as string)) },
      { id: 'amount', type: 'money', label: t('Общо 2022–2026', 'Total 2022–2026'), total: true, source: SEBRA.name },
      { id: 'years', type: 'series', label: t('По години', 'By year'), periods: YEARS, total: true },
      COUNT,
    ],
    key: 'k',
    rowLink: ROW_LINK,
    rows,
    shardBy: 'system',
  }
}

// ---------- payees: the search list and each payee's page ----------

function payeeLists(data: PaymentsData): ListSpec[] {
  const per = new Map<string, { years: number[]; n: number; parts: Map<string, number[]> }>()
  for (const f of data.flows) {
    let p = per.get(f.payee)
    if (!p) per.set(f.payee, (p = { years: YEARS.map(() => 0), n: 0, parts: new Map() }))
    const y = YEARS.indexOf(f.year)
    p.years[y] += f.cents
    p.n += f.payments
    let part = p.parts.get(f.unit)
    if (!part) p.parts.set(f.unit, (part = YEARS.map(() => 0)))
    part[y] += f.cents
  }
  const ids = [...per.keys()].sort()
  const total = (years: number[]) => euros(years.reduce((s, v) => s + v, 0))
  const units = [...new Set(data.flows.map((f) => f.unit))].sort()
  const unitIndex = new Map(units.map((u, i) => [u, i]))
  const search: ListSpec = {
    id: 'payees',
    group: PAYMENTS.id,
    title: t('Получатели на плащания', 'Payees'),
    short: t('Получатели', 'Payees'),
    description: t(
      `Всички ${new Intl.NumberFormat('bg-BG').format(ids.length)} получатели на плащания през СЕБРА от юли 2022 до юни 2026 г. Потърсете фирма, организация или община и отворете страницата ѝ: кой ѝ е платил, колко и през коя година.`,
      `All ${new Intl.NumberFormat('en-GB').format(ids.length)} payees of payments through SEBRA from July 2022 to June 2026. Search for a company, an organisation or a municipality and open its page: who paid it, how much and in which year.`,
    ),
    sources: [SEBRA],
    caveats: CAVEATS,
    asOf: '2026-06-30',
    retrieved: '2026-10-05',
    unit: UNIT,
    summary: ['amount'],
    sort: '-amount',
    columns: [
      { ...PAYEE_ID, label: t('Получател', 'Payee') },
      PAYEE_TITLE,
      { id: 'aliases', type: 'text', label: t('Други изписвания', 'Other spellings'), hidden: true, search: true },
      classColumn(false),
      { id: 'amount', type: 'money', label: t('Общо 2022–2026', 'Total 2022–2026'), total: true, source: SEBRA.name },
    ],
    key: 'id',
    rowLink: ROW_LINK,
    rows: ids.map((id) => {
      const payee = data.payees.get(id)!
      return [id, payee.name, payee.aliases || null, payee.cls, total(per.get(id)!.years)]
    }),
    shardBy: 'id',
    shardHash: SEARCH_FILES,
    shardSearch: 2,
  }
  const page: ListSpec = {
    id: 'payee',
    group: PAYMENTS.id,
    hidden: true,
    back: 'payees',
    title: t('Кой плаща на този получател', 'Who paid this payee'),
    short: t('Получател', 'Payee'),
    description: t(
      'Плащанията към един получател от 5 000 лв. нагоре през СЕБРА: по години и по звената, които са платили.',
      'The payments of 5,000 leva or more through SEBRA to one payee: by year and by the units that paid.',
    ),
    sources: [SEBRA],
    caveats: CAVEATS,
    asOf: '2026-06-30',
    retrieved: '2026-10-05',
    unit: UNIT,
    summary: ['amount'],
    sort: '-amount',
    columns: [
      { ...PAYEE_ID, label: t('Получател', 'Payee') },
      PAYEE_TITLE,
      classColumn(false),
      { id: 'amount', type: 'money', label: t('Общо 2022–2026', 'Total 2022–2026'), total: true, source: SEBRA.name },
      COUNT,
      {
        id: 'payers',
        type: 'breakdown',
        label: t('Кой е платил, по години', 'Who paid, by year'),
        detail: true,
        periods: YEARS,
        // Payer units by a short number here (the page is fetched in pieces; their names come once, with the list).
        labels: Object.fromEntries(units.map((u, i) => [i.toString(36), unitLabels(data.units, [u])[u]])),
        groups: {
          of: Object.fromEntries(units.map((u, i) => [i.toString(36), u.slice(0, 3)])),
          labels: Object.fromEntries([...new Set(units.map((u) => u.slice(0, 3)))].map((s) => [s, systemName(s)])),
        },
      },
    ],
    key: 'id',
    rows: ids.map((id) => {
      const payee = data.payees.get(id)!
      const p = per.get(id)!
      // Trailing years without payments are left out of each part.
      const parts = [...p.parts]
        .sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .map(([unit, years]) => {
          const values = years.map(euros)
          while (values.length && !values.at(-1)) values.pop()
          return [unitIndex.get(unit)!.toString(36), ...values]
        })
      return [id, payee.name, payee.cls, total(p.years), p.n, parts]
    }),
    shardBy: 'id',
    shardHash: PAYEE_FILES,
  }
  return [search, page]
}

// ---------- single large payments ----------

function largePayments(data: PaymentsData, datasets: Dataset[]): ListSpec {
  const kept = data.large.filter((r) => Number(r.amount_eur) >= LARGE)
  const rows: ListCell[][] = kept.map((r) => {
    const payee = data.payees.get(r.payee)!
    return [r.id, r.date, payee.name, r.payee, payee.cls, r.unit.slice(0, 3), r.unit, r.code, Math.round(Number(r.amount_eur)), r.purpose || null]
  })
  const ministries = ministryNodes(datasets)
  return {
    id: 'payments-large',
    group: PAYMENTS.id,
    title: t('Най-големите плащания', 'The largest payments'),
    short: t('Най-големи плащания', 'Largest payments'),
    description: t(
      `Всяко отделно плащане от 1 млн. € нагоре през СЕБРА от юли 2022 до юни 2026 г. (${new Intl.NumberFormat('bg-BG').format(rows.length)} плащания): дата, платец, получател, код за вид плащане, сума и основание.`,
      `Every single payment of €1 m or more through SEBRA from July 2022 to June 2026 (${new Intl.NumberFormat('en-GB').format(rows.length)} payments): date, payer, payee, payment code, amount and purpose.`,
    ),
    sources: [SEBRA],
    caveats: [
      t(
        'Основанието е свободен текст, както е написан в нареждането (често номер на фактура или договор); при плащания към физически лица не се показва, а лични номера (ЕГН) в него са скрити.',
        'The purpose is free text as written in the payment order (often an invoice or contract number); it is not shown for payments to natural persons, and personal identity numbers in it are masked.',
      ),
      ...CAVEATS,
    ],
    asOf: '2026-06-30',
    retrieved: '2026-10-05',
    unit: PAYMENT_UNIT,
    summary: ['amount'],
    sort: '-amount',
    links: linkYears(datasets, 'ministries').map((year) => ({
      family: 'ministries' as const,
      column: 'system',
      nodes: ministries.get(year)!,
      years: [year],
      filters: { date: String(year) },
      label: during(data, year),
      text: t(`Плащания от 1 млн. € нагоре ${during(data, year).bg}: {count}`, `Payments of €1 m or more ${during(data, year).en}: {count}`),
    })),
    columns: [
      { id: 'k', type: 'code', label: t('Номер', 'No.'), hidden: true },
      { id: 'date', type: 'date', label: t('Дата', 'Date'), filter: true },
      PAYEE_TITLE,
      PAYEE_ID,
      classColumn(true),
      systemColumn(rows.map((r) => r[5] as string)),
      { id: 'unit', type: 'category', label: t('Звено', 'Unit'), detail: true, labels: unitLabels(data.units, rows.map((r) => r[6] as string)) },
      {
        id: 'code',
        type: 'category',
        label: t('Вид плащане', 'Type of payment'),
        filter: true,
        labels: Object.fromEntries([...new Set(rows.map((r) => r[7] as string))].sort().map((c) => [c, codeName(data, c)])),
      },
      { id: 'amount', type: 'money', label: t('Сума', 'Amount'), total: true, source: SEBRA.name },
      { id: 'purpose', type: 'text', label: t('Основание', 'Purpose'), detail: true, search: true },
    ],
    key: 'k',
    rowLink: ROW_LINK,
    rows,
    shardBy: 'date',
  }
}

const codeName = (data: PaymentsData, code: string): LocalizedText => {
  const bg = data.codes.get(code)
  if (!bg || !PAY_CODE_EN[code]) throw new Error(`payments: no name for payment code ${code}`)
  return t(`${code} ${bg}`, `${code} ${PAY_CODE_EN[code]}`)
}

// ---------- totals by payment code ----------

function paymentCodes(data: PaymentsData): ListSpec {
  const agg = new Map<string, { system: string; code: string; year: string; q: number[]; n: number }>()
  for (const f of data.flows) {
    const key = `${f.system}|${f.code}|${f.year}`
    let a = agg.get(key)
    if (!a) agg.set(key, (a = { system: f.system, code: f.code, year: f.year, q: [0, 0, 0, 0], n: 0 }))
    a.q[f.q] += f.cents
    a.n += f.payments
  }
  // SEBRA's daily totals (all payments, of any size) for the same system, code and year, where downloaded.
  const daily = new Map<string, number>()
  const dailyYears = new Set<string>()
  for (const r of data.daily) {
    const key = `${r.system}|${r.code}|${r.quarter.slice(0, 4)}`
    daily.set(key, (daily.get(key) ?? 0) + cents(r.amount_eur))
    dailyYears.add(r.quarter.slice(0, 4))
  }
  // Codes the list covers that a payer used only for payments under 5,000 leva: rows with nothing listed.
  for (const key of daily.keys()) {
    const [system, code, year] = key.split('|')
    if (!agg.has(key) && PAY_CODE_EN[code] && Number(code) >= 10 && YEARS.includes(year) && (daily.get(key) ?? 0) > 0) {
      agg.set(key, { system, code, year, q: [0, 0, 0, 0], n: 0 })
    }
  }
  const rows: ListCell[][] = [...agg.values()]
    .sort((a, b) => (a.system + a.code + a.year < b.system + b.code + b.year ? -1 : 1))
    .map((a, i) => {
      const paid = a.q.reduce((s, v) => s + v, 0)
      const all = dailyYears.has(a.year) ? (daily.get(`${a.system}|${a.code}|${a.year}`) ?? null) : null
      return [i.toString(36), a.code, a.system, a.year, euros(paid), a.q.map((c) => (c ? euros(c) : null)), a.n, all === null ? null : euros(all), all && all > 0 ? paid / all : null]
    })
  const firstDaily = [...dailyYears].sort()[0]
  return {
    id: 'payment-codes',
    group: PAYMENTS.id,
    title: t('Плащания по вид — по платци и години', 'Payments by type — by payer and year'),
    short: t('По вид плащане', 'By type'),
    description: t(
      'Сборът на плащанията от 5 000 лв. нагоре по код за вид плащане в СЕБРА (издръжка, субсидии, социални плащания, капиталови разходи, трансфери …) за всеки платец и година, по тримесечия, и колко от всички плащания с този код (по ежедневните данни на Министерството на финансите) са в списъка.',
      'The payments of 5,000 leva or more by SEBRA payment code (running costs, subsidies, social payments, capital spending, transfers …) for each payer and year, by quarter, and what share of all payments with that code (by the Ministry of Finance’s daily figures) the list holds.',
    ),
    sources: [SEBRA, DAILY],
    caveats: [
      t(
        `„Всички плащания в СЕБРА“ са сборът на ежедневните данни (набор 7806) за същия платец, код и година — с плащанията под 5 000 лв. и поверителните; те са изтеглени от ${firstDaily} г. нататък. Делът показва каква част от тях са отделните плащания тук. Кодовете 60, 88, 89 и 90 (възстановени приходи) в ежедневните данни могат да бъдат и отрицателни.`,
        `“All SEBRA payments” sums the daily figures (dataset 7806) for the same payer, code and year — including payments under 5,000 leva and confidential ones; they were downloaded from ${firstDaily} on. The share shows how much of them the individual payments here cover. Codes 60, 88, 89 and 90 (refunded revenue) can be negative in the daily figures.`,
      ),
      ...CAVEATS,
    ],
    asOf: '2026-06-30',
    retrieved: '2026-10-05',
    unit: { one: t('ред', 'row'), other: t('реда', 'rows') },
    summary: ['amount', 'sebra'],
    sort: '-amount',
    columns: [
      { id: 'k', type: 'code', label: t('Ред', 'Row'), hidden: true },
      { id: 'code', type: 'category', label: t('Вид плащане', 'Type of payment'), filter: true, labels: Object.fromEntries([...new Set(rows.map((r) => r[1] as string))].sort().map((c) => [c, codeName(data, c)])) },
      systemColumn(rows.map((r) => r[2] as string)),
      { id: 'year', type: 'category', label: t('Година', 'Year'), filter: true, labels: Object.fromEntries(YEARS.map((y) => [y, t(y, y)])) },
      { id: 'amount', type: 'money', label: t('Плащания от 5 000 лв. нагоре', 'Payments of 5,000 leva or more'), total: true, source: SEBRA.name },
      { id: 'quarters', type: 'series', label: t('По тримесечия', 'By quarter'), periods: QUARTERS, total: true, detail: true },
      COUNT,
      { id: 'sebra', type: 'money', label: t('Всички плащания в СЕБРА', 'All SEBRA payments'), total: true, source: DAILY.name },
      { id: 'share', type: 'percent', label: t('Дял в списъка', 'Share listed') },
    ],
    key: 'k',
    titleColumn: 'code',
    rows,
  }
}

export function buildPaymentLists(config: { dir: URL; datasets: Dataset[]; register: Register }): ListSpec[] {
  const data = readPayments(config.dir)
  return [byPayer(data, config.datasets, config.register), byUnit(data), ...payeeLists(data), largePayments(data, config.datasets), paymentCodes(data)]
}
