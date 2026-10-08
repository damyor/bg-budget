import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { sharePages } from './scripts/sharePages.ts'

// The site's public address, with a trailing slash: links in posts and link previews need it absolute.
// It is package.json's "homepage" (change it when the site moves, e.g. to a custom domain) unless the
// VITE_SITE_URL environment variable is set; the app reads it as import.meta.env.VITE_SITE_URL and
// index.html as %VITE_SITE_URL%.
const { homepage } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { homepage: string }
const site = (process.env.VITE_SITE_URL ?? homepage).replace(/\/*$/, '/')
process.env.VITE_SITE_URL = site

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), sharePages(site)],
})
