// Builds every dataset into public/data/ and writes public/data/index.json,
// plus one series file per family for comparing years (series-<family>.json),
// and the lists of things that do not add up to the budget (public/data/lists/).
//
//   npm run data              # use cached raw downloads in data/raw/
//   npm run data -- --refresh # download fresh copies first

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import type { BudgetNode, Dataset, DatasetFamily, DatasetIndexEntry, DatasetInfo, LocalizedText, SeriesFile } from '../src/lib/types.ts'
import { publicTotal } from '../src/lib/types.ts'
import { buildBudgetPlan, type PlanDetails } from './budgetPlan.ts'
import { buildBudgetReport } from './budgetReport.ts'
import { buildCapLists } from './cap.ts'
import { buildEuFundsLists, EU_FUNDS } from './eufunds.ts'
import { buildEurostatDataset } from './eurostat.ts'
import { buildHealthLists, HEALTH, hospitalCare, readHospitals } from './health.ts'
import { readKfpPlan, readKfpTotals } from './lib/kfp.ts'
import { checkLinks, checkList, datasetLinks, writeLists } from './lib/lists.ts'
import { loadMacro } from './lib/macro.ts'
import { buildMinistries } from './ministries.ts'
import { buildMunicipalities } from './municipalities.ts'
import { buildPaymentLists, PAYMENTS } from './payments.ts'
import { buildProcurementLists, PROCUREMENT } from './procurement.ts'
import { buildProjectLists, PROJECTS } from './projects.ts'
import { readRegister } from './lib/places.ts'
import { unmaskedIds } from './lib/sebra.ts'

const OUT_DIR = new URL('../public/data/', import.meta.url)
const SOURCES = new URL('../data/sources/', import.meta.url)
const refresh = process.argv.includes('--refresh')
const t = (bg: string, en: string): LocalizedText => ({ bg, en })

/** Children may differ from their parent by rounding only (0.5% or €1 m). */
function validate(dataset: Dataset): string[] {
  const problems: string[] = []
  const ids = new Set<string>()
  const walk = (node: BudgetNode, path: string) => {
    if (ids.has(node.id)) problems.push(`duplicate id ${node.id}`)
    ids.add(node.id)
    if (!(node.value > 0)) problems.push(`${path}: non-positive value ${node.value}`)
    if (!node.children?.length) return
    const sum = node.children.reduce((s, c) => s + c.value, 0)
    const diff = Math.abs(sum - node.value)
    if (diff > Math.max(1_000_000, node.value * 0.005)) {
      problems.push(`${path}: children sum ${sum} vs ${node.value}`)
    }
    for (const child of node.children) walk(child, `${path} › ${child.name.en}`)
  }
  walk(dataset.root, dataset.id)
  if (!(dataset.gdp > 0)) problems.push('no GDP')
  return problems
}

const macro = await loadMacro(refresh)
const src = (path: string) => new URL(path, SOURCES)
const totalsFile = src('kfp/kfp-totals.csv')
const mtbf2025 = src('kfp/mtbf-2025-2028-by-function.csv')
const kfp2026 = src('budget-2026/kfp-2026-by-function.csv')
const municipalRegister = src('places/municipalities.csv')
const healthDir = src('health/')
// Every establishment the Health Insurance Fund pays for hospital care, 2024 – August 2026 (scripts/health.ts).
const hospitals = readHospitals(healthDir, readRegister(municipalRegister))

const LEVA = t('Сумите са превърнати от лева в евро по фиксирания курс 1,95583 лв. за 1 €.', 'Amounts are converted from leva to euro at the fixed rate of 1.95583 leva per euro.')
const MOTIVES_2025 = {
  name: t(
    'Мотиви към законопроекта за държавния бюджет за 2025 г. и актуализирана средносрочна прогноза 2025–2028 (РМС № 88/24.02.2025)',
    'Explanatory memorandum to the 2025 State Budget bill and updated medium-term forecast 2025–2028 (Council of Ministers decision 88/2025)',
  ),
  url: 'https://www.strategy.bg/bg/pris/legal-information/reseniia/166337',
}
const REPORT_2025 = {
  name: t(
    'Отчет за изпълнението на държавния бюджет за 2025 г. и доклад към него (РМС № 737/24.09.2026)',
    'Report on the execution of the 2025 State Budget (Council of Ministers decision 737/2026)',
  ),
  url: 'https://www.strategy.bg/bg/pris/legal-information/reseniia/171087',
}
const REPORT_2024 = {
  name: t(
    'Отчет за изпълнението на държавния бюджет за 2024 г. и доклад към него (РМС № 673/26.09.2025)',
    'Report on the execution of the 2024 State Budget (Council of Ministers decision 673/2025)',
  ),
  url: 'https://www.strategy.bg/bg/pris/legal-information/reseniia/167458',
}
const MTBF_2026 = {
  name: t(
    'Актуализирана средносрочна бюджетна прогноза 2026–2028 (РМС № 597/2026) — консолидирана фискална програма по функции',
    'Updated medium-term budget forecast 2026–2028 (Council of Ministers decision 597/2026) — consolidated fiscal programme by function',
  ),
  url: 'https://www.minfin.bg/bg/1770',
}

