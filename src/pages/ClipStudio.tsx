import { useEffect, useMemo, useRef, useState } from 'react'
import { canExportVideo, ensureClipFonts, exportClip, exportPoster, type ExportResult } from '../clip/encode'
import { FORMAT_SIZE, type ClipFormat } from '../clip/layout'
import { defaultTitle, postCaption, prepareClip, renderFrame } from '../clip/render'
import type { Speed } from '../clip/timeline'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { DatasetPicker } from '../components/DatasetPicker'
import { SearchBox } from '../components/SearchBox'
import { Segmented } from '../components/Segmented'
import { useDataset } from '../lib/data'
import { findEntry } from '../lib/datasets'
import { formatNumber } from '../lib/format'
import { useLang, useT } from '../lib/i18n'
import type { Mode } from '../lib/palette'
import { navigate, useRoute } from '../lib/route'
import { slugify } from '../lib/slug'
import { useTaxesByYear } from '../lib/taxProfile'
import { realPathTo } from '../lib/tree'
import type { DatasetIndexEntry, Lang } from '../lib/types'

type ExportState =
  | { status: 'idle' }
  | { status: 'running'; progress: number }
  | { status: 'done'; result: ExportResult; url: string }
  | { status: 'error'; message: string }

const SITE_LABEL = window.location.host.replace(/^www\./, '')

