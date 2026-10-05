# EU funds: programmes, the Recovery Plan and projects

What the EU programmes in Bulgaria have to spend and have paid, the Recovery and Resilience Plan by investment, and
every project of the EU-funded programmes with its beneficiary, place and payments. Used by `scripts/eufunds.ts`:
the lists "Programmes", "Recovery Plan" and "Projects" ("Lists" › "EU funds"); municipalities link to their
projects and the actuals' "Spent by: EU funds" slices to the programmes. Made by `scripts/extract/eu_funds.py`
from the downloads in `data/cache/eu-funds/` (not committed; `MANIFEST.md` there lists every file with its URL and
download date). All files were downloaded on 5 Oct 2026.

| File | Content | Source |
| --- | --- | --- |
| `programmes.csv` | One row per programme and fund (2014–2020: 12, 2021–2027: 11) at the latest month (31.08.2026): `period`, `programme` (the site's key), `fund` (ЕФРР, КФ, ЕСФ, ЕСФ+, ФЕПН) and `fund_en`, `programme_bg` (official name), `printed_name` (as in the file), budget (`budget_eu`, `budget_national`, `budget_total`), received from the European Commission (`received_prefinancing`, `received_claims`, `received_total`), paid to beneficiaries (`paid_eu`, `paid_national`, `paid_total`), expenditure `declared` to the Commission and `certified` in the annual accounts — all in euro, cumulative from the start of the programme | Ministry of Finance (directorate "Национален фонд"), data.egov.bg dataset 4226 "Финансово изпълнение на ЕФРР, КФ, ЕСФ и ФЕПНЛ за програмен период 2014–2020 г." (uri e87ba264-f445-4759-a248-8b16d67a7108, monthly since 2016-07) and dataset 18860 "Обобщена финансова информация за ЕФРР, ЕСФ+, КФ и ФСП 2021–2027" (uri 1c02f8f3-3293-40b1-9317-a4bee7af59c8, monthly since 2023-01) |
| `programmes-paid.csv` | Paid to date (`paid_total_EUR`) for each programme and fund at the end of every year in the data and at the latest month: 2014–2020 at 31.12.2016 … 31.12.2025 and 31.08.2026, 2021–2027 at 31.12.2023 … 31.12.2025 and 31.08.2026 | The same datasets, one monthly file per date |
| `rrp-investments.csv` | One row per investment and responsible body (58) at 31.08.2026: `code` (К1.И1 …), `name`, `body` (as written), budget and paid (EU, national, total), euro | Ministry of Finance, data.egov.bg dataset 18958 "Финансово изпълнение за План за възстановяване и устойчивост" (uri 045c6ffa-6cbd-4416-a299-dad41120681e, monthly since 2023-01) |
| `rrp-paid.csv` | Paid to date per investment at 31.12.2024, 31.12.2025 and 31.08.2026 (empty where the investment did not exist yet) | The same dataset |
| `rrp-totals.csv` | The Plan's totals at each year end (2023–2025), 31.07.2026 and 31.08.2026: budget, received from the Commission, paid | The same dataset |
| `projects.csv.gz` | One row per project of the EU-funded programmes in ИСУН: `code`, `programme` (ИСУН id), `fund`, `name`, `beneficiary` (ЕИК) and `beneficiary_name` (as published in that project), `beneficiary_kind` (`legal`, `sole-trader`, `person`), `start`, `end`, `status`, `value_EUR` (total value), `paid_EUR` (paid to date), `ebk_code` (the municipality where the project is carried out, when it is one), `place` (province, municipality and settlement as published, or the region or "България"; several joined by " \| ") | ИСУН 2020 public module, open-data API `GET https://2020.eufunds.bg/api/v1.0/opendata?ProgrammeId=…&ProgrammePeriodId=…` (one JSON file per programme; programme list at `/api/v1.0/opendata/criteria`) |
| `isun-programmes.csv` | The ИСУН programmes used: id, programme period, name, number of projects, date the file was generated | The same |

To refresh: `ISUN_PAUSE=240 python3 scripts/extract/eu_funds.py --download` (fetches only what is not cached: the
year ends and the latest two months of the Ministry of Finance datasets, and each ИСУН programme, 4 minutes apart),
then `python3 scripts/extract/eu_funds.py` (it stops if a programme is not downloaded) and `npm run data`. Delete a
cached file to fetch it again.

## Licences

The Ministry of Finance publishes the three datasets on data.egov.bg under the portal's terms no. 2, "Признание"
(CC BY: reuse with attribution); the site names the source under every list. ИСУН publishes its project data as
open data through its public API (no licence is stated). The European Commission's Kohesio
(kohesio.ec.europa.eu) was checked as an alternative source for projects: its API answers scripts, but its CSV
export stops at 1,000 rows and carries no beneficiary, programme or place, and its SPARQL endpoint refuses scripts
(HTTP 403), so it is not used.

## The programme tables (Ministry of Finance)

- **Masked numbers.** data.egov.bg replaces some ten-digit numbers with `**********` because it takes them for
  personal identity numbers (ЕГН). In the latest files this hits budgets such as the EU budget of
  "Конкурентоспособност и иновации в предприятията" (1,228,150,000) and the total of "Развитие на регионите". Each is
  rebuilt from the other two columns of its triple (EU + national = total; pre-financing + claims = received; EU +
  national paid = total paid) or, failing that, from the table's total row less the other rows. The script stops
  if a cell cannot be rebuilt.
- **Layouts.** The headings change over the years (the EU and national paid columns are "ЕС"/"НС" in 2016–2018 and
  two columns both called "Платено към …" later; "сертифицирани" appears from 2017), merged cells leave the
  programme or fund blank in 2016–2018, and 2023's Recovery Plan table puts code and body in one cell. Columns are
  found by their headings and programmes by a phrase of their name; every snapshot must list the same programmes
  and funds.
- **Checks (all pass).** In every snapshot used, the rows add up to the printed total row in every column (to €2,
  the printed totals being sums of unrounded figures). At 31.08.2026: 2014–2020 budget 9,289,597,543, paid
  9,177,503,710.25 (98.8%); 2021–2027 budget 12,866,171,166 (EU 10,705,921,309), paid 3,409,951,056.72 (26.5%).
- **Coverage.** The tables cover the programmes of the ERDF, CF, ESF/ESF+, FEAD and YEI only. The Just Transition Fund
  is in the 2021–2027 dataset's name but has no row of its own: all 485 JTF projects in ИСУН belong to "Развитие на
  регионите", which is one row labelled ERDF — but its budget (€3.32 bn with national co-financing) about equals the
  value of its ERDF and JTF projects in ИСУН (€1.54 bn + €1.72 bn), so the row seems to include the JTF. ИСУН shows
  €736 m paid to that programme at 5 Oct 2026 (€392 m ERDF, €344 m JTF), a third more than the table's €540 m at
  31 Aug 2026: €180 m of the difference is the JTF financial-instruments agreement with the Fund of Funds (Фонд
  мениджър на финансови инструменти в България), which started on 10 Sep 2026. Not covered: the maritime and
  fisheries, home-affairs and rural development programmes.
- **Payments before 2023 (2021–2027).** At 31.01.2023, €25.7 m had already been paid (competitiveness, human
  resources and food programmes); the first yearly figure of 2021–2027 is therefore "to 2023".
- **Negative years.** In 2025 and 2026 a few 2014–2020 programmes paid back more than they paid (recoveries and
  corrections at closure), so their yearly amount is negative.

## The Recovery and Resilience Plan (Ministry of Finance)

- Totals: at 31.07.2026 a budget of €6,889,637,015.55 and €3,904,598,733.26 paid (the figures given in
  `docs/data-depth.md`); at 31.08.2026 a budget of €7,069,286,096.35 (EU €6,418,058,095.05, national
  €651,228,001.30) and €5,133,086,662.03 paid (EU €4,598,313,793.55); received from the Commission
  €4,278,548,535. €1.23 bn was paid in August 2026 alone, before the Plan's deadline of 31 August 2026.
- The budget changes with every amendment of the Plan (31.12.2023: €7.37 bn; 31.12.2024: €7.31 bn;
  31.12.2025: €6.94 bn). Rows are matched across months by code, body and name; "К2.И2" changed its body from
  "БАН СНД" to "БАН СНД/КП" and is matched by code and name; nine investments are new in 2026 and have no earlier
  figure. The rows add up to the printed total at every date.

## ИСУН projects

- **Programmes.** Every programme in ИСУН that spends EU money: the cohesion-policy programmes of 2014–2020 and
  2021–2027, the SME Initiative, the Recovery and Resilience Plan, the maritime and fisheries programmes, the home
  affairs funds (AMIF, ISF, BMVI), the Brexit Adjustment Reserve, the Rural Development Programme measures managed
  in ИСУН and the CAP Strategic Plan's community-led local development. Left out: the EEA and Norway grants, the
  Swiss–Bulgarian programme and the national programmes in СУНИ (not EU money).
- **Access.** The API answers ordinary requests with browser-like headers (a browser User-Agent and Accept). It is
  rate-limited: after about ten calls 15 seconds apart, and again after 13 calls 4 minutes apart, it answered with an
  HTML page instead of data (HTTP 200, not 429). The downloader never tries to get past that page: it waits (30
  minutes, then 60) and stops if the page persists; it spaces the calls `ISUN_PAUSE` seconds apart (15 by default,
  240 for a full refresh). Fetching all 29 programmes with calls 4 minutes apart took about two and a half hours on
  5 Oct 2026.
- **Amounts.** `value_EUR` is the project's total value under its contract (grant and, where there is one, the
  beneficiary's own contribution); `paid_EUR` the amount actually paid to the beneficiary to date (EU and national
  money together, cumulative). ИСУН gives no EU share per project. Amounts are in euro.
