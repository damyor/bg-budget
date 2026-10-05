// "Budget <year>" by purpose: the consolidated fiscal programme (КФП) by
// function and sub-function, with — where the year's budget acts are
// available — the itemised budgets of the National Health Insurance Fund, the
// state social security funds and the funding of state-delegated activities in
// municipalities attached where they belong.
//
// Every year uses the same node ids, so plans, reports and forecasts can be
// compared. Sources are CSV extracts of the official documents in
// data/sources/ (see the README in each folder).

import type { Dataset, DatasetSource, DatasetStage, LocalizedText } from '../src/lib/types.ts'
import { fixCyrillic, num, readCsv } from './lib/csv.ts'
import { SUB, toEur, type KfpPlan, type KfpTotals, type Unit } from './lib/kfp.ts'
import type { YearMacro } from './lib/macro.ts'
import { municipalityName, PLACE_KIND, provinceKey, provinceName, readRegister, SOFIA_CITY, type Municipality } from './lib/places.ts'
import { build, MILLION, type Spec } from './lib/tree-builder.ts'

const t = (bg: string, en: string): LocalizedText => ({ bg, en })

export const KIND = {
  area: t('Област', 'Area'),
  func: t('Функция', 'Function'),
  sub: t('Подфункция', 'Sub-function'),
  fund: t('Фонд / бюджет', 'Fund / budget'),
  item: t('Разход', 'Expense'),
  oblast: PLACE_KIND.province,
  municipality: PLACE_KIND.municipality,
  university: t('Висше училище', 'University'),
  institution: t('Институция', 'Institution'),
}

// ---------- itemised budget acts ----------

/** Where the year's budget-act tables are and how they are cited. */
export interface PlanDetails {
  dir: URL
  /** Unit of the law tables and the municipal table. */
  unit: 'kEUR' | 'kBGN'
  nhif?: { file: string; citation: LocalizedText }
  socialSecurity?: { file: string; citation: LocalizedText; benefits?: { file: string; unit: Unit; citation: LocalizedText } }
  /**
   * State Budget Act article with the per-municipality funding of state-delegated
   * activities; `register` is data/sources/places/municipalities.csv (ЕБК codes).
   */
  municipal?: { file: string; article: LocalizedText; register: URL }
  universities?: {
    file: string
    column: string
    unit: Unit
    /** The State Budget Act's transfer to each university and to the Academy of Sciences (thousand EUR). */
    institutions?: { file: string; article: LocalizedText }
  }
}

/** Rows of a law table CSV (table_idx,…,row_no,label,value_k…). */
function lawTables(file: URL) {
  const rows = readCsv(file)
  const valueColumn = Object.keys(rows[0]).find((k) => k.startsWith('value_'))
  if (!valueColumn) throw new Error(`${file.pathname}: no value column`)
  const unit = valueColumn.slice('value_'.length) as Unit
  const tables = new Map<number, Record<string, string>[]>()
  for (const r of rows) {
    const idx = Number(r.table_idx)
    const list = tables.get(idx) ?? []
    list.push(r)
    tables.set(idx, list)
  }
  /** Index of the table whose caption (or one of whose labels) matches. */
  const find = (test: (caption: string, labels: string[]) => boolean, what: string): number => {
    for (const [idx, list] of tables) {
      if (test(list[0].caption ?? '', list.map((r) => r.label.trim()))) return idx
    }
    throw new Error(`${file.pathname}: no table for ${what}`)
  }
  /** Value (EUR) of a row identified by its number ("1.1.3.5."), or — in unnumbered tables — its exact label. */
  const value = (table: number, rowNo: string, labelStart?: string) => {
    const row = (tables.get(table) ?? []).find(
      (r) => r.row_no.trim() === rowNo && (!labelStart || (rowNo ? r.label.trim().startsWith(labelStart) : r.label.trim() === labelStart)),
    )
    if (!row) throw new Error(`${file.pathname}: table ${table} row ${rowNo} ${labelStart ?? ''} not found`)
    return toEur(num(row[valueColumn]), unit)
  }
  return { find, value }
}

