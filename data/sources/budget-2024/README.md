# 2024 budget sources

CSV extracts of the budget acts adopted for 2024. Bulgaria still used the lev in 2024, so **all amounts are in
Bulgarian leva (BGN)**: the law tables, the municipal table, the spending units and the transfers are in thousand
BGN (`kBGN`, "хил. лв."), the cash benefits in million BGN (`mBGN`). The fixed conversion rate is 1 EUR = 1.95583 BGN.

The files have the same layout as their 2026 counterparts in `../budget-2026/`; only the unit in the value column
name differs. They were extracted from the State Gazette HTML (the original promulgated texts) and the bill packages
on parliament.bg, because minfin.bg blocks automated downloads.

| File | Content | Source |
| --- | --- | --- |
| `nhif-2024-tables.csv` | National Health Insurance Fund budget, art. 1 (1) revenue and art. 1 (2) expenditure tables (48 rows; the act has no annex table). Table 0 is the Gazette issue header | Закон за бюджета на НЗОК за 2024 г., ДВ бр. 106 от 22.12.2023, стр. 73 — https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=202042 |
| `social-security-2024-tables.csv` | State social security (ДОО) budget: consolidated budget (art. 1), funds Pensions (art. 2), Art. 69 pensions (art. 3), non-contributory pensions (art. 4), work accident (art. 5), sickness and maternity (art. 6), unemployment (art. 7), NOI (art. 8); annex 1 minimum insurable income, annex 2 work-accident contribution rates, annex 3 Guaranteed Receivables Fund, **annex 4 Teachers' Pension Fund (table 28)**, annex 5 consolidated budget of the NOI-administered funds (367 rows) | Закон за бюджета на ДОО за 2024 г., ДВ бр. 106 от 22.12.2023, стр. 79 — https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=202043 |
| `social-security-2024-benefits.csv` | Cash benefits by type (sick pay, maternity, childcare until 2, unemployment …), typed in from the explanatory memorandum, million BGN | Мотиви към законопроекта за бюджета на ДОО за 2024 г., вх. № 49-302-01-75 — https://www.parliament.bg/bg/bills/ID/165234 (file https://www.parliament.bg/bills/49/49-302-01-75.rtf) |
| `municipal-delegated-2024.csv` | State funding of state-delegated activities for each of the 265 municipalities, by function, thousand BGN (265 rows + the "ВСИЧКО:" row) | Закон за държавния бюджет на Република България за 2024 г., чл. 54, ДВ бр. 108 от 30.12.2023 — https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=202168 |
| `municipal-transfers-2024.csv` | What the central budget transfers to each of the 265 municipalities, by type (delegated activities, equalising subsidy, winter roads, capital subsidy, other targeted transfers), thousand BGN, with the ЕБК code of each municipality | Same act, чл. 53 — https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=202168. Retrieved 5.10.2026 |
| `state-budget-2024-spending-units.csv` | Expenditure of the 48 first-level spending units by policy / functional area, thousand BGN (213 rows) | Same act, чл. 2–49, ал. 2 |
| `transfers-universities-2024.csv` | Transfers to state universities, the Academy of Sciences (BAS), the state military universities and the public media (BNT, BNR, BTA), 2024–2026, thousand BGN | Актуализирана средносрочна бюджетна прогноза за периода 2024–2026 г. (approved with РМС № 830/24.11.2023), приложение № 6 — file `4-UMTBF-2024-2026-motivi f.docx` in the bill package https://www.parliament.bg/bills/49/49-302-01-76.zip |
| `mtbf-2024-2026-fses.parts.csv` (+ `.json`) | Drill-down part: the Electricity System Security Fund under „Енергетика, горива и минно дело“ (section "Annexes 7 and 8" below) | Актуализирана средносрочна бюджетна прогноза 2024–2026 (РМС № 830/24.11.2023), приложение № 8 — same file as above |
| `mtbf-2024-2026-sfa-eu.parts.csv` (+ `.json`) | Drill-down part: State Fund Agriculture's EU account under „Селско стопанство …“ | Same forecast, приложение № 7 |
| `mtbf-2024-2026-entities.parts.csv` (+ `.json`), `mtbf-2024-2026-science.parts.csv` (+ `.json`) | Drill-down parts: ПУДООС, the dam enterprise; the Agricultural Academy and ДП „Научно-производствен център“ under „Наука“ (a leaf until now, hence its own file naming the remainder) | Same forecast, приложение № 8 |

