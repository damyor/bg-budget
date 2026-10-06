# Farm subsidies: what the State Fund Agriculture paid, by measure, place and recipient

The payments of the State Fund Agriculture (Държавен фонд „Земеделие“, the paying agency of the EU's common
agricultural policy in Bulgaria): EU direct payments and market measures (EAGF), rural development (EAFRD) with its
national co-financing, and national aid, by financial year. Used by `scripts/cap.ts`: the lists "Farming: measures",
"Farming: recipients" and "Farming: municipalities" ("Lists" › "EU funds"); each municipality links to its
recipients in "Municipalities 2024" and "2025". Made by `scripts/extract/cap.py` from the downloads in
`data/cache/cap/` (not committed; `MANIFEST.md` there lists every file with its URL and download date). All files
were downloaded on 5 Oct 2026. **Amounts are in leva, as published**; the site converts them at 1.95583.

| File | Content |
| --- | --- |
| `cap-measures.csv` | One row per financial year and measure (intervention): `fy`, `code` (the register's code, from 2024), `measure` (as published), `kind` (`direct`, `market`, `rural`, `national`, see below), `eagf_BGN`, `rural_BGN`, `national_BGN`, `storage_BGN` (public storage, old files only), `total_BGN`, `recipients` |
| `cap-places.csv` | One row per financial year, place and kind of recipient: `fy`, `province`, `municipality` and `ebk_code` (from 2024; the recipient's address), `kind` (`legal`, `sole-trader`, `person`), `recipients`, the same amounts — every recipient, so these rows add up to the year |
| `cap-recipients.csv` | The legal entities that received at least €25,000 (48,895.75 leva) in a financial year (34,048 rows): `fy`, `eik` (until 2023), `name` (as published), `province`, `municipality`, `ebk_code`, the same amounts |

To refresh: `python3 scripts/extract/cap.py --download` (fetches only what is not cached; add a new financial year
to `APEX_YEARS` once the fund publishes it, usually in autumn), then `python3 scripts/extract/cap.py` and
`npm run data`.

## Sources

- **Financial years 2015–2017 and 2021–2023:** data.egov.bg, organisation 56 (Държавен фонд „Земеделие“), datasets
  19566 (FY2015), 19565 (FY2016–2017), 19549 (FY2020–2021) and 19548 (FY2022–2023) "Данни за изплатени субсидии за …
  финансови години", one CSV per year read through `POST https://data.egov.bg/api/getResourceData`. Columns: financial
  year, ЕИК (legal entities only), beneficiary, province, ЕФГЗ-ДП (EAGF direct payments), ЕФГЗ (other EAGF), ЕЗФРСР-НБ
  (EAFRD with its national co-financing, and transitional national aid), total, public storage, description, measure.
  Licence: the portal's terms no. 2, "Признание" (CC BY). **FY2020** has an entry but the portal returns no data for
  it (users reported this in 2026); FY2018–2019 were never published there.
- **Financial years 2024 and 2025:** the fund's public register, an Oracle APEX application at
  https://seu.dfz.bg/seu/f?p=727:8110 ("Данни за изплатени субсидии за финансова година"). The script opens the page,
  submits its search form (financial year and province, all else blank; the form's own hidden checksums are sent
  back as the page provides them — there is no challenge) and downloads the report's CSV export, one per province
  and year (56 files, cp1251, `;`). Columns: name or code of the beneficiary, surname (natural persons), group,
  province, municipality, intervention code, intervention, specific objective, start and end date, ЕФГЗ, ЕЗФРС, НБ
  (national budget) and their totals per beneficiary on its "ОБЩО" row. The page says the amounts are in leva and
  that the financial year runs from 16 October to 15 October.
- The data are published under Regulation (EU) 2021/2116, Art. 98–99 (transparency of CAP beneficiaries).

## Natural persons and sole traders are never named

- Until 2023, a recipient without an ЕИК is a natural person (farmers registered with the ministry have none); from
  2024, a recipient with a separate surname is. Sole traders (ЕТ) — whose firm name carries the owner's name — are
  recognised by the "ЕТ" in their name, also glued to a word, in quotes or at the end ("ЕТДавид-…", "…ВасилевЕТ").
  A name that marks no organisation (legal form, cooperative, school, municipality, church …) but holds a person's
  name — a registered farmer ("ЗП Петко Телкиев"), a given name followed by a surname, also glued to another word
  ("Булпиг-Димитър Димитров"), or a three-part name — is treated as a natural person too (`scripts/extract/persons.py`,
  shared with the EU projects, the SEBRA payees and the procurement suppliers; this extract keeps its strict rule, while
  the SEBRA payees take its one option, which names sole traders); the given names (8,218) are learnt from
  the natural persons of the same files. Since October 2026 the rules also take a name that starts "ЕТ…" but continues
  with an organisation's word for an organisation ("Етрополски манастир „Света Троица“", FY2015–2017, now named), and
  hospitals, universities, schools, courts and law firms named after a person for organisations. For all of them the extract keeps no name and no ЕИК: they appear only in
  `cap-places.csv`, as a count and a total per place and year, and the list shows them as "Физически лица (n)" /
  "Еднолични търговци (n)". The rule errs on the side of hiding: under 1% of the legal entities with an ЕИК (75 in
  FY2023, e.g. companies named after their owner) are hidden with the natural persons.
- A natural person is counted once per name and province until 2023 (namesakes in one province count once) and
  once per "ОБЩО" row from 2024.

## Measures and kinds

`kind` follows the fund that paid: `direct` — EAGF direct payments (in the old files the ЕФГЗ-ДП column; from 2024
the EAGF interventions I.1–I.7 and the old schemes II.x paid late); `market` — other EAGF measures (school fruit and
milk, wine, beekeeping, fruit and vegetables, public storage); `rural` — EAFRD with its national co-financing
(interventions V and VI from 2024; in the old files the ЕЗФРСР-НБ column); `national` — national money alone:
transitional national aid (ПНДТ, ПНДЖ …, in the ЕЗФРСР-НБ column of the old files) and, from 2024, state and de
minimis aid paid through the register (the excise refund on diesel, aid after the war in Ukraine …), which the old
files do not contain. Year totals are therefore not fully comparable between 2023 and 2024.

## Checks

- Old files: the fund columns add up to each row's total; every recipient's rows add up to the year.
- Register: each beneficiary's rows should add up to its "ОБЩО" row in each fund. Some do not because the export
  repeats a row: dropping exact repeats makes them add up (52 rows dropped in FY2024, 38 in FY2025). Three
  beneficiaries a year still differ, and their payment rows are used: FY2024 СВИКОМ ЕООД, АГРОЛЕСПРОМ КОМЕРС ЕООД
  and Матанд ЕООД (EAFRD rows above the "ОБЩО" row by 812,287, 18,808 and 37,827 leva); FY2025 Рока- Агромилк ООД
  (47,141), Мелхран and МАРКОГИ ООД (under 1,300 leva each). The year totals therefore exceed the sum of the "ОБЩО"
  rows by 868,922 leva (FY2024) and 48,828 leva (FY2025).
- All municipalities match the register (the fund's "Добрич-селска" is Добричка).
- Spot checks against the source rows: ЗК СОКОЛ - 92 (ЕИК 828010652), FY2023: 284,038.92 leva; Булком Видин ЕООД
  (Кула), FY2025: 1,248,254.85 leva, its "ОБЩО" row; Напоителни системи ЕАД (Столична община), FY2024:
  48,733,477.83 leva — all equal the extract. None of the natural persons of FY2024–2025 (45,512 and 47,675, table
  below) appears by name among the listed recipients.

## Totals

| Financial year | Recipients | of which natural persons | sole traders | legal entities | Paid (million leva) | Paid (€ million) |
| --- | --- | --- | --- | --- | --- | --- |
| 2015 | 120,780 | 111,464 | 1,940 | 7,376 | 2,577.1 | 1,317.6 |
| 2016 | 100,526 | 91,127 | 1,918 | 7,481 | 3,054.1 | 1,561.6 |
| 2017 | 100,359 | 91,157 | 1,720 | 7,482 | 2,352.0 | 1,202.6 |
| 2021 | 94,559 | 83,998 | 1,529 | 9,032 | 2,810.8 | 1,437.2 |
| 2022 | 89,057 | 78,872 | 1,407 | 8,778 | 2,263.4 | 1,157.3 |
| 2023 | 86,944 | 76,680 | 1,367 | 8,897 | 2,226.4 | 1,138.3 |
| 2024 | 54,942 | 45,512 | 1,191 | 8,239 | 3,198.3 | 1,635.3 |
| 2025 | 58,041 | 47,675 | 1,240 | 9,126 | 3,103.7 | 1,586.9 |

From 2024 one recipient is one "ОБЩО" row of the register (a person with farms in two provinces counts twice), and
the register counts far fewer natural persons than the old files did (small farmers below the publication threshold
may be left out; the register does not say). EAGF direct payments were €642 m in FY2015 and €831 m in FY2025.
