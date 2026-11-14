# Social-security cash benefits by kind (actual spending)

Parts files (docs/drilldown.md) that split the reports' „Социалноосигурителни фондове“ box under „Социални помощи и
обезщетения“ (`s-benefits.social-security`, КФП function V, group Б, column „Соц. осигуряване“) into kinds of
benefit. Written by `scripts/extract/noi_benefits.py` from the National Social Security Institute's (НОИ / NSSI)
statistical report on the execution of the consolidated ДОО budget; run `python3 scripts/extract/noi_benefits.py
--download` (fetches into `data/cache/doo-pensions/`, cached) and then `python3 scripts/extract/noi_benefits.py`.

| File | Dataset | Source |
| --- | --- | --- |
| `noi-benefits-2025.parts.csv` (+ `.json`) | `report-2025` | НОИ, „Статистически отчет за изпълнението на консолидирания бюджет на ДОО за 2025 година“, раздел II „Разходи“, група Б „Социални помощи и обезщетения“, дейност 519, § 42-01 (sheets `11_12` – `15_16`, column „Отчет за 2025 г.“) — https://www.noi.bg/wp-content/uploads/Statisticheski-otchet_2025.xls, listed at https://www.noi.bg/publikacii/statistika/budjet/. Retrieved 14.11.2026 |
| `noi-benefits-2024.parts.csv` (+ `.json`) | `report-2024` | The same report for 2024 — https://www.noi.bg/wp-content/uploads/Statisticheski_otchet_2024.xls. Retrieved 14.11.2026 |

Units: the report is in leva (to the lev); `value_eur` = leva / 1.95583, to the cent. Basis `mapped`: an NSSI
statistical report placed into the Ministry of Finance's КФП report box (same year, actual spending).

## What the parts are

The ids and names are the plans' (`scripts/budgetPlan.ts`, from the ДОО bills' memoranda), so "Over the years"
lines up plan and actual by kind of benefit. The memoranda's lines are the same ЕБК paragraphs: the 2025 plan of
each part equals the report's „Уточнен план“ of its paragraphs (e.g. 1 286,9 m BGN sick pay = § 42-01-01 + 02 + 03).

| Part | § 42-01 items | 2025, m BGN | 2024, m BGN |
| --- | --- | ---: | ---: |
| `s-ben-sickness` Болнични | 01 general illness, 02 caring for a sick family member and quarantine, 03 non-work accidents | 1 302,6 | 1 152,6 |
| `s-ben-maternity` Майчинство | 06 pregnancy and childbirth (07, reassignment during pregnancy, is empty both years) | 728,9 | 669,4 |
| `s-ben-unemployment` Обезщетения за безработица | 70 = 71 unemployment benefits under the КСО + 74 Art. 230–231 ЗОВСРБ + 75 lump sums, Art. 47 ЗНЗ | 574,3 | 572,1 |
| `s-ben-childcare` Отглеждане на дете до 2 години | 08 | 301,0 | 313,9 |
| `s-ben-rehab` Профилактика и рехабилитация | 88 (= 10, 30, 84, 66, 80 by paying fund) | 28,1 | 24,2 |
| `s-ben-accident` Трудова злополука и професионална болест | 40 (= 41–49) | 14,3 | 13,6 |
| `s-ben-adoption` Осиновяване и отпуск на бащата | 09 adoption of a child under 5, 17 the father raising a child under 8 | 6,5 | 6,9 |
| `s-ben-noi-other` Други обезщетения и помощи | 90 death grants (= 91–94), 50 reassignment during reduced capacity, 98 disability aid without a pension | 2,4 | 2,4 |
| **ДОО, group Б** | § 42-00-00 | **2 958,0** | **2 755,2** |

In the plans `s-ben-noi-other` is the remainder of the memorandum's lines; here it is itemised.

## Checks

The extractor stops unless every § 42-01 row of group Б is a known paragraph or a sub-row of one, the subtotals
(§ 42-01-40, -70, -88, -90) equal their sub-rows, and the top-level paragraphs add up to § 42-00-00 (to the lev,
both years).

**Cross-check against an independent total.** The Ministry of Finance's report on the State Budget execution
(2025: attachment 3 to РМС № 737/2026, https://www.strategy.bg/download/1327172; 2024: attachment 2 to РМС
№ 673/2025, https://www.strategy.bg/download/1310602), function V, group Б, says: „Отчетените разходи за социални
помощи и обезщетения по бюджета на ДОО са в размер на 2 958,0 млн. лв.“ (2024: 2 755,2) — equal to the NSSI's
group Б (2 958 047 216 and 2 755 176 033 leva).

The КФП box is larger: its social-security column is 3 181,0 m BGN in 2025 (€1,626.4 m) and 2 963,5 m BGN in 2024
(€1,515.2 m). The same report thus puts 223,0 m BGN (2025; €114.0 m, 7.0% of the box) and 208,3 m BGN (2024; €106.5 m)
of the column outside the ДОО budget, without saying where. That difference is the explicit remainder
`s-benefits.social-security.rest` („Разлика спрямо отчета на КФП“); the pensions box has no such gap (data/sources/
pensions/README.md), and group В of the same column matches the ДОО (198,9 vs 198,7 m BGN). Candidates are in the
ledger (`data/drilldown/ledger.json`); none is confirmed.

**Spot-checks against the MoF report's text (function V, group Б, 2025 and 2024):**

- „Изплатените обезщетения за временна неработоспособност поради общо заболяване, гледане на болен член от
  семейството и карантина, и нетрудови злополуки са в размер на 1 302,6 млн. лв.“ = `s-ben-sickness` (1 087 620 929
  + 55 864 423 + 159 085 715 = 1 302 571 067 leva); 2024: 1 152,6 = 960 157 114 + 52 333 803 + 140 097 853.
- „Изплатените обезщетения за бременност и раждане през 2025 г. са в размер на 728,9 млн. лв.“ = § 42-01-06
  (728 892 430 leva).
- „Изплатените за годината обезщетения при безработица са в размер на 574,3 млн. лева“ = § 42-01-70 (574 256 439);
  2024: 572,1 = 572 147 416.
- „Изплатените обезщетения за отглеждане на малко дете са в размер на 307,5 млн. лв.“ = § 42-01-08 + 09 + 17
  (301 007 374 + 4 404 806 + 2 125 260 = 307 537 440; the report counts adoption and the father's leave with it);
  2024: 320,8 = 313 869 365 + 3 869 099 + 3 046 135.
- Plans: the 2025 memorandum's 707,7 (maternity), 366,0 (childcare), 644,5 (unemployment), 34,7 (rehabilitation),
  16,4 (accidents) m BGN equal the report's „Уточнен план“ of § 42-01-06, 08, 70, 88 and 40.
