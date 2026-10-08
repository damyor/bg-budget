import { useEffect, useId, useRef, useState } from 'react'
import { useT } from '../lib/i18n'
import { composeUrl, shareLinkUrl } from '../lib/share'

interface Props {
  /** The view's share page, which gives the link its preview card. */
  url: string
  title: string
  /** One sentence with the facts, for email and the device's share sheet. */
  text: string
}

/** "Share" button: copy the link, post it to the usual networks and messengers, or use the device's share sheet. */
export function ShareMenu({ url, title, text }: Props) {
  const t = useT()
  const id = useId()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard blocked — the share items still work */
    }
  }

  const message = `${title}\n${url}`
  // Apps (viber:, mailto:) open in place; web share dialogs in a new tab.
  const items: { name: string; href: string; app?: boolean }[] = [
    { name: 'Facebook', href: shareLinkUrl.facebook(url) },
    { name: 'Viber', href: composeUrl.viber(message), app: true },
    { name: 'WhatsApp', href: composeUrl.whatsapp(message) },
    { name: 'Telegram', href: composeUrl.telegram(url, title) },
    { name: 'X', href: composeUrl.x(message) },
    { name: 'LinkedIn', href: shareLinkUrl.linkedin(url) },
    { name: 'Reddit', href: shareLinkUrl.reddit(url, title) },
    { name: t('shareEmail'), href: shareLinkUrl.email(url, title, text), app: true },
  ]

  return (
    <div className="share" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="btn"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        onClick={() => {
          // On a phone the device's share sheet already lists every app; on a computer the menu does.
          if (typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches) {
            navigator.share({ title, text: title, url }).catch((e: unknown) => {
              if (!(e instanceof DOMException && e.name === 'AbortError')) setOpen(true)
            })
            return
          }
          setOpen((o) => !o)
        }}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 2.5v10M6 6l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4.5 10v5.5a1.5 1.5 0 001.5 1.5h8a1.5 1.5 0 001.5-1.5V10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        {t('share')}
      </button>
      {open && (
        <div className="share-menu" id={`${id}-menu`} role="group" aria-label={t('shareTo')}>
          <button type="button" className="share-item" onClick={copy}>
            {copied ? t('copied') : t('copyLink')}
          </button>
          {items.map((item) => (
            <a
              key={item.name}
              className="share-item"
              href={item.href}
              target={item.app ? undefined : '_blank'}
              rel={item.app ? undefined : 'noopener noreferrer'}
              onClick={() => setOpen(false)}
            >
              {item.name}
            </a>
          ))}
          {typeof navigator.share === 'function' && (
            <button
              type="button"
              className="share-item"
              onClick={() => {
                setOpen(false)
                navigator.share({ title, text, url }).catch(() => undefined)
              }}
            >
              {t('shareMore')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
