# Interest by kind of debt and the EU contribution by own resource

Parts files (docs/drilldown.md) for two boxes of „Държавно управление, дълг и ЕС“: „Лихви по държавния дълг“
(`g-interest`) and „Вноска в бюджета на ЕС“ (`g-eu`). Written by `scripts/extract/interest_eu.py`: the figures are
typed in from the documents below (a few sentences and one small table each), and `python3
scripts/extract/interest_eu.py --verify` finds every one of them, as printed, in the cached copies
(`data/cache/interest-eu/`, `data/cache/zdb-*`, `data/cache/mtbf-2027-2029/`; macOS `textutil` for the Word files).

| File | Datasets › box | Source |
| --- | --- | --- |
| `mof-report-2025.parts.csv` | `report-2025` › `g-interest.state`, `g-eu`; `budget-2025` › `g-eu` | Доклад към отчета за изпълнението на държавния бюджет на Република България за 2025 г., attachment 3 (`26RH737pr.3.docx`) to РМС № 737 of 24.09.2026 — https://www.strategy.bg/download/1327172 (decision: https://www.strategy.bg/bg/pris/legal-information/reseniia/171087): items „Лихвени разходи“ and „Вноска на Република България в общия бюджет на ЕС“ (table „… – общо и по видове собствени ресурси“), and section „Държавен бюджет“ (the State Budget's interest payments by external and domestic debt). Retrieved 14.11.2026 |
| `mof-report-2024.parts.csv` | `report-2024` › `g-interest.state`, `g-eu`; `budget-2024` › `g-eu` | The same report for 2024, attachment 2 (`25RH673pr.2.doc`) to РМС № 673 of 26.09.2025 — https://www.strategy.bg/download/1310602 (decision: https://www.strategy.bg/bg/pris/legal-information/reseniia/167458). Retrieved 14.11.2026 |
| `zdb-2024-interest.parts.csv` | `budget-2024` › `g-interest` | Закон за държавния бюджет на Република България за 2024 г., чл. 1, ал. 2, ред 1.3 „Лихви“ (ДВ бр. 108/2023) — https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=202168 |
| `zdb-2025-interest.parts.csv` | `budget-2025` › `g-interest` | The 2025 Act, the same line (ДВ бр. 26/2025) — https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=233694 |
| `zdb-2026-interest.parts.csv` | `budget-2026` › `g-interest` | The 2026 Act, the same line (ДВ бр. 69/2026) — https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=245041 |
| `zdb-2027-draft-interest.parts.csv` | `budget-2027` › `g-interest` | Проект на Закон за държавния бюджет за 2027 г. (6.11.2026), the same line — https://www.minfin.bg/upload/65607/PZDBRB-2027.pdf (cached by hand, data/cache/zdb-2027-draft/) |
| `mtbf-2027-2029-interest.parts.csv` | `budget-2027` › `g-interest.state` | Актуализирана средносрочна бюджетна прогноза 2027–2029 (motives to the 2027 draft), section „Държавен дълг. Обслужване и финансиране“, p. 152: „… през 2027 г. да достигнат до 1 396,1 млн. евро (1 228,7 млн. евро по външния и 167,4 млн. евро по вътрешния държавен дълг)“ — https://www.minfin.bg/upload/65608/UMTBF-2027-2029-motivi.pdf (cached by hand, data/cache/mtbf-2027-2029/) |

Units: the reports and the 2024–2025 Acts are in leva (million in the reports, thousand in the Acts), converted
at 1.95583; the 2026 Act, the 2027 draft and the 2027–2029 forecast are in euro.

## Interest

The КФП box `g-interest` is consolidated. In the reports it is already split by budget (`g-interest.state`,
`.municipalities` …); the State Budget's part is now split by kind of debt:

| Part | 2025, m BGN | 2024, m BGN | Report's words |
| --- | ---: | ---: | --- |
| `g-interest.state.external` Лихви по външния дълг | 1 178,4 | 830,9 | „лихви по външни заеми“: the central budget's (2025: 1 165,2; 2024: 814,1 incl. 26,7 discounts) and the state investment loans run by ministries (13,3; 16,8) |
| `g-interest.state.domestic` Лихви по вътрешния дълг | 208,1 | 122,5 | „лихви по вътрешни заеми“: mainly government securities (2025: 151,1 interest + 65,8 discounts − 8,8 premiums) |
| `g-interest.state` (КФП, column ДБ) | 1 386,5 | 953,4 | „Лихвените плащания по държавния бюджет за 2025 г. са в общ размер на 1 386,5 млн. лв.“ |

