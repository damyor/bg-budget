// Public procurement: the contracts that buyers sign after a procurement procedure, as lists (format: ListFile in
// src/lib/types.ts), from the extracts in data/sources/procurement/ (made by scripts/extract/procurement.py, see the
// folder's README):
//   contracts             every contract of 2026, the larger ones of 2024–2025 and the large ones of 2016–2023, by year
//   contract-categories   totals by CPV division: the contracts of 2024, 2025 and 2026
//   contract-suppliers    every supplier (search, or by the value of its contracts), linking to its page
//   contract-supplier     one supplier: who buys from it, by buyer and year (reached through links)
//   contract-buyers       every buyer, by year, linking to its page
//   contract-buyer        one buyer: whom it buys from, by supplier and year; linked from ministries and municipalities
// Contracts are commitments, not payments: they never become tree nodes.

import type { Dataset, ListCell, ListColumn, ListLinkSpec, LocalizedText } from '../src/lib/types.ts'
import { readCsv } from './lib/csv.ts'
import type { ListGroup, ListSpec } from './lib/lists.ts'
import type { Register } from './lib/places.ts'
import { nameKey } from './lib/sebra.ts'

const t = (bg: string, en: string): LocalizedText => ({ bg, en })
const same = (s: string): LocalizedText => ({ bg: s, en: s })

/** Contracts of 2016–2023 of at least this much (euro) are listed one by one; all of them count in the pages and totals. */
export const LARGE = 1_000_000
/**
 * Of 2024 and 2025 (ЦАИС ЕОП's JSON open data) the contracts of at least this much are listed one by one: all of them,
 * with their copies by CPV category, would add some 28 MB to the site (7 MB with this threshold). Every contract of 2026
 * is listed.
 */
export const LISTED_FROM: Record<string, number> = { '2024': 100_000, '2025': 100_000 }
/** A buyer's page names its largest suppliers (by total) and the largest of each year; the rest are one part. */
const BUYER_SUPPLIERS = 30
const BUYER_SUPPLIERS_A_YEAR = 10
/** Subjects and titles are cut to this many characters (with "…"); the extracts keep 200. */
const TEXT_LENGTH = 90
const PAGE_FILES = 64
/** The value of a supplier's contracts in bands, largest first: what the list of suppliers offers to choose from. */
const BANDS: { id: string; from: number; name: LocalizedText }[] = [
  { id: '100m', from: 100_000_000, name: t('100 млн. € и повече', '€100 m or more') },
  { id: '10m', from: 10_000_000, name: t('10–100 млн. €', '€10–100 m') },
  { id: '1m', from: 1_000_000, name: t('1–10 млн. €', '€1–10 m') },
  { id: '100k', from: 100_000, name: t('100 000 € – 1 млн. €', '€100,000 – 1 m') },
  { id: '10k', from: 10_000, name: t('10 000 – 100 000 €', '€10,000–100,000') },
  { id: 'small', from: -Infinity, name: t('Под 10 000 €', 'Under €10,000') },
]

export const PROCUREMENT: ListGroup = {
  id: 'procurement',
  title: t('Обществени поръчки', 'Public procurement'),
  description: t(
    'Договорите, които министерствата, общините, болниците, училищата и другите възложители сключват след обществена поръчка: кой какво купува, от кого и за колко, 2016–2026 г. — по отворените данни на Агенцията по обществени поръчки и на платформата за електронни обществени поръчки ЦАИС ЕОП. Не са част от кръговата диаграма: договорите са поети задължения, а не плащания.',
    'The contracts that ministries, municipalities, hospitals, schools and other buyers sign after a public procurement procedure: who buys what, from whom and for how much, 2016–2026 — from the open data of the Public Procurement Agency and of its e-procurement platform ЦАИС ЕОП. They are not slices of the donut: contracts are commitments, not payments.',
  ),
}

// ---------- sources ----------

const AOP_YEARLY = {
  name: t(
    'Агенция по обществени поръчки — „Договори и изменения на договори“ за 2016–2025 г. (Регистър на обществените поръчки и ЦАИС ЕОП, data.egov.bg, организация 502)',
    'Public Procurement Agency — “Contracts and contract amendments”, 2016–2025 (Public Procurement Register and the ЦАИС ЕОП e-procurement platform, data.egov.bg, organisation 502)',
  ),
  url: 'https://data.egov.bg/organisation/profile/1c4d1b4a-61b8-4ba8-9bf1-8dbcf4cd4fe4',
}
const AOP_JSON = {
  name: t(
    'ЦАИС ЕОП, Агенция по обществени поръчки — отворени данни в JSON: договорите и анексите, публикувани в платформата всеки ден, 01.01.2024–30.09.2026 г.',
    'ЦАИС ЕОП, Public Procurement Agency — open data in JSON: the contracts and amendments published on the platform each day, 1 Jan 2024 – 30 Sep 2026',
  ),
  url: 'https://app.eop.bg/today/reporting/open-data',
}
const AOP_OCDS = {
  name: t(
    'Агенция по обществени поръчки — обявления, публикувани в ЦАИС ЕОП през 2026 г., по стандарта OCDS (data.egov.bg, ежедневно), 01.01–30.09.2026 г.',
    'Public Procurement Agency — notices published in ЦАИС ЕОП in 2026, in the Open Contracting Data Standard (data.egov.bg, daily), 1 Jan – 30 Sep 2026',
  ),
  url: 'https://www2.aop.bg/e-uslugi/otvoreni-danni-ot-rop/',
}
const LICENCE = t(
  'Данните на Агенцията по обществени поръчки са публикувани при условия CC0 (2020 г., 2023–2026 г., както и отворените данни на ЦАИС ЕОП) и CC BY — с посочване на източника (2016–2017 г., 2021–2022 г.); за 2018–2019 г. не са посочени условия.',
  'The Public Procurement Agency’s data are published under CC0 (2020, 2023–2026, and ЦАИС ЕОП’s open data) and CC BY — with attribution (2016–2017, 2021–2022); no terms are stated for 2018–2019.',
)

