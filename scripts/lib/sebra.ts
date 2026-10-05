// SEBRA individual payments (data.egov.bg dataset 20439): reading the published rows,
// normalising payee names, grouping the spellings of one payee and classifying payees.
// Used by the extractor (scripts/extract/sebra.ts), which writes data/sources/sebra/;
// tested in src/lib/__tests__/sebra.test.ts.

import { createHash } from 'node:crypto'
import { fixCyrillic } from './csv.ts'
import { BGN_PER_EUR } from './kfp.ts'

// ---------- rows ----------

/** One published payment, read from the 17 columns of the source (see parsePayment). */
export interface Payment {
  /** Settlement date, ISO. */
  date: string
  /** Payee name as published (whitespace collapsed, personal numbers masked, see maskIds). */
  name: string
  /** The payee's IBAN, or '' when masked or missing. Used only to group spellings; never written out. */
  account: string
  bic: string
  /** FIN_CODE, the payer unit's 10-digit code, or '' when masked ("**********"). */
  unitCode: string
  /** FIN_NAME, the payer unit as published (personal numbers masked). */
  unitName: string
  /** The 3-digit SEBRA primary system (PRIMARY_ORG_CODE; FIN_CODE's first 3 digits), '' when lost. */
  system: string
  /** Amount in the source currency. */
  amount: number
  currency: 'BGN' | 'EUR'
  /** SEBRA payment code, "10" … "90". */
  code: string
  /** REASON1 and REASON2 (the two lines of the payment purpose), personal numbers and IBANs masked. */
  reason: string
  /** The row did not have its file's column layout and was realigned. */
  repaired: boolean
}

export const COLUMNS = [
  'SETTLEMENT_DATE', 'CLIENT_RECEIVER_NAME', 'CLIENT_RECEIVER_ACC', 'CLIENT_RECEIVER_BIC', 'FIN_CODE', 'FIN_NAME', 'AMOUNT', 'CURRENCY',
  'REASON1', 'REASON2', 'REG_DATE', 'REG_NO', 'SEBRA_PAY_CODE', 'ORGANIZATION', 'PRIMARY_ORGANIZATION', 'PRIMARY_ORG_CODE', 'CLIENT_NAME_HASH',
]

const DATE = /^\d\d\.\d\d\.\d{4}$/
const AMOUNT = /^\d+(\.\d+)?$/
const PAY_CODE = /^\d\d$/
const HASH = /^[0-9a-f]{64}$/
const IBAN = /^[A-Z]{2}\d\d[A-Z0-9]{10,30}$/
const iso = (d: string) => `${d.slice(6)}-${d.slice(3, 5)}-${d.slice(0, 2)}`
const clean = (s: string | undefined) => (s ?? '').replace(/[\s ]+/g, ' ').trim()

/**
 * Reads one row of the published file. Most rows have the 17 columns in order. Known deviations,
 * all realigned here:
 * - Q3 2024: ORGANIZATION is empty, PRIMARY_ORGANIZATION holds the system code without leading
 *   zeros, PRIMARY_ORG_CODE the name hash, and FIN_CODE lost its leading zeros;
 * - purposes with commas split into extra columns, pushing the rest right (and cutting the last ones);
 * - an empty column after the payee name (Q4 2024), or no currency column (one row of 2022).
 * The payment code and registration date are found after the purposes as "date, number, 2-digit code".
 */
