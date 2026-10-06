# Big cities: whole budgets by ЕБК activity, Plovdiv's schools, education cost standards

The three biggest cities' budgets at the level no national table publishes — the **ЕБК activity** (kindergartens,
general schools, street lighting, street cleaning …) × **paragraph** of expenditure — from each city's own year-end
report, plus Plovdiv's allocation of the state budget to each school and kindergarten, and the 2026 cost standards of
state-delegated education. Used by `scripts/cities.ts`: the datasets "Big cities 2024" and "Big cities 2025"
(`cities-<year>`, family `cities`) and the lists "Plovdiv: state funding of each school and kindergarten" and
"Uniform cost standards for education, 2026" ("Lists" › "City budgets"). Made by `scripts/extract/city_budgets.py`
from the downloads in `data/cache/cities/` (not committed; `MANIFEST.md` there has every file's URL and date).
Everything was retrieved on 6 Oct 2026.

## Files

| File | Content |
| --- | --- |
| `sofia-<year>.csv`, `plovdiv-<year>.csv`, `burgas-<year>.csv` (2024, 2025) | One row per form, EU programme, activity and economic code with a non-zero amount (1,267–1,798 rows a file): `form` (`budget`; the accounts for EU funds `ksf` cohesion and structural funds, `ra` agricultural funds, `des` other EU funds, `dmp` other international programmes), `programme` (the EU programme of a `ksf` block, e.g. `98226`, see `eu-programmes.csv`; empty otherwise), `activity` (four digits as the reports write them: the function's digit, then the ЕБК activity — `3311` = function 3, activity 311 kindergartens), `paragraph` (two digits, `01` … `98`), `code` (the four-digit ЕБК code of the row: a sub-paragraph, `1016`, or a paragraph printed without sub-paragraphs, `5100`), `plan`, `plan_state`, `plan_local`, `plan_topup` (the **revised plan** at 31 December: in all, state-delegated activities, local activities, the municipality's top-up of delegated activities — "дофинансиране"), `actual_state`, `actual_local`, `actual_topup`, `actual` (**cash spent** in the year, the same split). Whole **leva**, as printed (both years are before the euro) |
| `report-totals.csv` | Every report read (30): city, year, form, the cached file (and ZIP member), its URL, the period, currency, form version, number of activities and the totals the sheet prints ("II. ВСИЧКО РАЗХОДИ") in the eight value columns. The build checks every extract against it to the lev |
| `eu-programmes.csv` | The EU programmes named in the `ksf` forms (18): code and name as printed (e.g. `99001` the Recovery and Resilience Plan) |
| `ebk-activities.csv` | The ЕБК 2026 functional classification, section VI: every activity (302, one closed) with its `function` (1–9), `group` and official `name`; `status` = `closed` for the closed one. English names are ours, in `scripts/lib/ebk.ts` |
| `plovdiv-schools.csv` | Plovdiv's allocation of the state budget to its schools, kindergartens and dormitories, 2024–2026: `year`, `activity` (311, 312, 318, 322, 326, 332, 338), `key` (the institution's name normalised, the same in every year), `institution` (name as published that year), `part` (`formula` — the formula's components, or the standards of activity 338; `above` — the standards paid on top of the formula; `count` — children or pupils the formula counts), `component` (an id per column of the sheets, e.g. `pupils`, `classes`, `institution`, `meals-school`; names in `scripts/cities.ts`), `value`, `currency` (BGN 2024–2025, EUR 2026; whole units) |
| `standards-2026-education.csv` | The 75 cost standards of state-delegated education for 2026 (Council of Ministers decision 497/2026, annex 2, section III): `section_no` and `section` (the numbered heading), `standard` (name as printed; a band such as "до 10 места" is joined to its heading), `measure` (the natural indicator: брой институции, групи, паралелки, деца, ученици …), `count` (the national count printed with it; empty for 14), `euro` (the standard per unit) |

## Sources

- **Year-end cash-execution reports** — the Ministry of Finance form "ОТЧЕТНИ ДАННИ ПО ЕБК ЗА ИЗПЪЛНЕНИЕТО НА БЮДЖЕТА"
  (Excel, sheet `OTCHET`), quarterly version B3 for the fourth quarter, once for the budget (financial-legal form
  0 "БЮДЖЕТ") and once for each kind of account for EU funds (IB3: 98 "СЕС - КСФ", 42 "СЕС - РА", 96 "СЕС - ДЕС",
  97 "СЕС - ДМП"). The fifth account form, "Чужди средства" (third-party money such as deposits and guarantees), is not
  spending and is not read.
  - Sofia (ЕБК 7225): https://www.sofia.bg/bg/web/guest/2025-financial-year (and `…/2024-financial-year`), files
    `https://www.sofia.bg/documents/d/guest/b3_<year>_4_7225` (`b3_2024_4_7225-` for 2024) and
    `…/ib3_<year>_4_7225_<ksf|ra|des|dmp>`.
  - Plovdiv (6609): https://www.plovdiv.bg/item/budget-and-finance/otsheti-budjet/quarterly-reports-eu-2025/ (and
    `…-2024/`): one ZIP per quarter, `wp-content/uploads/2026/04/chetvurto-trimesechie-2025-otchet.zip` and
    `…/2025/02/otchet-trimesechen-2024.zip`, members `B3_<year>_4_6609.xls` and `IB3_<year>_4_6609_<KSF|RA|DES|DMP>.xls`.
  - Burgas (5202): https://www.burgas.bg/bg/2025/trimesechni-otcheti-za-kasovo-izpalnenie-na-byudzheta-kam-31122025-g
    and `…/2024/…-kam-31122024-g`, five `.xls` files each under `https://www.burgas.bg/uploads/posts/<year+1>/`.
