// "Municipalities <year>": what the central budget sends to each of the 265
// municipalities under the State Budget Act (2024, 2025: art. 53; 2026: art. 51),
// by type of transfer — and the general subsidy for state-delegated activities
// by function (art. 54 / art. 52), the part for municipal administration split
// into mayors and staff.
//
// Province → municipality → type of transfer → function. Ids come from
// scripts/lib/places.ts ("plovdiv-plovdiv", "plovdiv-plovdiv-equalising"), so a
// municipality is the same node in every year; each municipality node carries
// its ЕБК code (the key of project and payment data) and its residents.

import type { Dataset, DatasetSource, LocalizedText } from '../src/lib/types.ts'
import { num, readCsv } from './lib/csv.ts'
import { toEur } from './lib/kfp.ts'
import type { YearMacro } from './lib/macro.ts'
import { municipalityName, PLACE_KIND, provinceKey, provinceName, readRegister, type Municipality } from './lib/places.ts'
import { build, type Spec } from './lib/tree-builder.ts'

const t = (bg: string, en: string): LocalizedText => ({ bg, en })

export const KIND = {
  province: PLACE_KIND.province,
  municipality: PLACE_KIND.municipality,
  transfer: t('Вид трансфер', 'Type of transfer'),
  function: t('Функция', 'Function'),
  part: t('Разход', 'Expense'),
}

/** The transfer types (columns 3–7 of the act's table), as `transfer` in municipal-transfers-<year>.csv. */
export const TRANSFER_TYPES = ['delegated', 'equalising', 'capital', 'winter_roads', 'other_targeted'] as const
export type TransferType = (typeof TRANSFER_TYPES)[number]

const TRANSFER_ID: Record<TransferType, string> = {
  delegated: 'delegated',
  equalising: 'equalising',
  capital: 'capital',
  winter_roads: 'winter-roads',
  other_targeted: 'other-targeted',
}

/** Columns of municipal-delegated-<year>.csv: the functions of state-delegated activities. */
const FUNCTIONS: { column: string; id: string; name: LocalizedText; parts?: { column: string; id: string; name: LocalizedText }[] }[] = [
  { column: 'education(4)', id: 'education', name: t('Образование (детски градини и училища)', 'Education (kindergartens & schools)') },
  { column: 'social_services(6)', id: 'social', name: t('Социални услуги', 'Social services') },
  {
    column: 'municipal_administration(2)',
    id: 'admin',
    name: t('Общинска администрация', 'Municipal administration'),
    parts: [
      { column: 'of_which_mayors(2a)', id: 'mayors', name: t('Кметове и кметски наместници', 'Mayors and village deputy mayors') },
      { column: 'of_which_admin_staff(2b)', id: 'staff', name: t('Служители в общинската администрация', 'Administrative staff') },
    ],
  },
  { column: 'health(5)', id: 'health', name: t('Здравеопазване (детски ясли, здравни кабинети и др.)', 'Health (nurseries, school health offices etc.)') },
  { column: 'culture(7)', id: 'culture', name: t('Култура (читалища, библиотеки, музеи)', 'Culture (community centres, libraries, museums)') },
  { column: 'defence_security(3)', id: 'defence', name: t('Отбрана и сигурност', 'Defence & security') },
  { column: 'economic_activities(8)', id: 'economic', name: t('Икономически дейности и услуги', 'Economic activities & services') },
]

export interface MunicipalitiesConfig {
  id: string
  year: number
  /** municipal-transfers-<year>.csv (see data/sources/budget-<year>/README.md). */
  transfers: URL
  /** municipal-delegated-<year>.csv: the delegated-activities subsidy by function. */
  delegated: URL
  /** data/sources/places/municipalities.csv: ЕБК codes and residents. */
  register: URL
  /** Articles of the act: the transfers table and the delegated activities by function. */
  articles: { transfers: LocalizedText; delegated: LocalizedText }
  /** Residents at 31 December of this year are used (the start of the budget year). */
  residentsAt: number
  /** All public spending in the year, for shares "of all spending". */
  publicTotal: number
  macro: YearMacro
  title: LocalizedText
  subtitle: LocalizedText
  description: LocalizedText
  sources: DatasetSource[]
  sourceShort: LocalizedText
  retrieved: string
}

