import { useEffect, useState } from 'react'
import { getJson } from '../lib/data'
import { formatMoney, formatNumber } from '../lib/format'
import { useLang } from '../lib/i18n'
import { countText } from '../lib/listData'
import { useListIndex } from '../lib/lists'
import { navigate } from '../lib/route'
import type { DatasetInfo, Lang } from '../lib/types'

const TEXT: Record<
  Lang,
  {
    title: string
    intro: string
    sections: { h: string; p: string[] }[]
    datasets: string
    total: string
    population: string
    gdp: string
    updated: string
    sources: string
    lists: string
    rows: string
    asOf: string
    open: string
  }
> = {
  bg: {
    title: 'За данните',
    intro:
      'Сайтът показва публичните разходи на България — от общата сума до най-подробното ниво, което държавата публикува. Всичко се изчислява в браузъра ти; нищо не се изпраща към сървър.',
    sections: [
      {
        h: 'Как да чета диаграмата',
        p: [
          'Всеки пръстен показва подкатегориите на избраната категория. Натисни парче (или ред от списъка), за да влезеш навътре; „Нагоре“ или пътеката отгоре те връщат обратно.',
          'Процентите вътре в пръстена са спрямо текущата категория. Категориите под 1,5% се събират в сивото „Други“ — то също може да се отвори. Списъкът винаги показва всички подкатегории.',
          '„На човек“ дели сумата на населението в началото на годината. „% от БВП“ я показва като дял от брутния вътрешен продукт за същата година. „От моите данъци“ разпределя данъците, които въведеш в „Моите пари“ (по правилата за съответната година), пропорционално на разходите.',
        ],
      },
      {
        h: 'Години и версии',
        p: [
          'За всяка година има до три версии: план (бюджетът, гласуван от Народното събрание), отчет (реално изразходваното) и прогноза (средносрочната прогноза на Министерството на финансите — засега за 2027 г., докато проектобюджетът бъде внесен до 31 октомври 2026 г.).',
          'Плановете и отчетите са по функциите на консолидираната фискална програма — държава, общини, НОИ, НЗОК и европейски средства, без двойно броене на трансферите между тях — и използват едни и същи категории, затова могат да се сравняват пряко. Отчетите показват и през чий бюджет са минали парите и дали са текущи или капиталови разходи.',
          '„Евростат (COFOG)“ е отделен поглед върху отчета за 2024 г. по международната класификация, удобен за сравнение с други държави. Той е на начислена основа и затова сумите се различават малко от националния отчет.',
          '„Министерства“ показва бюджетите на министерствата и ведомствата по Закона за държавния бюджет, по политики и функционални области. За 2025 и 2026 г. всяка област е разделена и на бюджетни програми според постановлението на Министерския съвет за изпълнението на бюджета, а всяка програма — на ведомствени разходи (персонал, издръжка, капиталови разходи) и администрирани разходи (помощи, субсидии, вноски и други плащания, които ведомството управлява). Трансферите от министерствата към университетите и БАН не са техен разход; за 2026 г. те са показани в „По области“ (Образование и Наука).',
          '„Общини“ показва какво превежда централният бюджет на всяка от 265-те общини по Закона за държавния бюджет за годината: обща субсидия за делегираните от държавата дейности (училища, детски градини, социални услуги, общинска администрация и др., разделена по функции), обща изравнителна субсидия, целева субсидия за капиталови разходи, средства за зимното поддържане на общинските пътища и целеви трансфер за минималната работна заплата. Това е само част от парите на общините: те харчат и собствени приходи (местни данъци и такси) и европейски средства, които тук не са включени. Сумите на жител са спрямо населението на общината в началото на годината (НСИ).',
          'Бюджетите за 2024 и 2025 г. са в лева; тук всички суми са превърнати в евро по фиксирания курс 1,95583 лв. за 1 €.',
        ],
      },
      {
        h: 'Списъци: проекти, плащания, здравеопазване, европейски средства и обществени поръчки',
        p: [
          '„Списъци“ показва неща, които не се събират в бюджета, а са примери вътре в него. „Инвестиционни проекти“ са поименните проекти, за които държавата дава пари: приоритетните стратегически проекти на министерствата (програмата за 2026–2028 г. и планът и отчетът за 2025 г.) и проектите на общините по Инвестиционната програма за общински проекти. Те не са парчета от диаграмата, защото парите им вече са в капиталовите разходи и трансферите на министерствата и общините. Вместо това министерство или община с проекти в „Разходи“ има връзка към тях, а всеки проект — обратно към министерството или общината.',
          '„Кой получава парите“ са плащанията от 5 000 лв. (2 556,46 €) нагоре, които министерствата, фондовете и другите бюджетни организации правят през СЕБРА — системата за плащания на бюджета в БНБ — от юли 2022 до юни 2026 г.: 1,8 милиона плащания за 150 млрд. €, по данните, които Министерството на електронното управление публикува всяко тримесечие на data.egov.bg (свободни за повторна употреба, CC0). Те показват кой получава парите на всяко министерство и на всяко негово звено, всяко плащане от 1 млн. € нагоре и сборовете по вид плащане, сравнени с ежедневните данни на Министерството на финансите. Липсват заплатите, плащанията под 5 000 лв., общините без Столична (те не са в СЕБРА), службите за сигурност, НАП, Митниците и поверителните плащания.',
          'Имената на получателите са такива, каквито ги е написал платецът; изписванията на един и същ получател са събрани в едно по банковата сметка и по името, но сметките не се показват. Физическите лица и едноличните търговци не се назовават — по същите правила като в списъците с европейски средства — и са една група, без основанието на плащането. Плащанията към публичния сектор (общини, НОИ, НЗОК, министерства, училища …) са скрити, докато не бъдат избрани, за да не закриват доставчиците. Министерствата в „Разходи“ водят към своите получатели (кодът на системата им в СЕБРА × 100 е кодът им в ЕБК), а Столична община — към своите.',
          '„Здравеопазване“ показва какво плаща здравната каса (НЗОК) на всяка от 390-те болници и други лечебни заведения — по години и по месеци от януари 2024 до август 2026 г., за болнична помощ, медицински изделия и лекарства извън цената на клиничната пътека — по месечните отчети на касата, а за 165-те държавни и общински болници и приходите, разходите, задълженията, леглата и персонала им по данните на Министерството на здравеопазването (свързани с номерата на НЗОК по име). Общината на болницата е взета от регистрационния ѝ номер, а всяка община в „Разходи“ води към болниците си. В отчетите за 2024 и 2025 г. редът „Болнична помощ“ на НЗОК е разделен по региони и болници, защото плащанията по болници покриват 99,8–99,9% от него; остатъкът е отделно парче. „Лекарства“ показва колко е платила касата за всяко активно вещество от 2021 г. насам — в аптеките и в болниците извън цената на пътеката; тези суми са преди отстъпките, които фирмите връщат на касата, затова не са парчета от диаграмата. НЗОК обявява сайта си за защитен с авторско право; тук са само числата от отчетите ѝ, с връзка към тях.',
          '„Европейски средства“ показва програмите на ЕС в България за 2014–2020 и 2021–2027 г. — бюджет, получено от Европейската комисия и изплатено, общо и по години, по месечните данни на Министерството на финансите — и Плана за възстановяване и устойчивост по инвестиции; всички проекти на програмите с европейски средства в ИСУН (бенефициент, община, обща стойност и изплатено досега); и земеделските субсидии на Държавен фонд „Земеделие“ по мерки, по общини и по получатели. Физическите лица и едноличните търговци не се показват по име — само като брой и обща сума. Изразходваните европейски средства вече са в отчетите („Кой харчи: европейски средства“), затова тези списъци не са парчета от диаграмата: парчетата „Европейски средства“ в отчетите водят към програмите, а всяка община — към проектите и земеделските субсидии в нея.',
          '„Обществени поръчки“ показва договорите, които министерствата, общините, болниците, училищата и другите възложители сключват след обществена поръчка, по отворените данни на Агенцията по обществени поръчки на data.egov.bg (свободни за повторна употреба): 239 431 договора за 2016–2023 г. и за 2026 г. (до 30 септември), за 58,5 млрд. € без ДДС — всички договори от 2026 г. и по-големите от по-ранните години един по един, сборовете по категории (CPV), всеки изпълнител с възложителите, които купуват от него, и всеки възложител с изпълнителите си по години. За 2024 и 2025 г. Агенцията не е публикувала данни от платформата ЦАИС ЕОП като отворени данни; за тях има отделен, непълен списък от обявленията за възлагане в TED, Официалния вестник на ЕС — само поръчките над европейските прагове. Договорите са поети задължения, а не плащания, и нямат кодове от бюджетната класификация, затова не са парчета от диаграмата: министерствата и общините в „Разходи“ водят към страницата си като възложител, а изпълнител, чието име съвпада точно, — към плащанията към него в „Кой получава парите“; страницата му показва и броя и стойността на проектите му с европейски средства (по ЕИК). Физическите лица и едноличните търговци не се назовават.',
          'Списъците могат да се търсят, филтрират и подреждат; общата сума се преизчислява за показаните редове, а връзката към всеки изглед може да се сподели. Под всеки списък пише откъде е всяка колона и към коя дата са данните. Имената на проектите, получателите, бенефициентите, болниците, изпълнителите и възложителите са такива, каквито са публикувани.',
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
          'Сумите се показват закръглени до три значещи цифри. Повечето изходни таблици са в милиони или хиляди с една десетична, затова сборът на подкатегориите може да се различава от общата сума с до няколкостотин хиляди евро.',
        ],
      },
    ],
    datasets: 'Набори от данни',
    total: 'Общо разходи',
    population: 'Население за изчисленията на човек',
    gdp: 'БВП за изчисленията като % от БВП',
    updated: 'Данните са обновени',
    sources: 'Източници',
    lists: 'Списъци',
    rows: 'Редове',
    asOf: 'Данни към',
    open: 'Отвори списъка',
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
          '“Ministries” shows the budgets of ministries and agencies under the State Budget Act, by policy and functional area. For 2025 and 2026 each area is also split into budget programmes, from the government’s decree on implementing the budget, and each programme into departmental spending (staff, running costs, capital) and administered spending (benefits, subsidies, contributions and other payments the body manages). Ministries’ transfers to the universities and the Academy of Sciences are not their spending; for 2026 they are shown under “By purpose” (Education and Science).',
          '“Municipalities” shows what the central budget sends to each of the 265 municipalities under the year’s State Budget Act: the general subsidy for state-delegated activities (schools, kindergartens, social services, municipal administration etc., split by function), the general equalising subsidy, the targeted subsidy for capital spending, funds for the winter maintenance of municipal roads and a targeted transfer for the minimum wage. That is only part of municipalities’ money: they also spend their own revenue (local taxes and fees) and EU funds, which are not included here. Amounts per resident use the municipality’s population at the start of the year (NSI).',
          'The 2024 and 2025 budgets were in leva; all amounts here are converted to euro at the fixed rate of 1.95583 leva per euro.',
        ],
      },
      {
        h: 'Lists: projects, payments, health, EU funds and public procurement',
        p: [
          '“Lists” shows things that do not add up to the budget but are examples inside it. “Investment projects” are the named projects the state pays for: the ministries’ priority strategic projects (the 2026–2028 programme, and the 2025 plan and outturn) and the municipalities’ projects in the Investment Programme for Municipal Projects. They are not slices of the chart, because their money is already in the ministries’ and municipalities’ capital spending and transfers. Instead, a ministry or municipality with projects links to them from “Spending”, and every project links back to its ministry or municipality.',
          '“Who gets paid” holds the payments of 5,000 leva (€2,556.46) or more that ministries, funds and other budget bodies make through SEBRA — the budget’s payment system at the central bank — from July 2022 to June 2026: 1.8 million payments, €150 bn, from the files the Ministry of e-Government publishes every quarter on data.egov.bg (free to reuse, CC0). They show who receives the money of every ministry and of each of its units, every single payment of €1 m or more, and the totals by type of payment, set against the Ministry of Finance’s daily figures. Missing are salaries, payments under 5,000 leva, municipalities other than Sofia (they are not in SEBRA), the security services, the tax agency, Customs and confidential payments.',
          'Payee names are as the payer typed them; the spellings of one payee are grouped by bank account and by name, but accounts are never shown. Natural persons and sole traders are not named — by the same rules as in the EU-funds lists — and are one group, without the purpose of the payment. Payments to the public sector (municipalities, the social security institute, the health insurance fund, ministries, schools …) are hidden until chosen, so they do not crowd out the suppliers. Ministries in “Spending” link to their payees (their SEBRA system code × 100 is their code in the Unified Budget Classification), and so does Sofia Municipality.',
          '“Health” shows what the health insurance fund (NHIF) pays each of 390 hospitals and other medical establishments — by year and by month from January 2024 to August 2026, for hospital care, medical devices and medicines outside the clinical-pathway price — from the fund’s monthly reports, and, for the 165 state and municipal hospitals, their revenue, costs, liabilities, beds and staff from the Ministry of Health’s data (matched to the NHIF numbers by name). A hospital’s municipality comes from its registration number, and every municipality in “Spending” links to its hospitals. In the 2024 and 2025 actuals the NHIF’s hospital-care line is split by region and hospital, because the payments by hospital cover 99.8–99.9% of it; the rest is a separate slice. “Medicines” shows what the fund paid for each active ingredient since 2021 — in pharmacies and in hospitals outside the pathway price; these amounts are before the discounts companies pay back to the fund, so they are not slices of the chart. The NHIF marks its site as copyrighted; only the figures from its reports are used here, with links to them.',
          '“EU funds” shows the EU programmes in Bulgaria for 2014–2020 and 2021–2027 — budget, what the European Commission has paid in and what has been paid out, in all and by year, from the Ministry of Finance’s monthly data — and the Recovery and Resilience Plan by investment; every project of the EU-funded programmes in UMIS (ИСУН, the EU-funds information system: beneficiary, municipality, total value and paid to date); and the farm subsidies of the State Fund Agriculture by measure, municipality and recipient. Natural persons and sole traders are not named — they are only counted and totalled. EU-funded spending is already in the actuals (“Spent by: EU funds”), so these lists are not slices of the chart: the actuals’ EU-funds slices lead to the programmes, and every municipality to its projects and farm subsidies.',
          '“Public procurement” shows the contracts that ministries, municipalities, hospitals, schools and other buyers sign after a procurement procedure, from the Public Procurement Agency’s open data on data.egov.bg (free to reuse): 239,431 contracts of 2016–2023 and of 2026 (to 30 September), €58.5 bn excluding VAT — every 2026 contract and the larger ones of earlier years one by one, totals by CPV category, every supplier with the buyers that buy from it, and every buyer with its suppliers by year. For 2024 and 2025 the agency has not published its e-procurement platform’s data as open data; for those years a separate, partial list holds the award notices in TED, the EU’s Official Journal — procurements above the EU thresholds only. Contracts are commitments, not payments, and carry no budget classification code, so they are not slices of the chart: ministries and municipalities in “Spending” link to their buyer page, and a supplier whose name matches exactly links to its payments in “Who gets paid”; its page also shows the number and value of its EU-funded projects (by company number). Natural persons and sole traders are not named.',
          'The lists can be searched, filtered and sorted; the total is recomputed for the rows shown, and every view has a link you can share. Under each list it says where each column comes from and the date of the data. Project, payee, beneficiary, hospital, supplier and buyer names are as published.',
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
          'Amounts are shown rounded to three significant digits. Most source tables are in millions or thousands with one decimal, so subcategories can differ from their total by a few hundred thousand euro.',
        ],
      },
    ],
    datasets: 'Datasets',
    total: 'Total spending',
    population: 'Population used for per-person figures',
    gdp: 'GDP used for “% of GDP”',
    updated: 'Data updated',
    sources: 'Sources',
    lists: 'Lists',
    rows: 'Rows',
    asOf: 'Data as of',
    open: 'Open the list',
  },
}

