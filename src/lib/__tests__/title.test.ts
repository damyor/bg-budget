import { describe, expect, it } from 'vitest'
import { defaultTitle } from '../../clip/caption'
import type { BudgetNode } from '../types'

const n = (id: string, bg: string, en: string, kind?: { bg: string; en: string }): BudgetNode => ({ id, name: { bg, en }, value: 1, kind })

const root = n('root', 'Всички публични разходи', 'All public spending')
const education = n('education', 'Образование', 'Education')
const schools = n('ed-municipal', 'Детски градини и училища', 'Kindergartens & schools')
const province = n('ed-plovdiv', 'Област Пловдив', 'Plovdiv Province', { bg: 'Област (регион)', en: 'Province' })
const town = n('ed-plovdiv-plovdiv', 'Община Пловдив', 'Plovdiv municipality', { bg: 'Община', en: 'Municipality' })

describe('defaultTitle', () => {
  it('asks about the whole budget at the root', () => {
    expect(defaultTitle([root], 'bg')).toBe('Накъде отиват публичните пари на България?')
  })

  it('names a category directly', () => {
    expect(defaultTitle([root, education], 'bg')).toBe('Колко харчи България за „Образование“?')
    expect(defaultTitle([root, education], 'en')).toBe('How much does Bulgaria spend on “Education”?')
  })

  it('puts places in the context of what the money is for', () => {
    expect(defaultTitle([root, education, schools, province, town], 'bg')).toBe('Община Пловдив: колко за „Детски градини и училища“?')
    expect(defaultTitle([root, education, schools, province, town], 'en')).toBe('Plovdiv municipality: how much for “Kindergartens & schools”?')
  })

  it('qualifies a programme’s staff and running costs with the programme', () => {
    const departmental = { bg: 'Ведомствен разход', en: 'Departmental spending' }
    const ministry = n('mes', 'Министерство на образованието и науката', 'Ministry of Education and Science')
    const programme = n('p1700-01-03', 'Училищно образование', 'School education', { bg: 'Бюджетна програма', en: 'Budget programme' })
    const staff = n('p1700-01-03-staff', 'Персонал', 'Staff costs', departmental)
    const delegated = n('p1700-01-03-staff-delegated', 'Персонал в делегираните бюджети', 'Staff in delegated budgets', departmental)
    expect(defaultTitle([root, ministry, programme, staff], 'bg')).toBe('Колко харчи България за „Училищно образование — Персонал“?')
    expect(defaultTitle([root, ministry, programme, staff, delegated], 'en')).toBe(
      'How much does Bulgaria spend on “School education — Staff in delegated budgets”?',
    )
    // Named benefits stand on their own.
    const heating = n('p1500-03-01-heating-aid', 'Помощи за отопление', 'Heating aid', { bg: 'Администриран разход', en: 'Administered spending' })
    expect(defaultTitle([root, ministry, programme, heating], 'bg')).toBe('Колко харчи България за „Помощи за отопление“?')
  })

  it('asks what a municipality gets from the state budget', () => {
    const transfers = n('root', 'Трансфери от централния бюджет за общините', 'Central-budget transfers to municipalities')
    const plovdiv = n('plovdiv', 'Област Пловдив', 'Plovdiv Province', { bg: 'Област (регион)', en: 'Province' })
    const city = n('plovdiv-plovdiv', 'Община Пловдив', 'Plovdiv municipality', { bg: 'Община', en: 'Municipality' })
    const equalising = n('plovdiv-plovdiv-equalising', 'Обща изравнителна субсидия', 'General equalising subsidy')
    expect(defaultTitle([transfers], 'bg', 'municipalities')).toBe('Колко пари получават общините от държавния бюджет?')
    expect(defaultTitle([transfers, plovdiv], 'en', 'municipalities')).toBe('How much do the municipalities of Plovdiv Province get from the state budget?')
    expect(defaultTitle([transfers, plovdiv, city], 'bg', 'municipalities')).toBe('Колко получава Община Пловдив от държавния бюджет?')
    expect(defaultTitle([transfers, plovdiv, city, equalising], 'en', 'municipalities')).toBe('Plovdiv municipality: how much for “General equalising subsidy”?')
  })

  it('qualifies generic items with their category', () => {
    const admin = n('mof-5', 'Администрация', 'Administration')
    const mof = n('mof', 'Министерство на финансите', 'Ministry of Finance')
    expect(defaultTitle([root, mof, admin], 'bg')).toBe('Колко харчи България за „Министерство на финансите — Администрация“?')
  })
})
