import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import {
  classify,
  euroCents,
  groupPayees,
  isPerson,
  learnGivenNames,
  maskIds,
  mentionsId,
  mergeable,
  nameKey,
  normalizeName,
  parsePayment,
  PERSONS,
  quarterOf,
  setPersonalKeys,
  shortId,
  unitKey,
  unmaskedIds,
  type NamePair,
} from '../../../scripts/lib/sebra.ts'

const HASH = 'a'.repeat(64)
/** A row in the published order of the 17 columns. */
const row = (over: Partial<Record<string, string>> = {}) => {
  const r = {
    date: '02.04.2026', name: 'ХЕМУСХОТЕЛС АД', acc: 'BG19BUIN95611000648772', bic: 'BUINBGSF', fin: '0010000008', finName: 'Народно събрание',
    amount: '17265.6', currency: 'EUR', r1: 'АВАНСОВО ПЛАЩАНЕ', r2: 'ПРОФ.Ф.226422/01.04.2026', regDate: '02.04.2026', regNo: 'E81014', code: '10',
    org: 'Народно събрание', primary: 'Народно събрание', primaryCode: '001', hash: HASH, ...over,
  }
  return [r.date, r.name, r.acc, r.bic, r.fin, r.finName, r.amount, r.currency, r.r1, r.r2, r.regDate, r.regNo, r.code, r.org, r.primary, r.primaryCode, r.hash]
}

