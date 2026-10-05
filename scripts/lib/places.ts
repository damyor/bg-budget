// Provinces and municipalities: transliteration, display names, and the one id
// scheme every dataset uses for them, so the same municipality is the same node
// in every year (and in "by purpose", under each function, with a prefix).
// The register (data/sources/places/municipalities.csv) adds each municipality's
// ЕБК code and residents.

import type { LocalizedText } from '../../src/lib/types.ts'
import { fixCyrillic, num, readCsv } from './csv.ts'

const t = (bg: string, en: string): LocalizedText => ({ bg, en })

const LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
  р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sht', ъ: 'a', ь: 'y', ю: 'yu', я: 'ya',
}

/** Official Bulgarian transliteration (used for municipality names in English). */
export function transliterate(text: string): string {
  return [...text]
    .map((ch) => {
      const lower = ch.toLocaleLowerCase('bg-BG')
      const latin = LATIN[lower]
      if (latin === undefined) return ch
      return ch === lower ? latin : latin.charAt(0).toUpperCase() + latin.slice(1)
    })
    .join('')
}

export const slug = (s: string) =>
  transliterate(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export const OBLAST_EN: Record<string, string> = {
  Благоевград: 'Blagoevgrad', Бургас: 'Burgas', Варна: 'Varna', 'Велико Търново': 'Veliko Tarnovo', Видин: 'Vidin', Враца: 'Vratsa',
  Габрово: 'Gabrovo', Добрич: 'Dobrich', Кърджали: 'Kardzhali', Кюстендил: 'Kyustendil', Ловеч: 'Lovech', Монтана: 'Montana',
  Пазарджик: 'Pazardzhik', Перник: 'Pernik', Плевен: 'Pleven', Пловдив: 'Plovdiv', Разград: 'Razgrad', Русе: 'Ruse', Силистра: 'Silistra',
  Сливен: 'Sliven', Смолян: 'Smolyan', 'София-град': 'Sofia City', Софийска: 'Sofia',
  'Стара Загора': 'Stara Zagora', Търговище: 'Targovishte', Хасково: 'Haskovo', Шумен: 'Shumen', Ямбол: 'Yambol',
}

/** "Велико търново" → "Велико Търново"; "София-град" stays. */
export function prettyOblast(name: string): string {
  return name
    .replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toLocaleUpperCase('bg-BG'))
    .replace('-Град', '-град')
    .replace('-Област', '-област')
}

// ---------- the id scheme ----------

/** Node kinds of places (clip titles recognise them by these names). */
export const PLACE_KIND = {
  province: t('Област (регион)', 'Province'),
  municipality: t('Община', 'Municipality'),
}

/** Sofia municipality is a province of its own (София-град); the acts list it after Smolyan without a heading. */
export const SOFIA = 'Столична община'
export const SOFIA_CITY = 'София-град'

/** "ОБЛАСТ ВЕЛИКО ТЪРНОВО" (a heading of the State Budget Act) → "Велико Търново". */
export function provinceFromHeading(heading: string): string {
  const name = fixCyrillic(heading).replace(/^ОБ\s*ЛАСТ\s+/i, '').trim()
  return prettyOblast(name.charAt(0) + name.slice(1).toLocaleLowerCase('bg-BG'))
}

/** A municipality's name and province as printed, with Sofia put in its own province. */
export function placeOf(province: string, municipality: string): { province: string; municipality: string } {
  const name = fixCyrillic(municipality.trim())
  if (name.toLocaleUpperCase('bg-BG') === SOFIA.toLocaleUpperCase('bg-BG')) return { province: SOFIA_CITY, municipality: SOFIA }
  return { province: /^ОБ\s*ЛАСТ\s/i.test(province.trim()) ? provinceFromHeading(province) : province.trim(), municipality: name }
}

/** Id of a province: "veliko-tarnovo". */
export const provinceKey = (province: string) => slug(province)

/** Id of a municipality: "<province>-<municipality>", e.g. "plovdiv-plovdiv", "yambol-tundzha". */
export const municipalityKey = (province: string, municipality: string) => `${provinceKey(province)}-${slug(municipality)}`

export function provinceName(province: string): LocalizedText {
  const pretty = prettyOblast(province)
  if (pretty === 'Софийска') return t('Софийска област', 'Sofia Province')
  if (pretty === SOFIA_CITY) return t('Област София-град', 'Sofia City Province')
  return t(`Област ${pretty}`, `${OBLAST_EN[pretty] ?? transliterate(pretty)} Province`)
}

export function municipalityName(municipality: string): LocalizedText {
  if (municipality === SOFIA) return t('Столична община (София)', 'Sofia (Stolichna municipality)')
  return t(`Община ${municipality}`, `${transliterate(municipality.replace(/[„“"”]/g, ''))} municipality`)
}

// ---------- the register ----------

export interface Municipality {
  /** ЕБК code (section VII of the Unified Budget Classification), e.g. "6609" — the key of project and payment data. */
  code: string
  province: string
  name: string
  /** Id, see municipalityKey. */
  key: string
  /** Residents at 31 December of each year (NSI). */
  residents: Map<number, number>
}

export interface Register {
  all: Municipality[]
  /** The municipality a source row names (province heading or name, and municipality as printed). */
  find: (province: string, municipality: string) => Municipality
  byCode: (code: string) => Municipality
}

/** Reads data/sources/places/municipalities.csv (ebk_code, province, municipality, residents_<yyyy>_12_31 …). */
export function readRegister(file: URL): Register {
  const rows = readCsv(file)
  const residentColumns = Object.keys(rows[0]).flatMap((k) => {
    const m = /^residents_(\d{4})_12_31$/.exec(k)
    return m ? [{ column: k, year: Number(m[1]) }] : []
  })
  const all = rows.map((r): Municipality => ({
    code: r.ebk_code,
    province: r.province,
    name: r.municipality,
    key: municipalityKey(r.province, r.municipality),
    residents: new Map(residentColumns.map(({ column, year }) => [year, num(r[column])])),
  }))
  const byKey = new Map(all.map((m) => [m.key, m]))
  const byCode = new Map(all.map((m) => [m.code, m]))
  if (byKey.size !== all.length || byCode.size !== all.length) throw new Error(`${file.pathname}: duplicate municipality ids or codes`)
  return {
    all,
    find: (province, municipality) => {
      const place = placeOf(province, municipality)
      const found = byKey.get(municipalityKey(place.province, place.municipality))
      if (!found) throw new Error(`No municipality "${municipality}" (${province}) in ${file.pathname}`)
      return found
    },
    byCode: (code) => {
      const found = byCode.get(code)
      if (!found) throw new Error(`No municipality with ЕБК code ${code} in ${file.pathname}`)
      return found
    },
  }
}