/** Display names of the transfer types, and a short note (the same on every municipality). */
function transferNames(config: MunicipalitiesConfig): Record<TransferType, { name: LocalizedText; note?: LocalizedText }> {
  const { year, articles } = config
  return {
    delegated: {
      name: t('Делегирани от държавата дейности', 'State-delegated activities'),
      note: t(
        `Обща субсидия за делегираните от държавата дейности, по функции според ${articles.delegated.bg} от закона.`,
        `General subsidy for state-delegated activities, by function as set in ${articles.delegated.en} of the act.`,
      ),
    },
    equalising: {
      name: t('Обща изравнителна субсидия', 'General equalising subsidy'),
      note: t(
        'За общините с по-ниски собствени данъчни приходи на жител (под 120% от средните за страната).',
        'For municipalities with lower own tax revenue per resident (below 120% of the national average).',
      ),
    },
    capital: {
      name: t('Целева субсидия за капиталови разходи', 'Targeted subsidy for capital spending'),
      note: t('За строителство, ремонти и оборудване на общината.', 'For the municipality’s construction, renovation and equipment.'),
    },
    winter_roads: { name: t('Зимно поддържане и снегопочистване на общинските пътища', 'Winter maintenance & snow clearing of municipal roads') },
    other_targeted: {
      name: t('Целеви трансфер за минималната работна заплата', 'Targeted transfer for the minimum wage'),
      note: t(
        `„Трансфери за други целеви разходи за местни дейности“ — за минималната работна заплата за ${year} г. в местните дейности.`,
        `“Transfers for other targeted spending on local activities” — for the ${year} minimum wage in local activities.`,
      ),
    },
  }
}

