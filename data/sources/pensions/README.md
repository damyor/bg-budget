# Pensions by fund and kind of pension (actual spending)

Parts files (docs/drilldown.md) that split the reports' „Пенсии“ box (`s-pensions`, КФП function V, group А) into
the funds that pay pensions and each fund into kinds of pension. Written by `scripts/extract/noi_pensions.py` from the
National Social Security Institute's (НОИ / NSSI) statistical yearbook „Пенсии“; run
`python3 scripts/extract/noi_pensions.py --download` (fetches into `data/cache/doo-pensions/`, cached) and then
`python3 scripts/extract/noi_pensions.py`.

| File | Dataset | Source |
| --- | --- | --- |
| `noi-pensions-2025.parts.csv` (+ `.json`) | `report-2025` | НОИ, Статистически годишник „Пенсии“ – 2025 г., Excel: `CHAPT#6-2025.xlsx` tables 6.1–6.3 („Разходи за пенсии“, „… по фондове“, „Разход по видове пенсии за периода 2021–2025 г.“) and `CHAPT#10-2025.xlsx` table 10.17 („Разходи за пенсии от УПФ“) — https://www.noi.bg/wp-content/uploads/Yearbook_Pensions_2025_Excel.zip (PDF: https://www.noi.bg/wp-content/uploads/YEARBOOK_PENSIONS_2025.pdf), listed at https://www.noi.bg/publikacii/statistika/pensii-statistika/. Retrieved 14.11.2026 |
| `noi-pensions-2024.parts.csv` (+ `.json`) | `report-2024` | The same tables of the 2024 yearbook — https://www.noi.bg/wp-content/uploads/Yearbook_Pensions_2024.zip. Retrieved 14.11.2026 |

Units: the yearbook is in leva (to the lev); `value_eur` = leva / 1.95583, to the cent. Basis `mapped`: an NSSI
statistical publication placed into the Ministry of Finance's КФП report box (same year, actual spending).

## What the parts are

Two levels under `s-pensions`, with the ids the budget plans give the funds (`s-pen-labour`, `s-pen-art69`,
`s-pen-noncontrib`, `s-pen-accident`, `s-pen-teachers`), so "Over the years" lines up plan and actual by fund:

| Part | Yearbook rows |
| --- | --- |
| `s-pen-labour` фонд „Пенсии“ | table 6.2 row I (table 6.3 fund I + the transfers of pension rights, which table 6.2 puts in this fund; the plans' row 1.1 of the fund includes them too) |
| `.old-age`, `.disability` | 6.3 fund I rows 2 and 1 (old-age; disability due to general illness) |
| `.one-off` | 6.3 row A (one-off supplements: the Easter and Christmas supplements of the year and amounts for past years, itemised in table 6.1) |
| `.earlier-schemes` | 6.3 fund I rows 3–7 together (ЗПЗСК, СВОК на ТПК, private craftsmen and traders; €11.1 m in 2025) |
| `.transfers` | 6.3 „Трансфери за прехвърляне на пенсионни права“ (capital transfers to the EU, ECB and EIB pension schemes) |
| `s-pen-art69` фонд по чл. 69 | 6.3 fund II; `.old-age`, `.disability` its rows 2 and 1 |
| `s-pen-noncontrib` фонд „Пенсии, несвързани с трудова дейност“ | 6.3 fund III; parts: rows 9, 11, 2, Б, 10, 6 (social disability, social old-age, military disability, art. 9 ЗПГРРЛ supplement, personal, civil disability) and `.other` = rows 1, 3, 4, 5, 7, 8, А, В together (€0.2 m) |
| `s-pen-accident` фонд „Трудова злополука и професионална болест“ | 6.3 fund IV (one kind: disability due to a work accident or occupational disease); not split |
| `s-pen-teachers` Учителски пенсионен фонд | table 10.17 total; `.pensions` row 1 (art. 69в(2), (4) КСО), `.supplements` row 2 (art. 69в(3)); row 3 (supplement for assistance, €6 k) stays in the fund's rounding |

Survivors' pensions are not a kind of their own: the NSSI counts them under the kind they derive from (table 2.4 gives
personal and survivors' pensions for each kind), so the old-age and disability parts include them (said in their notes).

The budget plans split the Teachers' Pension Fund the same way, from annex 4 of each ДОО Budget Act („Пенсии от
УчПФ“ / „Добавки от УчПФ“; `scripts/budgetPlan.ts`). They plan the other funds' pensions as one line each: the
explanatory memoranda (2024–2026) give only the total and the drivers of its change, so those plan boxes are
`no-source` in `data/drilldown/ledger.json`.

## Checks

The extractor stops unless: in table 6.3 each fund's kinds add up to the fund, and the funds and the transfers to the
total; table 6.2's funds equal table 6.3's (fund I with the transfers); table 10.17's rows add up to its total; each
fund's parts add up to the fund.

**Cross-check against an independent total (Ministry of Finance, КФП report, function V group А, column
„Соц. осигуряване“):**

| Year | КФП „Пенсии“ | ДОО pensions (6.2) + Teachers' fund (10.17) | Gap |
| --- | ---: | ---: | ---: |
| 2025 | 24 245,9 m BGN = €12,396,731,822 | 24 126 269 494 + 119 598 664 = 24 245 868 158 BGN = €12,396,715,542 | €16 k (rounding of the КФП's 0.1 m BGN) |
| 2024 | 21 770,5 m BGN = €11,131,079,900 | 21 667 800 502 + 102 686 756 = 21 770 487 258 BGN = €11,131,073,385 | €7 k |

So the box is the ДОО funds plus the Teachers' Pension Fund and nothing else; no remainder is needed (the sidecar's
`rest` would name a gap over €0.2 m). The КФП's capital part of the box (2025: 0,5 m BGN) is the transfers of pension
rights (531 893 BGN).

**Spot-checks against other NSSI documents:**

- Easter and Christmas supplements 2025 (table 6.1: 35 205 678 and 63 423 984 BGN) = the yearbook's preface
  („35 205,7 хил. лв.“, „63 424,0 хил. лв.“); with 4 251 575 BGN for past years they make row A, 102 881 237 BGN
  (€52.6 m).
- Statistical report on the execution of the consolidated ДОО budget 2025
  (https://www.noi.bg/wp-content/uploads/Statisticheski-otchet_2025.xls, sheet 11_12): §41-12 Art. 69 pensions
  1 787 623 103 BGN = fund II 1 787 426 486 + fund IV's Art. 69 persons 196 617; §41-21 state-budget pensions
  437 418 718 BGN = table 6.1's social pensions; group А 24 126 269 494 BGN = table 6.1's total.
- 2024 report (Statisticheski_otchet_2024.xls): group А 21 667 800 502 BGN, §41-21 379 442 609 BGN, §41-12
  1 618 195 506 BGN (= 1 618 029 659 + 165 847) — all equal to the 2024 yearbook. The 2025 yearbook's 2024 column of
  table 6.3 equals the 2024 yearbook's.
- Plans: 2026 annex 4, 16 915,9 + 57 011,4 = 73 927,3 thousand EUR = the fund's „Пенсии“ row; 2025: 27 367,7 +
  97 361,8 = 124 729,5 thousand BGN; 2024: 23 426,7 + 81 758,2 = 105 184,9 thousand BGN.
