import type { LocalizedText } from '../types'

export interface TaxParams {
  year: number
  /** law = rules in force; proposed = assumptions of the budget procedure, not yet law. */
  status: 'law' | 'proposed'
  /** Date the parameters below are in force from (ISO). */
  validFrom: string
  /** Currency of the statutory amounts (amounts below are always euro; leva converted at 1.95583). */
  currency: 'BGN' | 'EUR'
  incomeTaxRate: number
  /** Maximum monthly insurable income (contribution ceiling), EUR. */
  maxInsurableMonthly: number
  minWageMonthly: number
  /** Average gross monthly wage for the year, EUR — the calculator's default. */
  averageWageMonthly: number
  contributions: {
    employee: { pension: number; illnessMaternity: number; unemployment: number; health: number; pillar2: number }
    employer: {
      pension: number
      illnessMaternity: number
      unemployment: number
      accident: number
      health: number
      guaranteeFund: number
      pillar2: number
    }
  }
  vat: {
    standardRate: number
    /** Share of household spending that carries the standard VAT rate. */
    taxableShareOfSpending: number
  }
  excise: {
    petrolPerLitre: number
    dieselPerLitre: number
    /** Excise in a typical pack of 20 cigarettes. */
    cigarettesPerPack: number
    /** 0.5 l of 12 °Plato beer. */
    beerPerBottle: number
    /** 0.7 l of 40% spirits. */
    spiritsPerBottle: number
  }
  /** Year-specific wording for the "How it is calculated" notes. */
  notes: {
    /** e.g. "2300 € от 1 август 2026 г." */
    maxInsurable: LocalizedText
    averageWage: LocalizedText
    guaranteeFund: LocalizedText
    cigarettes: LocalizedText
    extra?: LocalizedText[]
  }
  sources: { name: LocalizedText; url: string }[]
}

export const BGN_PER_EUR = 1.95583
/** Statutory leva amount in euro, rounded to the cent. */
const bgn = (leva: number) => Math.round((leva / BGN_PER_EUR) * 100) / 100

/** Cigarettes: specific + ad valorem excise, but never less than the overall minimum (amounts per 1000 cigarettes, EUR). */
function cigarettePack(c: { specificPer1000: number; adValorem: number; minimumPer1000: number; typicalPackPrice: number }): number {
  return Math.max((c.specificPer1000 * 20) / 1000 + c.adValorem * c.typicalPackPrice, (c.minimumPer1000 * 20) / 1000)
}

// Rates that have not changed in 2024–2026 (employee born after 1959, third labour category).
const CONTRIBUTIONS = {
  employee: { pension: 0.0658, illnessMaternity: 0.014, unemployment: 0.004, health: 0.032, pillar2: 0.022 },
  employer: { pension: 0.0822, illnessMaternity: 0.021, unemployment: 0.006, accident: 0.004, health: 0.048, guaranteeFund: 0, pillar2: 0.028 },
}

const FUEL_AND_ALCOHOL = {
  // ЗАДС: 710 лв./1000 л бензин, 646 лв./1000 л дизел, 1,50 лв. на хл/°Плато за бира, 1100 лв. на хл чист алкохол.
  petrolPerLitre: 363.02 / 1000,
  dieselPerLitre: 330.29 / 1000,
  beerPerBottle: 0.77 * 0.005 * 12,
  spiritsPerBottle: 562.42 * 0.007 * 0.4,
}

const COMMON_SOURCES = [
  {
    name: { bg: 'Закон за данъците върху доходите на физическите лица', en: 'Personal Income Tax Act' },
    url: 'https://lex.bg/laws/ldoc/2135538631',
  },
  { name: { bg: 'Закон за ДДС', en: 'VAT Act' }, url: 'https://lex.bg/laws/ldoc/2135533201' },
  {
    name: { bg: 'Закон за акцизите и данъчните складове', en: 'Excise Duties and Tax Warehouses Act' },
    url: 'https://lex.bg/laws/ldoc/2135525027',
  },
]

const CIGARETTES_2026_AUG = { specificPer1000: 77, adValorem: 0.21, minimumPer1000: 120, typicalPackPrice: 3.8 }

