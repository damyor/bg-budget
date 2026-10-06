// "Big cities <year>": the whole budgets of Sofia, Plovdiv and Burgas — what each spent on every ЕБК activity
// (kindergartens, schools, street lighting, street cleaning …) and on what kind of spending — from each city's own
// year-end report on the cash execution of its budget and of its accounts for EU funds (data/sources/cities/, made by
// scripts/extract/city_budgets.py).
//
// City → function → activity → kind of spending → paragraph (running costs by sub-paragraph). A city's id is its
// municipality's (scripts/lib/places.ts), as in "Municipalities"; the levels below add the function's id or the
// activity's ЕБК code ("plovdiv-plovdiv-education", "plovdiv-plovdiv-322", "plovdiv-plovdiv-322-running",
// "plovdiv-plovdiv-322-1016"), so every node keeps its id from year to year.

import type { Dataset, DatasetSource, Lang, ListCell, LocalizedText } from '../src/lib/types.ts'
import { formatMoney, formatPercent } from '../src/lib/format.ts'
import { readCsv } from './lib/csv.ts'
import { activityOf, ECONOMIC, economicGroupOf, economicItemOf, FUNCTIONS, readActivities, type Activity } from './lib/ebk.ts'
import { toEuro } from './lib/kfp.ts'
import { nodeLabels, type ListGroup, type ListSpec } from './lib/lists.ts'
import type { YearMacro } from './lib/macro.ts'
import { municipalityName, PLACE_KIND, readRegister, slug, type Municipality } from './lib/places.ts'
import { build, type Spec } from './lib/tree-builder.ts'

const t = (bg: string, en: string): LocalizedText => ({ bg, en })

/** The cities, largest first: file prefix in data/sources/cities/ and ЕБК code (the register's key). */
export const CITIES = [
  { file: 'sofia', ebk: '7225' },
  { file: 'plovdiv', ebk: '6609' },
  { file: 'burgas', ebk: '5202' },
] as const

/** The forms a city reports: its budget, and its accounts for EU funds (cohesion and structural funds, agricultural funds, other EU funds, other international programmes). */
export const FORMS = ['budget', 'ksf', 'ra', 'des', 'dmp'] as const
export type Form = (typeof FORMS)[number]

export const KIND = {
  city: PLACE_KIND.municipality,
  function: t('Функция', 'Function'),
  activity: t('Дейност', 'Activity'),
  group: t('Вид разход', 'Kind of spending'),
  paragraph: t('Параграф', 'Paragraph'),
  subparagraph: t('Подпараграф', 'Sub-paragraph'),
}

/** The value columns of the extracts: revised plan and actual, each in all and by state-delegated, local and top-up. */
const VALUES = ['plan', 'plan_state', 'plan_local', 'plan_topup', 'actual_state', 'actual_local', 'actual_topup', 'actual'] as const
type Amounts = Record<(typeof VALUES)[number], number>
const zero = (): Amounts => Object.fromEntries(VALUES.map((v) => [v, 0])) as Amounts
const addTo = (a: Amounts, b: Amounts) => VALUES.forEach((v) => (a[v] += b[v]))

export interface CityRow extends Amounts {
  form: Form
  /** EU programme of a row of the accounts for EU funds ("98226"), or "". */
  programme: string
  /** Activity as the report writes it: four digits, the function's first ("3322"). */
  activity: string
  paragraph: string
  /** Four-digit ЕБК code of the row ("1016"; "5200" for a paragraph without sub-paragraphs). */
  code: string
}

/** One city's extract for a year (data/sources/cities/<city>-<year>.csv), in the report's currency. */
export function readCityReport(file: URL): CityRow[] {
  return readCsv(file).map((r) => {
    if (!(FORMS as readonly string[]).includes(r.form)) throw new Error(`${file.pathname}: unknown form ${r.form}`)
    const row = { form: r.form as Form, programme: r.programme, activity: r.activity, paragraph: r.paragraph, code: r.code } as CityRow
    for (const v of VALUES) {
      if (!/^-?\d+$/.test(r[v])) throw new Error(`${file.pathname}: ${v} = "${r[v]}" is not a whole number`)
      row[v] = Number(r[v])
    }
    return row
  })
}

/** What each report prints (data/sources/cities/report-totals.csv): its currency and its totals, by city, year and form. */
export function readReportTotals(file: URL): Map<string, Amounts & { currency: string; url: string }> {
  const out = new Map<string, Amounts & { currency: string; url: string }>()
  for (const r of readCsv(file)) {
    const amounts = zero()
    for (const v of VALUES) amounts[v] = Number(r[v])
    out.set(`${r.city}|${r.year}|${r.form}`, { ...amounts, currency: r.currency, url: r.url })
  }
  return out
}

