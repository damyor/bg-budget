import { describe, expect, it } from 'vitest'
import { formatGdpPercent, formatGdpShare, formatMoney, formatPercent } from '../format'

const nbsp = (s: string) => s.replace(/[  ]/g, ' ')

describe('formatMoney', () => {
  it('compacts billions and millions in Bulgarian', () => {
    expect(nbsp(formatMoney(41_059_600_000, 'bg'))).toBe('41,1 млрд. €')
    expect(nbsp(formatMoney(9_862_100_000, 'bg'))).toBe('9,86 млрд. €')
    expect(nbsp(formatMoney(543_200_000, 'bg'))).toBe('543 млн. €')
  })

  it('compacts in English', () => {
    expect(formatMoney(41_059_600_000, 'en')).toBe('€41.1 bn')
    expect(formatMoney(5_800_000, 'en')).toBe('€5.80 m')
  })

  it('shows small amounts exactly', () => {
    expect(nbsp(formatMoney(6374, 'bg'))).toBe('6374 €')
    expect(nbsp(formatMoney(12_345, 'bg'))).toBe('12 345 €')
    expect(formatMoney(12.4, 'en')).toBe('€12.40')
  })
})

describe('formatPercent', () => {
  it('uses the locale decimal separator', () => {
    expect(formatPercent(0.3678, 'bg')).toBe('36,8%')
    expect(formatPercent(0.3678, 'en')).toBe('36.8%')
  })

  it('marks tiny shares', () => {
    expect(formatPercent(0.0004, 'bg')).toBe('<0,1%')
    expect(formatPercent(1, 'en')).toBe('100%')
  })
})

describe('formatGdpPercent', () => {
  it('keeps more decimals for small shares', () => {
    expect(formatGdpPercent(0.4354, 'bg')).toBe('43,5%')
    expect(formatGdpPercent(0.05321, 'en')).toBe('5.32%')
    expect(formatGdpPercent(0.00532, 'en')).toBe('0.53%')
    expect(formatGdpPercent(0.000532, 'en')).toBe('0.053%')
  })

  it('marks shares below a thousandth of a percent', () => {
    expect(formatGdpPercent(0.000004, 'bg')).toBe('<0,001%')
  })

  it('names the base', () => {
    expect(formatGdpShare(0.05321, 'bg')).toBe('5,32% от БВП')
    expect(formatGdpShare(0.05321, 'en')).toBe('5.32% of GDP')
  })
})
