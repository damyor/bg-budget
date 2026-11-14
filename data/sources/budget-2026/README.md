# 2026 budget sources

CSV extracts of official documents for the 2026 budget. All amounts are in euro (Bulgaria adopted the euro on
1 January 2026); the column names say whether a file is in euro (`EUR`), thousands (`kEUR`) or millions (`mEUR`).
`scripts/budgetPlan.ts` and `scripts/ministries.ts` (called from `scripts/build-data.ts`) turn them into
`public/data/*.json`.

minfin.bg blocks automated downloads, so the files below were extracted from the State Gazette HTML, the bill
packages on parliament.bg and the Council of Ministers decisions on strategy.bg, which carry the same content.

| File | Content | Source |
| --- | --- | --- |
| `kfp-2026-by-function.csv` | Consolidated fiscal programme (КФП) spending by function and sub-function, 2025–2028 (Table III-1) | Updated medium-term budget forecast 2026–2028, annex to Council of Ministers decision РМС № 597 of 6.08.2026 — https://strategy.bg/download/1324547 (also https://www.minfin.bg/bg/1770) |
| `mtbf-2026-2028-fses.parts.csv` (+ `.json`) | Drill-down part: the Electricity System Security Fund's expenditure under „Енергетика, горива и минно дело“ (section "Energy" below) | Same document, annex 8 |
| `mtbf-2026-2028-sfa-eu.parts.csv` (+ `.json`) | Drill-down part: State Fund Agriculture's EU account under „Селско стопанство …“ (section "Annexes 7 and 8" below) | Same document, annex 7 |
| `mtbf-2026-2028-entities.parts.csv` (+ `.json`) | Drill-down parts: annex 8's other КФП entities (ПУДООС, the Agricultural Academy, two state enterprises) in their sub-functions (same section) | Same document, annex 8 |
| `kfp-main-indicators.csv`, `kfp-national-budget.csv` | КФП totals: revenue, expenditure, interest, EU-budget contribution, balance | Same document, Tables 6 and 7 |
| `nhif-2026-tables.csv` | National Health Insurance Fund budget, art. 1 (revenue and expenditure tables) | Закон за бюджета на НЗОК за 2026 г., ДВ бр. 68 от 28.07.2026 — https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=244981 |
| `social-security-2026-tables.csv` | State social security (ДОО) budget by fund, the Teachers' Pension Fund (annex 4) and the consolidated budget of the Social Security Institute | Закон за бюджета на ДОО за 2026 г., ДВ бр. 68 от 28.07.2026 — https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=244982 |
| `social-security-2026-benefits.csv` | Cash benefits by type (sick pay, maternity, childcare, unemployment …), typed in from the explanatory memorandum | Мотиви към законопроекта за бюджета на ДОО за 2026 г., вх. № 52-602-01-18 — https://www.parliament.bg/bg/bills/ID/167156 |
| `municipal-delegated-2026.csv` | State funding of state-delegated activities for each of the 265 municipalities, by function | Закон за държавния бюджет за 2026 г., чл. 52, ДВ бр. 69 от 31.07.2026 — https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=245041 |
| `municipal-transfers-2026.csv` | What the central budget transfers to each of the 265 municipalities, by type (delegated activities, equalising subsidy, winter roads, capital subsidy, other targeted transfers), thousand EUR, with the ЕБК code of each municipality | Same act, чл. 51 — https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=245041. Retrieved 5.10.2026 |
| `transfers-universities-media.csv` | Transfers to state universities, the Academy of Sciences and public media (totals) | РМС № 597/2026 annex, Table 32 |
| `state-budget-2026-spending-units.csv` | Expenditure of the 46 first-level spending units by policy / functional area | Закон за държавния бюджет за 2026 г., чл. 2–47, ал. 2 |
| `state-budget-2026-programmes.csv` | The 44 spending units that use programme budgets, their 99 area rows (80 policy / functional areas, 2 groups of "other programmes" and 17 programmes listed at area level, mostly „Администрация“) and the 186 programmes within the areas — 203 programmes in all, 2 of them without money in 2026 (2200.01.08 and the election commission's 8200.01.01), euro | ПМС № 102 от 12.08.2026 г. за изпълнението на държавния бюджет за 2026 г., приложение № 1, ДВ бр. 74 от 18.08.2026 — DOCX https://strategy.bg/download/1325203, PDF https://dv.parliament.bg/DVPics/2026/74_26/4489_1.pdf, decree https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=245362. Retrieved 5.10.2026 |
| `state-budget-2026-programme-lines.csv` | One row per leaf line of each programme (768 rows): departmental staff, running costs and capital, and every named administered item, euro | Same annex |
| `state-budget-2026-university-transfers.csv` | The Ministry of Education's transfer to the Academy of Sciences and to each of the 33 state universities (art. 16(4)) and the Ministry of Defence's transfer to each of the 4 military schools (art. 11(4)), thousand EUR | Закон за държавния бюджет за 2026 г., чл. 16, ал. 4 и чл. 11, ал. 4 — https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=245041. Retrieved 5.10.2026 |

The programme budgets attached to the bill (вх. № 52-602-01-19), which the site used for 8 units before, were
drafts: two of their programme amounts (health, 1600.02.01 and 1600.02.02) differ from the decree. They are no
longer used.

## Programme budgets (ПМС № 102/2026, Annex 1)

The annex has three tables for each of the 44 units: areas and programmes with their amounts; for each programme its
departmental spending (I: staff / running costs / capital) and its administered spending (II, by named item); and the
unit's totals. The National Assembly and the judiciary do not use programme budgets and are not in it. Programme codes
follow РМС № 478/24.06.2026 and stay the same from 2026 to 2030.

`state-budget-2026-programmes.csv` — `unit_code` (ЕБК code of the unit), `code` (the unit code, an area code
`xxxx.yy.00` or a programme code `xxxx.yy.zz`), `level` (`unit`, `policy`, `programme`), `name_bg` (as printed; for
units the genitive form of the totals table, as in the State Budget Act), `short_bg` (the shorter name shown on the
site; empty when it is the printed one), `name_en`, `amount_EUR` (as printed in the area/programme table; for units
the total of the totals table). A `policy` row whose name starts with "Бюджетна програма" is a programme listed at
area level; it has no `programme` rows.

`state-budget-2026-programme-lines.csv` — `unit_code`, `policy_code`, `programme_code`, `line` (`staff`, `running`,
`capital`, `administered`), `item_no` (order of the administered item in the programme; `7.3` is the third part of
item 7), `name_bg` (as printed), `short_bg`, `name_en`, `group_bg` / `group_short_bg` / `group_en` (the item this
line is a part of, see below), `amount_EUR`, `derived` (`remainder` for a computed row). Every level can be
re-derived: a programme's departmental total (I) is the sum of its staff, running and capital rows, its
administered total (II) the sum of its administered rows, the programme the sum of all its rows, the area and the
unit the sums of their programmes — and each of these equals the figure printed in the annex.

- Departmental lines printed blank or 0 are left out; named administered items printed blank (or 0) are kept with
  0 (11 rows), so the list of items is complete. The tree leaves them out.
- "…, в т.ч.:" items are split into the parts printed under them (the disability organisations, the film subsidy
  schemes, the Red Cross's mountain rescue service). Where the parts do not cover the item, the rest is a
  `remainder` row named "Други" (Red Cross: €1,813,800).
- "в т.ч. Персонал без делегирани бюджети" (staff outside the delegated budgets of subordinate units such as state
  schools, theatres or museums) splits the staff line of 8 programmes into "Персонал без делегирани бюджети" and the
  `remainder` "Персонал в делегираните бюджети"; where it equals the staff line, or is 0, the line is not split.
- MoF programme 1000.03.02 has its header row in two cells, the Council of Ministers' area table has a title row,
  and the Ministry of Innovation and Digital Transformation's „Администрация“ has the irregular code 7400.00.03 (kept
  as printed); the extractor handles all three.

Corrections. Three amounts are misprinted in the annex (in the DOCX and in the State Gazette PDF alike). Each is
confirmed by two other printed totals, and the extractor applies the correction only if it finds the misprinted
value:

| Programme | Printed | Used | Why |
| --- | --- | --- | --- |
| 1100.01.03 Многостранно сътрудничество и глобални политики (foreign affairs), running costs and I. | 897 700 | 897 900 | I + II gives 12 711 500, but the programme total, the structure table and the law's area give 12 711 700, and the ministry's running-cost total (55 676 600) is 200 more than its programmes' running costs |
| 1700.01.05 Образование на българите в чужбина (education), structure table | 11 507 400 | 11 570 400 | the programme's own I + II = III = 11 570 400, and only that makes the area add up to 703 080 700 (as in the law) |
| 2100.02.03 Контрол на строителните продукти и инвестиционния процес (regional development), III. | 10 265 500 | 10 265 600 | I + II and the structure table give 10 265 600 |

Reconciliation with the State Budget Act (`state-budget-2026-spending-units.csv`): all 44 units' totals and all their
area amounts in the annex equal the act exactly (€12,501,270,300 = the act's €13,326,470,300 minus the National
Assembly and the judiciary). Areas are matched by name; four units are named differently in the annex (e.g.
"Министерството на икономиката и индустрията" for the Ministry of Economy, Investment and Industry), so units are
matched by ЕБК code. The build checks all of this again and stops on a difference; an area whose programmes fall short
of the act would get an explicit "Неразпределено по програми" item.

How the files were made:

```sh
curl -L -o data/cache/pms-102-2026/annex1.docx https://strategy.bg/download/1325203
python3 scripts/extract/programme_budgets.py data/cache/pms-102-2026/annex1.docx data/sources/budget-2026/state-budget-2026
curl -L -o data/cache/zdb-2026/zdb-2026.html 'https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=245041'
python3 scripts/extract/university_transfers.py data/cache/zdb-2026/zdb-2026.html data/sources/budget-2026/state-budget-2026-university-transfers.csv
```

The extractors check every printed total and keep the hand-written `short_bg` / `name_en` (and the universities'
`id`) of an earlier run, so re-running them only adds blank names for new rows.

## Transfers to municipalities (ЗДБ 2026, art. 51)

Art. 51 sets the "budget relations" between the central budget and each municipality: item 1, the main transfers
under the mechanism of annex 1 (general subsidy for state-delegated activities, general equalising subsidy,
transfer for winter maintenance and snow clearing of municipal roads, targeted subsidy for capital spending), and
item 2, "transfers for other targeted spending on local activities" — under art. 54 (7) money to reach the 2026
minimum wage in the municipalities' local activities (in 2024 and 2025 the same item had the same purpose). The
2024 and 2025 acts have the same table in art. 53.

`municipal-transfers-2026.csv` (and `../budget-2024/`, `../budget-2025/` likewise) — one row per municipality and
type: `province` (the act's heading without "ОБЛАСТ"; Sofia in София-град), `municipality` (as printed, Latin
look-alike letters replaced), `ebk_code` (from `../places/municipalities.csv`), `transfer` (`delegated`,
`equalising`, `winter_roads`, `capital`, `other_targeted`), `column` (the act's column 3–7), `amount_kEUR`
(2024, 2025: `amount_kBGN`; empty where the act prints no amount). The last five rows (`ВСИЧКО:`) are the act's
printed totals. Column 2 of the act (main transfers = 3 + 4 + 5 + 6) is not stored.

| Type | Column | 2026, thousand EUR | 2025, thousand BGN | 2024, thousand BGN |
| --- | --- | --- | --- | --- |
| Обща субсидия за делегираните от държавата дейности | 3 | 4 351 706,0 | 7 892 909,1 | 6 927 959,1 |
| Обща изравнителна субсидия | 4 | 255 658,0 | 460 000,0 | 410 000,0 |
| Трансфер за зимно поддържане и снегопочистване на общинските пътища | 5 | 25 100,0 | 49 000,0 | 48 228,1 |
| Целева субсидия за капиталови разходи | 6 | 255 000,0 | 454 000,0 | 426 310,2 |
| Трансфери за други целеви разходи за местни дейности | 7 | 40 500,0 | 70 000,0 | 60 000,0 |
| **All transfers to municipalities** = art. 1 (2), row III.1.1 „Общините“ | | **4 927 964,0** | **8 925 909,1** | **7 872 497,4** |

How the files were made (all three years at once; the downloads are listed in `data/cache/*/MANIFEST.md`):

```sh
curl -L -o data/cache/zdb-2025/zdb-2025.html 'https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=233694'
curl -L -o data/cache/zdb-2024/zdb-2024.html 'https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=202168'
curl -L -o data/cache/municipalities/EBK-2026-public.xlsx https://comsy54.bg/wp-content/uploads/2026/01/EBK-2026-public.xlsx
curl -L -o data/cache/municipalities/report-2025-pr7.xlsx https://strategy.bg/download/1327218
curl -L -o data/cache/municipalities/Pop_6.1.1_Pop_DR.xlsx https://www.nsi.bg/sites/default/files/files/data/timeseries/Pop_6.1.1_Pop_DR.xlsx
python3 scripts/extract/municipal_transfers.py
```

Checks, for each year (the script stops on any failure, and `scripts/municipalities.ts` checks the totals again):

- 265 municipalities, the same names in the same order in all three acts; on every row column 2 = 3 + 4 + 5 + 6.
- Every column adds up to the act's "ВСИЧКО:" row and to the amount written in the text of art. 51 / 53 (table
  above), and the grand total (columns 2 + 7) equals row III.1.1 „Общините“ of art. 1 (2) — the act's own total of
  the transfers to municipalities.
- The delegated-activities column equals, municipality by municipality, the total of the delegated-activities table
  (2026: art. 52; 2024, 2025: art. 54). That table, parsed again from the State Gazette, equals the existing
  `municipal-delegated-<year>.csv` in every cell of all 265 rows and in the "ВСИЧКО:" row (2026: 4 351 706,0 thousand
  EUR; 2025: 7 892 909,1 and 2024: 6 927 959,1 thousand BGN).
- Spot-checks against the Gazette text: Банско 2026 — 11 681,1 (main) + 125,9 (other targeted), no equalising
  subsidy; Столична община 2026 — 714 014,5 + 4 246,7; Пловдив 2025 — 404 557,9 + 5 271,3 thousand BGN;
  Благоевград 2024 — equalising subsidy 2 341,7 thousand BGN.

On the site this is the "Municipalities" breakdown (`scripts/municipalities.ts`): province → municipality → type of
transfer → for delegated activities, the function (art. 52), with municipal administration split into mayors and
staff (columns 2a/2b). These are the central budget's transfers only: municipalities also spend their own revenue
and EU funds, and receive further transfers during the year (government decisions, the municipal investment
programme), none of which is here.

## Universities (ЗДБ 2026, art. 16(4) and 11(4))

`state-budget-2026-university-transfers.csv` — `article`, `paragraph`, `from_unit_code` (1700 Ministry of Education
and Science, 1200 Ministry of Defence), `item_no`, `id` (stable id used on the site), `name_bg`, `short_bg`,
`name_en`, `amount_kEUR`. Both lists add up to their printed "Всичко:" totals (792 877.6 and 45 836.8 thousand EUR),
which equal Table 32 of РМС № 597/2026 (Academy 131 577.7; universities 661 299.9; military schools 45 836.8). Each of
the 34 Ministry of Education amounts also equals the "ТРАНСФЕРИ - ОБЩО" of the same institution in Annex 2 to ПМС №
102/2026.

These transfers are not part of the ministries' expenditure in the act (they are "Предоставени трансфери" under
"Бюджетни взаимоотношения", outside "Разходи"), so no programme or administered item of the Ministry of Education or
the Ministry of Defence contains them. On the site, the 33 universities are the parts of "State universities
(subsidy)" in "Budget 2026" (exactly 661 299.9), the Academy is a part of the "Science" sub-function there (with the
rest of science spending as "Other science"), and both ministries carry a note in "Ministries 2026". The military
schools have no matching node in the КФП tree and appear only in that note.

