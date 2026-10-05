// EU funds as lists (format: ListFile in src/lib/types.ts), from the extracts in data/sources/eu-funds/
// (made by scripts/extract/eu_funds.py, see the folder's README):
//   eu-programmes    the cohesion-policy programmes of 2014–2020 and 2021–2027: budget, received from the EC,
//                    paid (to date and by year), from the Ministry of Finance's monthly tables; with each
//                    programme's projects in ИСУН
//   rrp-investments  the Recovery and Resilience Plan by investment: budget and paid (to date and by year)
//   eu-projects      every project of the EU programmes in ИСУН (cohesion policy, the Recovery Plan,
//                    fisheries, home affairs, rural development): beneficiary, place, value and paid to date
// None of it becomes tree nodes: EU-funded spending is already in the actuals ("Spent by: EU funds").
// Municipalities link to their projects, the actuals' EU-funds slices to the programmes.

import type { Dataset, ListCell, ListColumn, ListLinkSpec, LocalizedText } from '../src/lib/types.ts'
import { BENEFICIARY_CLASSES, beneficiaryClass, UNNAMED, type BeneficiaryClass } from './lib/beneficiaries.ts'
import { readCsv } from './lib/csv.ts'
import { nodeLabels, type ListGroup, type ListSpec } from './lib/lists.ts'
import { keyCore, nameKey } from './lib/sebra.ts'
import type { Register } from './lib/places.ts'

const t = (bg: string, en: string): LocalizedText => ({ bg, en })

export const EU_FUNDS: ListGroup = {
  id: 'eu',
  title: t('Европейски средства', 'EU funds'),
  description: t(
    'Европейските програми в България и Планът за възстановяване и устойчивост — колко пари имат, колко са изплатили и за кои проекти, — и земеделските субсидии по мерки, общини и получатели. Това не са отделни парчета от кръговата диаграма: изразходваните европейски средства вече са в „Разходи“ (в отчетите — „Кой харчи: европейски средства“).',
    'The EU programmes in Bulgaria and the Recovery and Resilience Plan — how much money they have, how much they have paid and for which projects — and farm subsidies by measure, municipality and recipient. They are not slices of the donut: EU-funded spending is already in “Spending” (in the actuals, “Spent by: EU funds”).',
  ),
}

// ---------- shared pieces ----------

const MOF_1420 = {
  name: t(
    'Министерство на финансите — финансово изпълнение на ЕФРР, КФ, ЕСФ и ФЕПНЛ за програмен период 2014–2020, месечно (data.egov.bg, набор 4226)',
    'Ministry of Finance — financial execution of the ERDF, CF, ESF and FEAD for 2014–2020, monthly (data.egov.bg dataset 4226)',
  ),
  url: 'https://data.egov.bg/data/view/e87ba264-f445-4759-a248-8b16d67a7108',
}
const MOF_2127 = {
  name: t(
    'Министерство на финансите — обобщена финансова информация за ЕФРР, ЕСФ+, КФ и ФСП 2021–2027, месечно (data.egov.bg, набор 18860)',
    'Ministry of Finance — financial information on the ERDF, ESF+, CF and JTF for 2021–2027, monthly (data.egov.bg dataset 18860)',
  ),
  url: 'https://data.egov.bg/data/view/1c02f8f3-3293-40b1-9317-a4bee7af59c8',
}
const MOF_RRP = {
  name: t(
    'Министерство на финансите — финансово изпълнение на Плана за възстановяване и устойчивост, месечно (data.egov.bg, набор 18958)',
    'Ministry of Finance — financial execution of the Recovery and Resilience Plan, monthly (data.egov.bg dataset 18958)',
  ),
  url: 'https://data.egov.bg/data/view/045c6ffa-6cbd-4416-a299-dad41120681e',
}
const ISUN = {
  name: t(
    'ИСУН 2020 — публичен модул, отворени данни за проектите по програми (2020.eufunds.bg)',
    'UMIS 2020 (ИСУН, the EU-funds management information system) — public module, open data on projects by programme (2020.eufunds.bg)',
  ),
  url: 'https://2020.eufunds.bg/bg/0/0/OpenData',
}
const LICENCE_MOF = t(
  'Данните на Министерството на финансите са публикувани на data.egov.bg при условия „Признание“ (CC BY) и са използвани с посочване на източника; ИСУН ги публикува като отворени данни.',
  'The Ministry of Finance publishes its data on data.egov.bg under “Attribution” terms (CC BY); they are used here with the source named. UMIS publishes its data as open data.',
)

/** The "EU funds" slices of the actuals, which link to the programmes and the Plan (a hidden column all rows share). */
const KFP_EU = t('„Кой харчи: европейски средства“ в отчетите', '“Spent by: EU funds” in the actuals')

type Period = '2014-2020' | '2021-2027' | 'rrp'
const PERIODS: Record<Period, LocalizedText> = {
  '2014-2020': t('2014–2020', '2014–2020'),
  '2021-2027': t('2021–2027', '2021–2027'),
  rrp: t('План за възстановяване', 'Recovery Plan'),
}

/** The Ministry of Finance's programmes (keys of programmes.csv), with their ИСУН id. */
const PROGRAMMES: Record<string, { name: LocalizedText; isun: string }> = {
  'transport-14': { name: t('Транспорт и транспортна инфраструктура', 'Transport and Transport Infrastructure'), isun: '2' },
  'environment-14': { name: t('Околна среда', 'Environment'), isun: '6' },
  'science-14': { name: t('Наука и образование за интелигентен растеж', 'Science and Education for Smart Growth'), isun: '7' },
  'regions-14': { name: t('Региони в растеж', 'Regions in Growth'), isun: '3' },
  'hrd-14': { name: t('Развитие на човешките ресурси', 'Human Resources Development'), isun: '4' },
  'innovation-14': { name: t('Иновации и конкурентоспособност', 'Innovation and Competitiveness'), isun: '5' },
  'sme-14': { name: t('Инициатива за малки и средни предприятия', 'SME Initiative'), isun: '8010402' },
  'governance-14': { name: t('Добро управление', 'Good Governance'), isun: '1' },
  'fead-14': { name: t('Храни и/или основно материално подпомагане (ФЕПНЛ)', 'Food and/or Basic Material Assistance (FEAD)'), isun: '8' },
  'transport-21': { name: t('Транспортна свързаност', 'Transport Connectivity'), isun: '8010798' },
  'environment-21': { name: t('Околна среда', 'Environment'), isun: '8010759' },
  'ta-21': { name: t('Техническа помощ', 'Technical Assistance'), isun: '8010777' },
  'competitiveness-21': { name: t('Конкурентоспособност и иновации в предприятията', 'Competitiveness and Innovation in Enterprises'), isun: '8010785' },
  'regions-21': { name: t('Развитие на регионите', 'Development of the Regions'), isun: '8010862' },
  'research-21': { name: t('Научни изследвания, иновации и дигитализация за интелигентна трансформация', 'Research, Innovation and Digitalisation for Smart Transformation'), isun: '8010851' },
  'hrd-21': { name: t('Развитие на човешките ресурси', 'Human Resources Development'), isun: '8010709' },
  'education-21': { name: t('Образование', 'Education'), isun: '8010710' },
  'food-21': { name: t('Храни и основно материално подпомагане', 'Food and Basic Material Support'), isun: '8010711' },
}

