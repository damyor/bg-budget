import { useState } from 'react'
import { Segmented } from '../components/Segmented'
import { useDataset } from '../lib/data'
import { STAGE_LABEL, versionsFor } from '../lib/datasets'
import { formatMoneyExact, formatNumber, formatPercent } from '../lib/format'
import { useLang } from '../lib/i18n'
import { seriesVar } from '../lib/palette'
import { navigate, useRoute } from '../lib/route'
import { slicesFor } from '../lib/tree'
import { calculateTaxes, TAX_LABELS, taxFreedomDay, type FuelType, type TaxKey } from '../lib/tax/calc'
import { BGN_PER_EUR, CURRENT_TAX_YEAR, TAX_YEARS, paramsFor } from '../lib/tax/params'
import { useTaxProfile } from '../lib/taxProfile'
import { publicTotal, type DatasetIndexEntry, type Lang } from '../lib/types'

const SLOT: Record<TaxKey, number> = {
  incomeTax: 0,
  employeeContrib: 1,
  employerContrib: 2,
  vat: 3,
  exciseFuel: 4,
  exciseTobacco: 5,
  exciseAlcohol: 6,
}

const TEXT = {
  bg: {
    title: 'Моите пари',
    intro: 'Колко плащаш към публичния бюджет — от заплатата и от покупките — и накъде отиват тези пари. Избери година, за да видиш правилата и бюджета за нея.',
    year: 'Година',
    proposed: 'Параметрите за {year} г. са предложенията на Министерството на финансите в бюджетната процедура (минимална заплата {min}, максимален осигурителен доход {max}) — законът още не е приет.',
    salary: 'Брутна месечна заплата',
    inLeva: '= {amount} лв. (през {year} г. заплатите са били в лева)',
    minWage: 'Минимална',
    avgWage: 'Средна',
    doubleWage: '2× средна',
    employer: 'Включи осигуровките, които работодателят плаща върху заплатата ти',
    employerHint: 'Те не се виждат във фиша, но са част от цената на труда ти.',
    shopping: 'Пазаруване',
    spendShare: 'Каква част от нетния доход харчиш',
    fuel: 'Гориво на месец',
    petrol: 'Бензин',
    diesel: 'Дизел',
    litres: 'л',
    cigarettes: 'Кутии цигари седмично',
    beers: 'Бири (0,5 л) седмично',
    spirits: 'Бутилки ракия/водка (0,7 л) месечно',
    reset: 'Върни стандартните стойности',
    yearly: 'Годишно към публичния бюджет · {year}',
    perMonth: 'на месец',
    ofCost: 'от {base}',
    ofLabor: 'това, което струваш на работодателя си',
    ofGross: 'брутната ти заплата',
    freedom: 'През {year} г. работиш за държавата до {date} — след това за себе си.',
    breakdown: 'Откъде идват',
    where: 'Накъде отиват',
    perYearShort: 'годишно',
    perMonthShort: 'на месец',
    whereHint: 'Разпределени пропорционално на разходите в „{dataset}“.',
    explore: 'Разгледай бюджета с моите данъци',
    clip: 'Направи клип с моя дял',
    pillar2:
      'Още {amount} годишно отиват в личната ти партида в универсален пенсионен фонд (втори стълб). Те са твои и не влизат в бюджета, затова не са включени.',
    net: 'Нетна заплата: {amount} на месец',
    byYear: 'През различните години',
    byYearMine: 'Моята заплата',
    byYearAverage: 'Средната заплата за годината',
    byYearHint: 'Същите покупки; променят се ставките, таванът на осигуровките и акцизите.',
    byYearSame: 'За тази заплата правилата са едни и същи във всички години — разлики има само над тавана на осигуровките и при акциза върху цигарите.',
    colYear: 'Година',
    colGross: 'Брутна заплата',
    colTotal: 'Годишно',
    colRate: 'Дял',
    colFreedom: 'Работиш за държавата до',
    proposedShort: 'проект',
    method: 'Как се смята',
    methodItems: [
      'Осигуровките са по ставките за {year} г. за работник, роден след 1959 г., върху заплата до максималния осигурителен доход ({max}). Вноската за трудова злополука е минималната (0,4%); {gvrs}.',
      'Данъкът върху доходите е 10% от брутната заплата минус личните осигуровки.',
      'ДДС се изчислява върху изхарчената част от нетния доход: приемаме, че {taxable} от покупките са с 20% ДДС (наемите, финансовите и някои други услуги са освободени).',
      'Акцизите са по ставките от Закона за акцизите и данъчните складове: {petrol} на литър бензин, {diesel} на литър дизел, {cig} в кутия цигари ({cigNote}), {beer} в бира 0,5 л и {spirits} в бутилка 0,7 л 40% алкохол.',
      'Стандартната заплата е {avgNote}.',
      'Не са включени местните данъци (за имот, превозно средство, смет), данъкът върху дивидентите и мита.',
      'Разпределението по категории е пропорционално: всеки данък отива в общия „кош“, от който се плащат всички разходи. Част от разходите се покриват и от европейски средства и от нов дълг.',
    ],
    levaNote: 'Сумите в лева са превърнати в евро по фиксирания курс 1,95583 лв. за 1 €.',
  },
  en: {
    title: 'My money',
    intro: 'How much you pay into public budgets — through your salary and your shopping — and where that money goes. Pick a year to see its rules and its budget.',
    year: 'Year',
    proposed: 'The {year} parameters are the Ministry of Finance proposals in the budget procedure (minimum wage {min}, contribution ceiling {max}) — not yet law.',
    salary: 'Gross monthly salary',
    inLeva: '= BGN {amount} (salaries were paid in leva in {year})',
    minWage: 'Minimum',
    avgWage: 'Average',
    doubleWage: '2× average',
    employer: 'Include the contributions your employer pays on your salary',
    employerHint: "They aren't on your payslip, but they are part of what your work costs.",
    shopping: 'Shopping',
    spendShare: 'Share of net income you spend',
    fuel: 'Fuel per month',
    petrol: 'Petrol',
    diesel: 'Diesel',
    litres: 'l',
    cigarettes: 'Packs of cigarettes a week',
    beers: 'Beers (0.5 l) a week',
    spirits: 'Bottles of rakia/vodka (0.7 l) a month',
    reset: 'Reset to defaults',
    yearly: 'A year into public budgets · {year}',
    perMonth: 'a month',
    ofCost: 'of {base}',
    ofLabor: 'what you cost your employer',
    ofGross: 'your gross salary',
    freedom: 'In {year} you work for the state until {date} — after that, for yourself.',
    breakdown: 'Where it comes from',
    where: 'Where it goes',
    perYearShort: 'a year',
    perMonthShort: 'a month',
    whereHint: 'Split in proportion to spending in “{dataset}”.',
    explore: 'Explore the budget with my taxes',
    clip: 'Make a clip with my share',
    pillar2:
      'Another {amount} a year goes to your personal second-pillar pension account. It stays yours and is not part of the budget, so it is not included.',
    net: 'Net salary: {amount} a month',
    byYear: 'Across the years',
    byYearMine: 'My salary',
    byYearAverage: 'That year’s average wage',
    byYearHint: 'The same shopping; rates, the contribution ceiling and excise change.',
    byYearSame: 'For this salary the rules are the same in every year — they differ only above the contribution ceiling and in tobacco excise.',
    colYear: 'Year',
    colGross: 'Gross salary',
    colTotal: 'A year',
    colRate: 'Share',
    colFreedom: 'You work for the state until',
    proposedShort: 'draft',
    method: 'How it is calculated',
    methodItems: [
      'Contributions use the {year} rates for an employee born after 1959, on pay up to the contribution ceiling ({max}). The work-accident contribution is the minimum (0.4%); {gvrs}.',
      'Income tax is 10% of gross pay minus your own contributions.',
      'VAT is estimated on the part of net income you spend: we assume {taxable} of purchases carry 20% VAT (rent, financial and some other services are exempt).',
      'Excise uses the rates in the Excise Duties Act: {petrol} per litre of petrol, {diesel} per litre of diesel, {cig} per pack of cigarettes ({cigNote}), {beer} per 0.5 l beer and {spirits} per 0.7 l bottle of 40% spirits.',
      'The default salary is {avgNote}.',
      'Local taxes (property, vehicle, waste), dividend tax and customs duties are not included.',
      'The split by category is proportional: every tax goes into the common pot that pays for all spending. Part of spending is also covered by EU funds and new borrowing.',
    ],
    levaNote: 'Amounts in leva are converted to euro at the fixed rate of 1.95583 leva per euro.',
  },
} satisfies Record<Lang, unknown>