## Energy: the Electricity System Security Fund and the Ministry of Energy (drill-down parts)

The plan's „Икономика и транспорт › Енергетика, горива и минно дело“ (`e-energy`, €2,801.2 m, Table III-1 of the
forecast) is a single figure in its source. Two documents give parts of it (docs/drilldown.md):

**`mtbf-2026-2028-fses.parts.csv`** (+ `.json`): the Electricity System Security Fund (ФСЕС), `e-energy.fses` (the id
the reports use), **€1,487,826,000**. Source: the same forecast (annex to РМС № 597 of 6.08.2026, „Актуализирана
средносрочна бюджетна прогноза за периода 2026–2028 г.“, DOCX `26RH597pr.docx`, https://strategy.bg/download/1324547,
retrieved 14.11.2026 into `data/cache/mtbf-2026-2028/`), приложение № 8 „Размери на разходите и трансферите (нето) по
други икономически обособени лица и структурни единици, включени в КФП за периода 2026–2028 г.“, row 2, column 2.1
„Разходи“, thousand EUR (1 487 826,0).

- *What "(нето)" means here.* Column 2 „Общо разходи и трансфери (нето)“ is column 2.1 „Разходи“ minus column 2.2
  „Трансфери (нето)“ (the header says к.2.1-к.2.2): for ФСЕС 1 451 400,3 = 1 487 826,0 − 36 425,7. Column 2.2 is the
  transfer the fund receives from the state budget: the State Budget Act 2026, art. 21(1), section III, item 2.1.1, has
  the Ministry of Energy's transfer „за Фонд „Сигурност на електроенергийната система“ −36 425,7 thousand EUR
  (https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=245041). The part is column 2.1, the fund's expenditure
  only; a transfer between budgets is consolidated out of the КФП.
