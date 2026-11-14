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
| budget-2024 | functions | 41,674.9 | 2.77 | 35.4% | 14.8% | 0.0% | 1376 |
| report-2024 | functions | 39,972.2 | 3.22 | 29.9% | 1.5% | 50.6% | 505 |
| budget-2025 | functions | 49,445.0 | 2.73 | 36.7% | 15.5% | 0.0% | 1379 |
| report-2025 | functions | 47,508.7 | 3.26 | 28.3% | 1.6% | 52.8% | 507 |
| budget-2026 | functions | 56,807.2 | 2.73 | 37.6% | 16.6% | 0.0% | 1409 |
| budget-2027 | functions | 55,972.1 | 2.29 | 76.4% | 13.4% | 0.0% | 1386 |
| ministries-2024 | ministries | 8,738.1 | 1.89 | 99.8% | 0.0% | 0.0% | 106 |
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

1376 open boxes, €39,515.6 m (94.8% of the total).

| € m | Share | Path | Depth | Why open | State | First lead |
| ---: | ---: | --- | ---: | --- | --- | --- |
| 9,963.5 | 23.9% | Пенсии и социална защита › Пенсии › Пенсии за стаж и възраст, инвалидност и наследствени (фонд „Пенсии“) `s-pen-labour` | 3 | leaf | todo | Explanatory memorandum to the ДОО budget bill (2026: вх. № 52-602-01-18), already used for benefits by type: pensions b… (script) |
| 2,349.2 | 5.6% | Икономика и транспорт › Други икономически дейности `e-other` | 2 | leaf | — |  |
| 1,844.6 | 4.4% | Ред, сигурност и правосъдие › Полиция, вътрешен ред и сигурност `o-police` | 2 | leaf | — |  |
| 1,826.7 | 4.4% | Здравеопазване › Здравна каса (НЗОК) › Болнична помощ `h-nhif-hospital` | 3 | leaf | todo | A link (graft mode=link) to the same box in the actuals, split by region and hospital from the НЗОК monthly reports (script) |
| 1,755.1 | 4.2% | Икономика и транспорт › Транспорт и съобщения `e-transport` | 2 | leaf | — |  |
| 1,721.9 | 4.1% | Икономика и транспорт › Енергетика, горива и минно дело `e-energy` | 2 | leaf | — |  |
| 1,429.0 | 3.4% | Образование › Министерство на образованието, собствени средства на общините и др. `ed-other` | 2 | remainder | todo | ПМС № 102/2026 annex 1: Ministry of Education and Science programmes (pre-school and school education €703.1 m in 2026… (script) |
| 1,422.6 | 3.4% | Държавно управление, дълг и ЕС › Общи държавни служби › Изпълнителна и законодателна власт › Министерства, агенции, парламент, президент и др. `g-executive-other` | 4 | remainder | todo | State Budget Act art. 2–47 units and ПМС № 102/2026 programmes (Parliament, Presidency, Council of Ministers, regional… (script) |
| 1,298.3 | 3.1% | Пенсии и социална защита › Социални помощи и обезщетения › Социални и семейни помощи, помощи за хора с увреждания `s-ben-assistance` | 3 | remainder | todo | ПМС № 102/2026 annex 1: the Ministry of Labour and Social Policy's administered items (monthly social assistance €78.6… (script) |
| 1,161.2 | 2.8% | Държавно управление, дълг и ЕС › Вноска в бюджета на ЕС `g-eu` | 2 | leaf | todo | The contribution by own resource (GNI-based, VAT-based, plastics, customs duties): the State Budget Act / budget report… (unknown) |
| 1,152.3 | 2.8% | Икономика и транспорт › Земеделие, гори, лов и риболов `e-agriculture` | 2 | leaf | — |  |
| 1,027.9 | 2.5% | Отбрана `defence` | 1 | leaf | — |  |
| 982.5 | 2.4% | Комунални дейности, култура и околна среда › Жилища, благоустройство и комунални дейности `c-housing` | 2 | leaf | — |  |
| 831.6 | 2.0% | Пенсии и социална защита › Социални услуги, програми за заетост и администрация › Програми за заетост, социални услуги и др. `s-svc-other` | 3 | remainder | todo | ПМС № 102/2026 annex 1: the labour ministry's employment and social-services programmes (ministries-2026), mapped and g… (script) |
| 829.7 | 2.0% | Пенсии и социална защита › Пенсии › Пенсии на военни, полицаи и др. (фонд по чл. 69 КСО) `s-pen-art69` | 3 | leaf | todo | Explanatory memorandum to the ДОО budget bill (2026: вх. № 52-602-01-18), already used for benefits by type: pensions b… (script) |
| 779.7 | 1.9% | Комунални дейности, култура и околна среда › Опазване на околната среда `c-environment` | 2 | leaf | — |  |
| 771.0 | 1.9% | Здравеопазване › Министерство на здравеопазването, болници и други `h-other` | 2 | remainder | todo | ПМС № 102/2026 annex 1: Ministry of Health programmes (emergency care, public health, state hospitals …), mapped and gr… (script) |
| 733.6 | 1.8% | Ред, сигурност и правосъдие › Съдебна власт `o-judiciary` | 2 | leaf | — |  |
| 526.3 | 1.3% | Здравеопазване › Здравна каса (НЗОК) › Лекарства, медицински изделия и диетични храни › Лекарства за домашно лечение `h-nhif-med-home` | 4 | leaf | blocked | НЗОК medicine reports 1 and 7 by active ingredient ("Lists" › "Medicines"): gross, before the ПРУ refunds (−1.09 bn lev… (script) |
| 516.7 | 1.2% | Държавно управление, дълг и ЕС › Лихви по държавния дълг `g-interest` | 2 | leaf | todo | Interest by instrument (domestic / external debt, by bond): State Budget Act art. 1 lines, the MoF debt bulletins — to… (unknown) |
| 465.3 | 1.1% | Здравеопазване › Здравна каса (НЗОК) › Лекарства, медицински изделия и диетични храни › Лекарства за онкологични заболявания и коагулопатии (в болница) `h-nhif-med-oncology-coag` | 4 | leaf | — |  |
| 431.3 | 1.0% | Образование › Детски градини и училища (държавни стандарти чрез общините) › София (Столична община) `ed-municipal-sofiya-grad` | 3 | leaf | todo | Sofia's allocation of the state-delegated education money to each school and kindergarten (Plovdiv publishes one, "List… (unknown) |
| 418.9 | 1.0% | Комунални дейности, култура и околна среда › Култура, спорт и религия › Култура › Театри, музеи, опери и др. `c-culture-other` | 4 | remainder | todo | ПМС № 102/2026 annex 1: Ministry of Culture programmes (theatres, operas, museums), mapped and grafted into this remain… (script) |
| 412.7 | 1.0% | Образование › Държавни университети (субсидия) `ed-universities` | 2 | leaf | — |  |
| 368.8 | 0.9% | Държавно управление, дълг и ЕС › Общи държавни служби › Наука `g-science` | 3 | leaf | — |  |
| 215.9 | 0.5% | Пенсии и социална защита › Пенсии › Пенсии, несвързани с трудова дейност `s-pen-noncontrib` | 3 | leaf | todo | Explanatory memorandum to the ДОО budget bill (2026: вх. № 52-602-01-18), already used for benefits by type: pensions b… (script) |
| 154.3 | 0.4% | Ред, сигурност и правосъдие › Затвори `o-prisons` | 2 | leaf | — |  |
| 126.5 | 0.3% | Ред, сигурност и правосъдие › Защита при бедствия и аварии `o-civil` | 2 | leaf | — |  |
| 125.7 | 0.3% | Образование › Детски градини и училища (държавни стандарти чрез общините) › Област Пловдив › Община Пловдив `ed-municipal-plovdiv-plovdiv` | 4 | leaf | — |  |
| 122.1 | 0.3% | Здравеопазване › Здравна каса (НЗОК) › Резерв за непредвидени разходи `h-nhif-reserve` | 3 | leaf | — |  |
| 118.8 | 0.3% | Образование › Детски градини и училища (държавни стандарти чрез общините) › Област Варна › Община Варна `ed-municipal-varna-varna` | 4 | leaf | — |  |
| 93.8 | 0.2% | Образование › Детски градини и училища (държавни стандарти чрез общините) › Област Бургас › Община Бургас `ed-municipal-burgas-burgas` | 4 | leaf | — |  |
| 93.5 | 0.2% | Пенсии и социална защита › Социални услуги, програми за заетост и администрация › Администрация на НОИ `s-svc-noi` | 3 | leaf | — |  |
| 84.2 | 0.2% | Комунални дейности, култура и околна среда › Култура, спорт и религия › Спорт `c-sport` | 3 | leaf | — |  |
| 82.9 | 0.2% | Здравеопазване › Здравна каса (НЗОК) › Медицински изделия в болниците `h-nhif-devices` | 3 | leaf | — |  |
| 76.4 | 0.2% | Държавно управление, дълг и ЕС › Общи държавни служби › Общи служби `g-services` | 3 | leaf | — |  |
| 62.1 | 0.1% | Здравеопазване › Здравна каса (НЗОК) › Лечение в други страни от ЕС `h-nhif-abroad` | 3 | leaf | — |  |
| 61.3 | 0.1% | Здравеопазване › Здравна каса (НЗОК) › Администрация на НЗОК `h-nhif-admin` | 3 | leaf | — |  |
| 53.8 | 0.1% | Пенсии и социална защита › Пенсии › Учителски пенсионен фонд `s-pen-teachers` | 3 | leaf | — |  |
| 51.3 | 0.1% | Образование › Детски градини и училища (държавни стандарти чрез общините) › Област Стара Загора › Община Стара Загора `ed-municipal-stara-zagora-stara-zagora` | 4 | leaf | — |  |

### report-2024 — 2024 actual

505 open boxes, €39,068.3 m (97.7% of the total).

| € m | Share | Path | Depth | Why open | State | First lead |
| ---: | ---: | --- | ---: | --- | --- | --- |
| 11,131.1 | 27.8% | Пенсии и социална защита › Пенсии `s-pensions` | 2 | leaf | todo | НОИ / ДОО execution data: reports on the ДОО budget by fund and benefit (not researched yet, docs/data-depth.md §5) (unknown) |
| 2,868.1 | 7.2% | Образование › Общини `education.municipalities` | 2 | economic split only | todo | Big cities' year-end B3 by ЕБК activity (cities-2024/2025: Sofia, Plovdiv, Burgas); other municipalities publish B3 onl… (script) |
| 1,741.1 | 4.4% | Ред, сигурност и правосъдие › Полиция, вътрешен ред и сигурност › Държавен бюджет (министерства и ведомства) `o-police.state` | 3 | economic split only | — |  |
| 1,700.4 | 4.3% | Икономика и транспорт › Транспорт и съобщения › Държавен бюджет (министерства и ведомства) `e-transport.state` | 3 | economic split only | — |  |
| 1,646.3 | 4.1% | Отбрана › Държавен бюджет (министерства и ведомства) `defence.state` | 2 | economic split only | — |  |
| 1,515.2 | 3.8% | Пенсии и социална защита › Социални помощи и обезщетения › Социалноосигурителни фондове `s-benefits.social-security` | 3 | leaf | todo | НОИ / ДОО execution data: reports on the ДОО budget by fund and benefit (not researched yet, docs/data-depth.md §5) (unknown) |
| 1,290.3 | 3.2% | Икономика и транспорт › Енергетика, горива и минно дело › Фонд „Сигурност на електроенергийната система“ `e-energy.fses` | 3 | economic split only | todo | SEBRA payments of system 124 (ФСЕС) in 2024: €1,298.5 m = 100.6% of the КФП €1,290.4 m — over 100%, so not parts as the… (script) |
| 1,163.6 | 2.9% | Пенсии и социална защита › Социални услуги, програми за заетост и администрация › Общини `s-services.municipalities` | 3 | economic split only | todo | Big cities' year-end B3 by ЕБК activity (cities-2024/2025: Sofia, Plovdiv, Burgas); other municipalities publish B3 onl… (script) |
| 887.8 | 2.2% | Държавно управление, дълг и ЕС › Общи държавни служби › Изпълнителна и законодателна власт › Държавен бюджет (министерства и ведомства) `g-executive.state` | 4 | economic split only | — |  |
| 857.4 | 2.1% | Пенсии и социална защита › Социални помощи и обезщетения › Държавен бюджет (министерства и ведомства) `s-benefits.state` | 3 | leaf | — |  |
| 814.0 | 2.0% | Държавно управление, дълг и ЕС › Вноска в бюджета на ЕС `g-eu` | 2 | leaf | todo | The contribution by own resource (GNI-based, VAT-based, plastics, customs duties): the State Budget Act / budget report… (unknown) |
| 811.6 | 2.0% | Образование › Държавни университети `education.universities` | 2 | economic split only | todo | Universities' own budget reports (no central table found) or SEBRA payments of the universities' systems — to verify (unknown) |
| 718.0 | 1.8% | Икономика и транспорт › Земеделие, гори, лов и риболов › Държавен бюджет (министерства и ведомства) `e-agriculture.state` | 3 | economic split only | — |  |
| 706.1 | 1.8% | Ред, сигурност и правосъдие › Съдебна власт › Държавен бюджет (министерства и ведомства) `o-judiciary.state` | 3 | economic split only | — |  |
| 688.3 | 1.7% | Държавно управление, дълг и ЕС › Общи държавни служби › Изпълнителна и законодателна власт › Общини `g-executive.municipalities` | 4 | economic split only | todo | Big cities' year-end B3 by ЕБК activity (cities-2024/2025: Sofia, Plovdiv, Burgas); other municipalities publish B3 onl… (script) |
| 610.0 | 1.5% | Здравеопазване › Министерство на здравеопазването, болници, европейски средства и др. `health.other` | 2 | remainder | todo | 2025 report pr.4: the ministries' actuals by policy area (ministries-report-2025), mapped area → sub-function (script) |
| 596.1 | 1.5% | Комунални дейности, култура и околна среда › Опазване на околната среда › Общини `c-environment.municipalities` | 3 | economic split only | todo | Big cities' year-end B3 by ЕБК activity (cities-2024/2025: Sofia, Plovdiv, Burgas); other municipalities publish B3 onl… (script) |
| 523.1 | 1.3% | Здравеопазване › Здравна каса (НЗОК) › Лекарства, медицински изделия и диетични храни › Лекарства за домашно лечение `h-nhif-med-home` | 4 | leaf | blocked | НЗОК medicine reports 1 and 7 by active ingredient ("Lists" › "Medicines"): gross, before the ПРУ refunds (−1.09 bn lev… (script) |
| 519.4 | 1.3% | Икономика и транспорт › Транспорт и съобщения › Общини `e-transport.municipalities` | 3 | economic split only | todo | Big cities' year-end B3 by ЕБК activity (cities-2024/2025: Sofia, Plovdiv, Burgas); other municipalities publish B3 onl… (script) |
| 514.6 | 1.3% | Образование › Държавен бюджет (министерства и ведомства) `education.state` | 2 | economic split only | — |  |
| 487.5 | 1.2% | Държавно управление, дълг и ЕС › Лихви по държавния дълг › Държавен бюджет (министерства и ведомства) `g-interest.state` | 3 | leaf | todo | Interest by instrument (domestic / external debt): the debt section of the budget report, MoF debt bulletins — to verify (unknown) |
| 452.2 | 1.1% | Здравеопазване › Здравна каса (НЗОК) › Лекарства, медицински изделия и диетични храни › Лекарства за онкологични заболявания (в болница) `h-nhif-med-oncology` | 4 | leaf | blocked | НЗОК medicine reports 1 and 7 by active ingredient ("Lists" › "Medicines"): gross, before the ПРУ refunds (−1.09 bn lev… (script) |
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
| 102.7 | 0.3% | Икономика и транспорт › Други икономически дейности › Общини `e-other.municipalities` | 3 | economic split only | — |  |
| 98.2 | 0.2% | Пенсии и социална защита › Социални услуги, програми за заетост и администрация › Социалноосигурителни фондове `s-services.social-security` | 3 | economic split only | — |  |
| 94.8 | 0.2% | Комунални дейности, култура и околна среда › Култура, спорт и религия › Култура › Обществени медии (БНТ, БНР, БТА) `c-culture-culture.media` | 4 | economic split only | — |  |
| 93.9 | 0.2% | Комунални дейности, култура и околна среда › Култура, спорт и религия › Спорт › Общини `c-sport.municipalities` | 4 | economic split only | — |  |

### budget-2025 — Budget 2025

1379 open boxes, €46,872.5 m (94.8% of the total).

| € m | Share | Path | Depth | Why open | State | First lead |
| ---: | ---: | --- | ---: | --- | --- | --- |
| 11,126.2 | 22.5% | Пенсии и социална защита › Пенсии › Пенсии за стаж и възраст, инвалидност и наследствени (фонд „Пенсии“) `s-pen-labour` | 3 | leaf | todo | Explanatory memorandum to the ДОО budget bill (2026: вх. № 52-602-01-18), already used for benefits by type: pensions b… (script) |
| 2,921.5 | 5.9% | Икономика и транспорт › Транспорт и съобщения `e-transport` | 2 | leaf | — |  |
| 2,750.4 | 5.6% | Ред, сигурност и правосъдие › Полиция, вътрешен ред и сигурност `o-police` | 2 | leaf | — |  |
| 2,126.8 | 4.3% | Отбрана `defence` | 1 | leaf | — |  |
| 2,124.6 | 4.3% | Здравеопазване › Здравна каса (НЗОК) › Болнична помощ `h-nhif-hospital` | 3 | leaf | todo | A link (graft mode=link) to the same box in the actuals, split by region and hospital from the НЗОК monthly reports (script) |
| 1,924.9 | 3.9% | Икономика и транспорт › Земеделие, гори, лов и риболов `e-agriculture` | 2 | leaf | — |  |
| 1,864.7 | 3.8% | Образование › Министерство на образованието, собствени средства на общините и др. `ed-other` | 2 | remainder | todo | ПМС № 102/2026 annex 1: Ministry of Education and Science programmes (pre-school and school education €703.1 m in 2026… (script) |
| 1,645.7 | 3.3% | Пенсии и социална защита › Социални помощи и обезщетения › Социални и семейни помощи, помощи за хора с увреждания `s-ben-assistance` | 3 | remainder | todo | ПМС № 102/2026 annex 1: the Ministry of Labour and Social Policy's administered items (monthly social assistance €78.6… (script) |
| 1,613.4 | 3.3% | Икономика и транспорт › Енергетика, горива и минно дело `e-energy` | 2 | leaf | — |  |
| 1,591.7 | 3.2% | Държавно управление, дълг и ЕС › Общи държавни служби › Изпълнителна и законодателна власт › Министерства, агенции, парламент, президент и др. `g-executive-other` | 4 | remainder | todo | State Budget Act art. 2–47 units and ПМС № 102/2026 programmes (Parliament, Presidency, Council of Ministers, regional… (script) |
| 1,259.2 | 2.5% | Комунални дейности, култура и околна среда › Жилища, благоустройство и комунални дейности `c-housing` | 2 | leaf | — |  |
| 1,094.7 | 2.2% | Пенсии и социална защита › Социални услуги, програми за заетост и администрация › Програми за заетост, социални услуги и др. `s-svc-other` | 3 | remainder | todo | ПМС № 102/2026 annex 1: the labour ministry's employment and social-services programmes (ministries-2026), mapped and g… (script) |
| 1,033.1 | 2.1% | Държавно управление, дълг и ЕС › Вноска в бюджета на ЕС `g-eu` | 2 | leaf | todo | The contribution by own resource (GNI-based, VAT-based, plastics, customs duties): the State Budget Act / budget report… (unknown) |
| 1,029.4 | 2.1% | Икономика и транспорт › Други икономически дейности `e-other` | 2 | leaf | — |  |
| 1,009.1 | 2.0% | Здравеопазване › Министерство на здравеопазването, болници и други `h-other` | 2 | remainder | todo | ПМС № 102/2026 annex 1: Ministry of Health programmes (emergency care, public health, state hospitals …), mapped and gr… (script) |
| 919.5 | 1.9% | Пенсии и социална защита › Пенсии › Пенсии на военни, полицаи и др. (фонд по чл. 69 КСО) `s-pen-art69` | 3 | leaf | todo | Explanatory memorandum to the ДОО budget bill (2026: вх. № 52-602-01-18), already used for benefits by type: pensions b… (script) |
| 829.9 | 1.7% | Държавно управление, дълг и ЕС › Лихви по държавния дълг `g-interest` | 2 | leaf | todo | Interest by instrument (domestic / external debt, by bond): State Budget Act art. 1 lines, the MoF debt bulletins — to… (unknown) |
| 827.1 | 1.7% | Комунални дейности, култура и околна среда › Опазване на околната среда `c-environment` | 2 | leaf | — |  |
| 819.5 | 1.7% | Ред, сигурност и правосъдие › Съдебна власт `o-judiciary` | 2 | leaf | — |  |
| 619.0 | 1.3% | Образование › Държавни университети (субсидия) `ed-universities` | 2 | leaf | — |  |
| 567.6 | 1.1% | Здравеопазване › Здравна каса (НЗОК) › Лекарства, медицински изделия и диетични храни › Лекарства за домашно лечение `h-nhif-med-home` | 4 | leaf | blocked | НЗОК medicine reports 1 and 7 by active ingredient ("Lists" › "Medicines"): gross, before the ПРУ refunds (−1.09 bn lev… (script) |
| 537.0 | 1.1% | Здравеопазване › Здравна каса (НЗОК) › Лекарства, медицински изделия и диетични храни › Лекарства за онкологични заболявания (в болница) `h-nhif-med-oncology` | 4 | leaf | blocked | НЗОК medicine reports 1 and 7 by active ingredient ("Lists" › "Medicines"): gross, before the ПРУ refunds (−1.09 bn lev… (script) |
| 492.3 | 1.0% | Образование › Детски градини и училища (държавни стандарти чрез общините) › София (Столична община) `ed-municipal-sofiya-grad` | 3 | leaf | todo | Sofia's allocation of the state-delegated education money to each school and kindergarten (Plovdiv publishes one, "List… (unknown) |
| 449.4 | 0.9% | Комунални дейности, култура и околна среда › Култура, спорт и религия › Култура › Театри, музеи, опери и др. `c-culture-other` | 4 | remainder | todo | ПМС № 102/2026 annex 1: Ministry of Culture programmes (theatres, operas, museums), mapped and grafted into this remain… (script) |
| 437.6 | 0.9% | Държавно управление, дълг и ЕС › Общи държавни служби › Наука `g-science` | 3 | leaf | — |  |
| 238.7 | 0.5% | Пенсии и социална защита › Пенсии › Пенсии, несвързани с трудова дейност `s-pen-noncontrib` | 3 | leaf | todo | Explanatory memorandum to the ДОО budget bill (2026: вх. № 52-602-01-18), already used for benefits by type: pensions b… (script) |
| 222.3 | 0.4% | Ред, сигурност и правосъдие › Затвори `o-prisons` | 2 | leaf | — |  |
| 142.0 | 0.3% | Здравеопазване › Здравна каса (НЗОК) › Резерв за непредвидени разходи `h-nhif-reserve` | 3 | leaf | — |  |
| 141.1 | 0.3% | Образование › Детски градини и училища (държавни стандарти чрез общините) › Област Пловдив › Община Пловдив `ed-municipal-plovdiv-plovdiv` | 4 | leaf | — |  |
| 134.0 | 0.3% | Образование › Детски градини и училища (държавни стандарти чрез общините) › Област Варна › Община Варна `ed-municipal-varna-varna` | 4 | leaf | — |  |
| 131.6 | 0.3% | Ред, сигурност и правосъдие › Защита при бедствия и аварии `o-civil` | 2 | leaf | — |  |
| 127.9 | 0.3% | Комунални дейности, култура и околна среда › Култура, спорт и религия › Спорт `c-sport` | 3 | leaf | — |  |
| 115.0 | 0.2% | Държавно управление, дълг и ЕС › Общи държавни служби › Общи служби `g-services` | 3 | leaf | — |  |
| 106.5 | 0.2% | Образование › Детски градини и училища (държавни стандарти чрез общините) › Област Бургас › Община Бургас `ed-municipal-burgas-burgas` | 4 | leaf | — |  |
| 106.0 | 0.2% | Здравеопазване › Здравна каса (НЗОК) › Медицински изделия в болниците `h-nhif-devices` | 3 | leaf | — |  |
| 103.2 | 0.2% | Пенсии и социална защита › Социални услуги, програми за заетост и администрация › Администрация на НОИ `s-svc-noi` | 3 | leaf | — |  |
| 67.5 | 0.1% | Здравеопазване › Здравна каса (НЗОК) › Администрация на НЗОК `h-nhif-admin` | 3 | leaf | — |  |
| 63.8 | 0.1% | Пенсии и социална защита › Пенсии › Учителски пенсионен фонд `s-pen-teachers` | 3 | leaf | — |  |
| 59.6 | 0.1% | Здравеопазване › Здравна каса (НЗОК) › Лечение в други страни от ЕС `h-nhif-abroad` | 3 | leaf | — |  |
| 58.2 | 0.1% | Образование › Детски градини и училища (държавни стандарти чрез общините) › Област Стара Загора › Община Стара Загора `ed-municipal-stara-zagora-stara-zagora` | 4 | leaf | — |  |

### report-2025 — 2025 actual

507 open boxes, €46,470.3 m (97.8% of the total).

| € m | Share | Path | Depth | Why open | State | First lead |
| ---: | ---: | --- | ---: | --- | --- | --- |
| 12,396.7 | 26.1% | Пенсии и социална защита › Пенсии `s-pensions` | 2 | leaf | todo | НОИ / ДОО execution data: reports on the ДОО budget by fund and benefit (not researched yet, docs/data-depth.md §5) (unknown) |
| 3,156.4 | 6.6% | Образование › Общини `education.municipalities` | 2 | economic split only | todo | Big cities' year-end B3 by ЕБК activity (cities-2024/2025: Sofia, Plovdiv, Burgas); other municipalities publish B3 onl… (script) |
| 2,402.2 | 5.1% | Ред, сигурност и правосъдие › Полиция, вътрешен ред и сигурност › Държавен бюджет (министерства и ведомства) `o-police.state` | 3 | economic split only | todo | 2025 report pr.4: the ministries' actuals by policy area (ministries-report-2025), mapped area → sub-function (script) |
| 2,129.7 | 4.5% | Отбрана › Държавен бюджет (министерства и ведомства) `defence.state` | 2 | economic split only | todo | ministries-report-2025: the defence ministry's "Defence capabilities" €2,258.1 m is larger than the box (€2,129.7 m), s… (script) |
| 1,914.0 | 4.0% | Икономика и транспорт › Транспорт и съобщения › Държавен бюджет (министерства и ведомства) `e-transport.state` | 3 | economic split only | todo | 2025 report pr.4: the ministries' actuals by policy area (ministries-report-2025), mapped area → sub-function (script) |
| 1,626.4 | 3.4% | Пенсии и социална защита › Социални помощи и обезщетения › Социалноосигурителни фондове `s-benefits.social-security` | 3 | leaf | todo | НОИ / ДОО execution data: reports on the ДОО budget by fund and benefit (not researched yet, docs/data-depth.md §5) (unknown) |
| 1,485.9 | 3.1% | Пенсии и социална защита › Социални услуги, програми за заетост и администрация › Общини `s-services.municipalities` | 3 | economic split only | todo | Big cities' year-end B3 by ЕБК activity (cities-2024/2025: Sofia, Plovdiv, Burgas); other municipalities publish B3 onl… (script) |
| 1,243.3 | 2.6% | Икономика и транспорт › Енергетика, горива и минно дело › Фонд „Сигурност на електроенергийната система“ `e-energy.fses` | 3 | economic split only | todo | SEBRA payments of system 124 (ФСЕС) in 2025: €1,240.6 m = 99.8% of the КФП €1,243.3 m — companies €1,211.7 m (НЕК €317.… (script) |
| 1,041.0 | 2.2% | Държавно управление, дълг и ЕС › Вноска в бюджета на ЕС `g-eu` | 2 | leaf | todo | The contribution by own resource (GNI-based, VAT-based, plastics, customs duties): the State Budget Act / budget report… (unknown) |
| 1,016.2 | 2.1% | Държавно управление, дълг и ЕС › Общи държавни служби › Изпълнителна и законодателна власт › Държавен бюджет (министерства и ведомства) `g-executive.state` | 4 | economic split only | todo | 2025 report pr.4: the ministries' actuals by policy area (ministries-report-2025), mapped area → sub-function (script) |
| 986.5 | 2.1% | Пенсии и социална защита › Социални помощи и обезщетения › Държавен бюджет (министерства и ведомства) `s-benefits.state` | 3 | leaf | todo | 2025 report pr.4: the ministries' actuals by policy area (ministries-report-2025), mapped area → sub-function (script) |
| 944.8 | 2.0% | Образование › Държавни университети `education.universities` | 2 | economic split only | todo | Universities' own budget reports (no central table found) or SEBRA payments of the universities' systems — to verify (unknown) |
| 878.0 | 1.8% | Икономика и транспорт › Транспорт и съобщения › Европейски средства `e-transport.eu` | 3 | economic split only | todo | MoF EU programme tables (data.egov.bg 4226, 18860), the Recovery Plan by investment (18958) and the ИСУН projects ("Lis… (script) |
| 859.9 | 1.8% | Икономика и транспорт › Земеделие, гори, лов и риболов › Европейски средства `e-agriculture.eu` | 3 | economic split only | todo | State Fund Agriculture payments by measure, FY2025 ("Lists" › "EU funds" › farm subsidies): EU direct payments and rura… (script) |
| 814.8 | 1.7% | Комунални дейности, култура и околна среда › Жилища, благоустройство и комунални дейности › Общини `c-housing.municipalities` | 3 | economic split only | todo | Big cities' year-end B3 by ЕБК activity (cities-2024/2025: Sofia, Plovdiv, Burgas); other municipalities publish B3 onl… (script) |
| 792.1 | 1.7% | Ред, сигурност и правосъдие › Съдебна власт › Държавен бюджет (министерства и ведомства) `o-judiciary.state` | 3 | economic split only | todo | 2025 report pr.4: the ministries' actuals by policy area (ministries-report-2025), mapped area → sub-function (script) |
| 762.4 | 1.6% | Здравеопазване › Министерство на здравеопазването, болници, европейски средства и др. `health.other` | 2 | remainder | todo | 2025 report pr.4: the ministries' actuals by policy area (ministries-report-2025), mapped area → sub-function (script) |
| 712.5 | 1.5% | Държавно управление, дълг и ЕС › Общи държавни служби › Изпълнителна и законодателна власт › Общини `g-executive.municipalities` | 4 | economic split only | todo | Big cities' year-end B3 by ЕБК activity (cities-2024/2025: Sofia, Plovdiv, Burgas); other municipalities publish B3 onl… (script) |
| 708.9 | 1.5% | Държавно управление, дълг и ЕС › Лихви по държавния дълг › Държавен бюджет (министерства и ведомства) `g-interest.state` | 3 | leaf | todo | Interest by instrument (domestic / external debt): the debt section of the budget report, MoF debt bulletins — to verify (unknown) |
| 627.8 | 1.3% | Комунални дейности, култура и околна среда › Опазване на околната среда › Общини `c-environment.municipalities` | 3 | economic split only | todo | Big cities' year-end B3 by ЕБК activity (cities-2024/2025: Sofia, Plovdiv, Burgas); other municipalities publish B3 onl… (script) |
| 587.7 | 1.2% | Образование › Държавен бюджет (министерства и ведомства) `education.state` | 2 | economic split only | todo | 2025 report pr.4: the ministries' actuals by policy area (ministries-report-2025), mapped area → sub-function (script) |
| 548.8 | 1.2% | Здравеопазване › Здравна каса (НЗОК) › Лекарства, медицински изделия и диетични храни › Лекарства за домашно лечение `h-nhif-med-home` | 4 | leaf | blocked | НЗОК medicine reports 1 and 7 by active ingredient ("Lists" › "Medicines"): gross, before the ПРУ refunds (−1.09 bn lev… (script) |
| 542.9 | 1.1% | Икономика и транспорт › Транспорт и съобщения › Общини `e-transport.municipalities` | 3 | economic split only | todo | Big cities' year-end B3 by ЕБК activity (cities-2024/2025: Sofia, Plovdiv, Burgas); other municipalities publish B3 onl… (script) |
| 519.0 | 1.1% | Здравеопазване › Здравна каса (НЗОК) › Лекарства, медицински изделия и диетични храни › Лекарства за онкологични заболявания (в болница) `h-nhif-med-oncology` | 4 | leaf | blocked | НЗОК medicine reports 1 and 7 by active ingredient ("Lists" › "Medicines"): gross, before the ПРУ refunds (−1.09 bn lev… (script) |
| 472.1 | 1.0% | Образование › Европейски средства `education.eu` | 2 | economic split only | todo | MoF EU programme tables (data.egov.bg 4226, 18860), the Recovery Plan by investment (18958) and the ИСУН projects ("Lis… (script) |
| 459.8 | 1.0% | Пенсии и социална защита › Социални услуги, програми за заетост и администрация › Европейски средства `s-services.eu` | 3 | economic split only | todo | MoF EU programme tables (data.egov.bg 4226, 18860), the Recovery Plan by investment (18958) and the ИСУН projects ("Lis… (script) |
| 447.1 | 0.9% | Икономика и транспорт › Земеделие, гори, лов и риболов › Държавен бюджет (министерства и ведомства) `e-agriculture.state` | 3 | economic split only | todo | 2025 report pr.4: the ministries' actuals by policy area (ministries-report-2025), mapped area → sub-function (script) |
| 320.8 | 0.7% | Комунални дейности, култура и околна среда › Култура, спорт и религия › Култура › Общини `c-culture-culture.municipalities` | 4 | economic split only | todo | Big cities' year-end B3 by ЕБК activity (cities-2024/2025: Sofia, Plovdiv, Burgas); other municipalities publish B3 onl… (script) |
| 277.5 | 0.6% | Здравеопазване › Общини `health.municipalities` | 2 | economic split only | todo | Big cities' year-end B3 by ЕБК activity (cities-2024/2025: Sofia, Plovdiv, Burgas); other municipalities publish B3 onl… (script) |
| 258.1 | 0.5% | Комунални дейности, култура и околна среда › Жилища, благоустройство и комунални дейности › Европейски средства `c-housing.eu` | 3 | economic split only | todo | MoF EU programme tables (data.egov.bg 4226, 18860), the Recovery Plan by investment (18958) and the ИСУН projects ("Lis… (script) |
| 226.2 | 0.5% | Икономика и транспорт › Други икономически дейности › Европейски средства `e-other.eu` | 3 | economic split only | — |  |
| 215.8 | 0.5% | Ред, сигурност и правосъдие › Затвори › Държавен бюджет (министерства и ведомства) `o-prisons.state` | 3 | economic split only | — |  |
| 214.1 | 0.5% | Комунални дейности, култура и околна среда › Култура, спорт и религия › Култура › Държавен бюджет (министерства и ведомства) `c-culture-culture.state` | 4 | economic split only | — |  |
| 210.5 | 0.4% | Държавно управление, дълг и ЕС › Общи държавни служби › Наука › БАН и Селскостопанска академия `g-science.academies` | 4 | economic split only | — |  |
| 203.6 | 0.4% | Пенсии и социална защита › Социални услуги, програми за заетост и администрация › Държавен бюджет (министерства и ведомства) `s-services.state` | 3 | economic split only | — |  |
| 130.8 | 0.3% | Комунални дейности, култура и околна среда › Опазване на околната среда › Европейски средства `c-environment.eu` | 3 | economic split only | — |  |
| 126.9 | 0.3% | Икономика и транспорт › Други икономически дейности › Общини `e-other.municipalities` | 3 | economic split only | — |  |
| 123.3 | 0.3% | Ред, сигурност и правосъдие › Полиция, вътрешен ред и сигурност › Европейски средства `o-police.eu` | 3 | economic split only | — |  |
| 121.3 | 0.3% | Държавно управление, дълг и ЕС › Общи държавни служби › Изпълнителна и законодателна власт › Европейски средства `g-executive.eu` | 4 | economic split only | — |  |
| 119.2 | 0.3% | Комунални дейности, култура и околна среда › Култура, спорт и религия › Спорт › Общини `c-sport.municipalities` | 4 | economic split only | — |  |

### budget-2026 — Budget 2026

1409 open boxes, €54,089.7 m (95.2% of the total).

| € m | Share | Path | Depth | Why open | State | First lead |
| ---: | ---: | --- | ---: | --- | --- | --- |
| 12,205.7 | 21.5% | Пенсии и социална защита › Пенсии › Пенсии за стаж и възраст, инвалидност и наследствени (фонд „Пенсии“) `s-pen-labour` | 3 | leaf | todo | Explanatory memorandum to the ДОО budget bill (2026: вх. № 52-602-01-18), already used for benefits by type: pensions b… (script) |
| 3,449.4 | 6.1% | Икономика и транспорт › Транспорт и съобщения `e-transport` | 2 | leaf | todo | ПМС № 102/2026 annex 1: every ministry programme (ministries-2026), mapped programme → sub-function and grafted (next r… (script) |
| 2,801.2 | 4.9% | Икономика и транспорт › Енергетика, горива и минно дело `e-energy` | 2 | leaf | todo | MTBF 2026–2028 (РМС № 597/2026) annex 8 „Размери на разходите и трансферите (нето) по други икономически обособени лица… (script) |
| 2,750.3 | 4.8% | Ред, сигурност и правосъдие › Полиция, вътрешен ред и сигурност `o-police` | 2 | leaf | todo | ПМС № 102/2026 annex 1: every ministry programme (ministries-2026), mapped programme → sub-function and grafted (next r… (script) |
| 2,467.8 | 4.3% | Отбрана `defence` | 1 | leaf | todo | ПМС № 102/2026 annex 1: every ministry programme (ministries-2026), mapped programme → sub-function and grafted (next r… (script) |
| 2,341.9 | 4.1% | Здравеопазване › Здравна каса (НЗОК) › Болнична помощ `h-nhif-hospital` | 3 | leaf | todo | A link (graft mode=link) to the same box in the actuals, split by region and hospital from the НЗОК monthly reports (script) |
| 2,118.6 | 3.7% | Икономика и транспорт › Други икономически дейности `e-other` | 2 | leaf | todo | ПМС № 102/2026 annex 1: every ministry programme (ministries-2026), mapped programme → sub-function and grafted (next r… (script) |
| 2,023.5 | 3.6% | Образование › Министерство на образованието, собствени средства на общините и др. `ed-other` | 2 | remainder | todo | ПМС № 102/2026 annex 1: Ministry of Education and Science programmes (pre-school and school education €703.1 m in 2026… (script) |
| 1,943.2 | 3.4% | Пенсии и социална защита › Социални помощи и обезщетения › Социални и семейни помощи, помощи за хора с увреждания `s-ben-assistance` | 3 | remainder | todo | ПМС № 102/2026 annex 1: the Ministry of Labour and Social Policy's administered items (monthly social assistance €78.6… (script) |
| 1,921.1 | 3.4% | Държавно управление, дълг и ЕС › Общи държавни служби › Изпълнителна и законодателна власт › Министерства, агенции, парламент, президент и др. `g-executive-other` | 4 | remainder | todo | State Budget Act art. 2–47 units and ПМС № 102/2026 programmes (Parliament, Presidency, Council of Ministers, regional… (script) |
| 1,886.4 | 3.3% | Комунални дейности, култура и околна среда › Жилища, благоустройство и комунални дейности `c-housing` | 2 | leaf | todo | ПМС № 102/2026 annex 1: every ministry programme (ministries-2026), mapped programme → sub-function and grafted (next r… (script) |
| 1,409.4 | 2.5% | Икономика и транспорт › Земеделие, гори, лов и риболов `e-agriculture` | 2 | leaf | todo | ПМС № 102/2026 annex 1: every ministry programme (ministries-2026), mapped programme → sub-function and grafted (next r… (script) |
| 1,350.8 | 2.4% | Пенсии и социална защита › Социални услуги, програми за заетост и администрация › Програми за заетост, социални услуги и др. `s-svc-other` | 3 | remainder | todo | ПМС № 102/2026 annex 1: the labour ministry's employment and social-services programmes (ministries-2026), mapped and g… (script) |
| 1,282.2 | 2.3% | Държавно управление, дълг и ЕС › Вноска в бюджета на ЕС `g-eu` | 2 | leaf | todo | The contribution by own resource (GNI-based, VAT-based, plastics, customs duties): the State Budget Act / budget report… (unknown) |
| 1,202.7 | 2.1% | Здравеопазване › Министерство на здравеопазването, болници и други `h-other` | 2 | remainder | todo | ПМС № 102/2026 annex 1: Ministry of Health programmes (emergency care, public health, state hospitals …), mapped and gr… (script) |
| 1,136.7 | 2.0% | Здравеопазване › Здравна каса (НЗОК) › Лекарства, медицински изделия и диетични храни › Оригинални (референтни) лекарства `h-nhif-med-reference` | 4 | leaf | blocked | НЗОК medicine reports 1 and 7 by active ingredient ("Lists" › "Medicines"): gross, before the ПРУ refunds (−1.09 bn lev… (script) |
| 1,059.2 | 1.9% | Държавно управление, дълг и ЕС › Лихви по държавния дълг `g-interest` | 2 | leaf | todo | Interest by instrument (domestic / external debt, by bond): State Budget Act art. 1 lines, the MoF debt bulletins — to… (unknown) |
| 992.4 | 1.7% | Пенсии и социална защита › Пенсии › Пенсии на военни, полицаи и др. (фонд по чл. 69 КСО) `s-pen-art69` | 3 | leaf | todo | Explanatory memorandum to the ДОО budget bill (2026: вх. № 52-602-01-18), already used for benefits by type: pensions b… (script) |
| 870.6 | 1.5% | Ред, сигурност и правосъдие › Съдебна власт `o-judiciary` | 2 | leaf | todo | State Budget Act 2026, the judiciary's article (by functional area: "Ministries 2026" › Съдебна власт), and a table by… (script) |
| 824.4 | 1.5% | Комунални дейности, култура и околна среда › Опазване на околната среда `c-environment` | 2 | leaf | todo | ПМС № 102/2026 annex 1: every ministry programme (ministries-2026), mapped programme → sub-function and grafted (next r… (script) |
| 580.1 | 1.0% | Комунални дейности, култура и околна среда › Култура, спорт и религия › Култура › Театри, музеи, опери и др. `c-culture-other` | 4 | remainder | todo | ПМС № 102/2026 annex 1: Ministry of Culture programmes (theatres, operas, museums), mapped and grafted into this remain… (script) |
| 535.3 | 0.9% | Образование › Детски градини и училища (държавни стандарти чрез общините) › София (Столична община) `ed-municipal-sofiya-grad` | 3 | leaf | todo | Sofia's allocation of the state-delegated education money to each school and kindergarten (Plovdiv publishes one, "List… (unknown) |
| 387.9 | 0.7% | Държавно управление, дълг и ЕС › Общи държавни служби › Наука › Друга наука `g-science-other` | 4 | remainder | todo | ПМС № 102/2026 annex 1: every ministry programme (ministries-2026), mapped programme → sub-function and grafted (next r… (script) |
| 264.7 | 0.5% | Пенсии и социална защита › Пенсии › Пенсии, несвързани с трудова дейност `s-pen-noncontrib` | 3 | leaf | todo | Explanatory memorandum to the ДОО budget bill (2026: вх. № 52-602-01-18), already used for benefits by type: pensions b… (script) |
| 229.1 | 0.4% | Ред, сигурност и правосъдие › Затвори `o-prisons` | 2 | leaf | — |  |
| 162.6 | 0.3% | Комунални дейности, култура и околна среда › Култура, спорт и религия › Спорт `c-sport` | 3 | leaf | — |  |
| 154.1 | 0.3% | Здравеопазване › Здравна каса (НЗОК) › Резерв за непредвидени разходи `h-nhif-reserve` | 3 | leaf | — |  |
| 151.7 | 0.3% | Образование › Детски градини и училища (държавни стандарти чрез общините) › Област Пловдив › Община Пловдив `ed-municipal-plovdiv-plovdiv` | 4 | leaf | — |  |
| 147.8 | 0.3% | Държавно управление, дълг и ЕС › Общи държавни служби › Общи служби `g-services` | 3 | leaf | — |  |
| 142.4 | 0.3% | Ред, сигурност и правосъдие › Защита при бедствия и аварии `o-civil` | 2 | leaf | — |  |
| 142.4 | 0.3% | Образование › Детски градини и училища (държавни стандарти чрез общините) › Област Варна › Община Варна `ed-municipal-varna-varna` | 4 | leaf | — |  |
| 131.6 | 0.2% | Държавно управление, дълг и ЕС › Общи държавни служби › Наука › Българска академия на науките `g-science-bas` | 4 | leaf | — |  |
| 127.6 | 0.2% | Здравеопазване › Здравна каса (НЗОК) › Лекарства, медицински изделия и диетични храни › Генерични лекарства `h-nhif-med-generic` | 4 | leaf | — |  |
| 113.6 | 0.2% | Образование › Детски градини и училища (държавни стандарти чрез общините) › Област Бургас › Община Бургас `ed-municipal-burgas-burgas` | 4 | leaf | — |  |
| 111.3 | 0.2% | Здравеопазване › Здравна каса (НЗОК) › Медицински изделия в болниците `h-nhif-devices` | 3 | leaf | — |  |
| 106.3 | 0.2% | Образование › Държавни университети (субсидия) › Софийски университет „Св. Климент Охридски“ `ed-uni-sofia-university` | 3 | leaf | — |  |
| 103.5 | 0.2% | Пенсии и социална защита › Социални услуги, програми за заетост и администрация › Администрация на НОИ `s-svc-noi` | 3 | leaf | — |  |
| 80.0 | 0.1% | Образование › Държавни университети (субсидия) › Технически университет – София `ed-uni-tu-sofia` | 3 | leaf | — |  |
| 73.9 | 0.1% | Пенсии и социална защита › Пенсии › Учителски пенсионен фонд `s-pen-teachers` | 3 | leaf | — |  |
| 67.9 | 0.1% | Здравеопазване › Здравна каса (НЗОК) › Администрация на НЗОК `h-nhif-admin` | 3 | leaf | — |  |

### budget-2027 — Budget 2027 (draft)

1386 open boxes, €55,972.3 m (100.0% of the total).

| € m | Share | Path | Depth | Why open | State | First lead |
| ---: | ---: | --- | ---: | --- | --- | --- |
| 14,756.7 | 26.4% | Пенсии и социална защита › Пенсии `s-pensions` | 2 | leaf | todo | 2027 bills in Parliament — State Budget (with the ministries’ programme budgets), НЗОК and ДОО — and their memoranda; n… (script) |
| 5,683.6 | 10.2% | Здравеопазване › Здравна каса (НЗОК) `h-nhif` | 2 | leaf | todo | Закон за бюджета на НЗОК за 2027 г. — the bill and its memorandum once in Parliament (parliament.bg bill ZIP); art. 1 t… (script) |
| 3,242.4 | 5.8% | Икономика и транспорт › Транспорт и съобщения `e-transport` | 2 | leaf | todo | 2027 bills in Parliament — State Budget (with the ministries’ programme budgets), НЗОК and ДОО — and their memoranda; n… (script) |
| 3,176.0 | 5.7% | Пенсии и социална защита › Социални помощи и обезщетения `s-benefits` | 2 | leaf | todo | 2027 bills in Parliament — State Budget (with the ministries’ programme budgets), НЗОК and ДОО — and their memoranda; n… (script) |
| 2,907.2 | 5.2% | Отбрана `defence` | 1 | leaf | todo | 2027 bills in Parliament — State Budget (with the ministries’ programme budgets), НЗОК and ДОО — and their memoranda; n… (script) |
| 2,670.5 | 4.8% | Ред, сигурност и правосъдие › Полиция, вътрешен ред и сигурност `o-police` | 2 | leaf | todo | 2027 bills in Parliament — State Budget (with the ministries’ programme budgets), НЗОК and ДОО — and their memoranda; n… (script) |
| 1,964.3 | 3.5% | Държавно управление, дълг и ЕС › Общи държавни служби › Изпълнителна и законодателна власт › Министерства, агенции, парламент, президент и др. `g-executive-other` | 4 | remainder | todo | State Budget Act art. 2–47 units and ПМС № 102/2026 programmes (Parliament, Presidency, Council of Ministers, regional… (script) |
| 1,812.3 | 3.2% | Пенсии и социална защита › Социални услуги, програми за заетост и администрация › Програми за заетост, социални услуги, администрация на НОИ и др. `s-svc-rest` | 3 | remainder | todo | 2027 bills in Parliament — State Budget (with the ministries’ programme budgets), НЗОК and ДОО — and their memoranda; n… (script) |
| 1,775.5 | 3.2% | Образование › Министерство на образованието, собствени средства на общините и др. `ed-other` | 2 | remainder | todo | ПМС № 102/2026 annex 1: Ministry of Education and Science programmes (pre-school and school education €703.1 m in 2026… (script) |
| 1,506.8 | 2.7% | Държавно управление, дълг и ЕС › Вноска в бюджета на ЕС `g-eu` | 2 | leaf | todo | The contribution by own resource (GNI-based, VAT-based, plastics, customs duties): the State Budget Act / budget report… (unknown) |
| 1,425.6 | 2.5% | Държавно управление, дълг и ЕС › Лихви по държавния дълг `g-interest` | 2 | leaf | todo | Interest by instrument (domestic / external debt, by bond): State Budget Act art. 1 lines, the MoF debt bulletins — to… (unknown) |
| 1,422.6 | 2.5% | Икономика и транспорт › Енергетика, горива и минно дело `e-energy` | 2 | leaf | todo | Updated medium-term budget forecast 2027–2029 (6.11.2026) annex 8 „Размери на разходите и трансферите (нето) по други и… (browser) |
| 1,320.9 | 2.4% | Икономика и транспорт › Други икономически дейности `e-other` | 2 | leaf | todo | 2027 bills in Parliament — State Budget (with the ministries’ programme budgets), НЗОК and ДОО — and their memoranda; n… (script) |
| 1,177.1 | 2.1% | Комунални дейности, култура и околна среда › Жилища, благоустройство и комунални дейности `c-housing` | 2 | leaf | todo | 2027 bills in Parliament — State Budget (with the ministries’ programme budgets), НЗОК and ДОО — and their memoranda; n… (script) |
| 1,165.4 | 2.1% | Икономика и транспорт › Земеделие, гори, лов и риболов `e-agriculture` | 2 | leaf | todo | 2027 bills in Parliament — State Budget (with the ministries’ programme budgets), НЗОК and ДОО — and their memoranda; n… (script) |
| 1,017.4 | 1.8% | Здравеопазване › Министерство на здравеопазването, болници и други `h-other` | 2 | remainder | todo | ПМС № 102/2026 annex 1: Ministry of Health programmes (emergency care, public health, state hospitals …), mapped and gr… (script) |
| 985.9 | 1.8% | Комунални дейности, култура и околна среда › Опазване на околната среда `c-environment` | 2 | leaf | todo | 2027 bills in Parliament — State Budget (with the ministries’ programme budgets), НЗОК and ДОО — and their memoranda; n… (script) |
| 870.5 | 1.6% | Ред, сигурност и правосъдие › Съдебна власт `o-judiciary` | 2 | leaf | todo | 2027 bills in Parliament — State Budget (with the ministries’ programme budgets), НЗОК and ДОО — and their memoranda; n… (script) |
| 573.3 | 1.0% | Образование › Детски градини и училища (държавни стандарти чрез общините) › София (Столична община) `ed-municipal-sofiya-grad` | 3 | leaf | todo | Sofia's allocation of the state-delegated education money to each school and kindergarten (Plovdiv publishes one, "List… (unknown) |
| 561.5 | 1.0% | Комунални дейности, култура и околна среда › Култура, спорт и религия › Култура › Театри, музеи, опери и др. `c-culture-other` | 4 | remainder | todo | ПМС № 102/2026 annex 1: Ministry of Culture programmes (theatres, operas, museums), mapped and grafted into this remain… (script) |
| 360.6 | 0.6% | Държавно управление, дълг и ЕС › Общи държавни служби › Наука › Друга наука `g-science-other` | 4 | remainder | todo | ПМС № 102/2026 annex 1: every ministry programme (ministries-2026), mapped programme → sub-function and grafted (next r… (script) |
| 235.6 | 0.4% | Ред, сигурност и правосъдие › Затвори `o-prisons` | 2 | leaf | — |  |
| 161.2 | 0.3% | Образование › Детски градини и училища (държавни стандарти чрез общините) › Област Пловдив › Община Пловдив `ed-municipal-plovdiv-plovdiv` | 4 | leaf | — |  |
| 151.2 | 0.3% | Образование › Детски градини и училища (държавни стандарти чрез общините) › Област Варна › Община Варна `ed-municipal-varna-varna` | 4 | leaf | — |  |
| 150.1 | 0.3% | Комунални дейности, култура и околна среда › Култура, спорт и религия › Спорт `c-sport` | 3 | leaf | — |  |
| 145.5 | 0.3% | Ред, сигурност и правосъдие › Защита при бедствия и аварии `o-civil` | 2 | leaf | — |  |
| 140.3 | 0.3% | Държавно управление, дълг и ЕС › Общи държавни служби › Наука › Българска академия на науките `g-science-bas` | 4 | leaf | — |  |
| 120.9 | 0.2% | Образование › Детски градини и училища (държавни стандарти чрез общините) › Област Бургас › Община Бургас `ed-municipal-burgas-burgas` | 4 | leaf | — |  |
| 115.9 | 0.2% | Образование › Държавни университети (субсидия) › Софийски университет „Св. Климент Охридски“ `ed-uni-sofia-university` | 3 | leaf | — |  |
| 107.1 | 0.2% | Държавно управление, дълг и ЕС › Общи държавни служби › Общи служби `g-services` | 3 | leaf | — |  |
| 83.7 | 0.1% | Образование › Държавни университети (субсидия) › Технически университет – София `ed-uni-tu-sofia` | 3 | leaf | — |  |
| 65.9 | 0.1% | Образование › Детски градини и училища (държавни стандарти чрез общините) › Област Стара Загора › Община Стара Загора `ed-municipal-stara-zagora-stara-zagora` | 4 | leaf | — |  |
| 63.6 | 0.1% | Пенсии и социална защита › Социални услуги, програми за заетост и администрация › Социални услуги, делегирани на общините › София (Столична община) `s-svc-municipal-sofiya-grad` | 4 | leaf | — |  |
| 56.4 | 0.1% | Образование › Детски градини и училища (държавни стандарти чрез общините) › Област Русе › Община Русе `ed-municipal-ruse-ruse` | 4 | leaf | — |  |
| 54.4 | 0.1% | Образование › Детски градини и училища (държавни стандарти чрез общините) › Област Сливен › Община Сливен `ed-municipal-sliven-sliven` | 4 | leaf | — |  |
| 51.9 | 0.1% | Образование › Детски градини и училища (държавни стандарти чрез общините) › Област Плевен › Община Плевен `ed-municipal-pleven-pleven` | 4 | leaf | — |  |
| 50.3 | 0.1% | Държавно управление, дълг и ЕС › Общи държавни служби › Изпълнителна и законодателна власт › Общинска администрация (кметове и служители) › София (Столична община) `g-municipal-admin-sofiya-grad` | 5 | leaf | — |  |
| 47.5 | 0.1% | Икономика и транспорт › Туризъм `e-tourism` | 2 | leaf | — |  |
| 46.3 | 0.1% | Комунални дейности, култура и околна среда › Култура, спорт и религия › Религиозни дейности `c-religion` | 3 | leaf | — |  |
| 45.7 | 0.1% | Образование › Детски градини и училища (държавни стандарти чрез общините) › Област Пазарджик › Община Пазарджик `ed-municipal-pazardzhik-pazardzhik` | 4 | leaf | — |  |

### ministries-2024 — Ministries 2024

106 open boxes, €8,738.1 m (100.0% of the total).

| € m | Share | Path | Depth | Why open | State | First lead |
| ---: | ---: | --- | ---: | --- | --- | --- |
| 1,025.4 | 11.7% | Министерство на отбраната › Отбранителни способности `mod-defence-capabilities` | 2 | leaf | — |  |
| 857.1 | 9.8% | Министерство на вътрешните работи › Борба с престъпността и обществен ред `moi-fighting-crime-and-keeping-public-order` | 2 | leaf | — |  |
| 764.3 | 8.7% | Министерство на труда и социалната политика › Хора с увреждания `molsp-people-with-disabilities` | 2 | leaf | — |  |
| 624.5 | 7.1% | Съдебна власт `judiciary` | 1 | leaf | — |  |
| 550.2 | 6.3% | Министерство на регионалното развитие и благоустройството › Пътища и техническа инфраструктура `mrdpw-roads-and-technical-infrastructure` | 2 | leaf | — |  |
| 528.8 | 6.1% | Министерство на образованието и науката › Предучилищно и училищно образование `mes-pre-school-and-school-education` | 2 | leaf | — |  |
| 402.9 | 4.6% | Министерство на здравеопазването › Диагностика и лечение `moh-diagnostics-and-treatment` | 2 | leaf | — |  |
| 392.4 | 4.5% | Министерство на труда и социалната политика › Социално включване `molsp-social-inclusion` | 2 | leaf | — |  |
| 297.7 | 3.4% | Министерство на транспорта и съобщенията › Транспорт `motc-transport` | 2 | leaf | — |  |
| 270.4 | 3.1% | Министерство на финансите › Събиране на данъци и мита (НАП, Митници) `mof-collecting-taxes-and-customs-duties` | 2 | leaf | — |  |
| 253.5 | 2.9% | Държавен фонд „Земеделие“ › Земеделие и селски райони (субсидии) `state-fund-agriculture-agriculture-and-rural-areas-subsidies` | 2 | leaf | — |  |
| 229.3 | 2.6% | Министерство на вътрешните работи › Пожарна безопасност и защита при бедствия `moi-fire-safety-and-civil-protection` | 2 | leaf | — |  |
| 203.9 | 2.3% | Министерство на труда и социалната политика › Социално подпомагане и равнопоставеност `molsp-social-assistance-and-gender-equality` | 2 | leaf | — |  |
| 198.3 | 2.3% | Министерство на вътрешните работи › Охрана на границите и миграция `moi-border-protection-and-migration` | 2 | leaf | — |  |
| 189.5 | 2.2% | Министерство на културата › Съвременно изкуство (театри, опери, оркестри) `moc-contemporary-arts-theatres-operas-orchestras` | 2 | leaf | — |  |

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

Open boxes of €250 m or more with no ledger entry (133):

- **budget-2024**
  - €2,349.2 m Икономика и транспорт › Други икономически дейности `e-other` (leaf)
  - €1,844.6 m Ред, сигурност и правосъдие › Полиция, вътрешен ред и сигурност `o-police` (leaf)
  - €1,755.1 m Икономика и транспорт › Транспорт и съобщения `e-transport` (leaf)
  - €1,721.9 m Икономика и транспорт › Енергетика, горива и минно дело `e-energy` (leaf)
  - €1,152.3 m Икономика и транспорт › Земеделие, гори, лов и риболов `e-agriculture` (leaf)
  - €1,027.9 m Отбрана `defence` (leaf)
  - €982.5 m Комунални дейности, култура и околна среда › Жилища, благоустройство и комунални дейности `c-housing` (leaf)
  - €779.7 m Комунални дейности, култура и околна среда › Опазване на околната среда `c-environment` (leaf)
  - €733.6 m Ред, сигурност и правосъдие › Съдебна власт `o-judiciary` (leaf)
  - €465.3 m Здравеопазване › Здравна каса (НЗОК) › Лекарства, медицински изделия и диетични храни › Лекарства за онкологични заболявания и коагулопатии (в болница) `h-nhif-med-oncology-coag` (leaf)
  - €412.7 m Образование › Държавни университети (субсидия) `ed-universities` (leaf)
  - €368.8 m Държавно управление, дълг и ЕС › Общи държавни служби › Наука `g-science` (leaf)
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
- **budget-2025**
  - €2,921.5 m Икономика и транспорт › Транспорт и съобщения `e-transport` (leaf)
  - €2,750.4 m Ред, сигурност и правосъдие › Полиция, вътрешен ред и сигурност `o-police` (leaf)
  - €2,126.8 m Отбрана `defence` (leaf)
  - €1,924.9 m Икономика и транспорт › Земеделие, гори, лов и риболов `e-agriculture` (leaf)
  - €1,613.4 m Икономика и транспорт › Енергетика, горива и минно дело `e-energy` (leaf)
  - €1,259.2 m Комунални дейности, култура и околна среда › Жилища, благоустройство и комунални дейности `c-housing` (leaf)
  - €1,029.4 m Икономика и транспорт › Други икономически дейности `e-other` (leaf)
  - €827.1 m Комунални дейности, култура и околна среда › Опазване на околната среда `c-environment` (leaf)
  - €819.5 m Ред, сигурност и правосъдие › Съдебна власт `o-judiciary` (leaf)
  - €619.0 m Образование › Държавни университети (субсидия) `ed-universities` (leaf)
  - €437.6 m Държавно управление, дълг и ЕС › Общи държавни служби › Наука `g-science` (leaf)
- **ministries-2024**
  - €1,025.4 m Министерство на отбраната › Отбранителни способности `mod-defence-capabilities` (leaf)
  - €857.1 m Министерство на вътрешните работи › Борба с престъпността и обществен ред `moi-fighting-crime-and-keeping-public-order` (leaf)
  - €764.3 m Министерство на труда и социалната политика › Хора с увреждания `molsp-people-with-disabilities` (leaf)
  - €624.5 m Съдебна власт `judiciary` (leaf)
  - €550.2 m Министерство на регионалното развитие и благоустройството › Пътища и техническа инфраструктура `mrdpw-roads-and-technical-infrastructure` (leaf)
  - €528.8 m Министерство на образованието и науката › Предучилищно и училищно образование `mes-pre-school-and-school-education` (leaf)
  - €402.9 m Министерство на здравеопазването › Диагностика и лечение `moh-diagnostics-and-treatment` (leaf)
  - €392.4 m Министерство на труда и социалната политика › Социално включване `molsp-social-inclusion` (leaf)
  - €297.7 m Министерство на транспорта и съобщенията › Транспорт `motc-transport` (leaf)
  - €270.4 m Министерство на финансите › Събиране на данъци и мита (НАП, Митници) `mof-collecting-taxes-and-customs-duties` (leaf)
  - €253.5 m Държавен фонд „Земеделие“ › Земеделие и селски райони (субсидии) `state-fund-agriculture-agriculture-and-rural-areas-subsidies` (leaf)
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