describe('reading the published rows', () => {
  it('masks personal numbers in the payee’s and the payer’s names and in the purpose as it reads them', () => {
    const p = parsePayment(row({ name: 'ЕГН 1591000000 НАЛИЧНОСТИ', finName: 'КАСА ЕГН/ЕИК 8001011234', r2: 'ЕГН 4921000000' }), 'EUR')
    expect([p.name, p.unitName, p.reason]).toEqual(['ЕГН ********** НАЛИЧНОСТИ', 'КАСА ЕГН/ЕИК **********', 'АВАНСОВО ПЛАЩАНЕ · ЕГН **********'])
  })

  it('reads a row in the published order', () => {
    expect(parsePayment(row(), 'EUR')).toEqual({
      date: '2026-04-02',
      name: 'ХЕМУСХОТЕЛС АД',
      account: 'BG19BUIN95611000648772',
      bic: 'BUINBGSF',
      unitCode: '0010000008',
      unitName: 'Народно събрание',
      system: '001',
      amount: 17265.6,
      currency: 'EUR',
      code: '10',
      reason: 'АВАНСОВО ПЛАЩАНЕ · ПРОФ.Ф.226422/01.04.2026',
      repaired: false,
    })
  })

  it('takes the system from the Q3 2024 layout, and pads unit codes that lost their zeros', () => {
    // ORGANIZATION empty, PRIMARY_ORGANIZATION = the code without zeros, PRIMARY_ORG_CODE = the hash.
    const p = parsePayment(row({ fin: '172660008', org: '', primary: '17', primaryCode: HASH, hash: '' }), 'BGN')
    expect(p).toMatchObject({ system: '017', unitCode: '0172660008', repaired: false })
  })

  it('realigns a purpose split by commas, and takes the system from the unit code when it was cut off', () => {
    const f = ['19.08.2024', 'ЕНЕРГО ПРО ПРОДАЖБИ АД', 'BG80UNCR70001523953311', 'UNCRBGSF', '30010192', 'ОБЛАСТ СИЛИСТРА', '7467.79', 'BGN',
      '35875449', '353877484', '353877484', '70', '73', 'КЛ.7900002109 7900000540', '19.08.2024', '0299800Y0201', '10']
    expect(parsePayment(f, 'BGN')).toMatchObject({ code: '10', system: '003', unitCode: '0030010192', amount: 7467.79, repaired: true, reason: '35875449, 353877484, 353877484, 70, 73, КЛ.7900002109 7900000540' })
  })

  it('realigns an empty column after the name, a missing currency and an extra column before the registration date', () => {
    const extra = ['15.10.2024', 'АД.Д.СПАСОВАНГЕЛОВТОМОВ', '', 'BG33BPBI79401088549401', 'BPBIBGSF', '**********', 'АГКК', '9060', 'BGN', 'ДД 44/2023Г.', 'Ф.0000000057/07102024',
      '15.10.2024', 'E00096', '10', '', 'BPB', HASH]
    expect(parsePayment(extra, 'BGN')).toMatchObject({ name: 'АД.Д.СПАСОВАНГЕЛОВТОМОВ', account: 'BG33BPBI79401088549401', unitCode: '', unitName: 'АГКК', amount: 9060, system: '', code: '10' })
    const noCurrency = ['23.12.2022', 'УМБАЛСМ "Н.И.ПИРОГОВ"ЕАД', 'BG66STSA93000028788890', 'STSABGSF', '0560000002', 'Национ.здравноосигур.каса', '7320', 'ФИЗИЧЕСКО ЛИЦЕ',
      '1222 122295000023070011222', '22.12.2022', 'E04962', '40', 'НЗОК-ЦУ', 'НЗОК', '056', HASH]
    expect(parsePayment(noCurrency, 'BGN')).toMatchObject({ currency: 'BGN', amount: 7320, code: '40', system: '056' })
    const shifted = ['03.12.2024', 'ЕТ ЛОРИ-СИЛВИЯ СИМЕОНОВА', 'BG83UBBS81551025370410', 'UBBSBGSF', '**********', '4 Основно училище Проф.Джон Атана', '17672.4', 'BGN',
      '000667798 ЗАКУСКИФ0000001955/2911', '', '', '03.12.2024', '32', '10', '4 Основно училище "Проф.Джон Атанасов"', 'СТОЛИЧНА ОБЩИНА', '422']
    // "32" is the registration number, not the payment code.
    expect(parsePayment(shifted, 'BGN')).toMatchObject({ code: '10', system: '422', repaired: true })
  })

  it('keeps a row cut off before its payment code, with no code', () => {
    const cut = ['22.07.2024', 'ИПА', 'BG15BNBG96613100118901', 'BNBGBGSD', '210010003', 'ДНСК  2003', '7100', 'BGN', 'ПР.2', 'ПР.4', 'ПР.7', 'ДК.9', 'ДК.12', 'РП.2', 'ЕИ.2', 'ЕИ.3', 'РП.8']
    expect(parsePayment(cut, 'BGN')).toMatchObject({ code: '', system: '021', repaired: true })
  })

  it('converts leva at the fixed rate, dates to quarters, and masks personal numbers and accounts', () => {
    expect(euroCents(200_000_000, 'BGN')).toBe(10_225_837_624)
    expect(euroCents(17265.6, 'EUR')).toBe(1_726_560)
    expect(quarterOf('2024-07-15')).toBe('2024Q3')
    expect(quarterOf('2026-12-31')).toBe('2026Q4')
    expect(maskIds('РСР · ЕГН 1328036250')).toBe('РСР · ЕГН **********')
    // Within a few characters of the label, also a second number; a 9-digit ЕИК (company id) stays.
    expect(maskIds('ЕГН/ЕИК 8001011234')).toBe('ЕГН/ЕИК **********')
    expect(maskIds('egn: 8001011234')).toBe('egn: **********')
    expect(maskIds('ЕГН 1591000000 4921000000 НАЛИЧНОСТИ')).toBe('ЕГН ********** ********** НАЛИЧНОСТИ')
    expect(maskIds('ЕГН/ЕИК 123456789')).toBe('ЕГН/ЕИК 123456789')
    expect(maskIds('ЕИК 1234567890')).toBe('ЕИК 1234567890')
    // Spellings that mention an identity number are never a payee's main name or alias.
    expect(mentionsId('ЕГН ********** НАЛИЧНОСТИ')).toBe(true)
    expect(mentionsId('ЕГН 3588966 НАЛИЧНОСТИ')).toBe(true)
    expect(mentionsId('ПГ ТУРИЗЪМ БАНКЯ')).toBe(false)
    expect(mentionsId('СЕГНЕР ООД')).toBe(false)
    expect(unmaskedIds(maskIds('ЛНЧ №1000000000 и ЕГН 8001011234'))).toEqual([])
    expect(unmaskedIds('ЕГН/ЕИК 8001011234')).toHaveLength(1)
    expect(maskIds('ЗАКРИТ IBAN.BG49UBBS81551089001179')).toBe('ЗАКРИТ IBAN.[IBAN]')
    // EU project codes look alike but are kept.
    expect(maskIds('BG16RFOP001-1.001-0002-C1')).toBe('BG16RFOP001-1.001-0002-C1')
  })
})

