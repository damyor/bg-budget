import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { readCsv } from '../../../scripts/lib/csv.ts'
import { readNodeLinks } from '../../../scripts/lib/lists.ts'
import { establishmentType, groupMedicines, innKey, latinName, type MedicineRow } from '../../../scripts/health.ts'
import type { BudgetNode, Dataset, ListCell, ListFile } from '../types'

const sources = new URL('../../../data/sources/health/', import.meta.url)
const data = new URL('../../../public/data/', import.meta.url)
const read = <T,>(file: string) => JSON.parse(readFileSync(new URL(file, data), 'utf8')) as T
const BGN = 1.95583

function find(root: BudgetNode, id: string): BudgetNode | undefined {
  if (root.id === id) return root
  for (const c of root.children ?? []) {
    const hit = find(c, id)
    if (hit) return hit
  }
  return undefined
}

function rowsOf(list: ListFile): Record<string, ListCell>[] {
  return list.rows!.map((row) => Object.fromEntries(list.columns.map((c, i) => [c.id, row[i]])))
}

describe('NHIF payments to hospitals (data/sources/health)', () => {
  const payments = readCsv(new URL('nhif-hospital-payments.csv', sources))
  const at = (reg: string, series: string, month: string) => payments.find((r) => r.reg_no === reg && r.series === series && r.month === month)
  // The year to date of every hospital in a report, against the total the report prints (each row is rounded to the unit).
  const ytd = (series: string, month: string) => payments.filter((r) => r.series === series && r.month === month).reduce((s, r) => s + Number(r.ytd), 0)

  it('add up to the totals printed in the last report of each year', () => {
    expect(Math.abs(ytd('care', '2024-12') - 3_906_305_556)).toBeLessThan(200)
    expect(Math.abs(ytd('care', '2025-12') - 4_441_979_960)).toBeLessThan(200)
    expect(Math.abs(ytd('care', '2026-08') - 1_517_851_312)).toBeLessThan(200)
    expect(Math.abs(ytd('devices', '2025-12') - 114_679_017)).toBeLessThan(60)
    expect(Math.abs(ytd('medicines', '2025-12') - 1_562_275_488)).toBeLessThan(30)
    expect(Math.abs(ytd('medicines', '2026-08') - 586_456_995)).toBeLessThan(30)
  })

  it('match the PDFs, including rows whose long names run into the amounts', () => {
    // "01 Благоевград 3 0103211001 МБАЛ Благоевград АД 7 467 607 922 342" (August 2026, euro).
    expect(at('0103211001', 'care', '2026-08')).toMatchObject({ ytd: '7467607', paid: '922342', currency: 'EUR' })
    // "…хемодиализ6а4"О4 О46Д8 86 918": the name and the year to date are interleaved.
    expect(at('0204391034', 'care', '2026-08')).toMatchObject({ ytd: '644468', paid: '86918' })
    expect(at('0306253028', 'care', '2026-08')).toMatchObject({ ytd: '376102', paid: '48462' })
    // December 2024, leva.
    expect(at('1622211001', 'care', '2024-12')).toMatchObject({ ytd: '180173306', paid: '15536855', currency: 'BGN' })
    expect(at('0306131078', 'care', '2024-12')).toMatchObject({ ytd: '261148', paid: '6000' })
    // February 2026 also has a January column; the month is the last one.
    expect(at('0103131003', 'care', '2026-02')).toMatchObject({ ytd: '22802', paid: '11412' })
    expect(at('0103211015', 'medicines', '2026-08')).toMatchObject({ ytd: '2643611', paid: '480064' })
  })

  it('places every hospital in its province, and in a municipality where the registration number says so', () => {
    const hospitals = readCsv(new URL('hospitals.csv', sources))
    expect(hospitals).toHaveLength(390)
    expect(hospitals.every((h) => /^\d{10}$/.test(h.reg_no) && h.reg_no.startsWith(h.rzok))).toBe(true)
    expect(hospitals.filter((h) => h.ebk_code)).toHaveLength(384)
    expect(hospitals.find((h) => h.reg_no === '0111211004')).toMatchObject({ municipality: 'Гоце Делчев', ekatte_municipality: 'BLG11' })
    expect(hospitals.find((h) => h.reg_no === '2201211003')).toMatchObject({ municipality: 'Столична община' })
  })

  it('joins the Ministry of Health figures to 165 of the 180 hospitals of Q3 2025', () => {
    const moh = readCsv(new URL('moh-hospital-finances.csv', sources))
    const latest = moh.filter((r) => r.period === '2025-09')
    expect(latest).toHaveLength(180)
    expect(latest.filter((r) => r.reg_no)).toHaveLength(165)
    // УМБАЛ "Св. Георги" – Пловдив, 2024: revenue 308 005,7 and costs 291 304,8 thousand leva.
    expect(moh.find((r) => r.reg_no === '1622211001' && r.period === '2024-12')).toMatchObject({ revenue_kBGN: '308005.744', costs_kBGN: '291304.847', beds: '1490.0' })
  })
})

