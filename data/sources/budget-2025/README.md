# 2025 budget sources

CSV extracts of the budget acts adopted for 2025 (adopted late, in March 2025). Bulgaria still used the lev in 2025,
so **all amounts are in Bulgarian leva (BGN)**: the law tables, the municipal table, the spending units and the
transfers are in thousand BGN (`kBGN`, "хил. лв."), the cash benefits in million BGN (`mBGN`). The fixed conversion
rate is 1 EUR = 1.95583 BGN.

The files have the same layout as their 2026 counterparts in `../budget-2026/`; only the unit in the value column
name differs. They were extracted from the State Gazette HTML (the original promulgated texts), the bill packages on
parliament.bg and the Council of Ministers documents on strategy.bg, because minfin.bg blocks automated downloads.

| File | Content | Source |
| --- | --- | --- |
| `nhif-2025-tables.csv` | National Health Insurance Fund budget: art. 1 (1) revenue and art. 1 (2) expenditure tables, and annex 1 (list of antineoplastic medicines), 85 rows. Table 0 is the Gazette issue header | Закон за бюджета на НЗОК за 2025 г., ДВ бр. 25 от 25.03.2025, стр. 30 — https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=233618 |
| `social-security-2025-tables.csv` | State social security (ДОО) budget: consolidated budget (art. 1), funds Pensions (art. 2), Art. 69 pensions (art. 3), non-contributory pensions (art. 4), work accident (art. 5), sickness and maternity (art. 6), unemployment (art. 7), NOI (art. 8); annexes 1 and 1А minimum insurable income (1 Jan–31 Mar and 1 Apr–31 Dec), 2 and 2А work-accident contribution rates, 3 Guaranteed Receivables Fund, **4 Teachers' Pension Fund (table 30)**, 5 consolidated budget of the NOI-administered funds (553 rows) | Закон за бюджета на ДОО за 2025 г., ДВ бр. 25 от 25.03.2025, стр. 3 — https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=233617 |
| `social-security-2025-benefits.csv` | Cash benefits by type (sick pay, maternity, childcare until 2, unemployment …), typed in from the explanatory memorandum, million BGN | Мотиви към законопроекта за бюджета на ДОО за 2025 г., вх. № 51-502-01-6 — https://www.parliament.bg/bg/bills/ID/166102 (file https://www.parliament.bg/bills/51/51-502-01-6.rtf) |
| `municipal-delegated-2025.csv` | State funding of state-delegated activities for each of the 265 municipalities, by function, thousand BGN (265 rows + the "ВСИЧКО:" row) | Закон за държавния бюджет на Република България за 2025 г., чл. 54, ДВ бр. 26 от 27.03.2025 — https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=233694 |
| `municipal-transfers-2025.csv` | What the central budget transfers to each of the 265 municipalities, by type (delegated activities, equalising subsidy, winter roads, capital subsidy, other targeted transfers), thousand BGN, with the ЕБК code of each municipality | Same act, чл. 53 — https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=233694. Retrieved 5.10.2026 |
| `state-budget-2025-spending-units.csv` | Expenditure of the 48 first-level spending units by policy / functional area, thousand BGN (210 rows) | Same act, чл. 2–49, ал. 2 |
| `transfers-universities-2025.csv` | Transfers to state universities, the Academy of Sciences (BAS), the state military universities and the public media (BNT, BNR, BTA), 2025–2028, thousand BGN | Актуализирана средносрочна бюджетна прогноза за периода 2025–2028 г. (explanatory memorandum to the 2025 State Budget bill, annex 3 to РМС № 88/24.02.2025), приложение № 6 — https://www.strategy.bg/download/1296995 (decision: https://www.strategy.bg/bg/pris/legal-information/reseniia/166337) |
| `state-budget-2025-programmes.csv` | The 46 spending units that use programme budgets, their 99 area rows (80 policy / functional areas, 2 groups of "other programmes", 17 programmes listed at area level) and 184 programmes within the areas, **whole leva** (`amount_BGN`) | ПМС № 28 от 16.04.2025 г. за изпълнението на държавния бюджет за 2025 г., приложение № 1, ДВ бр. 33 от 2025 г. — https://www.strategy.bg/bg/pris/legal-information/postanovleniia/165024, annexes as .doc: https://strategy.bg/download/1293509. Retrieved 5.10.2026 |
| `state-budget-2025-programme-lines.csv` | One row per leaf line of each programme (766 rows): departmental staff, running costs and capital, and every named administered item, whole leva | Same annex |
| `mtbf-2025-2028-fses.parts.csv` (+ `.json`) | Drill-down part: the Electricity System Security Fund under „Енергетика, горива и минно дело“ (section "Annexes 7 and 8" below) | Актуализирана средносрочна бюджетна прогноза 2025–2028 (мотиви към законопроекта, РМС № 88/24.02.2025), приложение № 8 — https://www.strategy.bg/download/1296995 |
| `mtbf-2025-2028-sfa-eu.parts.csv` (+ `.json`) | Drill-down part: State Fund Agriculture's EU account under „Селско стопанство …“ | Same forecast, приложение № 7 |
| `mtbf-2025-2028-entities.parts.csv` (+ `.json`) | Drill-down parts: ПУДООС, the dam enterprise, the Agricultural Academy and ДП „Научно-производствен център“ | Same forecast, приложение № 8 |