function nhifSpec(details: PlanDetails, year: number): Spec {
  const { find, value } = lawTables(new URL(details.nhif!.file, details.dir))
  // Art. 1(2): expenditure.
  const T = find((caption) => /НЗОК|здравноосигурителна каса/i.test(caption) && /по разходи/i.test(caption), 'NHIF expenditure')
  return nhifTree(
    (row, label) => value(T, row, label),
    year,
    t(
      `Бюджет на НЗОК за ${year} г. (${details.nhif!.citation.bg}). Плащанията за медицинска помощ и лекарства на здравноосигурените.`,
      `NHIF budget for ${year} (${details.nhif!.citation.en}): payments for the medical care and medicines of insured people.`,
    ),
  )
}

/**
 * The Health Insurance Fund by expense line. `v` returns a line (EUR) by its
 * row number in the fund's budget act; `medicinesYear` picks the numbering of
 * the "of which" rows under 1.1.3.5. `hospitals` gives the hospital-care line its
 * children (the actuals only: each hospital, see scripts/health.ts), from the line's value.
 */
export function nhifTree(
  v: (rowNo: string, label?: string) => number,
  medicinesYear: number,
  note: LocalizedText,
  hospitals?: (line: number) => Partial<Spec>,
): Spec {
  const hospitalCare = v('1.1.3.7.')
  return {
    id: 'h-nhif',
    kind: KIND.fund,
    name: t('Здравна каса (НЗОК)', 'Health Insurance Fund (NHIF)'),
    value: v('II.', 'РАЗХОДИ'),
    note,
    children: [
      { id: 'h-nhif-hospital', kind: KIND.item, name: t('Болнична помощ', 'Hospital care'), value: hospitalCare, ...hospitals?.(hospitalCare) },
      {
        id: 'h-nhif-medicines',
        kind: KIND.item,
        name: t('Лекарства, медицински изделия и диетични храни', 'Medicines, medical devices & dietary foods'),
        value: v('1.1.3.5.'),
        children: medicines(medicinesYear).map((m) => ({ id: m.id, kind: KIND.item, name: MEDICINES[m.id], value: m.rows.reduce((sum, row) => sum + v(row), 0) })),
        rest: { id: 'h-nhif-med-other', kind: KIND.item, name: t('Други', 'Other') },
      },
      { id: 'h-nhif-specialists', kind: KIND.item, name: t('Специалисти извън болница', 'Outpatient specialists'), value: v('1.1.3.2.') },
      { id: 'h-nhif-gp', kind: KIND.item, name: t('Общопрактикуващи лекари', 'General practitioners'), value: v('1.1.3.1.') },
      { id: 'h-nhif-dental', kind: KIND.item, name: t('Дентална помощ', 'Dental care'), value: v('1.1.3.3.') },
      { id: 'h-nhif-labs', kind: KIND.item, name: t('Изследвания (медико-диагностична дейност)', 'Lab tests & diagnostics'), value: v('1.1.3.4.') },
      { id: 'h-nhif-reserve', kind: KIND.item, name: t('Резерв за непредвидени разходи', 'Contingency reserve'), value: v('1.3.') },
      { id: 'h-nhif-devices', kind: KIND.item, name: t('Медицински изделия в болниците', 'Medical devices used in hospitals'), value: v('1.1.3.6.') },
      {
        id: 'h-nhif-moh',
        kind: KIND.item,
        name: t('Дейности, финансирани от Министерството на здравеопазването', 'Activities funded by the Ministry of Health'),
        value: v('1.1.4.'),
        note: t(
          'Ваксини, лечение на деца до 18 г., помощни средства за хора с увреждания и др., платени чрез НЗОК.',
          'Vaccines, treatment of children under 18, aids for people with disabilities etc., paid through the NHIF.',
        ),
        children: [
          { id: 'h-nhif-moh-children', kind: KIND.item, name: t('Лечение на деца до 18 години', 'Treatment of children under 18'), value: v('1.1.4.4.') },
          { id: 'h-nhif-moh-aids', kind: KIND.item, name: t('Помощни средства и изделия за хора с увреждания', 'Aids and devices for people with disabilities'), value: v('1.1.4.5.') },
          { id: 'h-nhif-moh-vaccines', kind: KIND.item, name: t('Ваксини', 'Vaccines'), value: v('1.1.4.1.') },
          { id: 'h-nhif-moh-uninsured', kind: KIND.item, name: t('Лечение на здравно неосигурени лица', 'Treatment of uninsured people'), value: v('1.1.4.2.') },
          { id: 'h-nhif-moh-art37', kind: KIND.item, name: t('Други плащания (чл. 37, ал. 6 от ЗЗО)', 'Other payments (Art. 37(6) Health Insurance Act)'), value: v('1.1.4.3.') },
        ],
        rest: { id: 'h-nhif-moh-other', kind: KIND.item, name: t('Други (скрининг и др.)', 'Other (screening etc.)') },
      },
      { id: 'h-nhif-abroad', kind: KIND.item, name: t('Лечение в други страни от ЕС', 'Treatment in other EU countries'), value: v('1.1.3.8.') },
      {
        id: 'h-nhif-admin',
        kind: KIND.item,
        name: t('Администрация на НЗОК', 'NHIF administration'),
        value: v('1.1.1.') + v('1.1.2.') + v('1.2.'),
      },
    ],
  }
}