describe('NHIF medicines (data/sources/health)', () => {
  const medicines = readCsv(new URL('nhif-medicines.csv', sources))
  const total = (report: string, year: string) => medicines.filter((r) => r.report === report && r.year === year).reduce((s, r) => s + Number(r.amount), 0)

  it('takes 2025 from the annual reports and the other years from the monthly ones', () => {
    // Справка 7 and Справка 1 for 2025: the sum of their "Реимбурсна сума" column (leva).
    expect(total('hospital', '2025')).toBeCloseTo(1_602_524_022.55, 0)
    expect(total('home', '2025')).toBeCloseTo(1_626_439_092.25, 0)
    expect(medicines.filter((r) => r.year === '2026').every((r) => r.currency === 'EUR' && r.months === '7')).toBe(true)
  })

  it('matches three medicines in the reports', () => {
    const at = (name: string, year: string) => medicines.find((r) => r.name.toUpperCase() === name && r.year === year)
    expect(at('PEMBROLIZUMAB', '2025')).toMatchObject({ atc: 'L01FF02', amount: '371243305.48', patients: '4356' })
    expect(at('NIVOLUMAB', '2025')).toMatchObject({ atc: 'L01FF01', amount: '97375784.97', patients: '1785' })
    expect(at('UPADACITINIB', '2025')).toMatchObject({ atc: 'L04AF03', amount: '54467388.02' })
  })
})

describe('grouping medicines by active ingredient', () => {
  const row = (report: MedicineRow['report'], year: number, atc: string, name: string, amount: number): MedicineRow => ({ report, year, atc, name, amount, patients: null })

  it('compares combination names whatever their order and separators', () => {
    expect(innKey('Atorvastatin, amlodipine')).toBe(innKey('amlodipine/atorvastatin'))
    expect(innKey('PEMBROLIZUMAB')).toBe('pembrolizumab')
  })

  it('follows an ingredient through a change of ATC code and keeps the kinds apart', () => {
    const groups = groupMedicines([
      row('home', 2024, 'L04AA44', 'Upadacitinib', 10),
      row('home', 2025, 'L04AF03', 'upadacitinib', 20),
      row('hospital', 2025, 'L04AF03', 'UPADACITINIB', 5),
      row('home', 2025, 'W01AA02', 'Тест-ленти за глюкомери', 3),
      row('hospital', 2021, 'L01XK01', '', 1),
      row('hospital', 2025, 'L01XK01', 'OLAPARIB', 2),
    ])
    expect(groups).toHaveLength(4)
    const home = groups.find((g) => g.kind === 'home')!
    expect(home).toMatchObject({ atc: 'L04AF03', codes: ['L04AF03', 'L04AA44'] })
    expect([...home.years]).toEqual([
      [2024, 10],
      [2025, 20],
    ])
    expect(groups.find((g) => g.kind === 'devices')?.atc).toBe('W01AA02')
    expect(groups.find((g) => g.atc === 'L01XK01')).toMatchObject({ name: 'OLAPARIB', kind: 'hospital' })
  })
})

describe('hospital names and types', () => {
  it('reads the type of establishment from the registration number', () => {
    expect(establishmentType('0103211001')).toBe('general')
    expect(establishmentType('0103212016')).toBe('specialised')
    expect(establishmentType('2201911042')).toBe('ministry')
    expect(establishmentType('0204391034')).toBe('dialysis')
    expect(establishmentType('0103131003')).toBe('outpatient')
  })

  it('writes names in Latin letters, keeping capitals', () => {
    expect(latinName('АДЖИБАДЕМ СИТИ КЛИНИК УМБАЛ ТОКУДА ЕАД')).toBe('ADZHIBADEM SITI KLINIK UMBAL TOKUDA EAD')
    expect(latinName('УМБАЛ Свети Георги ЕАД Пловдив')).toBe('UMBAL Sveti Georgi EAD Plovdiv')
    // Roman numerals typed with the Cyrillic "І".
    expect(latinName('НМТБ ЦАР БОРИС ІІІ')).toBe('NMTB TSAR BORIS III')
  })
})