## How the files were made

- Every non-empty table of the Gazette page was read in order (`table_idx`; table 0 is the issue/page header).
  `article` is the article the table follows ("Прил.N" inside annex N), `paragraph` the "(N)" of the caption,
  `caption` the paragraph printed just before the table. A row with three or more cells gives
  `row_no` = first cell, `label` = second-to-last cell, `value` = last cell; a two-cell row gives `label` and `value`
  only. This is the same procedure that produced the 2026 files (re-running it on the 2026 Gazette pages reproduces
  `nhif-2026-tables.csv` and `social-security-2026-tables.csv` exactly). As in 2026, the wide annex 1 (minimum
  insurable income by activity and occupation group) therefore keeps only the row number and the last two
  columns.
- Amounts in the law tables and the transfers file are copied as printed ("8 168 353,1"). In the municipal and
  spending-unit files they are written as plain numbers like the 2026 files ("1 221 324,9" → "1221324.9"; the digits
  are unchanged).
- The spending units table keeps the column-number row ("1", "2"), the "в т.ч." rows and the "Всичко:" rows exactly
  as in the law.

## Differences from the 2026 layout to be aware of

- Table numbers of the social security file: the consolidated expenditure table is 2, the funds' expenditure tables
  5 (Pensions), 8 (Art. 69), 11 (non-contributory), 14 (work accident), the NOI table 23 — as in 2026 — but the
  **Teachers' Pension Fund is table 28** (2026: table 30), because the 2024 act has a single annex 1 and annex 2
  (2026 had 1/1А and 2/2А for two periods of the year).
- NHIF expenditure rows 1.1.3.5.x are structured differently from 2026: 1.1.3.5.1 pharmacy dispensing fees,
  1.1.3.5.2 medical devices and dietary foods for home treatment, 1.1.3.5.3 medicines for home treatment
  (1.1.3.5.3.1 prescribed with a protocol, 1.1.3.5.3.2 without a protocol), 1.1.3.5.4 medicines for malignant
  diseases and congenital coagulopathies used in hospitals. There are no rows 1.1.3.5.4.1/1.1.3.5.4.2 (reference /
  generic) as in 2026. Row 1.1.3.3.1 (full dentures) is an "of which" item of dental care.
- Judiciary (art. 2): the 2024 act has no table by functional area; its para. 2 table distributes the expenditure by
  judicial body (Висш съдебен съвет, Върховен касационен съд, …). It is included with
  `breakdown_type` = `judicial_bodies`; its rows have no row number.
- Spending units that do not exist in 2026: Министерството на икономиката и индустрията (art. 19),
  Министерството на иновациите и растежа (art. 20), Министерството на електронното управление (art. 26),
  Комисията за противодействие на корупцията (art. 33).

## Corrections applied

- Social security, art. 1–8 and annex 5: the Gazette prints the row number in the same cell as the label
  ("1.1. Пенсии"). The number was moved to `row_no` and the label kept without it, matching the 2026 layout. The
  Roman numeral of the totals rows is printed with a Cyrillic "І" ("І.", "IІ."); in `row_no` it is written with Latin
  letters ("I.", "II.") as in the 2025 and 2026 files. Annexes 3 and 4 are kept as printed (their numerals stay inside
  the label, as in 2026).
- NHIF row 1.1.3.7.2: "oт" with a Latin "o" → "от".
- Municipal table: 140 municipality names contain Latin look-alike letters inside Cyrillic words ("Kресна",
  "Cандански"); they were replaced with the Cyrillic letters. Sofia municipality ("СТОЛИЧНА ОБЩИНА") follows the
  Smolyan rows without its own heading, so its `oblast` column says "ОБЛАСТ СМОЛЯН", exactly as in the 2026 file
  (the build assigns it to Sofia City).

## Checks