- *Mapping (basis `mapped`).* The forecast gives the fund one line, not its sub-function. In the 2024 and 2025 reports
  (`../report-202x/kfp-202x-report-by-function.csv`) the column ФСЕС has spending only in VIII.А „Минно дело, горива и
  енергия“ (2 523,7 and 2 431,7 m BGN, the whole column), so all the fund's КФП spending is placed in this sub-function.
- *Cross-check.* The fund is 53.1% of the box; in the actuals it was 95.8% (2024) and 91.1% (2025) of the
  sub-function. The 2026 box is €1.44 bn more than the 2025 actual; €1.27 bn of it is in no table found so far (the
  remainder, ledger `e-energy.rest`). In the 2027 draft (forecast 2027–2029) the fund is 95.3% of the box.
- *Checked against the DOCX:* row 2 of annex 8 reads 1 451 400,3 / 1 487 826,0 / 36 425,7 (2026), 1 246 308,8 /
  1 285 995,9 / 39 687,1 (2027) and 1 145 757,1 / 1 145 757,1 (2028); each total is expenditure minus transfers.

**Graft** (`data/drilldown/grafts.csv`): the Ministry of Energy's policy area „Енергетика“ from "Ministries 2026"
(`moen-energy`, ПМС № 102/2026 annex 1, area 2400.01, €38,386,400, with its four programmes) under `e-energy`, as
`e-energy.moen-energy`. Why it belongs: the ЕБК 2026 functional classification (`../cities/ebk-activities.csv`) puts
activities 801–809 — management, control and regulation of mining and energy; research on fuels and energy; safety
and storage of radioactive waste; decommissioning of nuclear facilities; other mining; other fuel and energy — all in
the group „Минно дело, горива и енергия“, which is this sub-function, and the area's programmes are those activities
(energy enterprises, infrastructure and markets; security of energy supply and radioactive waste, with the subsidies
to the funds „Радиоактивни отпадъци“ and „Извеждане от експлоатация на ядрени съоръжения“; sustainable energy
development; subsoil resources and geological surveys). The ministry's administration (2400.02, €4,881,400) is not
grafted: central government bodies for economic affairs are activity 108, function I. Nothing is counted twice: the
ministry's expenditure (art. 21(1), 43 267,8 = 38 386,4 + 4 881,4 thousand EUR) does not include its transfer to the
fund. Caveat: no published table maps programmes to sub-functions, and in the 2025 actual the ministry's energy area
(114 386,2 thousand BGN = €58.5 m, `../report-2025/state-budget-2025-report-spending-units.csv`) is more than the
sub-function's state-budget column (€52.3 m), so part of it may be classified elsewhere (not resolved).

