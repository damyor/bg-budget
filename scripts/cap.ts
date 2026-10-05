// Farm subsidies (the EU's common agricultural policy and national aid, paid by the State Fund Agriculture)
// as lists, from the extracts in data/sources/cap/ (made by scripts/extract/cap.py, see the folder's README):
//   cap-measures        what the fund paid by measure (intervention) and financial year
//   cap-recipients      by financial year: every legal entity that received €25,000 or more, and the rest
//                       summed by place — natural persons and sole traders never by name
//   cap-municipalities  what recipients in each municipality received, financial years 2024–2025
// Linked from each municipality (financial year 2024 → "Municipalities 2024", 2025 → 2025). None of it
// becomes tree nodes: the budget's agriculture spending counts this money in its own way (see the caveats).

import type { Dataset, ListCell, ListColumn, ListLinkSpec, LocalizedText } from '../src/lib/types.ts'
import { BENEFICIARY_CLASSES, beneficiaryClass } from './lib/beneficiaries.ts'
import { readCsv } from './lib/csv.ts'
import { BGN_PER_EUR } from './lib/kfp.ts'
import { nodeLabels, type ListSpec } from './lib/lists.ts'
import { provinceKey, provinceName, type Register } from './lib/places.ts'
import { EU_FUNDS } from './eufunds.ts'

const t = (bg: string, en: string): LocalizedText => ({ bg, en })

const SOURCE_EGOV = {
  name: t(
    'Държавен фонд „Земеделие“ — данни за изплатени субсидии за 2015–2017 и 2021–2023 финансови години (data.egov.bg, организация 56)',
    'State Fund Agriculture — subsidies paid in the financial years 2015–2017 and 2021–2023 (data.egov.bg, organisation 56)',
  ),
  url: 'https://data.egov.bg/data/view/a83031b1-0171-4efa-b4df-a2538a34ca34',
}
const SOURCE_APEX = {
  name: t(
    'Държавен фонд „Земеделие“ — данни за изплатени субсидии за финансова година (2024 и 2025), seu.dfz.bg',
    'State Fund Agriculture — subsidies paid by financial year (2024 and 2025), seu.dfz.bg',
  ),
  url: 'https://seu.dfz.bg/seu/f?p=727:8110',
}

const KINDS: Record<string, LocalizedText> = {
  direct: t('Директни плащания (ЕФГЗ)', 'Direct payments (EAGF)'),
  market: t('Пазарни мерки (ЕФГЗ)', 'Market measures (EAGF)'),
  rural: t('Развитие на селските райони (ЕЗФРСР и съфинансиране)', 'Rural development (EAFRD and co-financing)'),
  national: t('Национална и държавна помощ', 'National and state aid'),
}

const euro = (bgn: string) => Math.round(Number(bgn) / BGN_PER_EUR)

/** "2025" → "финансовата 2025 г. (16.10.2024–15.10.2025)" / "financial year 2025 (16 Oct 2024 – 15 Oct 2025)". */
const fyText = (fy: number) => t(`финансовата ${fy} г. (16.10.${fy - 1}–15.10.${fy})`, `financial year ${fy} (16 Oct ${fy - 1} – 15 Oct ${fy})`)

