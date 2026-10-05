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

## Later amendments (not reflected)

The files contain the original adopted texts. Amendments found in the parliament bill register: the State Budget
Act 2025 was amended by laws in ДВ бр. 61/2025 (bill 51-502-01-32) and бр. 83/2025 (bill 51-502-01-48). No bill
amending the NHIF or the social security budget act for 2025 was found.
