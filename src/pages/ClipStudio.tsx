import { useEffect, useMemo, useRef, useState } from 'react'
import { defaultTitle, measure, NETWORKS, postTexts, type Network, type PostField } from '../clip/caption'
import { canExportVideo, ensureClipFonts, exportClip, exportPoster, type ExportResult } from '../clip/encode'
import { FORMAT_SIZE, type ClipFormat } from '../clip/layout'
import { prepareClip, renderFrame, type ClipSpec, type PreparedClip } from '../clip/render'
import type { Speed } from '../clip/timeline'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { DatasetPicker } from '../components/DatasetPicker'
import { SearchBox } from '../components/SearchBox'
import { Segmented } from '../components/Segmented'
import { useDataset } from '../lib/data'
import { findEntry } from '../lib/datasets'
import { formatNumber } from '../lib/format'
import { useLang, useT, type StringKey } from '../lib/i18n'
import type { Mode } from '../lib/palette'
import { navigate, useRoute } from '../lib/route'
import { composeUrl, hashtagCount, shareLinkUrl, shareUrl, uploadUrl } from '../lib/share'
import { SITE_LABEL, SITE_URL } from '../lib/site'
import { slugify } from '../lib/slug'
import { useTaxesByYear } from '../lib/taxProfile'
import { realPathTo } from '../lib/tree'
import type { DatasetIndexEntry, Lang } from '../lib/types'

type ExportState =
  | { status: 'idle' }
  | { status: 'running'; progress: number }
  | { status: 'done'; result: ExportResult; url: string }
  | { status: 'error'; message: string }

/** How long the settings must stay unchanged before the video is rendered in the background. */
const RENDER_DELAY_MS = 900

function fileStem(spec: ClipSpec): string {
  const target = spec.path[spec.path.length - 1]
  return ['budget', spec.dataset.year, slugify(target.name.bg) || 'total', spec.format].join('-')
}

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
  /** Bumped by "Try again" after a failed render. */
  const [attempt, setAttempt] = useState(0)
  /** The background render, for the clip (and attempt) it was made for. */
  const [render, setRender] = useState<{ clip: PreparedClip | null; attempt: number; state: ExportState }>({
    clip: null,
    attempt: 0,
    state: { status: 'idle' },
  })

  const ready = loaded.status === 'ready' ? loaded.value : null
  const nodeId = ready && route.params.n && ready.tree.byId.has(route.params.n) ? route.params.n : 'root'
  const path = useMemo(() => (ready ? realPathTo(ready.tree, nodeId) : []), [ready, nodeId])

  const autoTitle = path.length && ready ? defaultTitle(path, clipLang, ready.dataset.family) : ''
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

  const shareLink = clip ? shareUrl(SITE_URL, clip.spec.lang, clip.spec.dataset.id, clip.spec.path[clip.spec.path.length - 1].id) : ''
  const posts = useMemo(() => {
    if (!clip) return null
    const { dataset, path, lang, title } = clip.spec
    return postTexts({ dataset, path, lang, title, url: shareLink, site: SITE_LABEL })
  }, [clip, shareLink])

  const exportState: ExportState = render.clip === clip && render.attempt === attempt ? render.state : { status: 'idle' }

  // Every new clip is rendered in the background as soon as the settings rest, so the video is ready to share.
  useEffect(() => {
    if (!clip || !canExportVideo()) return
    const controller = new AbortController()
    const set = (state: ExportState) => controller.signal.aborted || setRender({ clip, attempt, state })
    let url: string | null = null
    const timer = setTimeout(async () => {
      set({ status: 'running', progress: 0 })
      try {
        const result = await exportClip(clip, fileStem(clip.spec), (progress) => set({ status: 'running', progress }), controller.signal)
        if (controller.signal.aborted) return
        url = URL.createObjectURL(result.blob)
        set({ status: 'done', result, url })
      } catch (e) {
        set({ status: 'error', message: e instanceof Error ? e.message : String(e) })
      }
    }, RENDER_DELAY_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
      if (url) URL.revokeObjectURL(url)
    }
  }, [clip, attempt])

  if (loaded.status === 'loading') return <p className="page-status">{t('loading')}</p>
  if (loaded.status === 'error' || !ready || !clip || !posts) return <p className="page-status">{t('loadError')}</p>

  const { dataset, tree } = ready
  const target = path[path.length - 1]
  const setTarget = (id: string) =>
    navigate({ page: 'clip', params: { ...route.params, d: dataset.id, n: id === 'root' ? '' : id } }, { replace: true })

  const downloadPoster = async () => {
    const result = await exportPoster(clip, fileStem(clip.spec))
    const url = URL.createObjectURL(result.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.fileName
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
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

        <ShareClip
          posts={posts}
          url={shareLink}
          exportState={exportState}
          duration={seconds}
          onRetry={() => setAttempt((a) => a + 1)}
          onPoster={downloadPoster}
        />
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


// ---------- sharing ----------

/** The networks with a button of their own; Viber, WhatsApp and Telegram share one text. */
type Target = 'tiktok' | 'instagram' | 'youtube' | 'facebook' | 'x' | 'linkedin' | 'threads' | 'bluesky' | 'viber' | 'whatsapp' | 'telegram'

const TARGETS: Target[] = ['tiktok', 'instagram', 'youtube', 'facebook', 'x', 'linkedin', 'threads', 'bluesky', 'viber', 'whatsapp', 'telegram']

const TARGET_NAME: Record<Target, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
  facebook: 'Facebook',
  x: 'X',
  linkedin: 'LinkedIn',
  threads: 'Threads',
  bluesky: 'Bluesky',
  viber: 'Viber',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
}

const TEXT_OF: Record<Target, Network> = {
  tiktok: 'tiktok',
  instagram: 'instagram',
  youtube: 'youtube',
  facebook: 'facebook',
  x: 'x',
  linkedin: 'linkedin',
  threads: 'threads',
  bluesky: 'bluesky',
  viber: 'messengers',
  whatsapp: 'messengers',
  telegram: 'messengers',
}

/** Networks that take nothing but a video: their button hands the file over. The rest post the text and link. */
const VIDEO_ONLY = new Set<Target>(['tiktok', 'instagram', 'youtube'])

const NETWORK_NAME: Record<Network, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  x: 'X',
  linkedin: 'LinkedIn',
  threads: 'Threads',
  bluesky: 'Bluesky',
  messengers: 'Viber · WhatsApp · Telegram',
}

