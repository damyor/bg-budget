// The Unified Budget Classification (ЕБК): the functions and activities of the functional classification and the
// paragraphs of the economic classification of expenditure — the codes of the municipalities' own reports
// ("Big cities", scripts/cities.ts). The official Bulgarian names of the activities come from the ЕБК 2026
// (data/sources/cities/ebk-activities.csv, scripts/extract/city_budgets.py); the English names are ours.

import type { LocalizedText } from '../../src/lib/types.ts'
import { readCsv } from './csv.ts'

const t = (bg: string, en: string): LocalizedText => ({ bg, en })

/** The nine functions (section VI of the ЕБК): the first digit of every activity code. */
export const FUNCTIONS: Record<number, { id: string; name: LocalizedText }> = {
  1: { id: 'general', name: t('Общи държавни служби', 'General public services') },
  2: { id: 'security', name: t('Отбрана и сигурност', 'Defence & security') },
  3: { id: 'education', name: t('Образование', 'Education') },
  4: { id: 'health', name: t('Здравеопазване', 'Health') },
  5: { id: 'social', name: t('Социално осигуряване, подпомагане и грижи', 'Social protection & care') },
  // The ЕБК's own names of functions 6, 7 and 9 are long; these keep their meaning.
  6: { id: 'housing', name: t('Благоустройство, комунални дейности и околна среда', 'Public works, utilities & environment') },
  7: { id: 'culture', name: t('Култура, спорт, почивни дейности и религия', 'Culture, sport, recreation & religion') },
  8: { id: 'economy', name: t('Икономически дейности и услуги', 'Economic activities & services') },
  9: { id: 'unclassified', name: t('Лихви и други некласифицирани разходи', 'Interest & other unclassified spending') },
}

/**
 * The activity of a code as municipal reports write it: four digits, the function's digit first, then the three-digit
 * ЕБК activity, whose own first digit is the function again ("3322" → function 3, activity "322" general schools).
 * Three digits are taken as the activity itself.
 */
export function activityOf(code: string): { fn: number; activity: string } {
  const m = /^(\d)?(\d{3})$/.exec(code.trim())
  if (!m) throw new Error(`ЕБК: "${code}" is not an activity code`)
  const activity = m[2]
  const fn = Number(activity[0])
  if (m[1] !== undefined && Number(m[1]) !== fn) throw new Error(`ЕБК: activity code ${code} has function ${m[1]}, but activity ${activity} is in function ${fn}`)
  if (!FUNCTIONS[fn]) throw new Error(`ЕБК: no function ${fn} (activity ${code})`)
  return { fn, activity }
}