In the plans the box is one amount (the forecast's КФП interest). The State Budget's part is the Act's line 1.3
„Лихви“ (2024: 966 835,0 thousand BGN = €494.3 m; 2025: 1 567 008,8 = €801.2 m; 2026: €1,030.7 m; 2027 draft:
€1,396.1 m), with the same id and name as the reports' state-budget column; the rest, `g-interest.rest` (€22–30 m),
is the interest of the municipalities and the other budgets. Only the 2027 forecast splits the plan year's interest
by kind of debt (above); the 2024–2026 plans are `no-source` for that split in the ledger (the forecasts 2025–2027
and 2026–2028 give it for past years only).

## The EU contribution

| Part | 2025 law | 2025 actual | 2024 law | 2024 actual |
| --- | ---: | ---: | ---: | ---: |
| `g-eu.gni` Вноска на база брутен национален доход | 1 162,8 | 1 162,8 | 1 460,6 | 896,2 |
| `g-eu.vat` Вноска на база данък върху добавената стойност | 328,7 | 328,7 | 295,3 | 252,5 |
| `g-eu.tor` Вноска от традиционни собствени ресурси – мита | 270,5 | 285,9 | 299,7 | 247,2 |
| `g-eu.plastics` Вноска на база нерециклирани отпадъци от опаковки от пластмаса | 154,4 | 154,4 | 114,5 | 108,5 |
| `g-eu.corrections` Участие във финансирането на брутното намаление за Австрия, Дания, Германия, Нидерландия и Швеция и вноска за корекция … свобода, сигурност и правосъдие | 104,1 | 104,1 | 100,9 | 87,6 |
| **Total** (million BGN) | **2 020,5** | **2 036,0** | **2 271,1** | **1 592,1** |

The report's column „ЗДБРБ за 2025 г.“ is the law's amount as the Ministry of Finance allocated it by own resource
after its reallocations in June and November 2025 (2024: in the fourth quarter); the Act itself gives one amount (art.
1(2), item IV). These parts of Budget 2024 and 2025 say so in their notes. The contribution under the Ukraine
macro-financial assistance agreement (2025: 5,9 m BGN) is not in the box. The 2026 and 2027 plans stay one amount:
the Acts and both medium-term forecasts give totals only (ledger: `todo`, lead: the 2026 execution report).

## Checks

- `--verify`: every figure above is found, as printed, in its cached document; the extractor checks external +
  domestic = the State Budget's interest, and that the own resources add up to the table's total (within 0,1 m BGN of
  rounding: 2 035,9 vs 2 036,0; 1 592,0 vs 1 592,1; 2 271,0 vs 2 271,1).
- **Cross-check against an independent total.** The boxes come from the КФП tables of the same reports and from the
  forecasts: `g-interest.state` 2025 = €708.9 m = 1 386,5 m BGN, 2024 = €487.5 m = 953,4 m BGN; `g-eu` 2025 =
  €1,041.0 m = 2 036,0 m BGN, 2024 = €814.0 m = 1 592,1 m BGN; Budget 2025 `g-eu` €1,033.1 m = 2 020,5 m BGN, Budget
  2024 €1,161.2 m = 2 271,1 m BGN — each equal to the table's total. Independently, the medium-term forecast
  2026–2028 (motives in bill 52-602-01-19, https://www.parliament.bg/bills/52/52-602-01-19.docx) gives the State
  Budget's interest in euro: „през 2024 г. възлизат на 487,4 млн. евро (424,8 млн. евро по външния и 62,6 млн. евро по
  вътрешния), а през 2025 г. - на 708,9 млн. евро (602,5 млн. евро по външния и 106,4 млн. евро по вътрешния …)“ — the
  parts here, converted, are €424.8 m + €62.6 m and €602.5 m + €106.4 m. The 2027 forecast's 1 396,1 m EUR equals the
  draft Act's line 1.3 (1 396 089,2 thousand EUR). The forecasts' sections on the EU contribution give the same
  totals (1 041,0 m EUR paid in 2025; 814,1 in 2024).
- **Spot-checks** (document → part): 2025 GNI-based 1 162,8 m BGN → `g-eu.gni` €594.5 m; 2024 customs 247,2 → `g-eu.tor`
  €126.4 m; 2025 external interest 1 178,4 → €602.5 m; 2026 Act line 1.3 1 030 666,2 thousand EUR → `g-interest.state`
  €1,030.7 m.
