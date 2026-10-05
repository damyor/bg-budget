// Names of the SEBRA primary systems (the 3-digit code: a first-level spending unit with the
// units under it, or a fund, a university, the National Fund's EU accounts …), of the payment
// codes and of the classes of payees. Ministries and agencies take the names the "Ministries"
// tree uses (scripts/lib/ministries-labels.ts); SEBRA's own names are often cut short.

import type { LocalizedText } from '../../src/lib/types.ts'
import { UNIT_CODES, UNITS } from './ministries-labels.ts'

const t = (bg: string, en: string): LocalizedText => ({ bg, en })

/** Spending units of the State Budget Act without programme codes (so not in UNIT_CODES): ЕБК codes. */
const OTHER_UNIT_CODES: Record<string, string> = { parliament: '0100', judiciary: '0600' }

/** The SEBRA system of an ЕБК organisation code: the code divided by 100 ("1500" → "015"). */
export const systemOfCode = (ebk: string) => String(Number(ebk) / 100).padStart(3, '0')

/** The spending unit (a node of the "Ministries" trees) whose ЕБК code is the system's code × 100, by unit id. */
export function unitCodes(): Record<string, string> {
  return { ...UNIT_CODES, ...OTHER_UNIT_CODES }
}

const unitName = (id: string) => {
  const found = Object.values(UNITS).find((u) => u.id === id)
  if (!found) throw new Error(`No spending unit ${id}`)
  return found.name
}

/** SEBRA systems that are ministries or agencies of the State Budget Act: system → unit id (its name). */
const UNIT_SYSTEMS: Record<string, string> = {
  '001': 'parliament', '002': 'president', '003': 'council-of-ministers', '004': 'constitutional-court', '005': 'audit-office',
  '006': 'judiciary', '010': 'mof', '011': 'mfa', '012': 'mod', '013': 'moi', '014': 'moj', '015': 'molsp', '016': 'moh', '017': 'mes',
  '018': 'moc', '019': 'moew', '021': 'mrdpw', '022': 'mafood', '023': 'motc', '024': 'moen', '025': 'moys', '032': 'dossier-commission',
  '033': 'anti-discrimination', '034': 'data-protection', '037': 'asset-forfeiture', '040': 'ombudsman', '041': 'nsi', '042': 'competition',
  '038': 'nso', '043': 'crc', '044': 'cem', '045': 'kevr', '046': 'nuclear-regulator', '047': 'fsc', '048': 'information-security', '053': 'state-reserve',
  '071': 'mot', '075': 'meg', '082': 'cik', '083': 'auditor-oversight', '084': 'state-fund-agriculture', '085': 'surveillance-oversight',
}