/** Programmes in ИСУН that spend EU money, by ИСУН id (the extractor downloads exactly these). */
const ISUN_PROGRAMMES: Record<string, LocalizedText> = {
  '2': t('Транспорт и транспортна инфраструктура 2014–2020', 'Transport and Transport Infrastructure 2014–2020'),
  '6': t('Околна среда 2014–2020', 'Environment 2014–2020'),
  '3': t('Региони в растеж 2014–2020', 'Regions in Growth 2014–2020'),
  '5': t('Иновации и конкурентоспособност 2014–2020', 'Innovation and Competitiveness 2014–2020'),
  '7': t('Наука и образование за интелигентен растеж 2014–2020', 'Science and Education for Smart Growth 2014–2020'),
  '4': t('Развитие на човешките ресурси 2014–2020', 'Human Resources Development 2014–2020'),
  '1': t('Добро управление 2014–2020', 'Good Governance 2014–2020'),
  '8': t('Храни и/или основно материално подпомагане 2014–2020', 'Food and/or Basic Material Assistance 2014–2020'),
  '8010402': t('Инициатива за малки и средни предприятия 2014–2020', 'SME Initiative 2014–2020'),
  '8010406': t('Програма за морско дело и рибарство 2014–2020', 'Maritime and Fisheries Programme 2014–2020'),
  '8010436': t('Фонд „Убежище, миграция и интеграция“ 2014–2020', 'Asylum, Migration and Integration Fund 2014–2020'),
  '8010437': t('Фонд „Вътрешна сигурност“ 2014–2020', 'Internal Security Fund 2014–2020'),
  '8010510': t('Програма за развитие на селските райони 2014–2020 (мерки по чл. 9б, т. 2 от ЗПЗП)', 'Rural Development Programme 2014–2020 (measures under Art. 9b(2) of the Agricultural Producers Support Act)'),
  '8010686': t('Национален план за възстановяване и устойчивост', 'National Recovery and Resilience Plan'),
  '8010709': t('Развитие на човешките ресурси 2021–2027', 'Human Resources Development 2021–2027'),
  '8010710': t('Образование 2021–2027', 'Education 2021–2027'),
  '8010711': t('Храни и основно материално подпомагане 2021–2027', 'Food and Basic Material Support 2021–2027'),
  '8010759': t('Околна среда 2021–2027', 'Environment 2021–2027'),
  '8010777': t('Техническа помощ 2021–2027', 'Technical Assistance 2021–2027'),
  '8010781': t('Резерв за приспособяване към последиците от Брекзит', 'Brexit Adjustment Reserve'),
  '8010785': t('Конкурентоспособност и иновации в предприятията 2021–2027', 'Competitiveness and Innovation in Enterprises 2021–2027'),
  '8010798': t('Транспортна свързаност 2021–2027', 'Transport Connectivity 2021–2027'),
  '8010814': t('Фонд „Убежище, миграция и интеграция“ 2021–2027', 'Asylum, Migration and Integration Fund 2021–2027'),
  '8010828': t('Инструмент за управление на границите и визовата политика 2021–2027', 'Border Management and Visa Instrument 2021–2027'),
  '8010829': t('Фонд „Вътрешна сигурност“ 2021–2027', 'Internal Security Fund 2021–2027'),
  '8010851': t('Научни изследвания, иновации и дигитализация за интелигентна трансформация 2021–2027', 'Research, Innovation and Digitalisation for Smart Transformation 2021–2027'),
  '8010862': t('Развитие на регионите 2021–2027', 'Development of the Regions 2021–2027'),
  '8010879': t('Програма за морско дело, рибарство и аквакултури 2021–2027', 'Maritime, Fisheries and Aquaculture Programme 2021–2027'),
  '8010936': t('Стратегически план за развитие на земеделието и селските райони — водено от общностите местно развитие', 'CAP Strategic Plan — community-led local development (LEADER)'),
}

/** Funds, by the abbreviation the sources use. */
const FUNDS: Record<string, LocalizedText> = {
  ЕФРР: t('ЕФРР', 'ERDF'),
  КФ: t('КФ', 'CF'),
  ЕСФ: t('ЕСФ', 'ESF'),
  'ЕСФ+': t('ЕСФ+', 'ESF+'),
  ИМЗ: t('ИМЗ', 'YEI'),
  ФЕПН: t('ФЕПНЛ', 'FEAD'),
  ФЕПНЛ: t('ФЕПНЛ', 'FEAD'),
  ФСП: t('ФСП', 'JTF'),
  ЕФМДР: t('ЕФМДР', 'EMFF'),
  ЕФМДРА: t('ЕФМДРА', 'EMFAF'),
  ФУМИ: t('ФУМИ', 'AMIF'),
  ФВС: t('ФВС', 'ISF'),
  ИУГВП: t('ИУГВП', 'BMVI'),
  ЕЗФРСР: t('ЕЗФРСР', 'EAFRD'),
  МВУ: t('МВУ', 'RRF'),
  РПБ: t('РПБ', 'BAR'),
}
const FUND_NAMES = t(
  'ЕФРР — Европейски фонд за регионално развитие, КФ — Кохезионен фонд, ЕСФ(+) — Европейски социален фонд (плюс), ИМЗ — Инициатива за младежка заетост, ФЕПНЛ — Фонд за европейско подпомагане на най-нуждаещите се лица, ФСП — Фонд за справедлив преход.',
  'ERDF — European Regional Development Fund, CF — Cohesion Fund, ESF(+) — European Social Fund (Plus), YEI — Youth Employment Initiative, FEAD — Fund for European Aid to the Most Deprived, JTF — Just Transition Fund.',
)

const money = (text: string | undefined) => (text && text.trim() ? Math.round(Number(text)) : null)
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

/** "2026-08-31" → "31.08.2026" / "31 August 2026". */
const dayText = (iso: string) => t(`${iso.slice(8)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`, `${Number(iso.slice(8))} ${MONTHS_EN[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`)

/**
 * Paid in each year from paid-to-date figures at the year ends and the latest month: the first figure is
 * everything paid until then ("to 2016"), the last the year so far ("2026 (I–VIII)").
 */
