# Public procurement: contracts, suppliers and buyers

The contracts that ministries, municipalities, hospitals, schools, state companies and other buyers sign after a public
procurement procedure, 2016–2026: the Public Procurement Agency's yearly files for 2016–2023 (and the old register's last
contracts in 2024–2025), the e-procurement platform ЦАИС ЕОП's own JSON open data for 2024–2025, and its OCDS releases for
2026 (to 30 September). Made by `scripts/extract/procurement.py` from the downloads in `data/cache/procurement/` (not
committed; `MANIFEST.md` there lists every file with its URL and download date, and `eop/MANIFEST.tsv` each daily JSON
file); `scripts/procurement.ts` turns them into the lists of "Lists" › "Public procurement" (`public/data/lists/contracts*`,
`contract-*`). The yearly files, OCDS and reference files were downloaded on 5 October 2026, the JSON files on 6 October
2026.

Contracts are commitments, not payments (no payment under a contract is published), and they carry no budget
classification code: they are lists, never tree nodes. Ministries and municipalities link to their buyer page through the
register `buyer-nodes.csv` (below).

## Sources and licences

| Source | What | Access | Licence |
| --- | --- | --- | --- |
| Агенция по обществени поръчки (АОП, Public Procurement Agency), data.egov.bg organisation 502: „Договори и изменения на договори – <year>“ — 2016 (dataset 5481), 2017 (5480), 2018 (8883), 2019 (13526); from 2020 one dataset from the old register (РОП) and one from the e-procurement platform (ЦАИС ЕОП): 2020 (16321, 16574), 2021 (18256, 19062), 2022 (19216, 19218), 2023 (20328, 20611); 2024 (23813) and 2025 (23818) from РОП only | One CSV of the contracts published in the year and one of the contract amendments (annexes): notice, procurement number (УНП), buyer and supplier with ЕИК, subject, object (supplies, services, works), EU funding, offers, contract number and date, value at signing and currency | `https://data.egov.bg/resource/download/<resource uri>/csv` (the portal builds a file on request; a large one takes minutes) | Terms no. 1, CC0 (2020, 2023, 2024, 2025); no. 2, CC BY — attribution (2016, 2017, 2021, 2022); none stated (2018, 2019) |
| ЦАИС ЕОП (АОП), JSON open data: „Автоматично генерирани данни за договори / анекси, публикувани в ЦАИС ЕОП на <dd.mm.yyyy>“ — one file of contracts and one of amendments a day; read: contracts 1 Jan 2023 – 30 Sep 2026 (1,369 files; 2024–2025 used, 2023 and 2026 only compared), amendments 1 Jan 2024 – 30 Sep 2026 (1,004 files) | Every contract (with framework agreements and mini-competitions, contracts outside the Act and lots not awarded, each flagged) and every amendment published on the platform that day: notice, УНП, the platform's procurement and contract numbers, procedure, main CPV code, buyer and supplier(s) with ЕИК and NUTS code, contract date, value and currency, EU funding, offers; for an amendment the value before and after | Static files `https://storage.eop.bg/open-data-<yyyy-mm-dd>/<file name>.json`, the links of https://app.eop.bg/today/reporting/open-data (whose page builds them for every day since 1 Jan 2020); a plain GET, no login or challenge; one request a second | CC0 (rules, section 6). Publication rules: АОП, „Правила за публикуване: Ръководство за потребители на данни … JSON“, version 1.0 of 29.06.2026, with Appendix 1 `opendata_fields_mapping.xlsx` (field meanings), https://www2.aop.bg/e-uslugi/otvoreni-danni-ot-rop/ |
| АОП, data.egov.bg organisation 502: „Автоматично генерирани данни за обявления, публикувани в ЦАИС ЕОП …, съгласно стандарт OCDS“ — 11 fortnightly datasets (1 Jan – 3 Jun 2026) and 4 monthly ones of daily files (June–September 2026): 126 files, 1 Jan – 30 Sep 2026 | Every notice published in ЦАИС ЕОП as an OCDS 1.1 release (eForms profile): procedures, lots, awards with suppliers, contracts with value, signing date and amendments | `…/resource/download/<uri>/json` | CC0 (terms no. 1, and the packages' `license` field). Publication rules: АОП, „Правила за публикуване … OCDS“, version 1.2 of 29.06.2026, with Appendix 1 (field meanings), same page |
| CPV 2008 (Regulation (EC) No 213/2008), https://ted.europa.eu/documents/d/ted/cpv_2008_xls | The official Bulgarian and English names of the 45 divisions | Download | EU legislation, free reuse |
| ECB reference rates, Eurostat `ert_bil_eur_m` (monthly averages) | For the 89 contracts in USD, GBP, CHF, CZK and SEK | Eurostat API | Eurostat, free reuse with acknowledgement |
| АОП, „Доклад за състоянието на пазара на обществените поръчки“ for 2023, 2024 and 2025 (https://www2.aop.bg/aop/god-dokladi/pazara-na-op/) | Used only to check the totals (below) | PDF | — |
| TED (Tenders Electronic Daily), API v3 | Award notices of Bulgarian buyers of 2024–2025, cached in October 2026; used only to spot-check single contracts (below) | `POST https://api.ted.europa.eu/v3/notices/search` | Free reuse with acknowledgement (Commission Decision 2011/833/EU) |

Not used: the yearly files of contracts outside the scope of the Public Procurement Act (`excl*.csv`) and the JSON
files' contracts flagged as such, the first-quarter 2022 set (dataset 17924, the year's file holds it), the 2007–2015
lists (another format), and the JSON files of procedures (`поръчки`).

Until October 2026 the site showed TED's award notices of 2024–2025 (33,408) as a separate, partial list, because the
Agency had not published the platform's contracts of those years; the JSON files hold them all, so that list and the TED
columns of the supplier and buyer pages are gone.

## Files

| File | Rows | Content |
| --- | ---: | --- |
| `contracts-<year>.csv.gz` (2016 … 2026) | 315,006 | One row per contract: `id` (r/e + the notice's number in the register + the contract's place in it; j + the notice's number in ЦАИС ЕОП + the platform's contract number; for OCDS o + the procedure + the contract's id in ЦАИС ЕОП), `source` (rop, eop, json, ocds), `year` (the year the contract was published), `published`, `signed`, `procurement` (УНП, or the OCDS ocid), `contract_no`, `buyer` (ЕИК; see `buyers.csv.gz`), `buyers` (how many buyers a joint procurement names), `supplier` (key, see `suppliers.csv.gz`), `supplier_kind` (legal, joint, person, sole-trader, withheld), `subject` (first 150 characters; empty for natural persons and sole traders), `object` (supplies, services, works, design-contest), `cpv` (main CPV code: of the procurement for 2024–2025, of the lot for 2026), `procedure` (2024–2026: the procedure of the Public Procurement Act, or OCDS's method), `eu` (EU funding, 1/0, to 2025), `offers`, `currency`, `value` (as published), `vat` (`incl` where the old register marks the value "с ДДС"), `value_EUR`, `amendments`, `value_after_EUR` (after the last amendment), `amended` (its date), `basis` (award; for 2026, `amended` when the contract is known only from a 2026 amendment notice and no other year holds it) |
| `suppliers.csv.gz` | 24,492 | Every supplier key: `key`, `kind`, `eik`, `name` (the spelling of the latest year), `spellings`, `members` (of a joint key) |
| `buyers.csv.gz` | 4,565 | Every buyer: `eik`, `name` (the spelling of the latest year), `spellings`, `contracts`, `value_EUR` |
| `buyer-nodes.csv` | 308 | The register of buyers that are a node of the trees: `eik`, `name`, `family` (ministries, municipalities), `node` (the unit's id, or the municipality's ЕБК code) |
| `cpv-divisions.csv` | 45 | `division`, `name_bg`, `name_en` (CPV 2008) |
| `files.csv` | 159 | Every source file (the JSON files by kind and year): rows read and kept, and the sum of the values by currency |

Committed size: 23.4 MB (each file under 3.2 MB).

## How the sources are read

**Yearly files (2016–2023, and the old register's 186 contracts of 2024–2025).** The layout changes over the years (20
columns in 2016–2017 with `S51.ID` and a note on the financing, 18–19 from 2018 with a VAT column; ЦАИС ЕОП's files wrap
most values in an extra pair of quotes and add an SME column in 2023; 2017–2019 write decimal commas); columns are found
by their headings. Every row's publication date is in the file's year, so `year` is the year the contract was published
(most were signed that year or late in the previous one). Values are without VAT, as the forms ask: 79 values of the old
register are marked "с ДДС" and flagged; ЦАИС ЕОП marks all its values 0 ("without VAT"). 660 rows give no currency ("Не
се публикува": the value is withheld) and 173 no value. Amendments are joined to their contract by procurement number,
contract number and supplier number: 16,878 of the 20,472 annexes published in 2016–2025 match a contract of these files
(the others amend contracts of 2015 or earlier). The platform's contracts of 2020–2023 also get the amendments published
in its JSON files from 2024 on (by procurement and contract number: 6,108 amendments of 4,560 contracts), since the
yearly amendment files of 2024–2025 hold only the old register's.

**ЦАИС ЕОП's JSON files (2024–2025).** Each daily file is a JSON array of flat records, one per contract (a lot that was
not awarded is a record too). Of the 48,571 records of 2024 and 53,304 of 2025 the extract keeps 36,186 and 40,081
contracts: it leaves out the lots not awarded (`noAwarding`: 10,782 and 12,187), the contracts outside the scope of the
Public Procurement Act (`isExceptionContract`: 1,600 and 1,033 — the Agency's reports leave them out too) and contracts
published twice (3 a year: two consecutive notices of the same contract, same day and value). A contract is one row by
the platform's procurement id and contract number (`tenderId`, `contractNumber`), with its supplier(s) (several,
"; "-separated, are one joint key, as in the yearly files), buyer, contract date, value and currency (decimal commas),
the procurement's main CPV code, procedure, EU funding and offers. The amendment files of 1 Jan 2024 – 30 Sep 2026
(17,988 amendments: 5,502 published in 2024, 6,479 in 2025, 6,007 in 2026) give each contract the number of its
amendments and the value after the latest one (7,861 contracts of 2024–2025 were amended, 9,993 times, 2,205 of them to
a new value). 2023 and 2026 are read only to compare (below).

**OCDS (2026).** Each notice is a release; a procedure's releases share an `ocid`. 44,831 releases were published (265
twice, identically, in two daily files around 4 June 2026, when publication went from fortnightly to daily, and read
once). A contract is one row by `ocid` and contract id: its supplier, lot, CPV code, procedure, offers, value and
signing date come from the award notice; later releases (amendment notices) give the amendments and the value after the
last one. The value is "the total value of the contract without VAT" (Appendix 1 of the rules). 30,727 contracts:
26,719 from 2026 award notices (24,161 signed in 2026, 2,346 in 2025, the rest earlier) and 4,008 known only from a
2026 amendment notice. 6,773 lot results were unsuccessful (no supplier, no contract). The CPV code is the lot's (else
the procedure's); its first two digits are the division.