/** Systems that are not (or not only) one unit of the "Ministries" tree. */
const OTHER_SYSTEMS: Record<string, LocalizedText> = {
  '020': t('Министерство на икономиката и индустрията', 'Ministry of Economy and Industry'),
  '055': t('Национален осигурителен институт (държавно обществено осигуряване)', 'National Social Security Institute (state social insurance)'),
  '056': t('Национална здравноосигурителна каса', 'National Health Insurance Fund'),
  '061': t('Българска национална телевизия', 'Bulgarian National Television'),
  '062': t('Българско национално радио', 'Bulgarian National Radio'),
  '063': t('Българска телеграфна агенция', 'Bulgarian News Agency'),
  '074': t('Министерство на иновациите и растежа', 'Ministry of Innovation and Growth'),
  '119': t('ПУДООС (Предприятие за управление на дейностите по опазване на околната среда)', 'Enterprise for Management of Environmental Protection Activities (PUDOOS)'),
  '122': t('Държавен фонд „Земеделие“ — Разплащателна агенция', 'State Fund Agriculture — Paying Agency'),
  '124': t('Фонд „Сигурност на електроенергийната система“', 'Electricity System Security Fund'),
  '128': t('ДП „Държавна петролна компания“', 'State Oil Company (state enterprise)'),
  '129': t('ДП „Управление и стопанисване на язовири“', 'Dam Management (state enterprise)'),
  '133': t('Селскостопанска академия', 'Agricultural Academy'),
  '134': t('ДП „Научно-производствен център“', 'Research and Production Centre (state enterprise)'),
  '181': t('Комисия за противодействие на корупцията', 'Anti-Corruption Commission'),
  '422': t('Столична община', 'Sofia Municipality'),
  '444': t('Централен бюджет — субсидии за общини', 'Central budget — subsidies to municipalities'),
  '488': t('Централен бюджет — други трансфери за общини', 'Central budget — other transfers to municipalities'),
  '519': t('Министерство на околната среда и водите — чужди средства', 'Ministry of Environment and Water — external funds'),
  '522': t('Министерство на земеделието и храните — чужди средства', 'Ministry of Agriculture and Food — external funds'),
  '579': t('МРРБ — чужди средства — „Български ВиК холдинг“', 'Ministry of Regional Development — external funds — Bulgarian Water Holding'),
  '581': t('МТС — чужди средства — НК „Железопътна инфраструктура“', 'Ministry of Transport — external funds — National Railway Infrastructure Company'),
  '582': t('МТС — чужди средства — „БДЖ — Пътнически превози“', 'Ministry of Transport — external funds — BDZ Passenger Services'),
  '666': t('Централен бюджет — безлихвени заеми', 'Central budget — interest-free loans'),
  '735': t('Фонд „Гарантирани вземания на работници и служители“ (НОИ)', 'Fund for Guaranteed Receivables of Workers and Employees (NSSI)'),
  '745': t('Учителски пенсионен фонд', 'Teachers’ Pension Fund'),
  '801': t('Софийски университет „Св. Климент Охридски“', 'Sofia University'),
  '802': t('Пловдивски университет „Паисий Хилендарски“', 'Plovdiv University'),
  '803': t('Бургаски държавен университет „Проф. д-р Асен Златаров“', 'Burgas State University'),
  '804': t('Великотърновски университет „Св. св. Кирил и Методий“', 'University of Veliko Tarnovo'),
  '805': t('Югозападен университет „Неофит Рилски“', 'South-West University, Blagoevgrad'),
  '806': t('Шуменски университет „Епископ Константин Преславски“', 'Shumen University'),
  '811': t('Русенски университет „Ангел Кънчев“', 'University of Ruse'),
  '812': t('Технически университет — София', 'Technical University of Sofia'),
  '814': t('Технически университет — Варна', 'Technical University of Varna'),
  '815': t('Технически университет — Габрово', 'Technical University of Gabrovo'),
  '816': t('Университет по архитектура, строителство и геодезия', 'University of Architecture, Civil Engineering and Geodesy'),
  '817': t('Минно-геоложки университет „Св. Иван Рилски“', 'University of Mining and Geology'),
  '818': t('Лесотехнически университет', 'University of Forestry'),
  '819': t('Химико-технологичен и металургичен университет', 'University of Chemical Technology and Metallurgy'),
  '821': t('Университет по хранителни технологии — Пловдив', 'University of Food Technologies, Plovdiv'),
  '822': t('Аграрен университет — Пловдив', 'Agricultural University, Plovdiv'),
  '823': t('Тракийски университет — Стара Загора', 'Trakia University, Stara Zagora'),
  '831': t('Медицински университет — София', 'Medical University of Sofia'),
  '832': t('Медицински университет — Пловдив', 'Medical University of Plovdiv'),
  '833': t('Медицински университет — Варна', 'Medical University of Varna'),
  '835': t('Медицински университет — Плевен', 'Medical University of Pleven'),
  '841': t('Университет за национално и световно стопанство', 'University of National and World Economy'),
  '842': t('Икономически университет — Варна', 'University of Economics, Varna'),
  '843': t('Стопанска академия „Д. А. Ценов“ — Свищов', 'D. A. Tsenov Academy of Economics, Svishtov'),
  '851': t('Национална музикална академия „Проф. Панчо Владигеров“', 'National Academy of Music'),
  '852': t('Национална академия за театрално и филмово изкуство', 'National Academy for Theatre and Film Arts'),
  '853': t('Национална художествена академия', 'National Academy of Arts'),
  '854': t('Академия за музикално, танцово и изобразително изкуство — Пловдив', 'Academy of Music, Dance and Fine Arts, Plovdiv'),
  '859': t('Национална спортна академия „Васил Левски“', 'National Sports Academy'),
  '867': t('Висше строително училище „Любен Каравелов“', 'Lyuben Karavelov Higher School of Civil Engineering'),
  '868': t('Висше транспортно училище „Тодор Каблешков“', 'Todor Kableshkov University of Transport'),
  '871': t('Университет по библиотекознание и информационни технологии', 'University of Library Studies and Information Technologies'),
  '872': t('Висше училище по телекомуникации и пощи', 'University of Telecommunications and Post'),
  '881': t('Военна академия „Г. С. Раковски“', 'Rakovski National Defence College'),
  '882': t('Национален военен университет „Васил Левски“', 'Vasil Levski National Military University'),
  '883': t('Висше военноморско училище „Н. Й. Вапцаров“', 'Nikola Vaptsarov Naval Academy'),
  '884': t('Висше военновъздушно училище „Георги Бенковски“', 'Georgi Benkovski Air Force Academy'),
  '890': t('Българска академия на науките', 'Bulgarian Academy of Sciences'),
  '980': t('Национален фонд — авансово финансиране на проекти', 'National Fund — advance financing of projects'),
  '981': t('Национален фонд — Кохезионен фонд', 'National Fund — Cohesion Fund'),
  '983': t('Национален фонд — Механизъм за възстановяване и устойчивост', 'National Fund — Recovery and Resilience Facility'),
  '986': t('Национален фонд — трансгранично сътрудничество', 'National Fund — cross-border cooperation'),
  '987': t('Национален фонд — средства от ЕС', 'National Fund — EU funds'),
  '989': t('Национален фонд — други международни програми', 'National Fund — other international programmes'),
}