const details2026: PlanDetails = {
  dir: src('budget-2026/'),
  unit: 'kEUR',
  nhif: { file: 'nhif-2026-tables.csv', citation: t('ДВ, бр. 68 от 2026 г.', 'State Gazette 68/2026') },
  socialSecurity: {
    file: 'social-security-2026-tables.csv',
    citation: t('ДВ, бр. 68 от 2026 г.', 'State Gazette 68/2026'),
    benefits: { file: 'social-security-2026-benefits.csv', unit: 'mEUR', citation: t('мотивите към законопроекта', 'the explanatory memorandum to the bill') },
  },
  municipal: { file: 'municipal-delegated-2026.csv', article: t('чл. 52', 'Art. 52'), register: municipalRegister },
  universities: {
    file: 'transfers-universities-media.csv',
    column: '2026 г.',
    unit: 'kEUR',
    institutions: { file: 'state-budget-2026-university-transfers.csv', article: t('чл. 16, ал. 4', 'Art. 16(4)') },
  },
}

const details2024: PlanDetails = {
  dir: src('budget-2024/'),
  unit: 'kBGN',
  nhif: { file: 'nhif-2024-tables.csv', citation: t('ДВ, бр. 106 от 2023 г.', 'State Gazette 106/2023') },
  socialSecurity: {
    file: 'social-security-2024-tables.csv',
    citation: t('ДВ, бр. 106 от 2023 г.', 'State Gazette 106/2023'),
    benefits: { file: 'social-security-2024-benefits.csv', unit: 'mBGN', citation: t('мотивите към законопроекта', 'the explanatory memorandum to the bill') },
  },
  municipal: { file: 'municipal-delegated-2024.csv', article: t('чл. 54', 'Art. 54'), register: municipalRegister },
  universities: { file: 'transfers-universities-2024.csv', column: '2024 г.', unit: 'kBGN' },
}

const details2025: PlanDetails = {
  dir: src('budget-2025/'),
  unit: 'kBGN',
  nhif: { file: 'nhif-2025-tables.csv', citation: t('ДВ, бр. 25 от 2025 г.', 'State Gazette 25/2025') },
  socialSecurity: {
    file: 'social-security-2025-tables.csv',
    citation: t('ДВ, бр. 25 от 2025 г.', 'State Gazette 25/2025'),
    benefits: { file: 'social-security-2025-benefits.csv', unit: 'mBGN', citation: t('мотивите към законопроекта', 'the explanatory memorandum to the bill') },
  },
  municipal: { file: 'municipal-delegated-2025.csv', article: t('чл. 54', 'Art. 54'), register: municipalRegister },
  universities: { file: 'transfers-universities-2025.csv', column: '2025 г.', unit: 'kBGN' },
}

const DETAILS_NOTE = t(
  'По-подробните нива идват от законите за бюджета на НЗОК и ДОО и от разпределението на средствата за общините в Закона за държавния бюджет.',
  'Deeper levels come from the health insurance and social security budget acts and the municipal allocations in the State Budget Act.',
)

const lawSources = (year: number, ids: { zdb: number; doo: number; nhif: number }, gazette: { zdb: LocalizedText; funds: LocalizedText }) => [
  {
    name: t(`Закон за държавния бюджет на Република България за ${year} г. (${gazette.zdb.bg})`, `State Budget Act ${year} (${gazette.zdb.en})`),
    url: `https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=${ids.zdb}`,
  },
  {
    name: t(`Закон за бюджета на НЗОК за ${year} г. (${gazette.funds.bg})`, `Health Insurance Fund Budget Act ${year} (${gazette.funds.en})`),
    url: `https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=${ids.nhif}`,
  },
  {
    name: t(`Закон за бюджета на ДОО за ${year} г. (${gazette.funds.bg}) и мотиви към законопроекта`, `Social Security Budget Act ${year} (${gazette.funds.en}) and the bill’s explanatory memorandum`),
    url: `https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=${ids.doo}`,
  },
]

const planDescription = (year: number, extra: LocalizedText | null, leva: boolean): LocalizedText => ({
  bg: [
    `Всички планирани публични разходи за ${year} г. — държава, общини, НОИ, НЗОК и европейски средства — по функции, плюс вноската в бюджета на ЕС.`,
    extra?.bg,
    leva ? LEVA.bg : null,
  ]
    .filter(Boolean)
    .join(' '),
  en: [
    `All planned public spending for ${year} — central government, municipalities, social security, health insurance and EU funds — by function, plus the contribution to the EU budget.`,
    extra?.en,
    leva ? LEVA.en : null,
  ]
    .filter(Boolean)
    .join(' '),
})