- **Against the Ministry of Finance.** What ИСУН shows as paid to the projects of each 2014–2020 programme matches the
  programme's payments: Transport 1,746.0 vs 1,746.1 million euro, Regions in Growth 1,549.3 vs 1,549.4, Environment
  1,624.8 vs 1,626.8, Human Resources 1,375.7 vs 1,375.7, Good Governance 280.1 vs 280.1, Science and Education
  680.3 vs 682.0, FEAD 161.8 vs 161.8, Innovation and Competitiveness 1,662.2 vs 1,653.6 (+0.5%). For 2021–2027
  ИСУН (5 Oct) is 0–8% above the table, which is five weeks older (31 Aug): Competitiveness and
  Innovation 419.9 vs 419.9, Research 190.4 vs 190.4, Environment 348.7 vs 345.3, Transport Connectivity 637.7 vs
  615.9, Food 183.4 vs 177.2, Human Resources 824.5 vs 790.8, Education 315.1 vs 295.2, Technical Assistance 37.4 vs
  34.8 — and Development of the Regions 736.4 vs 540.5 (see "Coverage" above). The projects' total
  value is larger than the budgets (e.g. Transport: €3.32 bn of projects for a €1.76 bn programme), because it holds
  the whole value of projects carried over from or into another period, own contributions and terminated projects.
