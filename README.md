# Бюджетът на България · Bulgaria's Budget

**Live: <https://damyor.github.io/bg-budget/>**

Interactive visualization of Bulgaria's public spending:

- **Spending** — a drill-down donut: click a slice to zoom into its subcategories, down to the finest level
  the published data allows. The list beside it is the readable twin of the chart (every subcategory, amount
  and share). Pick a year (2024–2027), a version (plan, actual, forecast) and a breakdown (by purpose, by
  ministry, by municipality, Eurostat COFOG). Amounts can be shown as totals, per person, as a share of GDP, or as
  *your* share of them; inside a municipality also per resident. "Over the years" under each category compares its
  plan and actual across all years.
- **Compare** — every category and year side by side in one table, in euro, per person, % of GDP or % of
  spending, with the share of each year's plan that was actually spent.
- **Lists** — the things behind the numbers, as searchable lists (search, filters, sort, a total for the rows shown
  and a link to every view):
  - *Investment projects*: the ministries' priority projects (2026–2028, and the 2025 plan against what was spent)
    and the 3,492 projects of the municipal investment programme. A ministry or municipality with projects links to
    them from "Spending", and each project links back to it.
  - *Who gets paid*: the state's 1.8 million individual payments of 5,000 leva (€2,556.46) or more through SEBRA,
    July 2022 – June 2026 (€150 bn): the largest payees of every ministry and fund by year and quarter, and of every
    paying unit; a search of all 65,588 payees, each with a page of who paid it, by unit and year; every payment of
    €1 m or more; and the totals by payment code against SEBRA's daily totals. Payments to the public sector are
    hidden until chosen; natural persons and sole traders are one group, never named. Ministries (and Sofia
    Municipality) link to their payees from "Spending".
  - *Health*: what the Health Insurance Fund paid each of 390 hospitals and other medical establishments, by year
    and month, January 2024 – August 2026 (hospital care, medical devices and medicines outside the clinical
    pathway), with the Ministry of Health's figures on the revenue, costs, debts, beds and staff of 165 of the 180 state
    and municipal hospitals it tracks (those matched to the fund's numbers); and what the fund paid for each medicine
    (by active ingredient), 2021 – July 2026.
    In the 2024 and 2025 actuals, Health › NHIF › Hospital care opens into regions and hospitals; municipalities link
    to their hospitals.
  - *EU funds*: the EU cohesion-policy programmes of 2014–2020 and 2021–2027 (€22.2 bn budget, €12.6 bn paid at
    31.08.2026; by year and by fund), the Recovery and Resilience Plan by investment (€7.07 bn, €5.13 bn paid), every
    project of the EU-funded programmes in ИСУН (82,531 projects: beneficiary, municipality, total value, paid to date)
    and the farm subsidies of the State Fund Agriculture (financial years 2015–2017 and 2021–2025) by measure, by
    municipality and by recipient — legal entities of €25,000 or more by name, natural persons and sole traders only
    counted and totalled. The actuals' "Spent by: EU funds" slices link to the programmes and the Plan; municipalities
    link to their EU projects and farm subsidies.
  - *Public procurement*: the contracts buyers sign after a procurement procedure — 239,431 contracts of 2016–2023 and
    2026 (to 30 September; €58.5 bn excluding VAT) from the Public Procurement Agency, with every 2026 contract and
    the large earlier ones one by one, totals by CPV category, a search of all 20,755 suppliers (who buys from each, by
    buyer and year, with a link to its SEBRA payments where the name matches exactly, and the number and value of its
    EU-funded projects where the ЕИК does) and every buyer's page (its suppliers by year). For 2024–2025, which the
    agency has not published as open data, the 33,408 award notices of Bulgarian buyers in TED (above the EU
    thresholds) are a separate, partial list. 45 ministries and agencies (43 in 2026) and 262 municipalities link to
    their buyer page from "Spending".
- **Clip** — pick any category (search or click) and get a short animated video that starts from total
  spending and zooms in level by level. Rendered in the browser, exported as H.264 MP4 (9:16, 1:1 or 16:9) for
  TikTok, Reels, Shorts, Facebook and YouTube.
- **My money** — estimates what a salaried person pays into public budgets in a year (income tax, own and
  employer contributions, VAT, excise on fuel, tobacco and alcohol) under the rules of 2024, 2025, 2026 or the
  2027 proposals, compares the years, and splits the taxes across that year's spending (plan or actual).
- **About** — sources and methodology.

Bulgarian is the default language; everything is also available in English.

## Running it

```sh
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests (datasets, series, tree folding, zoom geometry, formatting, tax rules, clip timeline and titles, programmes, municipalities, lists and their links, projects, SEBRA payees and payments, health, EU funds and farm subsidies, procurement)
npm run build    # static site in dist/
```

The build is plain static files (hash routing, no server needed) — deploy `dist/` to GitHub Pages, Netlify,
Cloudflare Pages, or any static host. If it lives under a sub-path, build with `npx vite build --base=/sub/path/`.

Every push to `main` is tested, built and published to GitHub Pages by `.github/workflows/deploy.yml`, which sets
the sub-path from the Pages settings (`/bg-budget/` now, `/` if a custom domain is added).

Video export needs WebCodecs (Chrome, Edge, Safari 17+, Firefox 130+). It uses H.264 when the browser can
encode it and falls back to VP9/AV1.

## Data

Datasets are JSON trees in `public/data/` (listed in `public/data/index.json`), built by:

```sh
npm run data              # rebuild every dataset, series and list from data/sources/ (Eurostat responses cached in data/raw/)
npm run data -- --refresh # download the Eurostat data again first
```

Every node has an id (used in links), Bulgarian and English names, an amount in euro and optional children.
The build validates that children add up to their parent (within rounding). Each dataset also records its year,
version (`stage`: law, draft, forecast, report), breakdown (`family`), the GDP and population of its year and the
currency of its sources. Datasets of one family share node ids, and `public/data/series-<family>.json` holds the
value of every node that appears in more than one of them — that is what the comparisons read. `public/data/about.json`
holds every dataset's description, sources and totals without its tree, for the About page.

| Dataset | Source | Levels |
| --- | --- | --- |
| **Budget 2024 / 2025 / 2026** (plan) | Consolidated fiscal programme (КФП) by function and sub-function from the medium-term budget forecasts (2024, 2025: explanatory memorandum to the 2025 budget bill, РМС № 88/2025; 2026: РМС № 597/2026); the year's Health Insurance Fund and Social Security budget acts; the State Budget Act's per-municipality funding of state-delegated activities (2024/2025: art. 54; 2026: art. 52); for 2026 also the subsidy to each of the 33 state universities and the transfer to the Academy of Sciences (art. 16(4)) | area → function → fund / item → … → municipality (up to 6 levels) |
| **2027 forecast** | КФП 2027 forecast by function and sub-function (РМС № 597/2026). Replaced by the draft budget once it is submitted (deadline 31 October 2026) | area → function → sub-function |
| **2024 / 2025 actual** | Reports on the execution of the State Budget (РМС № 673/2025 and № 737/2026): КФП expenditure by function and group, split by budget (state budget, social security, municipalities, EU funds …) and into current/capital spending. Health: the Health Insurance Fund's own execution report by expense line (2025 preliminary), on the same nodes as the plans; its hospital-care line is split by region (RZOK) and by each of the 383 / 388 establishments the fund paid, from its monthly reports per hospital (99.8% / 99.9% of the line; the rest is a separate "not attributed" slice) | area → function → sub-function → spent by → type of expense; Health › NHIF › hospital care → region → hospital |
| **Ministries 2024 / 2025 / 2026** (plan) and **2025** (actual) | State Budget Acts, para. 2 of each spending unit's article (2024/2025: art. 2–49, 48 units; 2026: art. 2–47, 46 units) — ministries and agencies by policy / functional area. For the 2025 and 2026 plans also every budget programme of the 46 / 44 programme-format units (all but Parliament and the judiciary), split into departmental staff, running and capital costs and the named administered items (benefits, subsidies, contributions …), from Annex 1 to the Council of Ministers decree on implementing the budget (ПМС № 28/2025, № 102/2026). The 2025 actual comes from the report on the 2025 State Budget (attachment 4 to РМС № 737/2026); the 2024 report tables are published only as scans. Policy areas get ids from their names and programmes from their codes (`p1500-03-01`), so the same area or programme is comparable across years | ministry → policy area → programme → staff / running costs / capital / administered item → part (up to 5 levels) |
| **Municipalities 2024 / 2025 / 2026** (plan) | State Budget Acts, the central budget's transfers to each of the 265 municipalities by type (2024/2025: art. 53; 2026: art. 51) — general subsidy for state-delegated activities, general equalising subsidy, targeted capital subsidy, winter maintenance of municipal roads, targeted transfer for the minimum wage — and the delegated-activities subsidy by function (art. 54 / 52). ЕБК codes from the Unified Budget Classification 2026; residents per municipality from NSI (31 December of the previous year), for amounts per resident. Municipality ids (`plovdiv-plovdiv`) come from `scripts/lib/places.ts` and are the same in every year and in the "by purpose" trees (`ed-municipal-plovdiv-plovdiv`) | province → municipality → type of transfer → function → mayors / staff (up to 5 levels) |
| **Eurostat 2024** (actual) | Eurostat `gov_10a_exp` — general government expenditure by function (COFOG) and by economic transaction | area → function → type of expense |

All "by purpose" datasets use the same eight top-level areas (same ids, order and colours), so switching year or
version keeps you in the same category. The 2024 and 2025 sources are in leva and are converted at the fixed rate
of 1.95583. The "Ministries" datasets cover only the State Budget Act's spending units (2026: €13.3 bn of
€56.8 bn), and "Municipalities" only the central budget's transfers to municipalities (2026: €4.93 bn;
municipalities' own revenue and EU funds are not in it); their shares "of all spending" and personal shares are
computed against all public spending of the year (`publicTotal`). Where an itemised source covers only part of a
function (e.g. the Health Insurance Fund within all health spending), the difference is shown as an explicit
"other" item, so every level still adds up to its parent.