export function parsePayment(f: string[], defaultCurrency: 'BGN' | 'EUR'): Payment {
  if (!DATE.test(clean(f[0]))) throw new Error(`no settlement date in ${JSON.stringify(f).slice(0, 200)}`)
  // The amount is followed by the currency; without one (a single 2022 row), it is column 7.
  let amountAt = f.findIndex((v, i) => i >= 6 && (v === 'BGN' || v === 'EUR') && AMOUNT.test(clean(f[i - 1]))) - 1
  const currency = amountAt >= 0 ? (f[amountAt + 1] as 'BGN' | 'EUR') : defaultCurrency
  if (amountAt < 0) {
    if (!AMOUNT.test(clean(f[6]))) throw new Error(`no amount in ${JSON.stringify(f).slice(0, 200)}`)
    amountAt = 6
  }
  const reasonsFrom = amountAt + (amountAt >= 0 && (f[amountAt + 1] === 'BGN' || f[amountAt + 1] === 'EUR') ? 2 : 1)
  // The registration date is usually there, rarely empty.
  const inPlace =
    f.length === 17 && reasonsFrom === 8 && PAY_CODE.test(clean(f[12])) && (DATE.test(clean(f[10])) || !clean(f[10])) &&
    (/^\d{3}$/.test(clean(f[15])) || (/^\d{1,3}$/.test(clean(f[14])) && HASH.test(clean(f[15]))))
  let regAt = inPlace ? 10 : f.findIndex((v, i) => i >= reasonsFrom && DATE.test(clean(v)) && PAY_CODE.test(clean(f[i + 2])) && !DATE.test(clean(f[i + 1])))
  // A row cut off after its purpose or registration number has lost its payment code ('' here).
  if (regAt < 0) regAt = f.findIndex((v, i) => i >= reasonsFrom && i >= f.length - 2 && DATE.test(clean(v)))
  if (regAt < 0 && f.length >= 17) regAt = f.length
  if (regAt < 0) throw new Error(`no payment code in ${JSON.stringify(f).slice(0, 200)}`)
  const codeAt = regAt + 2
  const reasons = f.slice(reasonsFrom, regAt).map(clean).filter(Boolean)
  const standard = amountAt === 6 && reasonsFrom === 8 && regAt === 10
  // After the code: ORGANIZATION, PRIMARY_ORGANIZATION, PRIMARY_ORG_CODE, CLIENT_NAME_HASH — or the Q3 2024 layout.
  const tail = f.slice(codeAt + 1).map(clean)
  let system = ''
  if (HASH.test(tail[2] ?? '') && /^\d{1,3}$/.test(tail[1] ?? '')) system = tail[1].padStart(3, '0')
  else if (/^\d{3}$/.test(tail[2] ?? '')) system = tail[2]
  const rawUnit = clean(f[amountAt - 2])
  const unitCode = /^\d{7,10}$/.test(rawUnit) ? rawUnit.padStart(10, '0') : ''
  // The unit code starts with the system code; use it when the row lost its system column.
  if (!system && unitCode) system = unitCode.slice(0, 3)
  const account = clean(f[amountAt - 4]).toUpperCase()
  return {
    date: iso(clean(f[0])),
    name: maskIds(clean(f.slice(1, amountAt - 4).join(' '))),
    account: IBAN.test(account) ? account : '',
    bic: clean(f[amountAt - 3]).toUpperCase(),
    unitCode,
    unitName: maskIds(clean(f[amountAt - 1])),
    system,
    amount: Number(clean(f[amountAt])),
    currency,
    code: clean(f[codeAt]),
    reason: maskIds(reasons.join(standard ? ' · ' : ', ')),
    repaired: !standard || tail.length < 3,
  }
}

/** Euro cents of a payment; leva convert at the fixed rate. */
export const euroCents = (amount: number, currency: 'BGN' | 'EUR') => Math.round(((currency === 'BGN' ? amount / BGN_PER_EUR : amount) * 100))

/** "2024-07-15" → "2024Q3". */
export const quarterOf = (date: string) => `${date.slice(0, 4)}Q${Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1}`

/** "ЕГН", "ЛНЧ" or "EGN", then within a few characters a number of exactly 10 digits ("ЕГН/ЕИК 8001011234"); a 9-digit ЕИК is not one. */
const PERSONAL_ID = /((?:ЕГН|ЛНЧ|EGN)[^\d]{0,12}?)\d{10}(?!\d)/giu

/**
 * Personal identity numbers (ЕГН, ЛНЧ) and bank accounts (IBAN) typed into any free-text field — the payee's name,
 * the payer's name, the purpose — are masked. Repeated until nothing changes, as a second number may follow the first.
 */
export function maskIds(text: string): string {
  let masked = text
  for (let before = ''; before !== masked; ) {
    before = masked
    masked = masked.replace(PERSONAL_ID, '$1**********')
  }
  return masked.replace(/\bBG\d{2} ?[A-Z]{4}(?: ?\d){6}(?: ?[A-Z0-9]){8}\b/gi, '[IBAN]')
}

/** The personal identity numbers left unmasked in a text (to check what is published). */
export const unmaskedIds = (text: string): string[] => [...text.matchAll(PERSONAL_ID)].map((m) => m[0])

/** A spelling that mentions an identity number ("ЕГН …"): never a payee's main name or one of its aliases. */
export const mentionsId = (text: string) => /\*{4}|(^|[^\p{L}])(ЕГН|ЛНЧ|EGN)([^\p{L}]|$)/iu.test(text)

// ---------- payee names ----------

/** Legal forms of companies under the Commerce Act and the Obligations and Contracts Act, as written in keys. */
export const LEGAL_FORMS = ['ЕООД', 'ООД', 'ЕАД', 'АД', 'ЕТ', 'СД', 'КД', 'КДА', 'АДСИЦ', 'ДЗЗД']
const FORM_SET = new Set(LEGAL_FORMS)
const LATIN_FORMS: Record<string, string> = { EOOD: 'ЕООД', OOD: 'ООД', EAD: 'ЕАД', AD: 'АД', ET: 'ЕТ', ADSIC: 'АДСИЦ', ADSITS: 'АДСИЦ' }
/** Forms cut short at the end of a name that reached the field's length: "… БОЛНИЦА ОО". */
const CUT_FORMS: Record<string, string> = { ЕОО: 'ЕООД', ЕО: 'ЕООД', ОО: 'ООД', ЕА: 'ЕАД' }

