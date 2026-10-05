// Named capital projects as lists (format: ListFile in src/lib/types.ts), from the
// CSV extracts in data/sources/projects/ (see its README):
//   national-projects-2026          State Budget Act 2026, Annex 2: 199 priority projects, 2026–2028
//   national-projects-2025          2025 report, attachment pr.6, section I: plan vs actual
//   national-projects-2025-reserve  the same, section II: the reserve list
//   municipal-projects              the municipal investment programme, three sources joined on the project code
// Projects never become tree nodes: they are part of the capital spending and transfers
// the ministries' and municipalities' trees already count. They link to those nodes instead.

import type { Dataset, ListCell, ListColumn, LocalizedText } from '../src/lib/types.ts'
import { num, readCsv } from './lib/csv.ts'
import { toEur } from './lib/kfp.ts'
import { nodeLabels, type ListGroup, type ListSpec } from './lib/lists.ts'
import { IMPLEMENTERS, INSTITUTIONS } from './lib/ministries-labels.ts'
import { provinceKey, provinceName, readRegister } from './lib/places.ts'

const t = (bg: string, en: string): LocalizedText => ({ bg, en })

export const PROJECTS: ListGroup = {
  id: 'projects',
  title: t('Инвестиционни проекти', 'Investment projects'),
  description: t(
    'Поименните инвестиционни проекти, за които държавата дава пари: приоритетните проекти на министерствата и проектите на общините по Инвестиционната програма за общински проекти. Те не са отделни парчета от кръговата диаграма — парите им са част от капиталовите разходи и трансферите, които вече са в бюджетите на министерствата и общините.',
    'The named investment projects the state pays for: the ministries’ priority projects and the municipalities’ projects in the Investment Programme for Municipal Projects. They are not slices of the donut: their money is part of the capital spending and transfers already counted in the ministries’ and municipalities’ budgets.',
  ),
}

const UNIT = { one: t('инвестиционен проект', 'investment project'), other: t('инвестиционни проекта', 'investment projects') }

const ZDB_2026 = {
  name: t('Закон за държавния бюджет на Република България за 2026 г., приложение № 2 към чл. 110 (ДВ, бр. 69/2026)', 'State Budget Act 2026, Annex 2 to art. 110 (State Gazette 69/2026)'),
  url: 'https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=245041',
}
const ZDB_2025 = {
  name: t('Закон за държавния бюджет на Република България за 2025 г., приложение № 2 към чл. 110 (ДВ, бр. 26/2025)', 'State Budget Act 2025, Annex 2 to art. 110 (State Gazette 26/2025)'),
  url: 'https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=233694',
}
const PR6 = {
  name: t(
    'Отчет за изпълнението на държавния бюджет за 2025 г., приложение № 6 — приоритетни стратегически инвестиционни проекти (РМС № 737/24.09.2026)',
    'Report on the execution of the 2025 State Budget, attachment 6 — priority strategic investment projects (Council of Ministers decision 737/2026)',
  ),
  url: 'https://strategy.bg/download/1327217',
}
const PR7 = {
  name: t(
    'Отчет за изпълнението на държавния бюджет за 2025 г., приложение № 7 — Инвестиционна програма за общински проекти (РМС № 737/24.09.2026)',
    'Report on the execution of the 2025 State Budget, attachment 7 — Investment Programme for Municipal Projects (Council of Ministers decision 737/2026)',
  ),
  url: 'https://strategy.bg/download/1327218',
}
const PMS_103 = {
  name: t(
    'ПМС № 103 от 12.08.2026 г. за проектите от Инвестиционната програма за общински проекти и финансирането им през 2026 г., приложение № 1 (ДВ, бр. 75/2026)',
    'Council of Ministers decree 103 of 12 Aug 2026 on the projects of the Investment Programme for Municipal Projects and their funding in 2026, annex 1 (State Gazette 75/2026)',
  ),
  url: 'https://dv.parliament.bg/DVPics/2026/75_26/4508_1.pdf',
}
const IPOP = {
  name: t(
    'Министерство на регионалното развитие и благоустройството — справка за проектите по Инвестиционната програма за общински проекти (ipop.mrrb.bg), 05.10.2026 г.',
    'Ministry of Regional Development and Public Works — projects of the Investment Programme for Municipal Projects (ipop.mrrb.bg), 5 Oct 2026',
  ),
  url: 'https://ipop.mrrb.bg/',
}