The bills behind these acts were filed on 24.02.2025 (51-502-01-4 State Budget, 51-502-01-5 NHIF, 51-502-01-6 social
security). An earlier set filed by the caretaker government on 13.12.2024 (51-402-01-21/22/23) was withdrawn and is
not used.

## How the files were made

- Every non-empty table of the Gazette page was read in order (`table_idx`; table 0 is the issue/page header).
  `article` is the article the table follows ("Прил.N" inside annex N — annexes 1А and 2А are labelled "Прил.1" and
  "Прил.2", as in the 2026 file), `paragraph` the "(N)" of the caption, `caption` the paragraph printed just before
  the table. A row with three or more cells gives `row_no` = first cell, `label` = second-to-last cell, `value` = last
  cell; a two-cell row gives `label` and `value` only. This is the same procedure that produced the 2026 files
  (re-running it on the 2026 Gazette pages reproduces `nhif-2026-tables.csv` and `social-security-2026-tables.csv`
  exactly). As in 2026, the wide annexes 1/1А (minimum insurable income by activity and occupation group) therefore
  keep only the row number and the last two columns.
- Amounts in the law tables and the transfers file are copied as printed ("9 474 716,2"; one value is printed
  without decimals: NHIF row 1.1.3.6.1 "5 000"). In the municipal and spending-unit files they are written as plain
  numbers like the 2026 files ("1 384 306,6" → "1384306.6"; the digits are unchanged).
- The spending units table keeps the column-number row ("1", "2"), the "в т.ч." rows and the "Всичко:" rows exactly
  as in the law.

## Programme budgets (ПМС № 28/2025, Annex 1)

The two files have the same layout as `../budget-2026/state-budget-2026-programmes.csv` and
`…-programme-lines.csv` (see that README for the columns and the rules for "в т.ч." items), except that the amount
column is `amount_BGN`: the 2025 decree is in leva, and the build converts at 1.95583. Programme codes follow
РМС № 780/2023. The annexes are an old binary Word file, converted to HTML (which keeps the tables) before extraction:

```sh
curl -L -o data/cache/pms-2025/pms-28-2025-annexes.doc https://strategy.bg/download/1293509
textutil -convert html -output data/cache/pms-2025/annexes.html data/cache/pms-2025/pms-28-2025-annexes.doc
python3 scripts/extract/programme_budgets.py data/cache/pms-2025/annexes.html data/sources/budget-2025/state-budget-2025
```

Every printed total checks out (no corrections were needed), and all 46 units' totals and area amounts equal the
State Budget Act (`state-budget-2025-spending-units.csv`) exactly: 22 813 961 600 leva, the act's 24 329 511.9
thousand leva minus the National Assembly and the judiciary.

275 of the 283 area and programme rows have the same code and name as in 2026, so they get the same ids and the site
compares them across the two years. Where 2026 uses a code for something else (7400.01.01, 7400.01.02 and
7400.02.00 of the Ministry of Innovation and Growth, whose codes the Ministry of Innovation and Digital
Transformation took over), the 2025 programme's id gets the year (`p7400-01-02-2025`). Item names that are the same item as in 2026 have the same
English name (and so the same id).

## Differences from the 2026 layout to be aware of

- Table numbers of the social security file are the same as in 2026: consolidated expenditure 2, Pensions 5,
  Art. 69 fund 8, non-contributory 11, work accident 14, NOI 23, Teachers' Pension Fund 30.