/** The name of a SEBRA system. */
export function systemName(code: string): LocalizedText {
  const unit = UNIT_SYSTEMS[code]
  const name = unit ? unitName(unit) : OTHER_SYSTEMS[code]
  if (!name) throw new Error(`No name for SEBRA system ${code}`)
  return name
}

/** SEBRA payment codes, in English (the Bulgarian is the official wording, from the daily publication). */
export const PAY_CODE_EN: Record<string, string> = {
  '01': 'Salaries and other staff pay (net)',
  '02': 'Taxes and contributions withheld from staff pay',
  '03': 'Other deductions from staff pay',
  '05': 'Employer’s social contributions',
  '10': 'Running costs',
  '18': 'Other expenses',
  '20': 'Interest',
  '30': 'Current subsidies to companies',
  '40': 'Scholarships, pensions, benefits and other transfers to households',
  '50': 'Fixed assets, major repairs and capital transfers',
  '60': 'Transfers to budget and extra-budgetary accounts',
  '70': 'Repayable financing: shares, loans and temporary financial aid',
  '80': 'Repayments of bank loans',
  '88': 'Funds held for others',
  '89': 'Other financing',
  '90': 'Refunded revenue',
}

/** Classes of payees (see classify in scripts/lib/sebra.ts), with short ids for the lists. */
export const CLASSES: Record<string, { id: string; name: LocalizedText }> = {
  company: { id: 'co', name: t('Фирми', 'Companies') },
  nonprofit: { id: 'np', name: t('Сдружения, фондации, читалища, партии', 'Associations, foundations, community centres, parties') },
  person: { id: 'pe', name: t('Физически лица и еднолични търговци (без имена)', 'Natural persons and sole traders (not named)') },
  other: { id: 'ot', name: t('Неразпознати', 'Unclassified') },
  public: { id: 'pu', name: t('Публичен сектор', 'Public sector') },
}
