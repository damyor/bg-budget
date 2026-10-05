# 2024 budget execution (report) sources

Actual (reported) figures for 2024, in **thousand BGN** (`kBGN`, "хил. лв."); 1 EUR = 1.95583 BGN. The 2024
execution reports were filed with the 51st National Assembly in 2025 but never adopted (no decision in the State
Gazette), and the copies on parliament.bg are scanned images, so the file below comes from the NHIF's own text-based
report.

| File | Content | Source |
| --- | --- | --- |
| `kfp-2024-report-by-function.csv` | Consolidated fiscal programme (КФП) **actual** expenditure 2024 by function and group (sub-function), each split by budget (state budget ДБ, social security, НЗОК, municipalities, EU funds, universities, BAS, public media, ФСЕС, other) and by economic line (current non-interest, capital, transfers abroad, disaster recovery, interest). Long format: `function,subfunction,row_kind,row,column,value_mBGN` (million BGN, as printed; 523 rows) | Доклад към отчета за изпълнението на държавния бюджет за 2024 г., section 2.4 "Изпълнение на разходите по функции по КФП", tables "ОТЧЕТ 2024 г." — attachment 2 (`25RH673pr.2.doc`) to РМС № 673 of 26.09.2025, https://www.strategy.bg/bg/pris/legal-information/reseniia/167458, file https://www.strategy.bg/download/1310602 |
| `nhif-2024-report-tables.csv` | National Health Insurance Fund: 2024 Budget Act amount, annual plan as amended and actual for 2024 for every revenue and expenditure row (68 rows; table 1 revenue, table 2 expenditure, table 3 balance), laid out in the row structure of the **2025** Budget Act | NHIF, "Отчет за текущо изпълнение към 31.12.2025 г. на бюджета на НЗОК", Приложение 1 "Текущ отчет на бюджета на НЗОК към 31.12.2025 г. и сравнение с изпълнението към 31.12.2024 г. (в лева)", 2024 columns (text PDF inside the zip) — https://www.nhif.bg/bg/completion-reports, file `https://www.nhif.bg/upload/30329/Отчет за текущо изпълнение към 31.12.2025 г. на бюджета на НЗОК.zip` |

## `nhif-2024-report-tables.csv`

- Columns: `table_idx,caption,row_no,label,law_kBGN,adjusted_kBGN,actual_kBGN`. `law_kBGN` = "ЗБНЗОК 2024 г.
  (ДВ бр. 106 от 22.12.2023 г.)", `adjusted_kBGN` = "Годишен план за 2024 г." (ДЗ 21-01-200/16.01.2025 г. по т. 9.3
  от РД-НС-04-139/17.12.2024 г.), `actual_kBGN` = "Отчет към 31.12.2024 г. след отчет от МФ" (final: after the
  Ministry of Finance data on contributions). The source is in leva; values were divided by 1000 (3 decimals, exact).
  Empty = blank cell in the source.
- `table_idx` 1 = revenue (rows I.–5.), 2 = expenditure (II.–3.1.), 3 = balance (III.), like the tables of the
  Budget Act files. The same source table gives the 2025 figures, so this file and
  `../report-2025/nhif-2025-report-tables.csv` have identical rows, labels and row numbers (those of the 2025 Act).
- Because the NHIF re-mapped 2024 onto the 2025 structure, some rows differ from the 2024 Act
  (`../budget-2024/nhif-2024-tables.csv`):
  - 2024 Act 1.1.3.7.1 / 1.1.3.7.2 (medical staff, art. 55 (2) 3в "а" / "б") are 1.1.3.7.2 / 1.1.3.7.3 here;
    1.1.3.7.1 here is "в т.ч. за дейностите в болнична медицинска помощ".
  - 2024 Act 1.1.3.3.1 (total dentures, 3 000.0) has no row of its own; it is inside 1.1.3.3.
  - 2024 Act 1.1.3.5.2 covered medical devices *and* dietary foods: its law amount (43 888.9) stands in 1.1.3.5.2
    (devices), while the dietary-food plan and actual are in 1.1.3.5.3.3. Rows 1.1.3.5.5 (coagulopathy medicines)
    and 1.1.3.5.6 (antineoplastic medicines, art. 6 (1)) were not separate in 2024 and have plan/actual only.
  - The report-only sub-rows "в т.ч. плащания към аптеки / изпълнители на БМП" and "в т.ч. възстановените разходи от
    ПРУ" (1.1.3.5.3.1.1 … 1.1.3.5.6.2) carry the actual only.
