# 2027 draft budget sources

CSV extracts of the **draft** State Budget Act 2027 — a bill, not a law — and of the updated medium-term budget
forecast 2027–2029 published with it. Amounts are in thousand euro (`kEUR`, or `amount_thousand_EUR`) or, in the
forecast's КФП tables, million euro (`mEUR`), as printed. `scripts/ministries.ts`, `scripts/municipalities.ts` and
`scripts/budgetPlan.ts` (called from `scripts/build-data.ts`) turn them into "Ministries 2027 (draft)",
"Municipalities 2027 (draft)" and "Budget 2027 (draft)" (by purpose).

**Source.** „Проект на Закон за държавния бюджет на Република България за 2027 г.", published by the Ministry of
Finance with the draft Council of Ministers decision approving the bill, for public consultation from 6 to 10
November 2026: https://www.minfin.bg/bg/legislation7/632, the bill https://www.minfin.bg/upload/65607/PZDBRB-2027.pdf
(159 pages, text layer; SHA-256 7d8dae76…c5c119). minfin.bg blocks scripts, so the PDF was downloaded by hand on
14.11.2026 (`data/cache/zdb-2027-draft/MANIFEST.md`). On 14.11.2026 the bill was not yet in Parliament; once it is
(and once it is adopted and published in the State Gazette), these files should be re-extracted from that text.

**Two versions of art. 1 and art. 2.** The PDF prints the judiciary's budget twice: first art. 1 "with the draft of the
Supreme Judicial Council included" and art. 2 as the Council proposed it, then "the Council of Ministers' opinion on
art. 1" and "on art. 2". Everything here uses the **Council of Ministers' version** (the government's proposal). The
judiciary's own figures, for the record (thousand EUR):

| | Supreme Judicial Council's version | Council of Ministers' version (used) |
| --- | --- | --- |
| Art. 1(1) I. revenue, grants and donations | 30 942 719,3 | 30 949 719,3 |
| Art. 1(2) II. expenditure | 18 345 717,4 | 18 229 796,1 |
| Art. 1(3) budget balance | −5 533 197,2 | −5 410 275,9 |
| Art. 2(1) judiciary revenue | 66 468,0 | 73 468,0 |
| Art. 2(1) II. judiciary expenditure | 868 105,3 | 752 184,0 |
| — Judicial administration | 76 003,4 | 50 636,9 |
| — Administration of justice (courts) | 460 254,8 | 422 388,2 |
| — Upholding the law (prosecution) | 296 791,5 | 267 333,0 |
| — E-justice | 31 306,8 | 8 212,3 |
| — Judicial staff development | 3 748,8 | 3 613,6 |

The two versions of art. 1(2) differ by exactly the difference in the judiciary's expenditure (115 921,3); the
balances differ by that plus the 7 000,0 of court fees. The Council of Ministers' art. 2(2) lists functional areas
only; the Supreme Judicial Council's version also lists budget programmes within them. The judiciary's node on the site carries
a note with the Council's €868.1 m.