describe('payee names', () => {
  it('spells legal forms one way, wherever they are written', () => {
    expect(nameKey('ООД „Фарма Юнион“')).toBe('ФАРМА ЮНИОН|ООД')
    expect(nameKey('ФАРМА ЮНИОН О.О.Д.')).toBe('ФАРМА ЮНИОН|ООД')
    expect(nameKey('Фарма Юнион дружество с ограничена отговорност')).toBe('ФАРМА ЮНИОН|ООД')
    expect(nameKey('"ЕВН БЪЛГАРИЯ ЕЛЕКТРОСНАБДЯВАНЕ" EAD')).toBe('ЕВН БЪЛГАРИЯ ЕЛЕКТРОСНАБДЯВАНЕ|ЕАД')
    // Latin look-alike letters, HTML debris, a form glued to the last word or cut short at the field's end.
    expect(normalizeName('2602006 OСНОВНО УЧИЛИЩЕ &КУОТ')).toBe('2602006 ОСНОВНО УЧИЛИЩЕ')
    expect(nameKey('ИНФОРМАЦИОННО ОБСЛУЖВАНЕЕАД')).toBe('ИНФОРМАЦИОННО ОБСЛУЖВАНЕ|ЕАД')
    expect(nameKey('ХЕМУС-77ЕООД')).toBe('ХЕМУС 77|ЕООД')
    expect(nameKey('МБАЛ ЮГОЗАПАДНА БОЛНИЦА ОО')).toBe('МБАЛ ЮГОЗАПАДНА БОЛНИЦА|ООД')
    // A short name ending in "ЕА" is not a cut form.
    expect(nameKey('КОРЕА')).toBe('КОРЕА')
  })

  it('compares payer units without case, quotes or extra spaces', () => {
    expect(unitKey('МГУ "Св.Иван Рилски"')).toBe(unitKey('МГУ Св. Иван   Рилски'))
  })

  it('treats anonymised and plain personal names as natural persons', () => {
    learnGivenNames(['ЕТ ИВАН ПЕТРОВ', 'АИППМП Д Р ИВАН ГЕОРГИЕВ', 'ЕТ ГЕРГАНА ДИМИТРОВА', 'ЕТ ГЕРГАНА ИВАНОВА'])
    expect(isPerson(nameKey('ФИЗИЧЕСКО ЛИЦЕ'))).toBe(true)
    expect(isPerson(nameKey('Д-Р ФИЗИЧЕСКО ЛИЦЕ АИПП'))).toBe(true)
    expect(isPerson(nameKey('ИВАН ПЕТРОВ ИВАНОВ'))).toBe(true)
    expect(isPerson(nameKey('ГЕРГАНА ИВАНОВА'))).toBe(true)
    // Not learnt as a given name (one sole trader only), a place, a sole trader, a school.
    expect(isPerson(nameKey('СТЕФКА ИВАНОВА'))).toBe(false)
    expect(isPerson(nameKey('ОБЩ.САНДАНСКИ'))).toBe(false)
    expect(isPerson(nameKey('ЕТ ИВАН ПЕТРОВ'))).toBe(false)
    expect(isPerson(nameKey('ОУ ИВАН ВАЗОВ'))).toBe(false)
  })
})