- **The ЕБК 2026** (Ministry of Finance, minfin.bg/bg/1037, which blocks scripts): the script-friendly copy
  https://comsy54.bg/wp-content/uploads/2026/01/EBK-2026-public.xlsx, sheet "Функции" (the detailed list after the
  summary), already cached for the municipalities register (`data/cache/municipalities/`).
- **Plovdiv's allocations** — "Информация за разпределението на средствата от държавния бюджет по училища и детски
  градини, и по компоненти на формулите", https://www.plovdiv.bg/item/budget-and-finance/delegated-budget/ (one page a
  year): 2024 order 24ОА-461/28.02.2024 (`wp-content/uploads/2024/03/Informatsiya-za-razpredelenieto-na-sredstvata-ot-darzhavniya-byudzhet-za-2024-godina.xls`),
  2025 order 25ОА-1347/28.04.2025 (`…/2025/05/formuli2025.xls`), 2026 order 26ОА-2326/28.08.2026
  (`…/2026/09/Informatsia-za-razpredelenieto-na-sredstvata-ot-darzhavniya-byudzhet-za-2026-godina.xls`). One sheet per
  activity, one row per institution, one column per formula component.
- **Cost standards** — РМС № 497/03.07.2026, DOCX at https://strategy.bg/download/1323211 (`26RH497pr.docx`), the
  seventh table (annex 2: standards of the state-delegated activities with natural and value indicators).

## How the reports are read (`parse_otchet`)

- Section II.1 of the sheet repeats a block per activity: a row "оп/дейност" with the four-digit code, the activity's
  name, then every paragraph (code × 100 in column B: 100 = § 01-00, 1000 = § 10-00; 98 = § 98) with its
  sub-paragraphs (column C), and the block's total, "99-99". In the `ksf` forms a block is one programme's spending on
  the activity: the programme's code and name are in the row above, and the same activity can come once per programme.
- The finest level printed is kept: a paragraph's sub-paragraphs where it has any with money, else the paragraph.
- **Checks, stopping on any failure:** a paragraph's sub-paragraphs add up to it; each block's paragraphs add up to its
  "99-99"; the plan and the actual equal the sum of their state, local and top-up columns on every row; the activities
  add up, paragraph by paragraph, to the sheet's own "II. РАЗХОДИ – РЕКАПИТУЛАЦИЯ ПО ПАРАГРАФИ" and in all to its
  "II. ВСИЧКО РАЗХОДИ"; the sheet is the expected city (ЕБК code), year, period (1 January – 31 December) and form; no
  activity appears twice; every activity is in the ЕБК 2026 under the function its first digit names (93 activities
  are used, all found). `python3 scripts/extract/city_budgets.py --test` runs the parser's unit tests on synthetic
  sheets.
- **Why Q4 B3:** it is the final year-end version (Sofia's B3 for 2025 was saved on 30 March 2026, after its December B1
  of 15 January, and differs from it by 0.01%); Plovdiv's December B1, re-published "corrected after the audit" in June
  2026, is identical to its Q4 B3.