- NHIF: revenue (I.) = expenditure (II.) = 8 168 353,1. Every numbered row equals the sum of its sub-rows, except
  the "в т.ч." (of which) items under 1.1.3.3 dental care and 1.1.3.7 hospital care.
- Social security: 50 of 51 parent rows equal the sum of their sub-rows. The exception is the Pensions fund revenue
  (art. 2 (1)): the law lists "2.3. Други приходи 36 000,0" without a "2." row, and I. = 1. + 2.3. + 4. holds.
  Consolidated pensions (art. 1 (2), row 1.1, 21 606 997,7) = sum of the pensions of the four funds; consolidated
  benefits (row 1.2, 2 545 951,3) = sum of the funds' row 1.2.
- Municipal table: 265 municipalities under 27 oblast headings; each of the ten columns adds up exactly to the
  "ВСИЧКО:" row (total 6 927 959,1); on every row total = 2+3+4+5+6+7+8 and 2 = 2a+2b.
- Spending units: 48 units; in each the numbered rows add up to "Всичко:", the "7.1./7.2." sub-rows add up to their
  parent, and "Всичко:" equals the "II. РАЗХОДИ" row of para. 1 of the same article (sum of all units
  17 090 141,8).
- Transfers: row 4 = 4.1 + 4.2. The 2024 column equals the amounts in the adopted State Budget Act: art. 16 (4)
  lists BAS 171 899,8 and the 33 state universities, "Всичко:" 979 079,0 (so the universities get 807 179,2);
  art. 11 (4) military universities 59 040,2; art. 50 BNR 62 974,4, BNT 86 980,6, BTA 11 856,5.
- Benefits: the memorandum's total for cash benefits and aid, 2 546,0 million, matches row 1.2 of the act
  (2 545 951,3 thousand). The listed items add up to 2 542,2 million; the rest is other benefits.

## Transfers to municipalities (чл. 53)

`municipal-transfers-2024.csv` has the layout of `../budget-2026/municipal-transfers-2026.csv` (see that README for
the columns, the totals of all three years and how the file is made), with amounts in thousand BGN
(`amount_kBGN`). In 2024 the table is art. 53 and the delegated activities by function are art. 54. Every column
adds up to the act's "ВСИЧКО:" row and to the amounts in the text of art. 53, the grand total equals row III.1.1
„Общините“ of art. 1 (2) (7 872 497,4 thousand BGN), and the delegated-activities column equals the totals of art. 54
(and `municipal-delegated-2024.csv`, re-checked cell by cell against the Gazette) for every municipality.

## The ministries' areas in the КФП boxes (grafts, 14.11.2026)

The programme map (`../../drilldown/programme-map.csv`; rules in `docs/drilldown.md` › "The programme map") also
places "Ministries 2024" (`state-budget-2024-spending-units.csv`, State Budget Act 2024 art. 2–49) in "Budget 2024".
The 2024 act gives **policy areas only** (no programme budgets are extracted for 2024), so the rule is the one used for
the 2027 draft: an area is grafted when, in 2025, all of it goes to one box, with the 2025 reason; an area whose 2025
programmes go to several boxes, or partly nowhere, is left out as mixed. 79 areas and bodies, **€4,906.0 m** of the
ministries' €8,738.1 m (56%), go into 16 boxes; €3,832.1 m is left out, mostly mixed areas: the defence ministry's
„Отбранителни способности“ (€1,025.4 m: armed forces, but also military medicine and education), the labour
ministry's three benefit areas (€1,360.6 m: benefits with their staff and personal assistance), the regional
ministry's roads area (€550.2 m), the culture ministry's arts area (with the art schools, €189.5 m) and the interior
ministry's „Управление и развитие на МВР“ (€130.2 m). Two more are left out on purpose:

- State Fund Agriculture's „Земеделие и селски райони (субсидии)“ (€253.5 m): all of it goes to agriculture in 2025,
  but in 2026 its programme 8400.01.01 also carries VAT refunds to municipalities (a transfer the tree counts under the
  municipalities); the 2024 area alone cannot rule that out.