const SPELLED_FORMS: [RegExp, string][] = [
  [/ЕДНОЛИЧНО\s+ДРУЖЕСТВО\s+С\s+ОГРАНИЧЕНА\s+ОТГОВОРНОСТ/g, ' ЕООД '],
  [/ДРУЖЕСТВО\s+С\s+ОГРАНИЧЕНА\s+ОТГОВОРНОСТ/g, ' ООД '],
  [/ЕДНОЛИЧНО\s+АКЦИОНЕРНО\s+ДРУЖЕСТВО/g, ' ЕАД '],
  [/АКЦИОНЕРНО\s+ДРУЖЕСТВО\s+СЪС\s+СПЕЦИАЛНА\s+ИНВЕСТИЦИОННА\s+ЦЕЛ/g, ' АДСИЦ '],
  [/АКЦИОНЕРНО\s+ДРУЖЕСТВО/g, ' АД '],
  [/ЕДНОЛИЧЕН\s+ТЪРГОВЕЦ/g, ' ЕТ '],
  // Dotted forms: "Е.О.О.Д.", "О.О.Д", "Е.А.Д.", and at either end "А.Д." and "Е.Т.".
  [/(^|[^\p{L}])Е\s?\.\s?О\s?\.\s?О\s?\.\s?Д\.?(?![\p{L}])/gu, '$1 ЕООД '],
  [/(^|[^\p{L}])О\s?\.\s?О\s?\.\s?Д\.?(?![\p{L}])/gu, '$1 ООД '],
  [/(^|[^\p{L}])Е\s?\.\s?А\s?\.\s?Д\.?(?![\p{L}])/gu, '$1 ЕАД '],
  [/(^|[^\p{L}])А\s?\.\s?Д\.?\s*$/gu, '$1 АД '],
  [/^\s*Е\s?\.\s?Т\.?(?![\p{L}])/gu, ' ЕТ '],
  [/(^|[^\p{L}])Д\s?\.\s?З\s?\.\s?З\s?\.\s?Д\.?(?![\p{L}])/gu, '$1 ДЗЗД '],
]

/**
 * A payee name compared across spellings: upper case, Cyrillic look-alike letters fixed,
 * HTML-entity debris ("&QUOT;", "&КУОТ") and quotes and punctuation removed, legal forms
 * spelled one way: „Фарма Юнион“ О.О.Д. → ФАРМА ЮНИОН ООД.
 */