- The expense lines include the transfers to the hospitals of the defence, interior and transport ministries
  ("с включен трансфер към ведомствени болници"), as the Budget Act does.
- Labels are the source's own (abbreviated) wording, the same as in the 2025 file (two labels re-spaced from the
  character positions; the cut-off label of 1.1.3.5 ends with " […]").

Validation:

- `law_kBGN` equals the 2024 NHIF Budget Act (`../budget-2024/nhif-2024-tables.csv`, ДВ бр. 106/2023,
  https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=202042) on 41 rows; the only mismatch is the renumbered
  1.1.3.7.1 described above.
- Parent rows equal the sum of their sub-rows in all three columns, without exception (I. = 1.–5., II. = 1.–3.,
  1.1 = 1.1.1–1.1.5, 1.1.3 = 1.1.3.1–1.1.3.8, 1.1.3.5 = 1.1.3.5.1–6, 1.1.4 = 1.1.4.1–6, medicine sub-rows =
  payments − recoveries), and I. − II. = III.
- The totals equal those of the NHIF's formal "Годишен отчет за изпълнението на бюджета на НЗОК за 2024 година"
  (filed with the National Assembly as вх. № 51-502-00-61 on 18.07.2025; scanned PDF without a text layer, 202 pages,
  https://www.parliament.bg/pub/plenary_documents/51-502-00-61_.pdf; figures below read from its page images,
  pp. 6–8): revenue 8 345 170.6, expenditure 8 340 238.4, surplus 4 932.2. That report, however, shows the transfers
  to the ministries' hospitals as a separate row "2. Предоставени трансфери на бюджетни организации, сключили договори
  за извършване на медицински услуги с НЗОК" (191 160.2) and leaves them out of the lines: hospital care 3 760 538.4
  instead of 3 912 994.8 here, health insurance payments (1.1.3) 7 829 789.1 instead of 8 020 567.2, MoH-funded
  payments (1.1.4) 206 461.4 instead of 206 843.5.
- Key actuals 2024 (this file): total expenditure (II.) 8 340 238.4; hospital care (1.1.3.7) 3 912 994.8 (law
  3 572 644.4); medicines, devices and dietary foods (1.1.3.5) 2 083 116.5; GPs (1.1.3.1) 560 264.0; specialists
  (1.1.3.2) 574 692.5; dental (1.1.3.3) 372 044.1; diagnostics (1.1.3.4) 260 683.1.

Not used: the NHIF's year-end table in the 2024 structure ("приложение 1 таблица 1 към отчет изпълнение ЗБНЗОК за
2024", https://www.nhif.bg/upload/26473/приложение%201%20таблица%201.pdf, on the Supervisory Board page for 2025),
because it predates the Ministry of Finance data (it still shows a −48.5 million deficit).

## `kfp-YYYY-report-by-function.csv`

Read by `scripts/budgetReport.ts` (via `readKfpReport` in `scripts/lib/kfp.ts`). Checks run when the files were made:
the budget columns of every row add up to its КФП column, groups add up to their function, and the functions add
up to the КФП expenditure of the year (2024: 76 586.6; 2025: 90 882.9 million BGN; both equal the expenditure in the
report's summary table). A few state-budget cells are negative (consolidation adjustments, e.g. 2024 housing capital
spending −1 184.1); the dataset then shows that group by economic line only and says why.
