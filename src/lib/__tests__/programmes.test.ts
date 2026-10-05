import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { readProgrammeBudgets } from '../../../scripts/ministries.ts'
import type { BudgetNode, Dataset, SeriesFile } from '../types'

const sources = new URL('../../../data/sources/', import.meta.url)
const data = new URL('../../../public/data/', import.meta.url)
const read = <T,>(file: string) => JSON.parse(readFileSync(new URL(file, data), 'utf8')) as T

function index(root: BudgetNode): Map<string, { node: BudgetNode; parent: string | null }> {
  const map = new Map<string, { node: BudgetNode; parent: string | null }>()
  const walk = (node: BudgetNode, parent: string | null) => {
    map.set(node.id, { node, parent })
    node.children?.forEach((c) => walk(c, node.id))
  }
  walk(root, null)
  return map
}

describe('programme budgets (ПМС № 102/2026, Annex 1)', () => {
  const units = readProgrammeBudgets(
    new URL('budget-2026/state-budget-2026-programmes.csv', sources),
    new URL('budget-2026/state-budget-2026-programme-lines.csv', sources),
  )

  it('covers the 44 programme-format units and adds up to the law without Parliament and the judiciary', () => {
    expect(units.size).toBe(44)
    const total = [...units.values()].reduce((s, u) => s + u.value, 0)
    // €13,326,470.3 k in the law, minus the National Assembly (€63,167.0 k) and the judiciary (€762,033.0 k).
    expect(total).toBe(13_326_470_300 - 63_167_000 - 762_033_000)
  })

  it('keeps the named administered items', () => {
    const labour = units.get('1500')!
    const assistance = labour.areas.flatMap((a) => a.programmes).find((p) => p.code === '1500.03.01')!
    const item = (start: string) => assistance.lines.find((l) => l.official.startsWith(start))!
    expect(item('Месечни помощи по Закона за социално подпомагане').value).toBe(78_644_100)
    expect(item('Целеви помощи за отопление').value).toBe(49_549_300)
    expect(item('Целеви помощи за отопление').name.en).toBe('Heating aid')
  })

  it('applies the documented corrections of misprints', () => {
    const programme = (unit: string, code: string) => units.get(unit)!.areas.flatMap((a) => a.programmes).find((p) => p.code === code)!
    expect(programme('1700', '1700.01.05').value).toBe(11_570_400)
    expect(programme('1100', '1100.01.03').lines.find((l) => l.line === 'running')!.value).toBe(897_900)
  })

  it('converts a decree in leva (2025) to euro', () => {
    const units2025 = readProgrammeBudgets(
      new URL('budget-2025/state-budget-2025-programmes.csv', sources),
      new URL('budget-2025/state-budget-2025-programme-lines.csv', sources),
    )
    expect(units2025.size).toBe(46)
    const total = [...units2025.values()].reduce((s, u) => s + u.value, 0)
    expect(total).toBeCloseTo(22_813_961_600 / 1.95583, 0)
  })

  it('refuses lines that do not add up to their programme', () => {
    const dir = mkdtempSync(join(tmpdir(), 'programmes-'))
    const structure = join(dir, 'p.csv')
    const lines = join(dir, 'l.csv')
    writeFileSync(
      structure,
      'unit_code,code,level,name_bg,short_bg,name_en,amount_EUR\n9900,9900,unit,Ведомството,,,300\n9900,9900.01.00,policy,Политика,,,300\n9900,9900.01.01,programme,Бюджетна програма „А“,,,300\n',
    )
    writeFileSync(
      lines,
      'unit_code,policy_code,programme_code,line,item_no,name_bg,short_bg,name_en,group_bg,group_short_bg,group_en,amount_EUR,derived\n9900,9900.01.00,9900.01.01,staff,,Персонал,,Staff costs,,,,200,\n',
    )
    expect(() => readProgrammeBudgets(pathToFileURL(structure), pathToFileURL(lines))).toThrow(/do not add up/)
  })
})

