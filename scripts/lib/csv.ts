import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'

/** RFC 4180 CSV parser (quoted fields, embedded commas, quotes and newlines). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') {
        quoted = false
      } else {
        field += ch
      }
    } else if (ch === '"') {
      quoted = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += ch
    }
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/** Rows as objects keyed by the header row; a .csv.gz file is unpacked first. */
export function readCsv(file: URL): Record<string, string>[] {
  const raw = readFileSync(file)
  const text = (file.pathname.endsWith('.gz') ? gunzipSync(raw) : raw).toString('utf8')
  const [header, ...rows] = parseCsv(text.replace(/^﻿/, ''))
  return rows.filter((r) => r.some((c) => c.trim())).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])))
}

/**
 * Parses numbers as written in Bulgarian official documents: "5 256 677,2"
 * (space thousands, comma decimal), "73,927.3" (comma thousands, dot decimal),
 * "2914850.5" or "-397,3". When both separators appear, the last one is the decimal mark.
 */
export function num(text: string | undefined): number {
  if (!text) return NaN
  let cleaned = text.replace(/[\s\u00a0\u202f]/g, '')
  if (cleaned === '') return NaN
  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')
  if (lastComma >= 0 && lastDot >= 0) {
    cleaned = lastComma > lastDot ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned.replace(/,/g, '')
  } else if (lastComma >= 0) {
    cleaned = cleaned.replace(',', '.')
  }
  return Number(cleaned)
}

const LOOKALIKES: Record<string, string> = {
  A: 'А', B: 'В', C: 'С', E: 'Е', H: 'Н', K: 'К', M: 'М', O: 'О', P: 'Р', T: 'Т', X: 'Х', Y: 'У',
  a: 'а', c: 'с', e: 'е', o: 'о', p: 'р', x: 'х', y: 'у',
}

/**
 * Official documents sometimes mix Latin look-alike letters into Cyrillic
 * words ("Cмолян" with a Latin C). Replace them in words that are otherwise Cyrillic.
 */
export function fixCyrillic(text: string): string {
  return text.replace(/[\p{L}]+/gu, (word) => (/[\u0400-\u04ff]/.test(word) ? word.replace(/[ABCEHKMOPTXYaceopxy]/g, (ch) => LOOKALIKES[ch]) : word))
}
