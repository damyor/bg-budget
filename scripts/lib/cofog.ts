// Labels and grouping for the COFOG (Classification of the Functions of Government)
// breakdown published by Eurostat. Bulgarian names follow the official
// translation (КФДУ) but are shortened for display.

import type { LocalizedText } from '../../src/lib/types.ts'

/** Top-level groups shown in the first ring. Each lists its COFOG divisions. */
export const COFOG_GROUPS: { id: string; name: LocalizedText; divisions: string[]; note?: LocalizedText }[] = [
  {
    id: 'social',
    name: { bg: 'Пенсии и социална защита', en: 'Pensions & social protection' },
    divisions: ['GF10'],
  },
  {
    id: 'economy',
    name: { bg: 'Икономика и транспорт', en: 'Economy & transport' },
    divisions: ['GF04'],
  },
  {
    id: 'health',
    name: { bg: 'Здравеопазване', en: 'Health' },
    divisions: ['GF07'],
  },
  {
    id: 'education',
    name: { bg: 'Образование', en: 'Education' },
    divisions: ['GF09'],
  },
  {
    id: 'government',
    name: { bg: 'Държавно управление и дълг', en: 'Government & public debt' },
    divisions: ['GF01'],
  },
  {
    id: 'order',
    name: { bg: 'Ред, сигурност и правосъдие', en: 'Public order, safety & justice' },
    divisions: ['GF03'],
  },
  {
    id: 'defence',
    name: { bg: 'Отбрана', en: 'Defence' },
    divisions: ['GF02'],
  },
  {
    id: 'community',
    name: { bg: 'Комунални дейности, култура и околна среда', en: 'Communities, culture & environment' },
    divisions: ['GF06', 'GF08', 'GF05'],
  },
]

export const COFOG_LABELS: Record<string, LocalizedText> = {
  GF01: { bg: 'Общи държавни служби', en: 'General public services' },
  GF0101: { bg: 'Законодателна и изпълнителна власт, финанси и данъци', en: 'Executive & legislative organs, financial & fiscal affairs' },
  GF0102: { bg: 'Външна икономическа помощ', en: 'Foreign economic aid' },
  GF0103: { bg: 'Общи услуги', en: 'General services' },
  GF0104: { bg: 'Фундаментални изследвания', en: 'Basic research' },
  GF0105: { bg: 'Научни изследвания и развойна дейност', en: 'R&D' },
  GF0106: { bg: 'Други общи държавни служби', en: 'Other general public services' },
  GF0107: { bg: 'Лихви по държавния дълг', en: 'Interest on public debt' },
  GF0108: { bg: 'Трансфери между нивата на управление', en: 'Transfers between levels of government' },

  GF02: { bg: 'Отбрана', en: 'Defence' },
  GF0201: { bg: 'Военна отбрана', en: 'Military defence' },
  GF0202: { bg: 'Гражданска защита', en: 'Civil defence' },
  GF0203: { bg: 'Военна помощ за чужбина', en: 'Foreign military aid' },
  GF0204: { bg: 'Научни изследвания за отбраната', en: 'Defence R&D' },
  GF0205: { bg: 'Други разходи за отбрана', en: 'Other defence' },

  GF03: { bg: 'Обществен ред и сигурност', en: 'Public order & safety' },
  GF0301: { bg: 'Полиция', en: 'Police' },
  GF0302: { bg: 'Пожарна безопасност', en: 'Fire protection' },
  GF0303: { bg: 'Съдебна система', en: 'Courts & judiciary' },
  GF0304: { bg: 'Затвори', en: 'Prisons' },
  GF0305: { bg: 'Научни изследвания за реда и сигурността', en: 'Public order R&D' },
  GF0306: { bg: 'Други дейности за реда и сигурността', en: 'Other public order & safety' },

  GF04: { bg: 'Икономически дейности', en: 'Economic affairs' },
  GF0401: { bg: 'Общи икономически, търговски и трудови дейности', en: 'General economic, commercial & labour affairs' },
  GF0402: { bg: 'Земеделие, горско и рибно стопанство', en: 'Agriculture, forestry & fishing' },
  GF0403: { bg: 'Горива и енергетика', en: 'Fuel & energy' },
  GF0404: { bg: 'Добив, промишленост и строителство', en: 'Mining, manufacturing & construction' },
  GF0405: { bg: 'Транспорт', en: 'Transport' },
  GF0406: { bg: 'Съобщения', en: 'Communication' },
  GF0407: { bg: 'Други отрасли (туризъм и др.)', en: 'Other industries (tourism etc.)' },
  GF0408: { bg: 'Научни изследвания за икономиката', en: 'Economic affairs R&D' },
  GF0409: { bg: 'Други икономически дейности', en: 'Other economic affairs' },

  GF05: { bg: 'Опазване на околната среда', en: 'Environmental protection' },
  GF0501: { bg: 'Управление на отпадъците', en: 'Waste management' },
  GF0502: { bg: 'Отпадъчни води', en: 'Waste water management' },
  GF0503: { bg: 'Намаляване на замърсяването', en: 'Pollution abatement' },
  GF0504: { bg: 'Биоразнообразие и ландшафт', en: 'Biodiversity & landscape' },
  GF0505: { bg: 'Научни изследвания за околната среда', en: 'Environmental R&D' },
  GF0506: { bg: 'Други дейности за околната среда', en: 'Other environmental protection' },

  GF06: { bg: 'Жилищно строителство и комунални дейности', en: 'Housing & community amenities' },
  GF0601: { bg: 'Жилищно строителство', en: 'Housing development' },
  GF0602: { bg: 'Благоустройство на населените места', en: 'Community development' },
  GF0603: { bg: 'Водоснабдяване', en: 'Water supply' },
  GF0604: { bg: 'Улично осветление', en: 'Street lighting' },
  GF0605: { bg: 'Научни изследвания за жилища и комунални дейности', en: 'Housing R&D' },
  GF0606: { bg: 'Други комунални дейности', en: 'Other community amenities' },

  GF07: { bg: 'Здравеопазване', en: 'Health' },
  GF0701: { bg: 'Лекарства и медицински изделия', en: 'Medicines & medical products' },
  GF0702: { bg: 'Извънболнична помощ', en: 'Outpatient services' },
  GF0703: { bg: 'Болнична помощ', en: 'Hospital services' },
  GF0704: { bg: 'Обществено здраве', en: 'Public health services' },
  GF0705: { bg: 'Научни изследвания в здравеопазването', en: 'Health R&D' },
  GF0706: { bg: 'Други дейности по здравеопазване', en: 'Other health' },

  GF08: { bg: 'Култура, спорт и религия', en: 'Recreation, culture & religion' },
  GF0801: { bg: 'Спорт и отдих', en: 'Recreation & sport' },
  GF0802: { bg: 'Култура', en: 'Culture' },
  GF0803: { bg: 'Радио, телевизия и издателска дейност', en: 'Broadcasting & publishing' },
  GF0804: { bg: 'Религиозни и други общностни дейности', en: 'Religious & community services' },
  GF0805: { bg: 'Научни изследвания за култура и спорт', en: 'Culture & sport R&D' },
  GF0806: { bg: 'Други дейности за култура и спорт', en: 'Other recreation & culture' },

  GF09: { bg: 'Образование', en: 'Education' },
  GF0901: { bg: 'Детски градини и начално образование', en: 'Pre-primary & primary education' },
  GF0902: { bg: 'Средно образование', en: 'Secondary education' },
  GF0903: { bg: 'Следсредно образование', en: 'Post-secondary education' },
  GF0904: { bg: 'Висше образование', en: 'Higher education' },
  GF0905: { bg: 'Образование без определена степен', en: 'Education not definable by level' },
  GF0906: { bg: 'Помощни услуги (храна, транспорт, общежития)', en: 'Subsidiary services (meals, transport, housing)' },
  GF0907: { bg: 'Научни изследвания за образованието', en: 'Education R&D' },
  GF0908: { bg: 'Други дейности по образованието', en: 'Other education' },

  GF10: { bg: 'Социална защита', en: 'Social protection' },
  GF1001: { bg: 'Болест и инвалидност', en: 'Sickness & disability' },
  GF1002: { bg: 'Старост (пенсии и грижи)', en: 'Old age (pensions & care)' },
  GF1003: { bg: 'Наследствени пенсии', en: "Survivors' pensions" },
  GF1004: { bg: 'Семейство и деца', en: 'Family & children' },
  GF1005: { bg: 'Безработица', en: 'Unemployment' },
  GF1006: { bg: 'Жилищно подпомагане', en: 'Housing support' },
  GF1007: { bg: 'Социално изключване', en: 'Social exclusion' },
  GF1008: { bg: 'Научни изследвания за социалната защита', en: 'Social protection R&D' },
  GF1009: { bg: 'Други дейности по социална защита', en: 'Other social protection' },
}