const budget2024 = buildBudgetPlan({
  id: 'budget-2024',
  year: 2024,
  stage: 'law',
  kfp: readKfpPlan(mtbf2025, '2024_programme_mBGN', 'mBGN'),
  totals: readKfpTotals(totalsFile, 'budget-2024'),
  details: details2024,
  macro: macro(2024),
  title: t('Бюджет 2024', 'Budget 2024'),
  subtitle: t('Консолидирана фискална програма, план', 'Consolidated fiscal programme, plan'),
  description: planDescription(2024, DETAILS_NOTE, true),
  sources: [
    MOTIVES_2025,
    ...lawSources(2024, { zdb: 202168, doo: 202043, nhif: 202042 }, { zdb: t('ДВ, бр. 108/2023', 'State Gazette 108/2023'), funds: t('ДВ, бр. 106/2023', 'State Gazette 106/2023') }),
    REPORT_2024,
  ],
  sourceShort: t('Бюджет 2024 (план) — Министерство на финансите', '2024 budget (plan) — Ministry of Finance'),
  retrieved: '2025-02-24',
  sourceCurrency: 'BGN',
})

const budget2025 = buildBudgetPlan({
  id: 'budget-2025',
  year: 2025,
  stage: 'law',
  kfp: readKfpPlan(mtbf2025, '2025_draft_mBGN', 'mBGN'),
  totals: readKfpTotals(totalsFile, 'budget-2025'),
  details: details2025,
  macro: macro(2025),
  title: t('Бюджет 2025', 'Budget 2025'),
  subtitle: t('Консолидирана фискална програма, план', 'Consolidated fiscal programme, plan'),
  description: planDescription(
    2025,
    t(
      `Бюджетът за 2025 г. е приет едва в края на март 2025 г.; разпределението по функции е от мотивите към законопроекта и съвпада с програмата, с която отчетът за 2025 г. сравнява изпълнението. ${DETAILS_NOTE.bg}`,
      `The 2025 budget was adopted only at the end of March 2025; the split by function is from the explanatory memorandum to the bill and matches the programme the 2025 report compares the outturn with. ${DETAILS_NOTE.en}`,
    ),
    true,
  ),
  sources: [
    MOTIVES_2025,
    ...lawSources(2025, { zdb: 233694, doo: 233617, nhif: 233618 }, { zdb: t('ДВ, бр. 26/2025', 'State Gazette 26/2025'), funds: t('ДВ, бр. 25/2025', 'State Gazette 25/2025') }),
    REPORT_2025,
  ],
  sourceShort: t('Бюджет 2025 (план) — Министерство на финансите', '2025 budget (plan) — Ministry of Finance'),
  retrieved: '2025-02-24',
  sourceCurrency: 'BGN',
})

const budget2026 = buildBudgetPlan({
  id: 'budget-2026',
  year: 2026,
  stage: 'law',
  kfp: readKfpPlan(kfp2026, '2026_programme_mEUR', 'mEUR'),
  totals: readKfpTotals(totalsFile, 'budget-2026'),
  details: details2026,
  macro: macro(2026),
  title: t('Бюджет 2026', 'Budget 2026'),
  subtitle: t('Консолидирана фискална програма, план', 'Consolidated fiscal programme, plan'),
  description: planDescription(
    2026,
    t(
      'По-подробните нива идват от законите за бюджета на НЗОК и ДОО и от разпределението на средствата за общините в Закона за държавния бюджет.',
      'Deeper levels come from the 2026 health insurance and social security budget acts and the municipal allocations in the State Budget Act.',
    ),
    false,
  ),
  sources: [
    MTBF_2026,
    {
      name: t('Закон за държавния бюджет на Република България за 2026 г. (ДВ, бр. 69/2026)', 'State Budget Act 2026 (State Gazette 69/2026)'),
      url: 'https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=245041',
    },
    {
      name: t('Закон за бюджета на НЗОК за 2026 г. (ДВ, бр. 68/2026)', 'Health Insurance Fund Budget Act 2026 (State Gazette 68/2026)'),
      url: 'https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=244981',
    },
    {
      name: t('Закон за бюджета на ДОО за 2026 г. (ДВ, бр. 68/2026) и мотиви към законопроекта', 'Social Security Budget Act 2026 (State Gazette 68/2026) and the bill’s explanatory memorandum'),
      url: 'https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=244982',
    },
  ],
  sourceShort: t('Бюджет 2026 (план) — Министерство на финансите, Държавен вестник', '2026 budget (plan) — Ministry of Finance, State Gazette'),
  retrieved: '2026-07-31',
  sourceCurrency: 'EUR',
})

const budget2027 = buildBudgetPlan({
  id: 'budget-2027',
  year: 2027,
  stage: 'forecast',
  kfp: readKfpPlan(kfp2026, '2027_forecast_mEUR', 'mEUR'),
  totals: readKfpTotals(totalsFile, 'budget-2027'),
  macro: macro(2027),
  title: t('Прогноза 2027', '2027 forecast'),
  subtitle: t('Средносрочна бюджетна прогноза, август 2026 г.', 'Medium-term budget forecast, August 2026'),
  description: t(
    'Прогнозата на Министерството на финансите за публичните разходи през 2027 г. по функции — от актуализираната средносрочна бюджетна прогноза 2026–2028, одобрена заедно с бюджета за 2026 г. Проектобюджетът за 2027 г. се подготвя: Министерството на финансите стартира процедурата през септември 2026 г. с цел дефицит до 3% от БВП, а Министерският съвет трябва да го внесе в Народното събрание до 31 октомври 2026 г.',
    'The Ministry of Finance forecast of public spending in 2027 by function — from the updated medium-term budget forecast 2026–2028 approved with the 2026 budget. The 2027 draft budget is in preparation: the Ministry of Finance started the procedure in September 2026 aiming for a deficit of at most 3% of GDP, and the government has to submit it to Parliament by 31 October 2026.',
  ),
  sources: [MTBF_2026],
  sourceShort: t('Прогноза за 2027 г. — Министерство на финансите (август 2026)', '2027 forecast — Ministry of Finance (August 2026)'),
  retrieved: '2026-08-06',
  sourceCurrency: 'EUR',
})

