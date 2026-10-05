import { describe, expect, it } from 'vitest'
import { defaultTitle } from '../../clip/render'
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

  it('qualifies generic items with their category', () => {
    const admin = n('mof-5', 'Администрация', 'Administration')
    const mof = n('mof', 'Министерство на финансите', 'Ministry of Finance')
    expect(defaultTitle([root, mof, admin], 'bg')).toBe('Колко харчи България за „Министерство на финансите — Администрация“?')
  })
})
