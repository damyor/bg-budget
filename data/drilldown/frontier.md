# The drill-down frontier

Where the data stops, written by `npm run data` (scripts/lib/drilldown.ts); do not edit by hand. How a round of
drilling down works, and what the columns mean: [docs/drilldown.md](../../docs/drilldown.md).

## Depth by dataset

Depth: leaf depth weighted by money (root = 0; area = 1). The three shares count each leaf once. Remainders: in
remainder boxes of €1 m or more (computed as a difference; rounding left out). Economic split: in leaves that only
split by economic category (current / capital, staff / running costs / capital, ЕБК paragraphs, Eurostat
transactions). ≤ 2 levels: in other leaves that are an area, function or sub-function.

| Dataset | Family | Total, € m | Depth | ≤ 2 levels | Remainders | Economic split | Open boxes |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| budget-2024 | functions | 41,674.9 | 3.34 | 1.3% | 21.0% | 11.5% | 1824 |
| report-2024 | functions | 39,972.2 | 3.85 | 0.0% | 1.8% | 47.3% | 504 |
| budget-2025 | functions | 49,445.0 | 3.37 | 1.5% | 19.3% | 14.7% | 1894 |
| report-2025 | functions | 47,508.7 | 3.85 | 1.2% | 0.6% | 50.2% | 509 |
| budget-2026 | functions | 56,807.2 | 3.33 | 2.5% | 23.6% | 13.7% | 1926 |
| budget-2027 | functions | 55,972.1 | 2.58 | 55.1% | 19.4% | 0.0% | 1478 |
| ministries-2024 | ministries | 8,738.1 | 3.38 | 8.1% | 0.0% | 57.3% | 542 |
| ministries-2025 | ministries | 12,439.5 | 3.49 | 6.2% | 0.0% | 60.9% | 619 |
| ministries-report-2025 | ministries | 12,225.7 | 1.96 | 99.9% | 0.0% | 0.0% | 110 |
| ministries-2026 | ministries | 13,326.5 | 3.51 | 6.2% | 0.0% | 60.5% | 621 |
| ministries-2027 | ministries | 14,395.0 | 1.97 | 99.8% | 0.0% | 0.0% | 110 |
| municipalities-2024 | municipalities | 4,025.1 | 3.81 | 0.4% | 0.0% | 0.0% | 2896 |
| municipalities-2025 | municipalities | 4,563.7 | 3.82 | 0.4% | 0.0% | 0.0% | 2898 |
| municipalities-2026 | municipalities | 4,928.0 | 3.82 | 0.4% | 0.0% | 0.0% | 2896 |
| municipalities-2027 | municipalities | 5,162.1 | 3.83 | 0.3% | 0.0% | 0.0% | 2631 |
| cities-2024 | cities | 1,989.9 | 4.87 | 0.6% | 0.0% | 98.4% | 213 |
| cities-2025 | cities | 2,325.5 | 4.90 | 0.6% | 0.0% | 99.1% | 209 |
| eurostat-2024 | cofog | 41,059.6 | 3.01 | 4.6% | 0.0% | 95.4% | 47 |

## Open boxes

Largest first: the top 40 of each "by purpose" dataset and the top 15 of the others. State and first lead come from
`data/drilldown/ledger.json`.

### budget-2024 — Budget 2024

1824 open boxes, €24,500.0 m (58.8% of the total).