**Never twice.** The platform's contract number is the same in its yearly files ("номер на договор"), its JSON files
(`contractNumber`) and OCDS (the contract's id), so a contract is matched across them by that number and its buyer:

- the years do not overlap: 2016–2023 come from the yearly files, 2024–2025 from the JSON files, 2026 from OCDS; no
  contract of the JSON files is in the yearly files (by procurement and contract number);
- 3,886 of OCDS's 4,008 contracts known only from a 2026 amendment notice are contracts of 2021–2025 already in the
  yearly or JSON files (2021: 34, 2022: 116, 2023: 360, 2024: 1,305, 2025: 2,071): they count there, in the year they
  were announced, with the amendment from the JSON files, and are not repeated; 105 are flagged as outside the Act
  (below); 17 remain (`basis` amended), listed but in no total;
- one contract of a 2026 award notice (ocid …-409487, contract 175109, 28 July 2026: €5,589,278.72) was published in
  January 2025 with the same value in leva (10,931,679): it counts in 2025.

## Where the sources overlap

**2023: the JSON files against the yearly file of ЦАИС ЕОП** (the yearly file is kept for 2016–2023: it is what the site
used before, and the Agency's 2023 report matches it):

| | Contracts | Leva |
| --- | ---: | ---: |
| Yearly file (2023, ЦАИС ЕОП) | 35,343 | 15,931,981,524.83 |
| JSON files (2023, within the Act) | 35,089 | 15,649,261,926.99 |
| In both (by notice and contract number) | 35,046 | every value and publication day the same |
| Only in the yearly file | 297 | 276 of them flagged in the JSON as outside the Act (289.7 m leva); 9 under another notice, 2 "not awarded", 10 absent |
| Only in the JSON files | 43 | |

**2026: the JSON files against OCDS.** OCDS stays the source of 2026, as before (it gives each lot's CPV code and the
chain of amendments). Of its 26,719 contracts from award notices, 26,005 are in the JSON files (by the platform's
procurement and contract numbers; 25,277 with the same value — 212 of the others are in euro in the JSON files and in
leva in OCDS, 516 differ in value), 708 are flagged there as outside the Act (€355.5 m) and 6 are not in them. The 708
are left out of 2026, as such contracts are of every other year; so are 105 contracts known to OCDS only from a 2026
amendment that the JSON files flag the same way. 2026 now holds 26,010 contracts of award notices, €9.52 bn (before
October 2026: 26,719, €9.88 bn).

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

**The JSON files against an independent recount** (a separate script reading the daily files with plain `json`, with
the same rules):
2024 — 36,186 contracts, 21,518,034,066.80 leva + 22,182,887.58 euro + 1,007,361.15 USD; 2025 — 40,081 contracts,
23,218,517,401.90 leva + 45,721,895.82 euro + 1,195,000 SEK + 178,044.32 USD — the same in the extract.

**OCDS against an independent recount:** 44,831 distinct releases, 30,727 contracts, 26,719 from award notices, worth
€9,867,973,100.96 + 13,123,918.92 leva + 1,323,821.98 USD + 351,876.11 GBP = €9.876 bn — the same in the extract.

**Against the Agency's published totals** (reports on the state of the procurement market: contracts published in ЦАИС
ЕОП, without the contracts outside the Act, leva without VAT; here euro at the fixed rate, other currencies at the ECB's
monthly rate):

| Year | Report | Here |
| --- | --- | --- |
| 2023 | 35,343 contracts, 15,818,692,409 leva (supplies 20,445; works 5,001; services 9,897) | 35,343 contracts in the ЦАИС ЕОП file, by object the same counts; 15,983,868,228 leva, 1.04% more — the dog-food value below (165,333,000); without it 15,818,535,228 (−0.001%); works and services to the lev |
| 2024 | 36,212 contracts, 21,575,876,519.16 leva | 36,186 contracts (−26, −0.07%), 21,563,251,678.08 leva (−12.6 m, −0.06%). Month by month (the report's table 17): March, May, July and August agree to within 6,300 leva; the report counts twice the 3 contracts published twice (June: 2 contracts, 1,910,873.20 leva; December: 1, 114,820 leva — exactly the differences of those months); in February it takes contract 132716 (УНП 00594-2023-0049) at its "real" value, not the 47,436,589.11 leva published (its note under section 5), and February is 23.1 m leva higher here; September is 511.4 m leva higher here and November as much lower — the Ministry of Transport's bus contract of 511.4 m leva, published on 6 September, seems counted in November; January has 16 contracts fewer here (32.7 m leva) |
| 2025 | 40,089 contracts, 23,310,783,231.31 leva | 40,081 contracts (−8, −0.02%), 23,308,467,051.05 leva (−2.3 m, −0.01%); July to October to the stotinka; June 5 contracts fewer (2.2 m leva) |

The contracts outside the Act, which neither counts: 2024 — 1,600 in the JSON files, 2,848,723,002 leva (the report:
1,577, 2,812,048,506); 2025 — 1,033, 1,254,227,868 (the report: 1,035, 1,254,525,950).

**Spot checks against the source records** (the JSON record, the extract, the site, and the award notice in TED as an
independent source):

- 2024, Булгартрансгаз ЕАД and ХИЛ Интернешънал Н.В. with five partners (procurement 01351-2024-0020, notice 547016,
  contract 145335): 353,222,222.00 leva → €180,599,654, signed 6 June 2024, 2 amendments, €188,268,612 after them → the
  same on the site (2024, and on the consortium's and Bulgartransgaz's pages); TED 381933-2024: 353,222,222 BGN, the same
  six winners.
- 2024, the Ministry of Transport and Communications and Stadler Polska (00042-2024-0003, notice 522086, contract 140841):
  7 double-deck zero-emission electric trains, 300,513,279.50 leva → €153,650,000, signed 26 April 2024 → the same on the
  site; TED 258306-2024: the same value and winner.
- 2025, the Ministry of Health's central purchasing body and 16 medicine wholesalers (00080-2024-0030, notice 746571,
  contract 215022): a two-year framework agreement for hospital medicines, 2,555,702,419.40 leva → €1,306,709,898, signed
  12 September 2025 → the same on the site (the year's largest); TED 615113-2025: the same value and 16 winners; the
  Agency's 2025 report names it under its table 17.
- 2025, the Ministry of Transport and Communications and Консорциум БУЛЕМУ (Alstom Transport, Alstom Ferroviaria, РВП
  Инвест; 00042-2024-0005, notice 686114, contract 194447): 35 single-deck zero-emission electric trains, negotiated
  without prior publication, 883,057,245.00 leva → €451,500,000, signed 25 April 2025 → the same on the site; TED
  283353-2025: the same value and winners.
- 2025, НК „Железопътна инфраструктура“ and ДЗЗД ЖП Медковец-Срацимир (00233-2024-0095, notice 747760, contract 215697):
  the Vidin–Sofia line, section Medkovets–Sratsimir, 597,589,670.94 leva → €305,542,747, signed 22 August 2025 → the
  same on the site; TED 616168-2025: the same value and winners.

**Older spot checks:**

- OCDS, procedure 444870: the Ministry of Transport and Communications' public-service contract with БДЖ – Пътнически
  превози for rail passenger services, €980,558,458, signed 11.02.2026 → the same on the site (2026, Q1).
- 2023, РОП notice 1043158: Агенция „Пътна инфраструктура“ and ДЗЗД АПП ЛОТ 3.2.1, 499,999,919.92 leva → €255,645,900,
  6 amendments.
- 2019, РОП notice 939804: Булгартрансгаз ЕАД and Обединение Консорциум Аркад, 2,155,722,123.98 leva →
  €1,102,203,220.
- 2016, РОП notice 706937: ДЗЗД АМ Струма 3.1, contract 163 of 30.12.2015, 154,999,999.92 leva → €79,250,242, 9
  amendments, €81,175,580 after them.

## Suppliers and buyers

- **Identifiers.** A supplier's ЕИК is written with its prefixes taken off ("BG…", "ЕИК: …") and, for a Bulgarian name,
  the leading zeros a spreadsheet dropped put back (5–8 digits → 9, 12 → 13); foreign registration numbers ("HRB …",
  "DE …") are not ЕИКs. 266 ЕИКs fail their check digit and are kept as published. Several suppliers in one row (a
  consortium and its members, or several contractors; "; " or " ||| ") are one joint key (4,760 contracts), named by
  their names joined with " | ". Organisations without a number (foreign companies, consortia) are keyed by their name;
  in the JSON files a supplier's NUTS code that is not Bulgarian marks it as foreign.
- **Natural persons and sole traders are never named** — by the strict rule of the EU-funds and farm-subsidy extracts
  (`scripts/extract/persons.py`; the SEBRA payees take its option that names sole traders, and a supplier's page never
  links to a sole trader's SEBRA payments): sole traders ("ЕТ …"), names that are a person's (a given name from
  `../places/given-names.csv` and a surname, "ЗП …"), a supplier whose number is masked ("**********") or is a valid
  personal identity number (a few rows give an ЕГН as the supplier's "ЕИК"; none is written), and a supplier with no
  number and nothing in its name that marks an organisation, Bulgarian or foreign (often a person written in Latin
  letters; in the JSON files a member of a group may be "не се публикува" with a person's name). Of the suppliers read
  (with consortium members): 6,635 sole traders, 1,192 names that are a person's, 14 with a personal number and 794
  with no number; 6,368 contracts are a sole trader's and 1,726 a natural person's. They are one group, `persons`; their
  names, numbers and the subjects of their contracts are not written. 593 contracts have a supplier the source does not
  publish ("Не се публикува"): the group `withheld`. The extractor stops if any supplier name written is a person's or a sole trader's, or if any file holds a
  valid ЕГН or an unmasked personal number.
- **Names.** A supplier's or buyer's name is the spelling of the latest year it appears in (the most frequent of that
  year): companies are renamed, and the old register added former names ("… /старо наименование …/").
- **Buyers** are contracting authorities (public bodies and public or sector companies), many named after a person
  (schools, boarding schools, hospitals), so only the sole-trader rule applies to them (no buyer is one). A joint
  procurement names several buyers; the first is the buyer.
- **The register `buyer-nodes.csv`** (308 rows): 45 ministries and agencies of the State Budget Act, in 46 rows (the
  Ministry of Innovation and Growth is two nodes, below), whose name, in any of the buyer's spellings, is the unit's name
  in "Ministries 2024–2026" once abbreviations ("/МЗ/", "(ДАТО)") and "на Република България" are taken off, plus two by
  ЕИК (831909905, the Ministry of Agriculture, Food and Forestry, renamed the Ministry of Agriculture and Food; 831913661,
  the State Agency "State Reserve and Wartime Stocks", which the Act names without "State Agency"); and 262 municipalities
  named "Община <name>", "Община град <name>" or "Столична община" (spaces ignored: "Бобов дол"). Left out because the
  match is not certain: Бяла (two municipalities of that name) and Батак (two buyer ЕИКs). The Ministry of Innovation and
  Growth (177549112) is the node `mig` in 2024–2025 and, renamed, `mid` in 2026.

## Corrections

Two values are almost certainly entry errors; they stay in the extract as published, and the site does not count them
(it shows the published value in the contract's details):

- `e274233-1`: Sofia Municipality, 2022, waste collection and street cleaning (procurement 00087-2021-0218) —
  6,938,481,985 leva (€3.55 bn), the same in TED (notice 506876-2022), while the procurement's other lot is worth
  73,921,836 leva;
- `e336694-1`: dog and cat food for a municipal animal shelter, 2023 — 165,333,000 leva (€84.5 m); the Agency's own
  2023 report leaves it out of its total (below).

Contract 132716 of 2024 (above) is kept at its published value: the "real" value the Agency used is not published.

## On the site

- Every contract counts in the totals of the categories, the suppliers' and the buyers' pages. Listed one by one: every
  contract of 2026, those of €100,000 or more of 2024–2025 (18,459 of 76,453, 94% of the value) and those of €1 m or more
  of 2016–2023 (7,101 of 212,526, 68% of the value). Listing every contract of 2024–2025, with its copy in its CPV
  category's file, would have grown `public/data` by 28.3 MB (89.97 → 118.23 MB); with the threshold it grows by 6.8 MB,
  to 96.8 MB (the contracts' files +7.8 MB, the supplier and buyer pages +2.1 MB, TED's list −3.1 MB).
- The CPV categories cover 2024–2026, the years with CPV codes.
- The list of suppliers opens on six bands of the value of their contracts (from €100 m or more to under €10,000) and loads
  one band, or all of them for a search.

## Refresh

```sh
python3 scripts/extract/procurement.py --download   # new OCDS days, yearly files and JSON days (the listing is fetched again after a day; files are cached, delete one to fetch it again)
python3 scripts/extract/procurement.py --download-eop   # only the JSON days (one request a second; 2,373 files took about 75 minutes)
python3 scripts/extract/procurement.py              # writes this folder; stops on any failed check (needs public/data/ministries-*.json from an earlier npm run data)
npm run data
```

The JSON days to fetch are set in `EOP_DAYS` of the extractor (now to 30 September 2026, like the OCDS files).

## Not here

- Every contract of 2024–2025 one by one (above); 2020–2023 from the JSON files (the yearly files are kept).
- Contracts outside the scope of the Public Procurement Act (`excl*.csv`, and the JSON files' flagged ones), payments
  under contracts (not published), the procedures of the JSON files (`поръчки`), and the subcontractors that OCDS and
  the JSON files name.
