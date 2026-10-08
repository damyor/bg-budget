import { siteLabel } from './share'

/**
 * The site's public address with a trailing slash ("https://damyor.github.io/bg-budget/"), from
 * package.json "homepage" (vite.config.ts). Links in posts point there even when the app runs locally.
 */
export const SITE_URL: string = import.meta.env.VITE_SITE_URL

/** "damyor.github.io/bg-budget", shown in the corner of every clip. */
export const SITE_LABEL = siteLabel(SITE_URL)
