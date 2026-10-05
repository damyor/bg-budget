# Health: hospitals and medicines

What the National Health Insurance Fund (NHIF, НЗОК) pays each hospital month by month, the hospitals' own
finances as reported to the Ministry of Health, and the medicines the fund reimburses. Used by `scripts/health.ts`:
the "Hospitals" and "Medicines" lists ("Lists" › "Health") and, in the 2024 and 2025 actuals, the hospitals under
Health › NHIF › Hospital care. All files were retrieved on 5 Oct 2026; the raw downloads are in
`data/cache/health/` (not committed; each folder has a MANIFEST.md with every file's URL).

| File | Content | Source | Made by |
| --- | --- | --- | --- |
| `nhif-hospital-payments.csv` | One row per establishment, kind of payment and month, Jan 2024 – Aug 2026 (16,921 rows): `reg_no`, `series` (`care` = hospital care: clinical pathways, procedures; `devices` = medical devices paid outside the price of the pathway; `medicines` = medicines paid outside the price of the pathway: cancer drugs and the like), `month`, `paid` (in the month), `ytd` (year to date, as printed in that month's report), `currency` (BGN to 2025, EUR from 2026; whole units, as printed) | NHIF, "Заплатени здравноосигурителни плащания … по лечебни заведения към <date>" — three PDFs a month (text layer) at https://www.nhif.bg/bg/hospitals/bmp/2024, …/2025, …/2026 (95 reports) | `scripts/extract/nhif_hospitals.py` |
| `hospitals.csv` | One row per NHIF registration number seen with money (390): latest `name` as published, `other_names`, `rzok`, `province` (as in `../places/municipalities.csv`), `ekatte_municipality`, `ebk_code` and `municipality` (empty where not clear), `first_month`, `last_month` | The same reports; EKATTE 2025 (NSI, https://www.nsi.bg/nrnm/ekatte/archive, `Ekatte-2025-json.zip`, `ek_obst.json`) | the same |
| `moh-hospitals.csv` | Every spelling of a hospital in the Ministry of Health files (231): `ownership`, `moh_name`, its NHIF `reg_no`, `matched_by` (`name`: automatic, then read through; `manual`), or no number and a `note` saying why | Made once and checked by hand (see below) | by hand, from a name-matching script |
| `moh-hospital-finances.csv` | One row per hospital and period (1,270): `period` (2019-12 … 2024-12 = the year, 2025-09 = Jan–Sep 2025), `ownership` (state / municipal), `moh_name`, `reg_no`, `revenue_kBGN`, `costs_kBGN` (from 1 January), `liabilities_kBGN`, `overdue_kBGN` (at the end of the period), `patients` (from 1 January), `doctors`, `nurses` (health-care specialists), `beds` (monthly averages) | Ministry of Health, "Финансови показатели на лечебни заведения за болнична помощ", XLSX for Q4 2019–Q4 2024 and Q3 2025, https://mh.government.bg/bg/politiki/standart-za-finansovo-upravlenie-na-drzhavnite-lechebni-zavedeni/ (thousand leva) | `scripts/extract/moh_hospitals.py` |
| `nhif-medicines.csv` | One row per report, year and ATC code, 2021 – Jul 2026 (3,719 rows): `report` (`home` = Справка 1, medicines, medical devices and dietary foods for home treatment dispensed by pharmacies; `hospital` = Справка 7, cancer and coagulopathy medicines paid to hospitals outside the pathway price), `year`, `atc`, `name` (INN as published), `amount` (the reimbursed sum, "Реимбурсна сума"; BGN to 2025, EUR in 2026), `months` (monthly files added up, or `year` for 2025, taken from the annual file), `patients` (2025 hospital only) | NHIF, https://www.nhif.bg/bg/nzok/medicine/1 and …/7 (XLS; 67 monthly files and one annual file each) | `scripts/extract/nhif_medicines.py` |

To refresh: `python3 scripts/extract/nhif_hospitals.py --download` and then without `--download` (add the year to
`YEARS` in January), `python3 scripts/extract/nhif_medicines.py --download` and again without it,
`python3 scripts/extract/moh_hospitals.py` after adding a new quarter to `FILES` (a new hospital spelling stops the
script until it is added to `moh-hospitals.csv`), then `npm run data`.

## NHIF payments to hospitals

- **Reading the PDFs.** Each row: RZOK number and name, row number, the 10-digit registration number, the name, the
  year to date (bold) and the month. The extractor works on characters: a long name runs on into the amount
  columns and its letters interleave with the digits ("…хемодиализ6а4"О4 О46Д8"), so the year to date is taken from
  the bold digits, the month from the plain digits right of it, and the name from what is left; thousands spaces
  are told apart from the name's spaces by their exact position between two digits.
- **Quirks handled.** February 2026 also prints January in its own column (it equals the January report); a few
  hundred rows print no row number or amounts of 0; the printed count of rows is unreliable (May 2024 counts
  one fewer than it prints and adds), so it is not checked; the RZOK number of one hospital in the devices reports
  is printed as 19 (Силистра) instead of 17 (Разград) — the region is taken from the registration number. There is
  no devices report for January 2024; the February report's year to date equals its month, so nothing was paid in
  January.
- **Checks (all pass).** In every report the hospitals add up to each regional subtotal and to the grand total, in
  both columns, to within the rounding of each row to the unit; the date and currency in the title match the
  file; every registration number starts with its RZOK. Year to date = previous year to date + month for all but a
  few hospital-months: rounding of ±1, and five restatements where the fund moved money already paid from one
  hospital to another (Feb 2024: 3,290 leva between the Haskovo hospitals 2632212018 and 2634212017, and 517 between
  2633211003 and 2634212016; Apr 2024: +4,050 leva at 2210134002; Apr 2025: 3,791,131 leva of medicines from СБАЛО
  Хасково to МБАЛ Хасково). The site takes a year's amount from the year to date of its last report and the months
  as printed, so for those five hospital-years the months do not add up exactly to the year.
- **Totals** (year to date of the last report): hospital care 3,906,305,556 leva in 2024 (383 establishments),
  4,441,979,960 leva in 2025 (388), €1,517,851,312 in Jan–Aug 2026 (382); medical devices 95,773,453 / 114,679,017 leva
  and €58,373,205; medicines 1,354,487,235 / 1,562,275,488 leva and €586,456,995.
- **Against the NHIF budget execution** (`../report-2024/`, `../report-2025/nhif-*-report-tables.csv`):
  - Hospital care (line 1.1.3.7, which the site's actuals show): the hospitals add up to 99.83% of the 2024 line
    (3,906.3 of 3,913.0 million leva) and 99.88% of the 2025 line (4,442.0 of 4,447.5). The reports include the
    defence, interior and transport ministries' hospitals (ВМА, МИ-МВР, НМТБ), as the line does, and most of the
    money for medical staff under art. 55(2)(3в) of the Health Insurance Act (60 and 68 million leva in the line):
    without it the line (1.1.3.7.1) would be smaller than the reports. The rest (6.7 and 5.5 million leva, €3.4 m
    and €2.8 m) is not attributed to a hospital in the monthly reports and is a separate "Not attributed to a
    hospital" slice in the tree.
  - Medicines outside the pathway price: 99.9% of the payments to hospitals for cancer medicines and basic
    chemotherapy (lines 1.1.3.5.4.1 + 1.1.3.5.6.1: 1,353.6 million leva in 2024, 1,560.1 in 2025), before the
    refunds of the price-reduction scheme (ПРУ) that the budget deducts.
  - Medical devices: the reports cover only about half of line 1.1.3.6 (95.8 of 180.4 million leva in 2024, 114.7 of
    219.9 in 2025); the rest is not paid through these reports (not explained in them). That is why only hospital
    care is split into hospitals in the tree.
- **Spot checks** against the PDF text (pdfplumber's own text, not the extractor): УМБАЛ Свети Георги, Пловдив
  (1622211001), hospital care Dec 2024: 180,173,306 / 15,536,855 leva; УМБАЛСМ Н. И. Пирогов (2201211003) Dec 2025:
  158,093,753 / 12,686,560 leva; МБАЛ ПУЛС, Благоевград (0103211015), medicines Aug 2026: €2,643,611 / €480,064;
  МИ-МВР филиал Варна (0306253028, name interleaved with the amounts) Aug 2026: €376,102 / €48,462; МБАЛ Св. Иван
  Рилски, Разград (1726211001), devices Aug 2026: €15,472 / €1,389 — all equal the CSV.

## Identifying hospitals

The NHIF registration number ("Рег. № ЛЗ") is the key in every year and series: two digits for the region (RZOK,
the old alphabetical numbering of the provinces: 01 Благоевград … 22 София-град, 23 Софийска … 28 Ямбол), two for the
municipality (its EKATTE code within the province: 0111 = BLG11 Гоце Делчев), three for the kind of establishment
(211 general hospital, 212 specialised, 131/133/134 medical and diagnostic centres, 232/233 rehabilitation,
391 dialysis, 911 hospitals of the defence, interior and transport ministries …) and a serial number. Names are
stable (3 of 390 numbers have a second spelling, e.g. 2201211005 УМБАЛ „Света Екатерина“, earlier „Проф. Д-р
Александър Чирков“). The municipality comes from the EKATTE code, matched by name to the register (EKATTE calls
Добричка "Добрич-селска"); in Sofia city the two digits are the district, all in Столична община. Check: of the 204
placed establishments whose name contains the name of a municipality, 203 are placed in that municipality (the
other is СБР „Света Елена 1“ in Варна, a saint's name). Not placed (6): code 90 (0290232001 СБР Вита,
1390391001 Фърст диализис сървисис, 2290211001 МБАЛ Свети Георги-Перник, contracted by RZOK София-град), 1626131002
МЦ Литомед ООД Пловдив (the code says „Родопи“, the name Пловдив) and the two Sofia Province hospitals numbered 2301,
which are in Sofia. 0290211001 МБАЛ Сърце и мозък Бургас (code 90) is placed in Бургас by its name.

## Ministry of Health: hospital finances

- **Files.** Q4 2019–2024 (whole years) and Q3 2025, the latest the ministry has published (5 Oct 2026); each has a
  sheet of state hospitals (over 50% state-owned), one of municipal hospitals and a copy of NHIF payments (not
  used). Money in thousand leva, cumulative from 1 January (revenue, costs, patients) or at the end of the quarter
  (liabilities); staff and beds are monthly averages.
- **Quirks.** The headings of the liability columns are shifted in 2021–2025 (the two columns headed "Общо
  задължения / Q4, Q3" hold overdue liabilities); the columns used are the ones headed "Текущо тримесечие" under
  "Общо задължения" and "Просрочени задължения", which agree with the year-on-year changes printed next to them. The
  2019 and 2020 municipal sheets have a province column; the 2021 file has no total rows.
- **Checks.** Every sheet's hospitals add up to its "ОБЩО" row in revenue, costs, liabilities and overdue liabilities
  (to 1 thousand leva), except 2021, which has no total row.
- **Matching.** The ministry gives only names, so each of the 231 spellings was matched to an NHIF registration
  number: 164 by an automatic comparison of names (type of hospital, saint or person, town; within the province
  where the file gives it) that was then read through, 46 by hand (renamed hospitals such as "Университетска Първа
  МБАЛ София „Св. Йоан Кръстител“" = Първа МБАЛ София 2201211032, or "УСБАЛО „Проф. Иван Черноземски“" = УСБАЛ по
  онкология 2201214020; spellings such as "Д-р Никола Василев"/"Василиев"). 21 spellings have no number: the
  centres for mental health (ЦПЗ, funded by the ministry; ЦПЗ Темков is listed by the NHIF only with zero payments),
  СБАЛПЗ Стара Загора, СБАЛПФЗ Варна, the lung hospital in Трявна, МБАЛ Раднево (2019–2020) and СБАЛББ „Св. София“
  (2019–2021), none of which got NHIF hospital-care payments in 2024–2026, and СБР-НК ЕАД, which the NHIF pays branch
  by branch. **Match rate:** 165 of 180 hospitals in Q3 2025 (92%), 166 of 181 at the end of 2024 (91–92% in every
  period); every other hospital in the list (223, mostly private) has no ministry data.

## NHIF medicines

- **Reports.** Справка 1 (home treatment) lists product × ICD-10 diagnosis with ATC code, ATC name, NHIF code and
  "Реимбурсна сума"; Справка 7 (hospital, outside the pathway price) lists ATC code, INN, patients and "Реимбурсна
  сума". The extract adds up each file by ATC code. Codes W, X, Y and Z are the fund's own, for medical devices and
  dietary foods (test strips and sensors, foods for special medical purposes, ostomy products, dressings).
- **Years.** 2021–2024 and Jan–Jul 2026 add up the monthly files (each covers one month: checked against the
  period in its title); 2025 is the annual file, which has later corrections and the 2025 ATC codes: its totals
  differ from the twelve monthly files by −0.009% (home) and −0.28% (hospital).
- **Quirks handled.** Codes typed with a space or a Cyrillic letter ("B03AC 06", "A10BК01"); a Cyrillic letter in a
  Latin name ("РEMBROLIZUMAB"); column heads in row 2 or 3 and named "ATC"/"Реимбурсна стойност" in 2021; the code
  and name headings swapped (hospital, Aug 2022); no name column (hospital, Dec 2021); a "Grand Total" row (checked
  and dropped); the amount headed "Реимбурсна сума с отстъпка" (home, Jul 2022); two files for one month (Oct 2025
  hospital: the corrected "cor" file is used; Jul 2025 home: .xls and .xlsx, the later upload is used).
- **Currency.** Leva to Dec 2025, euro from Jan 2026: the monthly total halves in January 2026 and nowhere else
  (checked).
- **Against the NHIF budget execution, 2025** (thousand leva): Справка 7 1,602,524 against the payments to hospitals
  for cancer and basic-chemotherapy medicines and to pharmacies and hospitals for coagulopathies (1.1.3.5.4.1 +
  1.1.3.5.6.1 + 1.1.3.5.5.1 = 1,616,132; 99.2%); Справка 1 medicines 1,569,415 against the payments to pharmacies
  (1.1.3.5.3.1.1 + 1.1.3.5.3.2.1 = 1,630,833; 96.2%), devices (W, Y, Z) 52,550 against 49,641 (1.1.3.5.2) and foods
  (X) 4,474 against 4,425 (1.1.3.5.3.3). The reports count what was dispensed in the month, the budget what was paid
  in the year; both are before the price-reduction refunds (ПРУ, −1.09 billion leva in 2025), which the budget lines
  deduct — so the list's amounts are gross, and medicines are not split into the tree.
- **Spot checks** (annual Справка 7 / 1, 2025): PEMBROLIZUMAB (L01FF02) 371,243,305.48 leva, 4,356 patients;
  NIVOLUMAB (L01FF01) 97,375,784.97 leva, 1,785 patients; upadacitinib (L04AF03) 54,467,388.02 leva — equal to the
  CSV. On the site one row is one active ingredient: codes that WHO revised (rituximab L01XC02 → L01FA01, upadacitinib
  L04AA44 → L04AF03) and names that appear on the same code are one row (691 rows: 468 home medicines, 36 device and
  food groups, 187 hospital medicines).

## Reuse of NHIF content

The NHIF's terms of use (https://www.nhif.bg/bg/terms-of-use, "Авторско право") say its site content is subject to
its copyright "с всички запазени права". The Ministry of Health's site carries "© Министерство на
здравеопазването" and its own terms of use. What the site does: it publishes only figures taken from the reports
(amounts per hospital, month and medicine, with names and codes as published), always with the source and a link to
it, and it does not republish the PDF or XLS files (they stay in the uncommitted cache). The reasoning: the
Copyright Act (ЗАПСП, art. 4) excludes news, facts, information and data from copyright, and these are official
reports of public bodies that the law requires them to publish; the Access to Public Information Act (ЗДОИ) also
provides for re-use of public-sector information. This is a judgement, not legal advice: **the PM should raise it with
the user**, who may want to ask the NHIF for written permission or a statement of its reuse terms.