const NHIF_REPORT = {
  name: t(
    'НЗОК — отчет за текущо изпълнение на бюджета към 31.12.2025 г., приложение 1 (с изпълнението към 31.12.2024 г.)',
    'NHIF — budget execution report at 31 Dec 2025, annex 1 (with the outturn at 31 Dec 2024)',
  ),
  url: 'https://www.nhif.bg/bg/completion-reports',
}

const NHIF_HOSPITALS = (year: number) => ({
  name: t(
    `НЗОК — заплатени здравноосигурителни плащания за болнична медицинска помощ по лечебни заведения, ${year} г. (месечни отчети)`,
    `NHIF — payments for hospital care by medical establishment, ${year} (monthly reports)`,
  ),
  url: `https://www.nhif.bg/bg/hospitals/bmp/${year}`,
})

const report2024 = buildBudgetReport({
  year: 2024,
  file: src('report-2024/kfp-2024-report-by-function.csv'),
  totals: readKfpTotals(totalsFile, 'report-2024'),
  nhif: {
    file: src('report-2024/nhif-2024-report-tables.csv'),
    note: t(
      'Изпълнение на бюджета на НЗОК за 2024 г. по отчета на НЗОК. Сумите включват и трансферите за болниците на МО, МВР и МТС, затова НЗОК тук е малко по-голяма от колоната „НЗОК“ в консолидирания отчет.',
      'Execution of the 2024 NHIF budget, from the NHIF report. The lines include transfers to the defence, interior and transport ministries’ hospitals, so the fund is slightly larger here than its column in the consolidated report.',
    ),
    hospitals: (line) => hospitalCare(hospitals, 2024, line),
  },
  macro: macro(2024),
  description: t(
    `Реално изразходваните публични средства през 2024 г. — държава, общини, НОИ, НЗОК и европейски средства — по функции, с разбивка по това през чий бюджет са похарчени и дали са текущи или капиталови разходи. Данни от отчета за изпълнението на държавния бюджет за 2024 г. Болничната помощ на здравната каса е разделена по региони и болници според месечните отчети на НЗОК за платеното на всяка болница. ${LEVA.bg}`,
    `Public money actually spent in 2024 — central government, municipalities, social security, health insurance and EU funds — by function, split by whose budget it was spent through and into current and capital spending. Data from the report on the execution of the 2024 State Budget. The health fund's hospital care is split by region and hospital, from the NHIF's monthly reports of what it paid each hospital. ${LEVA.en}`,
  ),
  sources: [REPORT_2024, REPORT_2025, NHIF_REPORT, NHIF_HOSPITALS(2024)],
  sourceShort: t('Отчет за 2024 г. — Министерство на финансите', '2024 outturn — Ministry of Finance'),
  retrieved: '2025-09-26',
})

const report2025 = buildBudgetReport({
  year: 2025,
  file: src('report-2025/kfp-2025-report-by-function.csv'),
  totals: readKfpTotals(totalsFile, 'report-2025'),
  nhif: {
    file: src('report-2025/nhif-2025-report-tables.csv'),
    note: t(
      'Изпълнение на бюджета на НЗОК за 2025 г. по текущия отчет на НЗОК към 31.12.2025 г. (предварителни данни, преди окончателния отчет на Министерството на финансите). Сумите включват и трансферите за болниците на МО, МВР и МТС.',
      'Execution of the 2025 NHIF budget, from the NHIF report at 31 Dec 2025 (preliminary, before the Ministry of Finance final report). The lines include transfers to the defence, interior and transport ministries’ hospitals.',
    ),
    hospitals: (line) => hospitalCare(hospitals, 2025, line),
  },
  macro: macro(2025),
  description: t(
    `Реално изразходваните публични средства през 2025 г. — държава, общини, НОИ, НЗОК и европейски средства — по функции, с разбивка по това през чий бюджет са похарчени и дали са текущи или капиталови разходи. Данни от отчета за изпълнението на държавния бюджет за 2025 г., приет от Министерския съвет на 24.09.2026 г. (предстои да бъде разгледан от Народното събрание). Болничната помощ на здравната каса е разделена по региони и болници според месечните отчети на НЗОК за платеното на всяка болница. ${LEVA.bg}`,
    `Public money actually spent in 2025 — central government, municipalities, social security, health insurance and EU funds — by function, split by whose budget it was spent through and into current and capital spending. Data from the report on the execution of the 2025 State Budget, approved by the government on 24 September 2026 (still to be reviewed by Parliament). The health fund's hospital care is split by region and hospital, from the NHIF's monthly reports of what it paid each hospital. ${LEVA.en}`,
  ),
  sources: [REPORT_2025, NHIF_REPORT, NHIF_HOSPITALS(2025)],
  sourceShort: t('Отчет за 2025 г. — Министерство на финансите', '2025 outturn — Ministry of Finance'),
  retrieved: '2026-09-24',
})

