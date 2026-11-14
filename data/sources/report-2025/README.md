# 2025 budget execution (report) sources

Actual (reported) figures for 2025. Bulgaria still used the lev in 2025, so all amounts are in **thousand BGN**
(`kBGN`, "хил. лв."); 1 EUR = 1.95583 BGN. None of the 2025 execution reports had been adopted by the National
Assembly by 4 Oct 2026, so there is no State Gazette text; the files below come from the documents filed by the
Council of Ministers and the National Health Insurance Fund.

| File | Content | Source |
| --- | --- | --- |
| `kfp-2025-report-by-function.csv` | Consolidated fiscal programme (КФП) **actual** expenditure 2025 by function and group, split by budget and economic line, in the same long format (497 rows) | Доклад към отчета за изпълнението на държавния бюджет за 2025 г., section 4 "Изпълнение на разходите по функции по КФП", tables "ОТЧЕТ 2025 г." — attachment 3 (`26RH737pr.3.docx`) to РМС № 737 of 24.09.2026, https://www.strategy.bg/bg/pris/legal-information/reseniia/171087, file https://www.strategy.bg/download/1327172 |
| `state-budget-2025-report-spending-units.csv` | Actual 2025 expenditure of the 48 first-level spending units by functional area / policy area and budget programme (162 rows: numbered rows, "в т.ч." rows and one "Всичко:" row per unit) | "Отчет за изпълнението на държавния бюджет на Република България за 2025 г.", attachment 4 (`26RH737pr.4.xlsx`) to Council of Ministers decision РМС № 737 of 24.09.2026 — https://www.strategy.bg/bg/pris/legal-information/reseniia/171087, file https://www.strategy.bg/download/1327215. Sections N.2 "Приема отчета за разходите по т. N.1 по функционални области / по области на политики и бюджетни програми". The same tables are in attachment 8 (draft National Assembly decision, https://www.strategy.bg/download/1327219) and in the filing to parliament, вх. № 52-602-00-42 of 25.09.2026 (scanned PDF: https://www.parliament.bg/pub/plenary_documents/52-602-00-42_.pdf) |
| `nhif-2025-report-tables.csv` | National Health Insurance Fund: 2025 Budget Act amount, annual plan as amended and actual at 31.12.2025 for every revenue and expenditure row (68 rows; table 1 revenue, table 2 expenditure, table 3 balance) | NHIF, "Отчет за текущо изпълнение към 31.12.2025 г. на бюджета на НЗОК", Приложение 1 "Текущ отчет на бюджета на НЗОК към 31.12.2025 г. и сравнение с изпълнението към 31.12.2024 г. (в лева)" (text PDF inside the zip) — https://www.nhif.bg/bg/completion-reports, file `https://www.nhif.bg/upload/30329/Отчет за текущо изпълнение към 31.12.2025 г. на бюджета на НЗОК.zip` |

## `state-budget-2025-report-spending-units.csv`

- Columns: `section,spending_unit,breakdown_type,row_no,policy_area_or_program,amount_thousand_BGN` — the same layout
  as `../budget-2025/state-budget-2025-spending-units.csv`, with `section` (the report's section number, equal to the
  article number of the 2025 State Budget Act) in place of `article`. `spending_unit` is the name as written in the
  heading "N.1. Приема отчета на бюджета на … за 2025 г."; `breakdown_type` is `functional_area` or
  `policy_or_program`. For the judiciary only the first 2.2 table (functional areas) is taken, not the table by
  judicial body.
- Amounts are the cell values of the xlsx rounded to 3 decimals (i.e. exact to the lev); the printed report shows them
  rounded to 0.1 ("60 148,9" for 60148.868). Empty amount = empty cell (e.g. the "в т.ч. Резерв …" line of the
  National Assembly).
