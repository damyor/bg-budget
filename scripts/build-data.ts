// Builds every dataset into public/data/ and writes public/data/index.json,
// plus one series file per family for comparing years (series-<family>.json).
//
//   npm run data              # use cached raw downloads in data/raw/
//   npm run data -- --refresh # download fresh copies first

import { writeFileSync } from 'node:fs'
import type { BudgetNode, Dataset, DatasetFamily, DatasetIndexEntry, LocalizedText, SeriesFile } from '../src/lib/types.ts'
import { publicTotal } from '../src/lib/types.ts'
import { buildBudgetPlan, type PlanDetails } from './budgetPlan.ts'
import { buildBudgetReport } from './budgetReport.ts'
import { buildEurostatDataset } from './eurostat.ts'
import { readKfpPlan, readKfpTotals } from './lib/kfp.ts'
import { loadMacro } from './lib/macro.ts'
import { buildMinistries } from './ministries.ts'

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
  municipal: { file: 'municipal-delegated-2026.csv', article: t('чл. 52', 'Art. 52') },
  universities: { file: 'transfers-universities-media.csv', column: '2026 г.', unit: 'kEUR' },
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
  municipal: { file: 'municipal-delegated-2024.csv', article: t('чл. 54', 'Art. 54') },
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
  municipal: { file: 'municipal-delegated-2025.csv', article: t('чл. 54', 'Art. 54') },
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
  },
  macro: macro(2024),
  description: t(
    `Реално изразходваните публични средства през 2024 г. — държава, общини, НОИ, НЗОК и европейски средства — по функции, с разбивка по това през чий бюджет са похарчени и дали са текущи или капиталови разходи. Данни от отчета за изпълнението на държавния бюджет за 2024 г. ${LEVA.bg}`,
    `Public money actually spent in 2024 — central government, municipalities, social security, health insurance and EU funds — by function, split by whose budget it was spent through and into current and capital spending. Data from the report on the execution of the 2024 State Budget. ${LEVA.en}`,
  ),
  sources: [REPORT_2024, REPORT_2025, NHIF_REPORT],
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
  },
  macro: macro(2025),
  description: t(
    `Реално изразходваните публични средства през 2025 г. — държава, общини, НОИ, НЗОК и европейски средства — по функции, с разбивка по това през чий бюджет са похарчени и дали са текущи или капиталови разходи. Данни от отчета за изпълнението на държавния бюджет за 2025 г., приет от Министерския съвет на 24.09.2026 г. (предстои да бъде разгледан от Народното събрание). ${LEVA.bg}`,
    `Public money actually spent in 2025 — central government, municipalities, social security, health insurance and EU funds — by function, split by whose budget it was spent through and into current and capital spending. Data from the report on the execution of the 2025 State Budget, approved by the government on 24 September 2026 (still to be reviewed by Parliament). ${LEVA.en}`,
  ),
  sources: [REPORT_2025, NHIF_REPORT],
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

const ministries2025 = buildMinistries({
  id: 'ministries-2025',
  year: 2025,
  stage: 'law',
  file: src('budget-2025/state-budget-2025-spending-units.csv'),
  unit: 'kBGN',
  publicTotal: publicTotal(budget2025),
  macro: macro(2025),
  title: t('Министерства 2025', 'Ministries 2025'),
  subtitle: t('Разходи на министерствата и ведомствата по Закона за държавния бюджет', 'Spending of ministries and agencies under the State Budget Act'),
  description: ministriesDescription(2025, 48, true),
  sources: [
    {
      name: t('Закон за държавния бюджет на Република България за 2025 г., чл. 2–49 (ДВ, бр. 26/2025)', 'State Budget Act 2025, art. 2–49 (State Gazette 26/2025)'),
      url: 'https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=233694',
    },
  ],
  sourceShort: t('Закон за държавния бюджет 2025 — министерства и ведомства', '2025 State Budget Act — ministries and agencies'),
  retrieved: '2025-03-27',
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
  programmes: src('budget-2026/state-budget-2026-programmes.csv'),
  publicTotal: publicTotal(budget2026),
  macro: macro(2026),
  title: t('Министерства 2026', 'Ministries 2026'),
  subtitle: t('Разходи на министерствата и ведомствата по Закона за държавния бюджет', 'Spending of ministries and agencies under the State Budget Act'),
  description: ministriesDescription(
    2026,
    46,
    false,
    t('За осем от тях — и по бюджетни програми.', 'For eight of them also by budget programme.'),
  ),
  sources: [
    {
      name: t('Закон за държавния бюджет на Република България за 2026 г., чл. 2–47 (ДВ, бр. 69/2026)', 'State Budget Act 2026, art. 2–47 (State Gazette 69/2026)'),
      url: 'https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=245041',
    },
    {
      name: t('Програмни бюджети към законопроекта (вх. № 52-602-01-19)', 'Programme budgets attached to the bill (no. 52-602-01-19)'),
      url: 'https://www.parliament.bg/bg/bills/ID/167157',
    },
  ],
  sourceShort: t('Закон за държавния бюджет 2026 — министерства и ведомства', '2026 State Budget Act — ministries and agencies'),
  retrieved: '2026-07-31',
})

const datasets: Dataset[] = [
  budget2027,
  budget2026,
  ministries2026,
  report2025,
  budget2025,
  ministries2025,
  ministriesReport2025,
  report2024,
  budget2024,
  ministries2024,
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

for (const family of ['functions', 'ministries', 'cofog'] as DatasetFamily[]) {
  const members = datasets.filter((d) => d.family === family)
  if (members.length < 2) continue
  const series = buildSeries(family, members)
  writeFileSync(new URL(`series-${family}.json`, OUT_DIR), JSON.stringify(series))
  console.log(`✓ series-${family}: ${series.datasets.length} datasets, ${Object.keys(series.values).length} comparable nodes`)
}

const FAMILY_ORDER: DatasetFamily[] = ['functions', 'ministries', 'cofog']
index.sort(
  (a, b) =>
    b.year - a.year || FAMILY_ORDER.indexOf(a.family) - FAMILY_ORDER.indexOf(b.family) || STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage),
)
writeFileSync(new URL('index.json', OUT_DIR), JSON.stringify(index, null, 2))