The rest, **€1,274,987,600**, is the remainder `e-energy.rest` („Други разходи за енергетика“).

## The ministries' programmes in the КФП boxes (grafts, 14.11.2026)

"Budget 2026" by purpose gives the КФП sub-functions (Table III-1 of the forecast) as single amounts; "Ministries
2026" splits the same year's State Budget Act units into policy areas, programmes and items (ПМС № 102/2026,
annex 1, DOCX https://strategy.bg/download/1325203, ДВ бр. 74/2026 https://dv.parliament.bg/DVPics/2026/74_26/4489_1.pdf).
The programme map (`../../drilldown/programme-map.csv`, rules in `docs/drilldown.md` › "The programme map") places
each area, programme or item in the sub-function whose ЕБК activities it is booked under, and `grafts.csv` copies it
there (basis `mapped`; the copies link back to "Ministries 2026"). 148 nodes, **€12,938.9 m** of the ministries'
€13,326.5 m (97%), go into 21 boxes; €387.4 m is left out, each with its reason in the map.

| Box | Box, € m | Grafted, € m | Remainder, € m |
| --- | ---: | ---: | ---: |
| `defence` | 2,467.8 | 2,354.7 | 113.1 |
| `o-police` | 2,750.3 | 2,344.8 | 405.5 |
| `e-transport` | 3,449.4 | 1,529.0 | 1,920.4 |
| `s-ben-assistance` (remainder of `s-benefits`) | 1,943.2 | 1,100.9 | 842.4 |
| `s-svc-other` (remainder of `s-services`) | 1,350.8 | 984.4 | 366.4 |
| `g-executive-other` (remainder of `g-executive`) | 1,921.1 | 926.3 | 994.7 |
| `o-judiciary` | 870.6 | 850.6 | 20.0 |
| `ed-other` (remainder of `education`) | 2,023.5 | 783.8 | 1,239.7 |
| `h-other` (remainder of `health`) | 1,202.7 | 755.6 | 447.1 |
| `e-agriculture` | 1,409.4 | 444.4 | 965.0 |
| `c-culture-other` (remainder of `c-culture-culture`) | 580.1 | 226.1 | 353.9 |
| `o-prisons` | 229.1 | 226.0 | 3.1 |
| `g-services` | 147.8 | 122.8 | 25.0 |
| `c-sport` | 162.6 | 69.0 | 93.6 |
| `e-other` | 2,118.6 | 46.3 | 2,072.3 |
| `c-environment` | 824.4 | 39.7 | 784.7 |
| `e-energy` (the earlier graft) | 2,801.2 | 38.4 | ФСЕС 1,487.8 + 1,275.0 |
| `c-religion` | 50.6 | 36.7 | 13.9 |
| `c-housing` | 1,886.4 | 28.2 | 1,858.2 |
| `g-science-other` (remainder of `g-science`) | 387.9 | 19.3 | 368.6 |
| `e-tourism` | 41.4 | 11.9 | 29.5 |