- Unlike the Budget Act files, the column-number row ("1", "2") is not included.
- The xlsx closes some quotes with a straight `"` (Държавен фонд „Земеделие") or `”`; these were written as `“`, the
  spelling of the Budget Act, so unit and area names are identical to `../budget-2025/state-budget-2025-spending-units.csv`.

Validation:

- All 48 spending units of the 2025 State Budget Act (sections 2–49) are present, with exactly the same unit names
  and the same numbered area / programme rows as the Act.
- In every unit the numbered top-level rows add up to "Всичко:" and the sub-rows (section 6 rows 7.1–7.2, section 18
  row 3.1, section 43 rows 1.1–1.2) add up to their parent — exactly, with no rounding difference.
- Each unit's "Всичко:" equals the "II. РАЗХОДИ" line of the same unit's N.1 table.
- Sum of the 48 "Всичко:" rows: **23 911 336.3** thousand BGN. State budget expenditure in section 1.2 of the report
  (II. РАЗХОДИ): **25 313 121.9**. The difference, 1 401 785.7, is spending of the central budget outside the 48
  units, mainly interest (row 1.3 "Лихви": 1 386 520.8).

## `nhif-2025-report-tables.csv`

- Columns: `table_idx,caption,row_no,label,law_kBGN,adjusted_kBGN,actual_kBGN`. `law_kBGN` = "ЗБНЗОК 2025 г.
  (ДВ бр. 25 от 25 март 2025 г.)", `adjusted_kBGN` = "Годишен план за 2025 г." (РД-НС-04-104/17.12.2025 г. and
  ПМС № 302/15.12.2025 г.), `actual_kBGN` = "Отчет към 31.12.2025 г. преди отчет от МФ". The source is in leva;
  values were divided by 1000 (3 decimals, exact). Empty = blank cell in the source.
