import { useEffect, useState } from 'react'
import { loadDataset, type LoadedDataset } from '../lib/data'
import { formatMoney, formatNumber } from '../lib/format'
import { useLang } from '../lib/i18n'
import type { DatasetIndexEntry, Lang } from '../lib/types'

const TEXT: Record<Lang, { title: string; intro: string; sections: { h: string; p: string[] }[]; datasets: string; total: string; population: string; gdp: string; updated: string; sources: string }> = {
  bg: {
    title: 'За данните',
    intro:
      'Сайтът показва публичните разходи на България — от общата сума до най-подробното ниво, което държавата публикува. Всичко се изчислява в браузъра ти; нищо не се изпраща към сървър.',
    sections: [
      {
        h: 'Как да чета диаграмата',
        p: [
          'Всеки пръстен показва подкатегориите на избраната категория. Натисни парче (или ред от списъка), за да влезеш навътре; „Нагоре“ или пътеката отгоре те връщат обратно.',
          'Процентите вътре в пръстена са спрямо текущата категория. Категориите под 1,5% се събират в сивото „Други“ — то също може да се отвори. Списъкът вдясно винаги показва всички подкатегории.',
          '„На човек“ дели сумата на населението в началото на годината. „% от БВП“ я показва като дял от брутния вътрешен продукт за същата година. „От моите данъци“ разпределя данъците, които въведеш в „Моите пари“ (по правилата за съответната година), пропорционално на разходите.',
        ],
      },
      {
        h: 'Години и версии',
        p: [
          'За всяка година има до три версии: план (бюджетът, гласуван от Народното събрание), отчет (реално изразходваното) и прогноза (средносрочната прогноза на Министерството на финансите — засега за 2027 г., докато проектобюджетът бъде внесен до 31 октомври 2026 г.).',
          'Плановете и отчетите са по функциите на консолидираната фискална програма — държава, общини, НОИ, НЗОК и европейски средства, без двойно броене на трансферите между тях — и използват едни и същи категории, затова могат да се сравняват пряко. Отчетите показват и през чий бюджет са минали парите и дали са текущи или капиталови разходи.',
          '„Евростат (COFOG)“ е отделен поглед върху отчета за 2024 г. по международната класификация, удобен за сравнение с други държави. Той е на начислена основа и затова сумите се различават малко от националния отчет.',
          'Бюджетите за 2024 и 2025 г. са в лева; тук всички суми са превърнати в евро по фиксирания курс 1,95583 лв. за 1 €.',
        ],
      },
      {
        h: 'Сравнения',
        p: [
          '„През годините“ под всяка категория показва плана и отчета за всяка година в избраната мярка, а под отчета — каква част от плана е изпълнена. „Сравнение“ събира всички категории и години в една таблица.',
          'Делът от БВП е най-честната мярка за сравнение между години, защото отчита ръста на икономиката и цените. БВП за 2024 и 2025 г. е на Евростат, а за 2026 и 2027 г. — есенната прогноза на Министерството на финансите (2026). Официалните проценти в бюджета за 2026 г. са изчислени с по-стара, по-ниска прогноза за БВП и затова са по-високи.',
        ],
      },
      {
        h: 'Клиповете',
        p: [
          'Видеото се създава изцяло в браузъра (WebCodecs, H.264/MP4) и е готово за TikTok, Instagram Reels, YouTube Shorts и Facebook. Свободно си го споделяй — моля, остави реда с източника.',
        ],
      },
      {
        h: 'Закръгляне',
        p: [
          'Сумите се показват закръглени до три значещи цифри. Изходните данни са в милиони евро с една десетична, затова сборът на подкатегориите може да се различава от общата сума с до няколкостотин хиляди евро.',
        ],
      },
    ],
    datasets: 'Набори от данни',
    total: 'Общо разходи',
    population: 'Население за изчисленията на човек',
    gdp: 'БВП за изчисленията като % от БВП',
    updated: 'Данните са обновени',
    sources: 'Източници',
  },
  en: {
    title: 'About the data',
    intro:
      "This site shows Bulgaria's public spending — from the grand total down to the finest level the state publishes. Everything is computed in your browser; nothing is sent to a server.",
    sections: [
      {
        h: 'Reading the chart',
        p: [
          'Each ring shows the subcategories of the selected category. Click a slice (or a row in the list) to go deeper; “Up” or the trail at the top takes you back.',
          'Percentages inside the ring are relative to the current category. Categories under 1.5% are grouped into grey “Other”, which can be opened too. The list always shows every subcategory.',
          '“Per person” divides amounts by the population at the start of the year. “% of GDP” shows them as a share of that year’s gross domestic product. “From my taxes” splits the taxes you enter in “My money” (under that year’s rules) in proportion to spending.',
        ],
      },
      {
        h: 'Years and versions',
        p: [
          'Each year has up to three versions: the plan (the budget voted by Parliament), the actual outturn (what was really spent) and the forecast (the Ministry of Finance medium-term forecast — for now for 2027, until the draft budget is submitted by 31 October 2026).',
          'Plans and actuals follow the functions of the consolidated fiscal programme — central government, municipalities, social security, the health fund and EU funds, without double-counting transfers between them — and use the same categories, so they compare directly. The actuals also show whose budget the money went through and whether it was current or capital spending.',
          '“Eurostat (COFOG)” is a separate view of the 2024 outturn in the international classification, handy for comparing with other countries. It is on an accrual basis, so its amounts differ slightly from the national report.',
          'The 2024 and 2025 budgets were in leva; all amounts here are converted to euro at the fixed rate of 1.95583 leva per euro.',
        ],
      },
      {
        h: 'Comparisons',
        p: [
          '“Over the years” under each category shows the plan and the actual for every year in the chosen measure, and under the actual the share of the plan that was spent. “Compare” puts every category and year in one table.',
          'The share of GDP is the fairest measure across years, as it accounts for economic growth and prices. GDP for 2024 and 2025 is Eurostat’s; for 2026 and 2027 it is the Ministry of Finance autumn 2026 forecast. The official shares in the 2026 budget used an older, lower GDP forecast, so they are higher.',
        ],
      },
      {
        h: 'The clips',
        p: [
          'Videos are created entirely in your browser (WebCodecs, H.264/MP4) and are ready for TikTok, Instagram Reels, YouTube Shorts and Facebook. Share them freely — please keep the source line.',
        ],
      },
      {
        h: 'Rounding',
        p: [
          'Amounts are shown rounded to three significant digits. Source data are in millions of euro with one decimal, so subcategories can differ from their total by a few hundred thousand euro.',
        ],
      },
    ],
    datasets: 'Datasets',
    total: 'Total spending',
    population: 'Population used for per-person figures',
    gdp: 'GDP used for “% of GDP”',
    updated: 'Data updated',
    sources: 'Sources',
  },
}