export function About() {
  const lang = useLang()
  const text = TEXT[lang]
  // Every dataset's description, sources and totals, without the trees (public/data/about.json).
  const [loaded, setLoaded] = useState<DatasetInfo[]>([])
  const lists = useListIndex()

  useEffect(() => {
    let alive = true
    getJson<DatasetInfo[]>('about.json').then(
      (all) => alive && setLoaded(all),
      () => {
        /* the page reads well without the dataset cards */
      },
    )
    return () => {
      alive = false
    }
  }, [])

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
        {loaded.map((dataset) => (
          <div key={dataset.id} className="dataset-card">
            <h3>
              {dataset.title[lang]} <span className="muted">· {dataset.subtitle[lang]}</span>
            </h3>
            <p>{dataset.description[lang]}</p>
            <dl>
              <dt>{text.total}</dt>
              <dd>{formatMoney(dataset.total, lang)}</dd>
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

      {lists.status === 'ready' && (
        <section>
          <h2>{text.lists}</h2>
          {lists.value.lists.filter((list) => !list.hidden).map((list) => (
            <div key={list.id} className="dataset-card">
              <h3>{list.title[lang]}</h3>
              <p>{list.description[lang]}</p>
              <dl>
                <dt>{text.rows}</dt>
                <dd>
                  {countText(list, list.count, lang)} ·{' '}
                  <a
                    href={`#/lists?l=${list.id}`}
                    onClick={(e) => {
                      e.preventDefault()
                      navigate({ page: 'lists', params: { l: list.id } })
                    }}
                  >
                    {text.open}
                  </a>
                </dd>
                <dt>{text.asOf}</dt>
                <dd>{list.asOf}</dd>
                <dt>{text.sources}</dt>
                <dd>
                  <ul>
                    {list.sources.map((s) => (
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
      )}
    </article>
  )
}