/** Parameters in force in Bulgaria from 1 August 2026. */
export const TAX_2026: TaxParams = {
  year: 2026,
  status: 'law',
  validFrom: '2026-08-01',
  currency: 'EUR',
  incomeTaxRate: 0.1,
  // 2111.64 € until 31 July 2026.
  maxInsurableMonthly: 2300,
  minWageMonthly: 620.2,
  // NSI, Q2 2026.
  averageWageMonthly: 1444,
  contributions: CONTRIBUTIONS,
  vat: { standardRate: 0.2, taxableShareOfSpending: 0.85 },
  excise: { ...FUEL_AND_ALCOHOL, cigarettesPerPack: cigarettePack(CIGARETTES_2026_AUG) },
  notes: {
    maxInsurable: { bg: '2300 € на месец от 1 август 2026 г.', en: '€2,300 a month from 1 August 2026' },
    averageWage: { bg: 'средната брутна заплата за II тримесечие на 2026 г. (НСИ)', en: 'the average gross wage in Q2 2026 (NSI)' },
    guaranteeFund: { bg: 'вноска за фонд „Гарантирани вземания“ през 2026 г. не се дължи', en: 'no guaranteed-receivables fund contribution is due in 2026' },
    cigarettes: {
      bg: 'при типична цена около 3,80 € важи минималният акциз от 1 август 2026 г.',
      en: 'at a typical price of about €3.80 the minimum excise from 1 August 2026 applies',
    },
  },
  sources: [
    {
      name: { bg: 'НАП — размер на осигурителните вноски за 2026 г.', en: 'National Revenue Agency — 2026 contribution rates' },
      url: 'https://nra.bg/wps/portal/nra/osiguryavane/zdravno-osiguryavane/razmer-osiguritelni-vnoski',
    },
    {
      name: { bg: 'Закон за бюджета на ДОО за 2026 г.', en: 'State Social Security Budget Act 2026' },
      url: 'https://www.mlsp.government.bg/uploads/7/tpoout/2026/zakon-za-budjeta-na-dyrjavnoto-obsestveno-osigurqvane-za-2026-g.pdf',
    },
    {
      name: { bg: 'НОИ — осигурителен доход от 1 август 2026 г.', en: 'National Social Security Institute — insurable income from 1 Aug 2026' },
      url: 'https://www.noi.bg/dohod01082026/',
    },
    ...COMMON_SOURCES,
    {
      name: { bg: 'Агенция „Митници“ — акцизни ставки в евро', en: 'Customs Agency — excise rates in euro' },
      url: 'https://customs.bg/wps/portal/agency/home/info-business/bank-information/customs-euro',
    },
    {
      name: { bg: 'ЗДБРБ за 2026 г. (ДВ бр. 69/2026) — акциз върху тютюневите изделия', en: '2026 State Budget Act (SG 69/2026) — tobacco excise' },
      url: 'https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=245041',
    },
    {
      name: { bg: 'НСИ — средна брутна заплата, II тримесечие 2026 г.', en: 'NSI — average gross wage, Q2 2026' },
      url: 'https://www.nsi.bg/file/37293/naeti_lica_i_sredna_rabotna_zaplata.pdf',
    },
  ],
}

const NSI_WAGES_2025 = {
  name: { bg: 'НСИ — наети лица и средна работна заплата, 2025 г. (предварителни данни)', en: 'NSI — employees and average wage, 2025 (preliminary)' },
  url: 'https://www.nsi.bg/file/34130/naeti_lica_i_sredna_rabotna_zaplata.pdf',
}