/**
 * Economic nature of the spending (ESA 2010 transactions). Together these sum
 * to total expenditure (TE) for every COFOG group.
 */
export const ECONOMIC_TYPES: { code: string; slug: string; name: LocalizedText; note?: LocalizedText }[] = [
  { code: 'D1', slug: 'staff', name: { bg: 'Заплати и осигуровки на персонала', en: 'Staff pay & contributions' } },
  {
    code: 'P2_D29_D5_D8',
    slug: 'running',
    name: { bg: 'Издръжка: стоки и услуги', en: 'Running costs: goods & services' },
  },
  { code: 'D3', slug: 'subsidies', name: { bg: 'Субсидии за предприятия', en: 'Subsidies to companies' } },
  { code: 'D4', slug: 'interest', name: { bg: 'Лихви', en: 'Interest' } },
  {
    code: 'D62',
    slug: 'benefits',
    name: { bg: 'Пенсии, помощи и обезщетения', en: 'Pensions, benefits & allowances' },
    note: { bg: 'Социални плащания в пари.', en: 'Social benefits paid in cash.' },
  },
  {
    code: 'D632',
    slug: 'services',
    name: { bg: 'Услуги и лекарства, платени за гражданите', en: 'Services & medicines paid for citizens' },
    note: {
      bg: 'Социални трансфери в натура — напр. плащания на НЗОК към болници, лекари и аптеки.',
      en: 'Social transfers in kind — e.g. health insurance payments to hospitals, doctors and pharmacies.',
    },
  },
  { code: 'D7', slug: 'transfers', name: { bg: 'Други текущи трансфери', en: 'Other current transfers' } },
  { code: 'D9', slug: 'capital-transfers', name: { bg: 'Капиталови трансфери', en: 'Capital transfers' } },
  {
    code: 'OP5ANP',
    slug: 'investment',
    name: { bg: 'Инвестиции', en: 'Investment' },
    note: {
      bg: 'Сгради, пътища, техника и други дълготрайни активи (нето от продажби на земя и др.).',
      en: 'Buildings, roads, equipment and other fixed assets (net of land sales etc.).',
    },
  },
]