const COMMON_CAVEATS: LocalizedText[] = [
  t(
    'Финансовата година на фонда е от 16 октомври до 15 октомври (2025 = 16.10.2024–15.10.2025). Сумите са изплатеното през нея (касово), по данните на фонда; данни за 2018–2020 финансови години не са публикувани (за 2020 г. порталът data.egov.bg има запис, но без данни).',
    'The fund’s financial year runs from 16 October to 15 October (2025 = 16 Oct 2024 – 15 Oct 2025). Amounts are what was paid in it (cash), as the fund reports; no data for the financial years 2018–2020 are published (data.egov.bg has an entry for 2020 but no data behind it).',
  ),
  t(
    'Това не е част от кръговата диаграма. Европейските директни плащания, пазарните мерки и развитието на селските райони заедно с националното съфинансиране и помощи минават през различни бюджети и не съвпадат с функция „Селско стопанство“ в „Разходи“, която се отчита по календарни години.',
    'This is not part of the donut. The EU direct payments, market measures and rural development, with national co-financing and aid, pass through several budgets and do not match the agriculture function in “Spending”, which is reported by calendar year.',
  ),
  t(
    'Физическите лица (земеделските производители) и едноличните търговци (чието име съдържа името на собственика) никога не се показват по име: за всяко място и година има по един ред с броя им и общата сума. Юридическите лица (фирми, кооперации, сдружения, общини …) са поименно, ако са получили поне 25 000 € през годината; останалите са един ред за мястото.',
    'Natural persons (farmers) and sole traders (whose firm name contains the owner’s name) are never shown by name: each place and year has one row with how many there are and their total. Legal entities (companies, cooperatives, associations, municipalities …) are named when they received at least €25,000 in the year; the others are one row for their place.',
  ),
  t(
    'До 2023 г. данните дават само областта; от 2024 г. и общината (по адреса на получателя, не по мястото на земята или стопанството). До 2023 г. юридическите лица се разпознават по ЕИК; от 2024 г. ЕИК не е публикуван, а физическите лица са тези с отделно фамилно име.',
    'Until 2023 the data give only the province; from 2024 also the municipality (the recipient’s address, not where the land or farm is). Until 2023 legal entities are recognised by their ЕИК; from 2024 no ЕИК is published, and natural persons are those with a separate surname.',
  ),
  t(
    'Сумите са в лева в източника (и за 2025 г.) и са превърнати в евро по фиксирания курс 1,95583 лв. за 1 €.',
    'Amounts are in leva in the source (2025 too) and are converted to euro at the fixed rate of 1.95583 leva per euro.',
  ),
  t(
    'Фондът публикува данните по Регламент (ЕС) 2021/2116 (чл. 98–99) и ги е поставил на data.egov.bg при условия „Признание“ (CC BY); тук са използвани с посочване на източника.',
    'The fund publishes these data under Regulation (EU) 2021/2116 (Art. 98–99) and has put them on data.egov.bg under “Attribution” terms (CC BY); they are used here with the source named.',
  ),
]

// ---------- by measure ----------

