// Public procurement: the contracts that buyers sign after a procurement procedure, as lists (format: ListFile in
// src/lib/types.ts), from the extracts in data/sources/procurement/ (made by scripts/extract/procurement.py, see the
// folder's README):
//   contracts             every contract of 2024–2026 and the large ones of 2016–2023, by year
//   contract-categories   totals by CPV division: contracts of 2026, TED award notices of 2024 and 2025
//   contract-suppliers    every supplier (search), linking to its page
//   contract-supplier     one supplier: who buys from it, by buyer and year (reached through links)
//   contract-buyers       every buyer, by year, linking to its page
//   contract-buyer        one buyer: whom it buys from, by supplier and year; linked from ministries and municipalities
//   ted-awards            TED award notices of Bulgarian buyers, 2024–2025 (above the EU thresholds only)
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
/** TED award notices of at least this much (euro) are listed one by one. */
export const TED_MIN = 100_000
/** A buyer's page names its largest suppliers (by total) and the largest of each year; the rest are one part. */
const BUYER_SUPPLIERS = 30
const BUYER_SUPPLIERS_A_YEAR = 10
/** Subjects and titles are cut to this many characters (with "…"); the extracts keep 200. */
const TEXT_LENGTH = 90
const SEARCH_FILES = 4
const PAGE_FILES = 64