- **No 2026 plan.** The 2026 State Budget Act was adopted only in July 2026, and the cities adopted their 2026 budgets
  in August–September (Plovdiv 17.09.2026, Burgas 21.09.2026; Sofia's was still a draft on 19.08.2026), so the plan
  columns of every 2026 monthly and quarterly report published so far (to August) are empty; the adopted budgets are
  published only as PDF (Plovdiv's and Burgas's scanned or without a table structure). "Big cities" therefore has the
  2024 and 2025 outturns; the revised plan of those years is in the notes (city and activity: plan and % spent).

## In the tree (`scripts/cities.ts`)

City → function → activity → kind of spending → paragraph; the kinds of spending group the paragraphs (staff § 01,
02, 05, 08; running costs § 10, 19, 20 — § 10 by sub-paragraph: food, energy, external services, current repairs …;
benefits § 39–42; subsidies and membership fees § 43–49; capital § 51–57; interest § 21–29; reserve § 98). The
budget and the four EU-funds forms are added together: spending through the accounts for EU funds is a city's
spending too, and a transfer between the budget and those accounts is not expenditure in either, so nothing is counted
twice. Each city's and each activity's note gives the split into state-delegated activities, local activities and the
top-up, what was paid from the EU-funds accounts, and the revised plan with the share spent. Refunds booked as
negative spending (mostly taxes paid back under § 19-01) cannot be slices: they are merged with the smallest positive
parts of their parent into one "Other (net)" part, whose note lists them — or, where only all the parts together are
positive, the parent shows no parts (2024–2025: three "Other (net)" parts and five such parents, e.g. Sofia's water
supply and sewerage in 2024: capital €13.8 m, running costs −€5.7 m). The ЕБК's typo "родителска грижаа" is corrected; three activity codes (863–865) that
the 2026 file prints twice keep their first meaning.

## Plovdiv's allocations

- The sheets' header rows name each column; a formula's coefficients ("98,33%*К1*БДяг") stand where the row below
  names the component, and the standards paid outside the formula follow the formula's last printed total. Components
  are mapped to ids by their label without the coefficient (so "98,33%" and "98,55%" are the same component in 2026 and
  2024); a new label stops the script.
- **Checks:** on every row the formula's components equal the formula totals it prints; every component adds up to the
  sheet's "ВСИЧКО / ОБЩО ЗА ДЕЙНОСТ" row; no institution twice in an activity. Totals: 241,225,351 leva (2024),
  272,470,783 leva (2025), €148,646,897 (2026).
- Institutions are joined across years by their normalised name (capitals, no quotes, dots or spaces, Cyrillic letters,
  "СВЕТИ" = "СВ"); two schools written two ways are aliased (`NAME_ALIASES`: СУ „Найден Геров“ / „Н. Геров“, СУ „Симон
  Боливар“ / „С. Боливар“). 135 institutions, 234 institution × activity rows; the list shows the latest spelling.
- Compared with the city's report: the 2025 allocations are 75–100% of the revised plan of the state-delegated part of
  the same activities (kindergartens 88%, general schools 75%, dormitories 99%); the rest is money the municipality
  keeps for centrally managed items and adds during the year.

## Cross-checks

- **Sofia 2025:** the budget form's total spent, 2,941,934,570 leva, and its revised plan, 3,264,984,301 leva, equal
  "ВСИЧКО РАЗХОДИ" in annex 3 of Sofia's annual report to the city council (19.08.2026,
  https://www.sofia.bg/documents/d/guest/2026-08-19-prilozenie-3-razhodi), as do ten paragraph totals and three
  sub-paragraphs of it (e.g. § 01-00 888,631,761; § 10-16 57,973,119; § 43-00 337,867,477 leva; capital § 51–55
  371,841,929 leva).
- **Burgas 2024 and 2025:** the state-delegated column (298,899,033 and 326,340,132 leva) and local activities with
  the top-up (216,168,571 and 245,467,917 leva) equal the state and municipal totals of annex 9 of Burgas's 2025 annual
  report, which also prints the 2024 outturn
  (https://www.burgas.bg/uploads/posts/2026/1efe8a73e239e404d1de847bf830673f.pdf); so does the 2025 revised plan
  (344,618,554 + 274,263,194 leva).
- **Plovdiv:** its annual report's annexes are scanned PDFs, so its totals are checked against the sheets' own printed
  totals and recapitulation only.
- **Scale:** the three budgets spent 4,297.4 m leva in 2025, 26% of the 16,351.8 m leva the municipal budgets spent in
  all by the 2025 КФП report (column "Общини", `../report-2025/`); their EU-funds accounts are in that report's EU-funds
  columns.
- **Single activities** (the "99-99" rows of every block of the activity, read independently of the parser) equal the
  tree to the euro: Sofia kindergartens 2025 370,883,015 leva; Plovdiv street lighting 2025 6,616,375 leva; Burgas street
  cleaning 2025 30,408,453 leva; Burgas general schools 2024 117,924,029 leva.
- **Standards:** the standards times the counts printed with them come to €2.78 bn, 95% of the €2,914.9 m that the 2026
  State Budget Act (art. 52) gives municipalities for education; the rest are sums the annex lists without a per-unit
  standard and the 14 standards printed without a count.

## Totals

| City | 2024 spent (budget + EU accounts) | 2025 spent | of which EU accounts 2025 | Revised plan 2025 |
| --- | --- | --- | --- | --- |
| Sofia | 2,641.4 m leva (€1,350.5 m) | 3,052.5 m leva (€1,560.7 m) | 110.6 m leva | 3,407.0 m leva (89.6% spent) |
| Plovdiv | 706.7 m leva (€361.4 m) | 832.7 m leva (€425.7 m) | 49.0 m leva | 994.3 m leva (83.7%) |
| Burgas | 543.7 m leva (€278.0 m) | 663.1 m leva (€339.0 m) | 91.3 m leva | 738.7 m leva (89.8%) |

## Refresh

`python3 scripts/extract/city_budgets.py --download` (add the next year's report URLs to `reports()`, `PLOVDIV_Q4`
and `BURGAS_Q4`, and the next allocation to `SCHOOLS`), then `python3 scripts/extract/city_budgets.py` and
`npm run data` (add the year to `build-data.ts`). The Q4 reports appear in February–April; the 2026 plan can be added
once a report carries the adopted budget in its plan columns (the September reports, due mid-October 2026). Another
city that publishes the same forms needs only its URLs and its ЕБК code in `CITIES` of both scripts.