describe('classes of payees', () => {
  const none = { bnb: 0, transfers: 0, total: 100 }
  const cls = (name: string, signals = none) => classify(nameKey(name), signals).cls
  it('reads the class from the name, the account and the payment codes', () => {
    expect(cls('ФИЗИЧЕСКО ЛИЦЕ')).toBe('person')
    expect(cls('ХЕМУС ХОТЕЛС АД')).toBe('company')
    expect(cls('МБАЛ ЦЕНТРАЛ ОНКО ХОСПИТАЛ')).toBe('company')
    expect(cls('БП РУ ЗАПАДЕН РЕГИОН')).toBe('company')
    expect(cls('ОБЛ.ПОЩЕНСКА СТАНЦИЯ РУСЕ')).toBe('company')
    expect(cls('ШКОДА ТРАНСПОРТЕЙШЪН А.С.')).toBe('company')
    expect(cls('СДРУЖЕНИЕ КРИБ')).toBe('nonprofit')
    expect(cls('ПП ГЕРБ')).toBe('nonprofit')
    expect(cls('НЧ ПРОСВЕТА 1927')).toBe('nonprofit')
    expect(cls('СОФИЙСКА МИТРОПОЛИЯ')).toBe('nonprofit')
    // A town called Долна Митрополия is not a church.
    expect(cls('ОБЩИНА ДОЛНА МИТРОПОЛИЯ')).toBe('public')
    expect(cls('ДСП ДОЛНА МИТРОПОЛИЯ')).toBe('public')
    expect(cls('ТД НА НАП ПЛОВДИВ')).toBe('public')
    expect(cls('МБАЛ ВАРНА КЪМ ВМА')).toBe('public')
    expect(cls('ДП НКЖИ')).toBe('public')
    expect(cls('ВУ ПО ТЕЛЕКОМ. И ПОЩИ')).toBe('public')
    // A legal form wins over a public-sounding word; a central-bank account or transfers decide the rest.
    expect(cls('НЕК ЕАД')).toBe('company')
    expect(cls('ЗОГРАФСКА СВЕТА ОБИТЕЛ')).toBe('nonprofit')
    expect(cls('КОНУШ АГРО')).toBe('other')
    expect(cls('МИР К3.И2 ПРОГР.ЗА ИК.ТРАН', { bnb: 80, transfers: 0, total: 100 })).toBe('public')
    expect(cls('ИЗПЪЛНИТЕЛ НА ПРОЕКТ', { bnb: 0, transfers: 60, total: 100 })).toBe('public')
  })

  it('names sole traders as a class of their own, and keeps persons in the anonymised group', () => {
    // What the extractor passes from the shared person rule: keys it leaves unnamed, and the sole traders it names.
    setPersonalKeys([nameKey('ИВАН ПЕТРОВ ИВАНОВ')], [nameKey('ЕТ ИВАН ПЕТРОВ'), nameKey('ЕТДАНИЕЛ ДОБРЕВ')])
    expect(classify(nameKey('ЕТ ИВАН ПЕТРОВ'), none)).toEqual({ cls: 'sole-trader', rule: 'form' })
    expect(classify(nameKey('ЕТДАНИЕЛ ДОБРЕВ'), none)).toEqual({ cls: 'sole-trader', rule: 'name' })
    expect(cls('ИВАН ПЕТРОВ ИВАНОВ')).toBe('person')
    // A company form typed with "ЕТ" in the middle ("САЛВИЯ- ЕТ ЕООД") is a company's name.
    expect(cls('САЛВИЯ- ЕТ ЕООД')).toBe('company')
    setPersonalKeys([])
  })
})

describe('the shared person rule (scripts/extract/persons.py) and its one option', () => {
  const rule = (names: string[], ...options: string[]) =>
    execFileSync('python3', [new URL('../../../scripts/extract/persons.py', import.meta.url).pathname, ...options], { input: names.map((n) => `${n}\n`).join('') })
      .toString('utf8')
      .split('\n')
      .slice(0, -1)

  it('leaves sole traders unnamed by default, names them for the payment lists, and never names a person', () => {
    const names = ['ЕТ ИВАН ПЕТРОВ', 'ЗП ПЕТКО ТЕЛКИЕВ', 'ФИЗИЧЕСКО ЛИЦЕ', 'ХЕМУС ООД']
    expect(rule(names)).toEqual(['sole-trader\tunnamed', 'person\tunnamed', 'person\tunnamed', '\t'])
    expect(rule(names, '--name-sole-traders')).toEqual(['sole-trader\t', 'person\tunnamed', 'person\tunnamed', '\t'])
  })
})