const ministriesDescription = (year: number, units: number, leva: boolean, extra?: LocalizedText): LocalizedText => ({
  bg: [
    `Бюджетите на ${units}-те министерства и ведомства (първостепенни разпоредители) по Закона за държавния бюджет за ${year} г., по политики и функционални области.`,
    extra?.bg,
    `Не включва пенсиите (НОИ), здравната каса, общините, европейските средства, лихвите и вноската в ЕС — те са в „Бюджет ${year}“.`,
    leva ? LEVA.bg : null,
  ]
    .filter(Boolean)
    .join(' '),
  en: [
    `The budgets of the ${units} ministries and agencies (first-level spending units) in the ${year} State Budget Act, by policy and functional area.`,
    extra?.en,
    `Pensions, the health insurance fund, municipalities, EU funds, interest and the EU contribution are not included — see “Budget ${year}”.`,
    leva ? LEVA.en : null,
  ]
    .filter(Boolean)
    .join(' '),
})

const ministries2024 = buildMinistries({
  id: 'ministries-2024',
  year: 2024,
  stage: 'law',
  file: src('budget-2024/state-budget-2024-spending-units.csv'),
  unit: 'kBGN',
  publicTotal: publicTotal(budget2024),
  macro: macro(2024),
  title: t('Министерства 2024', 'Ministries 2024'),
  subtitle: t('Разходи на министерствата и ведомствата по Закона за държавния бюджет', 'Spending of ministries and agencies under the State Budget Act'),
  description: ministriesDescription(
    2024,
    48,
    true,
    t('Съдебната власт е без разбивка, защото за 2024 г. законът я разпределя по органи, а не по функционални области.', 'The judiciary has no split, as the 2024 act divides it by judicial body rather than by functional area.'),
  ),
  sources: [
    {
      name: t('Закон за държавния бюджет на Република България за 2024 г., чл. 2–49 (ДВ, бр. 108/2023)', 'State Budget Act 2024, art. 2–49 (State Gazette 108/2023)'),
      url: 'https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=202168',
    },
  ],
  sourceShort: t('Закон за държавния бюджет 2024 — министерства и ведомства', '2024 State Budget Act — ministries and agencies'),
  retrieved: '2023-12-30',
})

const PROGRAMMES_NOTE = (units: number, decree: LocalizedText): LocalizedText =>
  t(
    `За ${units} от тях (без Народното събрание и съдебната власт) — и по бюджетни програми според ${decree.bg}, а всяка програма — по ведомствени разходи (персонал, издръжка, капиталови разходи) и администрирани разходи (помощи, субсидии, вноски и други плащания, които ведомството управлява).`,
    `For ${units} of them (all but Parliament and the judiciary) also by budget programme, from ${decree.en}, and each programme by departmental spending (staff, running costs, capital) and administered spending (benefits, subsidies, contributions and other payments the body manages).`,
  )

const ministries2025 = buildMinistries({
  id: 'ministries-2025',
  year: 2025,
  stage: 'law',
  file: src('budget-2025/state-budget-2025-spending-units.csv'),
  unit: 'kBGN',
  programmes: {
    structure: src('budget-2025/state-budget-2025-programmes.csv'),
    lines: src('budget-2025/state-budget-2025-programme-lines.csv'),
    idsFrom: src('budget-2026/state-budget-2026-programmes.csv'),
  },
  publicTotal: publicTotal(budget2025),
  macro: macro(2025),
  title: t('Министерства 2025', 'Ministries 2025'),
  subtitle: t('Разходи на министерствата и ведомствата по Закона за държавния бюджет', 'Spending of ministries and agencies under the State Budget Act'),
  description: ministriesDescription(
    2025,
    48,
    true,
    PROGRAMMES_NOTE(46, t('постановлението за изпълнението на бюджета (ПМС № 28/2025)', 'the decree on implementing the budget (decree 28/2025)')),
  ),
  sources: [
    {
      name: t('Закон за държавния бюджет на Република България за 2025 г., чл. 2–49 (ДВ, бр. 26/2025)', 'State Budget Act 2025, art. 2–49 (State Gazette 26/2025)'),
      url: 'https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=233694',
    },
    {
      name: t(
        'ПМС № 28 от 16.04.2025 г. за изпълнението на държавния бюджет за 2025 г., приложение № 1 — показатели по бюджетните програми (ДВ, бр. 33/2025)',
        'Council of Ministers decree 28 of 16 Apr 2025 on implementing the 2025 State Budget, annex 1 — programme budgets (State Gazette 33/2025)',
      ),
      url: 'https://www.strategy.bg/bg/pris/legal-information/postanovleniia/165024',
    },
  ],
  sourceShort: t('Закон за държавния бюджет 2025 и ПМС № 28/2025 — министерства и програми', '2025 State Budget Act and decree 28/2025 — ministries and programmes'),
  retrieved: '2025-04-17',
})