/** English names of the ЕБК 2026 activities (ours). */
const ACTIVITY_EN: Record<string, string> = {
  101: 'Central government bodies',
  103: 'Central government bodies for education',
  104: 'Central government bodies for health',
  105: 'Central government bodies for social security',
  106: 'Central government bodies for regional development and public works',
  107: 'Central government bodies for culture and sport',
  108: 'Central government bodies for economic activities and services',
  111: 'Supervisory bodies',
  115: 'Management, supervision and regulation of foreign affairs',
  116: 'Embassies, consulates, representations and missions abroad',
  117: 'State and municipal electoral services and activities',
  121: 'Regional (province) administrations',
  122: 'Municipal administration',
  123: 'Municipal councils',
  125: 'Members of the European Parliament from Bulgaria',
  128: 'International programmes and agreements, donations and foreign aid',
  139: 'Other executive and legislative bodies',
  141: 'Statistics institute, services and activities, opinion polls and surveys',
  142: 'General economic and social planning and forecasting',
  143: 'Registration and control of foreign investment',
  144: 'Services and activities for Bulgarians abroad',
  145: 'Services and activities to support refugees',
  146: 'Management and administration of foreign aid received',
  147: 'Management of the state reserve and wartime stocks',
  148: 'Civil registration and administrative services to the public',
  149: 'Other general services',
  151: 'Liquidation commission for closed budget organisations',
  158: 'International programmes and agreements, donations and foreign aid',
  161: 'Organisation and management of research',
  162: 'Research',
  163: 'Research institutes and centres',
  168: 'International programmes and agreements, donations and foreign aid',
  179: 'Other science activities',
  201: 'Defence activities',
  205: "Bulgaria's participation in NATO",
  206: 'Peacekeeping missions abroad',
  207: 'Defence mobilisation preparedness',
  215: 'Applied defence research',
  218: 'International programmes and agreements, donations and foreign aid',
  219: 'Other defence activities',
  221: 'Police and public order',
  222: 'National Protection Service',
  223: 'State Intelligence Agency',
  224: 'Fire protection',
  225: 'Applied research in public order and security',
  228: 'International programmes and agreements, donations and foreign aid',
  239: 'Other internal security activities',
  241: 'Supreme Judicial Council',
  242: 'Supreme Administrative Court',
  243: 'Supreme Court of Cassation',
  244: "Prosecutor's Office",
  245: 'National Investigation Service',
  246: 'Courts',
  247: 'District investigation services',
  248: 'Inspectorate of the Supreme Judicial Council',
  249: 'National Institute of Justice',
  258: 'International programmes and agreements, donations and foreign aid',
  259: 'Other judiciary activities',
  261: 'Prisons',
  268: 'International programmes and agreements, donations and foreign aid',
  279: 'Other prison administration activities',
  281: 'Emergency protection of the population and the economy',
  282: 'Mobilisation preparedness, stocks and capacity',
  283: 'Prevention of the harmful effects of disasters and accidents',
  284: 'Recovery from natural disasters and industrial accidents',
  285: 'Volunteer disaster-protection units',
  288: 'International programmes and agreements, donations and foreign aid',
  289: 'Other civil-protection activities for disasters and accidents',
  301: 'Management, supervision, regulation and licensing of education',
  311: 'Kindergartens',
  312: 'Special groups in kindergartens for children with special educational needs',
  314: 'Half-day kindergartens',
  315: 'Seasonal kindergartens',
  318: 'Preparatory groups in schools',
  321: 'Special schools and centres for special educational support',
  322: 'General schools (other than vocational high schools)',
  323: 'Schools of culture and of the arts',
  324: 'Sports schools',
  325: 'Bulgarian schools abroad',
  326: 'Vocational high schools and vocational classes',
  327: 'Schools in prisons',
  331: 'Homes for children deprived of parental care',
  332: 'Student dormitories',
  333: 'Pupils’ holiday camps',
  334: 'Teacher training',
  335: 'Pupils’ sports schools',
  336: 'Canteens',
  337: 'Centres for personal development support',
  338: 'Resource support for pupils with special needs',
  341: 'Academies, universities and higher schools',
  349: 'Applied research in education',
  359: 'Other activities for children',
  369: 'Other activities for young people',
  388: 'International programmes and agreements, donations and foreign aid',
  389: 'Other education activities',
  401: 'Management, supervision and regulation of health',
  412: 'General hospitals for active treatment',
  413: 'Municipal hospitals',
  414: "Children's hospitals",
  415: 'Homes for medical and social care',
  416: 'Hospitals for lung diseases',
  417: 'Obstetrics and gynaecology hospitals',
  418: 'Psychiatric hospitals',
  419: 'Mental health centres',
  420: 'Eye hospitals',
  423: 'Hospitals for continued treatment and rehabilitation',
  424: 'Medical centres and specialised hospitals for lung and tuberculosis diseases',
  425: 'Dispensaries for mental illness',
  426: 'Centres for skin and venereal diseases',
  427: 'Comprehensive cancer centres and specialised cancer hospitals',
  429: 'Emergency medical care centres',
  430: 'Regional public health inspectorates',
  431: 'Nurseries, baby-food kitchens and nursery groups in kindergartens',
  432: 'Nurseries for children deprived of parental care',
  433: 'Rehabilitation',
  436: 'National centres',
  437: 'Health offices in kindergartens and schools',
  438: 'Day psycho-rehabilitation programmes',
  442: 'Drug addiction centres',
  447: 'Substitution and maintenance programmes',
  448: 'Centres for complex care of children with disabilities and chronic diseases',
  450: 'Transformed medical establishments',
  451: 'Payments for primary outpatient care',
  452: 'Payments for specialised outpatient care',
  453: 'Payments for dental care',
  454: 'Payments for medical diagnostics',
  455: 'Payments for medicines, medical devices and dietary foods for home treatment',
  456: 'Payments for hospital care',
  457: 'Payments for medical devices used in hospital care',
  458: 'Payments for medicines in hospital care',
  459: 'Other health insurance payments',
  465: 'Applied research in health',
  467: 'National programmes',
  468: 'International programmes and agreements, donations and foreign aid',
  469: 'Other health activities',
  501: 'Pensions',
  511: 'Benefits under the Family Allowances for Children Act',
  512: 'Benefits under the Social Assistance Act',
  513: 'Benefits under the Persons with Disabilities Act',
  514: 'Aid for the diagnosis and treatment of people on low incomes',
  515: 'Benefits under the Child Protection Act',
  516: 'Benefits under the War Veterans Act',
  517: 'Benefits under the War Invalids and War Victims Act',
  518: 'Social benefits under international programmes, aid and donations',
  519: 'Other benefits and compensation',
  521: 'Social security services (State Social Security and others)',
  522: 'Social assistance directorates',
  524: 'Home social care (meals and help at home)',
  525: 'Pensioners’ and disabled people’s clubs',
  526: 'Community support centres',
  527: 'Mother and baby units',
  528: 'Centres for street children',
  529: 'Crisis centres',
  530: 'Family-type placement centres',
  531: 'Prevention of work accidents and occupational diseases',
  532: 'Temporary employment programmes',
  533: 'Other employment programmes and activities',
  534: 'Supervised housing',
  535: 'Transitional housing',
  536: 'Homes for children aged 3 to 6, including children deprived of parental care',
  537: 'Homes for children in grades 1 to 13, including children deprived of parental care',
  538: 'Child protection programmes',
  540: 'Homes for the elderly',
  541: 'Homes for adults with disabilities',
  542: 'Homes for elderly people with mental disorders',
  543: 'Homes for elderly people with physical disabilities',
  544: 'Homes for elderly people with sensory disabilities',
  545: 'Social services at home',
  546: 'Children’s homes',
  547: 'Temporary accommodation centres',
  548: 'Day centres for the elderly',
  549: 'Day centres for children with disabilities',
  550: 'Social rehabilitation and integration centres',
  551: 'Day centres for people with disabilities',
  552: 'Homes for elderly people with dementia',
  553: 'Shelters',
  554: 'Sheltered housing',
  556: 'Applied research in social security and assistance',
  558: 'International programmes and agreements, donations and foreign aid',
  559: 'Other social security, assistance and employment services and activities',
  561: 'Assistant support',
  562: 'Personal assistants',
  588: 'International programmes and agreements, donations and foreign aid',
  589: 'Other social security, assistance and employment services and activities',
  601: 'Management, supervision and regulation of housing and spatial development',
  602: 'Cadastre, surveying and property registration services',
  603: 'Water supply and sewerage',
  604: 'Street and square lighting',
  605: 'Mineral waters and baths',
  606: 'Construction, repair and maintenance of the street network',
  618: 'International programmes and agreements, donations and foreign aid',
  619: 'Other housing, public works and regional development activities',
  621: 'Management, supervision and regulation of environmental protection',
  622: 'Parks and green spaces',
  623: 'Street cleaning and sanitation',
  624: 'Landslide and erosion protection',
  625: 'Applied research in environmental protection',
  626: 'Urban wastewater treatment',
  627: 'Waste management',
  628: 'International programmes and agreements, donations and foreign aid',
  629: 'Other environmental protection activities',
  701: 'Holiday and social recreation activities',
  708: 'International programmes and agreements, donations and foreign aid',
  711: 'Management, supervision and regulation of sport',
  712: 'Children’s and specialised sports schools',
  713: 'Sport for all',
  714: 'Sports grounds for sport for all',
  718: 'International programmes and agreements, donations and foreign aid',
  719: 'Other sport and physical education activities',
  721: 'Management, supervision and regulation of tourism',
  722: 'Tourist facilities',
  723: 'Specialised sports and tourism schools',
  728: 'International programmes and agreements, donations and foreign aid',
  729: 'Other tourism activities',
  731: 'Management, supervision and regulation of culture',
  732: 'Cultural activities',
  733: 'Bulgarian cultural institutes abroad',
  735: 'Theatres',
  736: 'Opera and philharmonic companies, operas',
  737: 'Orchestras and ensembles',
  738: 'Community cultural centres (chitalishta)',
  739: 'Museums, galleries, monuments and ethnographic complexes of national and regional importance',
  740: 'Museums, galleries, monuments and ethnographic complexes of local importance',
  741: 'Radio relay hubs',
  742: 'Radio',
  743: 'Television',
  744: 'Film and sound archives',
  745: 'Ceremonial halls',
  746: 'Zoos',
  747: 'State Archives and regional archives',
  748: 'Support for the development of culture',
  751: 'Libraries of national and regional importance',
  752: 'City libraries',
  755: 'Applied research in the protection of culture',
  758: 'International programmes and agreements, donations and foreign aid',
  759: 'Other cultural activities',
  761: 'Supervision and regulation of religious affairs',
  762: 'Subsidies and other spending on religious affairs',
  768: 'International programmes and agreements, donations and foreign aid',
  801: 'Management, supervision and regulation of mining and energy',
  802: 'Research, measurement and analysis of fuels and energy',
  803: 'Safety and storage of radioactive waste',
  804: 'Decommissioning of nuclear facilities',
  805: 'Applied research in mining, fuels and energy',
  807: 'International programmes and agreements, donations and foreign aid',
  808: 'Other mining activities',
  809: 'Other fuel and energy activities',
  811: 'Management, supervision and regulation of crop farming',
  813: 'Regional agricultural services',
  814: 'Management, supervision and regulation of forestry',
  815: 'Management, supervision and regulation of hunting and fishing',
  816: 'Machinery testing centres and technical inspections',
  817: 'Veterinary services',
  821: 'Other land-reform services',
  824: 'National top-ups and co-financing of direct payments to farmers',
  825: 'Applied research in agriculture and forestry',
  826: 'Fisheries',
  827: 'Rural development',
  828: 'International programmes and agreements, donations and foreign aid',
  829: 'Other agriculture, forestry, hunting and fishing activities',
  831: 'Management, supervision and regulation of transport and roads',
  832: 'Road maintenance, repair and construction',
  833: 'Road network surveys, measurements and analyses',
  834: 'Road transport activities',
  835: 'Rail transport activities',
  836: 'Air transport activities',
  837: 'Water transport activities',
  838: 'Management, supervision and regulation of communications',
  839: 'Post and telecommunications',
  845: 'Applied research in transport and communications',
  848: 'International programmes and agreements, donations and foreign aid',
  849: 'Other transport, road, postal and telecommunication activities',
  851: 'Management, supervision and regulation of industry',
  852: 'Management, supervision and regulation of construction',
  853: 'International programmes and agreements, donations and foreign aid',
  855: 'Applied research in industry and construction',
  858: 'Other industry activities',
  859: 'Other construction activities',
  861: 'Management, supervision and regulation of tourism',
  862: 'Tourist facilities',
  863: 'Specialised sports and tourism schools',
  864: 'International programmes and agreements, donations and foreign aid',
  865: 'Other tourism activities',
  866: 'Municipal markets',
  867: 'Advertising and marketing',
  868: 'Information and computing centres',
  869: 'Publishing and printing',
  871: 'Auxiliary farms, canteens and other support activities',
  872: 'Palaces, residences and estates',
  873: 'Recovery programmes for enterprises in isolation or liquidation',
  874: 'Recovery from natural disasters and industrial accidents',
  875: 'Privatisation bodies and activities',
  876: 'Standardisation and metrology bodies',
  877: 'Patents',
  878: 'Shelters for stray animals',
  885: 'Applied research in other economic activities',
  888: 'Structural reforms',
  897: 'International programmes and agreements, donations and foreign aid',
  898: 'Other economic activities',
  910: 'Interest',
  997: 'Other spending not classified by function',
  998: 'Reserve',
}