GDP is Eurostat's for past years and the Ministry of Finance autumn 2026 forecast for 2026–2027; population is
taken at the start of each year (`data/sources/macro/`). The source tables are CSV extracts of the official
documents in `data/sources/` — one folder per budget or report year plus `kfp/`, `macro/` and `places/` (the
municipalities' ЕБК codes and residents), `projects/` (named capital projects), `sebra/` (the SEBRA payments,
aggregated), `health/` (hospitals and medicines), `eu-funds/` (EU programmes, the Recovery Plan, ИСУН projects),
`cap/` (farm subsidies) and `procurement/` (contracts, suppliers, buyers, TED notices), each with a README naming the
exact documents and articles. Large raw downloads are cached in
`data/cache/` (not committed); where a CSV was produced by a script, the script is in `scripts/extract/` and the
folder's README says how to run it.

The ministries' transfers to the universities and the Academy of Sciences (2026: €838.7 m, art. 11(4) and 16(4)) are
not part of the ministries' spending in the act, so in "Ministries" they appear only in a note on the paying
ministry; the 33 universities and the Academy are shown in "Budget 2026" (Education › State universities, and Science).

### Lists (projects, payments, hospitals, medicines, EU funds, contracts)

Things that do not add up to the budget — projects, individual payments, hospitals, medicines, EU programmes,
projects, farm subsidies and procurement contracts — are
**lists**, never tree nodes or donut slices: `public/data/lists/<id>.json`, described in `public/data/lists/index.json`
and shown on the "Lists" page, one section per group (`#/lists?l=<list>&q=<search>&f=<column>:<value>,…&s=<sort>&d=<dataset>`).
The format (`ListFile` in `src/lib/types.ts`) is one for all lists:

