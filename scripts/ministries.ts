// "Ministries <year>": spending of the first-level budget units of the State
// Budget Act (para. 2 of each unit's article) by policy area or functional
// area — from the adopted law (plan) or from the report on its execution
// (actual). Where the government's decree on implementing the budget lists the
// programme budgets (2026: ПМС № 102/2026, Annex 1), every area is split into
// its budget programmes, and every programme into its departmental costs
// (staff, running costs, capital) and the administered items it pays out
// (benefits, subsidies, contributions …).
//
// Area ids come from the area's name, not its row number (which shifts between
// years), so the same policy area is the same node in every year. Programme ids
// come from the programme code ("p1500-03-01"; the codes are fixed for 2026–2030).

import type { Dataset, DatasetSource, DatasetStage, LocalizedText } from '../src/lib/types.ts'
import { fixCyrillic, num, readCsv } from './lib/csv.ts'
import { toEur } from './lib/kfp.ts'
import type { YearMacro } from './lib/macro.ts'
import { AREAS, UNIT_CODES, UNITS } from './lib/ministries-labels.ts'
import { slug } from './lib/places.ts'
import { build, type Spec } from './lib/tree-builder.ts'

const t = (bg: string, en: string): LocalizedText => ({ bg, en })

export const KIND = {
  unit: t('Министерство / ведомство', 'Ministry / agency'),
  area: t('Политика / функционална област', 'Policy / functional area'),
  programme: t('Бюджетна програма', 'Budget programme'),
  departmental: t('Ведомствен разход', 'Departmental spending'),
  administered: t('Администриран разход', 'Administered spending'),
}

// ---------- programme budgets (Annex 1 to the decree on implementing the State Budget) ----------

export type LineType = 'staff' | 'running' | 'capital' | 'administered'

export interface ProgrammeLine {
  line: LineType
  name: LocalizedText
  /** The name as printed. */
  official: string
  /** The "в т.ч." item (or the staff total) this line is a part of. */
  group?: { name: LocalizedText; official: string }
  value: number
  /** Computed as a remainder, not printed in the decree. */
  derived: boolean
}

export interface Programme {
  code: string
  name: LocalizedText
  official: string
  value: number
  lines: ProgrammeLine[]
}

export interface ProgrammeArea {
  code: string
  official: string
  value: number
  /** A programme listed at area level ("Бюджетна програма „Администрация“"); its only programme is itself. */
  standalone: boolean
  programmes: Programme[]
}

export interface ProgrammeUnit {
  code: string
  value: number
  areas: ProgrammeArea[]
}

const display = (official: string, short: string, en: string): LocalizedText => ({ bg: short || official, en })
const total = (values: number[]) => values.reduce((a, b) => a + b, 0)

/** The amount of a row in whole euro or leva (`amount_EUR` / `amount_BGN`), and its currency. */
function amountOf(r: Record<string, string>): { value: number; currency: 'EUR' | 'BGN' } {
  if (r.amount_EUR !== undefined) return { value: num(r.amount_EUR), currency: 'EUR' }
  if (r.amount_BGN !== undefined) return { value: num(r.amount_BGN), currency: 'BGN' }
  throw new Error('programme budgets: no amount_EUR or amount_BGN column')
}

/**
 * Reads the programme budgets (`*-programmes.csv`: units, areas, programmes;
 * `*-programme-lines.csv`: one row per line of a programme, in whole euro or
 * leva), checks that every level adds up in the source currency (lines →
 * programme → area → unit) and returns the amounts in euro.
 */