const MEDICINES: Record<string, LocalizedText> = {
  'h-nhif-med-reference': t('Оригинални (референтни) лекарства', 'Originator (reference) medicines'),
  'h-nhif-med-generic': t('Генерични лекарства', 'Generic medicines'),
  'h-nhif-med-home': t('Лекарства за домашно лечение', 'Medicines for home treatment'),
  'h-nhif-med-oncology': t('Лекарства за онкологични заболявания (в болница)', 'Cancer medicines (in hospital)'),
  'h-nhif-med-oncology-coag': t('Лекарства за онкологични заболявания и коагулопатии (в болница)', 'Cancer and coagulopathy medicines (in hospital)'),
  'h-nhif-med-coagulopathy': t('Лекарства при вродени коагулопатии', 'Medicines for congenital coagulopathies'),
  'h-nhif-med-antineoplastic': t('Противотуморни лекарства за базова химиотерапия', 'Antineoplastic drugs for basic chemotherapy'),
  'h-nhif-med-pharmacy': t('Възнаграждение на аптеките за отпускане', 'Pharmacy dispensing fees'),
  'h-nhif-med-devices': t('Медицински изделия за домашно лечение', 'Medical devices for home treatment'),
  'h-nhif-med-diet': t('Диетични храни за специални медицински цели', 'Foods for special medical purposes'),
  'h-nhif-med-devices-diet': t('Медицински изделия и диетични храни за домашно лечение', 'Medical devices & dietary foods for home treatment'),
}

/**
 * The "of which" rows of NHIF line 1.1.3.5 (medicines) are numbered differently
 * every year; each entry lists the rows that make up one item.
 */
function medicines(year: number): { id: string; rows: string[] }[] {
  if (year === 2024) {
    return [
      { id: 'h-nhif-med-home', rows: ['1.1.3.5.3.'] },
      { id: 'h-nhif-med-oncology-coag', rows: ['1.1.3.5.4.'] },
      { id: 'h-nhif-med-pharmacy', rows: ['1.1.3.5.1.'] },
      { id: 'h-nhif-med-devices-diet', rows: ['1.1.3.5.2.'] },
    ]
  }
  if (year === 2025) {
    return [
      { id: 'h-nhif-med-home', rows: ['1.1.3.5.3.1.', '1.1.3.5.3.2.'] },
      { id: 'h-nhif-med-oncology', rows: ['1.1.3.5.4.'] },
      { id: 'h-nhif-med-coagulopathy', rows: ['1.1.3.5.5.'] },
      { id: 'h-nhif-med-antineoplastic', rows: ['1.1.3.5.6.'] },
      { id: 'h-nhif-med-pharmacy', rows: ['1.1.3.5.1.'] },
      { id: 'h-nhif-med-devices', rows: ['1.1.3.5.2.'] },
      { id: 'h-nhif-med-diet', rows: ['1.1.3.5.3.3.'] },
    ]
  }
  return [
    { id: 'h-nhif-med-reference', rows: ['1.1.3.5.4.1.'] },
    { id: 'h-nhif-med-generic', rows: ['1.1.3.5.4.2.'] },
    { id: 'h-nhif-med-pharmacy', rows: ['1.1.3.5.1.'] },
    { id: 'h-nhif-med-devices', rows: ['1.1.3.5.2.'] },
    { id: 'h-nhif-med-diet', rows: ['1.1.3.5.3.'] },
  ]
}