const fill = (s: string, vars: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`)

interface NumberFieldProps {
  label: string
  value: number
  onChange: (v: number) => void
  suffix?: string
  step?: number
  max?: number
  hint?: string
}

function NumberField({ label, value, onChange, suffix, step = 1, max, hint }: NumberFieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="number-input">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          max={max}
          step={step}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
        />
        {suffix && <span className="number-suffix">{suffix}</span>}
      </span>
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function MyMoney({ datasets }: { datasets: DatasetIndexEntry[] }) {
  const lang = useLang()
  const text = TEXT[lang]
  const route = useRoute()
  const { inputs, resultFor, update, reset } = useTaxProfile()
  const [yearBasis, setYearBasis] = useState<'mine' | 'average'>('mine')
  // The year comes from the page's own parameter, else from the dataset open in "Spending".
  const fromDataset = datasets.find((d) => d.id === route.params.d)?.year
  const year = [Number(route.params.y), fromDataset].find((y): y is number => y !== undefined && TAX_YEARS.includes(y)) ?? CURRENT_TAX_YEAR
  const params = paramsFor(year)!
  const result = resultFor(year)!

  // The budget the taxes are split across: the year's actual outturn when there is one, else its plan.
  const versions = versionsFor(datasets, year, 'functions')
  const entry =
    versions.find((d) => d.id === route.params.d) ?? versions.find((d) => d.kind === 'actual') ?? versions[0] ?? datasets[0]
  const loaded = useDataset(entry)

  const setParams = (patch: Record<string, string>) => navigate({ page: 'me', params: { ...route.params, ...patch } }, { replace: true })
  const money = (v: number) => formatMoneyExact(v, lang)
  const cents = (v: number) => formatMoneyExact(v, lang, 2)
  const dateText = (d: Date) => d.toLocaleDateString(lang === 'bg' ? 'bg-BG' : 'en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' })

  const freedom = dateText(taxFreedomDay(result.rate, year))
  const lines = result.lines.filter((l) => l.annual > 0.5)
  const wageChips = [
    { label: text.minWage, value: params.minWageMonthly },
    { label: text.avgWage, value: params.averageWageMonthly },
    { label: text.doubleWage, value: params.averageWageMonthly * 2 },
  ]

  const dataset = loaded.status === 'ready' && loaded.value.dataset.id === entry.id ? loaded.value.dataset : null
  const groups = dataset ? [...(dataset.root.children ?? [])].sort((a, b) => b.value - a.value) : []
  const maxGroup = groups[0]?.value ?? 1
  // Same colours as the first ring of the spending chart.
  const slotOf = new Map(dataset ? slicesFor(dataset.root).map((sl) => [sl.node.id, sl.slot] as const) : [])
  const leva = params.currency === 'BGN'

  return (
    <div className="money">
      <section className="money-inputs">
        <h1 className="page-title">{text.title}</h1>
        <p className="muted">{text.intro}</p>

        <div className="panel-group">
          <Segmented
            label={text.year}
            value={String(year)}
            onChange={(y) => setParams({ y, d: '' })}
            options={TAX_YEARS.map((y) => ({ value: String(y), label: String(y) }))}
          />
          {params.status === 'proposed' && (
            <p className="note">{fill(text.proposed, { year: String(year), min: money(params.minWageMonthly), max: money(params.maxInsurableMonthly) })}</p>
          )}
          <NumberField
            label={text.salary}
            value={inputs.gross}
            onChange={(gross) => update({ gross })}
            suffix="€"
            step={10}
            hint={leva ? fill(text.inLeva, { amount: formatNumber(inputs.gross * BGN_PER_EUR, lang), year: String(year) }) : undefined}
          />
          <div className="chips">
            {wageChips.map((c) => (
              <button key={c.label} type="button" className="chip" onClick={() => update({ gross: Math.round(c.value) })}>
                {c.label} · {money(Math.round(c.value))}
              </button>
            ))}
          </div>
          <p className="muted small">{fill(text.net, { amount: money(result.netAnnual / 12) })}</p>
          <label className="check">
            <input type="checkbox" checked={inputs.includeEmployer} onChange={(e) => update({ includeEmployer: e.target.checked })} />
            <span>
              {text.employer}
              <span className="check-hint">{text.employerHint}</span>
            </span>
          </label>
        </div>

        <div className="panel-group">
          <h2 className="group-title">{text.shopping}</h2>
          <label className="field">
            <span className="field-label">
              {text.spendShare}: <strong>{formatPercent(inputs.spendShare, lang)}</strong>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={inputs.spendShare}
              onChange={(e) => update({ spendShare: Number(e.target.value) })}
            />
          </label>
          <div className="field-row">
            <NumberField label={text.fuel} value={inputs.fuelLitresPerMonth} onChange={(v) => update({ fuelLitresPerMonth: v })} suffix={text.litres} />
            <Segmented<FuelType>
              label={text.fuel}
              value={inputs.fuelType}
              onChange={(fuelType) => update({ fuelType })}
              options={[
                { value: 'petrol', label: text.petrol },
                { value: 'diesel', label: text.diesel },
              ]}
            />
          </div>
          <NumberField label={text.cigarettes} value={inputs.cigarettePacksPerWeek} onChange={(v) => update({ cigarettePacksPerWeek: v })} />
          <NumberField label={text.beers} value={inputs.beersPerWeek} onChange={(v) => update({ beersPerWeek: v })} />
          <NumberField label={text.spirits} value={inputs.spiritBottlesPerMonth} onChange={(v) => update({ spiritBottlesPerMonth: v })} />
          <button type="button" className="link-btn" onClick={reset}>
            {text.reset}
          </button>
        </div>
      </section>

      <section className="money-results">
        <div className="detail-card">
          <p className="eyebrow">{fill(text.yearly, { year: String(year) })}</p>
          <p className="hero-figure">{money(result.totalAnnual)}</p>
          <ul className="facts">
            <li>
              <strong>{money(result.totalAnnual / 12)}</strong> {text.perMonth}
            </li>
            <li>
              <strong>{formatPercent(result.rate, lang)}</strong> {fill(text.ofCost, { base: inputs.includeEmployer ? text.ofLabor : text.ofGross })}
            </li>
          </ul>
          <p className="freedom">{fill(text.freedom, { year: String(year), date: freedom })}</p>
        </div>

        <div className="detail-card">
          <h2 className="group-title">{text.breakdown}</h2>
          <div className="stack-bar" role="img" aria-label={lines.map((l) => `${TAX_LABELS[l.key][lang]} ${money(l.annual)}`).join(', ')}>
            {lines.map((l) => (
              <span key={l.key} style={{ flexGrow: l.annual, background: seriesVar(SLOT[l.key]) }} title={`${TAX_LABELS[l.key][lang]}: ${money(l.annual)}`} />
            ))}
          </div>
          <table className="tax-table">
            <tbody>
              {lines.map((l) => (
                <tr key={l.key}>
                  <td>
                    <span className="row-key" style={{ background: seriesVar(SLOT[l.key]) }} aria-hidden="true" />
                    {TAX_LABELS[l.key][lang]}
                  </td>
                  <td className="num">{money(l.annual)}</td>
                  <td className="num muted">{formatPercent(l.annual / result.totalAnnual, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {result.pillar2Annual > 0 && <p className="muted small">{fill(text.pillar2, { amount: money(result.pillar2Annual) })}</p>}
        </div>

        <div className="detail-card">
          <div className="section-head">
            <h2 className="group-title">{text.where}</h2>
            {versions.length > 1 && (
              <Segmented
                label={text.where}
                value={entry.id}
                onChange={(d) => setParams({ d })}
                options={versions.map((d) => ({ value: d.id, label: STAGE_LABEL[d.stage][lang] }))}
              />
            )}
          </div>
          {dataset && <p className="muted small">{fill(text.whereHint, { dataset: dataset.title[lang] })}</p>}
          <div className="child-list-head where-head" aria-hidden="true">
            <span />
            <span>{text.perYearShort}</span>
            <span>{text.perMonthShort}</span>
          </div>
          <ul className="where-list">
            {groups.map((g) => {
              const mine = (g.value / publicTotal(dataset!)) * result.totalAnnual
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    className="row-inner"
                    onClick={() => {
                      update({})
                      navigate({ page: 'explore', params: { d: dataset!.id, n: g.id, m: 'mine' } })
                    }}
                  >
                    <span className="row-key" style={{ background: seriesVar(slotOf.get(g.id) ?? 'other') }} aria-hidden="true" />
                    <span className="row-name">{g.name[lang]}</span>
                    <span className="row-value">{money(mine)}</span>
                    <span className="row-share">{money(mine / 12)}</span>
                    <span className="row-bar" aria-hidden="true">
                      <span style={{ width: `${(g.value / maxGroup) * 100}%` }} />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                update({})
                navigate({ page: 'explore', params: { d: entry.id, m: 'mine' } })
              }}
            >
              {text.explore}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                update({})
                navigate({ page: 'clip', params: { d: entry.id } })
              }}
            >
              {text.clip}
            </button>
          </div>
        </div>

        <div className="detail-card">
          <div className="section-head">
            <h2 className="group-title">{text.byYear}</h2>
            <Segmented<'mine' | 'average'>
              label={text.byYear}
              value={yearBasis}
              onChange={setYearBasis}
              options={[
                { value: 'mine', label: text.byYearMine },
                { value: 'average', label: text.byYearAverage },
              ]}
            />
          </div>
          <p className="muted small">{text.byYearHint}</p>
          {(() => {
            const rows = TAX_YEARS.map((y) => {
              const p = paramsFor(y)!
              const gross = yearBasis === 'mine' ? inputs.gross : Math.round(p.averageWageMonthly)
              const r = yearBasis === 'mine' ? resultFor(y)! : calculateTaxes({ ...inputs, gross }, p)
              return { y, p, gross, r }
            })
            const same = yearBasis === 'mine' && rows.every((row) => Math.round(row.r.totalAnnual) === Math.round(rows[0].r.totalAnnual))
            return (
              <>
                <table className="tax-table by-year">
                  <thead>
                    <tr>
                      <th scope="col">{text.colYear}</th>
                      <th scope="col" className="num">
                        {text.colGross}
                      </th>
                      <th scope="col" className="num">
                        {text.colTotal}
                      </th>
                      <th scope="col" className="num">
                        {text.colRate}
                      </th>
                      <th scope="col" className="num hide-narrow">
                        {text.colFreedom}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ y, p, gross, r }) => (
                      <tr key={y} className={y === year ? 'selected' : undefined}>
                        <td>
                          <button type="button" className="link-btn" onClick={() => setParams({ y: String(y), d: '' })} aria-pressed={y === year}>
                            {y}
                          </button>
                          {p.status === 'proposed' && <span className="muted small"> · {text.proposedShort}</span>}
                        </td>
                        <td className="num">{money(gross)}</td>
                        <td className="num">{money(r.totalAnnual)}</td>
                        <td className="num">{formatPercent(r.rate, lang)}</td>
                        <td className="num hide-narrow">{dateText(taxFreedomDay(r.rate, y))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {same && <p className="muted small">{text.byYearSame}</p>}
              </>
            )
          })()}
        </div>

        <details className="method">
          <summary>{text.method}</summary>
          <ul>
            {text.methodItems.map((item) => (
              <li key={item}>
                {fill(item, {
                  year: String(year),
                  max: params.notes.maxInsurable[lang],
                  gvrs: params.notes.guaranteeFund[lang],
                  taxable: formatPercent(params.vat.taxableShareOfSpending, lang),
                  petrol: cents(params.excise.petrolPerLitre),
                  diesel: cents(params.excise.dieselPerLitre),
                  cig: cents(params.excise.cigarettesPerPack),
                  cigNote: params.notes.cigarettes[lang],
                  beer: cents(params.excise.beerPerBottle),
                  spirits: cents(params.excise.spiritsPerBottle),
                  avgNote: `${money(Math.round(params.averageWageMonthly))} — ${params.notes.averageWage[lang]}`,
                })}
              </li>
            ))}
            {params.notes.extra?.map((n) => <li key={n.bg}>{n[lang]}</li>)}
            {leva && <li>{text.levaNote}</li>}
          </ul>
          {params.sources.length > 0 && (
            <ul className="method-sources">
              {params.sources.map((src) => (
                <li key={src.url}>
                  <a href={src.url} target="_blank" rel="noreferrer">
                    {src.name[lang]}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </details>
      </section>
    </div>
  )
}