export function readProgrammeBudgets(structureFile: URL, linesFile: URL): Map<string, ProgrammeUnit> {
  const units = new Map<string, ProgrammeUnit>()
  const programmes = new Map<string, Programme>()
  let currency: 'EUR' | 'BGN' | undefined
  for (const r of readCsv(structureFile)) {
    const amount = amountOf(r)
    currency ??= amount.currency
    const value = amount.value
    if (r.level === 'unit') {
      units.set(r.unit_code, { code: r.unit_code, value, areas: [] })
      continue
    }
    const unit = units.get(r.unit_code)
    if (!unit) throw new Error(`${structureFile.pathname}: ${r.code} comes before its unit`)
    const programme: Programme = { code: r.code, name: display(r.name_bg, r.short_bg, r.name_en), official: r.name_bg, value, lines: [] }
    if (r.level === 'policy') {
      const standalone = r.name_bg.startsWith('Бюджетна програма')
      unit.areas.push({ code: r.code, official: r.name_bg, value, standalone, programmes: standalone ? [programme] : [] })
      if (standalone) programmes.set(r.code, programme)
    } else {
      const area = unit.areas.at(-1)
      if (!area || area.standalone) throw new Error(`${structureFile.pathname}: programme ${r.code} outside an area`)
      area.programmes.push(programme)
      programmes.set(r.code, programme)
    }
  }
  for (const r of readCsv(linesFile)) {
    const programme = programmes.get(r.programme_code)
    if (!programme) throw new Error(`${linesFile.pathname}: unknown programme ${r.programme_code}`)
    programme.lines.push({
      line: r.line as LineType,
      name: display(r.name_bg, r.short_bg, r.name_en),
      official: r.name_bg,
      group: r.group_bg ? { name: display(r.group_bg, r.group_short_bg, r.group_en), official: r.group_bg } : undefined,
      value: amountOf(r).value,
      derived: r.derived === 'remainder',
    })
  }
  for (const unit of units.values()) {
    for (const area of unit.areas) {
      for (const p of area.programmes) {
        if (total(p.lines.map((l) => l.value)) !== p.value) throw new Error(`Programme ${p.code}: lines do not add up to ${p.value}`)
      }
      if (total(area.programmes.map((p) => p.value)) !== area.value) throw new Error(`Area ${area.code}: programmes do not add up to ${area.value}`)
    }
    if (total(unit.areas.map((a) => a.value)) !== unit.value) throw new Error(`Unit ${unit.code}: areas do not add up to ${unit.value}`)
  }
  if (currency === 'BGN') {
    const eur = (bgn: number) => toEur(bgn / 1000, 'kBGN')
    for (const unit of units.values()) {
      unit.value = eur(unit.value)
      for (const area of unit.areas) {
        area.value = eur(area.value)
        for (const p of area.programmes) {
          p.value = eur(p.value)
          for (const l of p.lines) l.value = eur(l.value)
        }
      }
    }
  }
  return units
}

// ---------- notes ----------

/** Notes in sequence, each ending with a full stop (a single note is kept as it is). */
function joinNotes(...notes: (LocalizedText | undefined)[]): LocalizedText | undefined {
  const list = notes.filter((n): n is LocalizedText => Boolean(n))
  if (list.length < 2) return list[0]
  const join = (lang: keyof LocalizedText) => list.map((n) => n[lang].trim().replace(/([^.!?…])$/, '$1.')).join(' ')
  return { bg: join('bg'), en: join('en') }
}

/** "Бюджетна програма „Администрация“" → "Администрация". */
const unwrap = (official: string) => official.replace(/^Бюджетна програма\s*[„"](.*)[“"]$/, '$1').trim()

/** The printed name, when the one shown is shorter or reworded. */
function officialNote(official: string, shown: string): LocalizedText | undefined {
  const plain = official.replace(/,?\s*в\s*т\.\s*ч\.\s*:?$/, '').replace(/:$/, '').trim()
  return unwrap(plain) === shown ? undefined : t(`Официално: ${plain}`, `Official name (BG): ${plain}`)
}

const DERIVED = {
  staff: t(
    'Изчислено: целият персонал минус „персонал без делегирани бюджети“ — заплатите и осигуровките в подчинените звена, които управляват собствен (делегиран) бюджет, например държавни училища, театри и музеи.',
    'Derived: all staff costs minus “staff outside delegated budgets” — the pay of subordinate units that manage their own (delegated) budgets, such as state schools, theatres and museums.',
  ),
  rest: t('Изчислено: сумата на перото минус изброените в него.', 'Derived: the item’s total minus the parts listed under it.'),
}

const euros = (eur: number): LocalizedText => {
  const m = (eur / 1e6).toFixed(1)
  return t(`${m.replace('.', ',')} млн. €`, `€${m} m`)
}

// ---------- tree specs ----------

/** A spec while the tree is assembled; `chain` says which single-item levels below it were skipped. */
type Draft = Spec & { chain?: LocalizedText }

/** What a skipped single-item level was. */
function skippedLevel(only: Draft): LocalizedText {
  if (only.kind === KIND.programme && only.code) {
    return t(`Бюджетна програма „${only.name.bg}“ (${only.code}).`, `Budget programme “${only.name.en}” (${only.code}).`)
  }
  if (only.kind === KIND.programme) return t(`Бюджетна програма „${only.name.bg}“.`, `Budget programme “${only.name.en}”.`)
  return t(`Цялата сума е за „${only.name.bg}“.`, `All of it goes to “${only.name.en}”.`)
}