/** State social security (ДОО) budget, by fund. */
function socialSecurity(details: PlanDetails, year: number) {
  const ss = details.socialSecurity!
  const { find, value: v } = lawTables(new URL(ss.file, details.dir))
  const expenditure = (fund: RegExp, what: string) => find((caption) => fund.test(caption) && /по разходите/.test(caption), what)
  const consolidated = expenditure(/консолидирания бюджет на държавното обществено осигуряване/, 'consolidated ДОО')
  const pensionsFund = expenditure(/фонд „Пенсии“/, 'Pensions fund')
  const art69 = expenditure(/фонд „Пенсии за лицата по чл\. 69“/, 'Art. 69 fund')
  const nonContrib = find((caption) => /фонд „Пенсии, несвързани с трудова дейност“/.test(caption) && /разходи/.test(caption), 'non-contributory pensions')
  const accident = expenditure(/фонд „Трудова злополука и професионална болест“/, 'work accident fund')
  const noi = expenditure(/Националния осигурителен институт/, 'NOI')
  // "Пенсии от Учителския пенсионен фонд" (2025, 2026) or "Пенсии от УчПФ" (2024).
  const teachers = find((_, labels) => labels.some((l) => l.startsWith('Пенсии от Уч')), "Teachers' Pension Fund")
  return {
    pensions: [
      { id: 's-pen-labour', name: t('Пенсии за стаж и възраст, инвалидност и наследствени (фонд „Пенсии“)', 'Old-age, disability & survivor pensions (Pensions fund)'), value: v(pensionsFund, '1.1.', 'Пенсии') },
      {
        id: 's-pen-art69',
        name: t('Пенсии на военни, полицаи и др. (фонд по чл. 69 КСО)', 'Pensions of military, police etc. (Art. 69 fund)'),
        value: v(art69, '1.1.', 'Пенсии'),
        note: t('Пенсии на военнослужещи, служители на МВР, ДАНС, съдебни служители по чл. 69 от Кодекса за социално осигуряване.', 'Pensions of armed forces, interior ministry, security services and other staff under Art. 69 of the Social Security Code.'),
      },
      {
        id: 's-pen-noncontrib',
        name: t('Пенсии, несвързани с трудова дейност', 'Non-contributory pensions'),
        value: v(nonContrib, '1.1.', 'Пенсии'),
        note: t('Социални пенсии за старост и инвалидност и други пенсии, финансирани от държавния бюджет.', 'Social old-age and disability pensions and other pensions funded by the state budget.'),
      },
      { id: 's-pen-accident', name: t('Пенсии за трудова злополука и професионална болест', 'Work-accident & occupational-disease pensions'), value: v(accident, '1.1.', 'Пенсии') },
      {
        id: 's-pen-teachers',
        name: t('Учителски пенсионен фонд', "Teachers' Pension Fund"),
        value: v(teachers, '', 'Пенсии'),
        note: t('Допълнителни пенсии и добавки за учители (приложение към Закона за бюджета на ДОО).', 'Additional pensions and supplements for teachers (annex to the Social Security Budget Act).'),
      },
    ] satisfies Spec[],
    /** Cash benefits paid by the social security funds, by type. */
    benefits: {
      id: 's-ben-noi',
      kind: KIND.fund,
      name: t('Обезщетения от НОИ', 'Benefits paid by the Social Security Institute'),
      value: v(consolidated, '1.2.'),
      note: ss.benefits
        ? t(
            `Общата сума е от Закона за бюджета на ДОО за ${year} г.; разбивката по видове — от ${ss.benefits.citation.bg}.`,
            `The total is from the ${year} Social Security Budget Act; the split by type is from ${ss.benefits.citation.en}.`,
          )
        : t(`Закон за бюджета на ДОО за ${year} г.`, `${year} Social Security Budget Act.`),
      children: ss.benefits ? benefitsByType(new URL(ss.benefits.file, details.dir), ss.benefits.unit) : undefined,
      rest: ss.benefits ? { id: 's-ben-noi-other', name: t('Други обезщетения и помощи', 'Other benefits') } : undefined,
    } satisfies Spec,
    administration: v(noi, '1.3.'),
  }
}