- `table_idx` 1 = revenue (rows I.–5.), 2 = expenditure (II.–3.1.), 3 = balance (III.), like the tables of
  `../budget-2025/nhif-2025-tables.csv`. Row numbers are those of the 2025 Budget Act ("№ по ред по ЗБНЗОК за
  2025 г."); the report adds rows the Act does not have: the "в т.ч. плащания към аптеки / изпълнители на БМП" and
  "в т.ч. възстановените разходи от ПРУ" sub-rows of the medicine lines (1.1.3.5.3.1.1 … 1.1.3.5.6.2, actual only),
  and the revenue/expenditure rows 3.6, 3.7, 4., 5., 1.1.4.6, 1.1.5, 1.1.5.2, 2., 3., 3.1.
- The expense lines are shown "с включен трансфер към ведомствени болници", i.e. the money passed to the hospitals
  of the defence, interior and transport ministries is included in the lines (hospital care, medicines, devices, …)
  and row 2 is zero. The Budget Act has no separate row for these transfers either, so the lines are comparable with
  the law amounts.
- Labels are the source's own (abbreviated) wording. Two labels printed without spaces in the PDF (3.4, 3.7) were
  re-spaced from the character positions. The label of 1.1.3.5 is cut off in the PDF cell; it ends with " […]" here
  (full wording: row 1.1.3.5 of the Budget Act).
- **The 2025 actuals are preliminary on the revenue side** ("преди отчет от МФ" — before the Ministry of Finance data
  on contributions from budget organisations); the reported deficit of −52 204.7 is expected to shrink when those
  arrive (for 2024 the same step turned a −48.5 m deficit into a +4.9 m surplus).

Validation:

- `law_kBGN` equals the 2025 NHIF Budget Act (`../budget-2025/nhif-2025-tables.csv`, ДВ бр. 25/2025,
  https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=233618) on all 47 rows present in both.
- Parent rows equal the sum of their sub-rows in all three columns (I. = 1.–5., II. = 1.–3., 1. = 1.1–1.3,
  1.1 = 1.1.1–1.1.5, 1.1.3 = 1.1.3.1–1.1.3.8, 1.1.3.5 = 1.1.3.5.1–6, medicine sub-rows = payments − recoveries),
  with one exception in the source: the actual of 1.1.4 is printed as 221 115 459 lv. while its six sub-rows add up to
  221 115 779 lv. (0.32 thousand more). Row 1.1.3.6.1 is an "of which" line and is not expected to add up.
- I. − II. = III. in all three columns.
- Key actuals 2025: total expenditure (II.) 9 442 001.1; health insurance payments (1.1.3) 9 095 997.6; hospital care
  (1.1.3.7) 4 447 499.2 (law 4 155 279.6, plan 4 447 612.0); medicines, devices and dietary foods (1.1.3.5)
  2 285 700.5; GPs (1.1.3.1) 646 271.6; specialists (1.1.3.2) 654 593.1; dental (1.1.3.3) 416 385.0; diagnostics
  (1.1.3.4) 313 060.3; reserve (1.3) 0 (law 277 692.3).

The NHIF's formal annual report, "Годишен отчет за изпълнението на бюджета на НЗОК за 2025 година", was filed with
the National Assembly as вх. № 52-602-00-20 on 06.07.2026, but only as a scanned PDF without a text layer (689 pages,
https://www.parliament.bg/pub/plenary_documents/52-602-00-20_.pdf), so it was not used.

## The ministries' actual areas in the КФП boxes (grafts and links, 14.11.2026)

The programme map (`../../drilldown/programme-map.csv`, rows `report-2025`; rules in `docs/drilldown.md` › "The
programme map") places "Ministries 2025 (actual)" (`state-budget-2025-report-spending-units.csv`, areas only) in
"2025 actual" with the reasons of the 2025 plan. Parts go only into boxes of the state budget's column that are leaves
or remainders; the other state-budget boxes are split into current and capital spending, and grafting parts there
would mean replacing that split, which is left open.

- **Health** (`health.other`, a remainder of €762.4 m): the health ministry's three areas „Диагностика и лечение“
  (€475.8 m), „Обществено здраве и профилактика“ (€88.1 m) and „Лекарства и медицински изделия“ (€24.4 m), **€588.2 m**,
  go under „Здравеопазване“ (its administration belongs to the executive bodies). They are spending (the units'
  „II. РАЗХОДИ“), not transfers to the NHIF, and fit the state-budget column of health (1 672,4 million BGN = €855.1 m,
  `kfp-2025-report-by-function.csv`). The remainder, now „Други разходи за здравеопазване (болници на министерствата,
  европейски средства и др.)“, is €174.2 m: the other ministries' hospitals (inside mixed areas of the defence and
  interior ministries; €119.6 m in the 2025 plan) and EU funds (€133.6 m), less the NHIF report's wider scope than the
  КФП's NHIF column (€4,827.6 m against 8 999,1 million BGN = €4,601.2 m: €226.5 m).
- **No parts, links instead** (`grafts.csv` mode=link): from „Социални помощи и обезщетения“ (state budget, a leaf of
  €986.5 m) to the labour ministry's three benefit areas, which mix benefits with their staff and personal assistance;
  from „Спорт“ (state budget, a leaf of €53.3 m) to the sport ministry, whose elite-sport area alone (€56.8 m) is
  larger than the box; and from ten boxes with a current/capital split to their ministries or areas — police (the
  interior ministry, ДАНС, ДАТО, НСО, the intelligence agency: €2,247.5 m of €2,402.2 m, they fit), defence (the
  defence ministry, €2,334.0 m, larger than the box), transport (the roads area and the transport ministry), executive
  bodies (finance, foreign affairs, the National Assembly, the regional governors; all administration areas and
  independent bodies €1,000.6 m of €1,016.2 m), judiciary, education, agriculture (€446.8 m of €447.1 m), prisons and
  religion (each equal to its box) and energy (the energy ministry's area, €58.5 m, larger than the box). What fits and
  what does not is in each box's ledger entry.

Spot-checks (section 15 of pr.4, thousand BGN at 1.95583): row 2 „Политика в областта на диагностиката и лечението“
930 538,571 = €475,776,816, row 1 172 257,801 = €88,074,015, row 3 47 643,966 = €24,359,973 — equal to the grafted
nodes. `report-2025.json` grew from 248.4 KB (41.2 KB gzipped) to 257.1 KB (43.0 KB gzipped).

## `kfp-YYYY-report-by-function.csv`

Read by `scripts/budgetReport.ts` (via `readKfpReport` in `scripts/lib/kfp.ts`). Checks run when the files were made:
the budget columns of every row add up to its КФП column, groups add up to their function, and the functions add
up to the КФП expenditure of the year (2024: 76 586.6; 2025: 90 882.9 million BGN; both equal the expenditure in the
report's summary table). A few state-budget cells are negative (consolidation adjustments, e.g. 2024 housing capital
spending −1 184.1); the dataset then shows that group by economic line only and says why.