/**
 * Drops items worth nothing. A level with a single item left is pointless, so
 * it is skipped: the node takes over that item's children and names it in its note.
 */
function skipSingle(spec: Draft): Draft {
  const children = ((spec.children ?? []) as Draft[]).filter((c) => c.value === undefined || c.value > 0)
  if (children.length !== 1) return { ...spec, children: children.length ? children : undefined }
  const [only] = children
  const chain = joinNotes(skippedLevel(only), only.chain)
  return { ...spec, children: only.children, rest: only.rest, note: joinNotes(spec.note, chain), chain }
}

const LINE_KIND: Record<LineType, LocalizedText> = {
  staff: KIND.departmental,
  running: KIND.departmental,
  capital: KIND.departmental,
  administered: KIND.administered,
}

/** Departmental lines and administered items of a programme; "в т.ч." parts are nested under their item. */
function lineSpecs(programme: Programme, pid: string, newId: (base: string) => string): Draft[] {
  // Up to 48 characters, cut at a word boundary.
  const short = (en: string) => {
    const full = slug(en)
    return full.length <= 48 ? full : full.slice(0, 49).replace(/-[^-]*$/, '')
  }
  const baseId = (l: ProgrammeLine, name: LocalizedText) => (l.line === 'administered' ? `${pid}-${short(name.en)}` : `${pid}-${l.line}`)
  const leaf = (l: ProgrammeLine, id: string): Draft => ({
    id,
    kind: LINE_KIND[l.line],
    name: l.name,
    value: l.value,
    note: l.derived ? (l.line === 'staff' ? DERIVED.staff : DERIVED.rest) : officialNote(l.official, l.name.bg),
  })
  const specs: Draft[] = []
  const groups = new Map<string, Draft>()
  for (const l of programme.lines) {
    if (!l.value) continue
    if (!l.group) {
      specs.push(leaf(l, newId(baseId(l, l.name))))
      continue
    }
    let group = groups.get(l.group.official)
    if (!group) {
      group = { id: newId(baseId(l, l.group.name)), kind: LINE_KIND[l.line], name: l.group.name, value: 0, note: officialNote(l.group.official, l.group.name.bg), children: [] }
      groups.set(l.group.official, group)
      specs.push(group)
    }
    group.value! += l.value
    const part = l.line === 'staff' ? (l.derived ? 'delegated' : 'outside-delegated') : l.derived ? 'other' : short(l.name.en)
    group.children!.push(leaf(l, newId(`${group.id}-${part}`)))
  }
  return specs.map(skipSingle)
}