- The Council of Ministers' „Вероизповедания“ (€25.07 m) equals the box „Религиозни дейности“ (€25.05 m; the КФП is in
  0.1 m BGN): a single part would split nothing.

The grafted copies have the ids of 2025/2026 where the same area is grafted whole there (e.g.
`o-police.moi-fighting-crime-and-keeping-public-order`, `g-executive.mof-collecting-taxes-and-customs-duties`), and
the same names and remainder names.

| Box | Box, € m | Grafted, € m | Remainder, € m |
| --- | ---: | ---: | ---: |
| `o-police` | 1,844.6 | 1,475.3 | 369.3 |
| `g-executive-other` | 1,422.6 | 773.6 | 649.0 |
| `o-judiciary` | 733.6 | 624.5 | 109.1 |
| `ed-other` | 1,429.0 | 533.6 | 895.4 |
| `h-other` | 771.0 | 521.6 | 249.4 |
| `e-transport` | 1,755.1 | 350.7 | 1,404.4 |
| `o-prisons` | 154.3 | 149.7 | 4.5 |
| `e-agriculture` | 1,152.3 | 144.1 | 1,008.3 |
| `s-svc-other` | 831.6 | 95.6 | 736.0 |
| `g-services` | 76.4 | 61.0 | 15.4 |
| `c-sport` | 84.2 | 48.1 | 36.2 |
| `e-other` | 2,349.2 | 33.6 | 2,315.7 |
| `c-environment` | 779.7 | 31.1 | 748.7 |
| `e-energy` | 1,721.9 | 30.9 | 1,691.1 |
| `c-culture-other` | 418.9 | 20.0 | 398.9 |
| `e-tourism` | 43.7 | 12.7 | 31.0 |

Nothing goes into defence, social benefits, housing or science in 2024 (their areas are mixed), so those boxes stay
as they were; their ledger entries name the 2024 decree on the programme budgets as the lead.

Cross-check against the 2024 actual (the 2024 report's state-budget column per sub-function, `report-2024`; plans
and actuals may differ, but a plan far above the actual would point to a wrong box): police €1,475.3 m (actual
€1,741.1 m), executive bodies €773.6 m (€887.8 m), judiciary €624.5 m (€706.1 m), health €521.6 m (the actual's
non-NHIF, non-municipal remainder €610.0 m), agriculture €144.1 m (€718.0 m), prisons €149.7 m (€162.3 m), services
€95.6 m (€170.6 m). Slightly above: education €533.6 m (€514.6 m), sport €48.1 m (€43.7 m; also over in 2025) and
energy €30.9 m (€29.5 m). Spot-checks against the act as extracted (thousand BGN at 1.95583): the interior
ministry's area 1 1 676 279,9 = €857,068,303 (`o-police.moi-fighting-crime-and-keeping-public-order`), its area 3
448 510,0 = €229,319,522, the finance ministry's area 2 528 926,8 = €270,435,979 — equal to the grafts.
`budget-2024.json` grew from 326.6 KB (55.0 KB gzipped) to 393.0 KB (64.4 KB gzipped).

## Annexes 7 and 8: ФСЕС, State Fund Agriculture's EU account and the other КФП entities (drill-down parts, 14.11.2026)

The same parts as in the 2026 and 2027 plans (`../budget-2026/README.md`, sections "Energy" and "Annexes 7 and 8":
why each entity goes where it does, and why column 2.1 and not the net figure), from the forecast that accompanied
the 2024 budget: „Актуализирана средносрочна бюджетна прогноза за периода 2024–2026 г.“ (approved with РМС №
830/24.11.2023), file `4-UMTBF-2024-2026-motivi f.docx` in the bill package
https://www.parliament.bg/bills/49/49-302-01-76.zip (retrieved 14.11.2026 into `data/cache/mtbf-2024-2026/`, with a
manifest), приложение № 7 (DOCX table 80) and № 8 (table 81), column 2.1 „Разходи“ for 2024, **thousand BGN**,
converted at 1.95583. Column 2 is 2.1 minus 2.2 „Трансфери (нето)“ in every row used. Basis `mapped`.