const CAVEATS: LocalizedText[] = [
  t(
    'Стойността е при сключване на договора, без ДДС, както е обявена от възложителя (редките стойности „с ДДС“ в стария регистър са отбелязани); когато договорът е изменен, стойността след последното изменение е в подробностите. Това са поети задължения, а не плащания: по рамковите споразумения е обявена най-високата възможна сума, а много договори се изпълняват за по-малко. Сумите в лева са превърнати в евро по фиксирания курс 1,95583, а в други валути — по месечния курс на ЕЦБ.',
    'The value is at signing, excluding VAT, as the buyer announced it (the rare values marked “with VAT” in the old register are flagged); where the contract was amended, the value after the last amendment is in the details. These are commitments, not payments: framework agreements announce the highest possible amount, and many contracts are carried out for less. Leva are converted at the fixed rate of 1.95583 per euro, other currencies at the ECB’s monthly rate.',
  ),
  t(
    'Годината е тази, в която договорът е обявен (в регистъра или с обявление за възлагане); повечето са сключени през същата или в края на предходната година. 2016–2023 г. са от годишните файлове на Агенцията (стария регистър и ЦАИС ЕОП); 2024–2025 г. — от отворените данни в JSON на самата платформа ЦАИС ЕОП, публикувани от 29 юни 2026 г., и от последните договори в стария регистър; 2026 г. — от ежедневните публикации по стандарта OCDS, до 30 септември. Договорите извън приложното поле на Закона за обществените поръчки (договорите-изключения) не са тук, както и в годишните доклади на Агенцията.',
    'The year is the one in which the contract was announced (in the register, or by an award notice); most were signed that year or late in the year before. 2016–2023 come from the Agency’s yearly files (the old register and ЦАИС ЕОП); 2024–2025 from the ЦАИС ЕОП platform’s own JSON open data, published since 29 June 2026, and the old register’s last contracts; 2026 from the daily OCDS releases, to 30 September. Contracts outside the scope of the Public Procurement Act (the exceptions) are not here, as in the Agency’s yearly reports.',
  ),
  t(
    'Физическите лица и едноличните търговци (чието име съдържа името на собственика) не се показват по име, нито предметът на договорите им, по правилата на списъците с европейски средства и земеделски субсидии: те са една група (списъците с плащания през СЕБРА назовават едноличните търговци, но оттук няма връзка към плащанията на едноличен търговец). Изпълнител без български ЕИК (чуждестранна фирма, обединение без номер) е разпознат по името си; изпълнител без номер и без нищо в името, което да показва организация, е приет за физическо лице.',
    'Natural persons and sole traders (whose firm name contains the owner’s name) are not named, nor is the subject of their contracts, by the rules of the EU-funds and farm-subsidy lists: they are one group (the SEBRA payment lists name sole traders, but nothing here links to a sole trader’s payments). A supplier without a Bulgarian company number (a foreign company, a consortium without a number) is recognised by its name; a supplier with no number and nothing in its name that marks an organisation is taken for a natural person.',
  ),
  t(
    'Два договора са публикувани със стойност, която почти сигурно е грешка при въвеждането, и не са броени в сборовете (стойността им е в подробностите): Столична община, 2022 г., събиране на отпадъци — 6 938 481 985 лв., и храна за кучета и котки в общински приют, 2023 г. — 165 333 000 лв.',
    'Two contracts are published with a value that is almost certainly an entry error and are not counted in the totals (their value is in the details): Sofia Municipality, 2022, waste collection — 6,938,481,985 leva, and dog and cat food for a municipal shelter, 2023 — 165,333,000 leva.',
  ),
  LICENCE,
]

// ---------- reading the extracts ----------

interface Contract {
  id: string
  source: string
  year: string
  published: string
  signed: string
  procurement: string
  buyer: string
  supplier: string
  kind: string
  subject: string
  object: string
  cpv: string
  procedure: string
  eu: string
  offers: number | null
  vat: string
  eur: number | null
  amendments: number
  after: number | null
  basis: string
}

interface Supplier {
  kind: string
  eik: string
  name: string
  members: string[]
}

export interface ProcurementData {
  contracts: Contract[]
  suppliers: Map<string, Supplier>
  buyers: Map<string, string>
  nodes: { eik: string; family: 'ministries' | 'municipalities'; node: string }[]
  cpv: Map<string, LocalizedText>
  years: string[]
}

const euro = (s: string) => (s === '' ? null : Number(s))

export function readProcurement(dir: URL, years: string[]): ProcurementData {
  const contracts: Contract[] = years.flatMap((year) =>
    readCsv(new URL(`contracts-${year}.csv.gz`, dir)).map((r) => ({
      id: r.id,
      source: r.source,
      year: r.year,
      published: r.published,
      signed: r.signed,
      procurement: r.procurement,
      buyer: r.buyer,
      supplier: r.supplier,
      kind: r.supplier_kind,
      subject: r.subject,
      object: r.object,
      cpv: r.cpv,
      procedure: r.procedure,
      eu: r.eu,
      offers: r.offers === '' ? null : Number(r.offers),
      vat: r.vat,
      eur: VALUE_ERRORS[r.id] ? null : euro(r.value_EUR),
      amendments: Number(r.amendments),
      after: VALUE_ERRORS[r.id] ? null : euro(r.value_after_EUR),
      basis: r.basis,
    })),
  )
  const suppliers = new Map(
    readCsv(new URL('suppliers.csv.gz', dir)).map((r) => [r.key, { kind: r.kind, eik: r.eik, name: r.name, members: r.members ? r.members.split(' ') : [] }]),
  )
  const buyers = new Map(readCsv(new URL('buyers.csv.gz', dir)).map((r) => [r.eik, r.name]))
  const nodes = readCsv(new URL('buyer-nodes.csv', dir)).map((r) => ({ eik: r.eik, family: r.family as 'ministries' | 'municipalities', node: r.node }))
  const cpv = new Map(readCsv(new URL('cpv-divisions.csv', dir)).map((r) => [r.division, t(r.name_bg, r.name_en)]))
  return { contracts, suppliers, buyers, nodes, cpv, years }
}

// ---------- shared pieces ----------

const PERSONS = 'persons'
const WITHHELD = 'withheld'
const PERSONS_NAME = t('Физически лица и еднолични търговци (без имена)', 'Natural persons and sole traders (not named)')
const WITHHELD_NAME = t('Изпълнителят не е публикуван', 'Supplier not published')

/** Kinds of supplier (the extract's supplier_kind), with short ids for the lists. */
const KINDS: Record<string, { id: string; name: LocalizedText }> = {
  legal: { id: 'co', name: t('Фирми и организации', 'Companies and organisations') },
  joint: { id: 'jo', name: t('Обединения и съвместни изпълнители', 'Consortia and joint suppliers') },
  person: { id: 'pe', name: t('Физически лица и еднолични търговци (без имена)', 'Natural persons and sole traders (not named)') },
  'sole-trader': { id: 'pe', name: t('Физически лица и еднолични търговци (без имена)', 'Natural persons and sole traders (not named)') },
  withheld: { id: 'wh', name: t('Изпълнителят не е публикуван', 'Supplier not published') },
}
const KIND_LABELS = Object.fromEntries(Object.values(KINDS).map((k) => [k.id, k.name]))

const OBJECTS: Record<string, LocalizedText> = {
  works: t('Строителство', 'Works'),
  supplies: t('Доставки', 'Supplies'),
  services: t('Услуги', 'Services'),
  'design-contest': t('Конкурс за проект', 'Design contest'),
}