function measuresList(dir: URL): ListSpec {
  const rows = readCsv(new URL('cap-measures.csv', dir))
  const years = [...new Set(rows.map((r) => Number(r.fy)))].sort()
  const periods = years.map(String)
  // One row per measure, across the years it was paid in.
  const byMeasure = new Map<string, { code: string; measure: string; kind: string; amounts: Map<number, number>; recipients: Map<number, number> }>()
  for (const r of rows) {
    const key = `${r.code}|${r.measure}`
    const m = byMeasure.get(key) ?? { code: r.code, measure: r.measure, kind: r.kind, amounts: new Map(), recipients: new Map() }
    m.amounts.set(Number(r.fy), (m.amounts.get(Number(r.fy)) ?? 0) + Number(r.total_BGN))
    m.recipients.set(Number(r.fy), (m.recipients.get(Number(r.fy)) ?? 0) + Number(r.recipients))
    byMeasure.set(key, m)
  }
  const out: ListCell[][] = [...byMeasure.values()].map((m, i) => [
    i.toString(36),
    m.measure,
    m.code || null,
    m.kind,
    years.map((y) => (m.amounts.has(y) ? Math.round(m.amounts.get(y)! / BGN_PER_EUR) : null)),
    years.map((y) => m.recipients.get(y) ?? null),
  ])
  const latest = years.at(-1)!
  const columns: ListColumn[] = [
    { id: 'id', type: 'code', label: t('Ред', 'Row'), hidden: true },
    { id: 'measure', type: 'text', label: t('Мярка или интервенция', 'Measure or intervention'), search: true },
    { id: 'code', type: 'code', label: t('Код', 'Code'), search: true, detail: true },
    { id: 'kind', type: 'category', label: t('Вид', 'Type'), filter: true, labels: KINDS },
    { id: 'amount', type: 'series', label: t('Изплатено през финансовата година', 'Paid in the financial year'), periods, total: true, source: t('ДФ „Земеделие“, изплатени субсидии', 'State Fund Agriculture, subsidies paid') },
    { id: 'recipients', type: 'series', label: t('Получатели', 'Recipients'), periods, unit: 'count', detail: true },
  ]
  return {
    id: 'cap-measures',
    group: EU_FUNDS.id,
    title: t('Земеделски субсидии по мерки', 'Farm subsidies by measure'),
    short: t('Земеделие: мерки', 'Farming: measures'),
    description: t(
      `Какво е изплатил Държавен фонд „Земеделие“ по всяка мярка на Общата селскостопанска политика и на националната помощ за земеделието във финансовите години ${years.join(', ')}: директни плащания, пазарни мерки, развитие на селските райони и национална помощ.`,
      `What the State Fund Agriculture paid under each measure of the common agricultural policy and of national aid to farming in the financial years ${years.join(', ')}: direct payments, market measures, rural development and national aid.`,
    ),
    sources: [SOURCE_EGOV, SOURCE_APEX],
    caveats: [
      t(
        'Мерките се сменят: до 2023 г. са тези на програмния период 2014–2020 (СЕПП, зелени директни плащания, мерките на Програмата за развитие на селските райони), от 2024 г. — интервенциите на Стратегическия план 2023–2027 (с код), заедно с плащанията по старите мерки. Затова повечето редове имат суми само за някои години. Имената са както са в данните на фонда.',
        'The measures change: until 2023 they are those of the 2014–2020 period (single area payment, green direct payments, the Rural Development Programme’s measures), from 2024 the interventions of the 2023–2027 Strategic Plan (with a code), along with payments under the old measures. That is why most rows have amounts in some years only. Names are as in the fund’s data.',
      ),
      t(
        'До 2023 г. данните не съдържат държавните помощи извън Общата селскостопанска политика (напр. отстъпката от акциза върху газьола); от 2024 г. ги съдържат. Сборовете по години затова не са напълно сравними. Видът на мярката е определен по фонда, от който е платена (ЕФГЗ, ЕЗФРСР с национално съфинансиране, само национален бюджет), и по името ѝ.',
        'Until 2023 the data do not include state aid outside the common agricultural policy (e.g. the excise refund on diesel); from 2024 they do. Totals by year are therefore not fully comparable. A measure’s type follows the fund it was paid from (EAGF, EAFRD with national co-financing, national budget alone) and its name.',
      ),
      ...COMMON_CAVEATS.filter((_, i) => i !== 2 && i !== 3),
    ],
    asOf: `${latest}-10-15`,
    retrieved: '2026-10-05',
    unit: { one: t('мярка', 'measure'), other: t('мерки', 'measures') },
    summary: periods.map((p) => `amount.${p}`),
    sort: `-amount.${latest}`,
    columns,
    key: 'id',
    titleColumn: 'measure',
    rows: out,
  }
}

// ---------- recipients ----------

type Kind = 'legal' | 'sole-trader' | 'person'