export const PROCUREMENT: ListGroup = {
  id: 'procurement',
  title: t('Обществени поръчки', 'Public procurement'),
  description: t(
    'Договорите, които министерствата, общините, болниците, училищата и другите възложители сключват след обществена поръчка: кой какво купува, от кого и за колко. 2016–2023 г. и 2026 г. — от Агенцията по обществени поръчки; за 2024–2025 г. Агенцията не е публикувала данни от новата платформа, затова тук са само обявленията за възлагане в TED (над европейските прагове). Не са част от кръговата диаграма: договорите са поети задължения, а не плащания.',
    'The contracts that ministries, municipalities, hospitals, schools and other buyers sign after a public procurement procedure: who buys what, from whom and for how much. 2016–2023 and 2026 come from the Public Procurement Agency; for 2024–2025 the agency has not published the data of its new platform, so only the award notices in TED (above the EU thresholds) are here. They are not slices of the donut: contracts are commitments, not payments.',
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
const AOP_OCDS = {
  name: t(
    'Агенция по обществени поръчки — обявления, публикувани в ЦАИС ЕОП през 2026 г., по стандарта OCDS (data.egov.bg, ежедневно), 01.01–30.09.2026 г.',
    'Public Procurement Agency — notices published in ЦАИС ЕОП in 2026, in the Open Contracting Data Standard (data.egov.bg, daily), 1 Jan – 30 Sep 2026',
  ),
  url: 'https://www2.aop.bg/e-uslugi/otvoreni-danni-ot-rop/',
}
const TED = {
  name: t(
    'TED (Tenders Electronic Daily, Официален вестник на ЕС) — обявления за възлагане на български възложители, публикувани през 2024 и 2025 г. (API v3)',
    'TED (Tenders Electronic Daily, Official Journal of the EU) — award notices of Bulgarian buyers published in 2024 and 2025 (API v3)',
  ),
  url: 'https://ted.europa.eu/',
}

const LICENCE = t(
  'Данните на Агенцията по обществени поръчки са публикувани при условия CC0 (2020 г., 2023–2026 г.) и CC BY — с посочване на източника (2016–2017 г., 2021–2022 г.); за 2018–2019 г. не са посочени условия. Тези на TED са свободни за повторна употреба с посочване на източника (решение 2011/833/ЕС на Комисията).',
  'The Public Procurement Agency’s data are published under CC0 (2020, 2023–2026) and CC BY — with attribution (2016–2017, 2021–2022); no terms are stated for 2018–2019. TED’s are free to reuse with acknowledgement of the source (Commission Decision 2011/833/EU).',
)

const CAVEATS: LocalizedText[] = [
  t(
    'Стойността е при сключване на договора, без ДДС, както е обявена от възложителя (редките стойности „с ДДС“ в стария регистър са отбелязани); когато договорът е изменен, стойността след последното изменение е в подробностите. Това са поети задължения, а не плащания: по рамковите споразумения е обявена най-високата възможна сума, а много договори се изпълняват за по-малко. Сумите в лева са превърнати в евро по фиксирания курс 1,95583, а в други валути — по месечния курс на ЕЦБ.',
    'The value is at signing, excluding VAT, as the buyer announced it (the rare values marked “with VAT” in the old register are flagged); where the contract was amended, the value after the last amendment is in the details. These are commitments, not payments: framework agreements announce the highest possible amount, and many contracts are carried out for less. Leva are converted at the fixed rate of 1.95583 per euro, other currencies at the ECB’s monthly rate.',
  ),
  t(
    'Годината е тази, в която договорът е обявен (в регистъра или с обявление за възлагане); повечето са сключени през същата или в края на предходната година. За 2024 и 2025 г. Агенцията е публикувала само договорите по поръчки, открити в стария регистър преди задължителното използване на ЦАИС ЕОП (186 договора) — договорите от ЦАИС ЕОП за тези години не са публикувани като отворени данни; за тях виж „Обявления в TED“. 2026 г. стига до 30 септември.',
    'The year is the one in which the contract was announced (in the register, or by an award notice); most were signed that year or late in the year before. For 2024 and 2025 the agency published only the contracts of procedures opened in the old register before the e-procurement platform became mandatory (186 contracts) — the platform’s contracts of those years are not published as open data; see “TED notices” for them. 2026 runs to 30 September.',
  ),
  t(
    'Физическите лица и едноличните търговци (чието име съдържа името на собственика) не се показват по име, нито предметът на договорите им, по правилата на списъците с европейски средства и земеделски субсидии: те са една група. Изпълнител без български ЕИК (чуждестранна фирма, обединение без номер) е разпознат по името си; изпълнител без номер и без нищо в името, което да показва организация, е приет за физическо лице.',
    'Natural persons and sole traders (whose firm name contains the owner’s name) are not named, nor is the subject of their contracts, by the rules of the EU-funds and farm-subsidy lists: they are one group. A supplier without a Bulgarian company number (a foreign company, a consortium without a number) is recognised by its name; a supplier with no number and nothing in its name that marks an organisation is taken for a natural person.',
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

interface TedNotice {
  id: string
  year: string
  published: string
  buyer: string
  buyerName: string
  title: string
  cpv: string
  procedure: string
  winners: { key: string; kind: string }[]
  lots: number
  eur: number | null
}

export interface ProcurementData {
  contracts: Contract[]
  suppliers: Map<string, Supplier>
  buyers: Map<string, string>
  nodes: { eik: string; family: 'ministries' | 'municipalities'; node: string }[]
  cpv: Map<string, LocalizedText>
  ted: TedNotice[]
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
  const ted = readCsv(new URL('ted-notices.csv.gz', dir)).map((r) => {
    const keys = r.winners ? r.winners.split(' ') : []
    const kinds = r.winner_kinds ? r.winner_kinds.split(' ') : []
    return {
      id: r.id,
      year: r.year,
      published: r.published,
      buyer: r.buyer,
      buyerName: r.buyer_name,
      title: r.title,
      cpv: r.cpv,
      procedure: r.procedure,
      winners: keys.map((key, i) => ({ key, kind: kinds[i] })),
      lots: Number(r.lots),
      eur: euro(r.value_EUR),
    }
  })
  return { contracts, suppliers, buyers, nodes, cpv, ted, years }
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

/** OCDS procurement methods (2026) and eForms procedure types (TED). */
const PROCEDURES: Record<string, LocalizedText> = {
  open: t('Открита процедура', 'Open procedure'),
  selective: t('Ограничена или с предварителен подбор', 'Selective (restricted or with pre-selection)'),
  limited: t('Договаряне без предварително обявление', 'Negotiated without prior publication'),
  direct: t('Пряко възлагане', 'Direct award'),
  restricted: t('Ограничена процедура', 'Restricted procedure'),
  'neg-wo-call': t('Договаряне без предварително обявление', 'Negotiated without prior publication'),
  'neg-w-call': t('Състезателна процедура с договаряне', 'Competitive procedure with negotiation'),
  'comp-dial': t('Състезателен диалог', 'Competitive dialogue'),
  innovation: t('Партньорство за иновации', 'Innovation partnership'),
  'oth-single': t('Друга процедура (един етап)', 'Other single-stage procedure'),
  'oth-mult': t('Друга процедура (няколко етапа)', 'Other multi-stage procedure'),
  other: t('Друга (стар формуляр)', 'Other (old form)'),
}

const SOURCES: Record<string, LocalizedText> = {
  rop: t('Регистър на обществените поръчки (годишен файл)', 'Public Procurement Register (yearly file)'),
  eop: t('ЦАИС ЕОП (годишен файл)', 'ЦАИС ЕОП e-procurement platform (yearly file)'),
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
/** The list's year, or for 2026, whose contracts are many, the quarter of the award notice ("2026-2"). */
const periodOf = (c: Contract) => (c.year === '2026' ? `2026-${Math.floor((Number(c.published.slice(5, 7)) - 1) / 3) + 1}` : c.year)
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

/** The suppliers with a page: those of the awarded contracts, and the sole winners of TED notices (see supplierLists). */
const supplierPages = (data: ProcurementData) =>
  new Set([...awarded(data).map((c) => c.supplier), ...data.ted.flatMap((n) => (n.winners.length === 1 ? [n.winners[0].key] : []))])

// ---------- the contracts ----------

function contractsList(data: ProcurementData): ListSpec {
  const rows: ListCell[][] = []
  // A contract amended in 2026 but signed earlier counts on no page: its supplier may have none to link to.
  const paged = supplierPages(data)
  for (const c of data.contracts) {
    // Years the data cover in full are listed whole (2026's award notices, the old register's last contracts of
    // 2024–2025); of the others (2016–2023, and contracts signed before 2026 that were amended in it) the large ones.
    if ((c.year < '2024' || c.basis === 'amended') && (c.eur ?? 0) < LARGE && !VALUE_ERRORS[c.id]) continue
    const hidden = c.kind === 'person' || c.kind === 'sole-trader'
    rows.push([
      rows.length.toString(36),
      hidden ? t('Договор с физическо лице или едноличен търговец', 'Contract with a natural person or sole trader') : cut(c.subject) || null,
      contractSupplier(data, c),
      paged.has(c.supplier) ? c.supplier : null,
      c.buyer ? buyerName(data, c.buyer) : null,
      c.buyer || null,
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
      `Договорите по обществени поръчки, един по един: всички ${count(all2026.length, 'bg')} договора, обявени през 2026 г. (до 30 септември, ${bn(total2026, 'bg')} млрд. € без ДДС), договорите от стария регистър за 2024–2025 г. и всеки договор от 1 млн. € нагоре от 2016–2023 г. (${count(rows.filter((r) => (r[6] as string) < '2024').length, 'bg')}). Изберете година (за 2026 г. — тримесечие); всички договори на един изпълнител или възложител са на страницата му.`,
      `Public procurement contracts, one by one: all ${count(all2026.length, 'en')} contracts announced in 2026 (to 30 September, €${bn(total2026, 'en')} bn excluding VAT), the old register’s contracts of 2024–2025 and every contract of €1 m or more of 2016–2023 (${count(rows.filter((r) => (r[6] as string) < '2024').length, 'en')}). Choose a year (for 2026, a quarter); all the contracts of a supplier or buyer are on its page.`,
    ),
    sources: [AOP_OCDS, AOP_YEARLY],
    caveats: [
      t(
        `За 2016–2023 г. тук са само договорите от 1 млн. € нагоре (${count(rows.filter((r) => (r[6] as string) < '2024').length, 'bg')} от ${count(data.contracts.filter((c) => c.year < '2024').length, 'bg')}, около 70% от стойността); всички са в сборовете на страниците на изпълнителите и възложителите.`,
        `For 2016–2023 only the contracts of €1 m or more are listed here (${count(rows.filter((r) => (r[6] as string) < '2024').length, 'en')} of ${count(data.contracts.filter((c) => c.year < '2024').length, 'en')}, about 70% of the value); all of them count in the totals of the suppliers’ and buyers’ pages.`,
      ),
      t(
        `През 2026 г. в данните са и ${count(data.contracts.filter((c) => c.basis === 'amended').length, 'bg')} договора, сключени по-рано (най-вече през 2024–2025 г.), които са изменени през 2026 г.; тук са тези от 1 млн. € нагоре, скрити, докато не ги изберете в „Защо е в списъка“, и не се броят в сборовете на страниците. Публикациите в OCDS се повтарят (обявление, после изменения, понякога същата публикация в два дневни файла): всеки договор е един ред по номера на поръчката и на договора, със стойността от обявлението за възлагане и стойността след последното изменение.`,
        `In 2026 the data also hold ${count(data.contracts.filter((c) => c.basis === 'amended').length, 'en')} contracts signed earlier (mostly in 2024–2025) that were amended in 2026; those of €1 m or more are here, hidden until you choose them under “Why it is listed”, and they do not count in the pages’ totals. OCDS releases repeat (the award notice, then amendments, sometimes the same release in two daily files): every contract is one row by procurement and contract number, with the value of the award notice and the value after the last amendment.`,
      ),
      t(
        'Категорията (CPV, първите две цифри на основния код) и видът процедура са дадени само за 2026 г.; годишните файлове до 2025 г. ги нямат. Вид процедура в OCDS е обобщен: открита, ограничена (с подбор), договаряне без обявление.',
        'The category (CPV, the first two digits of the main code) and the procedure are given for 2026 only; the yearly files to 2025 lack them. The procedure in OCDS is coarse: open, selective, negotiated without a notice.',
      ),
      ...CAVEATS,
    ],
    asOf: '2026-09-30',
    retrieved: '2026-10-05',
    unit: { one: t('договор', 'contract'), other: t('договора', 'contracts') },
    summary: ['value'],
    sort: '-value',
    columns,
    key: 'k',
    titleColumn: 'subject',
    rows,
    shardBy: 'period',
    shardChoose: true,
  }
}

// ---------- totals by CPV division ----------

function categoriesList(data: ProcurementData): ListSpec {
  const periods = ['ted2024', 'ted2025', '2026']
  const by = new Map<string, { value: number[]; n: number[] }>()
  const add = (division: string, p: number, v: number | null) => {
    const a = by.get(division) ?? { value: periods.map(() => 0), n: periods.map(() => 0) }
    a.value[p] += v ?? 0
    a.n[p] += 1
    by.set(division, a)
  }
  for (const c of data.contracts) if (c.year === '2026' && c.basis === 'award') add(division(data, c.cpv) ?? '', 2, c.eur)
  for (const n of data.ted) add(division(data, n.cpv) ?? '', n.year === '2024' ? 0 : 1, n.eur)
  const labels: Record<string, LocalizedText> = { ...Object.fromEntries(data.cpv), '': t('Без код по CPV', 'No CPV code') }
  for (const d of by.keys()) if (!labels[d]) throw new Error(`procurement: no CPV division ${d}`)
  const rows: ListCell[][] = [...by]
    .sort((a, b) => b[1].value[2] - a[1].value[2])
    .map(([division, a]) => [division || 'none', division, a.value.map((v, i) => (a.n[i] ? Math.round(v) : null)), a.n.map((v) => v || null)])
  const periodLabels = {
    ted2024: t('2024 (TED)', '2024 (TED)'),
    ted2025: t('2025 (TED)', '2025 (TED)'),
    '2026': t('2026 (I–IX)', '2026 (Jan–Sep)'),
  }
  return {
    id: 'contract-categories',
    group: PROCUREMENT.id,
    title: t('Обществени поръчки по категории (CPV)', 'Public procurement by category (CPV)'),
    short: t('По категории', 'By category'),
    description: t(
      'Стойността на договорите по раздели на Общия терминологичен речник (CPV): договорите, обявени през 2026 г. (ЦАИС ЕОП), и — за сравнение, само частично — обявленията за възлагане в TED за 2024 и 2025 г. (поръчките над европейските прагове). Отворете категория, за да видите договорите ѝ от 2026 г. (след това изберете тримесечие).',
      'The value of contracts by division of the Common Procurement Vocabulary (CPV): the contracts announced in 2026 (ЦАИС ЕОП) and — to compare, in part only — the award notices in TED for 2024 and 2025 (procurements above the EU thresholds). Open a category to see its 2026 contracts (then choose a quarter).',
    ),
    sources: [AOP_OCDS, TED],
    caveats: [
      t(
        'Категорията е разделът (първите две цифри) на основния код по CPV на поръчката или на обособената позиция. Годишните файлове за 2016–2025 г. нямат кодове по CPV, затова тези години ги няма тук. TED съдържа само поръчките над европейските прагове (за 2024–2025 г. — около половината от стойността на всички поръчки в предходните години), а стойността на едно обявление е сборът на всички договори в него.',
        'The category is the division (first two digits) of the main CPV code of the procurement or the lot. The yearly files for 2016–2025 have no CPV codes, so those years are not here. TED holds only the procurements above the EU thresholds (for 2024–2025 about half of the value of all procurement in earlier years), and a notice’s value is the total of all the contracts in it.',
      ),
      ...CAVEATS.slice(0, 1),
      LICENCE,
    ],
    asOf: '2026-09-30',
    retrieved: '2026-10-05',
    unit: { one: t('категория', 'category'), other: t('категории', 'categories') },
    summary: ['value.2026', 'value.ted2025', 'value.ted2024'],
    sort: '-value.2026',
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
  // TED notices won alone (a notice's value cannot be split between several winners).
  const ted = new Map<string, { n: number; value: number }>()
  for (const n of data.ted) {
    if (n.winners.length !== 1) continue
    const a = ted.get(n.winners[0].key) ?? { n: 0, value: 0 }
    a.n += 1
    a.value += n.eur ?? 0
    ted.set(n.winners[0].key, a)
  }
  const ids = [...new Set([...per.keys(), ...ted.keys()])].sort()
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
      `Всички ${count(ids.length, 'bg')} изпълнители на договори за обществени поръчки от 2016 до 2023 г. и през 2026 г. и победители в обявленията в TED за 2024–2025 г. Потърсете фирма по име или ЕИК и отворете страницата ѝ: кои възложители са сключили договори с нея, за колко и през коя година.`,
      `All ${count(ids.length, 'en')} suppliers of public procurement contracts of 2016–2023 and 2026, and winners of the TED award notices of 2024–2025. Search for a company by name or company number and open its page: which buyers signed contracts with it, for how much and in which year.`,
    ),
    sources: [AOP_YEARLY, AOP_OCDS, TED],
    caveats: CAVEATS,
    asOf: '2026-09-30',
    retrieved: '2026-10-05',
    unit: { one: t('изпълнител', 'supplier'), other: t('изпълнители', 'suppliers') },
    summary: ['amount'],
    sort: '-amount',
    columns: [
      { id: 'id', type: 'code', label: t('Изпълнител', 'Supplier'), hidden: true },
      { id: 'name', type: 'text', label: t('Изпълнител', 'Supplier'), search: true },
      { id: 'eik', type: 'code', label: t('ЕИК', 'Company number (ЕИК)'), search: true, detail: true },
      { id: 'cls', type: 'category', label: t('Вид изпълнител', 'Type of supplier'), filter: true, labels: KIND_LABELS },
      { id: 'amount', type: 'money', label: t('Договори 2016–2023 и 2026', 'Contracts 2016–2023 and 2026'), total: true, source: AOP_YEARLY.name },
      { id: 'n', type: 'number', label: t('Брой договори', 'Contracts'), total: true },
      { id: 'ted', type: 'money', label: t('Обявления в TED 2024–2025, спечелени сам', 'TED award notices 2024–2025 won alone'), total: true, detail: true },
    ],
    key: 'id',
    rowLink: { list: 'contract-supplier', filter: 'id', column: 'id' },
    rows: ids.map((id) => [id, supplierName(data, id), eik(id), kindOf(id), per.has(id) ? total(per.get(id)!.years) : null, per.get(id)?.n ?? null, ted.has(id) ? Math.round(ted.get(id)!.value) : null]),
    shardBy: 'id',
    shardHash: SEARCH_FILES,
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
      'Договорите на един изпълнител по обществени поръчки: по възложители и години (2016–2023 г. и 2026 г.), обявленията в TED за 2024–2025 г., които е спечелил сам, и — където името или ЕИК съвпадат точно — плащанията към него от СЕБРА и проектите с европейски средства, по които е бенефициент.',
      'One supplier’s public procurement contracts: by buyer and year (2016–2023 and 2026), the TED award notices of 2024–2025 it won alone, and — where the name or company number match exactly — the payments to it through SEBRA and the EU-funded projects of which it is the beneficiary.',
    ),
    sources: [AOP_YEARLY, AOP_OCDS, TED],
    caveats: [
      t(
        'Плащанията от СЕБРА са свързани, когато нормализираното име на изпълнителя (с правната форма) съвпада точно с името на точно един получател и е на точно един изпълнител; проектите с европейски средства — по ЕИК. Получателите в СЕБРА нямат ЕИК, затова фирми с еднакви имена не се свързват.',
        'SEBRA payments are linked when the supplier’s normalised name (with its legal form) matches the name of exactly one payee and belongs to exactly one supplier; EU-funded projects by company number. SEBRA payees have no company number, so companies of the same name are not linked.',
      ),
      ...CAVEATS,
    ],
    asOf: '2026-09-30',
    retrieved: '2026-10-05',
    unit: { one: t('изпълнител', 'supplier'), other: t('изпълнители', 'suppliers') },
    summary: ['amount'],
    sort: '-amount',
    columns: [
      { id: 'id', type: 'code', label: t('Изпълнител', 'Supplier'), hidden: true },
      { id: 'name', type: 'text', label: t('Изпълнител', 'Supplier'), search: true },
      { id: 'eik', type: 'code', label: t('ЕИК', 'Company number (ЕИК)'), detail: true },
      { id: 'cls', type: 'category', label: t('Вид изпълнител', 'Type of supplier'), labels: KIND_LABELS },
      { id: 'amount', type: 'money', label: t('Договори 2016–2023 и 2026', 'Contracts 2016–2023 and 2026'), total: true, source: AOP_YEARLY.name },
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
      { id: 'ted', type: 'money', label: t('Обявления в TED 2024–2025, спечелени сам', 'TED award notices 2024–2025 won alone'), detail: true },
      { id: 'tedN', type: 'number', label: t('Брой обявления в TED', 'TED notices'), detail: true },
      { id: 'payee', type: 'text', label: t('Плащания от държавата (СЕБРА)', 'Payments by the state (SEBRA)'), detail: true, link: { list: 'payee', filter: 'id', column: 'payeeId' } },
      { id: 'payeeId', type: 'code', label: t('Получател в СЕБРА', 'SEBRA payee'), hidden: true },
      { id: 'euN', type: 'number', label: t('Проекти с европейски средства като бенефициент', 'EU-funded projects as beneficiary'), detail: true },
      { id: 'euValue', type: 'money', label: t('Обща стойност на тези проекти', 'Total value of those projects'), detail: true },
    ],
    key: 'id',
    rows: ids.map((id) => {
      const p = per.get(id)
      const parts = p
        ? [...p.parts].map(([buyer, values]) => {
            const v = values.map((x) => Math.round(x))
            while (v.length > 1 && !v.at(-1)) v.pop()
            return [buyerIndex.get(buyer)!, ...v]
          })
        : null
      const s = data.suppliers.get(id)
      const payee = matches.get(id)
      const eu = s?.eik ? links.eu.get(s.eik) : undefined
      return [
        id,
        supplierName(data, id),
        eik(id),
        kindOf(id),
        p ? total(p.years) : null,
        p?.n ?? null,
        parts,
        ted.has(id) ? Math.round(ted.get(id)!.value) : null,
        ted.get(id)?.n ?? null,
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
  const ted = new Map<string, { n: number; value: number }>()
  for (const n of data.ted) {
    if (!n.buyer) continue
    const a = ted.get(n.buyer) ?? { n: 0, value: 0 }
    a.n += 1
    a.value += n.eur ?? 0
    ted.set(n.buyer, a)
  }
  const ids = [...new Set([...per.keys(), ...ted.keys()])].sort()
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
    sources: [AOP_YEARLY, AOP_OCDS, TED],
    caveats: CAVEATS,
    asOf: '2026-09-30',
    retrieved: '2026-10-05',
    unit: { one: t('възложител', 'buyer'), other: t('възложители', 'buyers') },
    summary: ['amount'],
    sort: '-amount',
    columns: [
      { id: 'id', type: 'code', label: t('ЕИК', 'Company number (ЕИК)'), search: true, detail: true },
      { id: 'name', type: 'text', label: t('Възложител', 'Buyer'), search: true },
      { id: 'tree', type: 'category', label: t('В „Разходи“', 'In “Spending”'), filter: true, labels: { mi: t('Министерства и ведомства', 'Ministries and agencies'), mu: t('Общини', 'Municipalities') } },
      { id: 'amount', type: 'money', label: t('Договори 2016–2023 и 2026', 'Contracts 2016–2023 and 2026'), total: true, source: AOP_YEARLY.name },
      { id: 'years', type: 'series', label: t('По години', 'By year'), periods: years, total: true, detail: true },
      { id: 'n', type: 'number', label: t('Брой договори', 'Contracts'), total: true },
      { id: 'ted', type: 'money', label: t('Обявления в TED 2024–2025', 'TED notices 2024–2025'), total: true },
    ],
    key: 'id',
    titleColumn: 'name',
    rowLink: { list: 'contract-buyer', filter: 'id', column: 'id' },
    rows: ids.map((id) => {
      const p = per.get(id)
      return [id, nameOf(data, id), treeKind(id), p ? total(p.years) : null, p ? p.years.map((v) => (v ? Math.round(v) : null)) : null, p?.n ?? null, ted.has(id) ? Math.round(ted.get(id)!.value) : null]
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
        text: t('Договори за обществени поръчки (2016–2023 и 2026 г.): {total}', 'Public procurement contracts (2016–2023 and 2026): {total}'),
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
      `Договорите на един възложител по обществени поръчки: най-големите ${BUYER_SUPPLIERS} изпълнители общо и най-големите ${BUYER_SUPPLIERS_A_YEAR} за всяка година, по години (подредете по година, за да видите най-големите в нея), останалите заедно, и обявленията му в TED за 2024–2025 г.`,
      `One buyer’s public procurement contracts: its ${BUYER_SUPPLIERS} largest suppliers overall and the ${BUYER_SUPPLIERS_A_YEAR} largest of each year, by year (sort by a year to see the largest in it), the others together, and its TED award notices of 2024–2025.`,
    ),
    sources: [AOP_YEARLY, AOP_OCDS, TED],
    caveats: CAVEATS,
    asOf: '2026-09-30',
    retrieved: '2026-10-05',
    unit: { one: t('възложител', 'buyer'), other: t('възложители', 'buyers') },
    summary: ['amount'],
    sort: '-amount',
    links,
    columns: [
      { id: 'id', type: 'category', label: t('Възложител', 'Buyer'), labels: buyerLabels },
      { id: 'eik', type: 'code', label: t('ЕИК', 'Company number (ЕИК)'), detail: true },
      { id: 'amount', type: 'money', label: t('Договори 2016–2023 и 2026', 'Contracts 2016–2023 and 2026'), total: true, source: AOP_YEARLY.name },
      { id: 'n', type: 'number', label: t('Брой договори', 'Contracts'), total: true },
      { id: 'suppliers', type: 'breakdown', label: t('Изпълнители, по години', 'Suppliers, by year'), detail: true, periods: years, labels: supplierLabels },
      { id: 'ted', type: 'money', label: t('Обявления в TED 2024–2025', 'TED notices 2024–2025'), detail: true },
      { id: 'tedN', type: 'number', label: t('Брой обявления в TED', 'TED notices'), detail: true },
    ],
    key: 'id',
    titleColumn: 'id',
    rows: ids.map((id) => {
      const p = per.get(id)
      return [
        id,
        id,
        p ? total(p.years) : null,
        p?.n ?? null,
        p ? partsOf.get(id)!.map(([key, ...values]) => [index(String(key)), ...values]) : null,
        ted.has(id) ? Math.round(ted.get(id)!.value) : null,
        ted.get(id)?.n ?? null,
      ]
    }),
    shardBy: 'id',
    shardHash: PAGE_FILES,
  }
  return [list, page]
}

// ---------- TED ----------

function tedList(data: ProcurementData): ListSpec {
  const kept = data.ted.filter((n) => (n.eur ?? 0) >= TED_MIN)
  const rows: ListCell[][] = kept.map((n) => {
    // Names as published; a person, a sole trader or a winner not published is said in both languages.
    const names = n.winners.map((w): LocalizedText =>
      w.key === PERSONS
        ? w.kind === 'sole-trader'
          ? t('едноличен търговец', 'sole trader')
          : t('физическо лице', 'natural person')
        : w.key === WITHHELD
          ? t('не е публикуван', 'not published')
          : same(String(supplierName(data, w.key))),
    )
    const joined = t(names.map((x) => x.bg).join(' · '), names.map((x) => x.en).join(' · '))
    const sole = n.winners.length === 1 && n.winners[0].key !== WITHHELD ? n.winners[0].key : null
    return [
      cut(n.title) || null,
      n.buyerName || null,
      n.buyer || null,
      names.length ? (joined.bg === joined.en ? joined.bg : joined) : null,
      sole,
      n.year,
      n.published,
      division(data, n.cpv),
      n.procedure || null,
      n.lots || null,
      euros(n.eur),
      n.id,
    ]
  })
  const total = (year: string) => data.ted.filter((n) => n.year === year).reduce((s, n) => s + (n.eur ?? 0), 0)
  return {
    id: 'ted-awards',
    group: PROCUREMENT.id,
    title: t('Обявления за възлагане в TED, 2024–2025 г. (частично)', 'Award notices in TED, 2024–2025 (partial)'),
    short: t('Обявления в TED 2024–2025', 'TED notices 2024–2025'),
    description: t(
      `Обявленията за възлагане на български възложители, публикувани в TED през 2024 и 2025 г. — единственият публикуван източник за договорите от тези години: само поръчките над европейските прагове (около 140 000 € за доставки и услуги на централната власт, 5,5 млн. € за строителство). ${count(data.ted.length, 'bg')} обявления за ${bn(total('2024'), 'bg')} млрд. € (2024) и ${bn(total('2025'), 'bg')} млрд. € (2025) без ДДС; тук са тези от 100 000 € нагоре.`,
      `The award notices of Bulgarian buyers published in TED in 2024 and 2025 — the only published source for the contracts of those years: procurements above the EU thresholds only (about €140,000 for central government supplies and services, €5.5 m for works). ${count(data.ted.length, 'en')} notices worth €${bn(total('2024'), 'en')} bn (2024) and €${bn(total('2025'), 'en')} bn (2025) excluding VAT; those of €100,000 or more are listed here.`,
    ),
    sources: [TED],
    caveats: [
      t(
        'Това не е пълният списък на договорите за 2024–2025 г.: поръчките под европейските прагове (повечето на брой) не се публикуват в TED. Едно обявление може да обхваща няколко обособени позиции и победители; стойността му е сборът на всички договори в него (при рамковите споразумения — най-високата възможна сума). Обявленията за изменение на договор не са тук, а поправените обявления са заменени с последната си версия; обявленията на чуждестранни водещи възложители (съвместни поръчки в няколко държави) са пропуснати.',
        'This is not the full list of 2024–2025 contracts: procurements below the EU thresholds (most of them by number) are not published in TED. A notice can cover several lots and winners; its value is the total of all its contracts (for framework agreements, the highest possible amount). Contract modification notices are not here, and corrected notices are replaced by their last version; notices led by a foreign buyer (joint procurement across countries) are left out.',
      ),
      t(
        `Победителите са както са в обявлението; физическите лица и едноличните търговци не се назовават. Победител, спечелил обявление сам, води към страницата си като изпълнител. В ${count(kept.filter((n) => !n.winners.length).length, 'bg')} от обявленията тук данните на TED не назовават победител (често в старите формуляри от началото на 2024 г. или когато е посочен само в текста на офертата).`,
        `Winners are as in the notice; natural persons and sole traders are not named. A winner that won a notice alone links to its supplier page. In ${count(kept.filter((n) => !n.winners.length).length, 'en')} of the notices here TED’s data name no winner (often the old forms of early 2024, or where it is given only in the tender’s text).`,
      ),
      ...CAVEATS.slice(0, 1),
      LICENCE,
    ],
    asOf: '2025-12-31',
    retrieved: '2026-10-05',
    unit: { one: t('обявление', 'notice'), other: t('обявления', 'notices') },
    summary: ['value'],
    sort: '-value',
    columns: [
      { id: 'title', type: 'text', label: t('Поръчка', 'Procurement'), search: true },
      { id: 'buyer', type: 'text', label: t('Възложител', 'Buyer'), search: true, link: { list: 'contract-buyer', filter: 'id', column: 'buyerId' } },
      { id: 'buyerId', type: 'text', label: t('ЕИК на възложителя', 'Buyer’s company number'), hidden: true },
      { id: 'winners', type: 'text', label: t('Победители', 'Winners'), search: true, link: { list: 'contract-supplier', filter: 'id', column: 'winnerId' } },
      { id: 'winnerId', type: 'text', label: t('Победител', 'Winner'), hidden: true },
      { id: 'year', type: 'category', label: t('Година', 'Year'), filter: true, labels: { '2024': same('2024'), '2025': same('2025') } },
      { id: 'published', type: 'date', label: t('Публикувано на', 'Published on') },
      { id: 'cpv', type: 'category', label: t('Категория (CPV)', 'Category (CPV)'), filter: true, detail: true, labels: Object.fromEntries(data.cpv) },
      { id: 'procedure', type: 'category', label: t('Вид процедура', 'Procedure'), filter: true, detail: true, labels: PROCEDURES },
      { id: 'lots', type: 'number', label: t('Обособени позиции', 'Lots'), detail: true },
      { id: 'value', type: 'money', label: t('Стойност без ДДС', 'Value excl. VAT'), total: true, source: TED.name },
      { id: 'k', type: 'url', label: t('Обявлението в TED', 'The notice in TED'), detail: true, search: true, href: 'https://ted.europa.eu/bg/notice/-/detail/{value}' },
    ],
    key: 'k',
    titleColumn: 'title',
    rows,
    shardBy: 'year',
  }
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

/** SEBRA payees (outside the anonymised group): id → name. */
export function sebraPayees(payees: URL): Map<string, string> {
  return new Map(readCsv(payees).filter((r) => r.class !== 'person').map((r) => [r.id, r.name]))
}

export function buildProcurementLists(config: { dir: URL; datasets: Dataset[]; register: Register; payees: URL; projects: URL }): ListSpec[] {
  const years = ['2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026']
  const data = readProcurement(config.dir, years)
  const links = { payees: sebraPayees(config.payees), eu: euByEik(config.projects) }
  return [contractsList(data), categoriesList(data), ...supplierLists(data, links), ...buyerLists(data, config.datasets, config.register), tedList(data)]
}
