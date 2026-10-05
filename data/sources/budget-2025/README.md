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
| `state-budget-2025-spending-units.csv` | Expenditure of the 48 first-level spending units by policy / functional area, thousand BGN (210 rows) | Same act, чл. 2–49, ал. 2 |
| `transfers-universities-2025.csv` | Transfers to state universities, the Academy of Sciences (BAS), the state military universities and the public media (BNT, BNR, BTA), 2025–2028, thousand BGN | Актуализирана средносрочна бюджетна прогноза за периода 2025–2028 г. (explanatory memorandum to the 2025 State Budget bill, annex 3 to РМС № 88/24.02.2025), приложение № 6 — https://www.strategy.bg/download/1296995 (decision: https://www.strategy.bg/bg/pris/legal-information/reseniia/166337) |

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

## Later amendments (not reflected)

The files contain the original adopted texts. Amendments found in the parliament bill register: the State Budget
Act 2025 was amended by laws in ДВ бр. 61/2025 (bill 51-502-01-32) and бр. 83/2025 (bill 51-502-01-48). No bill
amending the NHIF or the social security budget act for 2025 was found.