/** OCDS procurement methods (2026) and the procedures of the Public Procurement Act as ЦАИС ЕОП names them (2024–2025). */
const PROCEDURES: Record<string, LocalizedText> = {
  open: t('Открита процедура', 'Open procedure'),
  selective: t('Ограничена или с предварителен подбор', 'Selective (restricted or with pre-selection)'),
  limited: t('Договаряне без предварително обявление', 'Negotiated without prior publication'),
  direct: t('Пряко възлагане', 'Direct award'),
  restricted: t('Ограничена процедура', 'Restricted procedure'),
  'restricted-qs': t('Ограничена процедура по квалификационна система', 'Restricted procedure under a qualification system'),
  'public-competition': t('Публично състезание', 'Public competition (below the EU thresholds)'),
  collection: t('Събиране на оферти с обява', 'Collection of offers by announcement'),
  invitation: t('Покана до определени лица', 'Invitation to selected persons'),
  'direct-negotiation': t('Пряко договаряне', 'Direct negotiation'),
  'neg-wo-call': t('Договаряне без предварително обявление', 'Negotiated without prior publication'),
  'neg-wo-invite': t('Договаряне без предварителна покана за участие', 'Negotiated without a prior call for competition'),
  'neg-w-invite': t('Договаряне с предварителна покана за участие', 'Negotiated with a prior call for competition'),
  'neg-w-invite-qs': t('Договаряне с предварителна покана за участие по квалификационна система', 'Negotiated with a prior call for competition, under a qualification system'),
  'neg-wo-notice': t('Договаряне без публикуване на обявление за поръчка', 'Negotiated without publication of a contract notice'),
  'neg-w-notice': t('Договаряне с публикуване на обявление за поръчка', 'Negotiated with publication of a contract notice'),
  'neg-w-call': t('Състезателна процедура с договаряне', 'Competitive procedure with negotiation'),
  'comp-dial': t('Състезателен диалог', 'Competitive dialogue'),
  innovation: t('Партньорство за иновации', 'Innovation partnership'),
  'design-contest': t('Конкурс за проект', 'Design contest'),
  'mini-competition': t('Вътрешен конкурентен избор по рамково споразумение', 'Mini-competition under a framework agreement'),
  'qualification-system': t('Квалификационна система', 'Qualification system'),
  dps: t('Динамична система за покупки', 'Dynamic purchasing system'),
}

const SOURCES: Record<string, LocalizedText> = {
  rop: t('Регистър на обществените поръчки (годишен файл)', 'Public Procurement Register (yearly file)'),
  eop: t('ЦАИС ЕОП (годишен файл)', 'ЦАИС ЕОП e-procurement platform (yearly file)'),
  json: t('ЦАИС ЕОП (отворени данни в JSON)', 'ЦАИС ЕОП e-procurement platform (JSON open data)'),
  ocds: t('ЦАИС ЕОП (OCDS, 2026)', 'ЦАИС ЕОП e-procurement platform (OCDS, 2026)'),
}

const BASIS: Record<string, LocalizedText> = {
  award: t('Обявен с обявление за възлагане', 'Announced by an award notice'),
  amended: t('Сключен преди 2026 г., изменен през 2026 г.', 'Signed before 2026, amended in 2026'),
}

/**
 * Contracts published with a value that is certainly an entry error: kept in the extract as published, but not counted
 * here (their value is left empty), with the published value in a note. The Agency's own report on 2023 leaves the
 * second out of its total.
 */
export const VALUE_ERRORS: Record<string, LocalizedText> = {
  'e274233-1': t(
    'Публикуваната стойност, 6 938 481 985 лв. (3,55 млрд. €), е така и в регистъра, и в TED (обявление 506876-2022), но почти сигурно е грешка при въвеждането: другата обособена позиция на същата поръчка (00087-2021-0218) е за 73,9 млн. лв. Не е броена в сборовете.',
    'The published value, 6,938,481,985 leva (€3.55 bn), is so both in the register and in TED (notice 506876-2022), but is almost certainly an entry error: the other lot of the same procurement (00087-2021-0218) is worth 73.9 m leva. It is not counted in the totals.',
  ),
  'e336694-1': t(
    'Публикуваната стойност, 165 333 000 лв. (84,5 млн. €) за храна за кучета и котки в общински приют, почти сигурно е грешка при въвеждането; Агенцията по обществени поръчки също не я брои в доклада си за 2023 г. Не е броена в сборовете.',
    'The published value, 165,333,000 leva (€84.5 m) for dog and cat food for a municipal shelter, is almost certainly an entry error; the Public Procurement Agency also leaves it out of its report on 2023. It is not counted in the totals.',
  ),
}

const euros = (v: number | null) => (v === null ? null : Math.round(v))
/** The least value of a contract listed one by one (see LARGE and LISTED_FROM): every contract of 2026 is. */
const listedFrom = (c: Contract) => (c.basis === 'amended' || c.year < '2024' ? LARGE : (LISTED_FROM[c.year] ?? 0))
/** Years listed whole have many contracts: the list splits them by the quarter of the award notice ("2026-2"). */
const QUARTERLY = new Set(['2024', '2025', '2026'].filter((y) => !LISTED_FROM[y]))
const periodOf = (c: Contract) => (QUARTERLY.has(c.year) ? `${c.year}-${Math.floor((Number(c.published.slice(5, 7)) - 1) / 3) + 1}` : c.year)
const periodLabel = (p: string): LocalizedText =>
  p.includes('-') ? t(`${p.slice(0, 4)}, ${['I', 'II', 'III', 'IV'][Number(p.slice(5)) - 1]} тримесечие`, `${p.slice(0, 4)}, Q${p.slice(5)}`) : same(p)