describe('grouping spellings into payees', () => {
  const pair = (name: string, account: string, payments = 1): NamePair => ({ key: nameKey(name), account, payments, cents: payments * 100 })

  it('joins every name typed for one account, and accounts typed with the same company name', () => {
    const pairs = [
      pair('БЪЛГАРСКИ ПОЩИ ЕАД', 'BG11CECB97901019511404', 5),
      pair('БП ЕАД ОПС ДОБРИЧ', 'BG11CECB97901019511404', 2),
      pair('ВИВАКОМ БЪЛГАРИЯ ЕАД', 'BG01UBBS00000000000001', 3),
      pair('ВИВАКОМ БЪЛГАРИЯ ЕАД', 'BG01UBBS00000000000002', 3),
      pair('Вивакомъ', 'BG01UBBS00000000000002', 1),
    ]
    const groupOf = groupPayees(pairs)
    expect(groupOf(nameKey('БП ЕАД ОПС ДОБРИЧ'), 'BG11CECB97901019511404')).toBe(groupOf(nameKey('БЪЛГАРСКИ ПОЩИ ЕАД'), 'BG11CECB97901019511404'))
    expect(groupOf(nameKey('ВИВАКОМ БЪЛГАРИЯ ЕАД'), 'BG01UBBS00000000000001')).toBe(groupOf(nameKey('ВИВАКОМ БЪЛГАРИЯ ЕАД'), 'BG01UBBS00000000000002'))
    // A payment without an account joins the payee of its name.
    expect(groupOf(nameKey('ВИВАКОМ БЪЛГАРИЯ ЕАД'), '')).toBe(groupOf(nameKey('ВИВАКОМ БЪЛГАРИЯ ЕАД'), 'BG01UBBS00000000000001'))
  })

  it('keeps apart schools and community centres that share a name, and a bare "ОБЩИНА"', () => {
    expect(mergeable(nameKey('ОУ СВ. СВ. КИРИЛ И МЕТОДИЙ'))).toBe(false)
    expect(mergeable(nameKey('НЧ ПРОСВЕТА 1927'))).toBe(false)
    expect(mergeable(nameKey('ОБЩИНА'))).toBe(false)
    expect(mergeable(nameKey('ОБЩИНА ЛОВЕЧ'))).toBe(true)
    const pairs = [pair('ОУ СВ. СВ. КИРИЛ И МЕТОДИЙ', 'BG02AAAA00000000000001'), pair('ОУ СВ. СВ. КИРИЛ И МЕТОДИЙ', 'BG02AAAA00000000000002')]
    const groupOf = groupPayees(pairs)
    expect(groupOf(pairs[0].key, pairs[0].account)).not.toBe(groupOf(pairs[1].key, pairs[1].account))
  })

  it('joins a name cut short, written without its form, without spaces or with a branch after it', () => {
    const pairs = [
      pair('ЕВН БЪЛГАРИЯ ЕЛЕКТРОСНАБДЯВАНЕ ЕАД', 'BG03AAAA00000000000001', 3),
      pair('ЕВН БЪЛГАРИЯ ЕЛЕКТРОСНАБДЯ', 'BG03AAAA00000000000002'),
      pair('ЕВН БЪЛГАРИЯ ЕЛЕКТРОСНАБДЯВАНЕ', 'BG03AAAA00000000000003'),
      pair('ДП НКЖИ', 'BG04BNBG00000000000001'),
      pair('ДП НК ЖИ', 'BG04BNBG00000000000002'),
      pair('БЪЛГАРСКИ ПОЩИ ЕАД', 'BG05AAAA00000000000001'),
      pair('БЪЛГАРСКИ ПОЩИ ЕАД ОПС ДОБРИЧ', 'BG05AAAA00000000000002'),
      // A different company that only begins the same way stays apart.
      pair('ЕНЕРГО ПРО АД', 'BG06AAAA00000000000001'),
      pair('ЕНЕРГО ПРО ПРОДАЖБИ АД', 'BG06AAAA00000000000002'),
    ]
    const groupOf = groupPayees(pairs, ['ДОБРИЧ'])
    const g = (i: number) => groupOf(pairs[i].key, pairs[i].account)
    expect(g(1)).toBe(g(0))
    expect(g(2)).toBe(g(0))
    expect(g(4)).toBe(g(3))
    expect(g(6)).toBe(g(5))
    expect(g(8)).not.toBe(g(7))
  })

  it('puts natural persons in one group', () => {
    const groupOf = groupPayees([pair('ФИЗИЧЕСКО ЛИЦЕ', '**********')])
    expect(groupOf(nameKey('ФИЗИЧЕСКО ЛИЦЕ'), '')).toBe(PERSONS)
  })

  it('makes short ids that do not depend on anything but their input', () => {
    expect(shortId('K:НЕК|ЕАД')).toBe(shortId('K:НЕК|ЕАД'))
    expect(shortId('K:НЕК|ЕАД')).toMatch(/^[0-9a-z]{8}$/)
    expect(shortId('K:НЕК|ЕАД')).not.toBe(shortId('K:НЕК|АД'))
  })
})