- NHIF expenditure rows 1.1.3.5.x are structured differently from 2026: 1.1.3.5.1 pharmacy dispensing fees,
  1.1.3.5.2 medical devices for home treatment, 1.1.3.5.3 medicines and dietary foods for home treatment
  (1.1.3.5.3.1 with a protocol, 1.1.3.5.3.2 without a protocol, 1.1.3.5.3.3 dietary foods), 1.1.3.5.4 medicines for
  malignant diseases used in hospitals, 1.1.3.5.5 medicines for congenital coagulopathies, 1.1.3.5.6 antineoplastic
  medicines under art. 6 (1) of the act. There are no rows 1.1.3.5.4.1/1.1.3.5.4.2 (reference / generic) as in 2026.
- Spending units that do not exist in 2026: Министерството на икономиката и индустрията (art. 19),
  Министерството на иновациите и растежа (art. 20), Министерството на електронното управление (art. 26),
  Комисията за противодействие на корупцията (art. 33).

## Corrections applied

- Municipal table: the Stara Zagora heading is split over two text runs in the Gazette HTML ("ОБ" + "ЛАСТ СТАРА
  ЗАГОРА"), which reads as "ОБ ЛАСТ СТАРА ЗАГОРА"; it is written "ОБЛАСТ СТАРА ЗАГОРА", like the other headings.
- Municipal table: 140 municipality names contain Latin look-alike letters inside Cyrillic words ("Kресна",
  "Cандански"); they were replaced with the Cyrillic letters. Sofia municipality ("СТОЛИЧНА ОБЩИНА") follows the
  Smolyan rows without its own heading, so its `oblast` column says "ОБЛАСТ СМОЛЯН", exactly as in the 2026 file
  (the build assigns it to Sofia City).
- Everything else is kept as printed, including the typo "извърша" in NHIF row 1.1.3.5.3.1.

## Checks

- NHIF: revenue (I.) = expenditure (II.) = 9 474 716,2. Every numbered row equals the sum of its sub-rows, except
  the "в т.ч." (of which) item 1.1.3.6.1 (biomarker diagnostics) under 1.1.3.6.
- Social security: all 52 parent rows equal the sum of their sub-rows. Consolidated pensions (art. 1 (2), row 1.1,
  24 106 021,6) = sum of the pensions of the four funds; consolidated benefits (row 1.2, 3 073 893,6) = sum of the
  funds' row 1.2.
- Municipal table: 265 municipalities under 27 oblast headings; each of the ten columns adds up exactly to the
  "ВСИЧКО:" row (total 7 892 909,1); on every row total = 2+3+4+5+6+7+8 and 2 = 2a+2b.
- Spending units: 48 units; in each the numbered rows add up to "Всичко:", the "7.1./7.2." sub-rows add up to their
  parent, and "Всичко:" equals the "II. РАЗХОДИ" row of para. 1 of the same article (sum of all units
  24 329 511,9).
- Transfers: row 4 = 4.1 + 4.2. The 2025 column equals the amounts in the adopted State Budget Act: art. 16 (4)
  lists BAS 240 292,2 and the 33 state universities, "Всичко:" 1 450 908,9 (so the universities get 1 210 616,7);
  art. 11 (4) military universities 85 800,1; art. 50 BNR 66 132,5, BNT 93 665,0, BTA 15 668,6.
- Benefits: the memorandum's total for cash benefits and aid, 3 073,9 million, matches row 1.2 of the act
  (3 073 893,6 thousand). The listed items add up to 3 070,9 million; the rest is other benefits.

## Transfers to municipalities (чл. 53)

`municipal-transfers-2025.csv` has the layout of `../budget-2026/municipal-transfers-2026.csv` (see that README for
the columns, the totals of all three years and how the file is made), with amounts in thousand BGN
(`amount_kBGN`). In 2025 the table is art. 53 and the delegated activities by function are art. 54. Every column
adds up to the act's "ВСИЧКО:" row and to the amounts in the text of art. 53, the grand total equals row III.1.1
„Общините“ of art. 1 (2) (8 925 909,1 thousand BGN), and the delegated-activities column equals the totals of art. 54
(and `municipal-delegated-2025.csv`, re-checked cell by cell against the Gazette) for every municipality.

## The ministries' programmes in the КФП boxes (grafts, 14.11.2026)

The programme map that places "Ministries 2026" in "Budget 2026" (`../../drilldown/programme-map.csv`; rules in
`docs/drilldown.md` › "The programme map", the 2026 figures and checks in `../budget-2026/README.md`) applies to
"Ministries 2025" (ПМС № 28/2025, annex 1) with the same programme codes and the same reasons. 148 nodes,
**€12,081.9 m** of the ministries' €12,439.5 m (97%), go into 21 boxes of "Budget 2025"; €357.7 m is left out.
What differs from 2026:

- 2025 has the Ministry of e-Government (`meg`, €28.6 m → executive bodies, as its successor's area in 2026), the
  Ministry of Innovation and Growth (`mig`: its investment and innovation area, €28.7 m, left out — ЕБК not
  certain, and the 2025 actual leaves no room for it in the economic column; its administration → executive bodies)
  and the Anti-Corruption Commission (`anti-corruption`, → executive bodies).
- State Fund Agriculture's „Развитие на селските райони“ (8400.01.01) is all staff in 2025 (€17.3 m, no VAT refunds
  to municipalities): grafted whole, under the same id as the 2026 staff line (`e-agriculture.p8400-01-01-staff`).
- The labour ministry's foster-care item (€19.6 m, only in 2025) is left out (a social service or a child-protection
  payment — not certain).
