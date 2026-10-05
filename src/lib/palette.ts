import { interpolateRgb } from 'd3-interpolate'

// Categorical palette (validated with the data-viz validator: adjacent CVD
// ΔE ≥ 8.4, normal-vision ΔE ≥ 19.3 in both modes). Slots are assigned in
// this fixed order and never cycled; anything past slot 8 folds into "Other".

export type Mode = 'light' | 'dark'

export const SERIES: Record<Mode, string[]> = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
}

export const OTHER: Record<Mode, string> = { light: '#b4b3ab', dark: '#5c5b56' }

export const MAX_SLOTS = SERIES.light.length

/** Colour reference usable in SVG/CSS (follows the active theme). */
export function seriesVar(slot: number | 'other'): string {
  return slot === 'other' ? 'var(--series-other)' : `var(--series-${slot + 1})`
}

export function seriesHex(slot: number | 'other', mode: Mode): string {
  return slot === 'other' ? OTHER[mode] : SERIES[mode][slot]
}

/** Relative luminance (WCAG) of a #rrggbb colour. */
export function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
}

/**
 * Ink for a label set inside a fill. Labels on slices are bold and large, so
 * white is used whenever it clears the 3:1 large-text contrast.
 */
export function inkOn(hex: string): string {
  const onWhite = 1.05 / (luminance(hex) + 0.05)
  return onWhite >= 3 ? '#ffffff' : '#0b0b0b'
}

/** Fill for an arc that may be mid-way between its parent's colour and its own. */
export function arcFill(slot: number | 'other', mode: Mode, blendFrom?: number | 'other', blend = 1): string {
  const own = seriesHex(slot, mode)
  if (blendFrom === undefined || blend >= 1) return own
  return interpolateRgb(seriesHex(blendFrom, mode), own)(blend)
}
