// Frame-by-frame MP4 export with WebCodecs (via Mediabunny). Frames are
// rendered deterministically, so the result never drops frames and usually
// encodes faster than real time.

import { BufferTarget, CanvasSource, getFirstEncodableVideoCodec, Mp4OutputFormat, Output, QUALITY_HIGH } from 'mediabunny'
import { renderFrame, type PreparedClip } from './render'

export const FPS = 30

const FONT_FAMILY = '"Inter Variable"'
const SAMPLE = 'Бюджетът на България 0123456789 €%…›„“ ABCxyz'

/** Canvas text silently falls back if a font (or its Cyrillic subset) is not loaded yet. */
export async function ensureClipFonts(): Promise<void> {
  if (!('fonts' in document)) return
  await Promise.all([500, 550, 600, 650, 700, 800].map((w) => document.fonts.load(`${w} 40px ${FONT_FAMILY}`, SAMPLE)))
}

export function canExportVideo(): boolean {
  return typeof window !== 'undefined' && 'VideoEncoder' in window
}

export interface ExportResult {
  blob: Blob
  fileName: string
  codec: string
}

export async function exportClip(
  clip: PreparedClip,
  fileStem: string,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<ExportResult> {
  await ensureClipFonts()
  const { width, height } = clip.layout
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('Canvas 2D is not available')

  // H.264 plays everywhere (Instagram, TikTok, WhatsApp); fall back if the browser can't encode it.
  const codec = await getFirstEncodableVideoCodec(['avc', 'vp9', 'av1'], { width, height, frameRate: FPS })
  if (!codec) throw new Error('No supported video encoder')

  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() })
  const source = new CanvasSource(canvas, { codec, quality: QUALITY_HIGH, keyFrameInterval: 1 })
  output.addVideoTrack(source, { frameRate: FPS })
  await output.start()

  const frames = Math.ceil(clip.timeline.duration * FPS)
  try {
    for (let i = 0; i < frames; i++) {
      if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError')
      renderFrame(ctx, clip, i / FPS)
      await source.add(i / FPS, 1 / FPS)
      if (i % 3 === 0) onProgress(i / frames)
    }
    await output.finalize()
  } catch (error) {
    await output.cancel().catch(() => undefined)
    throw error
  }
  onProgress(1)
  const buffer = output.target.buffer
  if (!buffer) throw new Error('Encoder produced no data')
  return { blob: new Blob([buffer], { type: 'video/mp4' }), fileName: `${fileStem}.mp4`, codec }
}

/** A still of the final frame (the summary card), for image posts. */
export async function exportPoster(clip: PreparedClip, fileStem: string): Promise<ExportResult> {
  await ensureClipFonts()
  const { width, height } = clip.layout
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('Canvas 2D is not available')
  renderFrame(ctx, clip, clip.timeline.duration - 0.05)
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG export failed'))), 'image/png'),
  )
  return { blob, fileName: `${fileStem}.png`, codec: 'png' }
}
