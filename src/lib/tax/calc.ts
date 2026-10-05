// Estimates how much a salaried person pays into public budgets in a year:
// income tax, social and health contributions (own and employer's), VAT on
// what they spend and excise on fuel, tobacco and alcohol.

import type { LocalizedText } from '../types'
import type { TaxParams } from './params'

export type FuelType = 'petrol' | 'diesel'

export interface TaxInputs {
  /** Gross monthly salary, EUR. */
  gross: number
  /** Count the contributions the employer pays on top of the gross salary. */
  includeEmployer: boolean
  /** Share of net income spent on goods and services (0..1). */
  spendShare: number
  fuelLitresPerMonth: number
  fuelType: FuelType
  cigarettePacksPerWeek: number
  beersPerWeek: number
  spiritBottlesPerMonth: number
}

export type TaxKey = 'incomeTax' | 'employeeContrib' | 'employerContrib' | 'vat' | 'exciseFuel' | 'exciseTobacco' | 'exciseAlcohol'

export interface TaxLine {
  key: TaxKey
  annual: number
}

export interface TaxResult {
  grossAnnual: number
  netAnnual: number
  /** Gross plus employer contributions: what the job costs the employer. */
  laborCostAnnual: number
  /** Second-pillar pension contributions; they go to a private fund, not the budget. */
  pillar2Annual: number
  lines: TaxLine[]
  /** Everything that reaches public budgets. */
  totalAnnual: number
  /** Total as a share of the income base (labour cost, or gross when employer contributions are excluded). */
  rate: number
}

const WEEKS_PER_YEAR = 52.18

export function calculateTaxes(inputs: TaxInputs, p: TaxParams): TaxResult {
  const gross = Math.max(0, inputs.gross)
  const insurable = Math.min(gross, p.maxInsurableMonthly)
  const c = p.contributions

  const employeePublic = insurable * (c.employee.pension + c.employee.illnessMaternity + c.employee.unemployment + c.employee.health)
  const employeePillar2 = insurable * c.employee.pillar2
  const employerPublic =
    insurable *
    (c.employer.pension + c.employer.illnessMaternity + c.employer.unemployment + c.employer.accident + c.employer.health + c.employer.guaranteeFund)
  const employerPillar2 = insurable * c.employer.pillar2

  // Income tax is levied on gross pay minus the employee's own contributions.
  const incomeTax = Math.max(0, gross - employeePublic - employeePillar2) * p.incomeTaxRate
  const net = gross - employeePublic - employeePillar2 - incomeTax

  // VAT: part of what is spent is VAT-exempt (rent, financial services, …).
  const spending = net * 12 * Math.min(1, Math.max(0, inputs.spendShare))
  const vat = spending * p.vat.taxableShareOfSpending * (p.vat.standardRate / (1 + p.vat.standardRate))

  const fuelRate = inputs.fuelType === 'diesel' ? p.excise.dieselPerLitre : p.excise.petrolPerLitre
  const exciseFuel = Math.max(0, inputs.fuelLitresPerMonth) * 12 * fuelRate
  const exciseTobacco = Math.max(0, inputs.cigarettePacksPerWeek) * WEEKS_PER_YEAR * p.excise.cigarettesPerPack
  const exciseAlcohol =
    Math.max(0, inputs.beersPerWeek) * WEEKS_PER_YEAR * p.excise.beerPerBottle +
    Math.max(0, inputs.spiritBottlesPerMonth) * 12 * p.excise.spiritsPerBottle

  const lines: TaxLine[] = [
    { key: 'incomeTax', annual: incomeTax * 12 },
    { key: 'employeeContrib', annual: employeePublic * 12 },
    { key: 'employerContrib', annual: inputs.includeEmployer ? employerPublic * 12 : 0 },
    { key: 'vat', annual: vat },
    { key: 'exciseFuel', annual: exciseFuel },
    { key: 'exciseTobacco', annual: exciseTobacco },
    { key: 'exciseAlcohol', annual: exciseAlcohol },
  ]
  const totalAnnual = lines.reduce((s, l) => s + l.annual, 0)
  const laborCostAnnual = (gross + employerPublic + employerPillar2) * 12
  const base = inputs.includeEmployer ? laborCostAnnual : gross * 12
  return {
    grossAnnual: gross * 12,
    netAnnual: net * 12,
    laborCostAnnual,
    pillar2Annual: (employeePillar2 + (inputs.includeEmployer ? employerPillar2 : 0)) * 12,
    lines,
    totalAnnual,
    rate: base > 0 ? totalAnnual / base : 0,
  }
}

/** The last day of the year on which, on average, you still work to pay these taxes. */
export function taxFreedomDay(rate: number, year: number): Date {
  const start = Date.UTC(year, 0, 1)
  const days = (Date.UTC(year + 1, 0, 1) - start) / 86_400_000
  const offset = Math.max(0, Math.ceil(Math.min(1, Math.max(0, rate)) * days) - 1)
  return new Date(start + offset * 86_400_000)
}

export const TAX_LABELS: Record<TaxKey, LocalizedText> = {
  incomeTax: { bg: 'Данък върху доходите', en: 'Income tax' },
  employeeContrib: { bg: 'Твоите осигуровки', en: 'Your contributions' },
  employerContrib: { bg: 'Осигуровки от работодателя', en: "Employer's contributions" },
  vat: { bg: 'ДДС при покупки', en: 'VAT on purchases' },
  exciseFuel: { bg: 'Акциз върху горивата', en: 'Fuel excise' },
  exciseTobacco: { bg: 'Акциз върху цигарите', en: 'Tobacco excise' },
  exciseAlcohol: { bg: 'Акциз върху алкохола', en: 'Alcohol excise' },
}