- metadata: Bulgarian and English title and description, sources, caveats, the date the figures describe (`asOf`)
  and the download date, totals over all rows, the default sort and which totals the summary shows;
- typed columns: `text`, `code`, `money` (euro), `number`, `percent`, `date`, `series` (one amount per period, e.g.
  2026–2028 or months), `node` (an id in a dataset family, shown as a link into "Spending"), `category` (an id with
  bilingual names), `url`, `breakdown` (the parts of a row's amount — e.g. who paid a payee — each with an amount per
  period, optionally grouped; shown as a small table in the row's details, which can be sorted by a period: a buyer's
  largest suppliers in one year); names of node, category and breakdown values are bilingual, or one plain string
  where they are the same in both languages (names as published); a text or code column can `link` to another list
  filtered on a value of its row (a contract's buyer → the buyer's page); each can be searchable, a filter,
  totalled, shown only in a row's details, or hidden, and can name its source; a category filter can leave values out
  until they are chosen (`exclude`: the public sector in the payment lists), and a column filtered to one value is not
  shown; a series or breakdown can name its periods (`periodLabels`: months, "2026 (I–VIII)"), a breakdown whose
  periods are not parts of one amount shows no total across them (`total: false`: a fund's budget and paid) and a
  series can hold counts instead of euro (`unit: 'count'`: beds, staff); series shown only in the details form one
  small table per run of equal periods, after a heading (`section`), with the periods down the side if `transpose`
  (months);
- rows as arrays in column order; a list whose rows exceed ~1.5 MB of JSON is split into shards by a filter column
  (`lists/<id>/<value>.json`), and the page fetches only the shards the filters need; a list can also be split by a
  hash of its key (`hash`: one payee's page is one small file), load every shard once a search is typed (`search`:
  the 65,588 payees) or once a filter on another column is set (`filters`: the EU projects of a municipality, in a
  list split by programme), or ask for a value of its shard column to be chosen first however small it is (`choose`:
  the contracts, by year, 2026 by quarter); in a shard, values that repeat (a scheme's name shared by thousands of
  projects, a municipality's id) are stored once (`texts`), the shard column's value once (`value`) and a row's empty
  cells at its end not at all, and they are put back when it loads;
- a row's title can link to another list filtered on one of its values (`rowLink`: a payee's page); lists reached only
  that way are `hidden` from the picker and lead `back` to their search;
- links from tree nodes: a list says which column links to which dataset family, years and stages — node ids, or other
  values with a map to node ids (`nodes`: SEBRA system → ministry; one value can stand for several nodes: every
  "EU funds" slice → the EU programmes), counting only the rows of its `filters` (a year) that
  the list shows by default — and the build writes each linked node's row count and total into the index ("34
  investment projects, €842 m in 2026 →", "Paid to companies, organisations and people: €510 m in 2025 →"), and
  each dataset's own links into `lists/links/<dataset>.json`, the small file "Spending" loads;
- every link is checked by `npm run data`, the way the site follows it: a tree node's link opens its list on as many
  rows as it says (not on "choose a value first"), every node a list's cells link to exists in each dataset the list
  can be opened from, and every link from a row or a cell to another list (a payee's or a supplier's page, a buyer, a
  programme's projects) finds rows there.

| List | Source | Rows |
| --- | --- | --- |
| **Priority investment projects 2026–2028** | State Budget Act 2026, Annex 2 to art. 110 (capital spending 2026, forecasts 2027–2028), with each project's 2025 plan and actual from the 2025 report where the code matches | 199 projects, €1.44 bn in 2026; linked from the responsible ministry in "Ministries 2026" |
| **Priority investment projects 2025 — plan and actual** | 2025 report, attachment 6, section I (РМС № 737/2026); the plan equals the 2025 Act's Annex 2 | 176 projects, plan €1.50 bn, actual €1.23 bn; linked from "Ministries 2025" (plan) and "Ministries 2025 (actual)" |
| **Reserve investment projects 2025** | The same attachment, section II | 228 rows |
| **Investment Programme for Municipal Projects** | Three sources joined on the project code: 2025 report, attachment 7 (paid in 2025), ПМС № 103/2026 (2026 forecast, later years), ipop.mrrb.bg at 5.10.2026 (agreement, paid to date by payer) | 3,492 projects in 264 municipalities; linked from each municipality in "Municipalities 2025/2026" |
| **Who gets paid — by payer** | SEBRA individual payments of 5,000 leva or more (data.egov.bg dataset 20439, Ministry of e-Government, CC0), 01.07.2022–30.06.2026 | The 150 largest payees outside the public sector and the 30 largest public bodies of each of 109 payer systems in each year, by quarter, the rest in one row per class (47,895 rows, all 1,801,465 payments, €149.98 bn); linked from every ministry in "Ministries 2024–2026" and from Sofia in "Municipalities 2024–2026" |
| **Who gets paid — by paying unit** | The same | Every payee among the 8 + 4 largest of one of 3,697 paying units in some year, by year (53,117 rows) |
| **Payees** and each payee's page | The same | All 65,588 payees (search), and for each the units that paid it, by year; natural persons and sole traders (by the rules of the EU-funds lists) are one group of 480,006 payments, €4.31 bn |
| **The largest payments** | The same | 18,878 single payments of €1 m or more, with date, payer, payee, payment code and purpose; linked from the ministries that made them in "Ministries 2024–2026" |
| **Payments by type** | The same, and SEBRA's daily totals by system and payment code (dataset 7806, Ministry of Finance) from 2024 | 2,841 rows: payer system × payment code × year, by quarter, with the share of all SEBRA payments of that code the list covers |
| **Hospitals** | NHIF monthly reports of payments by medical establishment (nhif.bg/bg/hospitals/bmp, 95 PDFs, Jan 2024 – Aug 2026: hospital care, medical devices and medicines outside the clinical-pathway price); Ministry of Health quarterly financial indicators of hospitals (Q4 2019–2024, Q3 2025), joined by name; municipality from the registration number (EKATTE code) | 390 establishments: payments by year (€2.74 bn 2024, €3.13 bn 2025, €2.16 bn Jan–Aug 2026) and month; revenue, costs, liabilities, overdue liabilities, patients, staff and beds for 165 state and municipal hospitals; linked from Health › NHIF › Hospital care in "Budget 2024–2026" and the 2024 and 2025 actuals, from each hospital's node in those actuals, and from the 113 municipalities of 384 of them in "Municipalities 2024–2026" |
| **Medicines** | NHIF medicine reports 1 (home treatment, pharmacies) and 7 (cancer and coagulopathy medicines paid to hospitals outside the pathway price), 2021 – July 2026 (2025 from the annual reports) | 691 active ingredients (with medical devices and dietary foods): reimbursed amounts by year (€1.65 bn in 2025), ATC codes, patients (hospital, 2025); linked from Health › NHIF › Medicines, medical devices & dietary foods in "Budget 2024–2026" and the 2024 and 2025 actuals |
| **EU programmes: budget and payments** | Ministry of Finance, monthly tables on data.egov.bg (4226: ERDF, CF, ESF, FEAD 2014–2020; 18860: ERDF, ESF+, CF 2021–2027; CC BY) at 31.08.2026 and every year end; the programmes' projects in ИСУН | 18 programmes (23 programme × fund rows): budget €22.2 bn (EU €18.8 bn), paid €12.6 bn, paid by year and by fund; each links to its projects; linked from every "Spent by: EU funds" slice of the 2024 and 2025 actuals |
| **Recovery and Resilience Plan: investments** | Ministry of Finance, data.egov.bg 18958 (CC BY), 31.08.2026 and year ends | 58 investments: budget €7.07 bn, paid €5.13 bn (€3.90 bn at 31.07.2026), paid by year; linked from the same slices |
| **EU-funded projects** | ИСУН 2020 (UMIS, the EU-funds information system) open-data API (2020.eufunds.bg), 5.10.2026: 29 programmes of 2014–2020, 2021–2027, the Recovery Plan, fisheries, home affairs and rural development | 82,531 projects: beneficiary (legal entities by name, natural persons and sole traders not named), municipality, status, total value, paid to date; split by programme; linked from every municipality in "Municipalities 2024–2026" |
| **Farm subsidies by measure** | State Fund Agriculture: data.egov.bg org 56 (FY2015–2017, 2021–2023; CC BY) and seu.dfz.bg (FY2024–2025) | 485 measures and interventions, paid by financial year (€1.14–1.64 bn a year): direct payments, market measures, rural development, national aid |
| **Who gets farm subsidies** | The same | Every legal entity that received €25,000 or more in a financial year (34,048 rows), and the rest — natural persons, sole traders, smaller legal entities — as one row per place and year; linked from every municipality in "Municipalities 2024" and "2025" (financial years 2024 and 2025) |
| **Farm subsidies by municipality** | seu.dfz.bg, FY2024–2025 | 265 municipalities: received by legal entities, sole traders and natural persons |
| **Public procurement contracts** | Public Procurement Agency (АОП), data.egov.bg organisation 502: yearly contract and amendment files 2016–2025 (CC0 / CC BY) and the daily OCDS releases of ЦАИС ЕОП, 01.01–30.09.2026 (CC0) | 34,632 contracts one by one, by year (2026 by quarter): all 26,719 of the 2026 award notices (€9.88 bn), the large 2026 amendments of earlier contracts, the old register's 186 of 2024–2025 and the 7,101 of €1 m or more of 2016–2023; supplier and buyer (linked to their pages), value excl. VAT, date, type, CPV category and procedure (2026), offers, amendments |
| **By category (CPV)** | The same (2026) and TED (2024–2025) | 45 CPV divisions: value and count of the 2026 contracts and of the TED notices of 2024 and 2025 |
| **Suppliers** and each supplier's page | The same | All 20,755 suppliers (natural persons and sole traders one group, never named): contracts by buyer and year, 2016–2023 and 2026; TED notices won alone; a link to the SEBRA payee of exactly the same name (6,297); the number and value of the EU projects of the same ЕИК (4,713) |
| **Buyers** and each buyer's page | The same | All 3,737 buyers, by year; a page with the 30 largest suppliers and the 10 largest of each year (sortable by year); linked from 45 ministries and agencies in "Ministries 2024/2025" (43 in 2026) and 262 municipalities in "Municipalities 2024–2026" (register `buyer-nodes.csv`) |
| **TED award notices 2024–2025** | TED API v3, award notices of Bulgarian buyers (above the EU thresholds) | A partial list for the years the agency has not published: 14,311 notices of €100,000 or more (of 33,408; €16.89 bn in 2024, €15.70 bn in 2025) |

The extracts and their checks are described in `data/sources/projects/README.md`, `data/sources/sebra/README.md`,
`data/sources/health/README.md` (including the NHIF's "all rights reserved" notice and why only figures are reused),
`data/sources/eu-funds/README.md`, `data/sources/cap/README.md` and `data/sources/procurement/README.md`.

How much deeper the published data goes (programmes of every ministry, named projects, individual payments …) and
where to get it is surveyed in [`docs/data-depth.md`](docs/data-depth.md).

## Code map

```
scripts/            data pipeline (Node, runs TypeScript directly)
scripts/build-data.ts    entry point of `npm run data`: builds and checks every dataset, the series and the lists
scripts/budgetPlan.ts    plans and forecasts by purpose (one builder for every year)
scripts/budgetReport.ts  actual outturn by purpose, from the State Budget execution reports
scripts/ministries.ts    ministries by policy area, budget programme and programme line (law + decree)
scripts/eurostat.ts      the Eurostat COFOG dataset (API responses cached in data/raw/)
scripts/municipalities.ts transfers from the central budget to each municipality, by type and function
scripts/projects.ts      the project lists (national priority projects, municipal investment programme)
scripts/payments.ts      the payment lists ("Who gets paid": by payer, by unit, payees, a payee's page, largest, by type)
scripts/health.ts        hospitals (NHIF payments by month, Ministry of Health finances; the hospital-care line of the
                         actuals by region and hospital) and medicines by active ingredient
scripts/eufunds.ts       EU funds: the programmes, the Recovery Plan's investments and the ИСУН projects
scripts/cap.ts           farm subsidies: by measure, by recipient (legal entities by name, the rest by place), by municipality
scripts/procurement.ts   public procurement: contracts, by CPV category, suppliers and buyers with their pages, TED notices
scripts/lib/lists.ts     list building: cell checks against column types, totals, shards, node links, index, each
                         dataset's links file, and the check that every link between trees and lists resolves
scripts/lib/sebra.ts     SEBRA payments: reading the published rows, payee names, grouping spellings, classes
scripts/lib/sebra-labels.ts names of the SEBRA payer systems, payment codes and classes of payees
scripts/lib/beneficiaries.ts classes of EU-funds and farm-subsidy beneficiaries (cooperatives, companies, public bodies …)
scripts/lib/places.ts    provinces and municipalities: names, the one id scheme, the register (ЕБК codes, residents)
scripts/lib/kfp.ts       the КФП function skeleton shared by all years, leva → euro
scripts/lib/ministries-labels.ts names of the spending units, their policy areas and the projects' responsible institutions
scripts/lib/             also CSV reading (csv.ts), tree building (tree-builder.ts), GDP and population (macro.ts),
                         COFOG labels and Eurostat's JSON-stat (cofog.ts, jsonstat.ts)
scripts/extract/         one-off extractors that turn official documents into data/sources/ CSVs (Python; the SEBRA
                         downloader and extractor are TypeScript: sebra-download.ts, sebra.ts; the health ones
                         download their own files: nhif_hospitals.py, moh_hospitals.py, nhif_medicines.py; so do
                         eu_funds.py, cap.py and procurement.py with --download; persons.py holds the rules for
                         keeping natural persons and sole traders unnamed, shared by those three and the SEBRA
                         extractor)
src/lib/            data loading, tree indexing/search, formatting, i18n, palette, tax calculator (rules per year)
src/lib/donutLayout.ts   zoom geometry shared by the SVG chart and the video renderer
src/lib/listData.ts      lists: search, filters, sorting, totals, shards, URL state (shared with the build)
src/lib/lists.ts         lists: loading the index, a dataset's links, list files and shards
src/components/     donut, list, breadcrumbs, search, dataset picker, trend chart, segmented control,
                    list view (table / cards), links from a node to its list rows
src/clip/           clip timeline, canvas renderer, MP4 encoder (Mediabunny + WebCodecs)
src/pages/          Spending, Compare, Lists (projects, payments, health, EU funds, procurement), My money, Clip, About
```

Chart colours come from a palette validated for colour-vision deficiencies (adjacent-pair checks in light and
dark mode); slices beyond the 8th, and slices under 1.5%, are grouped into a grey "Other" bucket that can be
opened like any category.
