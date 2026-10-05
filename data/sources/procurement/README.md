# Public procurement: contracts, suppliers and buyers

The contracts that ministries, municipalities, hospitals, schools, state companies and other buyers sign after a public
procurement procedure, 2016–2023 and 2026 (with the last contracts of the old register in 2024–2025), and — for 2024 and
2025, which the Public Procurement Agency has not published as open data — the award notices in TED. Made by
`scripts/extract/procurement.py` from the downloads in `data/cache/procurement/` (not committed; `MANIFEST.md` there lists
every file with its URL and download date); `scripts/procurement.ts` turns them into the lists of "Lists" › "Public
procurement" (`public/data/lists/contracts*`, `contract-*`, `ted-awards*`). All files were downloaded on 5 October 2026.

Contracts are commitments, not payments (no payment under a contract is published), and they carry no budget
classification code: they are lists, never tree nodes. Ministries and municipalities link to their buyer page through the
register `buyer-nodes.csv` (below).

## Sources and licences

| Source | What | Access | Licence |
| --- | --- | --- | --- |
| Агенция по обществени поръчки (АОП, Public Procurement Agency), data.egov.bg organisation 502: „Договори и изменения на договори – <year>“ — 2016 (dataset 5481), 2017 (5480), 2018 (8883), 2019 (13526); from 2020 one dataset from the old register (РОП) and one from the e-procurement platform (ЦАИС ЕОП): 2020 (16321, 16574), 2021 (18256, 19062), 2022 (19216, 19218), 2023 (20328, 20611); 2024 (23813) and 2025 (23818) from РОП only | One CSV of the contracts published in the year and one of the contract amendments (annexes): notice, procurement number (УНП), buyer and supplier with ЕИК, subject, object (supplies, services, works), EU funding, offers, contract number and date, value at signing and currency | `https://data.egov.bg/resource/download/<resource uri>/csv` (the portal builds a file on request; a large one takes minutes) | Terms no. 1, CC0 (2020, 2023, 2024, 2025); no. 2, CC BY — attribution (2016, 2017, 2021, 2022); none stated (2018, 2019) |
| АОП, data.egov.bg organisation 502: „Автоматично генерирани данни за обявления, публикувани в ЦАИС ЕОП …, съгласно стандарт OCDS“ — 11 fortnightly datasets (1 Jan – 3 Jun 2026) and 4 monthly ones of daily files (June–September 2026): 126 files, 1 Jan – 30 Sep 2026 | Every notice published in ЦАИС ЕОП as an OCDS 1.1 release (eForms profile): procedures, lots, awards with suppliers, contracts with value, signing date and amendments | `…/resource/download/<uri>/json` | CC0 (terms no. 1, and the packages' `license` field). Publication rules: АОП, „Правила за публикуване … OCDS“, version 1.2 of 29.06.2026, with Appendix 1 (field meanings), https://www2.aop.bg/e-uslugi/otvoreni-danni-ot-rop/ |
| TED (Tenders Electronic Daily, Publications Office of the EU), API v3 `POST https://api.ted.europa.eu/v3/notices/search` | Notices of types can-standard, can-social, can-tran and can-modif with a Bulgarian buyer (`buyer-country=BGR`), published in 2024 (19,465) and in 2025 (21,927): buyer, winners, lots, notice value (BT-161), CPV, procedure, change-notice fields (BT-758) | Expert query with `paginationMode: ITERATION`, 250 a page | Free reuse with acknowledgement of the source (Commission Decision 2011/833/EU on the reuse of Commission documents) |
| CPV 2008 (Regulation (EC) No 213/2008), https://ted.europa.eu/documents/d/ted/cpv_2008_xls | The official Bulgarian and English names of the 45 divisions | Download | EU legislation, free reuse |
| ECB reference rates, Eurostat `ert_bil_eur_m` (monthly averages) | For the 95 contracts in USD, GBP, CHF and CZK | Eurostat API | Eurostat, free reuse with acknowledgement |
| АОП, „Доклад за състоянието на пазара на обществените поръчки“ for 2023, 2024 and 2025 (https://www2.aop.bg/aop/god-dokladi/pazara-na-op/) | Used only to check the totals (below) | PDF | — |

Not used: the yearly files of contracts outside the scope of the Public Procurement Act (`excl*.csv`), the first-quarter
2022 set (dataset 17924, the year's file holds it) and the 2007–2015 lists (another format).

## Files

| File | Rows | Content |
| --- | ---: | --- |
| `contracts-<year>.csv.gz` (2016 … 2026) | 243,439 | One row per contract: `id` (r/e + the notice's number in the register + the contract's place in it; for OCDS o + the procedure + the contract's id in ЦАИС ЕОП), `source` (rop, eop, ocds), `year` (the year the contract was published), `published`, `signed`, `procurement` (УНП, or the OCDS ocid), `contract_no`, `buyer` (ЕИК; see `buyers.csv.gz`), `buyers` (how many buyers a joint procurement names), `supplier` (key, see `suppliers.csv.gz`), `supplier_kind` (legal, joint, person, sole-trader, withheld), `subject` (first 150 characters; empty for natural persons and sole traders), `object` (supplies, services, works, design-contest), `cpv` (main CPV code, 2026 only), `procedure` (OCDS method, 2026 only), `eu` (EU funding, 1/0, to 2025), `offers`, `currency`, `value` (as published), `vat` (`incl` where the old register marks the value "с ДДС"), `value_EUR`, `amendments`, `value_after_EUR` (after the last amendment), `amended` (its date), `basis` (award; for 2026, `amended` when the contract is known only from a 2026 amendment notice) |
| `ted-notices.csv.gz` | 33,408 | TED award notices of 2024 (15,933) and 2025 (17,475): `id` (publication number), `year`, `published`, `concluded` (earliest contract date), `buyer`, `buyer_name`, `title` (first 150 characters), `cpv`, `procedure`, `winners` and `winner_kinds` (supplier keys and kinds, in the notice's order), `lots`, `currency`, `value` (BT-161 notice value), `value_EUR`, `type` |
| `suppliers.csv.gz` | 22,780 | Every supplier key: `key`, `kind`, `eik`, `name` (the spelling of the latest year), `spellings`, `members` (of a joint key) |
| `buyers.csv.gz` | 3,754 | Every buyer: `eik`, `name` (the spelling of the latest year), `spellings`, `contracts`, `value_EUR` |
| `buyer-nodes.csv` | 308 | The register of buyers that are a node of the trees: `eik`, `name`, `family` (ministries, municipalities), `node` (the unit's id, or the municipality's ЕБК code) |
| `cpv-divisions.csv` | 45 | `division`, `name_bg`, `name_en` (CPV 2008) |
| `files.csv` | 156 | Every source file: rows read and kept, and the sum of its values by currency |

Committed size: 19.8 MB (each file under 3 MB).

## How the sources are read

**Yearly files.** The layout changes over the years (20 columns in 2016–2017 with `S51.ID` and a note on the
financing, 18–19 from 2018 with a VAT column; ЦАИС ЕОП's files wrap most values in an extra pair of quotes and add
an SME column in 2023; 2017–2019 write decimal commas); columns are found by their headings. Every row's publication
date is in the file's year, so `year` is the year the contract was published (most were signed that year or late in
the previous one). Values are without VAT, as the forms ask: 79 values of the old register are marked "с ДДС" and
flagged; ЦАИС ЕОП marks all its values 0 ("without VAT"). 660 rows give no currency ("Не се публикува": the value is
withheld) and 173 no value. Amendments are joined to their contract by procurement number, contract number and supplier
number: 16,878 of the 20,472 annexes published in 2016–2025 match a contract of these files (the others amend
contracts of 2015 or earlier); a contract gets their count and the value after the latest one (17,564 contracts were
amended, 4,806 of them with a new value).

**OCDS (2026).** Each notice is a release; a procedure's releases share an `ocid`. 44,831 releases were published (265
twice, identically, in two daily files around 4 June 2026, when publication went from fortnightly to daily, and read
once). A contract is one row by `ocid` and contract id: its supplier, lot, CPV code, procedure, offers, value and
signing date come from the award notice; later releases (amendment notices) give the amendments and the value after the
last one. The value is "the total value of the contract without VAT" (Appendix 1 of the rules). 30,727 contracts:
26,719 from 2026 award notices (24,161 signed in 2026, 2,346 in 2025, the rest earlier) and 4,008 known only from a
2026 amendment notice (signed 2020–2025, mostly 2024 and 2025: 1,385 and 2,053). 6,773 lot results were unsuccessful
(no supplier, no contract). The CPV code is the lot's (else the procedure's); its first two digits are the division.

**TED (2024–2025).** Of the 41,392 notices fetched, 7,910 contract modification notices, 28 notices replaced by a later
change notice (BT-758 names the notice and version a change notice replaces) and 46 joint procurements led by a
foreign buyer (e.g. a European research network's €550 m cloud framework, where a Bulgarian body is one of many buyers)
are left out: 33,408 award notices. A notice's value is BT-161, the total of all its contracts (for a framework
agreement, its highest possible amount). Winners are listed once each (their names repeat per lot), with their numbers
where the counts agree; 6,142 notices name no winner in TED's data (often the old forms of early 2024).

## Suppliers and buyers

- **Identifiers.** A supplier's ЕИК is written with its prefixes taken off ("BG…", "ЕИК: …") and, for a Bulgarian name,
  the leading zeros a spreadsheet dropped put back (5–8 digits → 9, 12 → 13); foreign registration numbers ("HRB …",
  "DE …") are not ЕИКs. 261 ЕИКs fail their check digit and are kept as published. Several suppliers in one row (a
  consortium and its members, or several contractors; "; " or " ||| ") are one joint key (3,074 contracts), named by
  their names joined with " | ". Organisations without a number (foreign companies, consortia) are keyed by their name.
- **Natural persons and sole traders are never named** — by the rules of the EU-funds and farm-subsidy extracts
  (`scripts/extract/persons.py`): sole traders ("ЕТ …"), names that are a person's (a given name from
  `../places/given-names.csv` and a surname, "ЗП …"), a supplier whose number is masked ("**********") or is a valid
  personal identity number (24 rows of the source give an ЕГН as the supplier's "ЕИК"; none is written), and a supplier
  with no number and nothing in its name that marks an organisation, Bulgarian or foreign (often a person written in
  Latin letters). Of the suppliers read (with consortium members and TED winners): 5,962 sole traders, 1,107 names that
  are a person's, 14 with a personal number and 685 with no number; 5,393 contracts are a sole trader's and 1,390 a
  natural person's. They are one group, `persons`; their names, numbers and the subjects of their contracts are not
  written. 593 contracts have a supplier the source does not publish ("Не се публикува"): the group
  `withheld`. The extractor stops if any supplier name written is a person's or a sole trader's, or if any file holds a
  valid ЕГН or an unmasked personal number.
- **Names.** A supplier's or buyer's name is the spelling of the latest year it appears in (the most frequent of that
  year): companies are renamed, and the old register added former names ("… /старо наименование …/").
- **Buyers** are contracting authorities (public bodies and public or sector companies), many named after a person
  (schools, boarding schools, hospitals), so only the sole-trader rule applies to them (no buyer is one). A joint
  procurement names several buyers (74 rows of 2023); the first is the buyer.
- **The register `buyer-nodes.csv`** (308 rows): 45 ministries and agencies of the State Budget Act, in 46 rows (the
  Ministry of Innovation and Growth is two nodes, below), whose name, in any of the buyer's spellings, is the unit's name in "Ministries 2024–2026" once abbreviations ("/МЗ/", "(ДАТО)") and
  "на Република България" are taken off, plus two by ЕИК (831909905, the Ministry of Agriculture, Food and Forestry,
  renamed the Ministry of Agriculture and Food; 831913661, the State Agency "State Reserve and Wartime Stocks", which
  the Act names without "State Agency"); and 262 municipalities named "Община <name>", "Община град <name>" or
  "Столична община" (spaces ignored: "Бобов дол"). Left out because the match is not certain: Бяла (two municipalities
  of that name) and Батак (two buyer ЕИКs). The Ministry of Innovation and Growth (177549112) is the node `mig` in
  2024–2025 and, renamed, `mid` in 2026.

## Corrections

Two values are almost certainly entry errors; they stay in the extract as published, and the site does not count them
(it shows the published value in the contract's details):

- `e274233-1`: Sofia Municipality, 2022, waste collection and street cleaning (procurement 00087-2021-0218) —
  6,938,481,985 leva (€3.55 bn), the same in TED (notice 506876-2022), while the procurement's other lot is worth
  73,921,836 leva;
- `e336694-1`: dog and cat food for a municipal animal shelter, 2023 — 165,333,000 leva (€84.5 m); the Agency's own
  2023 report leaves it out of its total (below).

## Checks

**Every yearly file against an independent recount** (pandas, not the extractor's reader): rows and the sum of the
values by currency are identical.

| File | Rows | Leva | Euro |
| --- | ---: | ---: | ---: |
| 2016 РОП | 21,505 | 6,720,892,630.11 | 110,913,391.11 |
| 2017 РОП | 21,882 | 7,243,735,243.25 | 97,101,140.63 |
| 2018 РОП | 22,486 | 8,489,790,223.84 | 241,908,758.47 |
| 2019 РОП | 23,093 | 14,383,501,252.71 | 476,341,261.10 |
| 2020 РОП / ЦАИС ЕОП | 20,094 / 4,662 | 11,931,262,530.01 / 1,149,722,870.49 | 30,724,965.47 / 990,148.47 |
| 2021 РОП / ЦАИС ЕОП | 6,475 / 25,092 | 4,063,994,108.06 / 7,249,529,081.46 | 8,282,914.04 / 54,964,654.86 |
| 2022 РОП / ЦАИС ЕОП | 1,082 / 30,338 | 1,012,224,299.16 / 20,214,484,375.11 | 1,348,087.01 / 15,614,371.67 |
| 2023 РОП / ЦАИС ЕОП | 474 / 35,343 | 1,568,035,155.22 / 15,931,981,524.83 | 1,413,794.02 / 26,334,864.17 |
| 2024 РОП | 136 | 73,586,162.34 | — |
| 2025 РОП | 50 | 45,780,712.05 | — |

**OCDS against an independent recount:** 44,831 distinct releases, 30,727 contracts, 26,719 from award notices, worth
€9,867,973,100.96 + 13,123,918.92 leva + 1,323,821.98 USD + 351,876.11 GBP = €9.876 bn — the same in the extract.

**TED:** every year's notices fetched = the API's `totalNoticeCount` (19,465 and 21,927).

**Against the Agency's published totals** (reports on the state of the procurement market, contracts published in
ЦАИС ЕОП, leva without VAT):

| Year | Report | Here |
| --- | --- | --- |
| 2023 | 35,343 contracts, 15,818,692,409 leva (supplies 20,445; works 5,001; services 9,897) | 35,343 contracts in the ЦАИС ЕОП file, by object the same counts; 15,983,868,228 leva, 1.04% more — the dog-food value above (165,333,000); without it 15,818,535,228 (−0.001%); works and services to the lev |
| 2024 | 36,212 contracts, 21,575,876,519 leva (€11.03 bn) | Not published as open data; TED award notices €16.89 bn (153% — notice values include framework maxima and contracts of other years) |
| 2025 | 40,089 contracts, 23,310,783,231 leva (€11.92 bn) | Not published; TED €15.70 bn (132%) |

**Spot checks against the source records:**

- OCDS, procedure 444870: the Ministry of Transport and Communications' public-service contract with БДЖ – Пътнически
  превози for rail passenger services, €980,558,458, signed 11.02.2026 → the same on the site (2026, Q1).
- OCDS, procedure 490189: ДП „Ръководство на въздушното движение“ and ТЕЛЕЛИНК ИНФРА СЪРВИСИС ЕАД, €9,573,543.51, signed
  16.04.2025, amended 30.09.2026 → on the site as "signed before 2026, amended in 2026", 1 amendment.
- 2023, РОП notice 1043158: Агенция „Пътна инфраструктура“ and ДЗЗД АПП ЛОТ 3.2.1, 499,999,919.92 leva → €255,645,900,
  6 amendments.
- 2019, РОП notice 939804: Булгартрансгаз ЕАД and Обединение Консорциум Аркад, 2,155,722,123.98 leva →
  €1,102,203,220.
- 2016, РОП notice 706937: ДЗЗД АМ Струма 3.1, contract 163 of 30.12.2015, 154,999,999.92 leva → €79,250,242, 9
  amendments, €81,175,580 after them.

**Two suppliers:** ИВКОНИ ЕКСПРЕС ЕАД (207875565) — in the raw OCDS feed 2 contracts from award notices (procedure
444870), €415,765,823 → its page: €416 m, 2 contracts; Сименс ЕООД (121746004) — a new TED query finds 16 notices of
2024–2025 it won alone, €16,802,957 → its page: €16.8 m, 16 notices.

## Refresh

```sh
python3 scripts/extract/procurement.py --download   # new OCDS days and yearly files (the listing is fetched again after a day; files are cached, delete one to fetch it again)
python3 scripts/extract/procurement.py              # writes this folder; stops on any failed check (needs public/data/ministries-*.json from an earlier npm run data)
npm run data
```

## Not here

- **ЦАИС ЕОП's own open data in JSON** (https://app.eop.bg/today/reporting/open-data): since 29 June 2026 the platform
  publishes daily files of procedures, contracts and amendments, by the Agency's rules covering data from 2020 — which
  would fill 2024–2025. The page is a JavaScript application and was not explored (out of scope for this phase).
- Contracts outside the scope of the Public Procurement Act (`excl*.csv`), payments under contracts (not published),
  and the subcontractors that OCDS names.
