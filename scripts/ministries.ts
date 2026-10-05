// "Ministries <year>": spending of the first-level budget units of the State
// Budget Act (para. 2 of each unit's article) by policy area or functional
// area — from the adopted law (plan) or from the report on its execution
// (actual) — and, where the programme budgets attached to the 2026 bill could
// be matched to the law exactly, by budget programme.
//
// Area ids come from the area's name, not its row number (which shifts between
// years), so the same policy area is the same node in every year.

import type { Dataset, DatasetSource, DatasetStage, LocalizedText } from '../src/lib/types.ts'
import { fixCyrillic, num, readCsv } from './lib/csv.ts'
import { toEur } from './lib/kfp.ts'
import type { YearMacro } from './lib/macro.ts'
import { AREAS, UNITS } from './lib/ministries-labels.ts'
import { slug } from './lib/places.ts'
import { build, type Spec } from './lib/tree-builder.ts'

const t = (bg: string, en: string): LocalizedText => ({ bg, en })

const KIND = {
  unit: t('Министерство / ведомство', 'Ministry / agency'),
  area: t('Политика / функционална област', 'Policy / functional area'),
  programme: t('Бюджетна програма', 'Budget programme'),
}

interface Programme {
  code: string
  name: LocalizedText
  value: number
}

/** Programmes grouped by the value of their policy area (matched to the law's policy rows), EUR. */
function programmesByPolicy(file: URL): Map<string, Map<number, Programme[]>> {
  const byUnit = new Map<string, Map<number, Programme[]>>()
  for (const r of readCsv(file)) {
    const policies = byUnit.get(r.unit_code) ?? new Map<number, Programme[]>()
    const key = Math.round(num(r.policy_value_kEUR) * 10)
    const list = policies.get(key) ?? []
    list.push({ code: r.programme_code, name: t(r.name_bg, r.name_en), value: toEur(num(r.value_kEUR), 'kEUR') })
    policies.set(key, list)
    byUnit.set(r.unit_code, policies)
  }
  return byUnit
}

/** Programme-budget unit codes for the units whose 2026 programmes are included. */
const PROGRAMME_UNIT: Record<string, string> = {
  mod: '1200',
  moj: '1400',
  molsp: '1500',
  moh: '1600',
  moew: '1900',
  mrdpw: '2100',
  mafood: '2200',
  'state-fund-agriculture': '8400',
}

/** A short, stable id for a policy area of a unit, from its English name. */
const areaId = (unitId: string, name: LocalizedText) => `${unitId}-${slug(name.en).slice(0, 48).replace(/-$/, '')}`

export interface MinistriesConfig {
  id: string
  year: number
  stage: Extract<DatasetStage, 'law' | 'report'>
  file: URL
  unit: 'kEUR' | 'kBGN'
  /** 2026 programme budgets (programme rows matched to policy values in thousand EUR). */
  programmes?: URL
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

export function buildMinistries(config: MinistriesConfig): Dataset {
  const rows = readCsv(config.file)
  const amountColumn = Object.keys(rows[0]).find((k) => k.startsWith('amount_'))!
  const programmes = config.programmes ? programmesByPolicy(config.programmes) : null
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
  for (const [lawName, unit] of units) {
    const meta = UNITS[lawName]
    if (!meta) throw new Error(`Ministries ${config.year}: no display name for "${lawName}"`)
    if (!(unit.total > 0)) throw new Error(`Ministries ${config.year}: no total for "${lawName}"`)
    // Top-level rows ("1.", "2.") are areas; "7.1." rows split the area above them.
    const top = unit.areas.filter((a) => /^\d+\.$/.test(a.no))
    const unitProgrammes = programmes && PROGRAMME_UNIT[meta.id] ? programmes.get(PROGRAMME_UNIT[meta.id]) : undefined
    const areaSpecs: Spec[] = top.map((area) => {
      const name = AREAS[area.label]
      if (!name) throw new Error(`Ministries ${config.year}: no display name for area "${area.label}"`)
      const id = areaId(meta.id, name)
      const subRows = unit.areas.filter((a) => a.no.startsWith(area.no) && a.no !== area.no)
      const fromLaw: Spec[] = subRows.map((s) => {
        const subName = AREAS[s.label]
        if (!subName) throw new Error(`Ministries ${config.year}: no display name for "${s.label}"`)
        return { id: areaId(id, subName), kind: KIND.programme, name: subName, value: s.value }
      })
      const fromBill = unitProgrammes?.get(Math.round((area.value / 1000) * 10)) ?? []
      const programmeSpecs: Spec[] = fromLaw.length
        ? fromLaw
        : fromBill
            .filter((p) => p.value > 0)
            .map((p) => ({ id: `p${p.code.replace(/\./g, '-')}`, code: p.code, kind: KIND.programme, name: p.name, value: p.value }))
      return {
        id,
        kind: KIND.area,
        name,
        value: area.value,
        note: area.label !== name.bg ? t(`Официално: ${area.label.replace(/:$/, '')}`, `Official name (BG): ${area.label.replace(/:$/, '')}`) : undefined,
        children: programmeSpecs.length > 1 ? programmeSpecs : undefined,
      }
    })
    children.push({
      id: meta.id,
      kind: KIND.unit,
      name: meta.name,
      value: unit.total,
      children: areaSpecs.length > 1 ? areaSpecs : undefined,
      note: areaSpecs.length === 1 ? t(`Цялата сума е за „${areaSpecs[0].name.bg}“.`, `All of it goes to “${areaSpecs[0].name.en}”.`) : undefined,
    })
  }

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
    levels: [KIND.unit, KIND.area, KIND.programme],
    sources: config.sources,
    sourceShort: config.sourceShort,
    retrieved: config.retrieved,
    publicTotal: config.publicTotal,
    root,
  }
}
