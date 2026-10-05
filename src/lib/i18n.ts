import { createContext, useContext } from 'react'
import type { Lang, LocalizedText } from './types'

const STRINGS = {
  appName: { bg: 'Бюджетът на България', en: "Bulgaria's Budget" },
  tagline: {
    bg: 'Накъде отиват публичните пари — до най-подробното ниво, което държавата публикува',
    en: 'Where public money goes — down to the finest level the state publishes',
  },
  navExplore: { bg: 'Разходи', en: 'Spending' },
  navCompare: { bg: 'Сравнение', en: 'Compare' },
  navLists: { bg: 'Списъци', en: 'Lists' },
  navMe: { bg: 'Моите пари', en: 'My money' },
  navClip: { bg: 'Клип', en: 'Clip' },
  navAbout: { bg: 'За данните', en: 'About' },
  mainNav: { bg: 'Основно меню', en: 'Main' },
  breadcrumb: { bg: 'Пътека', en: 'Breadcrumb' },
  switchLang: { bg: 'English', en: 'Български' },
  switchLangShort: { bg: 'EN', en: 'БГ' },
  themeLight: { bg: 'Светла тема', en: 'Light theme' },
  themeDark: { bg: 'Тъмна тема', en: 'Dark theme' },

  dataset: { bg: 'Данни', en: 'Data' },
  year: { bg: 'Година', en: 'Year' },
  version: { bg: 'Версия', en: 'Version' },
  breakdown: { bg: 'Разбивка', en: 'Breakdown' },
  show: { bg: 'Покажи', en: 'Show' },
  modeTotal: { bg: 'Общо', en: 'Total' },
  modePerPerson: { bg: 'На човек', en: 'Per person' },
  modeGdp: { bg: '% от БВП', en: '% of GDP' },
  modeGdpHint: {
    bg: 'Сумите като дял от брутния вътрешен продукт за годината — за сравнение между години',
    en: 'Amounts as a share of the year’s gross domestic product — to compare years',
  },
  ofGdp: { bg: 'от БВП', en: 'of GDP' },
  inTotal: { bg: 'общо', en: 'in total' },
  convertedFromLeva: { bg: 'превърнато от лева', en: 'converted from leva' },
  trendTitle: { bg: 'През годините', en: 'Over the years' },
  trendLabel: { bg: 'Стойността на категорията по години', en: 'The category’s value by year' },
  trendPlan: { bg: 'План / прогноза', en: 'Plan / forecast' },
  trendActual: { bg: 'Отчет', en: 'Actual' },
  ofPlan: { bg: '{pct} от плана', en: '{pct} of plan' },
  trendRateHint: { bg: '% от плана', en: '% of plan' },
  forecastShort: { bg: 'прогн.', en: 'fcst' },
  noData: { bg: 'няма данни', en: 'no data' },
  compareAll: { bg: 'Сравни всички', en: 'Compare all' },
  modeMine: { bg: 'От моите данъци', en: 'From my taxes' },
  modeMineHint: {
    bg: 'Попълни „Моите пари“, за да видиш своя дял',
    en: 'Fill in “My money” to see your share',
  },
  searchPlaceholder: {
    bg: 'Търси категория — напр. болници, пенсии, отбрана',
    en: 'Search a category — e.g. hospitals, pensions, defence',
  },
  searchLabel: { bg: 'Търсене на категория', en: 'Search a category' },
  searchEmpty: { bg: 'Няма съвпадения', en: 'No matches' },

  ofAll: { bg: 'от всички разходи', en: 'of all spending' },
  clipOfAll: { bg: 'от всички публични разходи', en: 'of all public spending' },
  partialNote: {
    bg: 'Тези данни обхващат част от публичните разходи. Процентите „от всички разходи“ са спрямо всички публични разходи за годината ({total}).',
    en: 'This dataset covers part of public spending. Shares “of all spending” are relative to all public spending in the year ({total}).',
  },
  ofParent: { bg: 'от „{parent}“', en: 'of “{parent}”' },
  perPersonYear: { bg: 'на човек годишно', en: 'per person a year' },
  perResident: { bg: 'на жител на {place} годишно', en: 'per resident of {place} a year' },
  perResidentShort: { bg: 'на жител годишно', en: 'per resident a year' },
  perDayCountry: { bg: 'на ден за цялата страна', en: 'a day for the whole country' },
  fromMyTaxesYear: { bg: 'от твоите данъци за {year} г.', en: 'of your {year} taxes' },
  perMonth: { bg: 'на месец', en: 'a month' },
  makeClip: { bg: 'Направи клип', en: 'Make a clip' },
  copyLink: { bg: 'Копирай връзка', en: 'Copy link' },
  copied: { bg: 'Копирано', en: 'Copied' },
  up: { bg: 'Нагоре', en: 'Up' },
  backTo: { bg: 'Назад към „{name}“', en: 'Back to “{name}”' },
  categories: { bg: '{n} подкатегории', en: '{n} subcategories' },
  colCategory: { bg: 'Категория', en: 'Category' },
  colAmount: { bg: 'Сума', en: 'Amount' },
  colShare: { bg: 'Дял', en: 'Share' },
  openDetails: { bg: 'Натисни за разбивка', en: 'Click for breakdown' },
  noDeeper: {
    bg: 'По-подробна публична разбивка няма.',
    en: 'No finer public breakdown is available.',
  },
  groupedOther: {
    bg: 'Сивото „Други“ събира малките категории под 1,5%.',
    en: 'Grey “Other” groups the small categories under 1.5%.',
  },
  level: { bg: 'Ниво', en: 'Level' },
  source: { bg: 'Източник', en: 'Source' },
  loading: { bg: 'Зареждане…', en: 'Loading…' },
  loadError: { bg: 'Данните не можаха да се заредят.', en: 'The data could not be loaded.' },
  chartLabel: { bg: 'Кръгова диаграма на разходите за „{name}“', en: 'Donut chart of spending on “{name}”' },
  sliceLabel: { bg: '{name}: {amount}, {share}', en: '{name}: {amount}, {share}' },

  clipTitle: { bg: 'Клип за социалните мрежи', en: 'Clip for social media' },
  clipIntro: {
    bg: 'Избери категория — клипът тръгва от всички разходи и „влиза“ ниво по ниво до нея. Изтегли MP4 и го качи в TikTok, Instagram, Facebook или YouTube.',
    en: 'Pick a category — the clip starts from all spending and zooms in level by level until it reaches it. Download the MP4 and post it on TikTok, Instagram, Facebook or YouTube.',
  },
  clipWhat: { bg: 'Какво да покаже', en: 'What to show' },
  clipSearch: { bg: 'Напиши категория — напр. болници, полиция, пенсии', en: 'Type a category — e.g. hospitals, police, pensions' },
  clipDeeper: { bg: 'Още по-надолу', en: 'Go deeper' },
  clipFormat: { bg: 'Формат', en: 'Format' },
  fmtVertical: { bg: '9:16 Reels · TikTok', en: '9:16 Reels · TikTok' },
  fmtSquare: { bg: '1:1 Пост', en: '1:1 Post' },
  fmtWide: { bg: '16:9 YouTube', en: '16:9 YouTube' },
  clipStyle: { bg: 'Стил', en: 'Style' },
  clipTheme: { bg: 'Тема', en: 'Theme' },
  themeDarkShort: { bg: 'Тъмна', en: 'Dark' },
  themeLightShort: { bg: 'Светла', en: 'Light' },
  clipSpeed: { bg: 'Темпо', en: 'Pace' },
  speedFast: { bg: 'Бързо', en: 'Fast' },
  speedNormal: { bg: 'Нормално', en: 'Normal' },
  speedSlow: { bg: 'Бавно', en: 'Slow' },
  clipLanguage: { bg: 'Език', en: 'Language' },
  clipHeadline: { bg: 'Заглавие', en: 'Headline' },
  clipHeadlineAuto: { bg: 'Автоматично заглавие', en: 'Automatic headline' },
  clipPerPerson: { bg: 'Покажи сумата на човек', en: 'Show the amount per person' },
  clipMine: { bg: 'Покажи моя дял от „Моите пари“', en: 'Show my share from “My money”' },
  clipMineMissing: { bg: 'Попълни „Моите пари“, за да добавиш своя дял.', en: 'Fill in “My money” to add your share.' },
  clipExport: { bg: 'Създай MP4', en: 'Create MP4' },
  clipExporting: { bg: 'Създаване на видеото… {pct}', en: 'Rendering the video… {pct}' },
  clipCancel: { bg: 'Отказ', en: 'Cancel' },
  clipReady: { bg: 'Готово — {size}, {duration} сек.', en: 'Ready — {size}, {duration} s' },
  clipDownload: { bg: 'Изтегли видеото', en: 'Download video' },
  clipShare: { bg: 'Сподели…', en: 'Share…' },
  clipUnsupported: {
    bg: 'Този браузър не може да създава видео. Опитай с Chrome, Edge или Safari 17+.',
    en: "This browser can't create video. Try Chrome, Edge or Safari 17+.",
  },
  clipError: { bg: 'Видеото не можа да се създаде: {msg}', en: 'The video could not be created: {msg}' },
  clipCodecNote: {
    bg: 'Браузърът няма H.264 енкодер, затова видеото е в {codec}. Ако мрежата го откаже, опитай с Chrome.',
    en: 'This browser has no H.264 encoder, so the video uses {codec}. If a platform rejects it, try Chrome.',
  },
  clipPlay: { bg: 'Пусни', en: 'Play' },
  clipPause: { bg: 'Пауза', en: 'Pause' },
  clipReplay: { bg: 'Отначало', en: 'Replay' },
  clipSeek: { bg: 'Позиция във видеото', en: 'Position in the video' },
  clipPreview: { bg: 'Преглед на клипа', en: 'Clip preview' },
  clipSummary: { bg: '{duration} сек. · {w}×{h} · 30 кадъра/сек.', en: '{duration} s · {w}×{h} · 30 fps' },
  clipCaption: { bg: 'Текст за публикацията', en: 'Post caption' },
  clipPoster: { bg: 'Свали картинка (PNG)', en: 'Download image (PNG)' },
  clipCopyCaption: { bg: 'Копирай текста', en: 'Copy caption' },
} satisfies Record<string, LocalizedText>

export type StringKey = keyof typeof STRINGS

export function translate(lang: Lang, key: StringKey, vars?: Record<string, string | number>): string {
  let text: string = STRINGS[key][lang]
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v))
  return text
}

export const LangContext = createContext<Lang>('bg')

export function useLang(): Lang {
  return useContext(LangContext)
}

export function useT() {
  const lang = useLang()
  return (key: StringKey, vars?: Record<string, string | number>) => translate(lang, key, vars)
}