export function About({ datasets }: { datasets: DatasetIndexEntry[] }) {
  const lang = useLang()
  const text = TEXT[lang]
  const [loaded, setLoaded] = useState<LoadedDataset[]>([])

  useEffect(() => {
    let alive = true
    Promise.all(datasets.map(loadDataset)).then((all) => alive && setLoaded(all))
    return () => {
      alive = false
    }
  }, [datasets])

  return (
    <article className="prose">
      <h1 className="page-title">{text.title}</h1>
      <p className="lead">{text.intro}</p>

      {text.sections.map((s) => (
        <section key={s.h}>
          <h2>{s.h}</h2>
          {s.p.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </section>
      ))}

      <section>
        <h2>{text.datasets}</h2>
        {loaded.map(({ dataset }) => (
          <div key={dataset.id} className="dataset-card">
            <h3>
              {dataset.title[lang]} <span className="muted">· {dataset.subtitle[lang]}</span>
            </h3>
            <p>{dataset.description[lang]}</p>
            <dl>
              <dt>{text.total}</dt>
              <dd>{formatMoney(dataset.root.value, lang)}</dd>
              <dt>{text.population}</dt>
              <dd>
                {formatNumber(dataset.population, lang)} <span className="muted">({dataset.populationNote[lang]})</span>
              </dd>
              <dt>{text.gdp}</dt>
              <dd>
                {formatMoney(dataset.gdp, lang)} <span className="muted">({dataset.gdpNote[lang]})</span>
              </dd>
              <dt>{text.updated}</dt>
              <dd>{dataset.retrieved}</dd>
              <dt>{text.sources}</dt>
              <dd>
                <ul>
                  {dataset.sources.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noreferrer">
                        {s.name[lang]}
                      </a>
                    </li>
                  ))}
                </ul>
              </dd>
            </dl>
          </div>
        ))}
      </section>
    </article>
  )
}