export function yearlyFromCumulative(points: { asOf: string; paid: number | null }[]): { periods: string[]; values: (number | null)[] } {
  const sorted = [...points].sort((a, b) => a.asOf.localeCompare(b.asOf))
  const periods = sorted.map((p) => p.asOf.slice(0, 4))
  const values = sorted.map((p, i) => {
    if (p.paid === null) return null
    if (i === 0) return p.paid
    const before = sorted[i - 1].paid
    return before === null ? null : p.paid - before
  })
  return { periods, values }
}

/** Labels of yearly periods: the first is "до 2016" / "to 2016", a year in progress "2026 (I–VIII)". */
function yearLabels(periods: string[], latest: string, first = true): Record<string, LocalizedText> {
  const month = Number(latest.slice(5, 7))
  return Object.fromEntries(
    periods.map((p, i) => [
      p,
      i === 0 && first ? t(`до ${p} г.`, `to ${p}`) : p === latest.slice(0, 4) && month < 12 ? t(`${p} (I–${ROMAN[month - 1]})`, `${p} (Jan–${MONTHS_EN[month - 1].slice(0, 3)})`) : t(p, p),
    ]),
  )
}

// ---------- the programmes ----------

interface ProjectRow {
  code: string
  programme: string
  fund: string
  name: string
  beneficiary: string
  beneficiaryName: string
  kind: 'legal' | 'person' | 'sole-trader'
  start: string
  status: string
  value: number | null
  paid: number | null
  ebk: string
  place: string
}

function readProjects(dir: URL): ProjectRow[] {
  return readCsv(new URL('projects.csv.gz', dir)).map((r) => ({
    code: r.code,
    programme: r.programme,
    fund: r.fund,
    name: r.name,
    beneficiary: r.beneficiary,
    beneficiaryName: r.beneficiary_name,
    kind: r.beneficiary_kind as ProjectRow['kind'],
    start: r.start,
    status: r.status,
    value: money(r.value_EUR),
    paid: money(r.paid_EUR),
    ebk: r.ebk_code,
    place: r.place,
  }))
}