export interface Activity {
  /** Three-digit ЕБК code. */
  code: string
  fn: number
  /** The group within the function, as the ЕБК prints it (empty where the function has none). */
  group: string
  name: LocalizedText
  closed: boolean
}

/** The ЕБК 2026 activities (data/sources/cities/ebk-activities.csv) with their English names. */
export function readActivities(file: URL): Map<string, Activity> {
  const out = new Map<string, Activity>()
  for (const r of readCsv(file)) {
    const en = ACTIVITY_EN[r.activity]
    if (!en) throw new Error(`ЕБК: no English name for activity ${r.activity} (${r.name})`)
    const fn = Number(r.function)
    if (activityOf(r.activity).fn !== fn) throw new Error(`ЕБК: activity ${r.activity} listed under function ${fn}`)
    out.set(r.activity, { code: r.activity, fn, group: r.group, name: t(r.name, en), closed: r.status === 'closed' })
  }
  return out
}

// ---------- the economic classification of expenditure ----------

/** Kinds of spending, each a set of ЕБК paragraphs, in the order a tree shows them. */
export const ECONOMIC = [
  { id: 'staff', name: t('Заплати и осигуровки', 'Salaries & social contributions'), paragraphs: ['01', '02', '05', '08'] },
  { id: 'running', name: t('Издръжка', 'Running costs'), paragraphs: ['10', '19', '20'] },
  { id: 'benefits', name: t('Помощи, обезщетения и стипендии', 'Benefits & scholarships'), paragraphs: ['39', '40', '41', '42'] },
  { id: 'subsidies', name: t('Субсидии и членски внос', 'Subsidies & membership fees'), paragraphs: ['43', '44', '45', '46', '49'] },
  { id: 'capital', name: t('Капиталови разходи', 'Capital spending'), paragraphs: ['51', '52', '53', '54', '55', '56', '57'] },
  { id: 'interest', name: t('Лихви', 'Interest'), paragraphs: ['21', '22', '25', '26', '27', '28', '29'] },
  { id: 'reserve', name: t('Резерв', 'Reserve'), paragraphs: ['98'] },
] as const