export const TAX_2025: TaxParams = {
  ...TAX_2026,
  year: 2025,
  validFrom: '2025-04-01',
  currency: 'BGN',
  // 3750 лв. from 1 January to 31 March 2025 (budget extension), 4130 лв. from 1 April.
  maxInsurableMonthly: bgn(4130),
  minWageMonthly: bgn(1077),
  // NSI: average gross annual wage 31 239 лв. (preliminary).
  averageWageMonthly: bgn(31239 / 12),
  excise: {
    ...FUEL_AND_ALCOHOL,
    // From 1 May 2025 (State Budget Act 2025, SG 26/2025): 131 лв./1000 + 22%, at least 210 лв./1000.
    cigarettesPerPack: cigarettePack({ specificPer1000: bgn(131), adValorem: 0.22, minimumPer1000: bgn(210), typicalPackPrice: bgn(7.2) }),
  },
  notes: {
    maxInsurable: { bg: '4130 лв. (2111,64 €) на месец от 1 април 2025 г.; дотогава 3750 лв.', en: 'BGN 4,130 (€2,111.64) a month from 1 April 2025; BGN 3,750 before' },
    averageWage: { bg: 'средната брутна заплата за 2025 г. — 31 239 лв. годишно (НСИ, предварителни данни)', en: 'the 2025 average gross wage — BGN 31,239 a year (NSI, preliminary)' },
    guaranteeFund: { bg: 'вноска за фонд „Гарантирани вземания“ през 2025 г. не се дължи', en: 'no guaranteed-receivables fund contribution was due in 2025' },
    cigarettes: {
      bg: 'от 1 май 2025 г.: 131 лв. за 1000 къса плюс 22% от цената, но не по-малко от 210 лв.; при типична цена около 7,20 лв.',
      en: 'from 1 May 2025: BGN 131 per 1,000 plus 22% of the price, at least BGN 210; at a typical price of about BGN 7.20',
    },
  },
  sources: [
    {
      name: { bg: 'Закон за бюджета на ДОО за 2025 г. (ДВ, бр. 25/2025)', en: 'State Social Security Budget Act 2025 (SG 25/2025)' },
      url: 'https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=233617',
    },
    {
      name: { bg: 'Закон за държавния бюджет за 2025 г. (ДВ, бр. 26/2025) — акциз върху тютюневите изделия', en: '2025 State Budget Act (SG 26/2025) — tobacco excise' },
      url: 'https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=233694',
    },
    ...COMMON_SOURCES,
    NSI_WAGES_2025,
  ],
}

export const TAX_2024: TaxParams = {
  ...TAX_2025,
  year: 2024,
  validFrom: '2024-01-01',
  maxInsurableMonthly: bgn(3750),
  minWageMonthly: bgn(933),
  // NSI: average gross annual wage 27 898 лв.
  averageWageMonthly: bgn(27898 / 12),
  excise: {
    ...FUEL_AND_ALCOHOL,
    // From 1 January 2024 (Excise Act as amended in SG 100/2022): 126 лв./1000 + 22%, at least 194 лв./1000.
    cigarettesPerPack: cigarettePack({ specificPer1000: bgn(126), adValorem: 0.22, minimumPer1000: bgn(194), typicalPackPrice: bgn(6.8) }),
  },
  notes: {
    maxInsurable: { bg: '3750 лв. (1917,34 €) на месец', en: 'BGN 3,750 (€1,917.34) a month' },
    averageWage: { bg: 'средната брутна заплата за 2024 г. — 27 898 лв. годишно (НСИ)', en: 'the 2024 average gross wage — BGN 27,898 a year (NSI)' },
    guaranteeFund: { bg: 'вноска за фонд „Гарантирани вземания“ през 2024 г. не се дължи', en: 'no guaranteed-receivables fund contribution was due in 2024' },
    cigarettes: {
      bg: '126 лв. за 1000 къса плюс 22% от цената, но не по-малко от 194 лв.; при типична цена около 6,80 лв.',
      en: 'BGN 126 per 1,000 plus 22% of the price, at least BGN 194; at a typical price of about BGN 6.80',
    },
  },
  sources: [
    {
      name: { bg: 'Закон за бюджета на ДОО за 2024 г. (ДВ, бр. 106/2023)', en: 'State Social Security Budget Act 2024 (SG 106/2023)' },
      url: 'https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=202043',
    },
    ...COMMON_SOURCES,
    {
      name: { bg: 'НСИ — наети лица и средна работна заплата, 2024 г.', en: 'NSI — employees and average wage, 2024' },
      url: 'https://www.nsi.bg/tsb/wp-content/uploads/2026/01/Press-release_4_Labour2024.pdf',
    },
  ],
}

