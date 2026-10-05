// Who receives EU funds and farm subsidies: the classes of beneficiaries shown in the EU-funds lists
// (scripts/eufunds.ts, scripts/cap.ts). Legal entities are classified by name with the rules of the
// SEBRA payees (scripts/lib/sebra.ts), with cooperatives apart. Natural persons and sole traders are
// never named: the extractors leave their names out and the lists show them as one group each.

import type { LocalizedText } from '../../src/lib/types.ts'
import { classify, keyCore, keyForm, nameKey } from './sebra.ts'

const t = (bg: string, en: string): LocalizedText => ({ bg, en })

export type BeneficiaryClass = 'co' | 'cp' | 'np' | 'pu' | 'ot' | 'st' | 'pe'

export const BENEFICIARY_CLASSES: Record<BeneficiaryClass, LocalizedText> = {
  co: t('Фирми', 'Companies'),
  cp: t('Кооперации', 'Cooperatives'),
  np: t('Сдружения, фондации, читалища', 'Associations, foundations, community centres'),
  pu: t('Публичен сектор', 'Public sector'),
  ot: t('Други организации', 'Other organisations'),
  st: t('Еднолични търговци (без имена)', 'Sole traders (not named)'),
  pe: t('Физически лица (без имена)', 'Natural persons (not named)'),
}

/** Cooperatives: agricultural (ЗК, ЗКПУ, ЗПК, ЗСПК …), consumer (ПК, ППК) and workers’ (ТПК) ones. */
const COOPERATIVE = /(^| )(ЗК|ЗКПУ|ЗПК|ЗППК|ЗСПК|ЗКПТ|ППЗК|ОППК|ППК|ПТК|ТПК|ПК|КЗУ|ЗЕМЕДЕЛСКА КООПЕРАЦИЯ|КООПЕРАЦИЯ)( |$)/

/**
 * Names that begin like a public body (an agency, a ministry, a municipality, a directorate, a state fund) without a
 * company form: public, even when they go on with words that would otherwise mark an association ("… на
 * Европейския съюз").
 */
const PUBLIC_START = /^(ИЗПЪЛНИТЕЛНА АГЕНЦИЯ|ДЪРЖАВНА АГЕНЦИЯ|АГЕНЦИЯ|МИНИСТЕРСТВО|МИНИСТЕРСКИ СЪВЕТ|ОБЩИНА|СТОЛИЧНА ОБЩИНА|ОБЛАСТНА АДМИНИСТРАЦИЯ|ДИРЕКЦИЯ|ГЛАВНА ДИРЕКЦИЯ|РЕГИОНАЛНА ДИРЕКЦИЯ|КОМИСИЯ|ДЪРЖАВЕН ФОНД|ФОНД) /

/** The class of a legal entity, from its name. */
export function beneficiaryClass(name: string): Exclude<BeneficiaryClass, 'st' | 'pe'> {
  const key = nameKey(name)
  const core = keyCore(key)
  if (COOPERATIVE.test(core)) return 'cp'
  if (!keyForm(key) && PUBLIC_START.test(core)) return 'pu'
  const { cls } = classify(key, { bnb: 0, transfers: 0, total: 0 })
  return cls === 'company' ? 'co' : cls === 'nonprofit' ? 'np' : cls === 'public' ? 'pu' : 'ot'
}

/** What a list shows in place of the name of a beneficiary that is not named. */
export const UNNAMED: Record<'st' | 'pe', LocalizedText> = {
  st: t('Едноличен търговец', 'Sole trader'),
  pe: t('Физическо лице', 'Natural person'),
}