const LEVA = t(
  'Сумите за 2025 г. са в лева в източника и са превърнати в евро по фиксирания курс 1,95583 лв. за 1 €.',
  'The 2025 amounts are in leva in the source and are converted to euro at the fixed rate of 1.95583 leva per euro.',
)
const CLASSIFIED = t(
  'Индикаторите за резултат по проектите на Министерството на отбраната и на Националната служба за охрана са класифицирана информация.',
  'The result indicators of the Ministry of Defence’s and the National Protection Service’s projects are classified.',
)

/** Thousand euro (one decimal) → whole euro; blank → null. */
const fromKEur = (text: string) => (text.trim() ? Math.round(num(text) * 1000) : null)
/** Thousand leva → whole euro; blank or zero → null. */
const fromKBgn = (text: string) => (text.trim() && num(text) !== 0 ? Math.round(toEur(num(text), 'kBGN')) : null)
/** Euro with cents → whole euro; blank or zero → null. */
const fromEur = (text: string) => (text.trim() && num(text) !== 0 ? Math.round(num(text)) : null)
/** An indicator printed as "–" (classified, or none) is empty. */
const indicator = (text: string) => (/^[\s–-]*$/.test(text) ? null : text)

/** "2 082,5 хил. лв. (1,06 млн. €)" / "2,082.5 thousand leva (€1.06 m)". */
function leva(kBgn: number): LocalizedText {
  const m = toEur(kBgn, 'kBGN') / 1e6
  const bg = new Intl.NumberFormat('bg-BG', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(kBgn)
  const en = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(kBgn)
  return t(`${bg} хил. лв. (${m.toFixed(2).replace('.', ',')} млн. €)`, `${en} thousand leva (€${m.toFixed(2)} m)`)
}

/** The footnotes of attachment pr.6 on the six projects paid through transfers to other budgets. */
function notes2025(): Record<string, LocalizedText> {
  const university = (amount: number) => {
    const a = leva(amount)
    return t(
      `Парите се дават от Министерството на образованието и науката като субсидия на държавното висше училище, което отчита и разходите: ${a.bg} към 31.12.2025 г. Затова в колоната „Отчет“ няма сума.`,
      `The money is given by the Ministry of Education and Science as a subsidy to the state university, which also reports the spending: ${a.en} at 31 Dec 2025. That is why the "Actual" column is empty.`,
    )
  }
  const health = (amount: number) => {
    const a = leva(amount)
    return t(
      `Капиталовите разходи на Министерството на здравеопазването са намалени и парите са дадени като трансфери (чл. 110, ал. 6 от Закона за публичните финанси): ${a.bg} по този проект. Затова в колоната „Отчет“ няма сума.`,
      `The Ministry of Health’s capital spending was reduced and the money given as transfers (art. 110(6) of the Public Finance Act): ${a.en} for this project. That is why the "Actual" column is empty.`,
    )
  }
  const plovdiv = leva(15_908.2)
  return {
    'NP-25.001-0043': health(5_666.8),
    'NP-25.001-0044': health(8_955.5),
    'NP-25.001-0045': health(4_571.2),
    'NP-25.001-0047': university(2_082.5),
    'NP-25.001-0048': university(4_131.6),
    'NP-25.001-0049': t(
      `С ПМС № 156/2025 и № 265/2025 на община Пловдив са дадени трансфери за ${plovdiv.bg}; разходите се отчитат от общината. Затова в колоната „Отчет“ няма сума.`,
      `Decrees 156/2025 and 265/2025 gave Plovdiv municipality transfers of ${plovdiv.en}; the municipality reports the spending. That is why the "Actual" column is empty.`,
    ),
  }
}

const NOTE_2026: Record<string, LocalizedText> = {
  '**': t('От тях 2,0 млн. € са в бюджета на Министерството на културата за 2026 г. (бележка към приложението).', 'Of this, €2.0 m is in the Ministry of Culture’s 2026 budget (note to the annex).'),
}

// ---------- national priority projects ----------

function institutionOf(printed: string, where: string): { unit: string; implementer: string | null } {
  const [ministry, company] = printed.split('/')
  const unit = INSTITUTIONS[ministry]
  if (!unit) throw new Error(`${where}: no spending unit for "${ministry}"`)
  if (company && !IMPLEMENTERS[company]) throw new Error(`${where}: unknown implementer "${company}"`)
  return { unit, implementer: company ? IMPLEMENTERS[company].id : null }
}

const dataset = (datasets: Dataset[], id: string) => {
  const found = datasets.find((d) => d.id === id)
  if (!found) throw new Error(`Projects: no dataset ${id}`)
  return found
}

const CODE: ListColumn = { id: 'code', type: 'code', label: t('Номер', 'Code'), search: true }
const NAME: ListColumn = { id: 'name', type: 'text', label: t('Проект', 'Project'), search: true }
const INDICATOR: ListColumn = { id: 'indicator', type: 'text', label: t('Индикатор за резултат', 'Result indicator'), detail: true, search: true }
const NOTE: ListColumn = { id: 'note', type: 'text', label: t('Бележка', 'Note'), detail: true }

const institution = (target: Dataset, ids: Iterable<string>): ListColumn => ({
  id: 'institution',
  type: 'node',
  label: t('Отговорна институция', 'Responsible institution'),
  family: 'ministries',
  dataset: target.id,
  filter: true,
  labels: nodeLabels(target, ids),
})

function national2026(dir: URL, datasets: Dataset[]): ListSpec {
  const rows2026 = readCsv(new URL('national-priority-projects-2026.csv', dir))
  const report = new Map(readCsv(new URL('national-priority-projects-2025-report.csv', dir)).map((r) => [r.code, r]))
  const where = 'national-projects-2026'
  const units = rows2026.map((r) => institutionOf(r.institution_bg, where))
  const usedImplementers = Object.values(IMPLEMENTERS).filter((i) => units.some((u) => u.implementer === i.id))
  const columns: ListColumn[] = [
    CODE,
    NAME,
    institution(dataset(datasets, 'ministries-2026'), new Set(units.map((u) => u.unit))),
    {
      id: 'implementer',
      type: 'category',
      label: t('Изпълнява се от', 'Carried out by'),
      detail: true,
      labels: Object.fromEntries(usedImplementers.map((i) => [i.id, i.name])),
    },
    {
      id: 'capex',
      type: 'series',
      label: t('Капиталови разходи (2027–2028: прогноза)', 'Capital spending (2027–2028: forecast)'),
      periods: ['2026', '2027', '2028'],
      total: true,
      source: t('Закон за държавния бюджет за 2026 г., приложение № 2 (ДВ, бр. 69 от 31.07.2026 г.)', 'State Budget Act 2026, Annex 2 (State Gazette 69 of 31 Jul 2026)'),
    },
    INDICATOR,
    {
      id: 'list2025',
      type: 'category',
      label: t('В програмата за 2025 г.', 'In the 2025 programme'),
      detail: true,
      labels: { programme: t('Да (раздел I)', 'Yes (section I)'), reserve: t('В резервния списък (раздел II)', 'On the reserve list (section II)') },
    },
    { id: 'plan2025', type: 'money', label: t('План за 2025 г. (резервните: индикативно)', '2025 plan (reserve list: indicative)'), detail: true, source: PR6.name },
    { id: 'actual2025', type: 'money', label: t('Отчет за 2025 г.', '2025 actual'), detail: true, source: PR6.name },
    NOTE,
  ]
  const rows: ListCell[][] = rows2026.map((r, i) => {
    const before = report.get(r.code)
    return [
      r.code,
      r.name_bg,
      units[i].unit,
      units[i].implementer,
      [fromKEur(r.capex_2026_kEUR), fromKEur(r.capex_2027_kEUR), fromKEur(r.capex_2028_kEUR)],
      indicator(r.indicator_bg),
      before ? (before.section === 'I' ? 'programme' : 'reserve') : null,
      before ? fromKBgn(before.plan_2025_kBGN) : null,
      before ? fromKBgn(before.actual_2025_kBGN) : null,
      r.footnote ? NOTE_2026[r.footnote] : null,
    ]
  })
  const inBoth = rows2026.filter((r) => report.has(r.code)).length
  return {
    id: 'national-projects-2026',
    group: PROJECTS.id,
    title: t('Приоритетни инвестиционни проекти 2026–2028', 'Priority investment projects 2026–2028'),
    short: t('Национални 2026–2028', 'National 2026–2028'),
    description: t(
      'Програмата за приоритетни стратегически инвестиционни проекти с национално финансиране за 2026–2028 г. от Закона за държавния бюджет за 2026 г.: 199 проекта на министерствата и ведомствата с капиталовите разходи по всеки за 2026 г. и прогнозата за 2027 и 2028 г., индикатор за резултат и отговорна институция.',
      'The programme of priority strategic investment projects with national funding for 2026–2028, from the 2026 State Budget Act: 199 projects of ministries and agencies with the capital spending on each in 2026 and the forecast for 2027 and 2028, a result indicator and the responsible institution.',
    ),
    sources: [ZDB_2026, PR6],
    caveats: [
      t(
        'Парите за 2026 г. са част от капиталовите разходи на министерствата по закона (чл. 110, ал. 2), а не допълнителни; между проектите може да се преразпределя (ал. 3). Проектите на транспортното министерство се изпълняват от НК „Железопътна инфраструктура“, БДЖ и ДП „Пристанищна инфраструктура“ с капиталови трансфери от министерството.',
        'The 2026 money is part of the ministries’ capital spending in the act (art. 110(2)), not extra; it can be moved between projects (para. 3). The transport ministry’s projects are carried out by the railway infrastructure company, BDZ and the port infrastructure enterprise with capital transfers from the ministry.',
      ),
      CLASSIFIED,
      t(
        `Планът и отчетът за 2025 г. (в подробностите на проекта) са от отчета за изпълнението на бюджета за 2025 г., по същия номер на проект; ${inBoth} от проектите са и в програмата или в резервния списък за 2025 г.`,
        `The 2025 plan and actual (in a project’s details) come from the report on the 2025 budget, matched on the project code; ${inBoth} of the projects were also in the 2025 programme or on its reserve list.`,
      ),
    ],
    asOf: '2026-07-31',
    retrieved: '2026-10-05',
    unit: UNIT,
    summary: ['capex.2026', 'capex.2027', 'capex.2028'],
    sort: '-capex.2026',
    links: [{ family: 'ministries', column: 'institution', years: [2026], value: 'capex.2026', label: t('за 2026 г.', 'in 2026') }],
    columns,
    key: 'code',
    rows,
  }
}

function national2025(dir: URL, datasets: Dataset[], section: 'I' | 'II'): ListSpec {
  const source = readCsv(new URL('national-priority-projects-2025-report.csv', dir)).filter((r) => r.section === section)
  const id = section === 'I' ? 'national-projects-2025' : 'national-projects-2025-reserve'
  const units = source.map((r) => institutionOf(r.institution_bg, id))
  const notes = notes2025()
  const plan: ListColumn =
    section === 'I'
      ? { id: 'plan', type: 'money', label: t('План 2025', 'Plan 2025'), total: true, source: t('Закон за държавния бюджет за 2025 г., приложение № 2, раздел I (същите суми са в отчета)', 'State Budget Act 2025, Annex 2, section I (the report repeats the amounts)') }
      : { id: 'plan', type: 'money', label: t('Индикативно 2025', 'Indicative 2025'), total: true, source: t('Закон за държавния бюджет за 2025 г., приложение № 2, раздел II', 'State Budget Act 2025, Annex 2, section II') }
  const columns: ListColumn[] = [
    { id: 'no', type: 'code', label: t('№ по ред', 'Row'), hidden: true },
    CODE,
    NAME,
    institution(dataset(datasets, 'ministries-2025'), new Set(units.map((u) => u.unit))),
    plan,
    { id: 'actual', type: 'money', label: t('Отчет 2025', 'Actual 2025'), total: true, source: t('Отчет за 2025 г., приложение № 6 — капиталови разходи или трансфери към 31.12.2025 г.', '2025 report, attachment 6 — capital spending or transfers at 31 Dec 2025') },
    { id: 'rate', type: 'percent', label: t('Изпълнение', 'Spent') },
    INDICATOR,
    NOTE,
  ]
  const rows: ListCell[][] = source.map((r, i) => {
    const planned = fromKBgn(r.plan_2025_kBGN)
    const actual = fromKBgn(r.actual_2025_kBGN)
    return [
      `${section}-${r.no}`,
      r.code,
      r.name_bg,
      units[i].unit,
      planned,
      actual,
      // Projects paid through transfers to other budgets report nothing here (see their note).
      planned && !notes[r.code] ? (actual ?? 0) / planned : null,
      indicator(r.indicator_bg),
      notes[r.code] ?? null,
    ]
  })
  const negative = source.filter((r) => num(r.actual_2025_kBGN) < 0).map((r) => r.code)
  const common = {
    group: PROJECTS.id,
    sources: [PR6, ZDB_2025],
    asOf: '2025-12-31',
    retrieved: '2026-10-05',
    unit: UNIT,
    summary: ['plan', 'actual'],
    sort: '-plan',
    columns,
    key: 'no',
    rows,
  }
  if (section === 'II') {
    return {
      ...common,
      id,
      title: t('Резервни инвестиционни проекти 2025', 'Reserve investment projects 2025'),
      short: t('Резервен списък 2025', 'Reserve list 2025'),
      description: t(
        'Списъкът с резервни стратегически инвестиционни проекти с национално финансиране за 2025–2028 г. (Закон за държавния бюджет за 2025 г., приложение № 2, раздел II): 228 проекта извън програмата, с индикативни капиталови разходи за 2025 г. и отчета към 31.12.2025 г.',
        'The reserve list of strategic investment projects with national funding for 2025–2028 (State Budget Act 2025, Annex 2, section II): 228 projects outside the programme, with indicative capital spending for 2025 and the outturn at 31 Dec 2025.',
      ),
      caveats: [
        t(
          'Индикативните суми не са план: за резервните проекти законът не предвижда пари в бюджетите. Все пак за някои от тях през 2025 г. са отчетени разходи.',
          'The indicative amounts are not a plan: the act sets no money aside for reserve projects. Some of them still reported spending in 2025.',
        ),
        t('Проект NP-25.002-0082 е вписан два пъти, с две различни суми; тук са и двата реда.', 'Project NP-25.002-0082 is listed twice, with two amounts; both rows are kept.'),
        CLASSIFIED,
        LEVA,
      ],
    }
  }
  return {
    ...common,
    id,
    title: t('Приоритетни инвестиционни проекти 2025 — план и отчет', 'Priority investment projects 2025 — plan and actual'),
    short: t('Национални 2025', 'National 2025'),
    description: t(
      'Програмата за приоритетни стратегически инвестиционни проекти с национално финансиране за 2025 г. (Закон за държавния бюджет за 2025 г., приложение № 2, раздел I) и отчетът за изпълнението ѝ към 31.12.2025 г.: 176 проекта с планираните и отчетените капиталови разходи или трансфери.',
      'The programme of priority strategic investment projects with national funding for 2025 (State Budget Act 2025, Annex 2, section I) and its outturn at 31 Dec 2025: 176 projects with their planned and reported capital spending or transfers.',
    ),
    caveats: [
      t(
        'Отчетът е приложение към отчета за изпълнението на държавния бюджет за 2025 г., приет от Министерския съвет на 24.09.2026 г.; Народното събрание още не го е приело.',
        'The outturn is an attachment to the report on the 2025 State Budget, approved by the government on 24 Sep 2026 and not yet adopted by Parliament.',
      ),
      t(
        'Шест проекта се финансират с трансфери към други бюджети (университети, община Пловдив, болници) и разходите им се отчитат там, затова отчетът им е празен (вж. бележката на всеки). Без тях програмата е 170 проекта с план 2 891,8 млн. лв. (1,48 млрд. €).',
        'Six projects are paid through transfers to other budgets (universities, Plovdiv municipality, hospitals), which report the spending, so their actual is empty (see each one’s note). Without them the programme has 170 projects and a plan of 2,891.8 million leva (€1.48 bn).',
      ),
      ...(negative.length
        ? [
            t(
              `Отчетът е отрицателна сума при ${negative.join(' и ')} — така е отпечатан в приложението.`,
              `The actual is a negative amount for ${negative.join(' and ')} — as printed in the attachment.`,
            ),
          ]
        : []),
      CLASSIFIED,
      LEVA,
    ],
    links: [
      { family: 'ministries', column: 'institution', years: [2025], stages: ['law'], value: 'plan', label: t('план за 2025 г.', 'planned for 2025') },
      { family: 'ministries', column: 'institution', years: [2025], stages: ['report'], value: 'actual', label: t('отчетени за 2025 г.', 'spent in 2025') },
    ],
  }
}

// ---------- municipal investment programme ----------

function municipal(dir: URL, register: URL, datasets: Dataset[]): ListSpec {
  const places = readRegister(register)
  const report = readCsv(new URL('municipal-investment-2025-report.csv', dir))
  const decree = new Map(readCsv(new URL('municipal-investment-2026-decree.csv', dir)).map((r) => [r.code, r]))
  const live = new Map(readCsv(new URL('municipal-investment-ipop.csv', dir)).map((r) => [r.code, r]))
  if (decree.size !== report.length || live.size !== report.length) throw new Error('municipal-projects: the sources list different numbers of projects')
  const target = dataset(datasets, 'municipalities-2026')
  const src = {
    report: t('Отчет за 2025 г., приложение № 7 (към 31.12.2025 г.)', '2025 report, attachment 7 (at 31 Dec 2025)'),
    decree: t('ПМС № 103/12.08.2026, приложение № 1', 'Decree 103 of 12 Aug 2026, annex 1'),
    live: t('ipop.mrrb.bg, към 05.10.2026 г.', 'ipop.mrrb.bg, at 5 Oct 2026'),
  }
  const money = (id: string, label: LocalizedText, source: LocalizedText, extra: Partial<ListColumn> = {}): ListColumn => ({ id, type: 'money', label, source, total: true, ...extra })
  const rows: ListCell[][] = report.map((r) => {
    const d = decree.get(r.code)
    const l = live.get(r.code)
    if (!d || !l) throw new Error(`municipal-projects: ${r.code} is missing from the decree or ipop.mrrb.bg`)
    // The extractor matched each source's municipality to the register; here they must agree.
    if (d.ebk_code !== r.ebk_code || l.ebk_code !== r.ebk_code) throw new Error(`municipal-projects: ${r.code} is in different municipalities`)
    const place = places.byCode(r.ebk_code)
    return [
      r.code,
      r.name_bg,
      place.key,
      provinceKey(place.province),
      fromEur(l.agreement_EUR),
      fromKBgn(r.total_2025_kBGN),
      fromEur(d.forecast_2026_EUR),
      fromEur(l.paid_EUR),
      fromEur(d.later_EUR),
      d.application || null,
      d.agreement || null,
      fromKBgn(r.transfer_2025_kBGN),
      fromKBgn(r.bdb_2025_kBGN),
      fromEur(d.transfers_EUR),
      fromEur(l.paid_mrrb_2024_2025_EUR),
      fromEur(l.paid_mrrb_2026_EUR),
      fromEur(l.paid_bdb_EUR),
      fromEur(l.in_verification_EUR),
      fromEur(l.approved_unpaid_EUR),
    ]
  })
  const provinces = new Map(places.all.map((p) => [provinceKey(p.province), provinceName(p.province)]))
  const count = new Intl.NumberFormat('bg-BG').format(rows.length)
  const countEn = new Intl.NumberFormat('en-GB').format(rows.length)
  const withProjects = new Set(report.map((r) => r.ebk_code)).size
  const columns: ListColumn[] = [
    CODE,
    NAME,
    { id: 'municipality', type: 'node', label: t('Община', 'Municipality'), family: 'municipalities', dataset: target.id, filter: true, labels: nodeLabels(target, new Set(rows.map((r) => r[2] as string))) },
    { id: 'province', type: 'category', label: t('Област', 'Province'), hidden: true, filter: true, labels: Object.fromEntries(provinces) },
    money('agreement', t('Стойност на споразумението', 'Agreement value'), src.live),
    money('paid2025', t('Изплатено 2025', 'Paid in 2025'), src.report),
    money('forecast2026', t('Прогноза 2026', 'Forecast 2026'), src.decree),
    money('paid', t('Изплатено общо', 'Paid to date'), src.live),
    money('later', t('За следващи години', 'For later years'), src.decree, { detail: true }),
    { id: 'application', type: 'text', label: t('Заявление (№, дата)', 'Application (no., date)'), detail: true, source: src.decree },
    { id: 'agreementNo', type: 'text', label: t('Споразумение (№, дата)', 'Agreement (no., date)'), detail: true, search: true, source: src.decree },
    money('transfer2025', t('2025: трансфер от МРРБ', '2025: transfer from the ministry'), src.report, { detail: true }),
    money('bdb2025', t('2025: чрез Българската банка за развитие', '2025: through the Bulgarian Development Bank'), src.report, { detail: true }),
    money('transfers', t('Предоставени трансфери до 31.07.2026 г.', 'Transfers to 31 Jul 2026'), src.decree, { detail: true }),
    money('paidMrrb2024', t('Изплатено от МРРБ 2024–2025', 'Paid by the ministry 2024–2025'), src.live, { detail: true }),
    money('paidMrrb2026', t('Изплатено от МРРБ 2026', 'Paid by the ministry 2026'), src.live, { detail: true }),
    money('paidBdb', t('Изплатено от Българската банка за развитие', 'Paid by the Bulgarian Development Bank'), src.live, { detail: true }),
    money('inVerification', t('Искания за плащане в проверка', 'Payment claims under review'), src.live, { detail: true }),
    money('approvedUnpaid', t('Одобрени, чакащи плащане', 'Approved, awaiting payment'), src.live, { detail: true }),
  ]
  return {
    id: 'municipal-projects',
    group: PROJECTS.id,
    title: t('Инвестиционна програма за общински проекти', 'Investment Programme for Municipal Projects'),
    short: t('Общински проекти', 'Municipal projects'),
    description: t(
      `Проектите на общините, които държавата финансира по Инвестиционната програма за общински проекти (от 2024 г.) — улици, водопроводи, училища, спортни обекти: ${count} проекта в ${withProjects} общини. За всеки: стойността на споразумението с регионалното министерство, парите, изплатени през 2025 г., прогнозата за 2026 г. и изплатеното досега.`,
      `The municipalities’ projects the state pays for through the Investment Programme for Municipal Projects (since 2024) — streets, water mains, schools, sports grounds: ${countEn} projects in ${withProjects} municipalities. For each: the value of the agreement with the regional development ministry, the money paid in 2025, the forecast for 2026 and what has been paid so far.`,
    ),
    sources: [PR7, PMS_103, IPOP],
    caveats: [
      t(
        'Колоните идват от три източника, съединени по номера на проекта (под таблицата е посочено кой е на всяка колона): отчетът за 2025 г. (изплатеното през 2025 г.), ПМС № 103/2026 (прогнозата за 2026 г. и сумите за следващи години) и публичната справка на МРРБ ipop.mrrb.bg към 05.10.2026 г. (споразумението и изплатеното досега, от министерството и от Българската банка за развитие).',
        'The columns come from three sources joined on the project code (the notes under the table say which column comes from where): the 2025 report (paid in 2025), decree 103/2026 (the 2026 forecast and the amounts for later years) and the regional development ministry’s public register ipop.mrrb.bg at 5 Oct 2026 (the agreement and what has been paid so far, by the ministry and by the Bulgarian Development Bank).',
      ),
      t(
        'Прогнозата за 2026 г. е без плащанията до 31.07.2026 г. и общо (2,56 млрд. €) надхвърля парите за програмата през 2026 г. по закона: до 460,2 млн. € чрез Българската банка за развитие и до 600 млн. € от централния бюджет (чл. 113 от Закона за държавния бюджет за 2026 г.).',
        'The 2026 forecast excludes payments up to 31 Jul 2026 and in all (€2.56 bn) exceeds the money the act sets for the programme in 2026: up to €460.2 m through the Bulgarian Development Bank and up to €600 m from the central budget (art. 113 of the 2026 State Budget Act).',
      ),
      t(
        'Тези пари не са в „Общини“, където са само трансферите по закона за бюджета.',
        'This money is not in “Municipalities”, which holds only the transfers set in the budget act.',
      ),
      LEVA,
    ],
    asOf: '2026-10-05',
    retrieved: '2026-10-05',
    unit: UNIT,
    summary: ['agreement', 'paid2025', 'forecast2026', 'paid'],
    sort: '-agreement',
    links: [
      { family: 'municipalities', column: 'municipality', years: [2025], value: 'paid2025', label: t('изплатени през 2025 г.', 'paid in 2025') },
      { family: 'municipalities', column: 'municipality', years: [2026], value: 'forecast2026', label: t('прогноза за 2026 г.', 'forecast for 2026') },
    ],
    columns,
    key: 'code',
    rows,
  }
}

export function buildProjectLists(config: { dir: URL; register: URL; datasets: Dataset[] }): ListSpec[] {
  const { dir, register, datasets } = config
  return [national2026(dir, datasets), national2025(dir, datasets, 'I'), national2025(dir, datasets, 'II'), municipal(dir, register, datasets)]
}