export type EconomicGroup = (typeof ECONOMIC)[number]

/** Paragraphs of expenditure (section II of the ЕБК): official name, and ours in English. */
export const PARAGRAPHS: Record<string, LocalizedText> = {
  '01': t('Заплати и възнаграждения за персонала, нает по трудови и служебни правоотношения', 'Salaries of staff on employment and civil-service contracts'),
  '02': t('Други възнаграждения и плащания за персонала', 'Other staff pay and payments'),
  '05': t('Задължителни осигурителни вноски от работодатели', 'Employer social security and health contributions'),
  '08': t('Вноски за доброволно осигуряване', 'Voluntary insurance contributions'),
  '10': t('Издръжка', 'Running costs'),
  '19': t('Платени данъци, такси и административни санкции', 'Taxes, fees and administrative penalties paid'),
  '20': t('Разходи за банково обслужване и други финансови услуги', 'Banking and other financial services'),
  '21': t('Разходи за лихви по емисии на държавни (общински) ценни книжа', 'Interest on municipal bonds'),
  '22': t('Разходи за лихви по заеми от страната', 'Interest on domestic loans'),
  '25': t('Разходи за лихви по заеми от други държави', 'Interest on loans from other countries'),
  '26': t('Разходи за лихви по заеми от международни организации и институции', 'Interest on loans from international organisations'),
  '27': t('Разходи за лихви по заеми от банки и други финансови институции от чужбина', 'Interest on loans from foreign banks and financial institutions'),
  '28': t('Разходи за лихви и отстъпки по облигации, емитирани на международните капиталови пазари', 'Interest on bonds issued on international markets'),
  '29': t('Други разходи за лихви', 'Other interest'),
  '39': t('Здравноосигурителни плащания', 'Health insurance payments'),
  '40': t('Стипендии', 'Scholarships'),
  '41': t('Пенсии', 'Pensions'),
  '42': t('Текущи трансфери, обезщетения и помощи за домакинствата', 'Benefits and current transfers to households'),
  '43': t('Субсидии и други текущи трансфери за нефинансови предприятия', 'Subsidies to non-financial enterprises'),
  '44': t('Субсидии и други текущи трансфери за финансови институции', 'Subsidies to financial institutions'),
  '45': t('Субсидии и други текущи трансфери за юридически лица с нестопанска цел', 'Subsidies to non-profit organisations'),
  '46': t('Разходи за членски внос и участие в нетърговски организации и дейности', 'Membership fees of non-profit organisations'),
  '49': t('Предоставени текущи и капиталови трансфери за чужбина', 'Transfers abroad'),
  '51': t('Основен ремонт на дълготрайни материални активи', 'Major repairs of fixed assets'),
  '52': t('Придобиване на дълготрайни материални активи', 'Purchase of fixed assets'),
  '53': t('Придобиване на нематериални дълготрайни активи', 'Purchase of intangible assets'),
  '54': t('Придобиване на земя', 'Purchase of land'),
  '55': t('Капиталови трансфери', 'Capital transfers'),
  '56': t('Капиталови разходи', 'Capital spending'),
  '57': t('Прираст на държавния резерв и изкупуване на земеделска продукция', 'State reserve and purchases of farm produce'),
  '98': t('Резерв за непредвидени и неотложни разходи', 'Reserve for unforeseen and urgent spending'),
}

