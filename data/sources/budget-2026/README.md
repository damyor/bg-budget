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

## Other corrections

- Some names in the State Gazette text mix Latin look-alike letters into Cyrillic words ("Cмолян"); they are
  normalised to Cyrillic.
- In art. 52 the Sofia municipality (Столична община) follows the Smolyan province rows without its own heading; it
  is assigned to Sofia City.
- Where an itemised source covers only part of a function, the remainder is added as an explicit "other" item, so
  every level adds up to its parent.