function benefitsByType(file: URL, unit: Unit): Spec[] {
  const rows = readCsv(file)
  const column = Object.keys(rows[0]).find((k) => k.startsWith('value_'))!
  const value = (start: string) => {
    const row = rows.find((r) => r.item.startsWith(start))
    if (!row) throw new Error(`Benefits: "${start}" not found`)
    return toEur(num(row[column]), unit)
  }
  return [
    { id: 's-ben-sickness', name: t('Болнични', 'Sick pay'), value: value('Обезщетения за временна неработоспособност') },
    { id: 's-ben-maternity', name: t('Майчинство (бременност и раждане)', 'Maternity (pregnancy & birth)'), value: value('Обезщетения за бременност') },
    { id: 's-ben-unemployment', name: t('Обезщетения за безработица', 'Unemployment benefits'), value: value('Парични обезщетения за безработица') },
    { id: 's-ben-childcare', name: t('Отглеждане на дете до 2 години', 'Childcare until age 2'), value: value('Обезщетения за отглеждане на дете до двегодишна') },
    { id: 's-ben-rehab', name: t('Профилактика и рехабилитация', 'Prevention & rehabilitation'), value: value('Профилактика') },
    { id: 's-ben-accident', name: t('Трудова злополука и професионална болест', 'Work accidents & occupational disease'), value: value('Обезщетения за трудова злополука') },
    {
      id: 's-ben-adoption',
      name: t('Осиновяване и отпуск на бащата', 'Adoption & paternity leave'),
      value: value('Обезщетения за осиновяване') + value('Обезщетения за отглеждане на дете до осемгодишна'),
    },
  ]
}

// ---------- state-delegated activities in municipalities ----------

type DelegatedColumn = 'education(4)' | 'health(5)' | 'social_services(6)' | 'culture(7)' | 'municipal_administration(2)' | 'defence_security(3)'

function delegatedByMunicipality(details: PlanDetails, column: DelegatedColumn, idPrefix: string): { total: number; oblasts: Spec[] } {
  const rows = readCsv(new URL(details.municipal!.file, details.dir))
  const register = readRegister(details.municipal!.register)
  const totalRow = rows.find((r) => r.municipality.trim().toUpperCase().startsWith('ВСИЧКО'))!
  const byOblast = new Map<string, { place: Municipality; value: number }[]>()
  for (const r of rows) {
    const name = fixCyrillic(r.municipality.trim())
    if (!name || name.toUpperCase().startsWith('ВСИЧКО') || name.toUpperCase().startsWith('ОБЩО')) continue
    const value = toEur(num(r[column]), details.unit)
    if (!(value > 0)) continue
    // The acts list Sofia (Столична община) right after Smolyan without its own heading; the register puts it in София-град.
    const place = register.find(r.oblast, name)
    byOblast.set(place.province, [...(byOblast.get(place.province) ?? []), { place, value }])
  }
  const oblasts: Spec[] = [...byOblast].map(([province, list]) => ({
    id: `${idPrefix}-${provinceKey(province)}`,
    kind: KIND.oblast,
    // A province with a single municipality (Sofia) stands for it: the tree drops a lone child.
    ...(province === SOFIA_CITY ? { name: t('София (Столична община)', 'Sofia (Stolichna municipality)'), code: list[0].place.code } : { name: provinceName(province) }),
    children: list.map(({ place, value }) => ({ id: `${idPrefix}-${place.key}`, code: place.code, kind: KIND.municipality, name: municipalityName(place.name), value })),
  }))
  return { total: toEur(num(totalRow[column]), details.unit), oblasts }
}

function universitySubsidy(details: PlanDetails): number {
  const u = details.universities!
  const rows = readCsv(new URL(u.file, details.dir))
  const row = rows.find((r) => Object.values(r).some((v) => v.includes('за бюджетите на държавните висши училища')))
  if (!row) throw new Error('University subsidy row not found')
  return toEur(num(row[u.column]), u.unit)
}