const ministriesReport2025 = buildMinistries({
  id: 'ministries-report-2025',
  year: 2025,
  stage: 'report',
  file: src('report-2025/state-budget-2025-report-spending-units.csv'),
  unit: 'kBGN',
  publicTotal: publicTotal(report2025),
  macro: macro(2025),
  title: t('Министерства 2025 (отчет)', 'Ministries 2025 (actual)'),
  subtitle: t('Изпълнение на бюджетите на министерствата и ведомствата', 'Outturn of the ministries’ and agencies’ budgets'),
  description: t(
    `Реално изразходваното през 2025 г. от 48-те министерства и ведомства (първостепенни разпоредители), по политики и функционални области — от отчета за изпълнението на държавния бюджет за 2025 г., приет от Министерския съвет на 24.09.2026 г. Не включва пенсиите (НОИ), здравната каса, общините, европейските средства, лихвите и вноската в ЕС — те са в „Отчет 2025“. ${LEVA.bg}`,
    `What the 48 ministries and agencies (first-level spending units) actually spent in 2025, by policy and functional area — from the report on the execution of the 2025 State Budget, approved by the government on 24 September 2026. Pensions, the health insurance fund, municipalities, EU funds, interest and the EU contribution are not included — see “2025 actual”. ${LEVA.en}`,
  ),
  sources: [REPORT_2025],
  sourceShort: t('Отчет за изпълнението на държавния бюджет 2025 — министерства', '2025 State Budget outturn — ministries'),
  retrieved: '2026-09-24',
})

const ministries2026 = buildMinistries({
  id: 'ministries-2026',
  year: 2026,
  stage: 'law',
  file: src('budget-2026/state-budget-2026-spending-units.csv'),
  unit: 'kEUR',
  programmes: {
    structure: src('budget-2026/state-budget-2026-programmes.csv'),
    lines: src('budget-2026/state-budget-2026-programme-lines.csv'),
  },
  transfers: {
    file: src('budget-2026/state-budget-2026-university-transfers.csv'),
    seeAlso: {
      '1700': t(
        'Всеки университет е показан поотделно в „Бюджет 2026“ › Образование › Държавни университети (субсидия), а БАН — в Държавно управление, дълг и ЕС › Общи държавни служби › Наука.',
        'Each university is shown in “Budget 2026” › Education › State universities (subsidy), and the Academy in Government, debt & EU › General public services › Science.',
      ),
    },
  },
  publicTotal: publicTotal(budget2026),
  macro: macro(2026),
  title: t('Министерства 2026', 'Ministries 2026'),
  subtitle: t('Разходи на министерствата и ведомствата по Закона за държавния бюджет', 'Spending of ministries and agencies under the State Budget Act'),
  description: ministriesDescription(
    2026,
    46,
    false,
    PROGRAMMES_NOTE(44, t('постановлението за изпълнението на бюджета (ПМС № 102/2026)', 'the decree on implementing the budget (decree 102/2026)')),
  ),
  sources: [
    {
      name: t('Закон за държавния бюджет на Република България за 2026 г., чл. 2–47 (ДВ, бр. 69/2026)', 'State Budget Act 2026, art. 2–47 (State Gazette 69/2026)'),
      url: 'https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=245041',
    },
    {
      name: t(
        'ПМС № 102 от 12.08.2026 г. за изпълнението на държавния бюджет за 2026 г., приложение № 1 — показатели по бюджетните програми (ДВ, бр. 74/2026)',
        'Council of Ministers decree 102 of 12 Aug 2026 on implementing the 2026 State Budget, annex 1 — programme budgets (State Gazette 74/2026)',
      ),
      url: 'https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=245362',
    },
  ],
  sourceShort: t('Закон за държавния бюджет 2026 и ПМС № 102/2026 — министерства и програми', '2026 State Budget Act and decree 102/2026 — ministries and programmes'),
  retrieved: '2026-08-18',
})

const NSI_MUNICIPALITIES = {
  name: t('НСИ — Население по области, общини, местоживеене и пол (към 31 декември)', 'NSI — Population by province, municipality, place of residence and sex (on 31 December)'),
  url: 'https://www.nsi.bg/statistical-data/206/651',
}

