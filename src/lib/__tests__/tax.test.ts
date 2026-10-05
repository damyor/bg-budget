import { describe, expect, it } from 'vitest'
import { calculateTaxes, taxFreedomDay, type TaxInputs } from '../tax/calc'
import { paramsFor, TAX_2026 as P, TAX_YEARS } from '../tax/params'

const base: TaxInputs = {
  gross: 1000,
  includeEmployer: true,
  spendShare: 1,
  fuelLitresPerMonth: 0,
  fuelType: 'petrol',
  cigarettePacksPerWeek: 0,
  beersPerWeek: 0,
  spiritBottlesPerMonth: 0,
}

const line = (r: ReturnType<typeof calculateTaxes>, key: string) => r.lines.find((l) => l.key === key)!.annual

describe('calculateTaxes', () => {
  const e = P.contributions.employee
  const employeeRate = e.pension + e.illnessMaternity + e.unemployment + e.health

  it('taxes gross pay minus own contributions at the flat rate', () => {
    const r = calculateTaxes(base, P)
    const own = 1000 * (employeeRate + e.pillar2)
    expect(line(r, 'incomeTax')).toBeCloseTo((1000 - own) * P.incomeTaxRate * 12, 6)
    expect(line(r, 'employeeContrib')).toBeCloseTo(1000 * employeeRate * 12, 6)
    expect(r.netAnnual).toBeCloseTo((1000 - own - (1000 - own) * P.incomeTaxRate) * 12, 6)
  })

  it('caps contributions at the maximum insurable income', () => {
    const high = calculateTaxes({ ...base, gross: P.maxInsurableMonthly * 3 }, P)
    const atCap = calculateTaxes({ ...base, gross: P.maxInsurableMonthly }, P)
    expect(line(high, 'employeeContrib')).toBeCloseTo(line(atCap, 'employeeContrib'), 6)
    expect(line(high, 'incomeTax')).toBeGreaterThan(line(atCap, 'incomeTax'))
  })

  it('excludes employer contributions when asked', () => {
    const r = calculateTaxes({ ...base, includeEmployer: false }, P)
    expect(line(r, 'employerContrib')).toBe(0)
    expect(r.rate).toBeCloseTo(r.totalAnnual / r.grossAnnual, 9)
  })

  it('estimates VAT from spending', () => {
    const r = calculateTaxes(base, P)
    const expected = r.netAnnual * P.vat.taxableShareOfSpending * (P.vat.standardRate / (1 + P.vat.standardRate))
    expect(line(r, 'vat')).toBeCloseTo(expected, 6)
    expect(line(calculateTaxes({ ...base, spendShare: 0 }, P), 'vat')).toBe(0)
  })

  it('adds excise from quantities', () => {
    const r = calculateTaxes({ ...base, fuelLitresPerMonth: 50, cigarettePacksPerWeek: 7, beersPerWeek: 2 }, P)
    expect(line(r, 'exciseFuel')).toBeCloseTo(50 * 12 * P.excise.petrolPerLitre, 6)
    expect(line(r, 'exciseTobacco')).toBeGreaterThan(7 * 52 * P.excise.cigarettesPerPack)
    expect(line(r, 'exciseAlcohol')).toBeGreaterThan(0)
  })

  it('sums every line into the total', () => {
    const r = calculateTaxes({ ...base, fuelLitresPerMonth: 30 }, P)
    expect(r.totalAnnual).toBeCloseTo(r.lines.reduce((s, l) => s + l.annual, 0), 9)
    expect(r.rate).toBeGreaterThan(0.2)
    expect(r.rate).toBeLessThan(0.6)
  })
})

describe('taxFreedomDay', () => {
  it('maps a share of the year to a date', () => {
    expect(taxFreedomDay(0, 2026).toISOString().slice(0, 10)).toBe('2026-01-01')
    expect(taxFreedomDay(0.5, 2026).toISOString().slice(0, 10)).toBe('2026-07-02')
  })
})

describe('tax rules by year', () => {
  it('has rules for 2024–2027, with 2027 marked as a proposal', () => {
    expect(TAX_YEARS).toEqual([2024, 2025, 2026, 2027])
    expect(paramsFor(2027)!.status).toBe('proposed')
    expect(paramsFor(2026)!.status).toBe('law')
    expect(paramsFor(2023)).toBeNull()
  })

  it('converts the leva amounts of 2024 and 2025 at the fixed rate', () => {
    expect(paramsFor(2024)!.minWageMonthly).toBe(477.04) // 933 лв.
    expect(paramsFor(2024)!.maxInsurableMonthly).toBe(1917.34) // 3750 лв.
    expect(paramsFor(2025)!.minWageMonthly).toBe(550.66) // 1077 лв.
    expect(paramsFor(2025)!.maxInsurableMonthly).toBe(2111.64) // 4130 лв.
  })

  it('differs between years only above the contribution ceiling for the same salary', () => {
    const at = (gross: number, year: number) => calculateTaxes({ ...base, gross }, paramsFor(year)!).totalAnnual
    expect(at(1500, 2024)).toBeCloseTo(at(1500, 2027), 6)
    // Above the 2024 ceiling (€1,917) contributions grow with each year's higher ceiling.
    expect(at(2500, 2024)).toBeLessThan(at(2500, 2025))
    expect(at(2500, 2026)).toBeLessThan(at(2500, 2027))
  })

  it('applies the minimum tobacco excise where it binds', () => {
    expect(paramsFor(2026)!.excise.cigarettesPerPack).toBeCloseTo(2.4, 6) // €120 per 1000
    expect(paramsFor(2027)!.excise.cigarettesPerPack).toBeCloseTo(2.52, 6) // €126 per 1000
  })
})