/** The assumptions of the 2027 budget procedure (Ministry of Finance, September 2026) — not yet law. */
export const TAX_2027: TaxParams = {
  ...TAX_2026,
  year: 2027,
  status: 'proposed',
  validFrom: '2027-03-01',
  maxInsurableMonthly: 2400,
  minWageMonthly: 660,
  // Q2 2026 average wage grown by the 6.2% forecast for compensation per employee (MoF autumn forecast).
  averageWageMonthly: Math.round(1444 * 1.062),
  excise: {
    ...FUEL_AND_ALCOHOL,
    // Already legislated (SG 69/2026): from 1 March 2027 €82/1000 + 20.5%, at least €126/1000.
    cigarettesPerPack: cigarettePack({ specificPer1000: 82, adValorem: 0.205, minimumPer1000: 126, typicalPackPrice: 4 }),
  },
  notes: {
    maxInsurable: { bg: '2400 € на месец (предложение в бюджетната процедура)', en: '€2,400 a month (proposed in the budget procedure)' },
    averageWage: {
      bg: 'средната заплата за II тримесечие на 2026 г., увеличена с прогнозирания от МФ ръст от 6,2%',
      en: 'the Q2 2026 average wage grown by the 6.2% the Ministry of Finance forecasts',
    },
    guaranteeFund: { bg: 'приемаме, че и през 2027 г. вноска за фонд „Гарантирани вземания“ няма да се дължи', en: 'we assume no guaranteed-receivables fund contribution in 2027 either' },
    cigarettes: {
      bg: 'по вече приетия календар от 1 март 2027 г.: 82 € за 1000 къса плюс 20,5% от цената, но не по-малко от 126 €; при типична цена около 4 € важи минимумът',
      en: 'per the schedule already in law from 1 March 2027: €82 per 1,000 plus 20.5% of the price, at least €126; at a typical price of about €4 the minimum applies',
    },
    extra: [
      {
        bg: 'Минималната заплата (660 €) и максималният осигурителен доход (2400 €) са допусканията в указанията на Министерството на финансите за бюджет 2027 (септември 2026 г.). Ставките на данъците и осигуровките се запазват; бюджетът за 2027 г. още не е внесен в Народното събрание.',
        en: 'The minimum wage (€660) and the contribution ceiling (€2,400) are the assumptions in the Ministry of Finance guidelines for the 2027 budget (September 2026). Tax and contribution rates stay the same; the 2027 budget has not yet been submitted to Parliament.',
      },
    ],
  },
  sources: [
    {
      name: { bg: 'Сега — Бюджет 2027: 660 евро минимална заплата и 2400 евро таван за осигуровки', en: 'Sega — Budget 2027: €660 minimum wage and €2,400 contribution ceiling' },
      url: 'https://www.segabg.com/hot/category-bulgaria/byudzhet-2027-660-evro-minimalna-zaplata-i-2400-evro-tavan-za-osigurovki',
    },
    {
      name: { bg: 'Фискален съвет — становище за есенната макроикономическа прогноза 2026–2029', en: 'Fiscal Council — opinion on the autumn 2026 macroeconomic forecast' },
      url: 'https://www.fiscal-council.bg/bg/publikacii/stanovishte-otnosno-esennata-makroikonomicheska-prognoza-na-mf-za-perioda-2026-2029',
    },
    {
      name: { bg: 'Закон за акцизите и данъчните складове, чл. 39 (ред. ДВ, бр. 69/2026)', en: 'Excise Duties Act, art. 39 (as amended in SG 69/2026)' },
      url: 'https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=245041',
    },
    ...COMMON_SOURCES,
  ],
}

export const TAX_PARAMS: Record<number, TaxParams> = { 2024: TAX_2024, 2025: TAX_2025, 2026: TAX_2026, 2027: TAX_2027 }
export const TAX_YEARS = Object.keys(TAX_PARAMS).map(Number).sort((a, b) => a - b)
export const CURRENT_TAX_YEAR = 2026

export function paramsFor(year: number): TaxParams | null {
  return TAX_PARAMS[year] ?? null
}