/**
 * The Ministry of Education's transfer to each state university and to the
 * Academy of Sciences, from the State Budget Act (the Ministry of Defence's
 * transfers to the military schools have no matching node here and are left out).
 */
function institutionTransfers(details: PlanDetails, year: number): { universities: Spec[]; academy: Spec | null } {
  const inst = details.universities?.institutions
  if (!inst) return { universities: [], academy: null }
  const rows = readCsv(new URL(inst.file, details.dir)).filter((r) => r.from_unit_code === '1700')
  const note = (r: Record<string, string>) =>
    r.short_bg ? t(`Официално: ${r.name_bg}`, `Official name (BG): ${r.name_bg}`) : undefined
  const spec = (r: Record<string, string>, id: string, kind: LocalizedText): Spec => ({
    id,
    kind,
    name: t(r.short_bg || r.name_bg, r.name_en),
    value: toEur(num(r.amount_kEUR), 'kEUR'),
    note: note(r),
  })
  const academy = rows.find((r) => r.id === 'bas')
  return {
    universities: rows.filter((r) => r !== academy).map((r) => spec(r, `ed-uni-${r.id}`, KIND.university)),
    academy: academy
      ? {
          ...spec(academy, 'g-science-bas', KIND.institution),
          note: t(
            `Трансферът от бюджета на Министерството на образованието и науката (${inst.article.bg} от Закона за държавния бюджет за ${year} г.). Академията има и собствени приходи и европейски средства.`,
            `The transfer from the Ministry of Education and Science (${inst.article.en} of the ${year} State Budget Act). The Academy also has its own revenue and EU funds.`,
          ),
        }
      : null,
  }
}

// ---------- the tree ----------

export interface PlanConfig {
  id: string
  year: number
  stage: Extract<DatasetStage, 'law' | 'forecast' | 'draft'>
  kfp: KfpPlan
  totals: KfpTotals
  details?: PlanDetails
  macro: YearMacro
  title: LocalizedText
  subtitle: LocalizedText
  description: LocalizedText
  sources: DatasetSource[]
  sourceShort: LocalizedText
  retrieved: string
  sourceCurrency: 'BGN' | 'EUR'
}