- „Наука“ (`g-science`, €437.6 m) has no parts in 2025, so the education ministry's research programmes (€23.6 m)
  go directly under it and leave `g-science.rest`. The prisons' two programmes fill `o-prisons` (€222.2 m of
  €222.3 m: no remainder). The Ministry of Energy's area „Енергетика“ (€37.9 m) is grafted as in 2026 and leaves
  `e-energy.rest` (€1,575.5 m).

| Box | Box, € m | Grafted, € m | Remainder, € m |
| --- | ---: | ---: | ---: |
| `o-police` | 2,750.4 | 2,357.6 | 392.8 |
| `defence` | 2,126.8 | 2,018.0 | 108.9 |
| `e-transport` | 2,921.5 | 1,558.5 | 1,363.0 |
| `g-executive-other` | 1,591.7 | 956.8 | 634.9 |
| `s-ben-assistance` | 1,645.7 | 955.1 | 690.6 |
| `s-svc-other` | 1,094.7 | 795.2 | 299.5 |
| `o-judiciary` | 819.5 | 792.9 | 26.7 |
| `h-other` | 1,009.1 | 712.0 | 297.1 |
| `ed-other` | 1,864.7 | 707.0 | 1,157.7 |
| `e-agriculture` | 1,924.9 | 426.4 | 1,498.5 |
| `o-prisons` | 222.3 | 222.2 | — |
| `c-culture-other` | 449.4 | 191.3 | 258.1 |
| `g-services` | 115.0 | 97.9 | 17.1 |
| `c-sport` | 127.9 | 72.2 | 55.7 |
| `e-other` | 1,029.4 | 46.3 | 983.1 |
| `c-environment` | 827.1 | 41.2 | 785.9 |
| `c-religion` | 46.2 | 40.1 | 6.2 |
| `e-energy` | 1,613.4 | 37.9 | 1,575.5 |
| `g-science` | 437.6 | 23.6 | 414.0 |
| `c-housing` | 1,259.2 | 17.4 | 1,241.8 |
| `e-tourism` | 41.4 | 12.3 | 29.1 |

Cross-check: the 2025 report's state-budget column per sub-function (`../report-2025/`), see the 2026 README; the
plan boxes here are larger than the actual columns everywhere. Spot-checks against the 2025 decree's figures as
extracted (`state-budget-2025-programmes.csv` / `-programme-lines.csv`, leva at 1.95583): 2100.02.01 1 932 854 300 лв.
= €988,252,711 (`e-transport.p2100-02-01`), 1200.01.01 2 140 172 300 лв. = €1,094,252,721 (`defence.p1200-01-01`),
„Механизъм лична помощ“ 1 157 223 100 лв. = €591,678,776 — equal to the grafts.
`budget-2025.json` grew from 319.3 KB (52.9 KB gzipped) to 643.7 KB (94.9 KB gzipped).

## Annexes 7 and 8: ФСЕС, State Fund Agriculture's EU account and the other КФП entities (drill-down parts, 14.11.2026)