export interface CitiesConfig {
  id: string
  year: number
  /** data/sources/cities/ */
  dir: URL
  /** data/sources/places/municipalities.csv: the cities' ids, names and residents. */
  register: URL
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

const joinNotes = (a: LocalizedText | undefined, b: LocalizedText): LocalizedText => (a ? t(`${a.bg} ${b.bg}`, `${a.en} ${b.en}`) : b)

/**
 * Refunds booked as negative spending (taxes paid back under § 19-01, a corrected payment …) cannot be slices. The
 * negative parts of a node are merged with its smallest positive parts into one part, "Other (net)", whose note lists
 * them; when that would take every part, the node shows no parts and its note lists them instead. Applied from the
 * leaves up, so every level adds up to its parent.
 */
export function withoutNegatives(spec: Spec): Spec {
  const children = spec.children?.map(withoutNegatives).filter((c) => c.value !== 0)
  if (!children?.some((c) => c.value! < 0)) return { ...spec, children }
  const ascending = [...children].sort((a, b) => a.value! - b.value!)
  let sum = 0
  let n = 0
  while (n < ascending.length && (sum <= 0 || ascending[n].value! < 0)) sum += ascending[n++].value!
  const merged = ascending.slice(0, n)
  const list = (lang: Lang) =>
    [...merged]
      .sort((a, b) => b.value! - a.value!)
      .map((p) => `${p.name[lang]} ${formatMoney(p.value!, lang)}`)
      .join('; ')
  if (n === ascending.length) {
    const { children: _parts, ...leaf } = spec
    return { ...leaf, note: joinNotes(spec.note, t(`Нетна сума, защото част от нея е отрицателна (възстановени суми): ${list('bg')}.`, `A net amount, as part of it is negative (sums paid back): ${list('en')}.`)) }
  }
  const other: Spec = {
    id: `${spec.id}-net`,
    name: t('Друго (нетно)', 'Other (net)'),
    value: sum,
    note: t(`Части, някои от които са отрицателни (възстановени суми): ${list('bg')}.`, `Parts some of which are negative (sums paid back): ${list('en')}.`),
    ...(merged[0].kind ? { kind: merged[0].kind } : {}),
  }
  return { ...spec, children: [...ascending.slice(n), other] }
}

/** The note on a city or an activity: who decides on the money, how much came from EU funds, and the revised plan. */
function splitNote(total: Amounts, eu: number, whole: boolean): LocalizedText {
  const parts: { bg: string; en: string; value: number }[] = [
    { bg: 'делегирани от държавата дейности', en: 'state-delegated activities', value: total.actual_state },
    { bg: 'местни дейности', en: 'local activities', value: total.actual_local },
    { bg: 'дофинансиране на делегирани дейности от общината', en: 'the municipality’s top-up of delegated activities', value: total.actual_topup },
  ].filter((p) => p.value !== 0)
  const sentences: LocalizedText[] = []
  if (parts.length === 1 && !whole) {
    sentences.push(
      parts[0].bg === 'местни дейности'
        ? t('Местна дейност (решава и финансира общината).', 'A local activity (decided and paid for by the municipality).')
        : parts[0].bg === 'делегирани от държавата дейности'
          ? t('Делегирана от държавата дейност.', 'A state-delegated activity.')
          : t('Дофинансиране от общината на делегирана от държавата дейност.', 'The municipality’s top-up of a state-delegated activity.'),
    )
  } else if (parts.length) {
    sentences.push(
      t(
        `По вид дейност: ${parts.map((p) => `${p.bg} ${formatMoney(p.value, 'bg')}`).join(', ')}.`,
        `By kind of activity: ${parts.map((p) => `${p.en} ${formatMoney(p.value, 'en')}`).join(', ')}.`,
      ),
    )
  }
  if (eu > 0) {
    sentences.push(
      t(
        `${formatMoney(eu, 'bg')} от сумата са платени от сметките за средства от ЕС и други международни програми.`,
        `${formatMoney(eu, 'en')} of it was paid from the accounts for EU funds and other international programmes.`,
      ),
    )
  }
  if (total.plan > 0) {
    sentences.push(
      t(
        `Уточнен план: ${formatMoney(total.plan, 'bg')}; изпълнение ${formatPercent(total.actual / total.plan, 'bg')}.`,
        `Revised plan: ${formatMoney(total.plan, 'en')}; ${formatPercent(total.actual / total.plan, 'en')} spent.`,
      ),
    )
  }
  return t(sentences.map((s) => s.bg).join(' '), sentences.map((s) => s.en).join(' '))
}

const euro = (a: Amounts, currency: string): Amounts => Object.fromEntries(VALUES.map((v) => [v, toEuro(a[v], currency)])) as Amounts

/** One city's tree: function → activity → kind of spending → paragraph, in euro. */
function citySpec(place: Municipality, rows: CityRow[], currency: string, activities: Map<string, Activity>, residents: number): Spec {
  const prefix = place.key
  // activity (3 digits) → item code → amounts; and the activity's totals and EU share
  const byActivity = new Map<string, { items: Map<string, { paragraph: string; amounts: Amounts }>; total: Amounts; eu: number }>()
  const cityTotal = zero()
  let cityEu = 0
  for (const row of rows) {
    const { activity } = activityOf(row.activity)
    if (!activities.has(activity)) throw new Error(`${place.name}: activity ${row.activity} is not in the ЕБК`)
    const item = economicItemOf(row.paragraph, row.code)
    const entry = byActivity.get(activity) ?? { items: new Map(), total: zero(), eu: 0 }
    byActivity.set(activity, entry)
    const own = entry.items.get(item.code) ?? { paragraph: row.paragraph, amounts: zero() }
    entry.items.set(item.code, own)
    addTo(own.amounts, row)
    addTo(entry.total, row)
    addTo(cityTotal, row)
    if (row.form !== 'budget') {
      entry.eu += row.actual
      cityEu += row.actual
    }
  }

  const functions = new Map<number, Spec[]>()
  for (const [code, { items, total, eu }] of [...byActivity].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (total.actual === 0) continue // planned, nothing spent
    const activity = activities.get(code)!
    const id = `${prefix}-${code}`
    const groups: Spec[] = ECONOMIC.map((group) => {
      const parts: Spec[] = [...items]
        .filter(([, item]) => economicGroupOf(item.paragraph).id === group.id)
        .map(([itemCode, item]) => {
          const { label, name } = economicItemOf(item.paragraph, itemCode)
          return { id: `${id}-${itemCode}`, code: label, kind: itemCode.endsWith('00') ? KIND.paragraph : KIND.subparagraph, name, value: toEuro(item.amounts.actual, currency) }
        })
      return { id: `${id}-${group.id}`, kind: KIND.group, name: group.name, value: parts.reduce((s, p) => s + p.value!, 0), children: parts }
    })
    const list = functions.get(activity.fn) ?? []
    list.push({
      id,
      code,
      kind: KIND.activity,
      name: activity.name,
      value: toEuro(total.actual, currency),
      note: splitNote(euro(total, currency), toEuro(eu, currency), false),
      children: groups,
    })
    functions.set(activity.fn, list)
  }

  const children: Spec[] = [...functions].map(([fn, list]) => ({
    id: `${prefix}-${FUNCTIONS[fn].id}`,
    code: String(fn),
    kind: KIND.function,
    name: FUNCTIONS[fn].name,
    value: list.reduce((s, a) => s + a.value!, 0),
    children: list,
  }))
  return withoutNegatives({
    id: prefix,
    code: place.code,
    kind: KIND.city,
    name: municipalityName(place.name),
    residents,
    value: toEuro(cityTotal.actual, currency),
    note: splitNote(euro(cityTotal, currency), toEuro(cityEu, currency), true),
    children,
  })
}

export function buildCities(config: CitiesConfig): Dataset {
  const register = readRegister(config.register)
  const activities = readActivities(new URL('ebk-activities.csv', config.dir))
  const printed = readReportTotals(new URL('report-totals.csv', config.dir))
  const where = `Big cities ${config.year}`
  let currency = ''

  const cities = CITIES.map(({ file, ebk }) => {
    const place = register.byCode(ebk)
    const rows = readCityReport(new URL(`${file}-${config.year}.csv`, config.dir))
    // Every form adds up to the totals its report prints, to the lev or euro cent.
    for (const form of FORMS) {
      const report = printed.get(`${file}|${config.year}|${form}`)
      if (!report) throw new Error(`${where}: no ${form} report of ${file}`)
      if (currency && report.currency !== currency) throw new Error(`${where}: reports in ${currency} and ${report.currency}`)
      currency = report.currency
      const sum = zero()
      rows.filter((r) => r.form === form).forEach((r) => addTo(sum, r))
      for (const v of VALUES) {
        if (sum[v] !== report[v]) throw new Error(`${where}: ${file} ${form} ${v} adds up to ${sum[v]}, the report prints ${report[v]}`)
      }
    }
    const residents = place.residents.get(config.residentsAt)
    if (!residents) throw new Error(`${where}: no residents for ${place.name} at 31.12.${config.residentsAt}`)
    return citySpec(place, rows, currency, activities, residents)
  })

  const root = build({ id: 'root', name: t('Големите градове: София, Пловдив и Бургас', 'Big cities: Sofia, Plovdiv and Burgas'), children: cities })
  return {
    id: config.id,
    year: config.year,
    kind: 'actual',
    stage: 'report',
    family: 'cities',
    title: config.title,
    subtitle: config.subtitle,
    description: config.description,
    currency: 'EUR',
    sourceCurrency: currency === 'BGN' ? 'BGN' : 'EUR',
    population: config.macro.population,
    populationNote: config.macro.populationNote,
    residentsNote: t(`жители към 31.12.${config.residentsAt} г. (НСИ)`, `residents on 31 Dec ${config.residentsAt} (NSI)`),
    gdp: config.macro.gdp,
    gdpNote: config.macro.gdpNote,
    levels: [KIND.city, KIND.function, KIND.activity, KIND.group, KIND.paragraph],
    sources: config.sources,
    sourceShort: config.sourceShort,
    retrieved: config.retrieved,
    publicTotal: config.publicTotal,
    root,
  }
}

// ---------- lists: Plovdiv's schools and kindergartens ----------

export const CITY_BUDGETS: ListGroup = {
  id: 'cities',
  title: t('Бюджетите на градовете', 'City budgets'),
  description: t(
    'Подробности от бюджетите на градовете, които не са част от дървото на разходите: колко пари от държавния бюджет получава всяко училище и всяка детска градина в Пловдив и по какви единни разходни стандарти държавата финансира образованието в общините.',
    'Detail from the cities’ budgets that is not part of the spending tree: how much of the state budget each school and kindergarten in Plovdiv receives, and the uniform cost standards by which the state funds education in the municipalities.',
  ),
}

/** The components of Plovdiv's formulas (data/sources/cities/plovdiv-schools.csv, `component`). */
const SCHOOL_COMPONENTS: Record<string, LocalizedText> = {
  'nursery-children': t('Деца в яслени групи', 'Children in nursery groups'),
  'children-2-3': t('Деца от 2 до 3 години', 'Children aged 2–3'),
  'children-4-6': t('Деца от 4 до 6 години в целодневни подготвителни групи', 'Children aged 4–6 in full-day preparatory groups'),
  groups: t('Групи', 'Groups'),
  'special-children': t('Деца в специални групи', 'Children in special groups'),
  'half-day-children': t('Деца в полудневни подготвителни групи', 'Children in half-day preparatory groups'),
  'full-day-children': t('Деца в целодневни подготвителни групи', 'Children in full-day preparatory groups'),
  'half-day-groups': t('Полудневни подготвителни групи', 'Half-day preparatory groups'),
  'full-day-groups': t('Целодневни подготвителни групи', 'Full-day preparatory groups'),
  pupils: t('Ученици', 'Pupils'),
  classes: t('Паралелки', 'Classes'),
  'dormitory-groups': t('Групи в общежитието', 'Dormitory groups'),
  'all-day-groups': t('Целодневна организация на учебния ден: групи', 'All-day school: groups'),
  'all-day-pupils': t('Целодневна организация на учебния ден: ученици', 'All-day school: pupils'),
  institution: t('За институцията', 'Per institution'),
  'adapted-buildings': t('Добавка за деца в пригодени сгради', 'Supplement for children in adapted buildings'),
  'listed-buildings': t('Добавка за детски градини — паметници на културата', 'Supplement for kindergartens in listed buildings'),
  pool: t('Добавка за функциониращ басейн', 'Supplement for a working swimming pool'),
  reserve: t('Резерв за нерегулярни разходи', 'Reserve for irregular expenses'),
  'floor-area': t('Добавка за училищна площ', 'Supplement for school floor area'),
  'arts-class-supplement': t('Добавка за паралелка с профил „Изкуства“', 'Supplement for arts-profile classes'),
  'small-school': t('Добавка за училище с до 300 ученици', 'Supplement for schools of up to 300 pupils'),
  'very-small-school': t('Добавка за училище с под 110 ученици', 'Supplement for schools of under 110 pupils'),
  'arts-pupils': t('Ученици в паралелки с профил „Изкуства“', 'Pupils in arts-profile classes'),
  'arts-classes': t('Паралелки с профил „Изкуства“', 'Arts-profile classes'),
  individual: t('Ученици в индивидуална форма', 'Pupils in individual education'),
  'self-study': t('Ученици в самостоятелна форма', 'Pupils in self-study'),
  'vocational-classes': t('Паралелки за професионална подготовка', 'Vocational classes'),
  'field-science': t('Ученици: природни науки, информатика, техника, здравеопазване, производство, строителство', 'Pupils: sciences, IT, engineering, health, manufacturing, construction'),
  'field-arts': t('Ученици: изкуства и хуманитарни науки', 'Pupils: arts and humanities'),
  'field-services': t('Ученици: услуги за личността и сигурност', 'Pupils: personal services and security'),
  'field-business': t('Ученици: стопанско управление, администрация, социални услуги, журналистика', 'Pupils: business, administration, social services, journalism'),
  'field-agriculture': t('Ученици: селско, горско и рибно стопанство, ветеринарна медицина', 'Pupils: agriculture, forestry, fishing, veterinary medicine'),
  'meals-preschool': t('Хранене на децата в подготвителните групи', 'Meals for children in preparatory groups'),
  'meals-school': t('Хранене на децата в подготвителните класове и на учениците от I до IV клас', 'Meals for preparatory-class children and pupils in grades 1–4'),
  'fees-compensation': t('Издръжка на дете вместо отпадналите такси', 'Per child, in place of the abolished fees'),
  'combined-form': t('Ученици в комбинирана форма', 'Pupils in combined education'),
  facilities: t('Материална база', 'Facilities'),
  music: t('Разширена подготовка по музика', 'Extended music education'),
  'upper-secondary': t('Първи и втори гимназиален етап', 'Upper secondary stages'),
  'vocational-dual': t('Дневна форма и дуална система в професионалното обучение', 'Full-time and dual vocational education'),
  interests: t('Занимания по интереси', 'Extracurricular activities'),
  'special-centre': t('Ученици, обучавани в център за специална образователна подкрепа', 'Pupils taught in a special educational support centre'),
  scholarships: t('Стипендии', 'Scholarships'),
  inclusive: t('Условия за приобщаващо образование', 'Conditions for inclusive education'),
  'resource-support': t('Деца и ученици на ресурсно подпомагане', 'Children and pupils receiving resource support'),
}

const SCHOOL_PARTS = { formula: t('По формулата', 'By the formula'), above: t('Нормативи извън формулата', 'Standards outside the formula') }

/** The mayor's orders behind each year's allocation, and the page that publishes it. */
const SCHOOL_SOURCES: Record<string, { order: LocalizedText; url: string }> = {
  2024: { order: t('Заповед № 24ОА-461/28.02.2024 г.', 'order 24ОА-461 of 28 Feb 2024'), url: 'https://www.plovdiv.bg/item/budget-and-finance/delegated-budget/%d0%b7%d0%b0-2024-%d0%b3/' },
  2025: { order: t('Заповед № 25ОА-1347/28.04.2025 г.', 'order 25ОА-1347 of 28 Apr 2025'), url: 'https://www.plovdiv.bg/item/budget-and-finance/delegated-budget/formuli-sredstva-2025/' },
  2026: { order: t('Заповед № 26ОА-2326/28.08.2026 г.', 'order 26ОА-2326 of 28 Aug 2026'), url: 'https://www.plovdiv.bg/item/budget-and-finance/delegated-budget/formuli-sredstva-2026/' },
}

/**
 * Plovdiv's allocation of the state budget for delegated education activities to each school and kindergarten,
 * 2024–2026: one row per institution and activity, by formula component.
 */
function plovdivSchools(dir: URL, datasets: Dataset[]): ListSpec {
  const cities = datasets.find((d) => d.id === 'cities-2025')
  const municipal = datasets.find((d) => d.id === 'municipalities-2026')
  if (!cities || !municipal) throw new Error('Plovdiv schools: no cities-2025 or municipalities-2026 dataset')
  const plovdiv = 'plovdiv-plovdiv'
  const records = readCsv(new URL('plovdiv-schools.csv', dir))
  const periods = [...new Set(records.map((r) => r.year))].sort()
  const at = (year: string) => periods.indexOf(year)
  const rows = new Map<string, { name: string; nameYear: string; activity: string; total: (number | null)[]; formula: (number | null)[]; above: (number | null)[]; pupils: (number | null)[]; parts: Map<string, number[]> }>()
  const partOf = new Map<string, string>()
  for (const r of records) {
    const id = `${r.activity}-${slug(r.key)}`
    const row = rows.get(id) ?? {
      name: r.institution,
      nameYear: r.year,
      activity: `${plovdiv}-${r.activity}`,
      total: periods.map(() => null),
      formula: periods.map(() => null),
      above: periods.map(() => null),
      pupils: periods.map(() => null),
      parts: new Map(),
    }
    rows.set(id, row)
    // The name as published in the latest year.
    if (r.year >= row.nameYear) Object.assign(row, { name: r.institution, nameYear: r.year })
    const i = at(r.year)
    const value = Number(r.value)
    if (r.part === 'count') {
      row.pupils[i] = (row.pupils[i] ?? 0) + value
      continue
    }
    if (!SCHOOL_COMPONENTS[r.component]) throw new Error(`Plovdiv schools: no name for component ${r.component}`)
    if ((partOf.get(r.component) ?? r.part) !== r.part) throw new Error(`Plovdiv schools: ${r.component} both in and outside the formula`)
    partOf.set(r.component, r.part)
    const amount = toEuro(value, r.currency)
    const part = r.part as 'formula' | 'above'
    row[part][i] = (row[part][i] ?? 0) + amount
    row.total[i] = (row.total[i] ?? 0) + amount
    const values = row.parts.get(r.component) ?? periods.map(() => 0)
    values[i] += amount
    row.parts.set(r.component, values)
  }
  const round = (values: (number | null)[]) => values.map((v) => (v === null ? null : Math.round(v)))
  const list: ListCell[][] = [...rows].map(([id, row]) => [
    id,
    row.name,
    row.activity,
    plovdiv,
    round(row.total),
    round(row.formula),
    round(row.above),
    row.pupils,
    [...row.parts]
      .sort((a, b) => Object.keys(SCHOOL_COMPONENTS).indexOf(a[0]) - Object.keys(SCHOOL_COMPONENTS).indexOf(b[0]))
      .map(([component, values]) => {
        // Periods missing at the end are left out (see ListBreakdown).
        const kept = values.map(Math.round)
        while (kept.length > 1 && kept[kept.length - 1] === 0) kept.pop()
        return [component, ...kept]
      }),
  ])
  const institutions = new Set([...rows.values()].map((r) => slug(r.name))).size
  const last = periods[periods.length - 1]
  const yearLink = (family: 'cities' | 'municipalities', column: string, year: string) => ({
    family,
    column,
    years: [Number(year)],
    value: `total.${year}`,
    label: t(`за ${year} г.`, `for ${year}`),
    text: t(`Разпределени по училища и детски градини: {total} за ${year} г.`, `Allocated to schools and kindergartens: {total} for ${year}`),
  })
  return {
    id: 'plovdiv-schools',
    group: CITY_BUDGETS.id,
    title: t('Пловдив: държавните пари за всяко училище и детска градина', 'Plovdiv: state funding of each school and kindergarten'),
    short: t('Училища и детски градини в Пловдив', 'Plovdiv’s schools and kindergartens'),
    description: t(
      `Как Община Пловдив разпределя парите от държавния бюджет за образованието (делегираните от държавата дейности) между своите училища, детски градини и общежития: по единни разходни стандарти и формула — по брой деца и ученици, групи и паралелки, за институцията и добавки — и по нормативите извън формулата (хранене, материална база, стипендии …), за ${periods.join(', ')} г. ${rows.size} реда за около ${institutions} институции; училище с подготвителни групи или с ресурсно подпомагане има ред за всяка дейност.`,
      `How Plovdiv Municipality shares the state budget’s money for education (the state-delegated activities) among its schools, kindergartens and dormitories: by uniform cost standards and a formula — by number of children and pupils, groups and classes, per institution and supplements — and by the standards outside the formula (meals, facilities, scholarships …), for ${periods.join(', ')}. ${rows.size} rows for about ${institutions} institutions; a school with preparatory groups or resource support has a row for each activity.`,
    ),
    sources: periods.map((year) => ({
      name: t(
        `Община Пловдив — информация за разпределението на средствата от държавния бюджет по училища и детски градини и по компоненти на формулите за ${year} г. (${SCHOOL_SOURCES[year].order.bg})`,
        `Plovdiv Municipality — allocation of the state budget to schools and kindergartens by formula component, ${year} (${SCHOOL_SOURCES[year].order.en})`,
      ),
      url: SCHOOL_SOURCES[year].url,
    })),
    caveats: [
      t(
        'Това е разпределението по заповедта на кмета в началото на годината (за 2026 г. — след приемането на държавния бюджет през юли 2026 г.); през годината то се променя с броя на децата и учениците и с допълнителни средства. Отчетът на града по дейности е в „Разходи“ › „Големите градове“.',
        'This is the allocation set by the mayor’s order at the start of the year (for 2026, after the State Budget was adopted in July 2026); during the year it changes with the number of children and pupils and with additional money. What the city actually spent by activity is in “Spending” › “Big cities”.',
      ),
      t(
        'Само парите от държавния бюджет: собствените средства на общината за училищата и детските градини (дофинансиране, ремонти) и европейските средства не са тук. Ресурсното подпомагане (дейност 338) се разпределя по нормативи, без формула.',
        'Only the state budget’s money: the municipality’s own spending on schools and kindergartens (top-ups, repairs) and EU funds are not here. Resource support (activity 338) is allocated by standards, without a formula.',
      ),
      t(
        'Сумите за 2024 и 2025 г. са в лева в източника и са превърнати в евро по фиксирания курс 1,95583 лв. за 1 €. Имената на училищата и детските градини са такива, каквито са публикувани (най-новото изписване).',
        'The 2024 and 2025 amounts are in leva in the source and are converted to euro at the fixed rate of 1.95583 leva per euro. School and kindergarten names are as published (the latest spelling).',
      ),
    ],
    asOf: '2026-08-28',
    retrieved: '2026-10-06',
    unit: { one: t('разпределение', 'allocation'), other: t('разпределения', 'allocations') },
    summary: periods.map((p) => `total.${p}`),
    sort: `-total.${last}`,
    links: [
      ...periods.filter((p) => datasets.some((d) => d.family === 'cities' && d.year === Number(p))).map((p) => yearLink('cities', 'activity', p)),
      ...periods.filter((p) => datasets.some((d) => d.family === 'municipalities' && d.year === Number(p))).map((p) => yearLink('municipalities', 'municipality', p)),
    ],
    columns: [
      { id: 'id', type: 'code', label: t('Код', 'Code'), hidden: true },
      { id: 'name', type: 'text', label: t('Училище, детска градина', 'School, kindergarten'), search: true },
      { id: 'activity', type: 'node', label: t('Дейност', 'Activity'), family: 'cities', dataset: cities.id, filter: true, labels: nodeLabels(cities, new Set([...rows.values()].map((r) => r.activity))) },
      { id: 'municipality', type: 'node', label: t('Община', 'Municipality'), family: 'municipalities', dataset: municipal.id, hidden: true, labels: nodeLabels(municipal, [plovdiv]) },
      { id: 'total', type: 'series', label: t('Общо от държавния бюджет', 'In all, from the state budget'), periods, total: true },
      { id: 'formula', type: 'series', label: t('По формулата', 'By the formula'), periods, total: true, detail: true, section: t('Как е разпределено', 'How it is allocated') },
      { id: 'above', type: 'series', label: t('Нормативи извън формулата', 'Standards outside the formula'), periods, total: true, detail: true },
      { id: 'pupils', type: 'series', label: t('Деца и ученици по формулата', 'Children and pupils counted'), periods, unit: 'count', detail: true },
      {
        id: 'components',
        type: 'breakdown',
        label: t('По компоненти', 'By component'),
        detail: true,
        // Years side by side, not parts of one amount: no total across them.
        total: false,
        periods,
        labels: SCHOOL_COMPONENTS,
        groups: { of: Object.fromEntries(partOf), labels: SCHOOL_PARTS },
      },
    ],
    key: 'id',
    rows: list,
  }
}

// ---------- list: the cost standards of state-delegated education (РМС № 497/2026) ----------

/** The numbered sections of the education part of Annex 2 (data/sources/cities/standards-2026-education.csv, `section_no`). */
const STANDARD_SECTIONS: Record<string, LocalizedText> = {
  1: t('Детски градини', 'Kindergartens'),
  2: t('Неспециализирани училища, без професионални гимназии', 'General schools (other than vocational high schools)'),
  3: t('Специализирани училища по изкуства и по култура', 'Specialised schools of the arts and of culture'),
  4: t('Спортни училища', 'Sports schools'),
  5: t('Професионални гимназии и паралелки за професионална подготовка', 'Vocational high schools and vocational classes'),
  6: t('Специални училища', 'Special schools'),
  7: t('Училища в местата за лишаване от свобода', 'Schools in prisons'),
  8: t('Други форми на обучение', 'Other forms of education'),
  9: t('Центрове за подкрепа за личностното развитие', 'Centres for personal development support'),
  10: t('Ресурсно подпомагане', 'Resource support'),
  11: t('Регионален център за подкрепа на приобщаващото образование', 'Regional centre for inclusive education'),
  12: t('Хранене на децата в подготвителните групи и на учениците от I до IV клас', 'Meals for preparatory groups and grades 1–4'),
  13: t('Материална база', 'Facilities'),
  14: t('Комбинирана форма на обучение', 'Combined education'),
  15: t('Целодневна организация на учебния ден (I–VII клас)', 'All-day school (grades 1–7)'),
  18: t('Занимания по интереси', 'Extracurricular activities'),
  19: t('Стипендии', 'Scholarships'),
  20: t('Училищни автобуси', 'School buses'),
  22: t('Ученици на неспециализирани училища, обучавани в ЦСОП', 'General-school pupils taught in special-support centres'),
  23: t('Гимназиален етап: дневна форма и дуална система', 'Upper secondary: full-time and dual education'),
  25: t('Разширена подготовка по музика', 'Extended music education'),
  26: t('Издръжка на дете в общинска или държавна детска градина или училище', 'Per child in a municipal or state kindergarten or school'),
}

/** What a standard is paid per, as the annex names its natural indicators. */
const MEASURES: Record<string, LocalizedText> = {
  'брой институции': t('институция', 'institution'),
  'брой групи': t('група', 'group'),
  'брой паралелки': t('паралелка', 'class'),
  'брой деца': t('дете', 'child'),
  'брой ученици': t('ученик', 'pupil'),
  'брой деца/ ученици': t('дете или ученик', 'child or pupil'),
  'брой автобуси': t('автобус', 'bus'),
}

/**
 * The uniform cost standards by which the state funds the education municipalities carry out for it in 2026
 * (Council of Ministers decision 497/2026, Annex 2, section III): the amount per institution, class, pupil, child …,
 * the national count it is applied to and their product. Linked from "Budget 2026" › Education › kindergartens and
 * schools through the municipalities.
 */
function educationStandards(dir: URL, datasets: Dataset[]): ListSpec {
  const budget = datasets.find((d) => d.id === 'budget-2026')
  if (!budget) throw new Error('Education standards: no budget-2026 dataset')
  const node = 'ed-municipal'
  const rows: ListCell[][] = readCsv(new URL('standards-2026-education.csv', dir)).map((r, i) => {
    if (!STANDARD_SECTIONS[r.section_no]) throw new Error(`Education standards: no name for section ${r.section_no} (${r.section})`)
    const measure = MEASURES[r.measure]
    if (!measure) throw new Error(`Education standards: unknown measure "${r.measure}"`)
    const euro = Number(r.euro)
    const count = r.count ? Number(r.count) : null
    return [String(i + 1), r.standard, r.section_no, r.measure, euro, count, count === null ? null : Math.round(count * euro), node]
  })
  return {
    id: 'education-standards-2026',
    group: CITY_BUDGETS.id,
    title: t('Единни разходни стандарти за образованието, 2026 г.', 'Uniform cost standards for education, 2026'),
    short: t('Стандарти за образованието 2026', 'Education cost standards 2026'),
    description: t(
      `С колко пари държавата финансира всяко училище, детска градина, паралелка, ученик и дете в общините през 2026 г.: ${rows.length} единни разходни стандарта и норматива за делегираните от държавата дейности в образованието, с броя, по който се прилагат в цялата страна. Например неспециализирано училище получава 44 500 € за институцията, 9 438 € на паралелка и 1 859 € на ученик. Общините ги разпределят между училищата и детските градини по свои формули (вижте Пловдив).`,
      `How much the state pays municipalities for each school, kindergarten, class, pupil and child in 2026: ${rows.length} uniform cost standards for the education the state delegates to municipalities, with the national count each is applied to. A general school, for example, gets €44,500 for the institution, €9,438 per class and €1,859 per pupil. Municipalities share the money among their schools and kindergartens by formulas of their own (see Plovdiv).`,
    ),
    sources: [
      {
        name: t(
          'РМС № 497 от 03.07.2026 г. за приемане на стандарти за делегираните от държавата дейности с натурални и стойностни показатели през 2026 г., приложение № 2, раздел III „Образование“',
          'Council of Ministers decision 497 of 3 Jul 2026 on the standards of state-delegated activities with natural and value indicators in 2026, annex 2, section III “Education”',
        ),
        url: 'https://strategy.bg/download/1323211',
      },
    ],
    caveats: [
      t(
        'Стандартите по броя, с който са отпечатани, дават 2,78 млрд. € — 95% от 2,91 млрд. €, които Законът за държавния бюджет за 2026 г. дава на общините за образование (чл. 52); останалото са суми без стандарт на единица (защитени училища и детски градини, частни детски градини и училища, центрове за подкрепа за личностно развитие …) и стандарти, отпечатани без брой.',
        'The standards times the counts printed with them come to €2.78 bn — 95% of the €2.91 bn the 2026 State Budget Act gives municipalities for education (art. 52); the rest are sums without a per-unit standard (protected schools and kindergartens, private kindergartens and schools, centres for personal development …) and standards printed without a count.',
      ),
      t('Имената на стандартите са такива, каквито са в решението.', 'The names of the standards are as the decision prints them.'),
    ],
    asOf: '2026-07-03',
    retrieved: '2026-10-06',
    unit: { one: t('стандарт', 'standard'), other: t('стандарта', 'standards') },
    summary: ['amount'],
    sort: '-amount',
    links: [
      {
        family: 'functions',
        column: 'node',
        years: [2026],
        stages: ['law'],
        value: 'amount',
        label: t('за 2026 г.', 'for 2026'),
        text: t('Единните разходни стандарти за 2026 г.: {count}', 'The uniform cost standards for 2026: {count}'),
      },
    ],
    columns: [
      { id: 'id', type: 'code', label: t('№', 'No.'), hidden: true },
      { id: 'standard', type: 'text', label: t('Стандарт', 'Standard'), search: true },
      { id: 'section', type: 'category', label: t('Вид', 'Kind'), filter: true, ordered: true, labels: STANDARD_SECTIONS },
      { id: 'measure', type: 'category', label: t('На', 'Per'), labels: MEASURES },
      { id: 'euro', type: 'money', label: t('Стандарт на единица', 'Standard per unit') },
      { id: 'count', type: 'number', label: t('Брой в страната', 'National count') },
      { id: 'amount', type: 'money', label: t('Стандарт × брой', 'Standard × count'), total: true },
      { id: 'node', type: 'node', label: t('В бюджета', 'In the budget'), family: 'functions', dataset: budget.id, hidden: true, labels: nodeLabels(budget, [node]) },
    ],
    key: 'id',
    rows,
  }
}

export function buildCityLists(config: { dir: URL; datasets: Dataset[] }): ListSpec[] {
  return [plovdivSchools(config.dir, config.datasets), educationStandards(config.dir, config.datasets)]
}