export function buildBudgetPlan(config: PlanConfig): Dataset {
  const { kfp: k, totals, details, year } = config
  const ss = details?.socialSecurity ? socialSecurity(details, year) : null
  const institutions = details ? institutionTransfers(details, year) : { universities: [], academy: null }
  const delegatedNote = details?.municipal
    ? t(
        `Средства от държавния бюджет за делегираните от държавата дейности в общините (${details.municipal.article.bg} от Закона за държавния бюджет за ${year} г.), разпределени по области и общини. Общините добавят и собствени средства.`,
        `State-budget funding for state-delegated activities run by municipalities (${details.municipal.article.en} of the ${year} State Budget Act), by province and municipality. Municipalities add their own funds on top.`,
      )
    : null
  const delegated = (column: DelegatedColumn, idPrefix: string, name: LocalizedText): Spec[] => {
    if (!details?.municipal || !delegatedNote) return []
    const { total, oblasts } = delegatedByMunicipality(details, column, idPrefix)
    return [{ id: idPrefix, kind: KIND.fund, name, value: total, note: delegatedNote, children: oblasts }]
  }
  const sub = (id: keyof typeof SUB, extra: Partial<Spec> = {}): Spec => {
    const slot = SUB[id]
    return { id: slot.id, kind: KIND.sub, name: slot.name, value: k.sub(slot.fn, slot.sub!), ...extra }
  }
  /** Children plus a rest node — only when there are itemised children. */
  const itemised = (children: Spec[], rest: Spec['rest']): Partial<Spec> => (children.length ? { children, rest } : {})

  const interest = k.fn('unclassified')
  if (Math.abs(interest - totals.interest) > 0.5 * MILLION) throw new Error(`${config.id}: interest does not match the unclassified function`)

  const root: Spec = {
    id: 'root',
    name: t('Всички публични разходи', 'All public spending'),
    value: totals.totalWithEu,
    children: [
      {
        id: 'social',
        kind: KIND.area,
        name: t('Пенсии и социална защита', 'Pensions & social protection'),
        value: k.fn('social'),
        children: [
          sub('s-pensions', ss ? { children: ss.pensions } : {}),
          sub(
            's-benefits',
            itemised(ss ? [ss.benefits] : [], {
              id: 's-ben-assistance',
              name: t('Социални и семейни помощи, помощи за хора с увреждания', 'Social & family assistance, disability support'),
              note: t(
                'Помощи, които не се изплащат от ДОО — основно от Агенцията за социално подпомагане и общините (напр. детски, за отопление, за хора с увреждания).',
                'Benefits not paid by the social security funds — mainly by the Social Assistance Agency and municipalities (e.g. child benefit, heating aid, disability support).',
              ),
            }),
          ),
          sub(
            's-services',
            itemised(
              [
                ...delegated('social_services(6)', 's-svc-municipal', t('Социални услуги, делегирани на общините', 'Social services delegated to municipalities')),
                ...(ss ? [{ id: 's-svc-noi', name: t('Администрация на НОИ', 'Social Security Institute administration'), value: ss.administration }] : []),
              ],
              { id: 's-svc-other', name: t('Програми за заетост, социални услуги и др.', 'Employment programmes, social services etc.') },
            ),
          ),
        ],
      },
      {
        id: 'economy',
        kind: KIND.area,
        name: t('Икономика и транспорт', 'Economy & transport'),
        value: k.fn('economy'),
        children: [sub('e-transport'), sub('e-energy'), sub('e-other'), sub('e-agriculture'), sub('e-tourism'), sub('e-industry')],
      },
      {
        id: 'health',
        kind: KIND.area,
        name: t('Здравеопазване', 'Health'),
        value: k.fn('health'),
        ...itemised(
          [
            ...(details?.nhif ? [nhifSpec(details, year)] : []),
            ...delegated(
              'health(5)',
              'h-municipal',
              t('Детски ясли, здравни кабинети в училищата и др. (чрез общините)', 'Nurseries, school health offices etc. (via municipalities)'),
            ),
          ],
          {
            id: 'h-other',
            name: t('Министерство на здравеопазването, болници и други', 'Ministry of Health, hospitals and other'),
            note: t(
              'Разходи за здравеопазване извън бюджета на НЗОК: Министерството на здравеопазването (спешна помощ, профилактика, държавни болници и др.), общините и други ведомства.',
              'Health spending outside the NHIF budget: the Ministry of Health (emergency care, prevention, state hospitals etc.), municipalities and other bodies.',
            ),
          },
        ),
      },
      {
        id: 'education',
        kind: KIND.area,
        name: t('Образование', 'Education'),
        value: k.fn('education'),
        ...itemised(
          [
            ...delegated(
              'education(4)',
              'ed-municipal',
              t('Детски градини и училища (държавни стандарти чрез общините)', 'Kindergartens & schools (state standards via municipalities)'),
            ),
            ...(details?.universities
              ? [
                  {
                    id: 'ed-universities',
                    name: t('Държавни университети (субсидия)', 'State universities (subsidy)'),
                    value: universitySubsidy(details),
                    note: institutions.universities.length
                      ? t(
                          `Субсидия от бюджета на Министерството на образованието и науката за държавните висши училища, по висши училища според ${details.universities.institutions!.article.bg} от Закона за държавния бюджет за ${year} г. Университетите имат и собствени приходи.`,
                          `Subsidy from the Ministry of Education and Science to state universities, by university as set in ${details.universities.institutions!.article.en} of the ${year} State Budget Act. Universities also have their own income.`,
                        )
                      : t(
                          'Субсидия от бюджета на Министерството на образованието и науката за държавните висши училища. Университетите имат и собствени приходи.',
                          'Subsidy from the Ministry of Education and Science to state universities. Universities also have their own income.',
                        ),
                    children: institutions.universities.length ? institutions.universities : undefined,
                  },
                ]
              : []),
          ],
          { id: 'ed-other', name: t('Министерство на образованието, собствени средства на общините и др.', 'Ministry of Education, municipalities’ own funds etc.') },
        ),
      },
      {
        id: 'government',
        kind: KIND.area,
        name: t('Държавно управление, дълг и ЕС', 'Government, debt & EU'),
        children: [
          {
            id: 'g-general',
            kind: KIND.func,
            name: t('Общи държавни служби', 'General public services'),
            value: k.fn('general'),
            children: [
              sub(
                'g-executive',
                itemised(
                  delegated('municipal_administration(2)', 'g-municipal-admin', t('Общинска администрация (кметове и служители)', 'Municipal administration (mayors & staff)')),
                  { id: 'g-executive-other', name: t('Министерства, агенции, парламент, президент и др.', 'Ministries, agencies, parliament, presidency etc.') },
                ),
              ),
              sub(
                'g-science',
                itemised(institutions.academy ? [institutions.academy] : [], {
                  id: 'g-science-other',
                  kind: KIND.item,
                  name: t('Друга наука', 'Other science'),
                  note: t(
                    'Останалите разходи за наука: научни институти и програми на министерствата, изследвания в университетите, собствените приходи и европейските средства на БАН и др.',
                    'The rest of science spending: research institutes and programmes of ministries, university research, the Academy’s own revenue and EU funds etc.',
                  ),
                }),
              ),
              sub('g-services'),
            ],
          },
          {
            id: 'g-eu',
            kind: KIND.func,
            name: t('Вноска в бюджета на ЕС', 'Contribution to the EU budget'),
            value: totals.euContribution,
            note: t(
              'Вноската на България в общия бюджет на Европейския съюз. Срещу нея страната получава европейски средства, които финансират част от разходите в другите области.',
              "Bulgaria's contribution to the EU budget. In return the country receives EU funds that pay for part of the spending in other areas.",
            ),
          },
          { id: 'g-interest', kind: KIND.func, name: t('Лихви по държавния дълг', 'Interest on public debt'), value: interest },
        ],
      },
      {
        id: 'order',
        kind: KIND.area,
        name: t('Ред, сигурност и правосъдие', 'Public order, safety & justice'),
        children: [sub('o-police'), sub('o-judiciary'), sub('o-prisons'), sub('o-civil')],
      },
      {
        id: 'defence',
        kind: KIND.area,
        name: t('Отбрана', 'Defence'),
        value: k.sub('security', SUB.defence.sub!),
        note: t(
          'Функцията „Отбрана“ в консолидираната фискална програма. Целият бюджет на Министерството на отбраната е по-голям, защото включва и военни болници, училища и др.',
          'The defence function of the consolidated fiscal programme. The whole Ministry of Defence budget is larger, as it also covers military hospitals, schools etc.',
        ),
      },
      {
        id: 'community',
        kind: KIND.area,
        name: t('Комунални дейности, култура и околна среда', 'Communities, culture & environment'),
        children: [
          { ...sub('c-housing'), kind: KIND.func },
          { ...sub('c-environment'), kind: KIND.func },
          {
            id: 'c-culture',
            kind: KIND.func,
            name: t('Култура, спорт и религия', 'Culture, sport & religion'),
            value: k.fn('culture'),
            children: [
              sub(
                'c-culture-culture',
                itemised(
                  delegated('culture(7)', 'c-culture-municipal', t('Читалища, библиотеки и музеи (чрез общините)', 'Community centres, libraries & museums (via municipalities)')),
                  { id: 'c-culture-other', name: t('Театри, музеи, опери и др.', 'Theatres, museums, operas etc.') },
                ),
              ),
              sub('c-sport'),
              sub('c-religion'),
              sub('c-recreation'),
            ],
          },
        ],
      },
    ],
  }

  const tree = build(root)
  const sum = tree.children!.reduce((s, c) => s + c.value, 0)
  if (Math.abs(sum - tree.value) > MILLION) throw new Error(`${config.id}: areas sum to ${sum}, total ${tree.value}`)

  return {
    id: config.id,
    year,
    kind: 'plan',
    stage: config.stage,
    family: 'functions',
    title: config.title,
    subtitle: config.subtitle,
    description: config.description,
    currency: 'EUR',
    sourceCurrency: config.sourceCurrency,
    population: config.macro.population,
    populationNote: config.macro.populationNote,
    gdp: config.macro.gdp,
    gdpNote: config.macro.gdpNote,
    levels: [KIND.area, KIND.func, KIND.item, KIND.item],
    sources: config.sources,
    sourceShort: config.sourceShort,
    retrieved: config.retrieved,
    root: tree,
  }
}