export function buildMunicipalities(config: MunicipalitiesConfig): Dataset {
  const register = readRegister(config.register)
  const transferRows = readCsv(config.transfers)
  const amountColumn = Object.keys(transferRows[0]).find((k) => k.startsWith('amount_'))!
  const unit = amountColumn.slice('amount_'.length) as 'kEUR' | 'kBGN'
  const where = `Municipalities ${config.year}`

  // Amounts in the source unit, checked against the printed totals before conversion.
  const amounts = new Map<Municipality, Map<TransferType, number>>()
  const printed = new Map<TransferType, number>()
  for (const r of transferRows) {
    const type = r.transfer as TransferType
    if (!TRANSFER_TYPES.includes(type)) throw new Error(`${where}: unknown transfer type "${r.transfer}"`)
    const value = r[amountColumn].trim() ? num(r[amountColumn]) : 0
    if (r.municipality.startsWith('ВСИЧКО')) {
      printed.set(type, value)
      continue
    }
    const place = register.byCode(r.ebk_code)
    if (place.key !== register.find(r.province, r.municipality).key) throw new Error(`${where}: ЕБК ${r.ebk_code} is not ${r.municipality}`)
    const own = amounts.get(place) ?? new Map<TransferType, number>()
    own.set(type, value)
    amounts.set(place, own)
  }
  if (amounts.size !== register.all.length) throw new Error(`${where}: ${amounts.size} municipalities, the register has ${register.all.length}`)
  for (const type of TRANSFER_TYPES) {
    const sum = [...amounts.values()].reduce((s, m) => s + (m.get(type) ?? 0), 0)
    if (Math.abs(sum - (printed.get(type) ?? NaN)) > 0.05) throw new Error(`${where}: ${type} adds up to ${sum}, the act prints ${printed.get(type)}`)
  }

  // The delegated-activities subsidy by function; every municipality's functions add up to its subsidy.
  const delegated = new Map<Municipality, Record<string, string>>()
  for (const r of readCsv(config.delegated)) {
    if (r.municipality.trim().toUpperCase().startsWith('ВСИЧКО')) continue
    const place = register.find(r.oblast, r.municipality)
    const total = num(r['total_delegated(1=2+3+4+5+6+7+8)'])
    const parts = FUNCTIONS.reduce((s, f) => s + (num(r[f.column]) || 0), 0)
    if (Math.abs(total - parts) > 0.05 || Math.abs(total - (amounts.get(place)?.get('delegated') ?? NaN)) > 0.05) {
      throw new Error(`${where}: the delegated activities of ${place.name} do not add up`)
    }
    delegated.set(place, r)
  }
  if (delegated.size !== amounts.size) throw new Error(`${where}: ${delegated.size} municipalities by function, ${amounts.size} with transfers`)

  const eur = (value: number) => toEur(value, unit)
  const names = transferNames(config)
  const residentsOf = (place: Municipality) => {
    const n = place.residents.get(config.residentsAt)
    if (!n) throw new Error(`${where}: no residents for ${place.name} at 31.12.${config.residentsAt}`)
    return n
  }

  const municipalitySpec = (place: Municipality): Spec => {
    const own = amounts.get(place)!
    const fns = delegated.get(place)!
    const types: Spec[] = TRANSFER_TYPES.filter((type) => (own.get(type) ?? 0) > 0).map((type) => {
      const id = `${place.key}-${TRANSFER_ID[type]}`
      const spec: Spec = { id, kind: KIND.transfer, name: names[type].name, note: names[type].note, value: eur(own.get(type)!) }
      if (type !== 'delegated') return spec
      spec.children = FUNCTIONS.filter((f) => num(fns[f.column]) > 0).map((f) => ({
        id: `${id}-${f.id}`,
        kind: KIND.function,
        name: f.name,
        value: eur(num(fns[f.column])),
        children: f.parts?.filter((p) => num(fns[p.column]) > 0).map((p) => ({ id: `${id}-${f.id}-${p.id}`, kind: KIND.part, name: p.name, value: eur(num(fns[p.column])) })),
      }))
      return spec
    })
    return { id: place.key, code: place.code, kind: KIND.municipality, name: municipalityName(place.name), residents: residentsOf(place), children: types }
  }

  const byProvince = new Map<string, Municipality[]>()
  for (const place of register.all) byProvince.set(place.province, [...(byProvince.get(place.province) ?? []), place])
  const children: Spec[] = [...byProvince].map(([province, places]) => {
    // Sofia is a province of its own; with a single municipality the province level is skipped.
    if (places.length === 1) {
      const only = municipalitySpec(places[0])
      return { ...only, note: t('Столичната община е и отделна област — София-град.', 'Sofia municipality is also a province of its own (Sofia City).') }
    }
    const list = places.map(municipalitySpec)
    return { id: provinceKey(province), kind: KIND.province, name: provinceName(province), residents: list.reduce((s, m) => s + m.residents!, 0), children: list }
  })

  const total = eur([...printed.values()].reduce((a, b) => a + b, 0))
  const root = build({ id: 'root', name: t('Трансфери от централния бюджет за общините', 'Central-budget transfers to municipalities'), value: total, children })

  return {
    id: config.id,
    year: config.year,
    kind: 'plan',
    stage: 'law',
    family: 'municipalities',
    title: config.title,
    subtitle: config.subtitle,
    description: config.description,
    currency: 'EUR',
    sourceCurrency: unit === 'kBGN' ? 'BGN' : 'EUR',
    population: config.macro.population,
    populationNote: config.macro.populationNote,
    residentsNote: t(`жители към 31.12.${config.residentsAt} г. (НСИ)`, `residents on 31 Dec ${config.residentsAt} (NSI)`),
    gdp: config.macro.gdp,
    gdpNote: config.macro.gdpNote,
    levels: [KIND.province, KIND.municipality, KIND.transfer, KIND.function, KIND.part],
    sources: config.sources,
    sourceShort: config.sourceShort,
    retrieved: config.retrieved,
    publicTotal: config.publicTotal,
    root,
  }
}
