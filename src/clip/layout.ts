export type ClipFormat = '9x16' | '1x1' | '16x9'

export const FORMAT_SIZE: Record<ClipFormat, { width: number; height: number }> = {
  '9x16': { width: 1080, height: 1920 },
  '1x1': { width: 1080, height: 1080 },
  '16x9': { width: 1920, height: 1080 },
}

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export interface ClipLayout {
  width: number
  height: number
  /** Typography unit: 1 at 1080 px on the short side. */
  u: number
  header: Box
  titleSize: number
  titleLines: number
  crumbs: Box
  donut: { cx: number; cy: number; r: number }
  caption: Box
  footer: Box
}

export function clipLayout(format: ClipFormat): ClipLayout {
  const { width, height } = FORMAT_SIZE[format]
  const u = Math.min(width, height) / 1080
  if (format === '9x16') {
    return {
      width,
      height,
      u,
      header: { x: 80, y: 120, w: 920, h: 400 },
      titleSize: 76,
      titleLines: 3,
      crumbs: { x: 80, y: 548, w: 920, h: 56 },
      donut: { cx: 540, cy: 1020, r: 380 },
      caption: { x: 80, y: 1460, w: 920, h: 330 },
      footer: { x: 80, y: 1824, w: 920, h: 50 },
    }
  }
  if (format === '1x1') {
    return {
      width,
      height,
      u,
      header: { x: 64, y: 56, w: 952, h: 180 },
      titleSize: 50,
      titleLines: 2,
      crumbs: { x: 64, y: 252, w: 952, h: 40 },
      donut: { cx: 318, cy: 640, r: 250 },
      caption: { x: 620, y: 390, w: 396, h: 520 },
      footer: { x: 64, y: 1010, w: 952, h: 40 },
    }
  }
  return {
    width,
    height,
    u,
    header: { x: 96, y: 84, w: 880, h: 260 },
    titleSize: 64,
    titleLines: 3,
    crumbs: { x: 96, y: 372, w: 880, h: 44 },
    donut: { cx: 1400, cy: 548, r: 380 },
    caption: { x: 96, y: 500, w: 820, h: 420 },
    footer: { x: 96, y: 990, w: 1728, h: 44 },
  }
}