- **Natural persons and sole traders are never named.** A beneficiary without a 9- or 13-digit ЕИК is a natural
  person (ИСУН shows only their first name). Some natural persons do have a number — registered farmers ("ЗП …",
  "ЗС …") and others listed under their full name ("Иван Петров Иванов", "… - физическо лице"): a name that is a
  person's is treated as a natural person too — 971 beneficiaries with a number. The rules are in
  `scripts/extract/persons.py`, shared with the farm subsidies, the SEBRA payees and the procurement suppliers: a given
  name (from `../places/given-names.csv` and
  ИСУН's own natural persons) followed by a surname, or a three-part name, with nothing that marks an organisation
  (legal form, cooperative, school, municipality, church, community centre …); they err on the side of hiding, so a
  few firms named after their owner are hidden too. A sole trader ("ЕТ …", the owner's name is part of the firm) is
  treated the same way. Since October 2026 the rules also take hospitals, universities, schools, courts and law firms
  named after a person for organisations, and any name written "ЕТ …" for a sole trader's whatever else it holds (an
  address with "община", a practice's abbreviations): here one more sole trader is hidden, and a boarding school and a
  monastery ("Етрополски манастир") are named. For all of them the extract keeps no name, no ЕИК, no project name (it often names the
  beneficiary) and no settlement — only the programme, fund, dates, status, municipality and amounts. Personal
  identity numbers typed into any text are masked, and the build stops if one is left. A legal entity is named as
  in each project (one ЕИК can be written differently in different programmes, e.g. a ministry or one of its
  directorates).
- **Places.** The place of execution is "country, NUTS 1, NUTS 2, province, municipality, settlement"; a project in
  exactly one municipality gets its ЕБК code (all 265 municipalities match the register; ИСУН's "Добрич-град" is
  Добрич, "Столична" is Столична община, "София-Област"/"София-Окръг" is Софийска). Projects in several
  municipalities, a region or the whole country keep the published text instead.
- **Recovery Plan umbrella agreements.** The Plan's programme in ИСУН holds both the agreements under which a
  ministry or agency runs a scheme and the final recipients' projects under them, so summing it double counts. ИСУН
  does not mark them, and the scheme's projects come under other procedure numbers (e.g. the residential
  renovation agreement BG-RRP-4.001-0001 and the buildings under BG-RRP-4.023 and 4.039). The site
  (`umbrellaAgreement` in `scripts/eufunds.ts`) takes as umbrella agreements those of a ministry, state agency, the
  Development Bank, the National Culture Fund or the Academy of Sciences that have paid at most 1% of their value
  and are worth €30 m or more or are named after an investment ("C3.I2 …"): 25 agreements worth €8.49 bn of the €17.98 bn that all the Plan's projects add up to. They are hidden in the
  list until chosen. ИСУН records the payments on the final recipients' projects (the agreements show none), so
  the paid amounts do not double count: the Plan's projects show €4.90 bn paid, against €5.13 bn in the Ministry of
  Finance table (which also counts payments outside ИСУН projects, e.g. to the European Investment Fund). The Plan's
  totals are in `rrp-*.csv`.