| File | Content | Source |
| --- | --- | --- |
| `state-budget-2027-spending-units.csv` | Expenditure of the 47 first-level spending units by policy / functional area (para. 2 of each unit's article), 161 rows | Draft, art. 2–48, ал. 2 |
| `municipal-transfers-2027.csv` | The central budget's transfers to each of the 265 municipalities by type, with the bill's "ВСИЧКО:" rows | Draft, art. 52 |
| `municipal-delegated-2027.csv` | The general subsidy for state-delegated activities of each municipality, by function | Draft, art. 53 |
| `state-budget-2027-university-transfers.csv` | The Ministry of Education's transfers to the Academy of Sciences and the 33 state universities (art. 16(4)) and the Ministry of Defence's to the 4 military schools (art. 11(4)) | Draft, art. 16, ал. 4 and art. 11, ал. 4 |
| `kfp-2027-by-function.csv` | КФП expenditure by function and sub-function, with the reserve distributed, without the EU contribution: 2026 expected, 2027 draft, 2028–2029 forecast, million EUR and % of GDP | Forecast, Table III-1 (p. 73) |
| `kfp-main-indicators.csv`, `kfp-national-budget.csv` | КФП main indicators (revenue, expenditure, interest, EU contribution, balance) and the national budget's, 2025 report – 2029 forecast, million EUR and % of GDP | Forecast, Tables II-1 and II-2 (pp. 35–36) |
| `expenditure-ceilings-2027-2029.csv` | Expenditure ceilings of the 49 budget organisations (45 state-budget units, the National Social Security Institute with its pensions, two smaller funds and the NHIF), 2027–2029, thousand EUR | Forecast, Annex 4 (pp. 195–196) |
| `transfers-universities-media.csv` | Transfers to public media, the Academy of Sciences, the state universities and the military schools, 2027–2029, thousand EUR (the layout of the 2026 file) | Forecast, Annex 6 (p. 197) |

Column formats are those of the 2026 files (see `../budget-2026/README.md`). Article numbers differ from 2026: the
units are art. 2–48 (2026: 2–47; the Anti-Corruption Commission, a unit in 2024–2025 but not in 2026, is art. 32
again), the municipal transfers art. 52 (2026: 51) and the delegated activities art. 53 (2026: 52); the university
paragraphs keep their 2026 numbers.

## Spending units (art. 2–48)

`state-budget-2027-spending-units.csv` — `article`, `spending_unit` (genitive, as in "Приема бюджета на …"),
`breakdown_type` (`functional_area` or `policy_or_program`, from the paragraph's wording), `row_no`,
`policy_area_or_program` (as printed), `amount_thousand_EUR`. Rows without a number are "в т.ч." lines and the
"Всичко:" total. The 2026 file's stray column-number rows ("1, 2") are not repeated.

The 47 units' expenditure totals 14 394 993,0 thousand EUR (2026 act: 46 units, 13 326 470,3). There are no budget
programmes for 2027: the government sets them after the act is adopted, in its decree on implementing the budget
(2026: ПМС № 102/2026), so "Ministries 2027 (draft)" stops at policy / functional area — except where the bill
itself lists programmes under an area (the Council of Ministers' "other programmes", the State Reserve agency).

Checks (the extractor stops on any failure; `scripts/ministries.ts` checks the totals again):

- Every unit's top-level areas add up to its "Всичко:" row, which equals the unit's expenditure in para. 1 (row
  II. РАЗХОДИ); every split area ("7.1.", "7.2.") equals the sum of its parts.
- Art. 1(2) row 5.2 (reserve of the judiciary, 460,0) and row 5.3 (of the National Assembly, 255,6) equal the
  units' own reserves.
- All units together (14 394 993,0) are below art. 1(2) II. РАЗХОДИ (18 229 796,1); the rest, 3 834 803,1, is the
  central budget's own expenditure — interest (1 396 089,2), the disaster reserve (66 467,9) and the rest, which
  the act does not itemise (2026: 4 274 103,8 = 17 600 574,1 − 13 326 470,3).
- The judiciary's two versions differ in art. 1(2) by exactly as much as in art. 2 (above).
- The site keeps the 2026 ids: all 46 units of 2026 are there with their ids, and all 85 area nodes of the 2027
  tree exist in "Ministries 2026". The only new unit, the Anti-Corruption Commission, has its 2024–2025 id (its single
  area is not a node of its own).

Corrections: three area names close „…" with ” or " instead of “ (personal data protection, electronic media,
anti-corruption); they are normalised to „…“ so they match the 2026 names. Latin look-alike letters inside Cyrillic
words are replaced.

## Transfers to municipalities (art. 52) and delegated activities (art. 53)

`municipal-transfers-2027.csv` — as for 2026: `province`, `municipality`, `ebk_code`, `transfer`, `column`,
`amount_kEUR`, and the bill's "ВСИЧКО:" rows at the end. The bill's table has columns 2–6 only (main transfers =
3 + 4 + 5 + 6): unlike 2024–2026 there is **no column 7**, "transfers for other targeted spending on local activities"
(so far, for the minimum wage), so the file has four types. Zeros are printed as 0,0 in the bill and kept.

| Type | Column | 2027 draft, thousand EUR | 2026 act |
| --- | --- | --- | --- |
| Обща субсидия за делегираните от държавата дейности | 3 | 4 626 381,3 | 4 351 706,0 |
| Обща изравнителна субсидия | 4 | 255 658,0 | 255 658,0 |
| Трансфер за зимно поддържане и снегопочистване на общинските пътища | 5 | 25 100,0 | 25 100,0 |
| Целева субсидия за капиталови разходи | 6 | 255 000,0 | 255 000,0 |
| Трансфери за други целеви разходи за местни дейности | 7 | — | 40 500,0 |
| **All transfers to municipalities** = art. 1(2), row III.1.1 „Общините“ | | **5 162 139,3** | **4 927 964,0** |

`municipal-delegated-2027.csv` — the 2026 columns: `oblast` (the province heading; Sofia, which the bill prints after
Smolyan without a heading, under „ОБЛАСТ СОФИЯ-ГРАД“), `municipality`, `total_delegated(1=2+3+4+5+6+7+8)`,
`municipal_administration(2)`, `of_which_mayors(2a)`, `of_which_admin_staff(2b)`, `defence_security(3)`,
`education(4)`, `health(5)`, `social_services(6)`, `culture(7)`, `economic_activities(8)`; the "ВСИЧКО:" row last
(4 626 381,3; education 3 103 944,8; municipal administration 441 447,9).

Checks (`scripts/extract/municipal_transfers.py` stops on any failure; `scripts/municipalities.ts` checks the totals
again):

- 265 municipalities, the same as in the 2024–2026 acts in the same order. The bill spells four names differently
  (Бобов дол, and „Марица”, „Родопи”, „Тунджа” with a closing ”); the files use the acts' spelling, so the ЕБК codes
  and ids stay the same.
- On every row column 2 = 3 + 4 + 5 + 6; every column adds up to the "ВСИЧКО:" row and to the amount in the text of
  art. 52 (table above); the grand total (column 2) equals art. 1(2) row III.1.1 „Общините“ of the Council of
  Ministers' version, 5 162 139,3 (the same in the judiciary's version).
- Art. 53: every row adds up (1 = 2 + 3 + … + 8, 2 = 2a + 2b), every column to its "ВСИЧКО:" cell, and each
  municipality's total equals its delegated-activities subsidy in art. 52.
- Spot-checks against the PDF text: Банско 12 389,1 = 11 792,4 + 0,0 + 71,3 + 525,4; Столична община 762 578,8,
  of which delegated 747 696,1 (education 573 331,5); Пловдив 239 276,9 (delegated 230 367,6, equalising 5 479,3);
  Бобов дол delegated 4 491,2.

Amounts per resident on the site use the population on 31 December 2025 (NSI), the latest available.

## Universities (art. 16(4) and 11(4))

`state-budget-2027-university-transfers.csv` — the 2026 columns. The 38 institutions are the same as in 2026, with the
same names, so they keep the 2026 `id`, `short_bg` and `name_en`. Both lists add up to their printed "Всичко:"
totals: Ministry of Education 843 054,1 (Academy of Sciences 140 323,5; 33 universities 702 730,6; 2026: 792 877,6)
and Ministry of Defence 46 953,5 (2026: 45 836,8). Spot-checks: Софийски университет 115 855,7; Технически
университет – София 83 714,1; Национален военен университет 20 318,4. As in 2026, these transfers are not part of the
ministries' expenditure; on the site they are a note on each ministry.

## How the files were made

```sh
# the PDF, downloaded by hand: data/cache/zdb-2027-draft/PZDBRB-2027.pdf
python3 -P scripts/extract/spending_units.py data/cache/zdb-2027-draft/PZDBRB-2027.pdf 2027 \
    data/sources/budget-2027/state-budget-2027-spending-units.csv
python3 -P scripts/extract/municipal_transfers.py   # all years; 2027 from the PDF
python3 -P scripts/extract/university_transfers.py data/cache/zdb-2027-draft/PZDBRB-2027.pdf \
    data/sources/budget-2027/state-budget-2027-university-transfers.csv \
    data/sources/budget-2026/state-budget-2026-university-transfers.csv
```

All three read the PDF through `scripts/extract/zdb_pdf.py` (pdfplumber: text lines and ruled tables in reading
order, cached next to the PDF; it drops the judiciary's version of art. 1 and 2, and splits rows that the PDF draws
without a top border at a page break). `-P` keeps the user site-packages, where pdfplumber is installed.

## By purpose: the medium-term budget forecast 2027–2029

**Source.** „Актуализирана средносрочна бюджетна прогноза за периода 2027–2029 г.“ — the explanatory memorandum to
the 2027 bill, „Приложение към т. 4“ of the draft Council of Ministers decision, published on the same consultation
page (6.11.2026): https://www.minfin.bg/upload/65608/UMTBF-2027-2029-motivi.pdf (201 pages, text layer; SHA-256
8d0c4577…6c10ac), downloaded by hand on 14.11.2026 (`data/cache/mtbf-2027-2029/MANIFEST.md`).

`kfp-2027-by-function.csv` — the layout of `../budget-2026/kfp-2026-by-function.csv`: `level` (`function` /
`subfunction`), `function`, `subfunction` (as printed, without the leading "-"), `2026_expected_mEUR` (the table's
"2026 Очаквано"), `2027_draft_mEUR` ("2027 Проект"), `2028_forecast_mEUR`, `2029_forecast_mEUR`, and the printed
`<year>_pctGDP`. The 9 functions and 23 sub-functions have exactly the names of the 2026–2028 forecast, so they get the
same node ids (`scripts/lib/kfp.ts`); nothing is renamed or new. The 2026 column is the ministry's expectation for
2026, not the programme: it differs from the 2026 programme by 0.1–0.3 m in four sub-functions (e.g. tourism
41.7 vs 41.4) and is not used.

`kfp-main-indicators.csv`, `kfp-national-budget.csv` — `indicator` (as printed; a "% от БВП" row is named after the
row above it), `unit` (`mEUR` or `pctGDP`), then `2025_report`, `2026_expected`, `2027_draft`, `2028_forecast`,
`2029_forecast`.

`transfers-universities-media.csv` — as `../budget-2026/transfers-universities-media.csv`, with the columns 2027 г.,
2028 г., 2029 г.

| КФП 2027 (draft), million EUR | |
| --- | --- |
| Revenue, grants and donations | 51 065,2 (36,1% of GDP) |
| Expenditure | 54 465,3 (interest 1 425,6) |
| Contribution to the EU budget | 1 506,8 |
| **Expenditure and EU contribution** (the site's total, `../kfp/kfp-totals.csv`) | **55 972,1** (39,6% of GDP) |
| Balance (cash) | −4 907,0 (−3,5% of GDP) |
| GDP (Table I-2) | 141 302 |

On the site, "Budget 2027 (draft)" is built like "Budget 2026": КФП functions and sub-functions, with the bill's
delegated activities per municipality (art. 53, `municipal-delegated-2027.csv`) under education, health, social
services, municipal administration and culture, the subsidy to each of the 33 state universities (art. 16(4)) under
Education and the Academy of Sciences under Science. The Health Insurance Fund is one box, `h-nhif`, with its 2027
expenditure ceiling from Annex 4 (5 683 586,8 thousand EUR): the same quantity as 2026's `h-nhif` (the NHIF act's
"II. РАЗХОДИ", 5 256 677,2), since 5 683,6 − 5 256,7 = +426,9 m (+8,1%) is what the NHIF announced for its draft
2027 budget on 10.11.2026 (https://www.nhif.bg/bg/news/1106: "близо 5,68 млрд. евро … ръст от над 8,1% или близо 427
млн. евро спрямо 2026 г."; cached in `data/cache/nhif-news/`). The rest of Health, `h-other` "Ministry of Health,
hospitals and other" (1 017,4 m), is the computed remainder, as in 2026. The NHIF's split by type of care, pensions
and benefits wait for the 2027 NHIF and social security bills, which are not published; the forecast prints no
complete table for either fund (Annex 4 gives the National Social Security Institute only as a total, 16 523 685,4,
of which pensions 14 668 230,1, which is not the КФП pensions sub-function). The social-services rest that holds the
Institute's administration has its own id (`s-svc-rest`, not 2026's `s-svc-other`).

Checks (`scripts/extract/kfp_forecast.py` stops on any failure; the build checks the trees again):

- Every function's sub-functions add up to it (all four columns; at most 0.1 m per sub-function of rounding).
- The 9 functions add up to Table II-1 "Разходи" in every column: 2027 54 465,3 exactly (2026 55 525,2 vs
  55 525,0 printed, rounding — the forecast's footnote 16 warns of it); "Р-ди некласифицирани" equals the interest
  ("Лихви") in every column. In Tables II-1 and II-2 expenditure + EU contribution = the total, and non-interest
  expenditure + interest = expenditure.
- Annex 6 is the draft act: 843 054,1 (Academy 140 323,5 + universities 702 730,6) = art. 16(4), military schools
  46 953,5 = art. 11(4). Table IV-1 is art. 52: 5 162 139,3 in all, delegated 4 626 381,3, equalising 255 658,0,
  winter roads 25 100,0, capital 255 000,0. Annex 4's ceilings for the 45 state-budget organisations equal the
  units' expenditure in the bill (the extractor checks this when the bill's units file is present), and Annex 5's for Parliament (69 657,0) and the judiciary (752 184,0, the Council
  of Ministers' version) too. No difference between the forecast and the bill was found.
- Spot-checks against the PDF text: Здравеопазване 2027 6 911,7; отбрана 2 907,2; пенсии 14 756,7 (a cell that the
  PDF wraps as "14" over "756,7"); транспорт и съобщения 3 242,4; Table II-1 total 55 972,1, balance −4 907,0.

Against the 2026 programme (`../budget-2026/kfp-2026-by-function.csv`), total with the EU contribution 56 807,2 →
55 972,1 (−1.5%): social protection +1 153,6 (pensions 13 578,7 → 14 756,7), interest +366,4, defence and security
+369,0, health +247,3; economic affairs −2 620,0 (energy 2 801,2 → 1 422,6) and housing and utilities −547,8.

```sh
# the PDF, downloaded by hand: data/cache/mtbf-2027-2029/UMTBF-2027-2029-motivi.pdf
python3 -P -E scripts/extract/kfp_forecast.py data/cache/mtbf-2027-2029/UMTBF-2027-2029-motivi.pdf data/sources/budget-2027
```