const municipalitiesDescription = (year: number, articles: { transfers: LocalizedText; delegated: LocalizedText }, leva: boolean): LocalizedText => ({
  bg: [
    `Парите, които държавният бюджет за ${year} г. превежда на всяка от 265-те общини (${articles.transfers.bg} от Закона за държавния бюджет): обща субсидия за делегираните от държавата дейности — училища, детски градини, социални услуги, общинска администрация и др., по функции според ${articles.delegated.bg}; обща изравнителна субсидия; целева субсидия за капиталови разходи; средства за зимното поддържане на общинските пътища и целеви трансфер за минималната работна заплата.`,
    'Това са само трансферите от централния бюджет. Общините харчат и собствени приходи (местни данъци и такси) и европейски средства, които не са тук, както и пари, отпуснати през годината с решения на Министерския съвет или по Инвестиционната програма за общински проекти.',
    `Сумите на жител са спрямо населението на общината към 31 декември ${year - 1} г. (НСИ).`,
    leva ? LEVA.bg : null,
  ]
    .filter(Boolean)
    .join(' '),
  en: [
    `The money the ${year} State Budget sends to each of the 265 municipalities (${articles.transfers.en} of the State Budget Act): the general subsidy for state-delegated activities — schools, kindergartens, social services, municipal administration etc., by function as set in ${articles.delegated.en}; the general equalising subsidy; the targeted subsidy for capital spending; funds for the winter maintenance of municipal roads; and a targeted transfer for the minimum wage.`,
    'These are transfers from the central budget only. Municipalities also spend their own revenue (local taxes and fees) and EU funds, which are not here, as well as money granted during the year by government decisions or through the municipal investment programme.',
    `Amounts per resident use the municipality’s population on 31 December ${year - 1} (NSI).`,
    leva ? LEVA.en : null,
  ]
    .filter(Boolean)
    .join(' '),
})

const municipalities = (year: number, idMat: number, gazette: LocalizedText, articles: { transfers: LocalizedText; delegated: LocalizedText }, budget: Dataset, retrieved: string) =>
  buildMunicipalities({
    id: `municipalities-${year}`,
    year,
    transfers: src(`budget-${year}/municipal-transfers-${year}.csv`),
    delegated: src(`budget-${year}/municipal-delegated-${year}.csv`),
    register: municipalRegister,
    articles,
    residentsAt: year - 1,
    publicTotal: publicTotal(budget),
    macro: macro(year),
    title: t(`Общини ${year}`, `Municipalities ${year}`),
    subtitle: t('Трансфери от централния бюджет към общините', 'Transfers from the central budget to municipalities'),
    description: municipalitiesDescription(year, articles, year < 2026),
    sources: [
      {
        name: t(
          `Закон за държавния бюджет на Република България за ${year} г., ${articles.transfers.bg} и ${articles.delegated.bg} (${gazette.bg})`,
          `State Budget Act ${year}, ${articles.transfers.en} and ${articles.delegated.en} (${gazette.en})`,
        ),
        url: `https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=${idMat}`,
      },
      NSI_MUNICIPALITIES,
    ],
    sourceShort: t(`Закон за държавния бюджет ${year}, ${articles.transfers.bg} — трансфери за общините`, `${year} State Budget Act, ${articles.transfers.en} — transfers to municipalities`),
    retrieved,
  })

const ART_2024_2025 = { transfers: t('чл. 53', 'Art. 53'), delegated: t('чл. 54', 'Art. 54') }
const municipalities2024 = municipalities(2024, 202168, t('ДВ, бр. 108/2023', 'State Gazette 108/2023'), ART_2024_2025, budget2024, '2023-12-30')
const municipalities2025 = municipalities(2025, 233694, t('ДВ, бр. 26/2025', 'State Gazette 26/2025'), ART_2024_2025, budget2025, '2025-03-27')
const municipalities2026 = municipalities(
  2026,
  245041,
  t('ДВ, бр. 69/2026', 'State Gazette 69/2026'),
  { transfers: t('чл. 51', 'Art. 51'), delegated: t('чл. 52', 'Art. 52') },
  budget2026,
  '2026-07-31',
)

const datasets: Dataset[] = [
  budget2027,
  budget2026,
  ministries2026,
  municipalities2026,
  report2025,
  budget2025,
  ministries2025,
  ministriesReport2025,
  municipalities2025,
  report2024,
  budget2024,
  ministries2024,
  municipalities2024,
  await buildEurostatDataset({ macro, refresh }),
]

const index: DatasetIndexEntry[] = []
for (const dataset of datasets) {
  const problems = validate(dataset)
  if (problems.length) {
    console.error(`✗ ${dataset.id}\n  ${problems.join('\n  ')}`)
    process.exitCode = 1
  }
  const file = `${dataset.id}.json`
  writeFileSync(new URL(file, OUT_DIR), JSON.stringify(dataset))
  index.push({
    id: dataset.id,
    year: dataset.year,
    kind: dataset.kind,
    stage: dataset.stage,
    family: dataset.family,
    title: dataset.title,
    subtitle: dataset.subtitle,
    file,
    total: dataset.root.value,
    publicTotal: publicTotal(dataset),
    gdp: dataset.gdp,
    population: dataset.population,
  })
  const pct = ((publicTotal(dataset) / dataset.gdp) * 100).toFixed(1)
  console.log(`✓ ${dataset.id}: €${(dataset.root.value / 1e9).toFixed(2)} bn (${pct}% of GDP) → public/data/${file}`)
}

// ---------- series for comparing years ----------