- *Never over the box*: the build checks every box; the closest are the judiciary (the judiciary's budget, the
  courts' security and legal aid fill 97.7% of it) and prisons (98.6%). The defence ministry is larger than the
  defence function (€2,568.6 m against €2,467.8 m): its military medicine goes to health and its military
  education to education; its recreation and military clubs (mixed culture and recreation), military police and
  military intelligence are left out — in the 2025 actual about €83 m of the ministry's spending was booked under
  other functions and is not identified (`docs/drilldown.md`).
- *No double counting*: no grafted item is a transfer to the NHIF, the ДОО, ФСЕС or the universities' subsidies
  (outside „Разходи“ in the decree). The education ministry's investment grants to state universities (€8.6 m) are
  not the art. 16(4) subsidies shown under the universities; its national programmes are not the delegated school
  funding shown by municipality. Personal assistance (€777.2 m) is paid through the municipalities and is not part
  of the delegated social services (€610.9 m in all). State Fund Agriculture's VAT refunds on municipal projects
  (€25.0 m) are left out.
- *Remainders*: each box keeps an explicit remainder, named truthfully („Други разходи за транспорт и съобщения“ …;
  the builders' remainders are renamed, e.g. `ed-other` „Други разходи за образование“, and `h-other`,
  `s-ben-assistance` and `g-science-other` get new notes). Their ledger entries hold the leads that remain (EU
  programme tables, municipal B3 reports, the forecast's annex 8, the items left out).
- *Cross-check (independent total)*: the 2025 report's state-budget column per sub-function
  (`../report-2025/kfp-2025-report-by-function.csv`), against the same mapping applied to "Ministries 2025 actual":
  police €2,351.7 m of €2,402.2 m; defence €2,018.0 m of €2,129.7 m; judiciary €779.7 m of €792.1 m; prisons
  €215.8 m = €215.8 m; religion €44.6 m = €44.6 m; executive bodies €1,000.6 m of €1,016.2 m; general services
  €88.5 m of €92.3 m; agriculture €446.8 m of €447.1 m (actual areas); education €573.7 m of €587.7 m; benefits
  €974.7 m of €986.5 m; economic activities €48.8 m of €48.3 m and tourism €17.9 m of €17.6 m (within €0.5 m).
  Over: sport by €8.7 m (not resolved, noted in the ledger) and social services, where personal assistance is in
  the municipalities' column (without it €179.2 m of €203.6 m). The total grafted equals the map's rows: €12,938.9 m
  + €387.4 m left out = €13,326.5 m, the ministries' total.
- *Spot-checks against the DOCX*: programme 2100.02.01 „Рехабилитация и изграждане на пътна инфраструктура“
  962 573 500 (`e-transport.p2100-02-01`); area 1300.01.00 1 225 550 200 (`o-police.moi-fighting-crime-and-keeping-public-order`);
  programme 1200.01.01 1 138 517 000 (`defence.p1200-01-01`); items „Механизъм лична помощ“ 777 205 400 and
  „Финансова подкрепа за хора с трайни увреждания“ 559 865 000 (programme 1500.04.01); area 2300.01.00 504 508 700
  (`e-transport.motc-transport`) — all equal.
- *Size*: `budget-2026.json` grew from 337.9 KB (55.1 KB gzipped) to 654.7 KB (94.4 KB gzipped), with the ledger notes of the new boxes.

## Annexes 7 and 8: State Fund Agriculture's EU account and the other КФП entities (drill-down parts, 14.11.2026)

Source: the forecast 2026–2028 (annex to РМС № 597 of 6.08.2026, DOCX `26RH597pr.docx`,
https://strategy.bg/download/1324547, retrieved 14.11.2026 into `data/cache/mtbf-2026-2028/`), приложение № 7
„Размери на разходите и трансферите (нето) по сметките за средствата от Европейския съюз за периода 2026–2028 г.“
(DOCX table 32) and приложение № 8 (table 33; see "Energy" above), column 2.1 „Разходи“, thousand EUR, converted
×1000. Column 2 is 2.1 minus 2.2 „Трансфери (нето)“ in every row used (checked), so 2.1 is each entity's own
expenditure; money passed to or received from other public budgets is in 2.2 and consolidated out of the КФП, as
for ФСЕС. Basis `mapped`: the annexes give one line per entity, not its sub-function.

**`mtbf-2026-2028-sfa-eu.parts.csv`**: `e-agriculture.sfa-eu`, „Сметка за средствата от Европейския съюз на
Държавния фонд „Земеделие““, **€692,956,500** (692 956,5; transfers (net) 482 749,6, which equals the central
budget's transfer to the account in the State Budget Act 2026, art. 1(1), section III, item 1.5 „Сметката за средствата от
Европейския съюз на Държавния фонд „Земеделие““ 482 749,6).

- *Why here.* The forecast's chapter on EU funds (section „Държавен фонд „Земеделие““) says the account pays the
  common agricultural policy (direct payments, market measures, rural development, EAGF and EAFRD) and the fisheries
  programme; the ЕБК puts all of that in this sub-function's group — 824 national top-ups and co-financing of direct
  payments, 826 fisheries, 827 rural development, 828 EU programmes, 829 other agriculture and forestry
  (`../cities/ebk-activities.csv`). EAFRD money for municipal projects is a transfer (column 2.2), not in 2.1.
- *No double counting.* The fund's state-budget programmes grafted from "Ministries 2026" (state aid, market
  measures, direct payments, staff: €256.9 m) are the fund's own budget under the State Budget Act, a different
  КФП budget from its EU account; the transfers between them are not expenditure of either.
- *Caveat.* The forecast's text gives the account's "expenditure and payments" as up to €1,681.38 m in 2026
  (direct payments €841.53 m, market measures €87.13 m, rural development €837.6 m; Table V-1: €1,129.7 m EU funds +
  €474.5 m national co-financing and advances), far more than the КФП expenditure of column 2.1; the forecast does
  not explain the difference, and nothing finer than 2.1 is used.
- *Cross-check.* The 2025 actual's EU funds in this sub-function were €859.9 m (current €291.0 m, capital
  €568.9 m; `../report-2025/kfp-2025-report-by-function.csv`), all EU accounts together; the account's 2025 actual
  is not published in a table found so far. The account is 49.2% of the 2026 box; with the grafted ministries
  (€444.4 m) €1,137.4 m of €1,409.4 m is attributed and the remainder `e-agriculture.rest` falls from €965.0 m to
  €272.0 m.

**`mtbf-2026-2028-entities.parts.csv`**, mapped by the КФП report's own columns for these entities in the 2024 and
2025 reports by function (`../report-202x/kfp-202x-report-by-function.csv`, m BGN):

| Part | Box | 2.1 „Разходи“, € | 2.2 (net transfers) | 2024 / 2025 report column |
| --- | --- | ---: | ---: | --- |
| `c-environment.pudoos` Предприятие за управление на дейностите по опазване на околната среда | `c-environment` (remainder €784.7 m → €752.6 m) | 32,087,100 | 19 432,2 = the environment ministry's 22 500,0 to it less 3 067,8 back (State Budget Act art. 18) | ПУДООС 13,9 / 18,4, only in „Опазване на околната среда“ |
| `g-science.ssa` Селскостопанска академия | `g-science` (remainder `g-science-other` €368.6 m → €314.3 m) | 52,434,900 | 43 231,6 = the agriculture ministry's transfer (art. 24) | ССА 86,7 / 105,9 in „Наука“ (and 0,01 in function IX) |
| `g-science.dpnpc` ДП „Научно-производствен център“ | `g-science` | 1,872,600 | — | ДП НПЦ 2,6 / 3,1, only in „Наука“ |
| `e-other.dpusya` ДП „Управление и стопанисване на язовири“ | `e-other` (remainder €2,072.3 m → €2,062.6 m) | 9,712,100 | 9 712,1 = the economy ministry's transfer (art. 19) | ДПУСЯ 13,4 / 14,4, only in „Други дейности по икономиката“ |

The Agricultural Academy is not the Academy of Sciences (`g-science-bas`, the education ministry's transfer to БАН),
and the ministries' grafted programmes exclude these transfers ("Разходи" only), so nothing is counted twice.

- *Checked against the DOCX* (thousand EUR, columns 2 / 2.1 / 2.2): State Fund Agriculture's account 210 206,9 /
  692 956,5 / 482 749,6; ПУДООС 12 654,9 / 32 087,1 / 19 432,2; Селскостопанска академия 9 203,3 / 52 434,9 /
  43 231,6; ДП НПЦ 1 872,6 / 1 872,6 / —; ДП УСЯ — / 9 712,1 / 9 712,1. Each column 2 equals 2.1 − 2.2.
- *The National Fund's account* (annex 7 row 2: 6 458 247,9 expenditure) spans many functions; the forecast gives
  only its total and the Recovery Plan's share (up to €3,960 m in 2026), so it is not mapped (ledger: `e-other.rest`).
- *„Други дейности по икономиката“*: the plan's €2,118.6 m (2025 actual €410.5 m) is one line of Table III-1;
  nothing in the forecast's text or annexes belongs wholly to it except the dam enterprise. What was read, and the
  leads, are in the ledger entry of `e-other.rest`.
- *Size*: `budget-2026.json` grew from 657.9 KB (92.7 KB gzipped) to 664.6 KB (94.1 KB gzipped).

## Other corrections

- Some names in the State Gazette text mix Latin look-alike letters into Cyrillic words ("Cмолян"); they are
  normalised to Cyrillic.
- In art. 52 the Sofia municipality (Столична община) follows the Smolyan province rows without its own heading; it
  is assigned to Sofia City.
- Where an itemised source covers only part of a function, the remainder is added as an explicit "other" item, so
  every level adds up to its parent.