describe('hospitals in the 2024 and 2025 actuals', () => {
  for (const year of [2024, 2025]) {
    it(`split the ${year} hospital-care line by region and hospital, with the rest shown`, () => {
      const dataset = read<Dataset>(`report-${year}.json`)
      const line = find(dataset.root, 'h-nhif-hospital')!
      const regions = line.children!
      expect(regions).toHaveLength(29)
      expect(regions.reduce((s, c) => s + c.value, 0)).toBeCloseTo(line.value, -1)
      const rest = regions.find((c) => c.id === 'h-nhif-hospital-unattributed')!
      // Under 0.2% of the line is not attributed to a hospital in the monthly reports.
      expect(rest.value / line.value).toBeLessThan(0.002)
      for (const region of regions.filter((c) => c !== rest)) {
        expect(region.children!.reduce((s, c) => s + c.value, 0)).toBeCloseTo(region.value, -1)
      }
    })
  }

  it('gives each hospital its year to date of December, in euro', () => {
    const georgi = find(read<Dataset>('report-2024.json').root, 'hospital-1622211001')!
    expect(georgi.value).toBe(Math.round(180_173_306 / BGN))
    expect(georgi.code).toBe('1622211001')
    expect(find(read<Dataset>('report-2025.json').root, 'hospital-2201211003')!.value).toBe(Math.round(158_093_753 / BGN))
  })

  it('leaves the plans alone', () => {
    for (const id of ['budget-2024', 'budget-2025', 'budget-2026']) {
      expect(find(read<Dataset>(`${id}.json`).root, 'h-nhif-hospital')?.children).toBeUndefined()
    }
  })
})

describe('the hospitals and medicines lists', () => {
  const hospitals = read<ListFile>('lists/hospitals.json')
  const rows = rowsOf(hospitals)

  it('has every hospital with its yearly totals in euro', () => {
    expect(hospitals.count).toBe(390)
    const totals = hospitals.totals.total as number[]
    // August 2026: hospital care, medical devices and medicines outside the pathway, in euro.
    expect(totals[2]).toBeCloseTo(1_517_851_312 + 58_373_205 + 586_456_995, -3)
    const georgi = rows.find((r) => r.reg === '1622211001')!
    expect((georgi.care as number[])[0]).toBe(Math.round(180_173_306 / BGN))
    expect((georgi.months2026 as (number | null)[]).slice(0, 8).every((v) => typeof v === 'number')).toBe(true)
    expect((georgi.months2026 as (number | null)[])[8]).toBeNull()
    expect(georgi.municipality).toBe('plovdiv-plovdiv')
    expect(georgi.ownership).toBe('state')
  })

  it('is linked from hospital care, from municipalities and from each hospital node', () => {
    const links = readNodeLinks(data).filter((l) => l.list === 'hospitals')
    expect(links.find((l) => l.column === 'fund' && l.years.includes(2025))?.nodes['h-nhif-hospital']).toBeTruthy()
    expect(Object.keys(links.find((l) => l.family === 'municipalities' && l.years.includes(2026))!.nodes)).toContain('plovdiv-plovdiv')
    expect(Object.keys(links.find((l) => l.column === 'tree2024')!.nodes)).toHaveLength(383)
  })

  it('lists the medicines by active ingredient, in euro', () => {
    const medicines = read<ListFile>('lists/medicines.json')
    const totals = medicines.totals.amount as number[]
    expect(medicines.columns.find((c) => c.id === 'amount')?.periods).toEqual(['2021', '2022', '2023', '2024', '2025', '2026'])
    expect(totals[4]).toBeCloseTo((1_602_524_022.55 + 1_626_439_092.25) / BGN, -3)
    const pembrolizumab = rowsOf(medicines).find((r) => r.name === 'PEMBROLIZUMAB')!
    expect(pembrolizumab.atc).toBe('L01FF02')
    expect((pembrolizumab.amount as number[])[4]).toBe(Math.round(371_243_305.48 / BGN))
  })
})