const STAGE_ORDER = ['law', 'draft', 'forecast', 'report']
const FAMILY_ORDER: DatasetFamily[] = ['functions', 'ministries', 'municipalities', 'cofog']
const chronological = (a: Dataset, b: Dataset) => a.year - b.year || STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage)

function buildSeries(family: DatasetFamily, members: Dataset[]): SeriesFile {
  const ordered = [...members].sort(chronological)
  const values: SeriesFile['values'] = {}
  const nodes: SeriesFile['nodes'] = {}
  ordered.forEach((dataset, i) => {
    const walk = (node: BudgetNode, parent: string | null) => {
      ;(values[node.id] ??= ordered.map(() => null))[i] = node.value
      nodes[node.id] = { parent, name: node.name }
      node.children?.forEach((c) => walk(c, node.id))
    }
    walk(dataset.root, null)
  })
  for (const id of Object.keys(values)) {
    if (values[id].filter((v) => v !== null).length < 2) {
      delete values[id]
      delete nodes[id]
    }
  }
  return { family, datasets: ordered.map((d) => d.id), values, nodes }
}

for (const family of FAMILY_ORDER) {
  const members = datasets.filter((d) => d.family === family)
  if (members.length < 2) continue
  const series = buildSeries(family, members)
  writeFileSync(new URL(`series-${family}.json`, OUT_DIR), JSON.stringify(series))
  console.log(`✓ series-${family}: ${series.datasets.length} datasets, ${Object.keys(series.values).length} comparable nodes`)
}

// ---------- lists: projects, payments, hospitals and medicines, EU funds, procurement contracts, linked from the tree nodes they belong to ----------

const lists = [
  ...buildProjectLists({ dir: src('projects/'), register: municipalRegister, datasets }),
  ...buildPaymentLists({ dir: src('sebra/'), datasets, register: readRegister(municipalRegister) }),
  ...buildHealthLists({ dir: healthDir, hospitals, datasets }),
  ...buildEuFundsLists({ dir: src('eu-funds/'), datasets, register: readRegister(municipalRegister) }),
  ...buildCapLists({ dir: src('cap/'), datasets, register: readRegister(municipalRegister) }),
  ...buildProcurementLists({
    dir: src('procurement/'),
    datasets,
    register: readRegister(municipalRegister),
    payees: src('sebra/payees.csv.gz'),
    projects: src('eu-funds/projects.csv.gz'),
  }),
]
for (const list of lists) {
  const problems = checkList(list, datasets)
  if (problems.length) {
    console.error(`✗ list ${list.id}\n  ${problems.slice(0, 20).join('\n  ')}`)
    process.exitCode = 1
  }
}
const { index: listIndex, written } = writeLists(OUT_DIR, [PROJECTS, PAYMENTS, HEALTH, EU_FUNDS, PROCUREMENT], lists)
for (const list of listIndex.lists) console.log(`✓ list ${list.id}: ${list.count} rows → public/data/${list.file}`)
console.log(`✓ lists/index.json: ${listIndex.lists.length} lists, ${listIndex.links.reduce((s, l) => s + Object.keys(l.nodes).length, 0)} linked tree nodes`)
// Every link between the trees and the lists, and between lists, leads to rows.
const broken = checkLinks(written, listIndex, datasets)
if (broken.length) {
  console.error(`✗ links\n  ${broken.slice(0, 30).join('\n  ')}`)
  process.exitCode = 1
} else console.log('✓ links: every tree → list, list → tree and list → list link resolves')

// No published list and no payment or beneficiary extract may hold a personal identity number (ЕГН, ЛНЧ) that is not masked.
for (const dir of [new URL('lists/', OUT_DIR), src('sebra/'), src('eu-funds/'), src('cap/'), src('procurement/')]) {
  for (const file of readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((f) => /\.(json|csv|csv\.gz)$/.test(f))) {
    const raw = readFileSync(new URL(file, dir))
    const leaks = unmaskedIds((file.endsWith('.gz') ? gunzipSync(raw) : raw).toString('utf8'))
    if (leaks.length) {
      console.error(`✗ ${new URL(file, dir).pathname}: ${leaks.length} unmasked personal identity numbers`)
      process.exitCode = 1
    }
  }
}

// Datasets whose nodes link to lists load their own links in "Spending" (lists/links/<dataset>.json).
mkdirSync(new URL('lists/links/', OUT_DIR), { recursive: true })
for (const entry of index) {
  const links = datasetLinks(listIndex, entry)
  if (!links) continue
  writeFileSync(new URL(`lists/links/${entry.id}.json`, OUT_DIR), JSON.stringify(links))
  entry.lists = true
}

index.sort(
  (a, b) =>
    b.year - a.year || FAMILY_ORDER.indexOf(a.family) - FAMILY_ORDER.indexOf(b.family) || STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage),
)
writeFileSync(new URL('index.json', OUT_DIR), JSON.stringify(index, null, 2))
// The About page describes every dataset: one small file instead of every tree.
const about: DatasetInfo[] = index.map((entry) => {
  const { root, ...info } = datasets.find((d) => d.id === entry.id)!
  return { ...info, total: root.value }
})
writeFileSync(new URL('about.json', OUT_DIR), JSON.stringify(about))
