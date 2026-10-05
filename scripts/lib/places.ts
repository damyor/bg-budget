// Province and municipality names: transliteration, display names and ids.

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
