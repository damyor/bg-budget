import { lazy, Suspense } from 'react'
import { useDatasetIndex } from './lib/data'
import { LangContext, translate, type StringKey } from './lib/i18n'
import { navigate, useRoute, type Page } from './lib/route'
import { SettingsProvider, useSettings } from './lib/settings'
import { TaxProfileProvider } from './lib/taxProfile'
import { About } from './pages/About'
import { Compare } from './pages/Compare'
import { Explorer } from './pages/Explorer'
import { Lists } from './pages/Lists'
import { MyMoney } from './pages/MyMoney'

// The clip studio pulls in the video encoder; load it only when opened.
const ClipStudio = lazy(() => import('./pages/ClipStudio'))

const NAV: { page: Page; key: StringKey }[] = [
  { page: 'explore', key: 'navExplore' },
  { page: 'compare', key: 'navCompare' },
  { page: 'lists', key: 'navLists' },
  { page: 'me', key: 'navMe' },
  { page: 'clip', key: 'navClip' },
  { page: 'about', key: 'navAbout' },
]

function Shell() {
  const { lang, theme, mode, update } = useSettings()
  const route = useRoute()
  const index = useDatasetIndex()
  const t = (key: StringKey) => translate(lang, key)

  // Keep the dataset, category and unit when moving between pages.
  const carry = (page: Page) => {
    const params: Record<string, string> = {}
    if (page === 'lists') return { page, params }
    if (route.params.d && page !== 'compare') params.d = route.params.d
    if (route.params.n && page !== 'me' && page !== 'about') params.n = route.params.n
    if (route.params.m && (page === 'explore' || page === 'compare')) params.m = route.params.m
    return { page, params }
  }

  let body
  if (index.status === 'loading') body = <p className="page-status">{t('loading')}</p>
  else if (index.status === 'error') body = <p className="page-status">{t('loadError')}</p>
  else if (route.page === 'me') body = <MyMoney datasets={index.value} />
  else if (route.page === 'compare') body = <Compare datasets={index.value} />
  else if (route.page === 'lists') body = <Lists datasets={index.value} />
  else if (route.page === 'clip')
    body = (
      <Suspense fallback={<p className="page-status">{t('loading')}</p>}>
        <ClipStudio datasets={index.value} />
      </Suspense>
    )
  else if (route.page === 'about') body = <About />
  else body = <Explorer datasets={index.value} />

  return (
    <LangContext.Provider value={lang}>
      <header className="site-header">
        <a className="brand" href="#/explore" aria-label={t('appName')}>
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="brand-text">
            <span className="brand-name">{t('appName')}</span>
            <span className="brand-tagline">{t('tagline')}</span>
          </span>
        </a>
        <nav className="main-nav" aria-label={t('mainNav')}>
          {NAV.map((item) => (
            <a
              key={item.page}
              href={`#/${item.page}`}
              aria-current={route.page === item.page ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault()
                navigate(carry(item.page))
              }}
            >
              {t(item.key)}
            </a>
          ))}
        </nav>
        <div className="header-tools">
          <button
            type="button"
            className="icon-btn"
            onClick={() => update({ lang: lang === 'bg' ? 'en' : 'bg' })}
            aria-label={t('switchLang')}
            title={t('switchLang')}
          >
            {t('switchLangShort')}
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => update({ theme: mode === 'dark' ? 'light' : 'dark' })}
            aria-label={mode === 'dark' ? t('themeLight') : t('themeDark')}
            title={mode === 'dark' ? t('themeLight') : t('themeDark')}
            data-theme-choice={theme}
          >
            {mode === 'dark' ? (
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <circle cx="10" cy="10" r="4" fill="currentColor" />
                <path
                  d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M4 4l1.4 1.4M14.6 14.6L16 16M4 16l1.4-1.4M14.6 5.4L16 4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M16.5 12.5A7 7 0 017.5 3.5a7 7 0 109 9z" fill="currentColor" />
              </svg>
            )}
          </button>
        </div>
      </header>
      <main className="page">{body}</main>
    </LangContext.Provider>
  )
}

export default function App() {
  return (
    <SettingsProvider>
      <TaxProfileProvider>
        <Shell />
      </TaxProfileProvider>
    </SettingsProvider>
  )
}
