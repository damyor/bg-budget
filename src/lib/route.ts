import { useSyncExternalStore } from 'react'

// Hash routing keeps the site deployable as plain static files:
//   #/explore?d=<dataset>&n=<node>&m=<mode>   #/compare?f=<family>&m=<mode>   #/me?y=<year>   #/clip?d=…&n=…   #/about
//   #/lists?l=<list>&q=<search>&f=<column>:<value>,…&s=<sort>&d=<dataset the viewer came from>

export type Page = 'explore' | 'compare' | 'lists' | 'me' | 'clip' | 'about'
const PAGES: Page[] = ['explore', 'compare', 'lists', 'me', 'clip', 'about']

export interface Route {
  page: Page
  params: Record<string, string>
}

export function parseHash(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?')
  const page = (PAGES as string[]).includes(path) ? (path as Page) : 'explore'
  return { page, params: Object.fromEntries(new URLSearchParams(query)) }
}

export function buildHash(route: Route): string {
  const query = new URLSearchParams(
    Object.entries(route.params).filter(([, v]) => v !== undefined && v !== ''),
  ).toString()
  return `#/${route.page}${query ? `?${query}` : ''}`
}

export function navigate(route: Route, options: { replace?: boolean } = {}): void {
  const hash = buildHash(route)
  if (hash === window.location.hash) return
  const from = parseHash(window.location.hash)
  if (options.replace) {
    history.replaceState(null, '', hash)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else {
    window.location.hash = hash
  }
  // Another page, or another list, starts at its top (back and forward keep the browser's own scroll position).
  if (!options.replace && (from.page !== route.page || (route.page === 'lists' && from.params.l !== route.params.l))) window.scrollTo(0, 0)
}

/** Absolute URL for a route — used for share links. */
export function routeUrl(route: Route): string {
  return `${window.location.origin}${window.location.pathname}${buildHash(route)}`
}

const subscribe = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export function useHash(): string {
  return useSyncExternalStore(subscribe, () => window.location.hash)
}

export function useRoute(): Route {
  return parseHash(useHash())
}