function recipientsList(dir: URL, datasets: Dataset[], register: Register): { recipients: ListSpec; municipalities: ListSpec } {
  const listed = readCsv(new URL('cap-recipients.csv', dir))
  const places = readCsv(new URL('cap-places.csv', dir))
  const years = [...new Set(places.map((r) => Number(r.fy)))].sort()
  const target = datasets.find((d) => d.id === 'municipalities-2026')
  if (!target) throw new Error('cap: no municipalities-2026 dataset')
  const byCode = new Map(register.all.map((m) => [m.code, m]))
  const provinceOf = new Map(register.all.map((m) => [m.province, provinceKey(m.province)]))
  const placeOf = (r: Record<string, string>) => {
    const m = r.ebk_code ? byCode.get(r.ebk_code) : undefined
    if (r.ebk_code && !m) throw new Error(`cap: unknown municipality ${r.ebk_code}`)
    const province = provinceOf.get(r.province)
    if (!province) throw new Error(`cap: unknown province ${r.province}`)
    return { municipality: m?.key ?? null, province }
  }
  const count = (n: number, lang: 'bg' | 'en') => new Intl.NumberFormat(lang === 'bg' ? 'bg-BG' : 'en-GB').format(n)
  const rows: ListCell[][] = []
  const money = (r: Record<string, string>) => [euro(r.total_BGN), euro(r.eagf_BGN), euro(r.rural_BGN), euro(r.national_BGN)]
  for (const r of listed) {
    const place = placeOf(r)
    rows.push([`${r.fy}-${rows.length.toString(36)}`, r.name, r.eik || null, beneficiaryClass(r.name), r.fy, place.province, place.municipality, ...money(r), 1])
  }
  // Everyone else, by place: natural persons, sole traders and the legal entities under the threshold.
  const listedBy = new Map<string, { n: number; sums: number[] }>()
  for (const r of listed) {
    const key = `${r.fy}|${r.province}|${r.ebk_code}`
    const a = listedBy.get(key) ?? { n: 0, sums: [0, 0, 0, 0] }
    a.n++
    ;['total_BGN', 'eagf_BGN', 'rural_BGN', 'national_BGN'].forEach((c, i) => (a.sums[i] += Number(r[c])))
    listedBy.set(key, a)
  }
  const GROUP: Record<Kind, { cls: string; name: (n: number) => LocalizedText }> = {
    person: { cls: 'pe', name: (n) => t(`Физически лица (${count(n, 'bg')})`, `Natural persons (${count(n, 'en')})`) },
    'sole-trader': { cls: 'st', name: (n) => t(`Еднолични търговци (${count(n, 'bg')})`, `Sole traders (${count(n, 'en')})`) },
    legal: { cls: 'sm', name: (n) => t(`Други юридически лица, всяко под 25 000 € (${count(n, 'bg')})`, `Other legal entities, each under €25,000 (${count(n, 'en')})`) },
  }
  const municipal = new Map<string, { total: number[]; kinds: Record<Kind, number[]>; recipients: number[] }>()
  for (const r of places) {
    const kind = r.kind as Kind
    const place = placeOf(r)
    let n = Number(r.recipients)
    let sums = ['total_BGN', 'eagf_BGN', 'rural_BGN', 'national_BGN'].map((c) => Number(r[c]))
    if (kind === 'legal') {
      const done = listedBy.get(`${r.fy}|${r.province}|${r.ebk_code}`)
      if (done) {
        n -= done.n
        sums = sums.map((v, i) => v - done.sums[i])
      }
    }
    if (place.municipality) {
      const y = years.indexOf(Number(r.fy))
      const m = municipal.get(place.municipality) ?? { total: years.map(() => 0), kinds: { legal: years.map(() => 0), 'sole-trader': years.map(() => 0), person: years.map(() => 0) }, recipients: years.map(() => 0) }
      m.total[y] += Number(r.total_BGN)
      m.kinds[kind][y] += Number(r.total_BGN)
      m.recipients[y] += Number(r.recipients)
      municipal.set(place.municipality, m)
    }
    if (n <= 0) continue
    const [total, eagf, rural, national] = sums.map((v) => Math.round(v / BGN_PER_EUR))
    rows.push([`${r.fy}-${rows.length.toString(36)}`, GROUP[kind].name(n), null, GROUP[kind].cls, r.fy, place.province, place.municipality, total, eagf, rural, national, n])
  }
  const provinces = new Map(register.all.map((m) => [provinceKey(m.province), provinceName(m.province)]))
  const classes = { ...BENEFICIARY_CLASSES, sm: t('Юридически лица под 25 000 € (сбор)', 'Legal entities under €25,000 (summed)') }
  const municipalYears = years.filter((y) => places.some((r) => Number(r.fy) === y && r.ebk_code))
  const municipalityYears = new Set(datasets.filter((d) => d.family === 'municipalities').map((d) => d.year))
  const links: ListLinkSpec[] = municipalYears
    .filter((y) => municipalityYears.has(y))
    .map((year) => ({
      family: 'municipalities',
      column: 'municipality',
      years: [year],
      filters: { fy: String(year) },
      value: 'total',
      label: fyText(year),
      text: t(`Земеделски субсидии за получатели в общината: {total} през ${fyText(year).bg}`, `Farm subsidies to recipients in the municipality: {total} in ${fyText(year).en}`),
    }))
  const latest = years.at(-1)!
  const named = listed.filter((r) => Number(r.fy) === latest)
  const recipients: ListSpec = {
    id: 'cap-recipients',
    group: EU_FUNDS.id,
    title: t('Кой получава земеделски субсидии', 'Who gets farm subsidies'),
    short: t('Земеделие: получатели', 'Farming: recipients'),
    description: t(
      `Получателите на субсидии от Държавен фонд „Земеделие“ във всяка финансова година (${years.join(', ')}): поименно всяко юридическо лице — фирма, кооперация, сдружение, община — получило поне 25 000 € (през ${latest} г. — ${count(named.length, 'bg')}), а останалите — физическите лица, едноличните търговци и по-малките юридически лица — с броя и сумата си за всяка община (до 2023 г. — за всяка област).`,
      `The recipients of subsidies from the State Fund Agriculture in each financial year (${years.join(', ')}): by name, every legal entity — company, cooperative, association, municipality — that received at least €25,000 (${count(named.length, 'en')} in ${latest}), and the others — natural persons, sole traders and smaller legal entities — as a count and a total for each municipality (until 2023, for each province).`,
    ),
    sources: [SOURCE_EGOV, SOURCE_APEX],
    caveats: COMMON_CAVEATS,
    asOf: `${latest}-10-15`,
    retrieved: '2026-10-05',
    unit: { one: t('ред', 'row'), other: t('реда', 'rows') },
    summary: ['total'],
    sort: '-total',
    links,
    columns: [
      { id: 'k', type: 'code', label: t('Ред', 'Row'), hidden: true },
      { id: 'name', type: 'text', label: t('Получател', 'Recipient'), search: true },
      { id: 'eik', type: 'code', label: t('ЕИК', 'Company number (ЕИК)'), search: true, detail: true },
      { id: 'cls', type: 'category', label: t('Вид получател', 'Type of recipient'), filter: true, labels: classes },
      { id: 'fy', type: 'category', label: t('Финансова година', 'Financial year'), filter: true, labels: Object.fromEntries(years.map((y) => [String(y), t(String(y), String(y))])) },
      { id: 'province', type: 'category', label: t('Област', 'Province'), filter: true, labels: Object.fromEntries(provinces) },
      { id: 'municipality', type: 'node', label: t('Община', 'Municipality'), family: 'municipalities', dataset: target.id, filter: true, labels: nodeLabels(target, new Set(rows.flatMap((r) => (r[6] ? [r[6] as string] : [])))) },
      { id: 'total', type: 'money', label: t('Получено през годината', 'Received in the year'), total: true, source: t('ДФ „Земеделие“, изплатени субсидии (всички фондове)', 'State Fund Agriculture, subsidies paid (all funds)') },
      { id: 'eagf', type: 'money', label: t('ЕФГЗ (директни плащания и пазарни мерки)', 'EAGF (direct payments and market measures)'), total: true, detail: true },
      { id: 'rural', type: 'money', label: t('Развитие на селските райони (ЕЗФРСР и съфинансиране)', 'Rural development (EAFRD and co-financing)'), total: true, detail: true },
      { id: 'national', type: 'money', label: t('Национална и държавна помощ', 'National and state aid'), total: true, detail: true },
      { id: 'recipients', type: 'number', label: t('Брой получатели', 'Recipients'), total: true, detail: true },
    ],
    key: 'k',
    titleColumn: 'name',
    rows,
    shardBy: 'fy',
    shardFilters: ['municipality', 'province'],
  }
  const periods = municipalYears.map(String)
  const mrows: ListCell[][] = [...municipal].map(([id, m]) => {
    const place = register.all.find((p) => p.key === id)!
    const pick = (v: number[]) => municipalYears.map((y) => Math.round(v[years.indexOf(y)] / BGN_PER_EUR))
    return [id, id, provinceKey(place.province), pick(m.total), pick(m.kinds.legal), pick(m.kinds['sole-trader']), pick(m.kinds.person), municipalYears.map((y) => m.recipients[years.indexOf(y)])]
  })
  const municipalities: ListSpec = {
    id: 'cap-municipalities',
    group: EU_FUNDS.id,
    title: t('Земеделски субсидии по общини', 'Farm subsidies by municipality'),
    short: t('Земеделие: общини', 'Farming: municipalities'),
    description: t(
      `Колко са получили от Държавен фонд „Земеделие“ получателите с адрес във всяка община през финансовите ${municipalYears.join(' и ')} г. — юридическите лица, едноличните търговци и физическите лица. Отворете община, за да видите получателите ѝ.`,
      `What recipients with an address in each municipality received from the State Fund Agriculture in the financial years ${municipalYears.join(' and ')} — legal entities, sole traders and natural persons. Open a municipality to see its recipients.`,
    ),
    sources: [SOURCE_APEX],
    caveats: COMMON_CAVEATS,
    asOf: `${latest}-10-15`,
    retrieved: '2026-10-05',
    unit: { one: t('община', 'municipality'), other: t('общини', 'municipalities') },
    summary: periods.map((p) => `total.${p}`),
    sort: `-total.${latest}`,
    columns: [
      { id: 'id', type: 'code', label: t('Община', 'Municipality'), hidden: true },
      { id: 'municipality', type: 'node', label: t('Община', 'Municipality'), family: 'municipalities', dataset: target.id, labels: nodeLabels(target, municipal.keys()) },
      { id: 'province', type: 'category', label: t('Област', 'Province'), filter: true, labels: Object.fromEntries(provinces) },
      { id: 'total', type: 'series', label: t('Получено през финансовата година', 'Received in the financial year'), periods, total: true, source: SOURCE_APEX.name },
      { id: 'legal', type: 'series', label: t('Юридически лица', 'Legal entities'), periods, total: true, detail: true, section: t('Кой е получил', 'Who received it') },
      { id: 'soleTraders', type: 'series', label: t('Еднолични търговци', 'Sole traders'), periods, total: true, detail: true },
      { id: 'persons', type: 'series', label: t('Физически лица', 'Natural persons'), periods, total: true, detail: true },
      { id: 'recipients', type: 'series', label: t('Брой получатели', 'Recipients'), periods, unit: 'count', total: true, detail: true },
    ],
    key: 'id',
    titleColumn: 'municipality',
    rowLink: { list: 'cap-recipients', filter: 'municipality', column: 'municipality' },
    rows: mrows,
  }
  return { recipients, municipalities }
}

export function buildCapLists(config: { dir: URL; datasets: Dataset[]; register: Register }): ListSpec[] {
  const { recipients, municipalities } = recipientsList(config.dir, config.datasets, config.register)
  return [measuresList(config.dir), recipients, municipalities]
}