/** Sub-paragraphs of running costs (§ 10), the only paragraph a tree opens further. */
export const RUNNING_COSTS: Record<string, LocalizedText> = {
  '1011': t('Храна', 'Food'),
  '1012': t('Медикаменти', 'Medicines'),
  '1013': t('Постелен инвентар и облекло', 'Bedding and clothing'),
  '1014': t('Учебни и научно-изследователски разходи и книги за библиотеките', 'Teaching and research materials, library books'),
  '1015': t('Материали', 'Materials'),
  '1016': t('Вода, горива и енергия', 'Water, fuel and energy'),
  '1020': t('Разходи за външни услуги', 'External services'),
  '1030': t('Текущ ремонт', 'Current repairs'),
  '1051': t('Командировки в страната', 'Business travel in Bulgaria'),
  '1052': t('Краткосрочни командировки в чужбина', 'Short business trips abroad'),
  '1053': t('Дългосрочни командировки в чужбина', 'Long-term postings abroad'),
  '1062': t('Разходи за застраховки', 'Insurance'),
  '1063': t('Такса ангажимент по заеми', 'Loan commitment fees'),
  '1069': t('Други финансови услуги', 'Other financial services'),
  '1091': t('Други разходи за СБКО', 'Other staff welfare costs'),
  '1092': t('Разходи за договорни санкции и неустойки, съдебни обезщетения и разноски', 'Contract penalties, court damages and costs'),
  '1098': t('Други разходи, некласифицирани в другите параграфи и подпараграфи', 'Other running costs'),
}

/** The kind of spending of a paragraph ("52" → capital). */
export function economicGroupOf(paragraph: string): EconomicGroup {
  const group = ECONOMIC.find((g) => (g.paragraphs as readonly string[]).includes(paragraph))
  if (!group) throw new Error(`ЕБК: paragraph ${paragraph} has no kind of spending`)
  return group
}

/**
 * The last level of a tree for a row of a report: running costs (§ 10) by sub-paragraph, everything else by paragraph.
 * `code` is the four-digit ЕБК code of the row ("1016", or "5200" for a paragraph printed without sub-paragraphs).
 */
export function economicItemOf(paragraph: string, code: string): { code: string; label: string; name: LocalizedText } {
  if (paragraph === '10' && code !== '1000') {
    const name = RUNNING_COSTS[code]
    if (!name) throw new Error(`ЕБК: unknown sub-paragraph ${code} of running costs`)
    return { code, label: `${code.slice(0, 2)}-${code.slice(2)}`, name }
  }
  const name = PARAGRAPHS[paragraph]
  if (!name) throw new Error(`ЕБК: unknown paragraph ${paragraph}`)
  return { code: `${paragraph}00`, label: `${paragraph}-00`, name }
}