export default function ClipStudio({ datasets }: { datasets: DatasetIndexEntry[] }) {
  const t = useT()
  const lang = useLang()
  const route = useRoute()
  const entry = findEntry(datasets, route.params.d)
  const loaded = useDataset(entry)
  const myTaxes = useTaxesByYear()(entry.year)

  const [format, setFormat] = useState<ClipFormat>('9x16')
  const [theme, setTheme] = useState<Mode>('dark')
  const [speed, setSpeed] = useState<Speed>('normal')
  const [clipLang, setClipLang] = useState<Lang>(lang)
  const [customTitle, setCustomTitle] = useState<string | null>(null)
  const [showPerPerson, setShowPerPerson] = useState(true)
  const [showMine, setShowMine] = useState(true)
  const [exportState, setExportState] = useState<ExportState>({ status: 'idle' })
  const abortRef = useRef<AbortController | null>(null)

  const ready = loaded.status === 'ready' ? loaded.value : null
  const nodeId = ready && route.params.n && ready.tree.byId.has(route.params.n) ? route.params.n : 'root'
  const path = useMemo(() => (ready ? realPathTo(ready.tree, nodeId) : []), [ready, nodeId])

  const autoTitle = path.length ? defaultTitle(path, clipLang) : ''
  const clip = useMemo(() => {
    if (!ready || !path.length) return null
    return prepareClip({
      dataset: ready.dataset,
      path,
      format,
      theme,
      lang: clipLang,
      speed,
      title: customTitle ?? autoTitle,
      showPerPerson,
      myAnnualTaxes: showMine ? myTaxes : null,
      siteLabel: SITE_LABEL,
    })
  }, [ready, path, format, theme, clipLang, speed, customTitle, autoTitle, showPerPerson, showMine, myTaxes])

  // A new clip invalidates a finished export.
  useEffect(() => {
    abortRef.current?.abort()
    setExportState((s) => {
      if (s.status === 'done') URL.revokeObjectURL(s.url)
      return { status: 'idle' }
    })
  }, [clip])

  if (loaded.status === 'loading') return <p className="page-status">{t('loading')}</p>
  if (loaded.status === 'error' || !ready || !clip) return <p className="page-status">{t('loadError')}</p>

  const { dataset, tree } = ready
  const target = path[path.length - 1]
  const setTarget = (id: string) =>
    navigate({ page: 'clip', params: { ...route.params, d: dataset.id, n: id === 'root' ? '' : id } }, { replace: true })

  const startExport = async () => {
    const controller = new AbortController()
    abortRef.current = controller
    setExportState({ status: 'running', progress: 0 })
    try {
      const result = await exportClip(clip, fileStem, (progress) => setExportState({ status: 'running', progress }), controller.signal)
      setExportState({ status: 'done', result, url: URL.createObjectURL(result.blob) })
    } catch (e) {
      if (controller.signal.aborted) setExportState({ status: 'idle' })
      else setExportState({ status: 'error', message: e instanceof Error ? e.message : String(e) })
    }
  }

  const fileStem = ['budget', dataset.year, slugify(target.name.bg) || 'total', format].join('-')

  const downloadPoster = async () => {
    const result = await exportPoster(clip, fileStem)
    const url = URL.createObjectURL(result.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.fileName
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  const share = async (result: ExportResult) => {
    const file = new File([result.blob], result.fileName, { type: 'video/mp4' })
    try {
      await navigator.share({ files: [file], title: clip.spec.title })
    } catch {
      /* dismissed */
    }
  }

  const children = [...(target.children ?? [])].sort((a, b) => b.value - a.value)
  const { width, height } = FORMAT_SIZE[format]
  const seconds = formatNumber(clip.timeline.duration, lang, 1)

  return (
    <div className="studio">
      <section className="studio-preview" aria-label={t('clipPreview')}>
        <ClipPlayer clip={clip} />
        <p className="muted small studio-meta">{t('clipSummary', { duration: seconds, w: width, h: height })}</p>
      </section>

      <section className="studio-panel">
        <h1 className="page-title">{t('clipTitle')}</h1>
        <p className="muted">{t('clipIntro')}</p>

        <fieldset className="panel-group">
          <legend>{t('clipWhat')}</legend>
          <DatasetPicker datasets={datasets} value={dataset.id} onChange={(d) => navigate({ page: 'clip', params: { d } }, { replace: true })} />
          <Breadcrumbs path={path} onSelect={setTarget} />
          <SearchBox
            tree={tree}
            placeholder={t('clipSearch')}
            onSelect={(hit) => setTarget(hit.node.id)}
          />
          {children.length > 0 && (
            <div className="chips">
              <span className="chips-label">{t('clipDeeper')}:</span>
              {children.slice(0, 10).map((c) => (
                <button key={c.id} type="button" className="chip" onClick={() => setTarget(c.id)}>
                  {c.name[lang]}
                </button>
              ))}
            </div>
          )}
        </fieldset>

        <fieldset className="panel-group">
          <legend>{t('clipFormat')}</legend>
          <Segmented<ClipFormat>
            label={t('clipFormat')}
            value={format}
            onChange={setFormat}
            options={[
              { value: '9x16', label: t('fmtVertical') },
              { value: '1x1', label: t('fmtSquare') },
              { value: '16x9', label: t('fmtWide') },
            ]}
          />
        </fieldset>

        <fieldset className="panel-group">
          <legend>{t('clipStyle')}</legend>
          <div className="field-row">
            <span className="field-label">{t('clipTheme')}</span>
            <Segmented<Mode>
              label={t('clipTheme')}
              value={theme}
              onChange={setTheme}
              options={[
                { value: 'dark', label: t('themeDarkShort') },
                { value: 'light', label: t('themeLightShort') },
              ]}
            />
          </div>
          <div className="field-row">
            <span className="field-label">{t('clipSpeed')}</span>
            <Segmented<Speed>
              label={t('clipSpeed')}
              value={speed}
              onChange={setSpeed}
              options={[
                { value: 'fast', label: t('speedFast') },
                { value: 'normal', label: t('speedNormal') },
                { value: 'slow', label: t('speedSlow') },
              ]}
            />
          </div>
          <div className="field-row">
            <span className="field-label">{t('clipLanguage')}</span>
            <Segmented<Lang>
              label={t('clipLanguage')}
              value={clipLang}
              onChange={(l) => {
                setClipLang(l)
                setCustomTitle(null)
              }}
              options={[
                { value: 'bg', label: 'Български' },
                { value: 'en', label: 'English' },
              ]}
            />
          </div>
          <label className="field">
            <span className="field-label">{t('clipHeadline')}</span>
            <span className="input-with-action">
              <input
                type="text"
                value={customTitle ?? autoTitle}
                maxLength={120}
                onChange={(e) => setCustomTitle(e.target.value)}
              />
              {customTitle !== null && (
                <button type="button" className="link-btn" onClick={() => setCustomTitle(null)}>
                  {t('clipHeadlineAuto')}
                </button>
              )}
            </span>
          </label>
          <label className="check">
            <input type="checkbox" checked={showPerPerson} onChange={(e) => setShowPerPerson(e.target.checked)} />
            {t('clipPerPerson')}
          </label>
          <label className={myTaxes === null ? 'check disabled' : 'check'}>
            <input
              type="checkbox"
              checked={showMine && myTaxes !== null}
              disabled={myTaxes === null}
              onChange={(e) => setShowMine(e.target.checked)}
            />
            {t('clipMine')}
          </label>
          {myTaxes === null && (
            <p className="muted small">
              <a href="#/me">{t('clipMineMissing')}</a>
            </p>
          )}
        </fieldset>

        <CaptionBox text={postCaption(clip.spec)} />

        <div className="export">
          {!canExportVideo() ? (
            <p className="note">{t('clipUnsupported')}</p>
          ) : exportState.status === 'running' ? (
            <div className="export-progress">
              <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(exportState.progress * 100)}>
                <span style={{ width: `${exportState.progress * 100}%` }} />
              </div>
              <span>{t('clipExporting', { pct: `${Math.round(exportState.progress * 100)}%` })}</span>
              <button type="button" className="btn" onClick={() => abortRef.current?.abort()}>
                {t('clipCancel')}
              </button>
            </div>
          ) : exportState.status === 'done' ? (
            <div className="export-done">
              <p>
                {t('clipReady', {
                  size: `${formatNumber(exportState.result.blob.size / 1e6, lang, 1)} MB`,
                  duration: seconds,
                })}
              </p>
              <div className="actions">
                <a className="btn btn-primary btn-lg" href={exportState.url} download={exportState.result.fileName}>
                  {t('clipDownload')}
                </a>
                {typeof navigator.canShare === 'function' &&
                  navigator.canShare({ files: [new File([exportState.result.blob], exportState.result.fileName, { type: 'video/mp4' })] }) && (
                    <button type="button" className="btn btn-lg" onClick={() => share(exportState.result)}>
                      {t('clipShare')}
                    </button>
                  )}
                <button type="button" className="btn btn-lg" onClick={startExport}>
                  {t('clipExport')}
                </button>
              </div>
              {exportState.result.codec !== 'avc' && <p className="note">{t('clipCodecNote', { codec: exportState.result.codec.toUpperCase() })}</p>}
            </div>
          ) : (
            <>
              <div className="actions">
                <button type="button" className="btn btn-primary btn-lg" onClick={startExport}>
                  {t('clipExport')}
                </button>
                <button type="button" className="btn btn-lg" onClick={downloadPoster}>
                  {t('clipPoster')}
                </button>
              </div>
              {exportState.status === 'error' && <p className="note error">{t('clipError', { msg: exportState.message })}</p>}
            </>
          )}
        </div>
      </section>
    </div>
  )
}

/** Live preview: the same renderer as the export, driven by requestAnimationFrame. */
function ClipPlayer({ clip }: { clip: ReturnType<typeof prepareClip> }) {
  const t = useT()
  const lang = useLang()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const timeRef = useRef(0)
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [fontsReady, setFontsReady] = useState(false)
  const duration = clip.timeline.duration

  useEffect(() => {
    ensureClipFonts().finally(() => setFontsReady(true))
  }, [])

  // Restart from the beginning whenever the clip changes.
  useEffect(() => {
    timeRef.current = 0
    setTime(0)
    setPlaying(true)
  }, [clip])

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx || !fontsReady) return
    if (!playing) {
      renderFrame(ctx, clip, timeRef.current)
      return
    }
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      const next = timeRef.current + (now - last) / 1000
      last = now
      if (next >= duration) {
        timeRef.current = duration
        renderFrame(ctx, clip, duration)
        setTime(duration)
        setPlaying(false)
        return
      }
      timeRef.current = next
      renderFrame(ctx, clip, next)
      setTime(next)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [clip, playing, duration, fontsReady])

  const toggle = () => {
    if (!playing && timeRef.current >= duration) timeRef.current = 0
    setPlaying((p) => !p)
  }

  const { width, height } = clip.layout
  return (
    <div className="player">
      <div
        className="player-frame"
        style={{ aspectRatio: `${width} / ${height}`, maxWidth: `calc((100vh - 200px) * ${width / height})` }}
      >
        <canvas ref={canvasRef} width={width} height={height} />
      </div>
      <div className="player-controls">
        <button type="button" className="icon-btn" onClick={toggle} aria-label={playing ? t('clipPause') : time >= duration ? t('clipReplay') : t('clipPlay')}>
          {playing ? (
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <rect x="5" y="4" width="3.5" height="12" rx="1" fill="currentColor" />
              <rect x="11.5" y="4" width="3.5" height="12" rx="1" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M6 4l10 6-10 6z" fill="currentColor" />
            </svg>
          )}
        </button>
        <input
          type="range"
          min={0}
          max={duration}
          step={1 / 30}
          value={time}
          aria-label={t('clipSeek')}
          onChange={(e) => {
            setPlaying(false)
            timeRef.current = Number(e.target.value)
            setTime(timeRef.current)
            const ctx = canvasRef.current?.getContext('2d')
            if (ctx) renderFrame(ctx, clip, timeRef.current)
          }}
        />
        <span className="player-time">
          {formatNumber(time, lang, 1)} / {formatNumber(duration, lang, 1)}
        </span>
      </div>
    </div>
  )
}

function CaptionBox({ text }: { text: string }) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  return (
    <fieldset className="panel-group">
      <legend>{t('clipCaption')}</legend>
      <textarea className="caption-text" readOnly value={text} rows={5} />
      <div>
        <button
          type="button"
          className="btn"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text)
              setCopied(true)
              setTimeout(() => setCopied(false), 1600)
            } catch {
              /* clipboard blocked — the text can still be selected by hand */
            }
          }}
        >
          {copied ? t('copied') : t('clipCopyCaption')}
        </button>
      </div>
    </fieldset>
  )
}