describe('Ministries 2026', () => {
  const dataset = read<Dataset>('ministries-2026.json')
  const nodes = index(dataset.root)

  it('keeps the programme ids the eight 2026 bill units had', () => {
    for (const id of ['p1200-01-01', 'p1200-02-02', 'p1400-02-01', 'p1500-03-01', 'p1600-02-03', 'p1900-01-04', 'p2100-02-01', 'p2200-01-11', 'p8400-01-04']) {
      expect(nodes.get(id)?.node.kind?.en, id).toBe('Budget programme')
    }
  })

  it('splits programmes into departmental lines and administered items', () => {
    const heating = nodes.get('p1500-03-01-heating-aid')!
    expect(heating.node.value).toBe(49_549_300)
    expect(heating.parent).toBe('p1500-03-01')
    expect(heating.node.kind?.en).toBe('Administered spending')
    expect(nodes.get('p1500-03-01-staff')!.node.kind?.en).toBe('Departmental spending')
    // Staff in schools with delegated budgets is shown apart from the ministry's own staff.
    const staff = nodes.get('p1700-01-03-staff')!.node
    expect(staff.children?.map((c) => c.id).sort()).toEqual(['p1700-01-03-staff-delegated', 'p1700-01-03-staff-outside-delegated'])
  })

  it('skips single-programme levels and says so in a note', () => {
    const debt = nodes.get('mof-debt-management')!.node
    expect(nodes.has('p1000-04-01')).toBe(false)
    expect(debt.note?.en).toContain('Budget programme “Liquidity management” (1000.04.01)')
    expect(debt.children?.some((c) => c.id === 'p1000-04-01-sovereign-credit-rating-fees')).toBe(true)
  })

  it('mentions the transfers to universities on the paying ministries', () => {
    expect(nodes.get('mes')!.node.note?.en).toContain('€792.9 m')
    expect(nodes.get('mod')!.node.note?.en).toContain('Vasil Levski National Military University €19.4 m')
  })

  it('keeps Parliament and the judiciary by functional area', () => {
    for (const id of ['parliament', 'judiciary']) {
      for (const area of nodes.get(id)!.node.children ?? []) expect(area.children).toBeUndefined()
    }
  })
})

describe('series-ministries.json', () => {
  const series = read<SeriesFile>('series-ministries.json')

  it('compares ministries and their areas across all four datasets', () => {
    expect(series.datasets).toEqual(['ministries-2024', 'ministries-2025', 'ministries-report-2025', 'ministries-2026'])
    for (const id of ['root', 'mod', 'molsp', 'mes', 'molsp-social-assistance-and-gender-equality', 'mof-collecting-taxes-and-customs-duties']) {
      expect(series.values[id].every((v) => v !== null), id).toBe(true)
    }
  })

  it('compares programmes and their items between the 2025 and 2026 plans', () => {
    const [, plan2025, , plan2026] = series.values['p1500-03-01-heating-aid']
    expect(plan2026).toBe(49_549_300)
    expect(plan2025).toBeGreaterThan(0)
  })

  it('does not compare different programmes that share a code', () => {
    // 7400.01.02 was investment promotion in 2025 and is competitiveness in 2026.
    expect(series.values['p7400-01-02']).toBeUndefined()
    expect(series.nodes['p7400-01-02-2025']).toBeUndefined()
  })
})

describe('universities (State Budget Act 2026, art. 16(4))', () => {
  const nodes = index(read<Dataset>('budget-2026.json').root)

  it('lists every state university under the subsidy, adding up exactly', () => {
    const subsidy = nodes.get('ed-universities')!.node
    expect(subsidy.children).toHaveLength(33)
    expect(subsidy.children!.reduce((s, c) => s + c.value, 0)).toBe(subsidy.value)
    expect(nodes.get('ed-uni-sofia-university')!.node.value).toBe(106_322_000)
    expect(nodes.get('ed-uni-tu-sofia')!.node.value).toBe(79_996_900)
  })

  it('shows the Academy of Sciences under science', () => {
    expect(nodes.get('g-science-bas')).toMatchObject({ parent: 'g-science', node: { value: 131_577_700 } })
  })
})