| Part | Box (remainder before → after, € m) | 2.1 „Разходи“, thousand BGN | € | 2.2 (net transfers) |
| --- | --- | ---: | ---: | --- |
| `e-energy.fses` Фонд „Сигурност на електроенергийната система“ | `e-energy` (1,691.1 → 356.8) | 2 609 569,0 | 1,334,251,443 | none (the State Budget Act 2024 has no transfer to the fund) |
| `e-agriculture.sfa-eu` Сметка за средствата от ЕС на ДФ „Земеделие“ | `e-agriculture` (1,008.3 → 338.0) | 1 310 812,0 | 670,207,533 | 456 301,7 = the central budget's transfer to the account, State Budget Act 2024 art. 1(1) section III item 1.5 |
| `c-environment.pudoos` ПУДООС | `c-environment` (748.7 → 713.2) | 69 314,9 | 35,440,146 | 40 040,1 = the environment ministry's 46 040,1 to it less 6 000,0 back (same act) |
| `e-other.dpusya` ДП „Управление и стопанисване на язовири“ | `e-other` (2,315.7 → 2,304.0) | 22 836,7 | 11,676,219 | 22 836,7 = the economy ministry's transfer (same act) |
| `g-science.ssa` Селскостопанска академия | `g-science` (a leaf of 368.8 → remainder `g-science.rest` 330.7) | 71 909,0 | 36,766,488 | 53 909,0 = the agriculture ministry's transfer (same act) |
| `g-science.dpnpc` ДП „Научно-производствен център“ | `g-science` | 2 699,9 | 1,380,437 | — |

- *Plans with plans.* The boxes are the 2024 programme as printed in the 2025 forecast's Table III-1
  (`../kfp/mtbf-2025-2028-by-function.csv`); the 2024–2026 forecast's own Table III-1 has the same 2024 figure for
  energy (3 367,8 m BGN) and environment (1 525,0), and slightly different ones for agriculture (2 256,2 against
  2 253,8) and other economic activities (4 584,7 against 4 594,7). The parts are the entities' plans for the same
  year; every transfer in column 2.2 equals the adopted State Budget Act 2024.
- *No double counting.* The grafted ministry areas (energy, environment, economy, agriculture) are the ministries'
  own expenditure; their transfers to these entities are not in them. Nothing is grafted under „Наука“ in 2024.
- *Not mapped:* the National Fund's EU account (annex 7 row 2: 6 703 610,8) and the other EU accounts (row 3:
  475 800,3) span many functions; the forecast gives totals only.
- *Cross-check against the 2024 actual* (`../report-2024/`): ФСЕС spent 2 523,7 m BGN (all in this sub-function),
  96.7% of its plan here; the fund is 77.5% of the box. The sub-function's EU-funds column was 750,1 m BGN, below
  the account's planned 1 310,8 (a plan far above the outturn, as in the other plan years).
- *Checked against the DOCX* (thousand BGN, columns 2 / 2.1 / 2.2): ФСЕС 2 609 569,0 / 2 609 569,0 / —; State Fund
  Agriculture's account 854 510,3 / 1 310 812,0 / 456 301,7; ПУДООС 29 274,8 / 69 314,9 / 40 040,1; Селскостопанска
  академия 18 000,0 / 71 909,0 / 53 909,0; ДП НПЦ 2 699,9 / 2 699,9 / —; ДП УСЯ — / 22 836,7 / 22 836,7.
- *Also found:* a note under Table III-1 says „За 2024-2026 г. разходите за националната капиталова програма са
  разчетени в други дейности по икономиката“ — a lead for `e-other.rest` (ledger).
- *Size*: `budget-2024.json` grew from 393.0 KB (64.4 KB gzipped) to 402.1 KB (66.2 KB gzipped).

## Later amendments (not reflected)

The files contain the original adopted texts. Amendments found in the parliament bill register:
the State Budget Act 2024 was amended by laws in ДВ бр. 38/2024 (bill 49-402-01-19), бр. 67/2024 (50-402-01-12) and
бр. 83/2024 (50-402-01-24); the Social Security Budget Act 2024 was supplemented in ДВ бр. 34/2024
(bill 49-454-01-39). No bill amending the NHIF Budget Act 2024 was found.