export function normalizeName(name: string): string {
  let s = fixCyrillic(name.normalize('NFC').toLocaleUpperCase('bg-BG'))
  s = s.replace(/&(#\d+|[A-ZА-Я]{2,6});?/g, ' ')
  for (const [pattern, form] of SPELLED_FORMS) s = s.replace(pattern, form)
  s = s.replace(/[„“”"'«»`‘’.,;:!?()[\]{}/\\_*+=|<>~^%$#@&–—-]+/g, ' ')
  const words = s.split(/\s+/).filter(Boolean).map((w) => LATIN_FORMS[w] ?? w)
  // A form glued to the last word ("ПОДДРЪЖКАЕООД", "77ЕООД"), or cut short by the field's length.
  const last = words.at(-1) ?? ''
  const glued = /^([А-Я0-9]{2,}?)(ЕООД|ЕАД|ООД)$/.exec(last)
  if (glued && words.length > 1 && !FORM_SET.has(last)) words.splice(-1, 1, glued[1], glued[2])
  else if (CUT_FORMS[last] && words.length > 2 && words.join(' ').length >= 24) words.splice(-1, 1, CUT_FORMS[last])
  return words.join(' ')
}

/** The legal form in a normalised name, or null. */
export function legalForm(normalized: string): string | null {
  return normalized.split(' ').find((w) => FORM_SET.has(w)) ?? null
}

/**
 * The key that identifies a payee name: the normalised name without its legal form, then "|form".
 * The form may be written first or last: "ООД ФАРМА ЮНИЪН" and "ФАРМА ЮНИЪН ООД" → "ФАРМА ЮНИЪН|ООД".
 */
export function nameKey(name: string): string {
  const normalized = normalizeName(name)
  const form = legalForm(normalized)
  const core = normalized.split(' ').filter((w) => !FORM_SET.has(w)).join(' ')
  return form ? `${core}|${form}` : core
}

export const keyCore = (key: string) => key.split('|')[0]
export const keyForm = (key: string) => key.split('|')[1] ?? null

// ---------- classes ----------

export type PayeeClass = 'company' | 'nonprofit' | 'public' | 'person' | 'other'

/** Whole words (or, with a trailing "*", the start of a word) anywhere in a name core. */
const words = (list: string) => new RegExp(`(^| )(${list.replace(/\*/g, '\\p{L}*').replace(/\s*\n\s*/g, '')})(?= |$)`, 'u')

/** Organisations that would otherwise look like companies: hospitals of the Military Medical Academy, the central bank. */
const PUBLIC_FIRST = words('ВМА|ВОЕННОМЕДИЦИНСКА|МВР|БНБ|БЪЛГАРСКА НАРОДНА БАНКА|ДП|ДЪРЖАВНО ПРЕДПРИЯТИЕ|ВУ|ВИСШЕ УЧИЛИЩЕ|УНИБИТ')

/** Companies whose legal form the payer did not write: hospitals and practices, posts, banks, insurers, utilities, consortia, foreign forms. */
const COMPANY = words(`
  МБАЛ|УМБАЛ|УМБАЛСМ|СБАЛ*|СБАГАЛ|СБПФЗ*|СБДПЛР|СБР|МОБАЛ|ДКЦ|ДЦ|МЦ|МДЦ|СМДЛ|МДЛ|ЦПЗ|КОЦ|ЦКВЗ|МЕДИЦИНСКИ ЦЕНТЪР|ДИАГНОСТИЧНО*|
  АИППМП|АИПСМП|АПМП|АИПДП|АИППДП|АИПППДМ|ИППДП|ИПСМП|ИППМП|ГППМП|ГППДП|АПМПДМ|АСМП|АИСМП|АИПСИМП|АИППИМП|ИП|ГП|ДЕНТАЛ*|АПТЕК*|
  ПОЩИ|ПОЩЕНСКА|ОПС|БАНКА|БАНК|БУЛБАНК|ЮРОБАНК|РАЙФАЙЗЕНБАНК|ОББ|ЦКБ|ЗАСТРАХОВА*|ИНШУРЪНС|АЛИАНЦ|БУЛСТРАД|ДЗИ|ЕВРОИНС|ДЖЕНЕРАЛИ|
  ТОПЛОФИКАЦИЯ|ЕЛЕКТРОСНАБДЯВАНЕ|ЕЛЕКТРОРАЗПРЕД*|ЕЛЕКТРОХОЛД|ЕНЕРГО ПРО|ЕВН|ЧЕЗ|ОВЕРГАЗ|БУЛГАРГАЗ|ЕНЕРГИЙНА БОРСА|ВИК|В И К|ВОДОСНАБДЯВАНЕ|
  ВИВАКОМ|ЙЕТТЕЛ|ТЕЛЕНОР|БТК|А1|ПЕТРОЛ|ЛУКОЙЛ|ШЕЛ|ОМВ|ХОЛДИНГ|ТРЕЙДИНГ|ГРУП|КОМПАНИЯ|ИНЖЕНЕРИНГ|КОНСОРЦИУМ|КОНСОРЦ|КОНС|ОБЕДИНЕНИЕ|ОБЕД|
  ЗАЛОЖНА КЪЩА|АДВОКАТСКО ДРУЖЕСТВО|АДВ ДРУЖ|АДВ ДР|ЛТД|ИНК|КОРП|ГМБХ|АГ|СРЛ|С Р Л|СПА|С П А|А С|С А|Б В|Н В|АТТКД|КЛОН|
  LTD|LIMITED|LLC|INC|CORP|CORPORATION|PLC|GMBH|AG|SA|SAS|SARL|SRL|SPA|BV|NV|OY|AB|ASA|KFT|SRO|SE|APS|OOO|ООО|
  ЗАД|ЗЕАД|ЗД|ЗК|ЗПАД|КООПЕРАЦИЯ|ЗКПУ|ЗПК|ТПК|ПК`)

/** Associations, foundations, community centres, sports clubs and federations, churches, parties. */
const NONPROFIT = words(`
  СДРУЖЕНИЕ|СНЦ|ЮЛНЦ|ФОНДАЦИЯ|ЧИТАЛИЩЕ|НЧ|НАРОДНО ЧИТАЛИЩЕ|АСОЦИАЦИЯ|СЪЮЗ|ФЕДЕРАЦИЯ|КОНФЕДЕРАЦИЯ|БФ|КЛУБ|СК|ФК|ПФК|ОФК|БК|ВК|ХК|ТК|КК|
  ЛРД|ЛРС|СЛРБ|НЛРС|КАМАРА|ЦЪРКВА|ХРАМ|МАНАСТИР|ЕПАРХИЯ|МЮФТИЙСТВО|ПАТРИАРШИЯ|СИНОД|ИЗПОВЕДАНИЕ|ПАРТИЯ|ПП|КОАЛИЦИЯ|БЧК|ЧЕРВЕН КРЪСТ|
  ДРУЖЕСТВО|ДВИЖЕНИЕ|ЛИГА|НСОРБ|КНСБ|ПОДКРЕПА|СИНДИКАТ|ОБИТЕЛ`)

/** A metropolis of the church ("СОФИЙСКА МИТРОПОЛИЯ"), not the town of Долна Митрополия. */
const CHURCH = /СКА МИТРОПОЛИЯ( |$)|^МИТРОПОЛИЯ /

/**
 * Public bodies: municipalities, ministries, agencies, the social security and health funds and their
 * units, courts and prosecutors, schools, kindergartens, universities, state cultural institutes,
 * regional administrations and directorates, the armed forces, state enterprises, budget accounts.
 */
const PUBLIC = words(`
  ОБЩИНА|ОБЩИНСКА|СТОЛИЧНА ОБЩИНА|КМЕТСТВО|РАЙОН|МИНИСТЕРСТВО|М ВО|МИНИСТЕРСКИ СЪВЕТ|НАРОДНО СЪБРАНИЕ|ПРЕЗИДЕНТ|
  АГЕНЦИЯ|ИА|ДА|НАП|НОИ|НЗОК|РЗОК|РЗИ|РИОСВ|ОДБХ|БАБХ|АПИ|АСП|АЗ|ДСП|РДСП|ДБТ|ОДБТ|ДФЗ|ДФ ЗЕМЕДЕЛИЕ|ДЪРЖАВЕН ФОНД|
  ДИРЕКЦИЯ|ГД|ГЛАВНА ДИРЕКЦИЯ|ОБЛАСТНА|ОБЛАСТ|ОБЛ|РЕГИОНАЛНА|РЕГИОНАЛЕН|ОДМВР|СДВР|РДГ|РДПБЗН|ГДНП|ГДБОП|ГДГП|ГДПБЗН|
  СЪД|ПРОКУРАТУРА|ВСС|ВКС|ВАС|ЗАТВОР|ВОЕННО ФОРМИРОВАНИЕ|ПОДЕЛЕНИЕ|ЖЕЛЕЗОПЪТНА СЕКЦИЯ|
  УЧИЛИЩЕ|ГИМНАЗИЯ|ЛИЦЕЙ|ДЕТСКА ГРАДИНА|ЯСЛА|ДЕТСКИ ЯСЛИ|ОУ|СУ|НУ|ОБУ|СОУ|ПГ|ПМГ|ПГИ|ДГ|ЦДГ|ОДЗ|ЦПЛР|ЦСОП|ЦСПП|РУО|РЦПППО|
  УНИВЕРСИТЕТ|У ТЕТ|УНИВ|ФАКУЛТЕТ|ВИСШЕ|АКАДЕМИЯ|БАН|ИНСТИТУТ|УНСС|ПУ|ШУ|ВТУ|ЮЗУ|ТУ|МУ|ЛТУ|ХТМУ|УХТ|АУ|УАСГ|АМТИИ|НАТФИЗ|НМА|НХА|НСА|
  ВВМУ|ВВВУ|НВУ|НИМХ|НССЗ|МУЗЕЙ|ГАЛЕРИЯ|БИБЛИОТЕКА|ТЕАТЪР|ОПЕРА|ФИЛХАРМОНИЯ|ДРАМАТИЧЕН|КУКЛЕН|ЦЕНТЪР ЗА СПЕШНА|ЦСМП|НЦОЗА|ДОМ ЗА|
  КОМИСИЯ|ИНСПЕКТОРАТ|ИНСПЕКЦИЯ|ОМБУДСМАН|СМЕТНА ПАЛАТА|ДГС|ДЛС|БЮДЖЕТ|ЦЕНТРАЛЕН БЮДЖЕТ|РЕПУБЛИКАНСКИ БЮДЖЕТ|БНТ|БНР|БТА|
  ДЪРЖАВЕН ВЕСТНИК|НАЦИОНАЛЕН ФОНД|УЧИТЕЛСКИ ПЕНСИОНЕН ФОНД|ФОНД СЕЛС|ФСЕС|ФСЕЛС|ПУДООС|НАЦИОНАЛНА|НАЦИОНАЛЕН|ДЪРЖАВНА|ДЪРЖАВЕН`)

/** Bulgarian surname endings: "ИВАНОВ", "ПЕТРОВА", "ЛЕВСКИ". */
const SURNAME = /^[А-Я]{2,}(ОВ|ЕВ|ОВА|ЕВА|СКИ|СКА|ЦКИ|ЦКА)$/

/** Given names, learnt from the names of sole traders (see learnGivenNames). */
const GIVEN_NAMES = new Set<string>()

/**
 * Learns given names from payees whose names carry their owner's: sole traders ("ЕТ ЖЕКО ЖЕКОВ")
 * and doctors' practices ("АИППМП Д-Р РОСИЦА ВЕЛЕВА"). A name counts when at least two payees bear it.
 */
export function learnGivenNames(normalizedNames: Iterable<string>): number {
  const counts = new Map<string, number>()
  for (const name of normalizedNames) {
    const m = /(?:^ЕТ|(?:^| )Д Р|(?:^| )ДР) ([А-Я]{3,12}) ([А-Я]{2,})( |$)/.exec(name) ?? /^([А-Я]{3,12}) ([А-Я]{2,}) ЕТ$/.exec(name)
    if (m && SURNAME.test(m[2]) && !SURNAME.test(m[1])) counts.set(m[1], (counts.get(m[1]) ?? 0) + 1)
  }
  GIVEN_NAMES.clear()
  for (const [name, n] of counts) if (n >= 2) GIVEN_NAMES.add(name)
  return GIVEN_NAMES.size
}

/** Name keys whose published spelling is a person's by the rules of scripts/extract/persons.py (see setPersonalKeys). */
const PERSONAL_KEYS = new Set<string>()

/**
 * Name keys to treat as natural persons besides those isPerson recognises itself: the extractor runs the rules the
 * EU-funds and farm-subsidy extracts use (scripts/extract/persons.py: sole traders, registered farmers, a given name
 * and a surname) over every published spelling and passes the keys of those it flags.
 */
export function setPersonalKeys(keys: Iterable<string>): number {
  PERSONAL_KEYS.clear()
  for (const key of keys) PERSONAL_KEYS.add(key)
  return PERSONAL_KEYS.size
}

/**
 * Natural persons are published as "ФИЗИЧЕСКО ЛИЦЕ" (the publisher's anonymisation); names that
 * contained a person's name show it in its place ("Д-Р ФИЗИЧЕСКО ЛИЦЕ", a doctor's practice). A name
 * that is only a person's name — a given name (learnGivenNames), then one or two surnames, and
 * nothing that marks an organisation — was left unanonymised and is treated the same way, and so is
 * every key passed to setPersonalKeys (sole traders, whose firm carries the owner's name, among them).
 * All are one group, and their payments are shown without purpose.
 */
export function isPerson(key: string): boolean {
  if (PERSONAL_KEYS.has(key) || /ФИЗИЧЕСКО ЛИЦЕ|ФИЗ ЛИЦЕ/.test(key)) return true
  if (keyForm(key)) return false
  const parts = key.split(' ')
  if (parts.length < 2 || parts.length > 3 || !GIVEN_NAMES.has(parts[0]) || !parts.slice(1).every((w) => SURNAME.test(w))) return false
  return !(COMPANY.test(key) || NONPROFIT.test(key) || PUBLIC.test(key) || PUBLIC_FIRST.test(key) || CHURCH.test(key))
}

export interface ClassSignals {
  /** Euro cents paid to accounts at the central bank (BIC BNBG…): only budget bodies and a few state companies have them. */
  bnb: number
  /** Euro cents paid with code 60 (transfers to budget and extra-budgetary accounts). */
  transfers: number
  total: number
}

/**
 * The class of a payee from its name key and how it was paid, with the rule that decided it, in
 * this order: person (anonymised, or a bare personal name); public (the Military Medical Academy,
 * the central bank, state enterprises); company (a legal form, or a name that marks one: hospitals,
 * posts, banks, utilities, consortia …); nonprofit; public (a name that marks one); public (paid
 * into a central-bank account, or mostly as transfers between budgets); other.
 */
export function classify(key: string, signals: ClassSignals): { cls: PayeeClass; rule: string } {
  if (isPerson(key)) return { cls: 'person', rule: 'person' }
  const core = keyCore(key)
  if (PUBLIC_FIRST.test(core)) return { cls: 'public', rule: 'name' }
  if (keyForm(key)) return { cls: 'company', rule: 'form' }
  if (COMPANY.test(core) || /^БП /.test(core)) return { cls: 'company', rule: 'name' }
  if (/^(ОБЩИНА|МИНИСТЕРСТВО|М ВО) /.test(core)) return { cls: 'public', rule: 'name' }
  if (NONPROFIT.test(core) || CHURCH.test(core)) return { cls: 'nonprofit', rule: 'name' }
  if (PUBLIC.test(core)) return { cls: 'public', rule: 'name' }
  if (signals.total > 0 && signals.bnb / signals.total >= 0.5) return { cls: 'public', rule: 'bnb' }
  if (signals.total > 0 && signals.transfers / signals.total >= 0.5) return { cls: 'public', rule: 'transfers' }
  return { cls: 'other', rule: 'none' }
}

// ---------- groups of spellings ----------

/**
 * Names that many different payees share — schools and kindergartens named after the same patron,
 * community centres, clubs, churches, or a bare "ОБЩИНА" — group only by account, never by name.
 */
const SHARED_NAME =
  /^(ОУ|СУ|НУ|ОБУ|СОУ|ПГ|ПМГ|ПГИ|ПГТ|ПГСС|ПГЕ|ПТГ|СПГ|ЕГ|ДГ|ЦДГ|ОДЗ|ЧДГ|НЧ|ЦПЛР|ЦСОП|СК|ФК|ПФК|ОФК|БК|ВК|ХК|ТК|КК|ЛРД|ЕНОРИЯ|ЦЪРКВА|ХРАМ|ОСНОВНО УЧИЛИЩЕ|СРЕДНО УЧИЛИЩЕ|НАЧАЛНО УЧИЛИЩЕ|ОБЕДИНЕНО УЧИЛИЩЕ|ПРОФЕСИОНАЛНА ГИМНАЗИЯ|ГИМНАЗИЯ|ДЕТСКА ГРАДИНА|ДЕТСКА ЯСЛА|ЯСЛА|НАРОДНО ЧИТАЛИЩЕ|ЧИТАЛИЩЕ|СПОРТЕН КЛУБ|ФУТБОЛЕН КЛУБ)( |$)/
const GENERIC = new Set(['', 'ОБЩИНА', 'УЧИЛИЩЕ', 'БОЛНИЦА', 'ДИРЕКЦИЯ', 'БЮДЖЕТ', 'СМЕТКА', 'ДСП', 'ДБТ', 'РЗИ', 'РЗОК', 'ОБЛАСТ', 'РАЙОН', 'КМЕТСТВО', 'ЦЕНТЪР', 'ДОМ', 'ФОНД', 'АГЕНЦИЯ'])

/** Two accounts typed with this same name belong to the same payee. */
export function mergeable(key: string): boolean {
  if (isPerson(key)) return false
  const core = keyCore(key)
  if (keyForm(key)) return core.length > 1
  return core.length > 1 && !GENERIC.has(core) && !SHARED_NAME.test(core)
}

/**
 * Words that, after an organisation's name, name one of its branches: "БЪЛГАРСКИ ПОЩИ ЕАД ОПС ДОБРИЧ",
 * "ОБЩИНА ВАРНА РАЙОН ОДЕСОС". Places are added by the caller (see groupPayees).
 */
const BRANCH_WORDS = new Set([
  'КЛОН', 'ФИЛИАЛ', 'ОФИС', 'ЦУ', 'УПРАВЛЕНИЕ', 'РУ', 'ОПС', 'ПС', 'ТП', 'ТД', 'ДИРЕКЦИЯ', 'ДИР', 'ОТДЕЛ', 'РАЙОН', 'ПОДЕЛЕНИЕ',
  'ГР', 'ГРАД', 'Г', 'С', 'СЕЛО', 'ОБЛ', 'ОБЛАСТ', 'РЕГИОН', 'РЕГИОНАЛНО', 'ЗАПАДЕН', 'ИЗТОЧЕН', 'ЮЖЕН', 'СЕВЕРЕН', 'ЮИР', 'СИР', 'СЦР', 'ЗР', 'СОФИЯ',
])

/** A short, stable, URL-safe id (base 36). Truncated, so it cannot be turned back into what it was made from. */
export function shortId(text: string, length = 8): string {
  const hex = createHash('sha1').update(text).digest('hex').slice(0, 13)
  return BigInt(`0x${hex}`).toString(36).padStart(length, '0').slice(-length)
}

export const PERSONS = 'persons'

/** What grouping needs of every distinct (name key, account) pair. */
export interface NamePair {
  key: string
  account: string
  payments: number
  cents: number
}

/**
 * Groups payee name keys into payees:
 * - every account (IBAN) is one payee, whatever names it was typed with;
 * - accounts whose most frequent name is the same mergeable key are one payee (a company with
 *   several accounts, or one account per customer); payments without an account join the payee of
 *   their name;
 * - a mergeable name joins another when it is the same without spaces ("ДП НК ЖИ", "ДП НКЖИ"),
 *   the same without its legal form (when only one form exists), cut short at 20 letters or more,
 *   or the other's name followed by a branch or a place (`places`: upper-case place names);
 * - natural persons are one group.
 * Returns the group of each (name key, account) pair.
 */
export function groupPayees(pairs: NamePair[], places: Iterable<string> = []): (key: string, account: string) => string {
  const parent = new Map<string, string>()
  const find = (x: string): string => {
    let root = x
    while (parent.has(root) && parent.get(root) !== root) root = parent.get(root)!
    let node = x
    while (node !== root) {
      const next = parent.get(node)!
      parent.set(node, root)
      node = next
    }
    if (!parent.has(root)) parent.set(root, root)
    return root
  }
  // The root is the alphabetically first node, so the groups do not depend on the order of the pairs.
  const union = (a: string, b: string) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra < rb ? rb : ra, ra < rb ? ra : rb)
  }

  // The dominant name of every account: most payments, then most money, then alphabetical.
  const byAccount = new Map<string, NamePair[]>()
  for (const p of pairs) {
    if (!p.account || isPerson(p.key)) continue
    const list = byAccount.get(p.account)
    if (list) list.push(p)
    else byAccount.set(p.account, [p])
  }
  const dominant = new Map<string, string>()
  for (const [account, list] of byAccount) {
    const best = [...list].sort((a, b) => b.payments - a.payments || b.cents - a.cents || (a.key < b.key ? -1 : 1))[0]
    dominant.set(account, best.key)
    union(`A:${account}`, mergeable(best.key) ? `K:${best.key}` : `A:${account}`)
  }

  const keys = new Set<string>()
  for (const p of pairs) if (mergeable(p.key) && (!p.account || dominant.get(p.account) === p.key)) keys.add(p.key)

  // The same name without spaces, with a compatible form.
  const compact = new Map<string, string>()
  for (const key of [...keys].sort()) {
    const c = `${keyCore(key).replace(/ /g, '')}|${keyForm(key) ?? ''}`
    const seen = compact.get(c)
    if (seen) union(`K:${key}`, `K:${seen}`)
    else compact.set(c, key)
  }

  // Cut-short names and names without their form join the one longer name they begin. Keys that
  // begin with a core are next to each other when sorted by core; longer ones are merged first.
  const byCore = (a: string, b: string) => (keyCore(a) < keyCore(b) ? -1 : keyCore(a) > keyCore(b) ? 1 : a < b ? -1 : a > b ? 1 : 0)
  const sorted = [...keys].sort(byCore)
  for (let i = sorted.length - 1; i >= 0; i--) {
    const key = sorted[i]
    const core = keyCore(key)
    const form = keyForm(key)
    const longer: string[] = []
    for (let j = i + 1; j < sorted.length && keyCore(sorted[j]).startsWith(core); j++) {
      if (core.length < 20 && keyCore(sorted[j]) !== core) break
      if (form === null || keyForm(sorted[j]) === form) longer.push(sorted[j])
    }
    if (!longer.length) continue
    const sameCore = longer.filter((other) => keyCore(other) === core)
    const roots = new Set(longer.map((o) => find(`K:${o}`)))
    const target = form === null && sameCore.length === 1 ? sameCore[0] : core.length >= 20 && roots.size === 1 ? longer[0] : null
    if (target) union(`K:${key}`, `K:${target}`)
  }

  // Branches: the name of a payee of at least two words and ten letters, then a branch word or a place.
  const branchWords = new Set([...BRANCH_WORDS, ...places])
  const byCoreForms = new Map<string, string[]>()
  for (const key of keys) {
    const list = byCoreForms.get(keyCore(key))
    if (list) list.push(key)
    else byCoreForms.set(keyCore(key), [key])
  }
  for (const key of sorted) {
    const parts = keyCore(key).split(' ')
    const form = keyForm(key)
    for (let n = parts.length - 1; n >= 2; n--) {
      const head = parts.slice(0, n).join(' ')
      if (head.length < 10 || !branchWords.has(parts[n])) continue
      const candidates = (byCoreForms.get(head) ?? []).filter((k) => (form === null ? true : keyForm(k) === form))
      if (new Set(candidates.map((k) => find(`K:${k}`))).size === 1) {
        union(`K:${key}`, `K:${candidates[0]}`)
        break
      }
    }
  }

  return (key: string, account: string): string => {
    if (isPerson(key)) return PERSONS
    if (account && dominant.has(account)) return find(`A:${account}`)
    return mergeable(key) ? find(`K:${key}`) : `N:${key}`
  }
}

// ---------- payer units ----------

/** A payer unit's name compared across spellings (FIN_NAME): upper case, no quotes, punctuation or extra spaces. */
export const unitKey = (name: string) =>
  fixCyrillic(name.normalize('NFC').toLocaleUpperCase('bg-BG'))
    .replace(/[„“”"'«»`.,;:()\-–—/\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