function programmesList(dir: URL, projects: ProjectRow[]): ListSpec {
  const rows = readCsv(new URL('programmes.csv', dir))
  const paid = readCsv(new URL('programmes-paid.csv', dir))
  const asOf = rows[0].as_of
  if (rows.some((r) => r.as_of !== asOf)) throw new Error('eu-programmes: the two periods are not of the same month')
  const keys = [...new Set(rows.map((r) => r.programme))]
  for (const key of keys) if (!PROGRAMMES[key]) throw new Error(`eu-programmes: no name for ${key}`)
  const byIsun = new Map<string, { n: number; value: number; paid: number }>()
  for (const p of projects) {
    const a = byIsun.get(p.programme) ?? { n: 0, value: 0, paid: 0 }
    a.n++
    a.value += p.value ?? 0
    a.paid += p.paid ?? 0
    byIsun.set(p.programme, a)
  }
  // Paid to date at each year end (and the latest month), summed over the programme's funds.
  const series = (period: string) => {
    const points = [...new Set(paid.filter((r) => r.period === period).map((r) => r.as_of))].sort()
    return { points, periods: points.map((p) => p.slice(0, 4)) }
  }
  const s1420 = series('2014-2020')
  const s2127 = series('2021-2027')
  const yearly = (key: string, points: string[]) =>
    yearlyFromCumulative(
      points.map((asOf) => {
        const parts = paid.filter((r) => r.programme === key && r.as_of === asOf)
        return { asOf, paid: parts.length ? parts.reduce((s, r) => s + Number(r.paid_total_EUR), 0) : null }
      }),
    ).values.map((v) => (v === null ? null : Math.round(v)))
  const fundIds = [...new Set(rows.map((r) => r.fund.replace(' ', '')))]
  for (const f of fundIds) if (!FUNDS[f]) throw new Error(`eu-programmes: no name for fund ${f}`)
  const date = dayText(asOf)

  const out: ListCell[][] = keys.map((key) => {
    const parts = rows.filter((r) => r.programme === key)
    const sum = (col: string) => Math.round(parts.reduce((s, r) => s + Number(r[col] || 0), 0))
    const period = parts[0].period as Period
    const isun = PROGRAMMES[key].isun
    const projectsOf = byIsun.get(isun)
    const budget = sum('budget_total_EUR')
    const funds = parts.map((r) => r.fund.replace(' ', ''))
    return [
      key,
      PROGRAMMES[key].name,
      period,
      t(funds.map((f) => FUNDS[f].bg).join(', '), funds.map((f) => FUNDS[f].en).join(', ')),
      budget,
      sum('paid_total_EUR'),
      budget ? sum('paid_total_EUR') / budget : null,
      sum('budget_eu_EUR'),
      sum('budget_national_EUR'),
      sum('paid_eu_EUR'),
      sum('paid_national_EUR'),
      sum('received_total_EUR'),
      sum('declared_EUR'),
      parts.some((r) => r.certified_EUR) ? sum('certified_EUR') : null,
      period === '2014-2020' ? yearly(key, s1420.points) : null,
      period === '2021-2027' ? yearly(key, s2127.points) : null,
      funds.length > 1 ? parts.map((r) => [r.fund.replace(' ', ''), Math.round(Number(r.budget_total_EUR)), Math.round(Number(r.paid_total_EUR))]) : null,
      projectsOf?.n ?? null,
      projectsOf ? Math.round(projectsOf.value) : null,
      projectsOf ? Math.round(projectsOf.paid) : null,
      projectsOf ? isun : null,
      'eu',
    ]
  })
  const totalBudget = out.reduce((s, r) => s + (r[4] as number), 0)
  const totalPaid = out.reduce((s, r) => s + (r[5] as number), 0)
  const bn = (v: number, lang: 'bg' | 'en') => new Intl.NumberFormat(lang === 'bg' ? 'bg-BG' : 'en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v / 1e9)
  const columns: ListColumn[] = [
    { id: 'id', type: 'code', label: t('Програма', 'Programme'), hidden: true },
    { id: 'name', type: 'text', label: t('Програма', 'Programme'), search: true },
    { id: 'period', type: 'category', label: t('Период', 'Period'), filter: true, labels: { '2014-2020': PERIODS['2014-2020'], '2021-2027': PERIODS['2021-2027'] } },
    { id: 'funds', type: 'text', label: t('Фондове', 'Funds'), detail: true },
    { id: 'budget', type: 'money', label: t('Бюджет', 'Budget'), total: true, source: t('Министерство на финансите: бюджет на програмата — ЕС и национално съфинансиране', 'Ministry of Finance: the programme’s budget — EU and national co-financing') },
    { id: 'paid', type: 'money', label: t(`Изплатено към ${date.bg}`, `Paid to ${date.en}`), total: true, source: t('Министерство на финансите: общо платено (ЕС и национално съфинансиране), натрупано', 'Ministry of Finance: total paid (EU and national co-financing), cumulative') },
    { id: 'share', type: 'percent', label: t('Изплатено от бюджета', 'Share of budget paid') },
    { id: 'budgetEu', type: 'money', label: t('Бюджет: ЕС', 'Budget: EU'), total: true, detail: true },
    { id: 'budgetNational', type: 'money', label: t('Бюджет: национално съфинансиране', 'Budget: national co-financing'), total: true, detail: true },
    { id: 'paidEu', type: 'money', label: t('Изплатено: ЕС', 'Paid: EU'), total: true, detail: true },
    { id: 'paidNational', type: 'money', label: t('Изплатено: национално съфинансиране', 'Paid: national co-financing'), total: true, detail: true },
    { id: 'received', type: 'money', label: t('Получено от Европейската комисия', 'Received from the European Commission'), total: true, detail: true, source: t('Министерство на финансите: предварително финансиране и плащания по заявления', 'Ministry of Finance: pre-financing and payments on claims') },
    { id: 'declared', type: 'money', label: t('Разходи, декларирани пред Комисията', 'Expenditure declared to the Commission'), total: true, detail: true },
    { id: 'certified', type: 'money', label: t('Разходи, сертифицирани с годишните отчети', 'Expenditure certified in the annual accounts'), total: true, detail: true },
    {
      id: 'byYear1420',
      type: 'series',
      label: t('Изплатено по години', 'Paid by year'),
      periods: s1420.periods,
      periodLabels: yearLabels(s1420.periods, asOf),
      detail: true,
      total: true,
    },
    {
      id: 'byYear2127',
      type: 'series',
      label: t('Изплатено по години', 'Paid by year'),
      periods: s2127.periods,
      periodLabels: yearLabels(s2127.periods, asOf),
      detail: true,
      total: true,
    },
    {
      id: 'byFund',
      type: 'breakdown',
      label: t('По фондове: бюджет и изплатено', 'By fund: budget and paid'),
      detail: true,
      total: false,
      periods: ['budget', 'paid'],
      periodLabels: { budget: t('Бюджет', 'Budget'), paid: t('Изплатено', 'Paid') },
      labels: Object.fromEntries(fundIds.map((f) => [f, FUNDS[f]])),
    },
    { id: 'projects', type: 'number', label: t('Проекти в ИСУН', 'Projects in UMIS'), detail: true, total: true, source: ISUN.name },
    { id: 'projectsValue', type: 'money', label: t('Обща стойност на проектите в ИСУН', 'Total value of the projects in UMIS'), detail: true, total: true, source: ISUN.name },
    { id: 'projectsPaid', type: 'money', label: t('Изплатено по проектите според ИСУН', 'Paid to the projects according to UMIS'), detail: true, total: true, source: ISUN.name },
    { id: 'isun', type: 'code', label: t('Програма в ИСУН', 'Programme in UMIS'), hidden: true },
    { id: 'kfp', type: 'category', label: t('Отворено от', 'Opened from'), hidden: true, labels: { eu: KFP_EU } },
  ]
  return {
    id: 'eu-programmes',
    group: EU_FUNDS.id,
    title: t('Европейски програми: бюджет и изплатено', 'EU programmes: budget and payments'),
    short: t('Програми', 'Programmes'),
    description: t(
      `Програмите на кохезионната политика на ЕС в България за 2014–2020 и 2021–2027 г. — общо ${bn(totalBudget, 'bg')} млрд. € (европейски средства и национално съфинансиране), от които до ${date.bg} г. са изплатени ${bn(totalPaid, 'bg')} млрд. €. За всяка програма: бюджетът, полученото от Европейската комисия, изплатеното досега и по години, и проектите ѝ в ИСУН.`,
      `The EU cohesion-policy programmes in Bulgaria for 2014–2020 and 2021–2027 — €${bn(totalBudget, 'en')} bn in all (EU money and national co-financing), of which €${bn(totalPaid, 'en')} bn had been paid by ${date.en}. For each programme: its budget, what the European Commission has paid in, what has been paid out so far and by year, and its projects in UMIS.`,
    ),
    sources: [MOF_1420, MOF_2127, ISUN],
    caveats: [
      t(
        `Сумите са натрупани от началото на програмата до ${date.bg} г.: „Изплатено“ са плащанията към бенефициентите (европейската част и националното съфинансиране), „Получено от Европейската комисия“ — авансите и плащанията по заявления. „Изплатено по години“ е разликата между натрупаните суми в края на всяка година (първата стойност е всичко до края на първата година в данните — 2016 г. за 2014–2020 и 2023 г. за 2021–2027, когато са започнали плащанията; последната — от началото на ${asOf.slice(0, 4)} г. до ${date.bg} г.).`,
        `Amounts are cumulative from the start of the programme to ${date.en}: “Paid” are the payments to beneficiaries (the EU part and national co-financing), “Received from the European Commission” the pre-financing and payments on claims. “Paid by year” is the difference between the cumulative amounts at the end of each year (the first value is everything to the end of the first year in the data — 2016 for 2014–2020 and 2023 for 2021–2027, when payments started; the last, from the start of ${asOf.slice(0, 4)} to ${date.en}).`,
      ),
      t(
        'Таблиците на Министерството на финансите са само за програмите на ЕФРР, КФ, ЕСФ(+), ФЕПНЛ и ИМЗ. Фондът за справедлив преход няма отделен ред: всичките 485 проекта по него в ИСУН са на „Развитие на регионите“, която е един ред с фонд ЕФРР, но бюджетът ѝ (3,32 млрд. € със съфинансирането) е колкото стойността на проектите ѝ по двата фонда в ИСУН (1,54 + 1,72 млрд. €), т.е. редът изглежда включва и фонда. По ИСУН (към 05.10.2026 г.) по програмата са изплатени 736 млн. € (392 млн. по ЕФРР и 344 млн. по фонда) — с една трета повече от таблицата към 31.08.2026 г. (540 млн. €): 180 млн. € от разликата са по споразумението с Фонда на фондовете за финансови инструменти по фонда, започнало на 10.09.2026 г. Програмите за морско дело и рибарство, за вътрешни работи и миграция и за развитие на селските райони, както и Планът за възстановяване, не са тук; проектите на повечето от тях са в „Проекти“, а Планът — в „План за възстановяване“.',
        'The Ministry of Finance’s tables cover only the programmes of the ERDF, CF, ESF(+), FEAD and YEI. The Just Transition Fund has no row of its own: all 485 of its projects in UMIS belong to Development of the Regions, which is one row labelled ERDF, but whose budget (€3.32 bn with co-financing) about equals the value of its projects under both funds in UMIS (€1.54 + 1.72 bn), so the row seems to include the fund. UMIS shows €736 m paid to the programme at 5 Oct 2026 (€392 m ERDF, €344 m from the fund) — a third more than the table at 31 Aug 2026 (€540 m): €180 m of the difference went to the Fund of Funds under the fund’s financial-instruments agreement, which started on 10 Sep 2026. The maritime and fisheries, home-affairs and migration and rural development programmes, and the Recovery Plan, are not here; the projects of most of them are under “Projects”, and the Plan under “Recovery Plan”.',
      ),
      t(
        '„Проекти в ИСУН“ са проектите на програмата в ИСУН към 05.10.2026 г. Тяхната обща стойност не е договореният бюджет на програмата: в нея са и собственото участие на бенефициентите, прекратените проекти и, при проектите, продължени от предишен период, и частта, платена от него. За 2014–2020 г. изплатеното по проектите съвпада с изплатеното по програмата в рамките на 0,5%; за 2021–2027 г. ИСУН показва с 0–8% повече от таблицата, която е с месец по-стара, освен при „Развитие на регионите“ (виж по-горе).',
        '“Projects in UMIS” are the programme’s projects in UMIS on 5 Oct 2026. Their total value is not the programme’s contracted budget: it also holds beneficiaries’ own contributions, terminated projects and, for projects carried over from an earlier period, the part that period paid for. For 2014–2020, what UMIS shows as paid to the projects matches the programme’s payments to within 0.5%; for 2021–2027 UMIS shows 0–8% more than the table, which is a month older, except for Development of the Regions (see above).',
      ),
      t(
        'data.egov.bg заменя някои десетцифрени суми със „**********“ (приема ги за ЕГН); те са възстановени от другите колони на същия ред или от реда „Общо“.',
        'data.egov.bg replaces some ten-digit amounts with “**********” (it takes them for personal identity numbers); they are rebuilt from the other columns of the same row or from the total row.',
      ),
      t(FUND_NAMES.bg, FUND_NAMES.en),
      LICENCE_MOF,
    ],
    asOf,
    retrieved: '2026-10-05',
    unit: { one: t('програма', 'programme'), other: t('програми', 'programmes') },
    summary: ['budget', 'paid'],
    sort: '-budget',
    columns,
    key: 'id',
    titleColumn: 'name',
    rowLink: { list: 'eu-projects', filter: 'programme', column: 'isun' },
    rows: out,
  }
}

// ---------- the Recovery and Resilience Plan ----------

/** Components of the Plan (the number after "К" in an investment's code). */
const COMPONENTS: Record<string, LocalizedText> = {
  '1': t('1. Образование и умения', '1. Education and skills'),
  '2': t('2. Научни изследвания и иновации', '2. Research and innovation'),
  '3': t('3. Интелигентна индустрия', '3. Smart industry'),
  '4': t('4. Нисковъглеродна икономика', '4. Low-carbon economy'),
  '5': t('5. Биоразнообразие', '5. Biodiversity'),
  '6': t('6. Устойчиво селско стопанство', '6. Sustainable agriculture'),
  '7': t('7. Цифрова свързаност', '7. Digital connectivity'),
  '8': t('8. Транспортна свързаност', '8. Transport connectivity'),
  '9': t('9. Местно развитие', '9. Local development'),
  '10': t('10. Бизнес среда', '10. Business environment'),
  '11': t('11. Социално включване', '11. Social inclusion'),
  '12': t('12. Здравеопазване', '12. Health'),
  '13': t('13. REPowerEU', '13. REPowerEU'),
}

function rrpList(dir: URL): ListSpec {
  const rows = readCsv(new URL('rrp-investments.csv', dir))
  const paid = readCsv(new URL('rrp-paid.csv', dir))
  const totals = readCsv(new URL('rrp-totals.csv', dir))
  const asOf = rows[0].as_of
  const latest = totals.find((r) => r.as_of === asOf)!
  const points = [...new Set(paid.map((r) => r.as_of))].sort()
  const periods = points.map((p) => p.slice(0, 4))
  const date = dayText(asOf)
  const out: ListCell[][] = rows.map((r, i) => {
    const component = /^К(\d+)\./.exec(r.code)?.[1]
    if (!component || !COMPONENTS[component]) throw new Error(`rrp-investments: no component in ${r.code}`)
    const mine = paid.filter((p) => p.code === r.code && p.body === r.body)
    // The same code and body can appear twice (К4.И1: residential and non-residential buildings); rrp-paid.csv keeps their order.
    const nth = rows.slice(0, i).filter((o) => o.code === r.code && o.body === r.body).length
    const own = points.map((asOfPoint) => {
      const at = mine.filter((p) => p.as_of === asOfPoint)[nth]
      return { asOf: asOfPoint, paid: at && at.paid_total_EUR !== '' ? Number(at.paid_total_EUR) : null }
    })
    const budget = Math.round(Number(r.budget_total_EUR))
    const paidTotal = Math.round(Number(r.paid_total_EUR))
    return [
      `${r.code}-${i}`,
      r.code,
      r.name,
      component,
      r.body,
      budget,
      paidTotal,
      budget ? paidTotal / budget : null,
      Math.round(Number(r.budget_eu_EUR)),
      Math.round(Number(r.budget_national_EUR)),
      Math.round(Number(r.paid_eu_EUR)),
      Math.round(Number(r.paid_national_EUR)),
      yearlyFromCumulative(own).values.map((v) => (v === null ? null : Math.round(v))),
      'eu',
    ]
  })
  const bn = (v: number, lang: 'bg' | 'en') => new Intl.NumberFormat(lang === 'bg' ? 'bg-BG' : 'en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v / 1e9)
  const history = totals
    .filter((r) => r.as_of.endsWith('-12-31') || r.as_of === asOf)
    .map((r) => ({ asOf: r.as_of, budget: Number(r.budget_total_EUR), paid: Number(r.paid_total_EUR) }))
  const july = totals.find((r) => r.as_of === '2026-07-31')
  return {
    id: 'rrp-investments',
    group: EU_FUNDS.id,
    title: t('План за възстановяване и устойчивост: инвестиции', 'Recovery and Resilience Plan: investments'),
    short: t('План за възстановяване', 'Recovery Plan'),
    description: t(
      `Инвестициите по Националния план за възстановяване и устойчивост към ${date.bg} г.: бюджет ${bn(Number(latest.budget_total_EUR), 'bg')} млрд. € (${bn(Number(latest.budget_eu_EUR), 'bg')} млрд. € от Механизма за възстановяване и устойчивост на ЕС и ${bn(Number(latest.budget_national_EUR), 'bg')} млрд. € национално съфинансиране), изплатени ${bn(Number(latest.paid_total_EUR), 'bg')} млрд. €. От Европейската комисия са получени ${bn(Number(latest.received_from_ec_EUR), 'bg')} млрд. €.`,
      `The investments of the National Recovery and Resilience Plan at ${date.en}: a budget of €${bn(Number(latest.budget_total_EUR), 'en')} bn (€${bn(Number(latest.budget_eu_EUR), 'en')} bn from the EU Recovery and Resilience Facility and €${bn(Number(latest.budget_national_EUR), 'en')} bn of national co-financing), of which €${bn(Number(latest.paid_total_EUR), 'en')} bn has been paid. €${bn(Number(latest.received_from_ec_EUR), 'en')} bn has been received from the European Commission.`,
    ),
    sources: [MOF_RRP, ISUN],
    caveats: [
      t(
        `Бюджетът е този към ${date.bg} г. — Планът се изменя и бюджетът се променя (общо: ${history.map((h) => `${dayText(h.asOf).bg} — ${bn(h.budget, 'bg')} млрд. €`).join('; ')}). „Изплатено“ е натрупано от началото на Плана; „Изплатено по години“ е разликата между натрупаните суми в края на всяка година (първата стойност е всичко до края на 2024 г.; последната — от началото на 2026 г. до ${date.bg} г.). Където инвестицията е нова или е преименувана, по-ранните години са празни.`,
        `The budget is the one at ${date.en} — the Plan is amended and its budget changes (in all: ${history.map((h) => `${dayText(h.asOf).en} — €${bn(h.budget, 'en')} bn`).join('; ')}). “Paid” is cumulative from the start of the Plan; “Paid by year” is the difference between the cumulative amounts at the end of each year (the first value is everything to the end of 2024; the last, from the start of 2026 to ${date.en}). Where an investment is new or was renamed, the earlier years are empty.`,
      ),
      ...(july
        ? [
            t(
              `Само през август 2026 г. са изплатени ${bn(Number(latest.paid_total_EUR) - Number(july.paid_total_EUR), 'bg')} млрд. € (към 31.07.2026 г.: ${bn(Number(july.paid_total_EUR), 'bg')} млрд. € при бюджет ${bn(Number(july.budget_total_EUR), 'bg')} млрд. €) — крайният срок за изпълнение на Плана е 31 август 2026 г.`,
              `August 2026 alone saw €${bn(Number(latest.paid_total_EUR) - Number(july.paid_total_EUR), 'en')} bn paid (at 31 Jul 2026: €${bn(Number(july.paid_total_EUR), 'en')} bn of a €${bn(Number(july.budget_total_EUR), 'en')} bn budget) — the Plan’s deadline for completion was 31 August 2026.`,
            ),
          ]
        : []),
      t(
        'Отговорното ведомство е както е изписано в таблицата („СНД“ — структура за наблюдение и докладване, „КП“ — крайни получатели). Имената на инвестициите са както са публикувани.',
        'The responsible body is as written in the table (“СНД” — the monitoring and reporting structure, “КП” — final recipients). Investment names are as published.',
      ),
      t(
        'Проектите по Плана (с крайните получатели) са в „Проекти“, програма „Национален план за възстановяване и устойчивост“.',
        'The Plan’s projects (with their final recipients) are under “Projects”, programme “National Recovery and Resilience Plan”.',
      ),
      LICENCE_MOF,
    ],
    asOf,
    retrieved: '2026-10-05',
    unit: { one: t('инвестиция', 'investment'), other: t('инвестиции', 'investments') },
    summary: ['budget', 'paid'],
    sort: '-budget',
    columns: [
      { id: 'id', type: 'code', label: t('Ред', 'Row'), hidden: true },
      { id: 'code', type: 'code', label: t('Код', 'Code'), search: true },
      { id: 'name', type: 'text', label: t('Инвестиция', 'Investment'), search: true },
      { id: 'component', type: 'category', label: t('Компонент', 'Component'), filter: true, labels: COMPONENTS },
      { id: 'body', type: 'text', label: t('Отговорно ведомство', 'Responsible body'), search: true, detail: true },
      { id: 'budget', type: 'money', label: t('Бюджет', 'Budget'), total: true, source: MOF_RRP.name },
      { id: 'paid', type: 'money', label: t(`Изплатено към ${date.bg}`, `Paid to ${date.en}`), total: true, source: MOF_RRP.name },
      { id: 'share', type: 'percent', label: t('Изплатено от бюджета', 'Share of budget paid') },
      { id: 'budgetEu', type: 'money', label: t('Бюджет: ЕС', 'Budget: EU'), total: true, detail: true },
      { id: 'budgetNational', type: 'money', label: t('Бюджет: национално съфинансиране', 'Budget: national co-financing'), total: true, detail: true },
      { id: 'paidEu', type: 'money', label: t('Изплатено: ЕС', 'Paid: EU'), total: true, detail: true },
      { id: 'paidNational', type: 'money', label: t('Изплатено: национално съфинансиране', 'Paid: national co-financing'), total: true, detail: true },
      { id: 'byYear', type: 'series', label: t('Изплатено по години', 'Paid by year'), periods, periodLabels: yearLabels(periods, asOf), detail: true, total: true },
      { id: 'kfp', type: 'category', label: t('Отворено от', 'Opened from'), hidden: true, labels: { eu: KFP_EU } },
    ],
    key: 'id',
    titleColumn: 'name',
    rows: out,
  }
}

// ---------- the projects ----------

/** ИСУН's project statuses, with short ids (they are in every row). */
const STATUSES: Record<string, { id: string; name: LocalizedText }> = {
  'В изпълнение (от дата на стартиране)': { id: 'ru', name: t('В изпълнение', 'Running') },
  'В изпълнение (под наблюдение)': { id: 'mo', name: t('В изпълнение, под наблюдение', 'Running, monitored') },
  'В изпълнение (временно спрян)': { id: 'su', name: t('Временно спрян', 'Suspended') },
  Сключен: { id: 'si', name: t('Сключен договор', 'Contract signed') },
  'Приключен (към датата на приключване)': { id: 'co', name: t('Приключен', 'Completed') },
  'Прекратен (към дата на прекратяване)': { id: 'te', name: t('Прекратен', 'Terminated') },
  Прекратен: { id: 'te', name: t('Прекратен', 'Terminated') },
}

/** Project names longer than this are cut (with "…") to keep the list small; the full name is in the extract and in ИСУН. */
const NAME_LENGTH = 160
const shortName = (name: string) => (!name ? null : name.length <= NAME_LENGTH ? name : `${name.slice(0, NAME_LENGTH - 1).trimEnd()}…`)

const RRP = '8010686'
/** The bodies that run the Recovery Plan's schemes: ministries, state agencies, the Development Bank, the Culture Fund, the Academy. */
const IMPLEMENTER = /^(МИНИСТЕРСТВО|МИНИСТЕРСКИ СЪВЕТ|ИЗПЪЛНИТЕЛНА АГЕНЦИЯ|ДЪРЖАВНА АГЕНЦИЯ|АГЕНЦИЯ|НАЦИОНАЛЕН ФОНД|БЪЛГАРСКАТА БАНКА ЗА РАЗВИТИЕ|БЪЛГАРСКА БАНКА ЗА РАЗВИТИЕ|БЪЛГАРСКА АКАДЕМИЯ НА НАУКИТЕ)( |$)/
/** A name that starts with an investment of the Plan: "C3.I2 …", "С12.I1 …". */
const INVESTMENT = /^\s*["„“]?\s*[CС]\s*\d+\s*\.?\s*[IИ]\s*\d+/

/**
 * An umbrella agreement of the Recovery Plan: the agreement under which a ministry or agency runs a scheme and
 * contracts the final recipients, whose projects are listed too. ИСУН does not mark them; they are recognised as
 * agreements of an implementing body that have paid nothing (1% of their value at most) and are worth €30 m or
 * more or are named after an investment.
 */
export function umbrellaAgreement(p: { programme: string; name: string; value: number | null; paid: number | null }, beneficiary: string): boolean {
  const value = p.value ?? 0
  if (p.programme !== RRP || value < 1_000_000 || (p.paid ?? 0) > 0.01 * value) return false
  return IMPLEMENTER.test(keyCore(nameKey(beneficiary))) && (value >= 30_000_000 || INVESTMENT.test(p.name))
}

function projectsList(dir: URL, projects: ProjectRow[], datasets: Dataset[], register: Register): ListSpec {
  const programmes = readCsv(new URL('isun-programmes.csv', dir))
  const generated = programmes.map((p) => p.generated).sort().at(-1)!
  const classes = new Map<string, BeneficiaryClass>()
  const classOf = (name: string) => {
    let c = classes.get(name)
    if (!c) classes.set(name, (c = beneficiaryClass(name)))
    return c
  }
  const target = datasets.find((d) => d.id === 'municipalities-2026')
  if (!target) throw new Error('eu-projects: no municipalities-2026 dataset')
  const byCode = new Map(register.all.map((m) => [m.code, m]))
  const unnamed = { person: UNNAMED.pe, 'sole-trader': UNNAMED.st }
  const unnamedProject = {
    person: t('Проект на физическо лице', 'Project of a natural person'),
    'sole-trader': t('Проект на едноличен търговец', 'Project of a sole trader'),
  }
  const rows: ListCell[][] = projects.map((p) => {
    if (!ISUN_PROGRAMMES[p.programme]) throw new Error(`eu-projects: no name for programme ${p.programme}`)
    const status = STATUSES[p.status]
    if (p.status && !status) throw new Error(`eu-projects: unknown status ${p.status}`)
    const place = p.ebk ? byCode.get(p.ebk) : undefined
    if (p.ebk && !place) throw new Error(`eu-projects: unknown municipality ${p.ebk}`)
    const kind = p.kind
    const legal = kind === 'legal'
    const beneficiary = legal ? p.beneficiaryName || p.beneficiary : ''
    return [
      p.code,
      legal ? shortName(p.name) : unnamedProject[kind],
      legal ? beneficiary : unnamed[kind],
      !legal ? (kind === 'person' ? 'pe' : 'st') : umbrellaAgreement(p, beneficiary) ? 'um' : classOf(beneficiary),
      legal ? p.beneficiary : null,
      p.programme,
      place?.key ?? null,
      place ? null : p.place || null,
      status?.id ?? null,
      p.value,
      p.paid,
    ]
  })
  const count = (n: number, lang: 'bg' | 'en') => new Intl.NumberFormat(lang === 'bg' ? 'bg-BG' : 'en-GB').format(n)
  const MUNICIPALITY = 6
  const placed = rows.filter((r) => r[MUNICIPALITY]).length
  const umbrellas = rows.filter((r) => r[3] === 'um')
  const umbrellaValue = umbrellas.reduce((sum, r) => sum + ((r[9] as number | null) ?? 0), 0)
  const bn = (v: number, lang: 'bg' | 'en') => new Intl.NumberFormat(lang === 'bg' ? 'bg-BG' : 'en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v / 1e9)
  const date = dayText(generated)
  const links: ListLinkSpec[] = [
    {
      family: 'municipalities',
      column: 'municipality',
      years: [...new Set(datasets.filter((d) => d.family === 'municipalities').map((d) => d.year))].sort(),
      value: 'paid',
      label: t('изплатени досега', 'paid to date'),
      text: t('Проекти с европейски средства в общината: {count}, изплатени {total} досега', 'EU-funded projects in the municipality: {count}, {total} paid to date'),
    },
  ]
  return {
    id: 'eu-projects',
    group: EU_FUNDS.id,
    title: t('Проекти с европейски средства', 'EU-funded projects'),
    short: t('Проекти', 'Projects'),
    description: t(
      `Всички ${count(rows.length, 'bg')} проекта на програмите с европейски средства в ИСУН — кохезионната политика 2014–2020 и 2021–2027, Планът за възстановяване и устойчивост, рибарството, вътрешните работи и миграцията, мерките за селските райони: бенефициент, място, обща стойност и изплатено досега. Изберете програма или потърсете бенефициент, проект или място.`,
      `All ${count(rows.length, 'en')} projects of the EU-funded programmes in UMIS — cohesion policy 2014–2020 and 2021–2027, the Recovery and Resilience Plan, fisheries, home affairs and migration, and rural development measures: beneficiary, place, total value and paid to date. Choose a programme or search for a beneficiary, a project or a place.`,
    ),
    sources: [ISUN],
    caveats: [
      t(
        `„Обща стойност“ е стойността на проекта по договора (безвъзмездната помощ — европейска и национална — и, където има, собственото участие на бенефициента), а „Изплатено“ — реално изплатеното на бенефициента от началото на проекта до ${date.bg} г. (натрупано, европейски и национални средства заедно). ИСУН не дава поотделно европейската част на всеки проект; делът на ЕС в бюджета на всяка програма е в „Програми“.`,
        `“Total value” is the project’s value under its contract (the grant — EU and national — and, where there is one, the beneficiary’s own contribution), and “Paid” what has actually been paid to the beneficiary from the start of the project to ${date.en} (cumulative, EU and national money together). UMIS does not give the EU part of each project; the EU share of each programme’s budget is under “Programmes”.`,
      ),
      t(
        `Общината е мястото на изпълнение на проекта (${count(placed, 'bg')} проекта с една община). Проектите в няколко общини, в цял регион или в цялата страна нямат община; мястото им е в подробностите.`,
        `The municipality is where the project is carried out (${count(placed, 'en')} projects in one municipality). Projects in several municipalities, a whole region or the whole country have none; their place is in the details.`,
      ),
      t(
        'Физическите лица и едноличните търговци (чието име съдържа името на собственика) не се показват по име, а и името на проекта им — то често ги назовава; за тях са дадени само програмата, общината и сумите. Юридическите лица са разпознати по ЕИК (9 или 13 цифри), а видът им (фирма, кооперация, сдружение, публичен сектор) — по името; бенефициент, чието име е на човек (регистриран земеделски производител и др.), е приет за физическо лице и когато има номер. Имената на проекти, по-дълги от 160 знака, са съкратени (…).',
        'Natural persons and sole traders (whose firm name contains the owner’s name) are not shown by name, nor is their project’s name — it often names them; only the programme, the municipality and the amounts are given. Legal entities are recognised by their ЕИК (9 or 13 digits), and their type (company, cooperative, association, public sector) by their name; a beneficiary whose name is a person’s (a registered farmer and the like) is taken as a natural person even when it has a number. Project names longer than 160 characters are cut short (…).',
      ),
      t(
        `За Плана за възстановяване ИСУН съдържа и рамковите споразумения, с които министерства и агенции изпълняват схеми, и проектите на крайните получатели по тях. ${count(umbrellas.length, 'bg')} споразумения на изпълняващ орган, по които не е платено нищо (до 1% от стойността) и които са поне 30 млн. € или носят името на инвестиция („C3.I2 …“), са приети за рамкови (${bn(umbrellaValue, 'bg')} млрд. €) и са скрити, докато не ги изберете във „Вид бенефициент“, за да не се броят два пъти. Стойността на проектите по Плана пак надвишава бюджета му: в нея е и собственото участие на получателите (напр. при съоръженията за съхранение на енергия). Сборовете на Плана са в „План за възстановяване“.`,
        `For the Recovery Plan, UMIS holds both the umbrella agreements under which ministries and agencies run schemes and the final recipients’ projects under them. ${count(umbrellas.length, 'en')} agreements of an implementing body that have paid nothing (at most 1% of their value) and are worth €30 m or more or are named after an investment (“C3.I2 …”) are taken as umbrella agreements (€${bn(umbrellaValue, 'en')} bn) and hidden until you choose them under “Type of beneficiary”, so that nothing counts twice. The value of the Plan’s projects still exceeds its budget: it includes the recipients’ own contributions (e.g. for energy storage). The Plan’s totals are under “Recovery Plan”.`,
      ),
    ],
    asOf: generated,
    retrieved: '2026-10-05',
    unit: { one: t('проект', 'project'), other: t('проекта', 'projects') },
    summary: ['value', 'paid'],
    sort: '-value',
    links,
    columns: [
      { id: 'code', type: 'code', label: t('Номер в ИСУН', 'UMIS number'), search: true, detail: true },
      { id: 'name', type: 'text', label: t('Проект', 'Project'), search: true },
      { id: 'beneficiary', type: 'text', label: t('Бенефициент', 'Beneficiary'), search: true },
      {
        id: 'cls',
        type: 'category',
        label: t('Вид бенефициент', 'Type of beneficiary'),
        filter: true,
        labels: { ...BENEFICIARY_CLASSES, um: t('Рамкови споразумения по Плана за възстановяване', 'Recovery Plan umbrella agreements') },
        exclude: ['um'],
      },
      // A text column, not a code, so that a beneficiary's number is stored once per shard (see packShard).
      { id: 'eik', type: 'text', label: t('ЕИК', 'Company number (ЕИК)'), search: true, detail: true },
      { id: 'programme', type: 'category', label: t('Програма', 'Programme'), filter: true, labels: Object.fromEntries([...new Set(projects.map((p) => p.programme))].map((id) => [id, ISUN_PROGRAMMES[id]])) },
      { id: 'municipality', type: 'node', label: t('Община', 'Municipality'), family: 'municipalities', dataset: target.id, filter: true, labels: nodeLabels(target, new Set(rows.flatMap((r) => (r[MUNICIPALITY] ? [r[MUNICIPALITY] as string] : [])))) },
      { id: 'place', type: 'text', label: t('Място на изпълнение', 'Place'), detail: true },
      { id: 'status', type: 'category', label: t('Състояние', 'Status'), filter: true, detail: true, labels: Object.fromEntries(Object.values(STATUSES).map((s) => [s.id, s.name])) },
      { id: 'value', type: 'money', label: t('Обща стойност', 'Total value'), total: true, source: ISUN.name },
      { id: 'paid', type: 'money', label: t(`Изплатено към ${date.bg}`, `Paid to ${date.en}`), total: true, source: ISUN.name },
    ],
    key: 'code',
    titleColumn: 'name',
    rows,
    shardBy: 'programme',
    shardSearch: 3,
    shardFilters: ['municipality'],
  }
}

/** The tree nodes of EU-funded spending: every "Spent by: EU funds" slice of the actuals. */
function euNodes(datasets: Dataset[], year: number): string[] {
  const ids: string[] = []
  for (const d of datasets.filter((x) => x.family === 'functions' && x.stage === 'report' && x.year === year)) {
    const walk = (n: Dataset['root']) => {
      if (n.id.endsWith('.eu')) ids.push(n.id)
      n.children?.forEach(walk)
    }
    walk(d.root)
  }
  return ids
}

export function buildEuFundsLists(config: { dir: URL; datasets: Dataset[]; register: Register }): ListSpec[] {
  const { dir, datasets, register } = config
  const projects = readProjects(dir)
  const programmes = programmesList(dir, projects)
  const rrp = rrpList(dir)
  // The actuals' EU-funds slices lead to the programmes and the Recovery Plan (no amount: the lists are cumulative, the slices yearly).
  const years = [...new Set(datasets.filter((d) => d.family === 'functions' && d.stage === 'report').map((d) => d.year))].sort()
  for (const [list, text] of [
    [programmes, t('Европейските програми: бюджет и изплатено досега', 'The EU programmes: budget and paid to date')],
    [rrp, t('Планът за възстановяване: бюджет и изплатено по инвестиции', 'The Recovery Plan: budget and payments by investment')],
  ] as const) {
    list.links = years.map((year) => ({ family: 'functions', column: 'kfp', years: [year], stages: ['report'], nodes: { eu: euNodes(datasets, year) }, label: t('', ''), text }))
  }
  return [programmes, rrp, projectsList(dir, projects, datasets, register)]
}