const TIP = {
  tiktok: 'tipTiktok',
  instagram: 'tipInstagram',
  facebook: 'tipFacebook',
  youtube: 'tipYoutube',
  x: 'tipX',
  linkedin: 'tipLinkedin',
  threads: 'tipThreads',
  bluesky: 'tipBluesky',
  messengers: 'tipMessengers',
} as const

/**
 * A phone's share sheet hands a video straight to the TikTok, Instagram or YouTube app; a computer's
 * cannot, so there the video is downloaded and the network's upload page opened.
 */
function sharing(): { sheet: boolean; phone: boolean } {
  const probe = new File([], 'clip.mp4', { type: 'video/mp4' })
  const sheet = typeof navigator.canShare === 'function' && navigator.canShare({ files: [probe] })
  return { sheet, phone: sheet && window.matchMedia('(pointer: coarse)').matches }
}

interface ShareClipProps {
  posts: ReturnType<typeof postTexts>
  /** The view's share page. */
  url: string
  exportState: ExportState
  duration: string
  onRetry: () => void
  onPoster: () => void
}

/** The video, and one button per network that copies the post's text, hands over the video where needed and opens the network. */
function ShareClip({ posts, url, exportState, duration, onRetry, onPoster }: ShareClipProps) {
  const t = useT()
  const lang = useLang()
  const { sheet, phone } = useMemo(() => sharing(), [])
  const [network, setNetwork] = useState<Network>('tiktok')
  const [textsOpen, setTextsOpen] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  /** The video already downloaded, so a second network does not download it again. */
  const [downloaded, setDownloaded] = useState<string | null>(null)
  // Hand edits of the texts (by "<network>:<field>") and the last hint belong to the texts they were made for.
  const [edited, setEdited] = useState({ posts, values: {} as Record<string, string> })
  const edits = edited.posts === posts ? edited.values : {}
  const [note, setNote] = useState<{ posts: typeof posts; key: StringKey; network?: string } | null>(null)
  const hint = note?.posts === posts ? t(note.key, note.network ? { network: note.network } : undefined) : null
  const setHint = (key: StringKey | null, network?: string) => setNote(key === null ? null : { posts, key, network })

  const video = exportState.status === 'done' ? exportState : null
  const valueOf = (n: Network, f: PostField) => edits[`${n}:${f.id}`] ?? f.text
  const textOf = (n: Network) => valueOf(n, posts[n][0])
  const copy = (text: string) => navigator.clipboard.writeText(text).catch(() => undefined)

  const copyField = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600)
    } catch {
      /* clipboard blocked — the text can still be selected by hand */
    }
  }

  const download = () => {
    if (!video || downloaded === video.url) return
    const a = document.createElement('a')
    a.href = video.url
    a.download = video.result.fileName
    a.click()
    setDownloaded(video.url)
  }

  // The share sheet takes only the file: with text attached some apps (Instagram) leave the sheet.
  const shareVideo = (text: string) => {
    if (!video) return
    void copy(text)
    navigator.share({ files: [new File([video.result.blob], video.result.fileName, { type: 'video/mp4' })] }).catch(() => undefined)
  }

  const hrefOf = (target: Target): string | null => {
    const text = textOf(TEXT_OF[target])
    if (target === 'tiktok' || target === 'instagram' || target === 'youtube') return phone ? null : uploadUrl[target]
    if (target === 'facebook' || target === 'linkedin') return shareLinkUrl[target](url)
    if (target === 'telegram') return composeUrl.telegram(url, text.replace(url, '').trim())
    return composeUrl[target](text)
  }

  const post = (target: Target) => {
    const n = TEXT_OF[target]
    const name = TARGET_NAME[target]
    setNetwork(n)
    if (VIDEO_ONLY.has(target) && phone) {
      shareVideo(textOf(n))
      setHint('postHintShare', name)
      return
    }
    void copy(textOf(n))
    if (VIDEO_ONLY.has(target)) {
      download()
      if (target === 'youtube') setTextsOpen(true)
      if (target === 'youtube') setHint('postHintYoutube')
      else setHint('postHintUpload', name)
    } else if (target === 'facebook' || target === 'linkedin') {
      setHint('postHintCard')
    } else if (n !== 'messengers') {
      setHint('postHintFilled')
    } else {
      setHint(null)
    }
  }

  const fields = posts[network]
  const label = { text: t('postText'), title: t('postYtTitle'), description: t('postYtDescription') }
  const copyLabel = { text: t('postCopyText'), title: t('postCopyTitle'), description: t('postCopyDescription') }
  const pct = exportState.status === 'running' ? Math.round(exportState.progress * 100) : 0
  const videoMissing = canExportVideo() ? t('postWaitVideo') : t('clipUnsupported')

  return (
    <fieldset className="panel-group share-clip">
      <legend>{t('shareClipTitle')}</legend>

      {!canExportVideo() ? (
        <p className="note">{t('clipUnsupported')}</p>
      ) : exportState.status === 'error' ? (
        <div className="export-progress">
          <p className="note error">{t('clipError', { msg: exportState.message })}</p>
          <button type="button" className="btn" onClick={onRetry}>
            {t('clipRetry')}
          </button>
        </div>
      ) : video ? (
        <p className="muted small">
          {t('clipReady', { size: `${formatNumber(video.result.blob.size / 1e6, lang, 1)} MB`, duration })}
        </p>
      ) : (
        <div className="export-progress">
          <div className="progress" role="progressbar" aria-label={t('clipExporting', { pct: '' })} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
            <span style={{ width: `${pct}%` }} />
          </div>
          <span className="muted small">{t('clipExporting', { pct: `${pct}%` })}</span>
        </div>
      )}

      <div className="actions share-actions">
        {sheet && (
          <button
            type="button"
            className={phone ? 'btn btn-primary btn-lg' : 'btn btn-lg'}
            disabled={!video}
            onClick={() => {
              shareVideo(textOf(network))
              setHint('clipShareCopied')
            }}
          >
            {t('clipShareVideo')}
          </button>
        )}
        {video ? (
          <a
            className={phone ? 'btn btn-lg' : 'btn btn-primary btn-lg'}
            href={video.url}
            download={video.result.fileName}
            onClick={() => setDownloaded(video.url)}
          >
            {t('clipDownload')}
          </a>
        ) : (
          <button type="button" className={phone ? 'btn btn-lg' : 'btn btn-primary btn-lg'} disabled title={videoMissing}>
            {t('clipDownload')}
          </button>
        )}
        <button type="button" className="btn btn-lg" onClick={onPoster}>
          {t('clipPoster')}
        </button>
      </div>
      {video && video.result.codec !== 'avc' && <p className="note">{t('clipCodecNote', { codec: video.result.codec.toUpperCase() })}</p>}

      <div className="post-on">
        <span className="chips-label">{t('postOn')}</span>
        <div className="network-buttons">
          {TARGETS.map((target) => {
            const name = TARGET_NAME[target]
            if (VIDEO_ONLY.has(target) && !video) {
              return (
                <button key={target} type="button" className="btn btn-sm" disabled title={videoMissing}>
                  {name}
                </button>
              )
            }
            const href = hrefOf(target)
            if (!href) {
              return (
                <button key={target} type="button" className="btn btn-sm" onClick={() => post(target)}>
                  {name}
                </button>
              )
            }
            // Viber opens its app in place; the rest open in a new tab.
            const app = target === 'viber'
            return (
              <a
                key={target}
                className="btn btn-sm"
                href={href}
                target={app ? undefined : '_blank'}
                rel={app ? undefined : 'noopener noreferrer'}
                onClick={() => post(target)}
              >
                {name}
              </a>
            )
          })}
        </div>
        <p className="muted small" role="status">
          {hint ?? t('shareClipIntro')}
        </p>
      </div>

      <details className="post-texts" open={textsOpen} onToggle={(e) => setTextsOpen(e.currentTarget.open)}>
        <summary>{t('postTexts')}</summary>
        <Segmented<Network>
          label={t('postNetwork')}
          value={network}
          onChange={setNetwork}
          options={NETWORKS.map((n) => ({ value: n, label: NETWORK_NAME[n] }))}
        />
        {fields.map((f) => {
          const key = `${network}:${f.id}`
          const value = valueOf(network, f)
          const length = measure(value, f.counting)
          const over = f.limit !== undefined && length > f.limit
          const edit = (text: string | null) => {
            const values = { ...edits }
            if (text === null) delete values[key]
            else values[key] = text
            setEdited({ posts, values })
          }
          return (
            <label key={key} className="field">
              <span className="post-field-head">
                <span className="field-label">{label[f.id]}</span>
                {f.limit !== undefined && (
                  <span className={over ? 'post-count over' : 'post-count'}>
                    {t('postCount', { n: formatNumber(length, lang), max: formatNumber(f.limit, lang) })}
                  </span>
                )}
              </span>
              {f.id === 'title' ? (
                <input type="text" value={value} onChange={(e) => edit(e.target.value)} />
              ) : (
                <textarea className="caption-text" value={value} rows={Math.min(12, value.split('\n').length + 2)} onChange={(e) => edit(e.target.value)} />
              )}
              {over && <span className="post-warning">{t('postOver')}</span>}
              {f.maxHashtags !== undefined && hashtagCount(value) > f.maxHashtags && (
                <span className="post-warning">{t('postTooManyTags', { max: f.maxHashtags })}</span>
              )}
              {edits[key] !== undefined && (
                <button type="button" className="link-btn" onClick={() => edit(null)}>
                  {t('postReset')}
                </button>
              )}
            </label>
          )
        })}
        <p className="muted small">{t(TIP[network])}</p>
        <div className="actions post-actions">
          {fields.map((f) => (
            <button key={f.id} type="button" className="btn" onClick={() => copyField(`${network}:${f.id}`, valueOf(network, f))}>
              {copied === `${network}:${f.id}` ? t('copied') : copyLabel[f.id]}
            </button>
          ))}
        </div>
      </details>
    </fieldset>
  )
}