The same parts as in the 2026 and 2027 plans (`../budget-2026/README.md`, sections "Energy" and "Annexes 7 and 8":
why each entity goes where it does, and why column 2.1 and not the net figure), from the document the 2025 plan
itself comes from: „Мотиви към законопроекта за държавния бюджет на Република България за 2025 г.“ with the
„Актуализирана средносрочна бюджетна прогноза за периода 2025–2028 г.“ (attachment to РМС № 88/24.02.2025), file
`25RH088pr.3.doc`, https://www.strategy.bg/download/1296995 (retrieved 14.11.2026 into `data/cache/mtbf-2025-2028/`,
with a manifest), приложение № 7 and № 8, column 2.1 „Разходи“ for 2025, **thousand BGN**, converted at 1.95583.
Column 2 is 2.1 minus 2.2 „Трансфери (нето)“ in every row used. Basis `mapped`.

| Part | Box (remainder before → after, € m) | 2.1 „Разходи“, thousand BGN | € | 2.2 (net transfers) |
| --- | --- | ---: | ---: | --- |
| `e-energy.fses` Фонд „Сигурност на електроенергийната система“ | `e-energy` (1,575.5 → 540.6) | 2 024 055,1 | 1,034,882,940 | 685 026,1 = the Ministry of Energy's transfer „за Фонд „Сигурност на електроенергийната система““ in the State Budget Act 2025, art. 21(1) |
| `e-agriculture.sfa-eu` Сметка за средствата от ЕС на ДФ „Земеделие“ | `e-agriculture` (1,498.5 → 316.0) | 2 312 830,3 | 1,182,531,355 | 865 687,6 = the central budget's transfer to the account, State Budget Act 2025 art. 1(1) section III item 1.5 |
| `c-environment.pudoos` ПУДООС | `c-environment` (785.9 → 750.3) | 69 729,9 | 35,652,332 | 36 200,0 = the environment ministry's 42 200,0 to it less 6 000,0 back (same act) |
| `e-other.dpusya` ДП „Управление и стопанисване на язовири“ | `e-other` (983.1 → 972.3) | 21 105,8 | 10,791,224 | 21 105,8 = the economy ministry's transfer (same act) |
| `g-science.ssa` Селскостопанска академия | `g-science` (414.0 → 363.4) | 95 388,2 | 48,771,212 | 77 388,2 = the agriculture ministry's transfer (same act) |
| `g-science.dpnpc` ДП „Научно-производствен център“ | `g-science` | 3 576,5 | 1,828,635 | — |

- *Plans with plans:* the boxes are this document's Table III-1, column „2025 Проект“ (`../kfp/`), so parts and boxes
  come from the same forecast; every transfer in column 2.2 equals the adopted State Budget Act 2025.
- *No double counting.* The grafted programmes (the energy, environment and economy ministries, the education
  ministry's research programmes, State Fund Agriculture's state-budget programmes) are their units' own
  expenditure; their transfers to these entities, and State Fund Agriculture's state budget, are other КФП budgets
  than the parts.
- *Not mapped:* the National Fund's EU account (annex 7 row 2: 7 441 630,5) and the other EU accounts (row 3:
  842 606,6) span many functions; the forecast gives totals only.
- *Cross-check against the 2025 actual* (`../report-2025/`): ФСЕС spent 2 431,7 m BGN (all in this sub-function),
  120% of its plan here; the fund is 64.1% of the box. The sub-function's EU funds were €859.9 m against the
  account's planned €1,182.5 m.
- *Checked against the DOC* (thousand BGN, columns 2 / 2.1 / 2.2): ФСЕС 1 339 029,0 / 2 024 055,1 / 685 026,1; State
  Fund Agriculture's account 1 447 142,7 / 2 312 830,3 / 865 687,6; ПУДООС 33 529,9 / 69 729,9 / 36 200,0;
  Селскостопанска академия 18 000,0 / 95 388,2 / 77 388,2; ДП НПЦ 3 576,5 / 3 576,5 / —; ДП УСЯ — / 21 105,8 /
  21 105,8.
- *Size*: `budget-2025.json` grew from 653.4 KB (97.4 KB gzipped) to 661.4 KB (99.1 KB gzipped).

## Later amendments (not reflected)

The files contain the original adopted texts. Amendments found in the parliament bill register: the State Budget
Act 2025 was amended by laws in ДВ бр. 61/2025 (bill 51-502-01-32) and бр. 83/2025 (bill 51-502-01-48). No bill
amending the NHIF or the social security budget act for 2025 was found.