/** Ids that stay unique within a dataset. */
function idMaker(): (base: string) => string {
  const used = new Set<string>()
  return (base) => {
    let id = base
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`
    used.add(id)
    return id
  }
}

/** Area and programme names compared without quotes, "(общо), в т.ч.:" and case. */
const norm = (s: string) =>
  fixCyrillic(s)
    .replace(/[„“"”]/g, '')
    .replace(/\(общо\)/g, '')
    .replace(/,?\s*в\s*т\.\s*ч\.\s*:?/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[\s:]+$/, '')
    .trim()
    .toLocaleLowerCase('bg-BG')

/** A short, stable id for a policy area of a unit, from its English name. */
const areaId = (unitId: string, name: LocalizedText) => `${unitId}-${slug(name.en).slice(0, 48).replace(/-$/, '')}`

export interface MinistriesConfig {
  id: string
  year: number
  stage: Extract<DatasetStage, 'law' | 'report'>
  file: URL
  unit: 'kEUR' | 'kBGN'
  /**
   * Programme budgets: the decree's areas, programmes and their lines (see
   * readProgrammeBudgets). `idsFrom` is a later year's programmes file: a
   * programme whose code is used there for another programme gets an id with
   * the year, so the two are never compared as the same.
   */
  programmes?: { structure: URL; lines: URL; idsFrom?: URL }
  /**
   * The ministries' transfers to the state universities and the Academy of
   * Sciences (State Budget Act); they are not part of the ministries' spending,
   * so they are only mentioned in a note on the paying ministry.
   */
  transfers?: { file: URL; seeAlso: Record<string, LocalizedText> }
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

/** Note on a ministry that transfers money to universities: how much, to whom, and that it is not its spending. */
function transferNotes(config: NonNullable<MinistriesConfig['transfers']>): Map<string, LocalizedText> {
  const byPayer = new Map<string, Record<string, string>[]>()
  for (const r of readCsv(config.file)) byPayer.set(r.from_unit_code, [...(byPayer.get(r.from_unit_code) ?? []), r])
  const notes = new Map<string, LocalizedText>()
  for (const [code, rows] of byPayer) {
    const value = (r: Record<string, string>) => toEur(num(r.amount_kEUR), 'kEUR')
    const sum = euros(total(rows.map(value)))
    const academy = rows.some((r) => r.id === 'bas')
    const n = rows.length - (academy ? 1 : 0)
    const whom = t(
      `${n} държавни висши училища${academy ? ' и на Българската академия на науките' : ''}`,
      `${n} state higher education institutions${academy ? ' and the Bulgarian Academy of Sciences' : ''}`,
    )
    const where = t(`чл. ${rows[0].article}, ал. ${rows[0].paragraph} от закона`, `Art. ${rows[0].article}(${rows[0].paragraph}) of the act`)
    const largest = [...rows].sort((a, b) => value(b) - value(a)).slice(0, 5)
    const list = (lang: keyof LocalizedText) => largest.map((r) => `${lang === 'bg' ? r.short_bg || r.name_bg : r.name_en} ${euros(value(r))[lang]}`).join('; ')
    const more = rows.length > largest.length
    notes.set(
      code,
      joinNotes(
        t(
          `Отделно от тези разходи министерството превежда ${sum.bg} на ${whom.bg} (${where.bg}) — ${more ? 'най-много на: ' : ''}${list('bg')}. Трансферите към други бюджети не са разход на министерството и не влизат в сумата.`,
          `On top of this spending the ministry transfers ${sum.en} to ${whom.en} (${where.en}) — ${more ? 'the largest: ' : ''}${list('en')}. Transfers to other budgets are not the ministry’s spending and are not included.`,
        ),
        config.seeAlso[code],
      )!,
    )
  }
  return notes
}

export function buildMinistries(config: MinistriesConfig): Dataset {
  const rows = readCsv(config.file)
  const amountColumn = Object.keys(rows[0]).find((k) => k.startsWith('amount_'))!
  const budgets = config.programmes ? readProgrammeBudgets(config.programmes.structure, config.programmes.lines) : null
  const laterNames = new Map(config.programmes?.idsFrom ? readCsv(config.programmes.idsFrom).map((r) => [r.code, norm(r.name_bg)]) : [])
  /** "p1500-03-01"; with the year when a later year uses the code for a different programme. */
  const programmeId = (p: Programme) => {
    const later = laterNames.get(p.code)
    return `p${p.code.replace(/\./g, '-')}${later !== undefined && later !== norm(p.official) ? `-${config.year}` : ''}`
  }
  const transfers = config.transfers ? transferNotes(config.transfers) : null
  const newId = idMaker()
  const units = new Map<string, { total: number; areas: { no: string; label: string; value: number }[] }>()
  for (const r of rows) {
    const unit = fixCyrillic(r.spending_unit.trim())
    const label = fixCyrillic(r.policy_area_or_program.trim())
    const value = toEur(num(r[amountColumn]), config.unit)
    const entry = units.get(unit) ?? { total: 0, areas: [] }
    units.set(unit, entry)
    if (label === '1' && Math.abs(num(r[amountColumn]) - 2) < 1e-9) continue // column-number header row
    if (label.startsWith('Всичко')) entry.total = value
    else if (r.row_no.trim()) entry.areas.push({ no: r.row_no.trim(), label, value })
    // Rows without a number are "of which" lines (or, for the 2024 judiciary, a split by judicial body) and are not used.
  }

  const children: Spec[] = []
  const matchedUnits = new Set<string>()
  for (const [lawName, unit] of units) {
    const meta = UNITS[lawName]
    if (!meta) throw new Error(`Ministries ${config.year}: no display name for "${lawName}"`)
    if (!(unit.total > 0)) throw new Error(`Ministries ${config.year}: no total for "${lawName}"`)
    const decree = budgets?.get(UNIT_CODES[meta.id] ?? '')
    const where = `Ministries ${config.year}, ${meta.name.en}`
    if (decree) {
      matchedUnits.add(decree.code)
      if (Math.abs(decree.value - unit.total) > 0.5) throw new Error(`${where}: the programme budgets total ${decree.value}, the law ${unit.total}`)
    }
    const unmatched = new Set(decree?.areas)
    // Top-level rows ("1.", "2.") are areas; "7.1." rows split the area above them.
    const top = unit.areas.filter((a) => /^\d+\.$/.test(a.no))
    const areaSpecs: Draft[] = top.map((area) => {
      const name = AREAS[area.label]
      if (!name) throw new Error(`Ministries ${config.year}: no display name for area "${area.label}"`)
      const id = areaId(meta.id, name)
      const note = area.label !== name.bg ? t(`Официално: ${area.label.replace(/:$/, '')}`, `Official name (BG): ${area.label.replace(/:$/, '')}`) : undefined
      const subRows = unit.areas.filter((a) => a.no.startsWith(area.no) && a.no !== area.no)
      const subName = (label: string) => {
        const sub = AREAS[label]
        if (!sub) throw new Error(`Ministries ${config.year}: no display name for "${label}"`)
        return sub
      }

      // The decree's area: same name (or, failing that, the only one with the same amount).
      const candidates = [...unmatched]
      const found =
        candidates.find((a) => norm(a.official) === norm(area.label)) ??
        (candidates.filter((a) => Math.abs(a.value - area.value) < 0.5).length === 1 ? candidates.find((a) => Math.abs(a.value - area.value) < 0.5) : undefined)
      if (decree && !found) throw new Error(`${where}: area "${area.label}" not in the programme budgets`)
      if (!found) {
        const programmes = subRows.map((s) => ({ id: areaId(id, subName(s.label)), kind: KIND.programme, name: subName(s.label), value: s.value }))
        return skipSingle({ id, kind: KIND.area, name, value: area.value, note, children: programmes })
      }
      unmatched.delete(found)
      if (found.value > area.value + 0.5) throw new Error(`${where}: the programmes of "${area.label}" exceed the law`)
      // Programmes that do not cover the area as voted are shown with a labelled remainder.
      const rest =
        found.value < area.value - 0.5
          ? {
              id: `${id}-unallocated`,
              name: t('Неразпределено по програми', 'Not allocated to programmes'),
              note: t('Разликата между сумата по закона и програмите в постановлението.', 'The difference between the amount in the act and the programmes in the decree.'),
            }
          : undefined
      if (rest) console.warn(`  ! ${where}: "${area.label}" — programmes ${found.value}, law ${area.value}; the difference is shown as "not allocated"`)
      if (found.standalone) {
        const [programme] = found.programmes
        return skipSingle({ id, code: programme.code, kind: KIND.programme, name, value: area.value, note, rest, children: lineSpecs(programme, programmeId(programme), newId) })
      }
      const programmes = found.programmes.map((p): Draft => {
        // A programme the law itself lists under the area keeps the id it has had since 2024.
        const sub = subRows.find((s) => norm(s.label) === norm(p.official))
        const pname = sub ? subName(sub.label) : p.name
        const pid = sub ? areaId(id, pname) : programmeId(p)
        return skipSingle({ id: pid, code: p.code, kind: KIND.programme, name: pname, value: p.value, note: officialNote(p.official, pname.bg), children: lineSpecs(p, programmeId(p), newId) })
      })
      return skipSingle({ id, code: found.code, kind: KIND.area, name, value: area.value, note, rest, children: programmes })
    })
    if (unmatched.size) throw new Error(`${where}: programme-budget areas without a match in the law: ${[...unmatched].map((a) => a.code).join(', ')}`)
    children.push(
      skipSingle({
        id: meta.id,
        kind: KIND.unit,
        name: meta.name,
        value: unit.total,
        note: transfers?.get(UNIT_CODES[meta.id] ?? ''),
        children: areaSpecs,
      }),
    )
  }
  const missing = [...(budgets?.keys() ?? [])].filter((code) => !matchedUnits.has(code))
  if (missing.length) throw new Error(`Ministries ${config.year}: programme budgets of units not in the law: ${missing.join(', ')}`)

  const root = build({ id: 'root', name: t('Министерства и ведомства', 'Ministries and agencies'), children })

  return {
    id: config.id,
    year: config.year,
    kind: config.stage === 'report' ? 'actual' : 'plan',
    stage: config.stage,
    family: 'ministries',
    title: config.title,
    subtitle: config.subtitle,
    description: config.description,
    currency: 'EUR',
    sourceCurrency: config.unit.endsWith('BGN') ? 'BGN' : 'EUR',
    population: config.macro.population,
    populationNote: config.macro.populationNote,
    gdp: config.macro.gdp,
    gdpNote: config.macro.gdpNote,
    levels: budgets ? [KIND.unit, KIND.area, KIND.programme, t('Разход', 'Spending line')] : [KIND.unit, KIND.area, KIND.programme],
    sources: config.sources,
    sourceShort: config.sourceShort,
    retrieved: config.retrieved,
    publicTotal: config.publicTotal,
    root,
  }
}