/** The CPV division (first two digits) of a code, when it is one of the 45. */
const division = (data: ProcurementData, code: string) => (code && data.cpv.has(code.slice(0, 2)) ? code.slice(0, 2) : null)
const cut = (s: string, length = TEXT_LENGTH) => (s.length <= length ? s : `${s.slice(0, length - 1).trimEnd()}…`)
/** Names in the first column of a page's table of buyers or suppliers by year, which has little room. */
const LABEL_LENGTH = 60
const count = (n: number, lang: 'bg' | 'en') => new Intl.NumberFormat(lang === 'bg' ? 'bg-BG' : 'en-GB').format(n)
const bn = (v: number, lang: 'bg' | 'en') => new Intl.NumberFormat(lang === 'bg' ? 'bg-BG' : 'en-GB', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(v / 1e9)

/** A supplier's name as the lists show it (the group of natural persons and sole traders, and the unpublished one, by their description). */
function supplierName(data: ProcurementData, key: string): LocalizedText | string {
  if (key === PERSONS) return PERSONS_NAME
  if (key === WITHHELD) return WITHHELD_NAME
  const s = data.suppliers.get(key)
  if (!s) throw new Error(`procurement: unknown supplier ${key}`)
  // Several suppliers of a joint contract can make a long name.
  return cut(s.name)
}

/** In one contract: who the supplier is ("Натурално лице" in place of a person's name). */
function contractSupplier(data: ProcurementData, c: Contract): LocalizedText | string {
  if (c.kind === 'person') return t('Физическо лице', 'Natural person')
  if (c.kind === 'sole-trader') return t('Едноличен търговец', 'Sole trader')
  return supplierName(data, c.supplier)
}

const buyerName = (data: ProcurementData, eik: string) => (data.buyers.get(eik) ? cut(data.buyers.get(eik)!) : t('Възложител без име (едноличен търговец)', 'Buyer not named (a sole trader)'))

const awarded = (data: ProcurementData) => data.contracts.filter((c) => c.basis === 'award')

/** The suppliers with a page: those of the awarded contracts (see supplierLists). */
const supplierPages = (data: ProcurementData) => new Set(awarded(data).map((c) => c.supplier))

// ---------- the contracts ----------

function contractsList(data: ProcurementData): ListSpec {
  const rows: ListCell[][] = []
  // A contract amended in 2026 but signed earlier counts on no page: its supplier or buyer may have none to link to.
  const paged = supplierPages(data)
  const buyerPages = new Set(awarded(data).map((c) => c.buyer))
  for (const c of data.contracts) {
    // 2026's award notices whole; of the other years (and of contracts signed before 2026 that were amended in it) the
    // larger ones.
    if ((c.eur ?? 0) < listedFrom(c) && !VALUE_ERRORS[c.id]) continue
    const hidden = c.kind === 'person' || c.kind === 'sole-trader'
    rows.push([
      rows.length.toString(36),
      hidden ? t('Договор с физическо лице или едноличен търговец', 'Contract with a natural person or sole trader') : cut(c.subject) || null,
      contractSupplier(data, c),
      paged.has(c.supplier) ? c.supplier : null,
      c.buyer ? buyerName(data, c.buyer) : null,
      c.buyer && buyerPages.has(c.buyer) ? c.buyer : null,
      periodOf(c),
      c.signed || null,
      c.object || null,
      euros(c.eur),
      KINDS[c.kind].id,
      c.basis,
      c.source,
      c.procurement.replace(/^ocds-e82gsb-/, '') || null,
      // Columns most rows leave empty last: a shard leaves out a row's empty cells at its end.
      division(data, c.cpv),
      c.offers,
      c.procedure || null,
      c.eu === '1' ? 'y' : c.eu === '0' ? 'n' : null,
      c.amendments ? euros(c.after) : null,
      c.amendments || null,
      c.vat === 'incl' ? t('с ДДС', 'incl. VAT') : null,
      VALUE_ERRORS[c.id] ?? null,
    ])
  }
  const periods = [...new Set(rows.map((r) => r[6] as string))].sort()
  const all2026 = data.contracts.filter((c) => c.year === '2026' && c.basis === 'award')
  const total2026 = all2026.reduce((s, c) => s + (c.eur ?? 0), 0)
  // How many of a span's contracts are listed, and what share of their value.
  const span = (from: string, to: string) => {
    const all = data.contracts.filter((c) => c.basis === 'award' && c.year >= from && c.year <= to)
    const listed = all.filter((c) => (c.eur ?? 0) >= listedFrom(c) || VALUE_ERRORS[c.id])
    const value = (cs: Contract[]) => cs.reduce((s, c) => s + (c.eur ?? 0), 0)
    return { all: all.length, listed: listed.length, share: Math.round((100 * value(listed)) / value(all)) }
  }
  const early = span('2016', '2023')
  const recent = span('2024', '2025')
  const recentFrom = LISTED_FROM['2024'] ?? 0
  const recentText = (lang: 'bg' | 'en') =>
    recentFrom
      ? lang === 'bg'
        ? `договорите от ${count(recentFrom, 'bg')} € нагоре от 2024–2025 г. (${count(recent.listed, 'bg')} от ${count(recent.all, 'bg')}, ${recent.share}% от стойността)`
        : `the contracts of €${count(recentFrom, 'en')} or more of 2024–2025 (${count(recent.listed, 'en')} of ${count(recent.all, 'en')}, ${recent.share}% of the value)`
      : lang === 'bg'
        ? `всички ${count(recent.all, 'bg')} договора от 2024–2025 г.`
        : `all ${count(recent.all, 'en')} contracts of 2024–2025`
  const columns: ListColumn[] = [
    { id: 'k', type: 'code', label: t('Номер', 'No.'), hidden: true },
    { id: 'subject', type: 'text', label: t('Предмет на договора', 'Subject of the contract'), search: true },
    { id: 'supplier', type: 'text', label: t('Изпълнител', 'Supplier'), search: true, link: { list: 'contract-supplier', filter: 'id', column: 'supplierId' } },
    // Hidden texts rather than codes, so that a supplier's or buyer's id repeated in a shard is stored once.
    { id: 'supplierId', type: 'text', label: t('Изпълнител — номер', 'Supplier id'), hidden: true },
    { id: 'buyer', type: 'text', label: t('Възложител', 'Buyer'), search: true, link: { list: 'contract-buyer', filter: 'id', column: 'buyerId' } },
    { id: 'buyerId', type: 'text', label: t('ЕИК на възложителя', 'Buyer’s company number'), hidden: true },
    { id: 'period', type: 'category', label: t('Година', 'Year'), filter: true, labels: Object.fromEntries(periods.map((p) => [p, periodLabel(p)])) },
    { id: 'signed', type: 'date', label: t('Сключен на', 'Signed on') },
    { id: 'object', type: 'category', label: t('Вид', 'Type'), filter: true, labels: OBJECTS },
    { id: 'value', type: 'money', label: t('Стойност без ДДС', 'Value excl. VAT'), total: true, source: t('Агенция по обществени поръчки: стойност при сключване', 'Public Procurement Agency: value at signing') },
    { id: 'cls', type: 'category', label: t('Вид изпълнител', 'Type of supplier'), filter: true, detail: true, labels: KIND_LABELS },
    { id: 'basis', type: 'category', label: t('Защо е в списъка', 'Why it is listed'), filter: true, detail: true, labels: BASIS, exclude: ['amended'] },
    { id: 'source', type: 'category', label: t('Източник', 'Source'), detail: true, labels: SOURCES },
    { id: 'procurement', type: 'code', label: t('Номер на поръчката', 'Procurement number'), detail: true, search: true },
    { id: 'cpv', type: 'category', label: t('Категория (CPV)', 'Category (CPV)'), filter: true, detail: true, labels: Object.fromEntries(data.cpv) },
    { id: 'offers', type: 'number', label: t('Получени оферти', 'Offers received'), detail: true },
    { id: 'procedure', type: 'category', label: t('Вид процедура', 'Procedure'), detail: true, labels: PROCEDURES },
    { id: 'eu', type: 'category', label: t('Европейско финансиране', 'EU funding'), detail: true, labels: { y: t('Да', 'Yes'), n: t('Не', 'No') } },
    { id: 'after', type: 'money', label: t('Стойност след измененията', 'Value after amendments'), detail: true },
    { id: 'amendments', type: 'number', label: t('Изменения (анекси)', 'Amendments'), detail: true },
    { id: 'vat', type: 'text', label: t('ДДС', 'VAT'), detail: true },
    { id: 'note', type: 'text', label: t('Бележка', 'Note'), detail: true },
  ]
  return {
    id: 'contracts',
    group: PROCUREMENT.id,
    title: t('Договори за обществени поръчки', 'Public procurement contracts'),
    short: t('Договори', 'Contracts'),
    description: t(
      `Договорите по обществени поръчки, един по един: всички ${count(all2026.length, 'bg')} договора, обявени през 2026 г. (до 30 септември, ${bn(total2026, 'bg')} млрд. € без ДДС), ${recentText('bg')} и всеки договор от 1 млн. € нагоре от 2016–2023 г. (${count(early.listed, 'bg')}). Изберете година или тримесечие; всички договори на един изпълнител или възложител са в сборовете на страницата му.`,
      `Public procurement contracts, one by one: all ${count(all2026.length, 'en')} contracts announced in 2026 (to 30 September, €${bn(total2026, 'en')} bn excluding VAT), ${recentText('en')} and every contract of €1 m or more of 2016–2023 (${count(early.listed, 'en')}). Choose a year or a quarter; all the contracts of a supplier or buyer count in the totals of its page.`,
    ),
    sources: [AOP_OCDS, AOP_JSON, AOP_YEARLY],
    caveats: [
      t(
        `За 2016–2023 г. тук са само договорите от 1 млн. € нагоре (${count(early.listed, 'bg')} от ${count(early.all, 'bg')}, ${early.share}% от стойността)${recentFrom ? `, а за 2024–2025 г. — тези от ${count(recentFrom, 'bg')} € нагоре (${count(recent.listed, 'bg')} от ${count(recent.all, 'bg')}, ${recent.share}% от стойността)` : ''}; всички са в сборовете на категориите и на страниците на изпълнителите и възложителите.`,
        `For 2016–2023 only the contracts of €1 m or more are listed here (${count(early.listed, 'en')} of ${count(early.all, 'en')}, ${early.share}% of the value)${recentFrom ? `, and for 2024–2025 those of €${count(recentFrom, 'en')} or more (${count(recent.listed, 'en')} of ${count(recent.all, 'en')}, ${recent.share}% of the value)` : ''}; all of them count in the totals of the categories and of the suppliers’ and buyers’ pages.`,
      ),
      t(
        `През 2026 г. в данните са и ${count(data.contracts.filter((c) => c.basis === 'amended').length, 'bg')} договора, сключени по-рано, които са изменени през 2026 г. и не са в данните от другите години; тук са тези от 1 млн. € нагоре, скрити, докато не ги изберете в „Защо е в списъка“, и не се броят в сборовете на страниците. Публикациите в OCDS се повтарят (обявление, после изменения, понякога същата публикация в два дневни файла): всеки договор е един ред по номера на поръчката и на договора, със стойността от обявлението за възлагане и стойността след последното изменение. Договорите от 2020–2025 г., изменени по-късно, имат изменението си от анексите в ЦАИС ЕОП.`,
        `In 2026 the data also hold ${count(data.contracts.filter((c) => c.basis === 'amended').length, 'en')} contracts signed earlier that were amended in 2026 and are not in the data of the other years; those of €1 m or more are here, hidden until you choose them under “Why it is listed”, and they do not count in the pages’ totals. OCDS releases repeat (the award notice, then amendments, sometimes the same release in two daily files): every contract is one row by procurement and contract number, with the value of the award notice and the value after the last amendment. The contracts of 2020–2025 amended later have their amendments from the annexes published in ЦАИС ЕОП.`,
      ),
      t(
        'Категорията (CPV, първите две цифри на основния код) и видът процедура са дадени за 2024–2026 г.: за 2024–2025 г. — основният код на поръчката, за 2026 г. — на обособената позиция; годишните файлове до 2023 г. ги нямат. Вид процедура в OCDS (2026 г.) е обобщен: открита, ограничена (с подбор), договаряне без обявление.',
        'The category (CPV, the first two digits of the main code) and the procedure are given for 2024–2026: for 2024–2025 the procurement’s main code, for 2026 the lot’s; the yearly files to 2023 lack them. The procedure in OCDS (2026) is coarse: open, selective, negotiated without a notice.',
      ),
      ...CAVEATS,
    ],
    asOf: '2026-09-30',
    retrieved: '2026-10-06',
    unit: { one: t('договор', 'contract'), other: t('договора', 'contracts') },
    summary: ['value'],
    sort: '-value',
    columns,
    key: 'k',
    titleColumn: 'subject',
    rows,
    shardBy: 'period',
    shardChoose: true,
    // A category's contracts (those listed of 2024–2026: earlier years have no CPV code) are one file of their own.
    shardAlso: ['cpv'],
  }
}

// ---------- totals by CPV division ----------

function categoriesList(data: ProcurementData): ListSpec {
  // The years whose contracts have a CPV code: ЦАИС ЕОП's JSON (2024–2025) and OCDS (2026).
  const periods = ['2024', '2025', '2026']
  const by = new Map<string, { value: number[]; n: number[] }>()
  for (const c of awarded(data)) {
    const p = periods.indexOf(c.year)
    if (p < 0) continue
    const d = division(data, c.cpv) ?? ''
    const a = by.get(d) ?? { value: periods.map(() => 0), n: periods.map(() => 0) }
    a.value[p] += c.eur ?? 0
    a.n[p] += 1
    by.set(d, a)
  }
  const labels: Record<string, LocalizedText> = { ...Object.fromEntries(data.cpv), '': t('Без код по CPV', 'No CPV code') }
  for (const d of by.keys()) if (!labels[d]) throw new Error(`procurement: no CPV division ${d}`)
  const rows: ListCell[][] = [...by]
    .sort((a, b) => b[1].value[1] - a[1].value[1])
    .map(([division, a]) => [division || 'none', division, a.value.map((v, i) => (a.n[i] ? Math.round(v) : null)), a.n.map((v) => v || null)])
  const periodLabels = { '2026': t('2026 (I–IX)', '2026 (Jan–Sep)') }
  const from = LISTED_FROM['2024'] ?? 0
  return {
    id: 'contract-categories',
    group: PROCUREMENT.id,
    title: t('Обществени поръчки по категории (CPV)', 'Public procurement by category (CPV)'),
    short: t('По категории', 'By category'),
    description: t(
      `Стойността на договорите по раздели на Общия терминологичен речник (CPV): всички договори, обявени в ЦАИС ЕОП през 2024, 2025 и 2026 г. (до 30 септември). Отворете категория, за да видите договорите ѝ${from ? ` — всички от 2026 г. и тези от ${count(from, 'bg')} € нагоре от 2024–2025 г.` : '.'}`,
      `The value of contracts by division of the Common Procurement Vocabulary (CPV): every contract announced in ЦАИС ЕОП in 2024, 2025 and 2026 (to 30 September). Open a category to see its contracts${from ? ` — all of 2026 and those of €${count(from, 'en')} or more of 2024–2025` : ''}.`,
    ),
    sources: [AOP_JSON, AOP_OCDS],
    caveats: [
      t(
        'Категорията е разделът (първите две цифри) на основния код по CPV: на поръчката за 2024–2025 г. (отворените данни на ЦАИС ЕОП дават един код за поръчката) и на обособената позиция за 2026 г. (OCDS). Годишните файлове за 2016–2023 г. нямат кодове по CPV, затова тези години ги няма тук.',
        'The category is the division (first two digits) of the main CPV code: of the procurement for 2024–2025 (ЦАИС ЕОП’s open data give one code per procurement) and of the lot for 2026 (OCDS). The yearly files for 2016–2023 have no CPV codes, so those years are not here.',
      ),
      ...CAVEATS.slice(0, 2),
      LICENCE,
    ],
    asOf: '2026-09-30',
    retrieved: '2026-10-06',
    unit: { one: t('категория', 'category'), other: t('категории', 'categories') },
    summary: ['value.2024', 'value.2025', 'value.2026'],
    sort: '-value.2025',
    columns: [
      { id: 'k', type: 'code', label: t('Ред', 'Row'), hidden: true },
      { id: 'division', type: 'category', label: t('Категория (CPV)', 'Category (CPV)'), labels },
      { id: 'value', type: 'series', label: t('Стойност без ДДС', 'Value excl. VAT'), periods, periodLabels, total: true },
      { id: 'n', type: 'series', label: t('Брой договори или обявления', 'Contracts or notices'), periods, periodLabels, unit: 'count', total: true, detail: true },
    ],
    key: 'k',
    titleColumn: 'division',
    rowLink: { list: 'contracts', filter: 'cpv', column: 'division' },
    rows,
  }
}

// ---------- suppliers ----------

/** Supplier keys → their SEBRA payee, by an exact name key that is unique among both the suppliers and the payees. */
export function payeeMatches(data: ProcurementData, payees: Map<string, string>): Map<string, { id: string; name: string }> {
  const count = <K>(keys: K[]) => keys.reduce((m, k) => m.set(k, (m.get(k) ?? 0) + 1), new Map<K, number>())
  const supplierKeys = [...data.suppliers].filter(([, s]) => s.kind === 'legal').map(([key, s]) => ({ key, nk: nameKey(s.name) }))
  const payeeKeys = [...payees].map(([id, name]) => ({ id, name, nk: nameKey(name) }))
  const nSup = count(supplierKeys.map((s) => s.nk))
  const nPay = count(payeeKeys.map((p) => p.nk))
  const byKey = new Map(payeeKeys.filter((p) => nPay.get(p.nk) === 1).map((p) => [p.nk, p]))
  const out = new Map<string, { id: string; name: string }>()
  for (const s of supplierKeys) {
    const p = byKey.get(s.nk)
    // A form is required on both sides ("ФАРМА ЮНИОН|ООД"), so that a bare word does not match a namesake.
    if (p && nSup.get(s.nk) === 1 && s.nk.includes('|')) out.set(s.key, { id: p.id, name: p.name })
  }
  return out
}

function supplierLists(data: ProcurementData, links: { payees: Map<string, string>; eu: Map<string, { n: number; value: number }> }): ListSpec[] {
  const years = data.years
  const per = new Map<string, { years: number[]; n: number; parts: Map<string, number[]> }>()
  for (const c of awarded(data)) {
    let p = per.get(c.supplier)
    if (!p) per.set(c.supplier, (p = { years: years.map(() => 0), n: 0, parts: new Map() }))
    const y = years.indexOf(c.year)
    p.years[y] += c.eur ?? 0
    p.n += 1
    const buyer = c.buyer || '?'
    let part = p.parts.get(buyer)
    if (!part) p.parts.set(buyer, (part = years.map(() => 0)))
    part[y] += c.eur ?? 0
  }
  const ids = [...per.keys()].sort()
  const matches = payeeMatches(data, links.payees)
  const buyerIds = [...new Set([...per.values()].flatMap((p) => [...p.parts.keys()]))].sort()
  const buyerIndex = new Map(buyerIds.map((b, i) => [b, i.toString(36)]))
  const total = (v: number[]) => Math.round(v.reduce((s, x) => s + x, 0))
  const kindOf = (key: string) => (key === PERSONS ? KINDS.person.id : key === WITHHELD ? KINDS.withheld.id : KINDS[data.suppliers.get(key)!.kind].id)
  const eik = (key: string) => data.suppliers.get(key)?.eik || null
  const search: ListSpec = {
    id: 'contract-suppliers',
    group: PROCUREMENT.id,
    title: t('Изпълнители на обществени поръчки', 'Public procurement suppliers'),
    short: t('Изпълнители', 'Suppliers'),
    description: t(
      `Всички ${count(ids.length, 'bg')} изпълнители на договори за обществени поръчки от 2016 до 2026 г. Потърсете фирма по име или ЕИК или изберете стойността на договорите ѝ и отворете страницата ѝ: кои възложители са сключили договори с нея, за колко и през коя година.`,
      `All ${count(ids.length, 'en')} suppliers of public procurement contracts of 2016–2026. Search for a company by name or company number, or choose the value of its contracts, and open its page: which buyers signed contracts with it, for how much and in which year.`,
    ),
    sources: [AOP_YEARLY, AOP_JSON, AOP_OCDS],
    caveats: CAVEATS,
    asOf: '2026-09-30',
    retrieved: '2026-10-06',
    unit: { one: t('изпълнител', 'supplier'), other: t('изпълнители', 'suppliers') },
    summary: ['amount'],
    sort: '-amount',
    columns: [
      { id: 'id', type: 'code', label: t('Изпълнител', 'Supplier'), hidden: true },
      { id: 'name', type: 'text', label: t('Изпълнител', 'Supplier'), search: true },
      { id: 'eik', type: 'code', label: t('ЕИК', 'Company number (ЕИК)'), search: true, detail: true },
      { id: 'cls', type: 'category', label: t('Вид изпълнител', 'Type of supplier'), filter: true, labels: KIND_LABELS },
      { id: 'band', type: 'category', label: t('Стойност на договорите', 'Value of contracts'), filter: true, ordered: true, labels: Object.fromEntries(BANDS.map((b) => [b.id, b.name])) },
      { id: 'amount', type: 'money', label: t('Договори 2016–2026', 'Contracts 2016–2026'), total: true, source: AOP_YEARLY.name },
      { id: 'n', type: 'number', label: t('Брой договори', 'Contracts'), total: true },
    ],
    key: 'id',
    rowLink: { list: 'contract-supplier', filter: 'id', column: 'id' },
    rows: ids.map((id) => {
      const amount = total(per.get(id)!.years)
      return [id, supplierName(data, id), eik(id), kindOf(id), BANDS.find((b) => amount >= b.from)!.id, amount, per.get(id)!.n]
    }),
    // One band of value at a time (all of them are 0.6 MB gzipped): the list opens on the bands and their totals; a
    // search of two letters or more loads them all.
    shardBy: 'band',
    shardChoose: true,
    shardSearch: 2,
  }
  const page: ListSpec = {
    id: 'contract-supplier',
    group: PROCUREMENT.id,
    hidden: true,
    back: 'contract-suppliers',
    title: t('Кой купува от този изпълнител', 'Who buys from this supplier'),
    short: t('Изпълнител', 'Supplier'),
    description: t(
      'Договорите на един изпълнител по обществени поръчки: по възложители и години (2016–2026 г.) и — където името или ЕИК съвпадат точно — плащанията към него от СЕБРА и проектите с европейски средства, по които е бенефициент.',
      'One supplier’s public procurement contracts: by buyer and year (2016–2026), and — where the name or company number match exactly — the payments to it through SEBRA and the EU-funded projects of which it is the beneficiary.',
    ),
    sources: [AOP_YEARLY, AOP_JSON, AOP_OCDS],
    caveats: [
      t(
        'Плащанията от СЕБРА са свързани, когато нормализираното име на изпълнителя (с правната форма) съвпада точно с името на точно един получател и е на точно един изпълнител; проектите с европейски средства — по ЕИК. Получателите в СЕБРА нямат ЕИК, затова фирми с еднакви имена не се свързват.',
        'SEBRA payments are linked when the supplier’s normalised name (with its legal form) matches the name of exactly one payee and belongs to exactly one supplier; EU-funded projects by company number. SEBRA payees have no company number, so companies of the same name are not linked.',
      ),
      ...CAVEATS,
    ],
    asOf: '2026-09-30',
    retrieved: '2026-10-06',
    unit: { one: t('изпълнител', 'supplier'), other: t('изпълнители', 'suppliers') },
    summary: ['amount'],
    sort: '-amount',
    columns: [
      { id: 'id', type: 'code', label: t('Изпълнител', 'Supplier'), hidden: true },
      { id: 'name', type: 'text', label: t('Изпълнител', 'Supplier'), search: true },
      { id: 'eik', type: 'code', label: t('ЕИК', 'Company number (ЕИК)'), detail: true },
      { id: 'cls', type: 'category', label: t('Вид изпълнител', 'Type of supplier'), labels: KIND_LABELS },
      { id: 'amount', type: 'money', label: t('Договори 2016–2026', 'Contracts 2016–2026'), total: true, source: AOP_YEARLY.name },
      { id: 'n', type: 'number', label: t('Брой договори', 'Contracts'), total: true },
      {
        id: 'buyers',
        type: 'breakdown',
        label: t('Възложители, по години', 'Buyers, by year'),
        detail: true,
        periods: years,
        // Buyers by a short number here (the page is fetched in pieces; their names come once, with the list).
        labels: Object.fromEntries(buyerIds.map((b) => [buyerIndex.get(b)!, b === '?' ? t('Без посочен възложител', 'No buyer given') : cut(nameOf(data, b), LABEL_LENGTH)])),
      },
      { id: 'payee', type: 'text', label: t('Плащания от държавата (СЕБРА)', 'Payments by the state (SEBRA)'), detail: true, link: { list: 'payee', filter: 'id', column: 'payeeId' } },
      { id: 'payeeId', type: 'code', label: t('Получател в СЕБРА', 'SEBRA payee'), hidden: true },
      { id: 'euN', type: 'number', label: t('Проекти с европейски средства като бенефициент', 'EU-funded projects as beneficiary'), detail: true },
      { id: 'euValue', type: 'money', label: t('Обща стойност на тези проекти', 'Total value of those projects'), detail: true },
    ],
    key: 'id',
    rows: ids.map((id) => {
      const p = per.get(id)!
      const parts = [...p.parts].map(([buyer, values]) => {
        const v = values.map((x) => Math.round(x))
        while (v.length > 1 && !v.at(-1)) v.pop()
        return [buyerIndex.get(buyer)!, ...v]
      })
      const s = data.suppliers.get(id)
      const payee = matches.get(id)
      const eu = s?.eik ? links.eu.get(s.eik) : undefined
      return [
        id,
        supplierName(data, id),
        eik(id),
        kindOf(id),
        total(p.years),
        p.n,
        parts,
        payee ? payee.name : null,
        payee ? payee.id : null,
        eu?.n ?? null,
        eu ? Math.round(eu.value) : null,
      ]
    }),
    shardBy: 'id',
    shardHash: PAGE_FILES,
  }
  return [search, page]
}

const nameOf = (data: ProcurementData, eik: string): string => cut(data.buyers.get(eik) || 'Възложител без име (едноличен търговец)')

// ---------- buyers ----------

function buyerLists(data: ProcurementData, datasets: Dataset[], register: Register): ListSpec[] {
  const years = data.years
  const per = new Map<string, { years: number[]; n: number; parts: Map<string, number[]> }>()
  for (const c of awarded(data)) {
    if (!c.buyer) continue
    let p = per.get(c.buyer)
    if (!p) per.set(c.buyer, (p = { years: years.map(() => 0), n: 0, parts: new Map() }))
    const y = years.indexOf(c.year)
    p.years[y] += c.eur ?? 0
    p.n += 1
    let part = p.parts.get(c.supplier)
    if (!part) p.parts.set(c.supplier, (part = years.map(() => 0)))
    part[y] += c.eur ?? 0
  }
  const ids = [...per.keys()].sort()
  const total = (v: number[]) => Math.round(v.reduce((s, x) => s + x, 0))
  // Each buyer's largest suppliers by name, the rest as one part.
  const named = new Set<string>()
  const partsOf = new Map<string, (string | number)[][]>()
  for (const [buyer, p] of per) {
    const order = (by: (v: number[]) => number) => [...p.parts].sort((a, b) => by(b[1]) - by(a[1]) || (a[0] < b[0] ? -1 : 1)).map(([s]) => s)
    // The largest overall, and the largest of each year, so that sorting the page by a year shows that year's.
    const keep = new Set(order(total).slice(0, BUYER_SUPPLIERS))
    years.forEach((_, y) => order((v) => v[y]).slice(0, BUYER_SUPPLIERS_A_YEAR).forEach((s) => p.parts.get(s)![y] > 0 && keep.add(s)))
    const rest = years.map(() => 0)
    const parts: (string | number)[][] = []
    for (const supplier of order(total)) {
      const values = p.parts.get(supplier)!
      if (keep.has(supplier)) {
        named.add(supplier)
        parts.push([supplier, ...values.map((x) => Math.round(x))])
      } else values.forEach((v, y) => (rest[y] += v))
    }
    if (p.parts.size > keep.size) parts.push([`+${p.parts.size - keep.size}`, ...rest.map((x) => Math.round(x))])
    for (const part of parts) while (part.length > 2 && !part.at(-1)) part.pop()
    partsOf.set(buyer, parts)
  }
  const supplierIds = [...named].sort()
  const supplierIndex = new Map(supplierIds.map((s, i) => [s, i.toString(36)]))
  const others = new Set([...partsOf.values()].flatMap((parts) => parts.filter((p) => String(p[0]).startsWith('+')).map((p) => String(p[0]))))
  const restLabel = (key: string) => {
    const n = Number(key.slice(1))
    return t(`Други изпълнители (${count(n, 'bg')})`, `Other suppliers (${count(n, 'en')})`)
  }
  const supplierLabels: Record<string, LocalizedText | string> = {
    // Names as published, the same in both languages, as plain strings.
    ...Object.fromEntries(supplierIds.map((s) => {
      const name = supplierName(data, s)
      return [supplierIndex.get(s)!, typeof name === 'string' ? cut(name, LABEL_LENGTH) : name]
    })),
    ...Object.fromEntries([...others].map((k) => [k, restLabel(k)])),
  }
  const index = (key: string) => (key.startsWith('+') ? key : supplierIndex.get(key)!)
  // Ministries and municipalities: the register's buyers that are nodes of a tree.
  const tree = new Map(data.nodes.map((n) => [n.eik, n]))
  const nodeOf = (n: { family: string; node: string }) => (n.family === 'municipalities' ? register.byCode(n.node).key : n.node)
  const treeKind = (eik: string) => (tree.get(eik)?.family === 'ministries' ? 'mi' : tree.get(eik)?.family === 'municipalities' ? 'mu' : null)
  const buyerLabels = Object.fromEntries(ids.map((id) => [id, nameOf(data, id)]))
  const list: ListSpec = {
    id: 'contract-buyers',
    group: PROCUREMENT.id,
    title: t('Възложители на обществени поръчки', 'Public procurement buyers'),
    short: t('Възложители', 'Buyers'),
    description: t(
      `Всички ${count(ids.length, 'bg')} възложители — министерства, агенции, общини, болници, училища, държавни дружества …: стойността на договорите им по години. Отворете възложител, за да видите от кого купува.`,
      `All ${count(ids.length, 'en')} buyers — ministries, agencies, municipalities, hospitals, schools, state companies …: the value of their contracts by year. Open a buyer to see whom it buys from.`,
    ),
    sources: [AOP_YEARLY, AOP_JSON, AOP_OCDS],
    caveats: CAVEATS,
    asOf: '2026-09-30',
    retrieved: '2026-10-06',
    unit: { one: t('възложител', 'buyer'), other: t('възложители', 'buyers') },
    summary: ['amount'],
    sort: '-amount',
    columns: [
      { id: 'id', type: 'code', label: t('ЕИК', 'Company number (ЕИК)'), search: true, detail: true },
      { id: 'name', type: 'text', label: t('Възложител', 'Buyer'), search: true },
      { id: 'tree', type: 'category', label: t('В „Разходи“', 'In “Spending”'), filter: true, labels: { mi: t('Министерства и ведомства', 'Ministries and agencies'), mu: t('Общини', 'Municipalities') } },
      { id: 'amount', type: 'money', label: t('Договори 2016–2026', 'Contracts 2016–2026'), total: true, source: AOP_YEARLY.name },
      { id: 'years', type: 'series', label: t('По години', 'By year'), periods: years, total: true, detail: true },
      { id: 'n', type: 'number', label: t('Брой договори', 'Contracts'), total: true },
    ],
    key: 'id',
    titleColumn: 'name',
    rowLink: { list: 'contract-buyer', filter: 'id', column: 'id' },
    rows: ids.map((id) => {
      const p = per.get(id)!
      return [id, nameOf(data, id), treeKind(id), total(p.years), p.years.map((v) => (v ? Math.round(v) : null)), p.n]
    }),
  }
  const linkYears = (family: Dataset['family']) => [...new Set(datasets.filter((d) => d.family === family).map((d) => d.year))].sort()
  const known = (family: Dataset['family'], year: number) => {
    const ids = new Set<string>()
    for (const d of datasets.filter((x) => x.family === family && x.year === year)) {
      const walk = (n: Dataset['root']) => {
        ids.add(n.id)
        n.children?.forEach(walk)
      }
      walk(d.root)
    }
    return ids
  }
  const links: ListLinkSpec[] = (['ministries', 'municipalities'] as const).flatMap((family) =>
    linkYears(family).map((year) => {
      const present = known(family, year)
      const nodes = Object.fromEntries(data.nodes.filter((n) => n.family === family && per.has(n.eik) && present.has(nodeOf(n))).map((n) => [n.eik, nodeOf(n)]))
      return {
        family,
        column: 'id',
        nodes,
        years: [year],
        value: 'amount',
        label: t('', ''),
        text: t('Договори за обществени поръчки (2016–2026 г.): {total}', 'Public procurement contracts (2016–2026): {total}'),
      }
    }),
  )
  const page: ListSpec = {
    id: 'contract-buyer',
    group: PROCUREMENT.id,
    hidden: true,
    back: 'contract-buyers',
    title: t('От кого купува този възложител', 'Whom this buyer buys from'),
    short: t('Възложител', 'Buyer'),
    description: t(
      `Договорите на един възложител по обществени поръчки, 2016–2026 г.: най-големите ${BUYER_SUPPLIERS} изпълнители общо и най-големите ${BUYER_SUPPLIERS_A_YEAR} за всяка година, по години (подредете по година, за да видите най-големите в нея), и останалите заедно.`,
      `One buyer’s public procurement contracts, 2016–2026: its ${BUYER_SUPPLIERS} largest suppliers overall and the ${BUYER_SUPPLIERS_A_YEAR} largest of each year, by year (sort by a year to see the largest in it), and the others together.`,
    ),
    sources: [AOP_YEARLY, AOP_JSON, AOP_OCDS],
    caveats: CAVEATS,
    asOf: '2026-09-30',
    retrieved: '2026-10-06',
    unit: { one: t('възложител', 'buyer'), other: t('възложители', 'buyers') },
    summary: ['amount'],
    sort: '-amount',
    links,
    columns: [
      // The names of the buyer and of its suppliers come with its shard: the list file stays small.
      { id: 'id', type: 'category', label: t('Възложител', 'Buyer'), labels: buyerLabels, shardLabels: true },
      { id: 'eik', type: 'code', label: t('ЕИК', 'Company number (ЕИК)'), detail: true },
      { id: 'amount', type: 'money', label: t('Договори 2016–2026', 'Contracts 2016–2026'), total: true, source: AOP_YEARLY.name },
      { id: 'n', type: 'number', label: t('Брой договори', 'Contracts'), total: true },
      { id: 'suppliers', type: 'breakdown', label: t('Изпълнители, по години', 'Suppliers, by year'), detail: true, periods: years, labels: supplierLabels, shardLabels: true },
    ],
    key: 'id',
    titleColumn: 'id',
    rows: ids.map((id) => {
      const p = per.get(id)!
      return [id, id, total(p.years), p.n, partsOf.get(id)!.map(([key, ...values]) => [index(String(key)), ...values])]
    }),
    shardBy: 'id',
    shardHash: PAGE_FILES,
  }
  return [list, page]
}

/** EU-funded projects by beneficiary ЕИК (legal entities only): count and total value. */
export function euByEik(projects: URL): Map<string, { n: number; value: number }> {
  const out = new Map<string, { n: number; value: number }>()
  for (const r of readCsv(projects)) {
    if (r.beneficiary_kind !== 'legal' || !r.beneficiary) continue
    const a = out.get(r.beneficiary) ?? { n: 0, value: 0 }
    a.n += 1
    a.value += Number(r.value_EUR || 0)
    out.set(r.beneficiary, a)
  }
  return out
}

/**
 * SEBRA payees a supplier page may link to: id → name. Not the anonymised group, nor sole traders — the payment lists
 * name them, but procurement keeps the strict rule, so its pages never show a sole trader's name, not even through a link.
 */
export function sebraPayees(payees: URL): Map<string, string> {
  return new Map(readCsv(payees).filter((r) => r.class !== 'person' && r.class !== 'sole-trader').map((r) => [r.id, r.name]))
}

export function buildProcurementLists(config: { dir: URL; datasets: Dataset[]; register: Register; payees: URL; projects: URL }): ListSpec[] {
  const years = ['2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026']
  const data = readProcurement(config.dir, years)
  const links = { payees: sebraPayees(config.payees), eu: euByEik(config.projects) }
  return [contractsList(data), categoriesList(data), ...supplierLists(data, links), ...buyerLists(data, config.datasets, config.register)]
}