| € m | Share | Path | Depth | Why open | State | First lead |
| ---: | ---: | --- | ---: | --- | --- | --- |
| 2,304.0 | 5.5% | Икономика и транспорт › Други икономически дейности › Други разходи за икономически дейности `e-other.rest` | 3 | remainder | todo | The national capital programme: Table III-1 of the forecast 2024–2026 says in a note „За 2024-2026 г. разходите за наци… (script) |
| 1,826.7 | 4.4% | Здравеопазване › Здравна каса (НЗОК) › Болнична помощ `h-nhif-hospital` | 3 | leaf | todo | A link (graft mode=link) to the same box in the actuals, split by region and hospital from the НЗОК monthly reports (script) |
| 1,334.3 | 3.2% | Икономика и транспорт › Енергетика, горива и минно дело › Фонд „Сигурност на електроенергийната система“ `e-energy.fses` | 3 | leaf | todo | fses.bg „Отчети за дейността“: monthly „Отчет приходи и разходи“ of the fund (2021 – October 2026) — to verify whether… (script) |
| 972.8 | 2.3% | Комунални дейности, култура и околна среда › Жилища, благоустройство и комунални дейности › Други разходи за жилища и благоустройство `c-housing.rest` | 3 | remainder | todo | MoF EU programme tables (data.egov.bg 4226, 18860), the Recovery Plan by investment (18958) and the ИСУН projects ("Lis… (script) |
| 882.5 | 2.1% | Икономика и транспорт › Транспорт и съобщения › Други разходи за транспорт и съобщения `e-transport.rest` | 3 | remainder | todo | MoF EU programme tables (data.egov.bg 4226, 18860), the Recovery Plan by investment (18958) and the ИСУН projects ("Lis… (script) |
| 831.4 | 2.0% | Образование › Други разходи за образование `ed-other` | 2 | remainder | todo | Municipalities' own funds for education: no national plan table; the big cities' B3 give actuals for 3 cities only (script) |
| 713.2 | 1.7% | Комунални дейности, култура и околна среда › Опазване на околната среда › Други разходи за околна среда `c-environment.rest` | 3 | remainder | todo | MoF EU programme tables (data.egov.bg 4226, 18860), the Recovery Plan by investment (18958) and the ИСУН projects ("Lis… (script) |
| 670.2 | 1.6% | Икономика и транспорт › Земеделие, гори, лов и риболов › Сметка за средствата от Европейския съюз на Държавния фонд „Земеделие“ `e-agriculture.sfa-eu` | 3 | leaf | todo | State Fund Agriculture's EU account by ЕБК activity or paragraph (its annual budget and report, or the MoF's КФП execut… (unknown) |
| 649.0 | 1.6% | Държавно управление, дълг и ЕС › Общи държавни служби › Изпълнителна и законодателна власт › Други органи на изпълнителната и законодателната власт `g-executive-other` | 4 | remainder | todo | Big cities' year-end B3 by ЕБК activity (cities-2024/2025: Sofia, Plovdiv, Burgas); other municipalities publish B3 onl… (script) |
| 624.5 | 1.5% | Ред, сигурност и правосъдие › Съдебна власт › Бюджет на съдебната власт `o-judiciary.judiciary` | 3 | leaf | todo | State Budget Act 2024, art. 2 (2): the judiciary by judicial body (Supreme Judicial Council, courts, prosecution …), al… (script) |
| 526.3 | 1.3% | Здравеопазване › Здравна каса (НЗОК) › Лекарства, медицински изделия и диетични храни › Лекарства за домашно лечение `h-nhif-med-home` | 4 | leaf | blocked | НЗОК medicine reports 1 and 7 by active ingredient ("Lists" › "Medicines"): gross, before the ПРУ refunds (−1.09 bn lev… (script) |
| 465.3 | 1.1% | Здравеопазване › Здравна каса (НЗОК) › Лекарства, медицински изделия и диетични храни › Лекарства за онкологични заболявания и коагулопатии (в болница) `h-nhif-med-oncology-coag` | 4 | leaf | blocked | НЗОК medicine reports 1 and 7 by active ingredient ("Lists" › "Medicines"): gross, before the ПРУ refunds (−1.09 bn lev… (script) |
| 450.6 | 1.1% | Пенсии и социална защита › Социални помощи и обезщетения › Други социални помощи и обезщетения `s-ben-assistance` | 3 | remainder | todo | The rest of the sub-function (€842.4 m in 2026, €690.6 m in 2025, €450.6 m in 2024) is not identified: the forecast giv… (script) |
| 434.6 | 1.0% | Икономика и транспорт › Транспорт и съобщения › Рехабилитация и изграждане на пътна инфраструктура › Текущ ремонт и поддръжка на републиканските пътища `e-transport.p2100-02-01.p2100-02-01-maintenance-of-national-roads` | 4 | leaf | todo | Road projects in the priority investment projects (State Budget Act annex 2; "Lists" › "Investment projects") and the R… (script) |
| 431.3 | 1.0% | Образование › Детски градини и училища (държавни стандарти чрез общините) › София (Столична община) `ed-municipal-sofiya-grad` | 3 | leaf | todo | Sofia's allocation of the state-delegated education money to each school and kindergarten (Plovdiv publishes one, "List… (unknown) |
| 412.7 | 1.0% | Образование › Държавни университети (субсидия) `ed-universities` | 2 | leaf | todo | The State Budget Acts 2024 and 2025, art. 16 (4): the subsidy of each state university (as data/sources/budget-2026/sta… (script) |
| 405.8 | 1.0% | Пенсии и социална защита › Социални услуги, програми за заетост и администрация › Механизъм лична помощ `s-services.p1500-04-01-personal-assistance-scheme` | 3 | leaf | todo | The mechanism by municipality (the Social Assistance Agency's allocations, or the municipalities' reports under ЕБК 562… (unknown) |
| 356.8 | 0.9% | Икономика и транспорт › Енергетика, горива и минно дело › Други разходи за енергетика `e-energy.rest` | 3 | remainder | todo | About €356.8 m of the 2024 plan is neither ФСЕС (annex 8) nor the Ministry of Energy’s area: EU-funded energy projects… (unknown) |
| 306.2 | 0.7% | Държавно управление, дълг и ЕС › Общи държавни служби › Наука › Друга наука `g-science.rest` | 4 | remainder | todo | The Academy of Sciences' 2024 subsidy (171,899.8 thousand BGN, State Budget Act 2024 art. 16 (4); data/sources/budget-2… (script) |
| 279.3 | 0.7% | Ред, сигурност и правосъдие › Полиция, вътрешен ред и сигурност › Други разходи за полиция и сигурност `o-police.rest` | 3 | remainder | todo | MoF EU programme tables (data.egov.bg 4226, 18860), the Recovery Plan by investment (18958) and the ИСУН projects ("Lis… (script) |
| 260.5 | 0.6% | Образование › Предучилищно и училищно образование › Училищно образование › Персонал `education.mes-pre-school-and-school-education.p1700-01-03-staff` | 4 | economic split only | todo | Each state school's own budget (the schools' sites); no central table found (docs/data-depth.md §2.1) (unknown) |
| 257.0 | 0.6% | Пенсии и социална защита › Социални услуги, програми за заетост и администрация › Други социални услуги и програми за заетост `s-svc-other` | 3 | remainder | todo | MoF EU programme tables (data.egov.bg 4226, 18860), the Recovery Plan by investment (18958) and the ИСУН projects ("Lis… (script) |
| 248.8 | 0.6% | Комунални дейности, култура и околна среда › Култура, спорт и религия › Култура › Други разходи за култура `c-culture-other` | 4 | remainder | todo | The State Budget Act's subsidies to the public media БНТ, БНР and БТА (data/sources/budget-2026/transfers-universities-… (script) |
| 224.6 | 0.5% | Икономика и транспорт › Земеделие, гори, лов и риболов › Държавни помощи, национални доплащания и САПАРД › Държавни помощи, преходна национална помощ и други плащания `e-agriculture.p8400-01-04.p8400-01-04-state-aid-transitional-national-aid-and-other` | 4 | leaf | — |  |
| 198.3 | 0.5% | Ред, сигурност и правосъдие › Полиция, вътрешен ред и сигурност › Охрана на границите и миграция `o-police.moi-border-protection-and-migration` | 3 | economic split only | — |  |
| 157.1 | 0.4% | Здравеопазване › Други разходи за здравеопазване `h-other` | 2 | remainder | todo | MoF EU programme tables (data.egov.bg 4226, 18860), the Recovery Plan by investment (18958) and the ИСУН projects ("Lis… (script) |
| 154.0 | 0.4% | Икономика и транспорт › Транспорт и съобщения › Транспорт › Управление на транспорта, безопасност и сигурност › Поддръжка и експлоатация на железопътната инфраструктура `e-transport.motc-transport.p2300-01-02-running-and-maintaining-the-railway-network` | 5 | leaf | — |  |
| 150.9 | 0.4% | Здравеопазване › Диагностика и лечение › Спешна медицинска помощ › Персонал `health.moh-diagnostics-and-treatment.p1600-02-03-staff` | 4 | leaf | — |  |
| 136.6 | 0.3% | Пенсии и социална защита › Социални помощи и обезщетения › Месечни помощи за дете до завършване на средно образование `s-benefits.p1500-05-01-monthly-child-benefit-until-secondary-school` | 3 | leaf | — |  |
| 126.5 | 0.3% | Ред, сигурност и правосъдие › Защита при бедствия и аварии `o-civil` | 2 | leaf | — |  |
| 125.7 | 0.3% | Образование › Детски градини и училища (държавни стандарти чрез общините) › Област Пловдив › Община Пловдив `ed-municipal-plovdiv-plovdiv` | 4 | leaf | — |  |
| 122.1 | 0.3% | Здравеопазване › Здравна каса (НЗОК) › Резерв за непредвидени разходи `h-nhif-reserve` | 3 | leaf | — |  |
| 118.8 | 0.3% | Образование › Детски градини и училища (държавни стандарти чрез общините) › Област Варна › Община Варна `ed-municipal-varna-varna` | 4 | leaf | — |  |
| 111.8 | 0.3% | Пенсии и социална защита › Социални помощи и обезщетения › Месечни помощи за дете с трайно увреждане `s-benefits.p1500-05-01-monthly-benefit-for-a-child-with-a-permanent` | 3 | leaf | — |  |
| 107.3 | 0.3% | Икономика и транспорт › Транспорт и съобщения › Транспорт › Управление на транспорта, безопасност и сигурност › Субсидии за пътническите влакове `e-transport.motc-transport.p2300-01-02-passenger-rail-subsidies` | 5 | leaf | — |  |
| 103.3 | 0.2% | Отбрана › Други разходи за отбрана `defence.rest` | 2 | remainder | todo | Left out of the programme mapping (data/drilldown/programme-map.csv, budget-2024, target „left out“): the defence minis… (script) |
| 95.3 | 0.2% | Пенсии и социална защита › Социални помощи и обезщетения › Помощи за отопление `s-benefits.p1500-03-01-heating-aid` | 3 | leaf | — |  |
| 95.2 | 0.2% | Отбрана › Подготовка и използване на въоръжените сили › Издръжка `defence.p1200-01-01.p1200-01-01-running` | 3 | leaf | — |  |
| 93.8 | 0.2% | Образование › Детски градини и училища (държавни стандарти чрез общините) › Област Бургас › Община Бургас `ed-municipal-burgas-burgas` | 4 | leaf | — |  |
| 93.5 | 0.2% | Пенсии и социална защита › Социални услуги, програми за заетост и администрация › Администрация на НОИ `s-svc-noi` | 3 | leaf | — |  |

### report-2024 — 2024 actual

504 open boxes, €24,363.1 m (61.0% of the total).

| € m | Share | Path | Depth | Why open | State | First lead |
| ---: | ---: | --- | ---: | --- | --- | --- |
| 2,868.1 | 7.2% | Образование › Общини `education.municipalities` | 2 | economic split only | todo | Big cities' year-end B3 by ЕБК activity (cities-2024/2025: Sofia, Plovdiv, Burgas); other municipalities publish B3 onl… (script) |
| 1,741.1 | 4.4% | Ред, сигурност и правосъдие › Полиция, вътрешен ред и сигурност › Държавен бюджет (министерства и ведомства) `o-police.state` | 3 | economic split only | — |  |
| 1,700.4 | 4.3% | Икономика и транспорт › Транспорт и съобщения › Държавен бюджет (министерства и ведомства) `e-transport.state` | 3 | economic split only | — |  |
| 1,646.3 | 4.1% | Отбрана › Държавен бюджет (министерства и ведомства) `defence.state` | 2 | economic split only | — |  |
| 1,163.6 | 2.9% | Пенсии и социална защита › Социални услуги, програми за заетост и администрация › Общини `s-services.municipalities` | 3 | economic split only | todo | Big cities' year-end B3 by ЕБК activity (cities-2024/2025: Sofia, Plovdiv, Burgas); other municipalities publish B3 onl… (script) |
| 887.8 | 2.2% | Държавно управление, дълг и ЕС › Общи държавни служби › Изпълнителна и законодателна власт › Държавен бюджет (министерства и ведомства) `g-executive.state` | 4 | economic split only | — |  |
| 857.4 | 2.1% | Пенсии и социална защита › Социални помощи и обезщетения › Държавен бюджет (министерства и ведомства) `s-benefits.state` | 3 | leaf | — |  |
| 811.6 | 2.0% | Образование › Държавни университети `education.universities` | 2 | economic split only | todo | Universities' own budget reports (no central table found) or SEBRA payments of the universities' systems — to verify (unknown) |
| 718.0 | 1.8% | Икономика и транспорт › Земеделие, гори, лов и риболов › Държавен бюджет (министерства и ведомства) `e-agriculture.state` | 3 | economic split only | — |  |
| 706.1 | 1.8% | Ред, сигурност и правосъдие › Съдебна власт › Държавен бюджет (министерства и ведомства) `o-judiciary.state` | 3 | economic split only | — |  |
| 688.3 | 1.7% | Държавно управление, дълг и ЕС › Общи държавни служби › Изпълнителна и законодателна власт › Общини `g-executive.municipalities` | 4 | economic split only | todo | Big cities' year-end B3 by ЕБК activity (cities-2024/2025: Sofia, Plovdiv, Burgas); other municipalities publish B3 onl… (script) |
| 610.0 | 1.5% | Здравеопазване › Министерство на здравеопазването, болници, европейски средства и др. `health.other` | 2 | remainder | todo | 2024 report (РМС № 673/2025) pr.4: the ministries' actuals by policy area — not extracted yet; the programme map would… (script) |
| 596.1 | 1.5% | Комунални дейности, култура и околна среда › Опазване на околната среда › Общини `c-environment.municipalities` | 3 | economic split only | todo | Big cities' year-end B3 by ЕБК activity (cities-2024/2025: Sofia, Plovdiv, Burgas); other municipalities publish B3 onl… (script) |
| 523.1 | 1.3% | Здравеопазване › Здравна каса (НЗОК) › Лекарства, медицински изделия и диетични храни › Лекарства за домашно лечение `h-nhif-med-home` | 4 | leaf | blocked | НЗОК medicine reports 1 and 7 by active ingredient ("Lists" › "Medicines"): gross, before the ПРУ refunds (−1.09 bn lev… (script) |
| 519.4 | 1.3% | Икономика и транспорт › Транспорт и съобщения › Общини `e-transport.municipalities` | 3 | economic split only | todo | Big cities' year-end B3 by ЕБК activity (cities-2024/2025: Sofia, Plovdiv, Burgas); other municipalities publish B3 onl… (script) |
| 514.6 | 1.3% | Образование › Държавен бюджет (министерства и ведомства) `education.state` | 2 | economic split only | — |  |
| 452.2 | 1.1% | Здравеопазване › Здравна каса (НЗОК) › Лекарства, медицински изделия и диетични храни › Лекарства за онкологични заболявания (в болница) `h-nhif-med-oncology` | 4 | leaf | blocked | НЗОК medicine reports 1 and 7 by active ingredient ("Lists" › "Medicines"): gross, before the ПРУ refunds (−1.09 bn lev… (script) |
| 424.8 | 1.1% | Държавно управление, дълг и ЕС › Лихви по държавния дълг › Държавен бюджет (министерства и ведомства) › Лихви по външния дълг `g-interest.state.external` | 4 | leaf | todo | By instrument (each eurobond issue, loans): the MoF's monthly bulletin „Държавен дълг“ and annual report on government… (browser) |
| 419.0 | 1.0% | Икономика и транспорт › Транспорт и съобщения › Европейски средства `e-transport.eu` | 3 | economic split only | — |  |
| 383.5 | 1.0% | Икономика и транспорт › Земеделие, гори, лов и риболов › Европейски средства `e-agriculture.eu` | 3 | economic split only | — |  |
| 320.0 | 0.8% | Комунални дейности, култура и околна среда › Жилища, благоустройство и комунални дейности `c-housing` | 2 | economic split only | — |  |
| 272.9 | 0.7% | Комунални дейности, култура и околна среда › Култура, спорт и религия › Култура › Общини `c-culture-culture.municipalities` | 4 | economic split only | todo | Big cities' year-end B3 by ЕБК activity (cities-2024/2025: Sofia, Plovdiv, Burgas); other municipalities publish B3 onl… (script) |
| 248.0 | 0.6% | Здравеопазване › Общини `health.municipalities` | 2 | economic split only | todo | Big cities' year-end B3 by ЕБК activity (cities-2024/2025: Sofia, Plovdiv, Burgas); other municipalities publish B3 onl… (script) |
| 235.7 | 0.6% | Образование › Европейски средства `education.eu` | 2 | economic split only | — |  |
| 225.2 | 0.6% | Пенсии и социална защита › Социални услуги, програми за заетост и администрация › Европейски средства `s-services.eu` | 3 | economic split only | — |  |
| 208.6 | 0.5% | Комунални дейности, култура и околна среда › Култура, спорт и религия › Култура › Държавен бюджет (министерства и ведомства) `c-culture-culture.state` | 4 | economic split only | — |  |
| 179.9 | 0.4% | Държавно управление, дълг и ЕС › Общи държавни служби › Наука › БАН и Селскостопанска академия `g-science.academies` | 4 | economic split only | — |  |
| 170.6 | 0.4% | Пенсии и социална защита › Социални услуги, програми за заетост и администрация › Държавен бюджет (министерства и ведомства) `s-services.state` | 3 | economic split only | — |  |
| 162.3 | 0.4% | Ред, сигурност и правосъдие › Затвори › Държавен бюджет (министерства и ведомства) `o-prisons.state` | 3 | economic split only | — |  |
| 145.6 | 0.4% | Икономика и транспорт › Други икономически дейности › Европейски средства `e-other.eu` | 3 | economic split only | — |  |
| 127.0 | 0.3% | Комунални дейности, култура и околна среда › Опазване на околната среда › Европейски средства `c-environment.eu` | 3 | economic split only | — |  |
| 106.7 | 0.3% | Ред, сигурност и правосъдие › Полиция, вътрешен ред и сигурност › Европейски средства `o-police.eu` | 3 | economic split only | — |  |
| 106.5 | 0.3% | Пенсии и социална защита › Социални помощи и обезщетения › Социалноосигурителни фондове › Разлика спрямо отчета на КФП `s-benefits.social-security.rest` | 4 | remainder | todo | Which social-security budget other than the ДОО pays the rest of the КФП column (2025: 3,181.0 − 2,958.0 = 223.0 m BGN;… (unknown) |
| 102.7 | 0.3% | Икономика и транспорт › Други икономически дейности › Общини `e-other.municipalities` | 3 | economic split only | — |  |
| 98.2 | 0.2% | Пенсии и социална защита › Социални услуги, програми за заетост и администрация › Социалноосигурителни фондове `s-services.social-security` | 3 | economic split only | — |  |
| 94.8 | 0.2% | Комунални дейности, култура и околна среда › Култура, спорт и религия › Култура › Обществени медии (БНТ, БНР, БТА) `c-culture-culture.media` | 4 | economic split only | — |  |
| 93.9 | 0.2% | Комунални дейности, култура и околна среда › Култура, спорт и религия › Спорт › Общини `c-sport.municipalities` | 4 | economic split only | — |  |
| 92.2 | 0.2% | Здравеопазване › Здравна каса (НЗОК) › Медицински изделия в болниците `h-nhif-devices` | 3 | leaf | — |  |
| 92.1 | 0.2% | Здравеопазване › Здравна каса (НЗОК) › Болнична помощ › Област Пловдив › УМБАЛ Свети Георги ЕАД Пловдив `hospital-1622211001` | 5 | leaf | — |  |
| 89.5 | 0.2% | Държавно управление, дълг и ЕС › Общи държавни служби › Изпълнителна и законодателна власт › Европейски средства `g-executive.eu` | 4 | economic split only | — |  |

### budget-2025 — Budget 2025

1894 open boxes, €28,839.4 m (58.3% of the total).

| € m | Share | Path | Depth | Why open | State | First lead |
| ---: | ---: | --- | ---: | --- | --- | --- |
| 2,124.6 | 4.3% | Здравеопазване › Здравна каса (НЗОК) › Болнична помощ `h-nhif-hospital` | 3 | leaf | todo | A link (graft mode=link) to the same box in the actuals, split by region and hospital from the НЗОК monthly reports (script) |
| 1,363.0 | 2.8% | Икономика и транспорт › Транспорт и съобщения › Други разходи за транспорт и съобщения `e-transport.rest` | 3 | remainder | todo | MoF EU programme tables (data.egov.bg 4226, 18860), the Recovery Plan by investment (18958) and the ИСУН projects ("Lis… (script) |
| 1,241.8 | 2.5% | Комунални дейности, култура и околна среда › Жилища, благоустройство и комунални дейности › Други разходи за жилища и благоустройство `c-housing.rest` | 3 | remainder | todo | Investment Programme for Municipal Projects (ПМС № 103/2026, "Lists"): capital transfers whose functions are not given… (script) |
| 1,182.5 | 2.4% | Икономика и транспорт › Земеделие, гори, лов и риболов › Сметка за средствата от Европейския съюз на Държавния фонд „Земеделие“ `e-agriculture.sfa-eu` | 3 | leaf | todo | State Fund Agriculture's EU account by ЕБК activity or paragraph (its annual budget and report, or the MoF's КФП execut… (unknown) |
| 1,157.7 | 2.3% | Образование › Други разходи за образование `ed-other` | 2 | remainder | todo | Municipalities' own funds for education: no national plan table; the big cities' B3 give actuals for 3 cities only (script) |
| 1,034.9 | 2.1% | Икономика и транспорт › Енергетика, горива и минно дело › Фонд „Сигурност на електроенергийната система“ `e-energy.fses` | 3 | leaf | todo | fses.bg „Отчети за дейността“: monthly „Отчет приходи и разходи“ of the fund (2021 – October 2026) — to verify whether… (script) |
| 972.3 | 2.0% | Икономика и транспорт › Други икономически дейности › Други разходи за икономически дейности `e-other.rest` | 3 | remainder | todo | The National Fund's EU account and the Recovery Plan: the box's plan falls from €2,118.6 m (2026) to €1,320.9 m, €749.9… (script) |
| 750.3 | 1.5% | Комунални дейности, култура и околна среда › Опазване на околната среда › Други разходи за околна среда `c-environment.rest` | 3 | remainder | todo | MoF EU programme tables (data.egov.bg 4226, 18860), the Recovery Plan by investment (18958) and the ИСУН projects ("Lis… (script) |
| 690.6 | 1.4% | Пенсии и социална защита › Социални помощи и обезщетения › Други социални помощи и обезщетения `s-ben-assistance` | 3 | remainder | todo | The rest of the sub-function (€842.4 m in 2026, €690.6 m in 2025, €450.6 m in 2024) is not identified: the forecast giv… (script) |
| 679.3 | 1.4% | Отбрана › Управление на инвестиционни проекти `defence.p1200-01-09` | 2 | economic split only | todo | Priority investment projects 2026 (State Budget Act annex 2; "Lists" › "Investment projects"): defence 34 projects, €84… (script) |
| 634.9 | 1.3% | Държавно управление, дълг и ЕС › Общи държавни служби › Изпълнителна и законодателна власт › Други органи на изпълнителната и законодателната власт `g-executive-other` | 4 | remainder | todo | Big cities' year-end B3 by ЕБК activity (cities-2024/2025: Sofia, Plovdiv, Burgas); other municipalities publish B3 onl… (script) |
| 619.0 | 1.3% | Образование › Държавни университети (субсидия) `ed-universities` | 2 | leaf | todo | The State Budget Acts 2024 and 2025, art. 16 (4): the subsidy of each state university (as data/sources/budget-2026/sta… (script) |
| 591.7 | 1.2% | Пенсии и социална защита › Социални услуги, програми за заетост и администрация › Механизъм лична помощ `s-services.p1500-04-01-personal-assistance-scheme` | 3 | leaf | todo | The mechanism by municipality (the Social Assistance Agency's allocations, or the municipalities' reports under ЕБК 562… (unknown) |
| 567.6 | 1.1% | Здравеопазване › Здравна каса (НЗОК) › Лекарства, медицински изделия и диетични храни › Лекарства за домашно лечение `h-nhif-med-home` | 4 | leaf | blocked | НЗОК medicine reports 1 and 7 by active ingredient ("Lists" › "Medicines"): gross, before the ПРУ refunds (−1.09 bn lev… (script) |
| 540.6 | 1.1% | Икономика и транспорт › Енергетика, горива и минно дело › Други разходи за енергетика `e-energy.rest` | 3 | remainder | todo | About €540.6 m of the 2025 plan is neither ФСЕС (annex 8) nor the Ministry of Energy’s area: EU-funded energy projects… (unknown) |
| 537.0 | 1.1% | Здравеопазване › Здравна каса (НЗОК) › Лекарства, медицински изделия и диетични храни › Лекарства за онкологични заболявания (в болница) `h-nhif-med-oncology` | 4 | leaf | blocked | НЗОК medicine reports 1 and 7 by active ingredient ("Lists" › "Medicines"): gross, before the ПРУ refunds (−1.09 bn lev… (script) |
| 492.3 | 1.0% | Образование › Детски градини и училища (държавни стандарти чрез общините) › София (Столична община) `ed-municipal-sofiya-grad` | 3 | leaf | todo | Sofia's allocation of the state-delegated education money to each school and kindergarten (Plovdiv publishes one, "List… (unknown) |
| 490.2 | 1.0% | Икономика и транспорт › Транспорт и съобщения › Рехабилитация и изграждане на пътна инфраструктура › Изграждане и основен ремонт на републиканските пътища `e-transport.p2100-02-01.p2100-02-01-construction-and-major-repair-of-national-roads` | 4 | leaf | todo | Road projects in the priority investment projects (State Budget Act annex 2; "Lists" › "Investment projects") and the R… (script) |
| 398.7 | 0.8% | Ред, сигурност и правосъдие › Съдебна власт › Бюджет на съдебната власт › Правораздаване (съдилища) `o-judiciary.judiciary.judiciary-administration-of-justice-courts` | 4 | leaf | todo | State Budget Act, the judiciary's article: amounts by judicial body (Supreme Court of Cassation, Supreme Administrative… (script) |
| 392.8 | 0.8% | Ред, сигурност и правосъдие › Полиция, вътрешен ред и сигурност › Други разходи за полиция и сигурност `o-police.rest` | 3 | remainder | todo | MoF EU programme tables (data.egov.bg 4226, 18860), the Recovery Plan by investment (18958) and the ИСУН projects ("Lis… (script) |
| 363.4 | 0.7% | Държавно управление, дълг и ЕС › Общи държавни служби › Наука › Друга наука `g-science.rest` | 4 | remainder | todo | The Academy of Sciences' 2025 subsidy (240,292.2 thousand BGN, MTBF 2025–2028 annex 6; data/sources/budget-2025/transfe… (script) |
| 348.0 | 0.7% | Икономика и транспорт › Транспорт и съобщения › Рехабилитация и изграждане на пътна инфраструктура › Текущ ремонт и поддръжка на републиканските пътища `e-transport.p2100-02-01.p2100-02-01-maintenance-of-national-roads` | 4 | leaf | todo | Road projects in the priority investment projects (State Budget Act annex 2; "Lists" › "Investment projects") and the R… (script) |
| 316.0 | 0.6% | Икономика и транспорт › Земеделие, гори, лов и риболов › Други разходи за земеделие, гори и риболов `e-agriculture.rest` | 3 | remainder | todo | State Fund Agriculture payments by measure ("Lists" › "EU funds" › farm subsidies): financial years 16 Oct – 15 Oct, ac… (script) |
| 303.7 | 0.6% | Образование › Предучилищно и училищно образование › Училищно образование › Персонал `education.mes-pre-school-and-school-education.p1700-01-03-staff` | 4 | economic split only | todo | Each state school's own budget (the schools' sites); no central table found (docs/data-depth.md §2.1) (unknown) |
| 299.5 | 0.6% | Пенсии и социална защита › Социални услуги, програми за заетост и администрация › Други социални услуги и програми за заетост `s-svc-other` | 3 | remainder | todo | MoF EU programme tables (data.egov.bg 4226, 18860), the Recovery Plan by investment (18958) and the ИСУН projects ("Lis… (script) |
| 297.1 | 0.6% | Здравеопазване › Други разходи за здравеопазване `h-other` | 2 | remainder | todo | MoF EU programme tables (data.egov.bg 4226, 18860), the Recovery Plan by investment (18958) and the ИСУН projects ("Lis… (script) |
| 258.1 | 0.5% | Комунални дейности, култура и околна среда › Култура, спорт и религия › Култура › Други разходи за култура `c-culture-other` | 4 | remainder | todo | The State Budget Act's subsidies to the public media БНТ, БНР and БТА (data/sources/budget-2026/transfers-universities-… (script) |
| 224.1 | 0.5% | Икономика и транспорт › Земеделие, гори, лов и риболов › Държавни помощи, национални доплащания и САПАРД › Държавни помощи, преходна национална помощ и други плащания `e-agriculture.p8400-01-04.p8400-01-04-state-aid-transitional-national-aid-and-other` | 4 | leaf | — |  |
| 180.6 | 0.4% | Икономика и транспорт › Транспорт и съобщения › Транспорт › Управление на транспорта, безопасност и сигурност › Поддръжка и експлоатация на железопътната инфраструктура `e-transport.motc-transport.p2300-01-02-running-and-maintaining-the-railway-network` | 5 | leaf | — |  |
| 166.1 | 0.3% | Здравеопазване › Диагностика и лечение › Спешна медицинска помощ › Персонал `health.moh-diagnostics-and-treatment.p1600-02-03-staff` | 4 | leaf | — |  |
| 142.6 | 0.3% | Ред, сигурност и правосъдие › Полиция, вътрешен ред и сигурност › ДАНС (Държавна агенция „Национална сигурност“) `o-police.dans` | 3 | economic split only | — |  |
| 142.0 | 0.3% | Здравеопазване › Здравна каса (НЗОК) › Резерв за непредвидени разходи `h-nhif-reserve` | 3 | leaf | — |  |
| 141.1 | 0.3% | Образование › Детски градини и училища (държавни стандарти чрез общините) › Област Пловдив › Община Пловдив `ed-municipal-plovdiv-plovdiv` | 4 | leaf | — |  |
| 136.8 | 0.3% | Ред, сигурност и правосъдие › Затвори › Затвори — изолация на правонарушителите › Персонал `o-prisons.p1400-02-01.p1400-02-01-staff` | 4 | leaf | — |  |
| 136.6 | 0.3% | Пенсии и социална защита › Социални помощи и обезщетения › Месечни помощи за дете до завършване на средно образование `s-benefits.p1500-05-01-monthly-child-benefit-until-secondary-school` | 3 | leaf | — |  |
| 134.0 | 0.3% | Образование › Детски градини и училища (държавни стандарти чрез общините) › Област Варна › Община Варна `ed-municipal-varna-varna` | 4 | leaf | — |  |
| 131.6 | 0.3% | Ред, сигурност и правосъдие › Защита при бедствия и аварии `o-civil` | 2 | leaf | — |  |
| 127.3 | 0.3% | Отбрана › Подготовка и използване на въоръжените сили › Издръжка `defence.p1200-01-01.p1200-01-01-running` | 3 | leaf | — |  |
| 116.5 | 0.2% | Икономика и транспорт › Транспорт и съобщения › Транспорт › Управление на транспорта, безопасност и сигурност › Субсидии за пътническите влакове `e-transport.motc-transport.p2300-01-02-passenger-rail-subsidies` | 5 | leaf | — |  |
| 111.8 | 0.2% | Пенсии и социална защита › Социални помощи и обезщетения › Месечни помощи за дете с трайно увреждане `s-benefits.p1500-05-01-monthly-benefit-for-a-child-with-a-permanent` | 3 | leaf | — |  |

### report-2025 — 2025 actual

509 open boxes, €30,174.3 m (63.5% of the total).

| € m | Share | Path | Depth | Why open | State | First lead |
| ---: | ---: | --- | ---: | --- | --- | --- |
| 3,156.4 | 6.6% | Образование › Общини `education.municipalities` | 2 | economic split only | todo | Big cities' year-end B3 by ЕБК activity (cities-2024/2025: Sofia, Plovdiv, Burgas); other municipalities publish B3 onl… (script) |
| 2,402.2 | 5.1% | Ред, сигурност и правосъдие › Полиция, вътрешен ред и сигурност › Държавен бюджет (министерства и ведомства) `o-police.state` | 3 | economic split only | todo | "Ministries 2025 (actual)" mapped by the programme map (data/drilldown/programme-map.csv, report-2025): the interior mi… (script) |
| 2,129.7 | 4.5% | Отбрана › Държавен бюджет (министерства и ведомства) `defence.state` | 2 | economic split only | todo | The defence ministry's own report on its 2025 programme budget (actuals by programme) — to verify (unknown) |
| 1,914.0 | 4.0% | Икономика и транспорт › Транспорт и съобщения › Държавен бюджет (министерства и ведомства) `e-transport.state` | 3 | economic split only | todo | The regional ministry's own report on its 2025 programme budget (actuals by programme) — to verify (unknown) |
| 1,485.9 | 3.1% | Пенсии и социална защита › Социални услуги, програми за заетост и администрация › Общини `s-services.municipalities` | 3 | economic split only | todo | Big cities' year-end B3 by ЕБК activity (cities-2024/2025: Sofia, Plovdiv, Burgas); other municipalities publish B3 onl… (script) |
| 1,016.2 | 2.1% | Държавно управление, дълг и ЕС › Общи държавни служби › Изпълнителна и законодателна власт › Държавен бюджет (министерства и ведомства) `g-executive.state` | 4 | economic split only | todo | "Ministries 2025 (actual)" mapped by the programme map (data/drilldown/programme-map.csv, report-2025): the administrat… (script) |
| 986.5 | 2.1% | Пенсии и социална защита › Социални помощи и обезщетения › Държавен бюджет (министерства и ведомства) `s-benefits.state` | 3 | leaf | todo | 2025 report pr.4: each unit's actuals by economic category with named subsidy recipients (2,823 rows; not extracted yet… (script) |
| 944.8 | 2.0% | Образование › Държавни университети `education.universities` | 2 | economic split only | todo | Universities' own budget reports (no central table found) or SEBRA payments of the universities' systems — to verify (unknown) |
| 878.0 | 1.8% | Икономика и транспорт › Транспорт и съобщения › Европейски средства `e-transport.eu` | 3 | economic split only | todo | MoF EU programme tables (data.egov.bg 4226, 18860), the Recovery Plan by investment (18958) and the ИСУН projects ("Lis… (script) |
| 859.9 | 1.8% | Икономика и транспорт › Земеделие, гори, лов и риболов › Европейски средства `e-agriculture.eu` | 3 | economic split only | todo | State Fund Agriculture payments by measure, FY2025 ("Lists" › "EU funds" › farm subsidies): EU direct payments and rura… (script) |
| 814.8 | 1.7% | Комунални дейности, култура и околна среда › Жилища, благоустройство и комунални дейности › Общини `c-housing.municipalities` | 3 | economic split only | todo | Big cities' year-end B3 by ЕБК activity (cities-2024/2025: Sofia, Plovdiv, Burgas); other municipalities publish B3 onl… (script) |
| 792.1 | 1.7% | Ред, сигурност и правосъдие › Съдебна власт › Държавен бюджет (министерства и ведомства) `o-judiciary.state` | 3 | economic split only | todo | "Ministries 2025 (actual)" mapped by the programme map (data/drilldown/programme-map.csv, report-2025): the judiciary's… (script) |
| 712.5 | 1.5% | Държавно управление, дълг и ЕС › Общи държавни служби › Изпълнителна и законодателна власт › Общини `g-executive.municipalities` | 4 | economic split only | todo | Big cities' year-end B3 by ЕБК activity (cities-2024/2025: Sofia, Plovdiv, Burgas); other municipalities publish B3 onl… (script) |
| 627.8 | 1.3% | Комунални дейности, култура и околна среда › Опазване на околната среда › Общини `c-environment.municipalities` | 3 | economic split only | todo | Big cities' year-end B3 by ЕБК activity (cities-2024/2025: Sofia, Plovdiv, Burgas); other municipalities publish B3 onl… (script) |
| 602.5 | 1.3% | Държавно управление, дълг и ЕС › Лихви по държавния дълг › Държавен бюджет (министерства и ведомства) › Лихви по външния дълг `g-interest.state.external` | 4 | leaf | todo | By instrument (each eurobond issue, loans): the MoF's monthly bulletin „Държавен дълг“ and annual report on government… (browser) |
| 587.7 | 1.2% | Образование › Държавен бюджет (министерства и ведомства) `education.state` | 2 | economic split only | todo | "Ministries 2025 (actual)" mapped by the programme map (data/drilldown/programme-map.csv, report-2025): the education m… (script) |
| 548.8 | 1.2% | Здравеопазване › Здравна каса (НЗОК) › Лекарства, медицински изделия и диетични храни › Лекарства за домашно лечение `h-nhif-med-home` | 4 | leaf | blocked | НЗОК medicine reports 1 and 7 by active ingredient ("Lists" › "Medicines"): gross, before the ПРУ refunds (−1.09 bn lev… (script) |
| 542.9 | 1.1% | Икономика и транспорт › Транспорт и съобщения › Общини `e-transport.municipalities` | 3 | economic split only | todo | Big cities' year-end B3 by ЕБК activity (cities-2024/2025: Sofia, Plovdiv, Burgas); other municipalities publish B3 onl… (script) |
| 519.0 | 1.1% | Здравеопазване › Здравна каса (НЗОК) › Лекарства, медицински изделия и диетични храни › Лекарства за онкологични заболявания (в болница) `h-nhif-med-oncology` | 4 | leaf | blocked | НЗОК medicine reports 1 and 7 by active ingredient ("Lists" › "Medicines"): gross, before the ПРУ refunds (−1.09 bn lev… (script) |
| 475.8 | 1.0% | Здравеопазване › Диагностика и лечение `health.moh-diagnostics-and-treatment` | 2 | leaf | todo | The health ministry's own report on its 2025 programme budget (actuals by programme) — to verify (unknown) |
| 472.1 | 1.0% | Образование › Европейски средства `education.eu` | 2 | economic split only | todo | MoF EU programme tables (data.egov.bg 4226, 18860), the Recovery Plan by investment (18958) and the ИСУН projects ("Lis… (script) |
| 459.8 | 1.0% | Пенсии и социална защита › Социални услуги, програми за заетост и администрация › Европейски средства `s-services.eu` | 3 | economic split only | todo | MoF EU programme tables (data.egov.bg 4226, 18860), the Recovery Plan by investment (18958) and the ИСУН projects ("Lis… (script) |
| 447.1 | 0.9% | Икономика и транспорт › Земеделие, гори, лов и риболов › Държавен бюджет (министерства и ведомства) `e-agriculture.state` | 3 | economic split only | todo | "Ministries 2025 (actual)" mapped by the programme map (data/drilldown/programme-map.csv, report-2025): the agriculture… (script) |
| 320.8 | 0.7% | Комунални дейности, култура и околна среда › Култура, спорт и религия › Култура › Общини `c-culture-culture.municipalities` | 4 | economic split only | todo | Big cities' year-end B3 by ЕБК activity (cities-2024/2025: Sofia, Plovdiv, Burgas); other municipalities publish B3 onl… (script) |
| 277.5 | 0.6% | Здравеопазване › Общини `health.municipalities` | 2 | economic split only | todo | Big cities' year-end B3 by ЕБК activity (cities-2024/2025: Sofia, Plovdiv, Burgas); other municipalities publish B3 onl… (script) |
| 258.1 | 0.5% | Комунални дейности, култура и околна среда › Жилища, благоустройство и комунални дейности › Европейски средства `c-housing.eu` | 3 | economic split only | todo | MoF EU programme tables (data.egov.bg 4226, 18860), the Recovery Plan by investment (18958) and the ИСУН projects ("Lis… (script) |
| 226.2 | 0.5% | Икономика и транспорт › Други икономически дейности › Европейски средства `e-other.eu` | 3 | economic split only | — |  |
| 215.8 | 0.5% | Ред, сигурност и правосъдие › Затвори › Държавен бюджет (министерства и ведомства) `o-prisons.state` | 3 | economic split only | todo | The justice ministry's own report on its 2025 programme budget (actuals by programme) — to verify (unknown) |
| 214.1 | 0.5% | Комунални дейности, култура и околна среда › Култура, спорт и религия › Култура › Държавен бюджет (министерства и ведомства) `c-culture-culture.state` | 4 | economic split only | — |  |
| 210.5 | 0.4% | Държавно управление, дълг и ЕС › Общи държавни служби › Наука › БАН и Селскостопанска академия `g-science.academies` | 4 | economic split only | — |  |
| 203.6 | 0.4% | Пенсии и социална защита › Социални услуги, програми за заетост и администрация › Държавен бюджет (министерства и ведомства) `s-services.state` | 3 | economic split only | — |  |
| 174.2 | 0.4% | Здравеопазване › Други разходи за здравеопазване (болници на министерствата, европейски средства и др.) `health.other` | 2 | remainder | todo | The defence and interior ministries's own report on its 2025 programme budget (actuals by programme) — to verify (unknown) |
| 130.8 | 0.3% | Комунални дейности, култура и околна среда › Опазване на околната среда › Европейски средства `c-environment.eu` | 3 | economic split only | — |  |
| 126.9 | 0.3% | Икономика и транспорт › Други икономически дейности › Общини `e-other.municipalities` | 3 | economic split only | — |  |
| 123.3 | 0.3% | Ред, сигурност и правосъдие › Полиция, вътрешен ред и сигурност › Европейски средства `o-police.eu` | 3 | economic split only | — |  |
| 121.3 | 0.3% | Държавно управление, дълг и ЕС › Общи държавни служби › Изпълнителна и законодателна власт › Европейски средства `g-executive.eu` | 4 | economic split only | — |  |
| 119.2 | 0.3% | Комунални дейности, култура и околна среда › Култура, спорт и религия › Спорт › Общини `c-sport.municipalities` | 4 | economic split only | — |  |
| 114.0 | 0.2% | Пенсии и социална защита › Социални помощи и обезщетения › Социалноосигурителни фондове › Разлика спрямо отчета на КФП `s-benefits.social-security.rest` | 4 | remainder | todo | Which social-security budget other than the ДОО pays the rest of the КФП column (2025: 3,181.0 − 2,958.0 = 223.0 m BGN;… (unknown) |
| 112.4 | 0.2% | Здравеопазване › Здравна каса (НЗОК) › Медицински изделия в болниците `h-nhif-devices` | 3 | leaf | — |  |
| 101.7 | 0.2% | Пенсии и социална защита › Социални услуги, програми за заетост и администрация › Социалноосигурителни фондове `s-services.social-security` | 3 | economic split only | — |  |

### budget-2026 — Budget 2026

1926 open boxes, €35,486.8 m (62.5% of the total).

| € m | Share | Path | Depth | Why open | State | First lead |
| ---: | ---: | --- | ---: | --- | --- | --- |
| 2,341.9 | 4.1% | Здравеопазване › Здравна каса (НЗОК) › Болнична помощ `h-nhif-hospital` | 3 | leaf | todo | A link (graft mode=link) to the same box in the actuals, split by region and hospital from the НЗОК monthly reports (script) |
| 2,062.6 | 3.6% | Икономика и транспорт › Други икономически дейности › Други разходи за икономически дейности `e-other.rest` | 3 | remainder | todo | The National Fund's EU account and the Recovery Plan: the box's plan falls from €2,118.6 m (2026) to €1,320.9 m, €749.9… (script) |
| 1,920.4 | 3.4% | Икономика и транспорт › Транспорт и съобщения › Други разходи за транспорт и съобщения `e-transport.rest` | 3 | remainder | todo | MoF EU programme tables (data.egov.bg 4226, 18860), the Recovery Plan by investment (18958) and the ИСУН projects ("Lis… (script) |
| 1,858.2 | 3.3% | Комунални дейности, култура и околна среда › Жилища, благоустройство и комунални дейности › Други разходи за жилища и благоустройство `c-housing.rest` | 3 | remainder | todo | Investment Programme for Municipal Projects (ПМС № 103/2026, "Lists"): capital transfers whose functions are not given… (script) |
| 1,487.8 | 2.6% | Икономика и транспорт › Енергетика, горива и минно дело › Фонд „Сигурност на електроенергийната система“ `e-energy.fses` | 3 | leaf | todo | fses.bg „Отчети за дейността“: monthly „Отчет приходи и разходи“ of the fund (2021 – October 2026) — to verify whether… (script) |
| 1,282.2 | 2.3% | Държавно управление, дълг и ЕС › Вноска в бюджета на ЕС `g-eu` | 2 | leaf | todo | The MoF's report on the execution of the 2026 State Budget (autumn 2027, strategy.bg): the law's amount and the actual… (script) |
| 1,275.0 | 2.2% | Икономика и транспорт › Енергетика, горива и минно дело › Други разходи за енергетика `e-energy.rest` | 3 | remainder | todo | About €1.27 bn of the 2026 sub-function is neither ФСЕС (annex 8) nor the Ministry of Energy’s programmes (ПМС № 102/20… (unknown) |
| 1,239.7 | 2.2% | Образование › Други разходи за образование `ed-other` | 2 | remainder | todo | Municipalities' own funds for education: no national plan table; the big cities' B3 give actuals for 3 cities only (script) |
| 1,136.7 | 2.0% | Здравеопазване › Здравна каса (НЗОК) › Лекарства, медицински изделия и диетични храни › Оригинални (референтни) лекарства `h-nhif-med-reference` | 4 | leaf | blocked | НЗОК medicine reports 1 and 7 by active ingredient ("Lists" › "Medicines"): gross, before the ПРУ refunds (−1.09 bn lev… (script) |
| 994.7 | 1.8% | Държавно управление, дълг и ЕС › Общи държавни служби › Изпълнителна и законодателна власт › Други органи на изпълнителната и законодателната власт `g-executive-other` | 4 | remainder | todo | Big cities' year-end B3 by ЕБК activity (cities-2024/2025: Sofia, Plovdiv, Burgas); other municipalities publish B3 onl… (script) |
| 842.4 | 1.5% | Пенсии и социална защита › Социални помощи и обезщетения › Други социални помощи и обезщетения `s-ben-assistance` | 3 | remainder | todo | The rest of the sub-function (€842.4 m in 2026, €690.6 m in 2025, €450.6 m in 2024) is not identified: the forecast giv… (script) |
| 777.2 | 1.4% | Пенсии и социална защита › Социални услуги, програми за заетост и администрация › Механизъм лична помощ `s-services.p1500-04-01-personal-assistance-scheme` | 3 | leaf | todo | The mechanism by municipality (the Social Assistance Agency's allocations, or the municipalities' reports under ЕБК 562… (unknown) |
| 752.6 | 1.3% | Комунални дейности, култура и околна среда › Опазване на околната среда › Други разходи за околна среда `c-environment.rest` | 3 | remainder | todo | MoF EU programme tables (data.egov.bg 4226, 18860), the Recovery Plan by investment (18958) and the ИСУН projects ("Lis… (script) |
| 693.0 | 1.2% | Икономика и транспорт › Земеделие, гори, лов и риболов › Сметка за средствата от Европейския съюз на Държавния фонд „Земеделие“ `e-agriculture.sfa-eu` | 3 | leaf | todo | State Fund Agriculture's EU account by ЕБК activity or paragraph (its annual budget and report, or the MoF's КФП execut… (unknown) |
| 535.3 | 0.9% | Образование › Детски градини и училища (държавни стандарти чрез общините) › София (Столична община) `ed-municipal-sofiya-grad` | 3 | leaf | todo | Sofia's allocation of the state-delegated education money to each school and kindergarten (Plovdiv publishes one, "List… (unknown) |
| 532.2 | 0.9% | Отбрана › Управление на инвестиционни проекти `defence.p1200-01-09` | 2 | economic split only | todo | Priority investment projects 2026 (State Budget Act annex 2; "Lists" › "Investment projects"): defence 34 projects, €84… (script) |
| 450.2 | 0.8% | Икономика и транспорт › Транспорт и съобщения › Рехабилитация и изграждане на пътна инфраструктура › Текущ ремонт и поддръжка на републиканските пътища `e-transport.p2100-02-01.p2100-02-01-maintenance-of-national-roads` | 4 | leaf | todo | Road projects in the priority investment projects (State Budget Act annex 2; "Lists" › "Investment projects") and the R… (script) |
| 447.1 | 0.8% | Здравеопазване › Други разходи за здравеопазване `h-other` | 2 | remainder | todo | MoF EU programme tables (data.egov.bg 4226, 18860), the Recovery Plan by investment (18958) and the ИСУН projects ("Lis… (script) |
| 424.6 | 0.7% | Ред, сигурност и правосъдие › Съдебна власт › Бюджет на съдебната власт › Правораздаване (съдилища) `o-judiciary.judiciary.judiciary-administration-of-justice-courts` | 4 | leaf | todo | State Budget Act, the judiciary's article: amounts by judicial body (Supreme Court of Cassation, Supreme Administrative… (script) |
| 405.5 | 0.7% | Ред, сигурност и правосъдие › Полиция, вътрешен ред и сигурност › Други разходи за полиция и сигурност `o-police.rest` | 3 | remainder | todo | MoF EU programme tables (data.egov.bg 4226, 18860), the Recovery Plan by investment (18958) and the ИСУН projects ("Lis… (script) |
| 366.4 | 0.6% | Пенсии и социална защита › Социални услуги, програми за заетост и администрация › Други социални услуги и програми за заетост `s-svc-other` | 3 | remainder | todo | MoF EU programme tables (data.egov.bg 4226, 18860), the Recovery Plan by investment (18958) and the ИСУН projects ("Lis… (script) |
| 353.9 | 0.6% | Комунални дейности, култура и околна среда › Култура, спорт и религия › Култура › Други разходи за култура `c-culture-other` | 4 | remainder | todo | The State Budget Act's subsidies to the public media БНТ, БНР and БТА (data/sources/budget-2026/transfers-universities-… (script) |
| 351.0 | 0.6% | Отбрана › Административно осигуряване, инфраструктура и управление на риска › Капиталови разходи `defence.p1200-01-08.p1200-01-08-capital` | 3 | leaf | todo | Priority investment projects 2026 (State Budget Act annex 2; "Lists" › "Investment projects"): defence 34 projects, €84… (script) |
| 319.6 | 0.6% | Образование › Предучилищно и училищно образование › Училищно образование › Персонал `education.mes-pre-school-and-school-education.p1700-01-03-staff` | 4 | economic split only | todo | Each state school's own budget (the schools' sites); no central table found (docs/data-depth.md §2.1) (unknown) |
| 314.3 | 0.6% | Държавно управление, дълг и ЕС › Общи държавни служби › Наука › Друга наука `g-science-other` | 4 | remainder | todo | The Academy's own revenue and EU funds, university research: no source found (docs/data-depth.md §2.9) (unknown) |
| 310.7 | 0.5% | Икономика и транспорт › Транспорт и съобщения › Рехабилитация и изграждане на пътна инфраструктура › Изграждане и основен ремонт на републиканските пътища `e-transport.p2100-02-01.p2100-02-01-construction-and-major-repair-of-national-roads` | 4 | leaf | todo | Road projects in the priority investment projects (State Budget Act annex 2; "Lists" › "Investment projects") and the R… (script) |
| 272.0 | 0.5% | Икономика и транспорт › Земеделие, гори, лов и риболов › Други разходи за земеделие, гори и риболов `e-agriculture.rest` | 3 | remainder | todo | State Fund Agriculture payments by measure ("Lists" › "EU funds" › farm subsidies): financial years 16 Oct – 15 Oct, ac… (script) |
| 223.9 | 0.4% | Икономика и транспорт › Земеделие, гори, лов и риболов › Държавни помощи, национални доплащания и САПАРД › Държавни помощи, преходна национална помощ и други плащания `e-agriculture.p8400-01-04.p8400-01-04-state-aid-transitional-national-aid-and-other` | 4 | leaf | — |  |
| 174.5 | 0.3% | Здравеопазване › Диагностика и лечение › Спешна медицинска помощ › Персонал `health.moh-diagnostics-and-treatment.p1600-02-03-staff` | 4 | leaf | — |  |
| 171.6 | 0.3% | Икономика и транспорт › Транспорт и съобщения › Транспорт › Управление на транспорта, безопасност и сигурност › Поддръжка и експлоатация на железопътната инфраструктура `e-transport.motc-transport.p2300-01-02-running-and-maintaining-the-railway-network` | 5 | leaf | — |  |
| 170.4 | 0.3% | Отбрана › Административно осигуряване, инфраструктура и управление на риска › Издръжка `defence.p1200-01-08.p1200-01-08-running` | 3 | leaf | — |  |
| 154.1 | 0.3% | Здравеопазване › Здравна каса (НЗОК) › Резерв за непредвидени разходи `h-nhif-reserve` | 3 | leaf | — |  |
| 151.7 | 0.3% | Образование › Детски градини и училища (държавни стандарти чрез общините) › Област Пловдив › Община Пловдив `ed-municipal-plovdiv-plovdiv` | 4 | leaf | — |  |
| 142.6 | 0.3% | Ред, сигурност и правосъдие › Полиция, вътрешен ред и сигурност › ДАНС (Държавна агенция „Национална сигурност“) `o-police.dans` | 3 | economic split only | — |  |
| 142.4 | 0.3% | Ред, сигурност и правосъдие › Защита при бедствия и аварии `o-civil` | 2 | leaf | — |  |
| 142.4 | 0.3% | Образование › Детски градини и училища (държавни стандарти чрез общините) › Област Варна › Община Варна `ed-municipal-varna-varna` | 4 | leaf | — |  |
| 141.2 | 0.2% | Ред, сигурност и правосъдие › Затвори › Затвори — изолация на правонарушителите › Персонал `o-prisons.p1400-02-01.p1400-02-01-staff` | 4 | leaf | — |  |
| 136.6 | 0.2% | Пенсии и социална защита › Социални помощи и обезщетения › Месечни помощи за дете до завършване на средно образование `s-benefits.p1500-05-01-monthly-child-benefit-until-secondary-school` | 3 | leaf | — |  |
| 136.2 | 0.2% | Пенсии и социална защита › Социални помощи и обезщетения › Месечни помощи за дете с трайно увреждане `s-benefits.p1500-05-01-monthly-benefit-for-a-child-with-a-permanent` | 3 | leaf | — |  |
| 131.6 | 0.2% | Държавно управление, дълг и ЕС › Общи държавни служби › Наука › Българска академия на науките `g-science-bas` | 4 | leaf | — |  |

### budget-2027 — Budget 2027 (draft)

1478 open boxes, €55,527.2 m (99.2% of the total).

| € m | Share | Path | Depth | Why open | State | First lead |
| ---: | ---: | --- | ---: | --- | --- | --- |
| 14,756.7 | 26.4% | Пенсии и социална защита › Пенсии `s-pensions` | 2 | leaf | todo | 2027 bills in Parliament — State Budget (with the ministries’ programme budgets), НЗОК and ДОО — and their memoranda; n… (script) |
| 5,683.6 | 10.2% | Здравеопазване › Здравна каса (НЗОК) `h-nhif` | 2 | leaf | todo | Закон за бюджета на НЗОК за 2027 г. — the bill and its memorandum once in Parliament (parliament.bg bill ZIP); art. 1 t… (script) |
| 3,176.0 | 5.7% | Пенсии и социална защита › Социални помощи и обезщетения `s-benefits` | 2 | leaf | todo | 2027 bills in Parliament — State Budget (with the ministries’ programme budgets), НЗОК and ДОО — and their memoranda; n… (script) |
| 2,907.2 | 5.2% | Отбрана `defence` | 1 | leaf | todo | 2027 bills in Parliament — State Budget (with the ministries’ programme budgets), НЗОК and ДОО — and their memoranda; n… (script) |
| 2,670.6 | 4.8% | Икономика и транспорт › Транспорт и съобщения › Други разходи за транспорт и съобщения `e-transport.rest` | 3 | remainder | todo | The decree on the execution of the State Budget 2027 (programme budgets, like ПМС № 102/2026 annex 1): the programmes o… (unknown) |
| 1,707.5 | 3.1% | Пенсии и социална защита › Социални услуги, програми за заетост и администрация › Други социални услуги, програми за заетост и администрация на НОИ `s-svc-rest` | 3 | remainder | todo | 2027 bills in Parliament — State Budget (with the ministries’ programme budgets), НЗОК and ДОО — and their memoranda; n… (script) |
| 1,506.8 | 2.7% | Държавно управление, дълг и ЕС › Вноска в бюджета на ЕС `g-eu` | 2 | leaf | todo | The MoF's report on the execution of the 2026 State Budget (autumn 2027, strategy.bg): the law's amount and the actual… (script) |
| 1,356.3 | 2.4% | Икономика и транспорт › Енергетика, горива и минно дело › Фонд „Сигурност на електроенергийната система“ `e-energy.fses` | 3 | leaf | todo | fses.bg „Отчети за дейността“: monthly „Отчет приходи и разходи“ of the fund (2021 – October 2026) — to verify whether… (script) |
| 1,312.2 | 2.3% | Икономика и транспорт › Други икономически дейности › Други разходи за икономически дейности `e-other.rest` | 3 | remainder | todo | 2027 bills in Parliament — State Budget (with the ministries’ programme budgets), НЗОК and ДОО — and their memoranda; n… (script) |
| 1,228.7 | 2.2% | Държавно управление, дълг и ЕС › Лихви по държавния дълг › Държавен бюджет (министерства и ведомства) › Лихви по външния дълг `g-interest.state.external` | 4 | leaf | todo | By instrument (each eurobond issue, loans): the MoF's monthly bulletin „Държавен дълг“ and annual report on government… (browser) |
| 1,211.7 | 2.2% | Ред, сигурност и правосъдие › Полиция, вътрешен ред и сигурност › Борба с престъпността и обществен ред `o-police.moi-fighting-crime-and-keeping-public-order` | 3 | leaf | todo | The decree on the execution of the State Budget 2027 (programme budgets, like ПМС № 102/2026 annex 1): the programmes o… (unknown) |
| 1,177.1 | 2.1% | Комунални дейности, култура и околна среда › Жилища, благоустройство и комунални дейности `c-housing` | 2 | leaf | todo | 2027 bills in Parliament — State Budget (with the ministries’ programme budgets), НЗОК and ДОО — and their memoranda; n… (script) |
| 986.2 | 1.8% | Държавно управление, дълг и ЕС › Общи държавни служби › Изпълнителна и законодателна власт › Други органи на изпълнителната и законодателната власт `g-executive-other` | 4 | remainder | todo | Big cities' year-end B3 by ЕБК activity (cities-2024/2025: Sofia, Plovdiv, Burgas); other municipalities publish B3 onl… (script) |
| 974.7 | 1.7% | Образование › Други разходи за образование `ed-other` | 2 | remainder | todo | Municipalities' own funds for education: no national plan table; the big cities' B3 give actuals for 3 cities only (script) |
| 897.4 | 1.6% | Комунални дейности, култура и околна среда › Опазване на околната среда › Други разходи за околна среда `c-environment.rest` | 3 | remainder | todo | The decree on the execution of the State Budget 2027 (programme budgets, like ПМС № 102/2026 annex 1): the programmes o… (unknown) |
| 795.0 | 1.4% | Образование › Предучилищно и училищно образование `education.mes-pre-school-and-school-education` | 2 | leaf | todo | The decree on the execution of the State Budget 2027 (programme budgets, like ПМС № 102/2026 annex 1): the programmes o… (unknown) |
| 615.7 | 1.1% | Икономика и транспорт › Земеделие, гори, лов и риболов › Сметка за средствата от Европейския съюз на Държавния фонд „Земеделие“ `e-agriculture.sfa-eu` | 3 | leaf | todo | State Fund Agriculture's EU account by ЕБК activity or paragraph (its annual budget and report, or the MoF's КФП execut… (unknown) |
| 590.3 | 1.1% | Здравеопазване › Диагностика и лечение `health.moh-diagnostics-and-treatment` | 2 | leaf | todo | The decree on the execution of the State Budget 2027 (programme budgets, like ПМС № 102/2026 annex 1): the programmes o… (unknown) |
| 573.3 | 1.0% | Образование › Детски градини и училища (държавни стандарти чрез общините) › София (Столична община) `ed-municipal-sofiya-grad` | 3 | leaf | todo | Sofia's allocation of the state-delegated education money to each school and kindergarten (Plovdiv publishes one, "List… (unknown) |
| 524.9 | 0.9% | Комунални дейности, култура и околна среда › Култура, спорт и религия › Култура › Други разходи за култура `c-culture-other` | 4 | remainder | todo | The State Budget Act's subsidies to the public media БНТ, БНР and БТА (data/sources/budget-2026/transfers-universities-… (script) |
| 498.6 | 0.9% | Икономика и транспорт › Транспорт и съобщения › Транспорт `e-transport.motc-transport` | 3 | leaf | todo | The decree on the execution of the State Budget 2027 (programme budgets, like ПМС № 102/2026 annex 1): the programmes o… (unknown) |
| 484.2 | 0.9% | Ред, сигурност и правосъдие › Полиция, вътрешен ред и сигурност › Други разходи за полиция и сигурност `o-police.rest` | 3 | remainder | todo | The decree on the execution of the State Budget 2027 (programme budgets, like ПМС № 102/2026 annex 1): the programmes o… (unknown) |
| 422.4 | 0.8% | Ред, сигурност и правосъдие › Съдебна власт › Бюджет на съдебната власт › Правораздаване (съдилища) `o-judiciary.judiciary.judiciary-administration-of-justice-courts` | 4 | leaf | todo | State Budget Act, the judiciary's article: amounts by judicial body (Supreme Court of Cassation, Supreme Administrative… (script) |
| 367.1 | 0.7% | Икономика и транспорт › Земеделие, гори, лов и риболов › Други разходи за земеделие, гори и риболов `e-agriculture.rest` | 3 | remainder | todo | The decree on the execution of the State Budget 2027 (programme budgets, like ПМС № 102/2026 annex 1): the programmes o… (unknown) |
| 352.0 | 0.6% | Ред, сигурност и правосъдие › Полиция, вътрешен ред и сигурност › Пожарна безопасност и защита при бедствия `o-police.moi-fire-safety-and-civil-protection` | 3 | leaf | todo | The decree on the execution of the State Budget 2027 (programme budgets, like ПМС № 102/2026 annex 1): the programmes o… (unknown) |
| 339.7 | 0.6% | Ред, сигурност и правосъдие › Полиция, вътрешен ред и сигурност › Охрана на границите и миграция `o-police.moi-border-protection-and-migration` | 3 | leaf | todo | The decree on the execution of the State Budget 2027 (programme budgets, like ПМС № 102/2026 annex 1): the programmes o… (unknown) |
| 315.3 | 0.6% | Здравеопазване › Други разходи за здравеопазване `h-other` | 2 | remainder | todo | MoF EU programme tables (data.egov.bg 4226, 18860), the Recovery Plan by investment (18958) and the ИСУН projects ("Lis… (script) |
| 314.5 | 0.6% | Държавно управление, дълг и ЕС › Общи държавни служби › Изпълнителна и законодателна власт › Събиране на данъци и мита (НАП, Митници) `g-executive.mof-collecting-taxes-and-customs-duties` | 4 | leaf | todo | The decree on the execution of the State Budget 2027 (programme budgets, like ПМС № 102/2026 annex 1): the programmes o… (unknown) |
| 303.4 | 0.5% | Държавно управление, дълг и ЕС › Общи държавни служби › Наука › Друга наука `g-science-other` | 4 | remainder | todo | The Academy's own revenue and EU funds, university research: no source found (docs/data-depth.md §2.9) (unknown) |
| 226.6 | 0.4% | Ред, сигурност и правосъдие › Затвори › Затвори и изпълнение на наказанията `o-prisons.moj-prisons-and-enforcement-of-sentences` | 3 | leaf | — |  |
| 161.2 | 0.3% | Образование › Детски градини и училища (държавни стандарти чрез общините) › Област Пловдив › Община Пловдив `ed-municipal-plovdiv-plovdiv` | 4 | leaf | — |  |
| 151.2 | 0.3% | Образование › Детски градини и училища (държавни стандарти чрез общините) › Област Варна › Община Варна `ed-municipal-varna-varna` | 4 | leaf | — |  |
| 150.7 | 0.3% | Икономика и транспорт › Земеделие, гори, лов и риболов › Земеделие и селски райони `e-agriculture.mafood-agriculture-and-rural-areas` | 3 | leaf | — |  |
| 145.5 | 0.3% | Ред, сигурност и правосъдие › Защита при бедствия и аварии `o-civil` | 2 | leaf | — |  |
| 144.3 | 0.3% | Държавно управление, дълг и ЕС › Общи държавни служби › Изпълнителна и законодателна власт › Дипломация (посолства и представителства) `g-executive.mfa-diplomacy-embassies-and-missions` | 4 | leaf | — |  |
| 140.3 | 0.3% | Държавно управление, дълг и ЕС › Общи държавни служби › Наука › Българска академия на науките `g-science-bas` | 4 | leaf | — |  |
| 131.9 | 0.2% | Ред, сигурност и правосъдие › Полиция, вътрешен ред и сигурност › ДАНС (Държавна агенция „Национална сигурност“) `o-police.dans` | 3 | leaf | — |  |
| 120.9 | 0.2% | Образование › Детски градини и училища (държавни стандарти чрез общините) › Област Бургас › Община Бургас `ed-municipal-burgas-burgas` | 4 | leaf | — |  |
| 118.3 | 0.2% | Ред, сигурност и правосъдие › Съдебна власт › Други разходи за съдебна власт `o-judiciary.rest` | 3 | remainder | todo | Left out of the programme mapping (data/drilldown/programme-map.csv, target „left out“): the justice ministry's „Правна… (script) |
| 115.9 | 0.2% | Образование › Държавни университети (субсидия) › Софийски университет „Св. Климент Охридски“ `ed-uni-sofia-university` | 3 | leaf | — |  |

### ministries-2024 — Ministries 2024

542 open boxes, €8,738.1 m (100.0% of the total).

| € m | Share | Path | Depth | Why open | State | First lead |
| ---: | ---: | --- | ---: | --- | --- | --- |
| 799.8 | 9.2% | Министерство на вътрешните работи › Борба с престъпността и обществен ред › Персонал `p1300-01-01-staff` | 3 | leaf | — |  |
| 642.8 | 7.4% | Министерство на отбраната › Отбранителни способности › Подготовка и използване на въоръжените сили › Персонал `p1200-01-01-staff` | 4 | leaf | — |  |
| 624.5 | 7.1% | Съдебна власт `judiciary` | 1 | leaf | — |  |
| 434.6 | 5.0% | Министерство на регионалното развитие и благоустройството › Пътища и техническа инфраструктура › Рехабилитация и изграждане на пътна инфраструктура › Текущ ремонт и поддръжка на републиканските пътища `p2100-02-01-maintenance-of-national-roads` | 4 | leaf | — |  |
| 405.8 | 4.6% | Министерство на труда и социалната политика › Хора с увреждания › Механизъм лична помощ `p1500-04-01-personal-assistance-scheme` | 3 | leaf | — |  |
| 336.3 | 3.8% | Министерство на труда и социалната политика › Хора с увреждания › Финансова подкрепа за хора с трайни увреждания `p1500-04-01-financial-support-for-people-with-permanent` | 3 | leaf | — |  |
| 260.5 | 3.0% | Министерство на образованието и науката › Предучилищно и училищно образование › Училищно образование › Персонал `p1700-01-03-staff` | 4 | economic split only | — |  |
| 224.6 | 2.6% | Държавен фонд „Земеделие“ › Земеделие и селски райони (субсидии) › Държавни помощи, национални доплащания и САПАРД › Държавни помощи, преходна национална помощ и други плащания `p8400-01-04-state-aid-transitional-national-aid-and-other` | 4 | leaf | — |  |
| 218.9 | 2.5% | Министерство на финансите › Събиране на данъци и мита (НАП, Митници) › Персонал `p1000-02-01-staff` | 3 | leaf | — |  |
| 214.9 | 2.5% | Министерство на вътрешните работи › Пожарна безопасност и защита при бедствия › Персонал `p1300-03-01-staff` | 3 | leaf | — |  |
| 198.3 | 2.3% | Министерство на вътрешните работи › Охрана на границите и миграция `moi-border-protection-and-migration` | 2 | economic split only | — |  |
| 154.0 | 1.8% | Министерство на транспорта и съобщенията › Транспорт › Управление на транспорта, безопасност и сигурност › Поддръжка и експлоатация на железопътната инфраструктура `p2300-01-02-running-and-maintaining-the-railway-network` | 4 | leaf | — |  |
| 150.9 | 1.7% | Министерство на здравеопазването › Диагностика и лечение › Спешна медицинска помощ › Персонал `p1600-02-03-staff` | 4 | leaf | — |  |
| 136.6 | 1.6% | Министерство на труда и социалната политика › Социално включване › Месечни помощи за дете до завършване на средно образование `p1500-05-01-monthly-child-benefit-until-secondary-school` | 3 | leaf | — |  |
| 111.8 | 1.3% | Министерство на труда и социалната политика › Социално включване › Месечни помощи за дете с трайно увреждане `p1500-05-01-monthly-benefit-for-a-child-with-a-permanent` | 3 | leaf | — |  |

### ministries-2025 — Ministries 2025

619 open boxes, €12,439.5 m (100.0% of the total).

| € m | Share | Path | Depth | Why open | State | First lead |
| ---: | ---: | --- | ---: | --- | --- | --- |
| 1,210.4 | 9.7% | Министерство на вътрешните работи › Борба с престъпността и обществен ред › Персонал `p1300-01-01-staff` | 3 | leaf | — |  |
| 966.6 | 7.8% | Министерство на отбраната › Отбранителни способности › Подготовка и използване на въоръжените сили › Персонал `p1200-01-01-staff` | 4 | leaf | — |  |
| 679.3 | 5.5% | Министерство на отбраната › Отбранителни способности › Управление на инвестиционни проекти `p1200-01-09` | 3 | economic split only | — |  |
| 591.7 | 4.8% | Министерство на труда и социалната политика › Хора с увреждания › Механизъм лична помощ `p1500-04-01-personal-assistance-scheme` | 3 | leaf | — |  |
| 490.2 | 3.9% | Министерство на регионалното развитие и благоустройството › Пътища и техническа инфраструктура › Рехабилитация и изграждане на пътна инфраструктура › Изграждане и основен ремонт на републиканските пътища `p2100-02-01-construction-and-major-repair-of-national-roads` | 4 | leaf | — |  |
| 426.4 | 3.4% | Министерство на труда и социалната политика › Хора с увреждания › Финансова подкрепа за хора с трайни увреждания `p1500-04-01-financial-support-for-people-with-permanent` | 3 | leaf | — |  |
| 398.7 | 3.2% | Съдебна власт › Правораздаване (съдилища) `judiciary-administration-of-justice-courts` | 2 | leaf | — |  |
| 348.0 | 2.8% | Министерство на регионалното развитие и благоустройството › Пътища и техническа инфраструктура › Рехабилитация и изграждане на пътна инфраструктура › Текущ ремонт и поддръжка на републиканските пътища `p2100-02-01-maintenance-of-national-roads` | 4 | leaf | — |  |
| 330.4 | 2.7% | Министерство на вътрешните работи › Охрана на границите и миграция `moi-border-protection-and-migration` | 2 | economic split only | — |  |
| 330.0 | 2.7% | Министерство на вътрешните работи › Пожарна безопасност и защита при бедствия › Персонал `p1300-03-01-staff` | 3 | leaf | — |  |
| 303.7 | 2.4% | Министерство на образованието и науката › Предучилищно и училищно образование › Училищно образование › Персонал `p1700-01-03-staff` | 4 | economic split only | — |  |
| 251.1 | 2.0% | Съдебна власт › Спазване на законността (прокуратура) `judiciary-upholding-the-law-prosecution` | 2 | leaf | — |  |
| 248.6 | 2.0% | Министерство на финансите › Събиране на данъци и мита (НАП, Митници) › Персонал `p1000-02-01-staff` | 3 | leaf | — |  |
| 224.1 | 1.8% | Държавен фонд „Земеделие“ › Земеделие и селски райони (субсидии) › Държавни помощи, национални доплащания и САПАРД › Държавни помощи, преходна национална помощ и други плащания `p8400-01-04-state-aid-transitional-national-aid-and-other` | 4 | leaf | — |  |
| 180.6 | 1.5% | Министерство на транспорта и съобщенията › Транспорт › Управление на транспорта, безопасност и сигурност › Поддръжка и експлоатация на железопътната инфраструктура `p2300-01-02-running-and-maintaining-the-railway-network` | 4 | leaf | — |  |

### ministries-report-2025 — Ministries 2025 (actual)

110 open boxes, €12,225.7 m (100.0% of the total).

| € m | Share | Path | Depth | Why open | State | First lead |
| ---: | ---: | --- | ---: | --- | --- | --- |
| 2,258.1 | 18.5% | Министерство на отбраната › Отбранителни способности `mod-defence-capabilities` | 2 | leaf | — |  |
| 1,283.5 | 10.5% | Министерство на вътрешните работи › Борба с престъпността и обществен ред `moi-fighting-crime-and-keeping-public-order` | 2 | leaf | — |  |
| 1,197.7 | 9.8% | Министерство на регионалното развитие и благоустройството › Пътища и техническа инфраструктура `mrdpw-roads-and-technical-infrastructure` | 2 | leaf | — |  |
| 653.2 | 5.3% | Министерство на транспорта и съобщенията › Транспорт `motc-transport` | 2 | leaf | — |  |
| 483.3 | 4.0% | Министерство на образованието и науката › Предучилищно и училищно образование `mes-pre-school-and-school-education` | 2 | leaf | — |  |
| 475.8 | 3.9% | Министерство на здравеопазването › Диагностика и лечение `moh-diagnostics-and-treatment` | 2 | leaf | — |  |
| 467.7 | 3.8% | Министерство на труда и социалната политика › Хора с увреждания `molsp-people-with-disabilities` | 2 | leaf | — |  |
| 400.6 | 3.3% | Министерство на труда и социалната политика › Социално включване `molsp-social-inclusion` | 2 | leaf | — |  |
| 398.8 | 3.3% | Съдебна власт › Правораздаване (съдилища) `judiciary-administration-of-justice-courts` | 2 | leaf | — |  |
| 374.5 | 3.1% | Министерство на финансите › Събиране на данъци и мита (НАП, Митници) `mof-collecting-taxes-and-customs-duties` | 2 | leaf | — |  |
| 339.5 | 2.8% | Министерство на вътрешните работи › Пожарна безопасност и защита при бедствия `moi-fire-safety-and-civil-protection` | 2 | leaf | — |  |
| 328.2 | 2.7% | Министерство на вътрешните работи › Охрана на границите и миграция `moi-border-protection-and-migration` | 2 | leaf | — |  |
| 250.3 | 2.0% | Съдебна власт › Спазване на законността (прокуратура) `judiciary-upholding-the-law-prosecution` | 2 | leaf | — |  |
| 235.6 | 1.9% | Министерство на културата › Съвременно изкуство (театри, опери, оркестри) `moc-contemporary-arts-theatres-operas-orchestras` | 2 | leaf | — |  |
| 231.3 | 1.9% | Министерство на труда и социалната политика › Социално подпомагане и равнопоставеност `molsp-social-assistance-and-gender-equality` | 2 | leaf | — |  |

### ministries-2026 — Ministries 2026

621 open boxes, €13,326.5 m (100.0% of the total).

| € m | Share | Path | Depth | Why open | State | First lead |
| ---: | ---: | --- | ---: | --- | --- | --- |
| 1,182.1 | 8.9% | Министерство на вътрешните работи › Борба с престъпността и обществен ред › Персонал `p1300-01-01-staff` | 3 | leaf | — |  |
| 1,019.8 | 7.7% | Министерство на отбраната › Отбранителни способности › Подготовка и използване на въоръжените сили › Персонал `p1200-01-01-staff` | 4 | leaf | — |  |
| 777.2 | 5.8% | Министерство на труда и социалната политика › Хора с увреждания › Механизъм лична помощ `p1500-04-01-personal-assistance-scheme` | 3 | leaf | — |  |
| 559.9 | 4.2% | Министерство на труда и социалната политика › Хора с увреждания › Финансова подкрепа за хора с трайни увреждания `p1500-04-01-financial-support-for-people-with-permanent` | 3 | leaf | — |  |
| 532.2 | 4.0% | Министерство на отбраната › Отбранителни способности › Управление на инвестиционни проекти `p1200-01-09` | 3 | economic split only | — |  |
| 450.2 | 3.4% | Министерство на регионалното развитие и благоустройството › Пътища и техническа инфраструктура › Рехабилитация и изграждане на пътна инфраструктура › Текущ ремонт и поддръжка на републиканските пътища `p2100-02-01-maintenance-of-national-roads` | 4 | leaf | — |  |
| 424.6 | 3.2% | Съдебна власт › Правораздаване (съдилища) `judiciary-administration-of-justice-courts` | 2 | leaf | — |  |
| 351.0 | 2.6% | Министерство на отбраната › Отбранителни способности › Административно осигуряване, инфраструктура и управление на риска › Капиталови разходи `p1200-01-08-capital` | 4 | leaf | — |  |
| 341.9 | 2.6% | Министерство на вътрешните работи › Пожарна безопасност и защита при бедствия › Персонал `p1300-03-01-staff` | 3 | leaf | — |  |
| 325.4 | 2.4% | Министерство на вътрешните работи › Охрана на границите и миграция `moi-border-protection-and-migration` | 2 | economic split only | — |  |
| 319.6 | 2.4% | Министерство на образованието и науката › Предучилищно и училищно образование › Училищно образование › Персонал `p1700-01-03-staff` | 4 | economic split only | — |  |
| 310.7 | 2.3% | Министерство на регионалното развитие и благоустройството › Пътища и техническа инфраструктура › Рехабилитация и изграждане на пътна инфраструктура › Изграждане и основен ремонт на републиканските пътища `p2100-02-01-construction-and-major-repair-of-national-roads` | 4 | leaf | — |  |
| 268.7 | 2.0% | Съдебна власт › Спазване на законността (прокуратура) `judiciary-upholding-the-law-prosecution` | 2 | leaf | — |  |
| 253.2 | 1.9% | Министерство на финансите › Събиране на данъци и мита (НАП, Митници) › Персонал `p1000-02-01-staff` | 3 | leaf | — |  |
| 223.9 | 1.7% | Държавен фонд „Земеделие“ › Земеделие и селски райони (субсидии) › Държавни помощи, национални доплащания и САПАРД › Държавни помощи, преходна национална помощ и други плащания `p8400-01-04-state-aid-transitional-national-aid-and-other` | 4 | leaf | — |  |

### ministries-2027 — Ministries 2027 (draft)

110 open boxes, €14,395.0 m (100.0% of the total).

| € m | Share | Path | Depth | Why open | State | First lead |
| ---: | ---: | --- | ---: | --- | --- | --- |
| 2,884.0 | 20.0% | Министерство на отбраната › Отбранителни способности `mod-defence-capabilities` | 2 | leaf | — |  |
| 1,460.4 | 10.1% | Министерство на труда и социалната политика › Хора с увреждания `molsp-people-with-disabilities` | 2 | leaf | — |  |
| 1,211.7 | 8.4% | Министерство на вътрешните работи › Борба с престъпността и обществен ред `moi-fighting-crime-and-keeping-public-order` | 2 | leaf | — |  |
| 1,186.1 | 8.2% | Министерство на регионалното развитие и благоустройството › Пътища и техническа инфраструктура `mrdpw-roads-and-technical-infrastructure` | 2 | leaf | — |  |
| 795.0 | 5.5% | Министерство на образованието и науката › Предучилищно и училищно образование `mes-pre-school-and-school-education` | 2 | leaf | — |  |
| 590.3 | 4.1% | Министерство на здравеопазването › Диагностика и лечение `moh-diagnostics-and-treatment` | 2 | leaf | — |  |
| 498.6 | 3.5% | Министерство на транспорта и съобщенията › Транспорт `motc-transport` | 2 | leaf | — |  |
| 494.6 | 3.4% | Министерство на труда и социалната политика › Социално включване `molsp-social-inclusion` | 2 | leaf | — |  |
| 422.4 | 2.9% | Съдебна власт › Правораздаване (съдилища) `judiciary-administration-of-justice-courts` | 2 | leaf | — |  |
| 352.0 | 2.4% | Министерство на вътрешните работи › Пожарна безопасност и защита при бедствия `moi-fire-safety-and-civil-protection` | 2 | leaf | — |  |
| 339.7 | 2.4% | Министерство на вътрешните работи › Охрана на границите и миграция `moi-border-protection-and-migration` | 2 | leaf | — |  |
| 314.5 | 2.2% | Министерство на финансите › Събиране на данъци и мита (НАП, Митници) `mof-collecting-taxes-and-customs-duties` | 2 | leaf | — |  |
| 288.1 | 2.0% | Министерство на труда и социалната политика › Социално подпомагане и равнопоставеност `molsp-social-assistance-and-gender-equality` | 2 | leaf | — |  |
| 267.3 | 1.9% | Съдебна власт › Спазване на законността (прокуратура) `judiciary-upholding-the-law-prosecution` | 2 | leaf | — |  |
| 257.9 | 1.8% | Държавен фонд „Земеделие“ › Земеделие и селски райони (субсидии) `state-fund-agriculture-agriculture-and-rural-areas-subsidies` | 2 | leaf | — |  |

### municipalities-2024 — Municipalities 2024

2896 open boxes, €4,025.1 m (100.0% of the total).

| € m | Share | Path | Depth | Why open | State | First lead |
| ---: | ---: | --- | ---: | --- | --- | --- |
| 431.3 | 10.7% | Столична община (София) › Делегирани от държавата дейности › Образование (детски градини и училища) `sofiya-grad-stolichna-obshtina-delegated-education` | 3 | leaf | — |  |
| 125.7 | 3.1% | Област Пловдив › Община Пловдив › Делегирани от държавата дейности › Образование (детски градини и училища) `plovdiv-plovdiv-delegated-education` | 4 | leaf | — |  |
| 118.8 | 3.0% | Област Варна › Община Варна › Делегирани от държавата дейности › Образование (детски градини и училища) `varna-varna-delegated-education` | 4 | leaf | — |  |
| 93.8 | 2.3% | Област Бургас › Община Бургас › Делегирани от държавата дейности › Образование (детски градини и училища) `burgas-burgas-delegated-education` | 4 | leaf | — |  |
| 51.3 | 1.3% | Област Стара Загора › Община Стара Загора › Делегирани от държавата дейности › Образование (детски градини и училища) `stara-zagora-stara-zagora-delegated-education` | 4 | leaf | — |  |
| 45.2 | 1.1% | Столична община (София) › Делегирани от държавата дейности › Социални услуги `sofiya-grad-stolichna-obshtina-delegated-social` | 3 | leaf | — |  |
| 44.9 | 1.1% | Област Русе › Община Русе › Делегирани от държавата дейности › Образование (детски градини и училища) `ruse-ruse-delegated-education` | 4 | leaf | — |  |
| 43.7 | 1.1% | Област Сливен › Община Сливен › Делегирани от държавата дейности › Образование (детски градини и училища) `sliven-sliven-delegated-education` | 4 | leaf | — |  |
| 41.9 | 1.0% | Област Плевен › Община Плевен › Делегирани от държавата дейности › Образование (детски градини и училища) `pleven-pleven-delegated-education` | 4 | leaf | — |  |
| 36.7 | 0.9% | Област Пазарджик › Община Пазарджик › Делегирани от държавата дейности › Образование (детски градини и училища) `pazardzhik-pazardzhik-delegated-education` | 4 | leaf | — |  |
| 32.7 | 0.8% | Област Хасково › Община Хасково › Делегирани от държавата дейности › Образование (детски градини и училища) `haskovo-haskovo-delegated-education` | 4 | leaf | — |  |
| 32.4 | 0.8% | Столична община (София) › Делегирани от държавата дейности › Общинска администрация › Служители в общинската администрация `sofiya-grad-stolichna-obshtina-delegated-admin-staff` | 4 | leaf | — |  |
| 32.3 | 0.8% | Област Шумен › Община Шумен › Делегирани от държавата дейности › Образование (детски градини и училища) `shumen-shumen-delegated-education` | 4 | leaf | — |  |
| 32.0 | 0.8% | Столична община (София) › Делегирани от държавата дейности › Здравеопазване (детски ясли, здравни кабинети и др.) `sofiya-grad-stolichna-obshtina-delegated-health` | 3 | leaf | — |  |
| 30.5 | 0.8% | Област Велико Търново › Община Велико Търново › Делегирани от държавата дейности › Образование (детски градини и училища) `veliko-tarnovo-veliko-tarnovo-delegated-education` | 4 | leaf | — |  |

### municipalities-2025 — Municipalities 2025

2898 open boxes, €4,563.7 m (100.0% of the total).

| € m | Share | Path | Depth | Why open | State | First lead |
| ---: | ---: | --- | ---: | --- | --- | --- |
| 492.3 | 10.8% | Столична община (София) › Делегирани от държавата дейности › Образование (детски градини и училища) `sofiya-grad-stolichna-obshtina-delegated-education` | 3 | leaf | — |  |
| 141.1 | 3.1% | Област Пловдив › Община Пловдив › Делегирани от държавата дейности › Образование (детски градини и училища) `plovdiv-plovdiv-delegated-education` | 4 | leaf | — |  |
| 134.0 | 2.9% | Област Варна › Община Варна › Делегирани от държавата дейности › Образование (детски градини и училища) `varna-varna-delegated-education` | 4 | leaf | — |  |
| 106.5 | 2.3% | Област Бургас › Община Бургас › Делегирани от държавата дейности › Образование (детски градини и училища) `burgas-burgas-delegated-education` | 4 | leaf | — |  |
| 58.2 | 1.3% | Област Стара Загора › Община Стара Загора › Делегирани от държавата дейности › Образование (детски градини и училища) `stara-zagora-stara-zagora-delegated-education` | 4 | leaf | — |  |
| 53.1 | 1.2% | Столична община (София) › Делегирани от държавата дейности › Социални услуги `sofiya-grad-stolichna-obshtina-delegated-social` | 3 | leaf | — |  |
| 49.7 | 1.1% | Област Русе › Община Русе › Делегирани от държавата дейности › Образование (детски градини и училища) `ruse-ruse-delegated-education` | 4 | leaf | — |  |
| 48.8 | 1.1% | Област Сливен › Община Сливен › Делегирани от държавата дейности › Образование (детски градини и училища) `sliven-sliven-delegated-education` | 4 | leaf | — |  |
| 46.8 | 1.0% | Област Плевен › Община Плевен › Делегирани от държавата дейности › Образование (детски градини и училища) `pleven-pleven-delegated-education` | 4 | leaf | — |  |
| 40.9 | 0.9% | Област Пазарджик › Община Пазарджик › Делегирани от държавата дейности › Образование (детски градини и училища) `pazardzhik-pazardzhik-delegated-education` | 4 | leaf | — |  |
| 39.7 | 0.9% | Столична община (София) › Делегирани от държавата дейности › Общинска администрация › Служители в общинската администрация `sofiya-grad-stolichna-obshtina-delegated-admin-staff` | 4 | leaf | — |  |
| 36.4 | 0.8% | Област Хасково › Община Хасково › Делегирани от държавата дейности › Образование (детски градини и училища) `haskovo-haskovo-delegated-education` | 4 | leaf | — |  |
| 36.2 | 0.8% | Област Шумен › Община Шумен › Делегирани от държавата дейности › Образование (детски градини и училища) `shumen-shumen-delegated-education` | 4 | leaf | — |  |
| 34.5 | 0.8% | Област Велико Търново › Община Велико Търново › Делегирани от държавата дейности › Образование (детски градини и училища) `veliko-tarnovo-veliko-tarnovo-delegated-education` | 4 | leaf | — |  |
| 34.3 | 0.8% | Област Благоевград › Община Благоевград › Делегирани от държавата дейности › Образование (детски градини и училища) `blagoevgrad-blagoevgrad-delegated-education` | 4 | leaf | — |  |

### municipalities-2026 — Municipalities 2026

2896 open boxes, €4,928.0 m (100.0% of the total).

| € m | Share | Path | Depth | Why open | State | First lead |
| ---: | ---: | --- | ---: | --- | --- | --- |
| 535.3 | 10.9% | Столична община (София) › Делегирани от държавата дейности › Образование (детски градини и училища) `sofiya-grad-stolichna-obshtina-delegated-education` | 3 | leaf | — |  |
| 151.7 | 3.1% | Област Пловдив › Община Пловдив › Делегирани от държавата дейности › Образование (детски градини и училища) `plovdiv-plovdiv-delegated-education` | 4 | leaf | — |  |
| 142.4 | 2.9% | Област Варна › Община Варна › Делегирани от държавата дейности › Образование (детски градини и училища) `varna-varna-delegated-education` | 4 | leaf | — |  |
| 113.6 | 2.3% | Област Бургас › Община Бургас › Делегирани от държавата дейности › Образование (детски градини и училища) `burgas-burgas-delegated-education` | 4 | leaf | — |  |
| 62.0 | 1.3% | Област Стара Загора › Община Стара Загора › Делегирани от държавата дейности › Образование (детски градини и училища) `stara-zagora-stara-zagora-delegated-education` | 4 | leaf | — |  |
| 59.9 | 1.2% | Столична община (София) › Делегирани от държавата дейности › Социални услуги `sofiya-grad-stolichna-obshtina-delegated-social` | 3 | leaf | — |  |
| 52.3 | 1.1% | Област Русе › Община Русе › Делегирани от държавата дейности › Образование (детски градини и училища) `ruse-ruse-delegated-education` | 4 | leaf | — |  |
| 51.2 | 1.0% | Област Сливен › Община Сливен › Делегирани от държавата дейности › Образование (детски градини и училища) `sliven-sliven-delegated-education` | 4 | leaf | — |  |
| 48.9 | 1.0% | Област Плевен › Община Плевен › Делегирани от държавата дейности › Образование (детски градини и училища) `pleven-pleven-delegated-education` | 4 | leaf | — |  |
| 44.8 | 0.9% | Столична община (София) › Делегирани от държавата дейности › Общинска администрация › Служители в общинската администрация `sofiya-grad-stolichna-obshtina-delegated-admin-staff` | 4 | leaf | — |  |
| 43.1 | 0.9% | Област Пазарджик › Община Пазарджик › Делегирани от държавата дейности › Образование (детски градини и училища) `pazardzhik-pazardzhik-delegated-education` | 4 | leaf | — |  |
| 38.8 | 0.8% | Област Шумен › Община Шумен › Делегирани от държавата дейности › Образование (детски градини и училища) `shumen-shumen-delegated-education` | 4 | leaf | — |  |
| 37.1 | 0.8% | Област Хасково › Община Хасково › Делегирани от държавата дейности › Образование (детски градини и училища) `haskovo-haskovo-delegated-education` | 4 | leaf | — |  |
| 37.1 | 0.8% | Столична община (София) › Делегирани от държавата дейности › Здравеопазване (детски ясли, здравни кабинети и др.) `sofiya-grad-stolichna-obshtina-delegated-health` | 3 | leaf | — |  |
| 36.4 | 0.7% | Област Велико Търново › Община Велико Търново › Делегирани от държавата дейности › Образование (детски градини и училища) `veliko-tarnovo-veliko-tarnovo-delegated-education` | 4 | leaf | — |  |

### municipalities-2027 — Municipalities 2027 (draft)

2631 open boxes, €5,162.1 m (100.0% of the total).

| € m | Share | Path | Depth | Why open | State | First lead |
| ---: | ---: | --- | ---: | --- | --- | --- |
| 573.3 | 11.1% | Столична община (София) › Делегирани от държавата дейности › Образование (детски градини и училища) `sofiya-grad-stolichna-obshtina-delegated-education` | 3 | leaf | — |  |
| 161.2 | 3.1% | Област Пловдив › Община Пловдив › Делегирани от държавата дейности › Образование (детски градини и училища) `plovdiv-plovdiv-delegated-education` | 4 | leaf | — |  |
| 151.2 | 2.9% | Област Варна › Община Варна › Делегирани от държавата дейности › Образование (детски градини и училища) `varna-varna-delegated-education` | 4 | leaf | — |  |
| 120.9 | 2.3% | Област Бургас › Община Бургас › Делегирани от държавата дейности › Образование (детски градини и училища) `burgas-burgas-delegated-education` | 4 | leaf | — |  |
| 65.9 | 1.3% | Област Стара Загора › Община Стара Загора › Делегирани от държавата дейности › Образование (детски градини и училища) `stara-zagora-stara-zagora-delegated-education` | 4 | leaf | — |  |
| 63.6 | 1.2% | Столична община (София) › Делегирани от държавата дейности › Социални услуги `sofiya-grad-stolichna-obshtina-delegated-social` | 3 | leaf | — |  |
| 56.4 | 1.1% | Област Русе › Община Русе › Делегирани от държавата дейности › Образование (детски градини и училища) `ruse-ruse-delegated-education` | 4 | leaf | — |  |
| 54.4 | 1.1% | Област Сливен › Община Сливен › Делегирани от държавата дейности › Образование (детски градини и училища) `sliven-sliven-delegated-education` | 4 | leaf | — |  |
| 51.9 | 1.0% | Област Плевен › Община Плевен › Делегирани от държавата дейности › Образование (детски градини и училища) `pleven-pleven-delegated-education` | 4 | leaf | — |  |
| 48.6 | 0.9% | Столична община (София) › Делегирани от държавата дейности › Общинска администрация › Служители в общинската администрация `sofiya-grad-stolichna-obshtina-delegated-admin-staff` | 4 | leaf | — |  |
| 45.7 | 0.9% | Област Пазарджик › Община Пазарджик › Делегирани от държавата дейности › Образование (детски градини и училища) `pazardzhik-pazardzhik-delegated-education` | 4 | leaf | — |  |
| 41.3 | 0.8% | Област Шумен › Община Шумен › Делегирани от държавата дейности › Образование (детски градини и училища) `shumen-shumen-delegated-education` | 4 | leaf | — |  |
| 39.4 | 0.8% | Област Хасково › Община Хасково › Делегирани от държавата дейности › Образование (детски градини и училища) `haskovo-haskovo-delegated-education` | 4 | leaf | — |  |
| 39.0 | 0.8% | Столична община (София) › Делегирани от държавата дейности › Здравеопазване (детски ясли, здравни кабинети и др.) `sofiya-grad-stolichna-obshtina-delegated-health` | 3 | leaf | — |  |
| 38.7 | 0.7% | Област Велико Търново › Община Велико Търново › Делегирани от държавата дейности › Образование (детски градини и училища) `veliko-tarnovo-veliko-tarnovo-delegated-education` | 4 | leaf | — |  |

### cities-2024 — Big cities 2024

213 open boxes, €1,989.9 m (100.0% of the total).

| € m | Share | Path | Depth | Why open | State | First lead |
| ---: | ---: | --- | ---: | --- | --- | --- |
| 291.0 | 14.6% | Столична община (София) › Образование › Неспециализирани училища, без професионални гимназии `sofiya-grad-stolichna-obshtina-322` | 3 | economic split only | — |  |
| 194.2 | 9.8% | Столична община (София) › Икономически дейности и услуги › Други дейности по транспорта, пътищата, пощите и далекосъобщенията `sofiya-grad-stolichna-obshtina-849` | 3 | economic split only | — |  |
| 165.7 | 8.3% | Столична община (София) › Образование › Детски градини `sofiya-grad-stolichna-obshtina-311` | 3 | economic split only | — |  |
| 92.7 | 4.7% | Община Пловдив › Образование › Неспециализирани училища, без професионални гимназии `plovdiv-plovdiv-322` | 3 | economic split only | — |  |
| 88.9 | 4.5% | Столична община (София) › Благоустройство, комунални дейности и околна среда › Изграждане, ремонт и поддържане на уличната мрежа `sofiya-grad-stolichna-obshtina-606` | 3 | economic split only | — |  |
| 83.0 | 4.2% | Столична община (София) › Благоустройство, комунални дейности и околна среда › Чистота `sofiya-grad-stolichna-obshtina-623` | 3 | economic split only | — |  |
| 77.1 | 3.9% | Столична община (София) › Общи държавни служби › Общинска администрация `sofiya-grad-stolichna-obshtina-122` | 3 | economic split only | — |  |
| 60.3 | 3.0% | Община Бургас › Образование › Неспециализирани училища, без професионални гимназии `burgas-burgas-322` | 3 | economic split only | — |  |
| 58.7 | 2.9% | Столична община (София) › Социално осигуряване, подпомагане и грижи › Асистенти за лична помощ `sofiya-grad-stolichna-obshtina-562` | 3 | economic split only | — |  |
| 52.1 | 2.6% | Столична община (София) › Социално осигуряване, подпомагане и грижи › Други служби и дейности по социалното осигуряване, подпомагане и заетостта `sofiya-grad-stolichna-obshtina-589` | 3 | economic split only | — |  |
| 39.3 | 2.0% | Община Пловдив › Образование › Детски градини `plovdiv-plovdiv-311` | 3 | economic split only | — |  |
| 29.5 | 1.5% | Столична община (София) › Благоустройство, комунални дейности и околна среда › Управление на дейностите по отпадъците `sofiya-grad-stolichna-obshtina-627` | 3 | economic split only | — |  |
| 28.1 | 1.4% | Столична община (София) › Здравеопазване › Детски ясли, детски кухни и яслени групи в детска градина `sofiya-grad-stolichna-obshtina-431` | 3 | economic split only | — |  |
| 26.6 | 1.3% | Община Бургас › Образование › Детски градини `burgas-burgas-311` | 3 | economic split only | — |  |
| 25.6 | 1.3% | Община Пловдив › Социално осигуряване, подпомагане и грижи › Асистенти за лична помощ `plovdiv-plovdiv-562` | 3 | economic split only | — |  |

### cities-2025 — Big cities 2025

209 open boxes, €2,325.5 m (100.0% of the total).

| € m | Share | Path | Depth | Why open | State | First lead |
| ---: | ---: | --- | ---: | --- | --- | --- |
| 339.4 | 14.6% | Столична община (София) › Образование › Неспециализирани училища, без професионални гимназии `sofiya-grad-stolichna-obshtina-322` | 3 | economic split only | — |  |
| 250.3 | 10.8% | Столична община (София) › Икономически дейности и услуги › Други дейности по транспорта, пътищата, пощите и далекосъобщенията `sofiya-grad-stolichna-obshtina-849` | 3 | economic split only | — |  |
| 189.6 | 8.2% | Столична община (София) › Образование › Детски градини `sofiya-grad-stolichna-obshtina-311` | 3 | economic split only | — |  |
| 114.7 | 4.9% | Община Пловдив › Образование › Неспециализирани училища, без професионални гимназии `plovdiv-plovdiv-322` | 3 | economic split only | — |  |
| 95.9 | 4.1% | Столична община (София) › Общи държавни служби › Общинска администрация `sofiya-grad-stolichna-obshtina-122` | 3 | economic split only | — |  |
| 84.3 | 3.6% | Столична община (София) › Социално осигуряване, подпомагане и грижи › Асистенти за лична помощ `sofiya-grad-stolichna-obshtina-562` | 3 | economic split only | — |  |
| 84.2 | 3.6% | Столична община (София) › Благоустройство, комунални дейности и околна среда › Чистота `sofiya-grad-stolichna-obshtina-623` | 3 | economic split only | — |  |
| 78.9 | 3.4% | Столична община (София) › Благоустройство, комунални дейности и околна среда › Изграждане, ремонт и поддържане на уличната мрежа `sofiya-grad-stolichna-obshtina-606` | 3 | economic split only | — |  |
| 66.8 | 2.9% | Община Бургас › Образование › Неспециализирани училища, без професионални гимназии `burgas-burgas-322` | 3 | economic split only | — |  |
| 51.7 | 2.2% | Столична община (София) › Социално осигуряване, подпомагане и грижи › Други служби и дейности по социалното осигуряване, подпомагане и заетостта `sofiya-grad-stolichna-obshtina-589` | 3 | economic split only | — |  |
| 43.9 | 1.9% | Община Пловдив › Образование › Детски градини `plovdiv-plovdiv-311` | 3 | economic split only | — |  |
| 35.6 | 1.5% | Община Пловдив › Социално осигуряване, подпомагане и грижи › Асистенти за лична помощ `plovdiv-plovdiv-562` | 3 | economic split only | — |  |
| 31.7 | 1.4% | Община Бургас › Здравеопазване › Други дейности по здравеопазването `burgas-burgas-469` | 3 | economic split only | — |  |
| 30.8 | 1.3% | Община Пловдив › Благоустройство, комунални дейности и околна среда › Чистота `plovdiv-plovdiv-623` | 3 | economic split only | — |  |
| 29.4 | 1.3% | Община Бургас › Образование › Детски градини `burgas-burgas-311` | 3 | economic split only | — |  |

### eurostat-2024 — Eurostat 2024

47 open boxes, €41,059.2 m (100.0% of the total).

| € m | Share | Path | Depth | Why open | State | First lead |
| ---: | ---: | --- | ---: | --- | --- | --- |
| 9,862.1 | 24.0% | Пенсии и социална защита › Старост (пенсии и грижи) `GF1002` | 2 | economic split only | — |  |
| 3,823.0 | 9.3% | Здравеопазване › Болнична помощ `GF0703` | 2 | economic split only | — |  |
| 3,600.7 | 8.8% | Икономика и транспорт › Транспорт `GF0405` | 2 | economic split only | — |  |
| 2,415.7 | 5.9% | Образование › Средно образование `GF0902` | 2 | economic split only | — |  |
| 2,179.0 | 5.3% | Пенсии и социална защита › Семейство и деца `GF1004` | 2 | economic split only | — |  |
| 2,155.8 | 5.3% | Държавно управление и дълг › Законодателна и изпълнителна власт, финанси и данъци `GF0101` | 2 | economic split only | — |  |
| 1,467.7 | 3.6% | Ред, сигурност и правосъдие › Полиция `GF0301` | 2 | economic split only | — |  |
| 1,218.6 | 3.0% | Пенсии и социална защита › Наследствени пенсии `GF1003` | 2 | leaf | — |  |
| 1,209.8 | 2.9% | Икономика и транспорт › Горива и енергетика `GF0403` | 2 | economic split only | — |  |
| 1,094.3 | 2.7% | Отбрана › Военна отбрана `GF0201` | 2 | economic split only | — |  |
| 1,067.0 | 2.6% | Комунални дейности, култура и околна среда › Жилищно строителство и комунални дейности `GF06` | 2 | economic split only | — |  |
| 961.1 | 2.3% | Пенсии и социална защита › Болест и инвалидност `GF1001` | 2 | economic split only | — |  |
| 889.4 | 2.2% | Образование › Детски градини и начално образование `GF0901` | 2 | economic split only | — |  |
| 784.2 | 1.9% | Образование › Висше образование `GF0904` | 2 | economic split only | — |  |
| 764.0 | 1.9% | Ред, сигурност и правосъдие › Съдебна система `GF0303` | 2 | economic split only | — |  |

## Ledger problems

No stale entries.

Open boxes of €250 m or more with no ledger entry (106):

- **report-2024**
  - €1,741.1 m Ред, сигурност и правосъдие › Полиция, вътрешен ред и сигурност › Държавен бюджет (министерства и ведомства) `o-police.state` (economic split only)
  - €1,700.4 m Икономика и транспорт › Транспорт и съобщения › Държавен бюджет (министерства и ведомства) `e-transport.state` (economic split only)
  - €1,646.3 m Отбрана › Държавен бюджет (министерства и ведомства) `defence.state` (economic split only)
  - €887.8 m Държавно управление, дълг и ЕС › Общи държавни служби › Изпълнителна и законодателна власт › Държавен бюджет (министерства и ведомства) `g-executive.state` (economic split only)
  - €857.4 m Пенсии и социална защита › Социални помощи и обезщетения › Държавен бюджет (министерства и ведомства) `s-benefits.state` (leaf)
  - €718.0 m Икономика и транспорт › Земеделие, гори, лов и риболов › Държавен бюджет (министерства и ведомства) `e-agriculture.state` (economic split only)
  - €706.1 m Ред, сигурност и правосъдие › Съдебна власт › Държавен бюджет (министерства и ведомства) `o-judiciary.state` (economic split only)
  - €514.6 m Образование › Държавен бюджет (министерства и ведомства) `education.state` (economic split only)
  - €419.0 m Икономика и транспорт › Транспорт и съобщения › Европейски средства `e-transport.eu` (economic split only)
  - €383.5 m Икономика и транспорт › Земеделие, гори, лов и риболов › Европейски средства `e-agriculture.eu` (economic split only)
  - €320.0 m Комунални дейности, култура и околна среда › Жилища, благоустройство и комунални дейности `c-housing` (economic split only)
- **ministries-2024**
  - €799.8 m Министерство на вътрешните работи › Борба с престъпността и обществен ред › Персонал `p1300-01-01-staff` (leaf)
  - €642.8 m Министерство на отбраната › Отбранителни способности › Подготовка и използване на въоръжените сили › Персонал `p1200-01-01-staff` (leaf)
  - €624.5 m Съдебна власт `judiciary` (leaf)
  - €434.6 m Министерство на регионалното развитие и благоустройството › Пътища и техническа инфраструктура › Рехабилитация и изграждане на пътна инфраструктура › Текущ ремонт и поддръжка на републиканските пътища `p2100-02-01-maintenance-of-national-roads` (leaf)
  - €405.8 m Министерство на труда и социалната политика › Хора с увреждания › Механизъм лична помощ `p1500-04-01-personal-assistance-scheme` (leaf)
  - €336.3 m Министерство на труда и социалната политика › Хора с увреждания › Финансова подкрепа за хора с трайни увреждания `p1500-04-01-financial-support-for-people-with-permanent` (leaf)
  - €260.5 m Министерство на образованието и науката › Предучилищно и училищно образование › Училищно образование › Персонал `p1700-01-03-staff` (economic split only)
- **ministries-2025**
  - €1,210.4 m Министерство на вътрешните работи › Борба с престъпността и обществен ред › Персонал `p1300-01-01-staff` (leaf)
  - €966.6 m Министерство на отбраната › Отбранителни способности › Подготовка и използване на въоръжените сили › Персонал `p1200-01-01-staff` (leaf)
  - €679.3 m Министерство на отбраната › Отбранителни способности › Управление на инвестиционни проекти `p1200-01-09` (economic split only)
  - €591.7 m Министерство на труда и социалната политика › Хора с увреждания › Механизъм лична помощ `p1500-04-01-personal-assistance-scheme` (leaf)
  - €490.2 m Министерство на регионалното развитие и благоустройството › Пътища и техническа инфраструктура › Рехабилитация и изграждане на пътна инфраструктура › Изграждане и основен ремонт на републиканските пътища `p2100-02-01-construction-and-major-repair-of-national-roads` (leaf)
  - €426.4 m Министерство на труда и социалната политика › Хора с увреждания › Финансова подкрепа за хора с трайни увреждания `p1500-04-01-financial-support-for-people-with-permanent` (leaf)
  - €398.7 m Съдебна власт › Правораздаване (съдилища) `judiciary-administration-of-justice-courts` (leaf)
  - €348.0 m Министерство на регионалното развитие и благоустройството › Пътища и техническа инфраструктура › Рехабилитация и изграждане на пътна инфраструктура › Текущ ремонт и поддръжка на републиканските пътища `p2100-02-01-maintenance-of-national-roads` (leaf)
  - €330.4 m Министерство на вътрешните работи › Охрана на границите и миграция `moi-border-protection-and-migration` (economic split only)
  - €330.0 m Министерство на вътрешните работи › Пожарна безопасност и защита при бедствия › Персонал `p1300-03-01-staff` (leaf)
  - €303.7 m Министерство на образованието и науката › Предучилищно и училищно образование › Училищно образование › Персонал `p1700-01-03-staff` (economic split only)
  - €251.1 m Съдебна власт › Спазване на законността (прокуратура) `judiciary-upholding-the-law-prosecution` (leaf)
- **ministries-report-2025**
  - €2,258.1 m Министерство на отбраната › Отбранителни способности `mod-defence-capabilities` (leaf)
  - €1,283.5 m Министерство на вътрешните работи › Борба с престъпността и обществен ред `moi-fighting-crime-and-keeping-public-order` (leaf)
  - €1,197.7 m Министерство на регионалното развитие и благоустройството › Пътища и техническа инфраструктура `mrdpw-roads-and-technical-infrastructure` (leaf)
  - €653.2 m Министерство на транспорта и съобщенията › Транспорт `motc-transport` (leaf)
  - €483.3 m Министерство на образованието и науката › Предучилищно и училищно образование `mes-pre-school-and-school-education` (leaf)
  - €475.8 m Министерство на здравеопазването › Диагностика и лечение `moh-diagnostics-and-treatment` (leaf)
  - €467.7 m Министерство на труда и социалната политика › Хора с увреждания `molsp-people-with-disabilities` (leaf)
  - €400.6 m Министерство на труда и социалната политика › Социално включване `molsp-social-inclusion` (leaf)
  - €398.8 m Съдебна власт › Правораздаване (съдилища) `judiciary-administration-of-justice-courts` (leaf)
  - €374.5 m Министерство на финансите › Събиране на данъци и мита (НАП, Митници) `mof-collecting-taxes-and-customs-duties` (leaf)
  - €339.5 m Министерство на вътрешните работи › Пожарна безопасност и защита при бедствия `moi-fire-safety-and-civil-protection` (leaf)
  - €328.2 m Министерство на вътрешните работи › Охрана на границите и миграция `moi-border-protection-and-migration` (leaf)
  - €250.3 m Съдебна власт › Спазване на законността (прокуратура) `judiciary-upholding-the-law-prosecution` (leaf)
- **ministries-2026**
  - €1,182.1 m Министерство на вътрешните работи › Борба с престъпността и обществен ред › Персонал `p1300-01-01-staff` (leaf)
  - €1,019.8 m Министерство на отбраната › Отбранителни способности › Подготовка и използване на въоръжените сили › Персонал `p1200-01-01-staff` (leaf)
  - €777.2 m Министерство на труда и социалната политика › Хора с увреждания › Механизъм лична помощ `p1500-04-01-personal-assistance-scheme` (leaf)
  - €559.9 m Министерство на труда и социалната политика › Хора с увреждания › Финансова подкрепа за хора с трайни увреждания `p1500-04-01-financial-support-for-people-with-permanent` (leaf)
  - €532.2 m Министерство на отбраната › Отбранителни способности › Управление на инвестиционни проекти `p1200-01-09` (economic split only)
  - €450.2 m Министерство на регионалното развитие и благоустройството › Пътища и техническа инфраструктура › Рехабилитация и изграждане на пътна инфраструктура › Текущ ремонт и поддръжка на републиканските пътища `p2100-02-01-maintenance-of-national-roads` (leaf)
  - €424.6 m Съдебна власт › Правораздаване (съдилища) `judiciary-administration-of-justice-courts` (leaf)
  - €351.0 m Министерство на отбраната › Отбранителни способности › Административно осигуряване, инфраструктура и управление на риска › Капиталови разходи `p1200-01-08-capital` (leaf)
  - €341.9 m Министерство на вътрешните работи › Пожарна безопасност и защита при бедствия › Персонал `p1300-03-01-staff` (leaf)
  - €325.4 m Министерство на вътрешните работи › Охрана на границите и миграция `moi-border-protection-and-migration` (economic split only)
  - €319.6 m Министерство на образованието и науката › Предучилищно и училищно образование › Училищно образование › Персонал `p1700-01-03-staff` (economic split only)
  - €310.7 m Министерство на регионалното развитие и благоустройството › Пътища и техническа инфраструктура › Рехабилитация и изграждане на пътна инфраструктура › Изграждане и основен ремонт на републиканските пътища `p2100-02-01-construction-and-major-repair-of-national-roads` (leaf)
  - €268.7 m Съдебна власт › Спазване на законността (прокуратура) `judiciary-upholding-the-law-prosecution` (leaf)
  - €253.2 m Министерство на финансите › Събиране на данъци и мита (НАП, Митници) › Персонал `p1000-02-01-staff` (leaf)
- **ministries-2027**
  - €2,884.0 m Министерство на отбраната › Отбранителни способности `mod-defence-capabilities` (leaf)
  - €1,460.4 m Министерство на труда и социалната политика › Хора с увреждания `molsp-people-with-disabilities` (leaf)
  - €1,211.7 m Министерство на вътрешните работи › Борба с престъпността и обществен ред `moi-fighting-crime-and-keeping-public-order` (leaf)
  - €1,186.1 m Министерство на регионалното развитие и благоустройството › Пътища и техническа инфраструктура `mrdpw-roads-and-technical-infrastructure` (leaf)
  - €795.0 m Министерство на образованието и науката › Предучилищно и училищно образование `mes-pre-school-and-school-education` (leaf)
  - €590.3 m Министерство на здравеопазването › Диагностика и лечение `moh-diagnostics-and-treatment` (leaf)
  - €498.6 m Министерство на транспорта и съобщенията › Транспорт `motc-transport` (leaf)
  - €494.6 m Министерство на труда и социалната политика › Социално включване `molsp-social-inclusion` (leaf)
  - €422.4 m Съдебна власт › Правораздаване (съдилища) `judiciary-administration-of-justice-courts` (leaf)
  - €352.0 m Министерство на вътрешните работи › Пожарна безопасност и защита при бедствия `moi-fire-safety-and-civil-protection` (leaf)
  - €339.7 m Министерство на вътрешните работи › Охрана на границите и миграция `moi-border-protection-and-migration` (leaf)
  - €314.5 m Министерство на финансите › Събиране на данъци и мита (НАП, Митници) `mof-collecting-taxes-and-customs-duties` (leaf)
  - €288.1 m Министерство на труда и социалната политика › Социално подпомагане и равнопоставеност `molsp-social-assistance-and-gender-equality` (leaf)
  - €267.3 m Съдебна власт › Спазване на законността (прокуратура) `judiciary-upholding-the-law-prosecution` (leaf)
  - €257.9 m Държавен фонд „Земеделие“ › Земеделие и селски райони (субсидии) `state-fund-agriculture-agriculture-and-rural-areas-subsidies` (leaf)
  - €253.4 m Министерство на културата › Съвременно изкуство (театри, опери, оркестри) `moc-contemporary-arts-theatres-operas-orchestras` (leaf)
- **municipalities-2024**
  - €431.3 m Столична община (София) › Делегирани от държавата дейности › Образование (детски градини и училища) `sofiya-grad-stolichna-obshtina-delegated-education` (leaf)
- **municipalities-2025**
  - €492.3 m Столична община (София) › Делегирани от държавата дейности › Образование (детски градини и училища) `sofiya-grad-stolichna-obshtina-delegated-education` (leaf)
- **municipalities-2026**
  - €535.3 m Столична община (София) › Делегирани от държавата дейности › Образование (детски градини и училища) `sofiya-grad-stolichna-obshtina-delegated-education` (leaf)
- **municipalities-2027**
  - €573.3 m Столична община (София) › Делегирани от държавата дейности › Образование (детски градини и училища) `sofiya-grad-stolichna-obshtina-delegated-education` (leaf)
- **cities-2024**
  - €291.0 m Столична община (София) › Образование › Неспециализирани училища, без професионални гимназии `sofiya-grad-stolichna-obshtina-322` (economic split only)
- **cities-2025**
  - €339.4 m Столична община (София) › Образование › Неспециализирани училища, без професионални гимназии `sofiya-grad-stolichna-obshtina-322` (economic split only)
  - €250.3 m Столична община (София) › Икономически дейности и услуги › Други дейности по транспорта, пътищата, пощите и далекосъобщенията `sofiya-grad-stolichna-obshtina-849` (economic split only)
- **eurostat-2024**
  - €9,862.1 m Пенсии и социална защита › Старост (пенсии и грижи) `GF1002` (economic split only)
  - €3,823.0 m Здравеопазване › Болнична помощ `GF0703` (economic split only)
  - €3,600.7 m Икономика и транспорт › Транспорт `GF0405` (economic split only)
  - €2,415.7 m Образование › Средно образование `GF0902` (economic split only)
  - €2,179.0 m Пенсии и социална защита › Семейство и деца `GF1004` (economic split only)
  - €2,155.8 m Държавно управление и дълг › Законодателна и изпълнителна власт, финанси и данъци `GF0101` (economic split only)
  - €1,467.7 m Ред, сигурност и правосъдие › Полиция `GF0301` (economic split only)
  - €1,218.6 m Пенсии и социална защита › Наследствени пенсии `GF1003` (leaf)
  - €1,209.8 m Икономика и транспорт › Горива и енергетика `GF0403` (economic split only)
  - €1,094.3 m Отбрана › Военна отбрана `GF0201` (economic split only)
  - €1,067.0 m Комунални дейности, култура и околна среда › Жилищно строителство и комунални дейности `GF06` (economic split only)
  - €961.1 m Пенсии и социална защита › Болест и инвалидност `GF1001` (economic split only)
  - €889.4 m Образование › Детски градини и начално образование `GF0901` (economic split only)
  - €784.2 m Образование › Висше образование `GF0904` (economic split only)
  - €764.0 m Ред, сигурност и правосъдие › Съдебна система `GF0303` (economic split only)
  - €747.2 m Здравеопазване › Извънболнична помощ `GF0702` (economic split only)
  - €747.0 m Комунални дейности, култура и околна среда › Култура, спорт и религия `GF08` (economic split only)
  - €692.4 m Икономика и транспорт › Земеделие, горско и рибно стопанство `GF0402` (economic split only)
  - €686.5 m Здравеопазване › Лекарства и медицински изделия `GF0701` (leaf)
  - €639.8 m Комунални дейности, култура и околна среда › Опазване на околната среда `GF05` (economic split only)
  - €543.2 m Държавно управление и дълг › Лихви по държавния дълг `GF0107` (economic split only)
  - €468.2 m Икономика и транспорт › Общи икономически, търговски и трудови дейности `GF0401` (economic split only)
  - €384.8 m Пенсии и социална защита › Безработица `GF1005` (economic split only)
  - €277.4 m Ред, сигурност и правосъдие › Пожарна безопасност `GF0302` (economic split only)
  - €276.0 m Пенсии и социална защита › Други дейности по социална защита `GF1009` (economic split only)
  - €253.9 m Здравеопазване › Други дейности по здравеопазване `GF0706` (economic split only)

