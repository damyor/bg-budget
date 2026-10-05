# How deep does Bulgarian public-spending data go? A verified inventory (2–4 Oct 2026)

## Short answer

Yes, much more detail is online than the site uses today. Below the levels the site already has, there are official sources for all of the following:

- **Every ministry and agency, down to budget programme** (187 programmes in 44 spending units), each split into staff, running costs and capital, plus named benefit lines such as monthly social assistance or heating aid.
- **Money per university** and **money per municipality by transfer type**.
- **About 3,700 named capital projects**, with planned and paid amounts.
- **Monthly payments to each hospital** and reimbursements for each medicine.
- **EU-funded projects and contracts**, and **public-procurement contracts**.
- **Individual state payments of 5,000 lv (€2,556.46) or more**, each with the payee's name, date, amount and payment purpose. Quarterly files cover July 2022 onward (the series started in June 2024), and a one-off release covers June 2006 to June 2022.

Most of this can be downloaded by a script.

**The one big gap:** no one publishes a national table of spending by ЕБК *activity* (the 3-digit codes such as "kindergartens" or "street lighting"). That level exists only in each municipality's and each school's own reports, in mixed formats.

**How things were checked.** Unless a claim is marked otherwise, it was opened on 2–4 Oct 2026, either by me or by a research sub-agent using curl.

- **[S]** marks a claim checked only by a sub-agent.
- **UNVERIFIED** marks anything nobody opened.
- "Script" means curl/HTTP works.
- "Browser" means a human browser session is needed.

**What "new" means here.** The site already uses:

- КФП spending by function and sub-function, split by budget and by current/capital spending;
- the Health Insurance Fund (NHIF) and State Social Security (ДОО) budget-act tables;
- State Budget Act (ЗДБ) art. 52: state-delegated activities by municipality and function;
- ЗДБ art. 2–47: the 46 spending units by policy area, and programmes for 8 of them;
- Eurostat COFOG level 2 by economic transaction.

---

## 1. The depth ladder (level 0 = total, level 10 = single payment)

| Level | Unit of analysis and classification | Best source(s) | Years | Machine-readable? | On the site? |
|---|---|---|---|---|---|
| 0 | Total public spending (КФП, or Eurostat S13) | MoF КФП: monthly CSVs on data.egov.bg; annual XLS on minfin.bg; medium-term forecast | Monthly 2018–Aug 2026 (two 2016 files); annual 2014–2025 | Yes (data.egov.bg script; minfin.bg browser) | Used |
| 1 | Function: 9 ЕБК functions / 10 COFOG divisions | Medium-term forecast (РМС 597/2026); annual execution report; Eurostat gov_10a_exp | Plan 2025–2028; actuals to 2025 (MoF) / 2024 (Eurostat) | Yes | Used |
| 2 | Sub-function = ЕБК group (23–24; the site shows the КФП's 23) or COFOG group (~70) × budget (state / municipal / social security / EU funds) × current/capital; Eurostat × transaction | Same, plus Eurostat **by subsector** (S1311 central, S1313 local, S1314 social security) [S] | Same | Yes | Used, except the subsector split |
| 3a | Spending unit: 46 State Budget Act units, NHIF, ДОО funds | ЗДБ art. 2–47; NHIF and ДОО budget acts; **2025 actuals per unit, by economic category, with named subsidy recipients** (execution report annex pr.4) | 2025 actual, 2026 plan | Yes (XLSX, State Gazette HTML) | Plan used; per-unit actuals are new |
| 3b | Municipality (265) × transfer type | ЗДБ art. 52 (used); **ЗДБ art. 51** per municipality: equalising subsidy, capital subsidy, winter roads, other [S]; MoF "ФО" letters with per-municipality XLS annexes (browser) | 2026 | Yes | Art. 51 is new |
| 4 | Policy area (98) → budget programme (187 in 44 units) | **ПМС № 102/2026, Annex 1** covers all 44 programme-format units; draft programme budgets attached to the bill (45 PDFs) | 2026 (and 2025 via ПМС 28/2025, UNVERIFIED in detail) | Yes: DOCX on strategy.bg, PDF on dv.parliament.bg | 8 of 44 units today |
| 5 | Programme × economic element: staff / running costs / capital + **named "administered" items** (e.g. monthly social assistance €78.6m, heating aid €49.5m); whole КФП by **ЕБК paragraph (42) and sub-paragraph (179)** × budget | ПМС 102 Annex 1 (plan); ministries' quarterly programme reports, forms Б.1/Б.2 (actuals); annex pr.5 of the 2025 report (КФП by paragraph) | 2026 plan; 2026 quarterly actuals; 2025 actual | Yes (DOCX, XLSX/XLSM) | New |
| 6 | ЕБК **activity** (298 3-digit codes) × paragraph | Only each municipality's own monthly/quarterly cash reports (MoF forms B1/B3) and each school's own budget. No central table found | Varies; Sofia 2018–2026, Burgas back to 2007, Plovdiv 2017–2026 [S] | Partly (.xls for Sofia and Burgas, PDF for Varna) | New, but fragmented |
| 7 | Institution / entity: each university (33 + Academy of Sciences); each hospital (~382); each SEBRA payer unit (2,611, incl. Sofia's schools); per-school allocations (Plovdiv); cost standards per pupil/class/school | ЗДБ art. 16(4) and 11(4); NHIF monthly per hospital [S]; Ministry of Health quarterly hospital finances [S]; SEBRA individual payments; РМС 497/2026 standards [S] | 2026 (universities); 2015–2026 (NHIF); 2019–Q3 2025 (Ministry of Health) | Yes (HTML, PDF with text, XLSX, CSV) | New |
| 8 | Project | Priority strategic investment projects (199 for 2026; 170 + 228 in 2025 with plan vs actual); municipal investment programme (3,492 projects); EU projects (ИСУН API [S]; Kohesio 48,706 Bulgarian projects [S]); Recovery Plan investments (MoF monthly) and its 14,795 projects in ИСУН [S]; CAP beneficiary × intervention [S]; municipal capital lists (Sofia ~1,390 rows [S]) | 2014–2026 | Yes (XLSX, CSV, JSON API, PDF) | New |
| 9 | Contract | Procurement: daily OCDS JSON since 1 Jan 2026 [S]; yearly contract CSVs 2016–2023 [S]; TED API for above-threshold contracts [S]. EU-funded contracts, beneficiary → contractor (ИСУН) [S] | 2016–2023, then 2026; **2024–25 gap** except TED | Yes | New |
| 10 | Single payment | **SEBRA individual payments ≥ 5,000 lv** (quarterly, Q3 2022–Q2 2026); one-off release 06.06.2006–28.06.2022 (official ZIP broken; third-party mirror); daily SEBRA totals by spending unit × payment code since May 2015; NHIF payments per hospital per month; medicine reimbursement by product × diagnosis | 2006–2026 | Yes (CSV/JSON via the data.egov.bg API) | New |

The site's tree is built on the КФП functions (levels 0–2). Levels 3–5 follow a different, organisational tree: spending unit → programme → economic element. Programme codes come from РМС № 478/24.06.2026 and are stable for 2026–2030. Levels 8–10 are "examples inside" a slice rather than parts that add up to it, because project and payment amounts are commitments or cash flows that do not map onto КФП functions.

---

## 2. Findings by area

### 2.1 The Unified Budget Classification (ЕБК): how deep the classification goes
- **Source:** minfin.bg/bg/1037, which has every ЕБК from 2002 to 2026. The 2026 edition is a 2.4 MB ZIP and is browser-only. A script-friendly copy of the 2026 XLSX and PDF is at comsy54.bg (a software vendor). I parsed it.
- **Functional classification (Section VI):** 9 functions → 23 groups in the summary list (24 in the detailed list) → **298 active activities** with 3-digit codes, plus 4 closed ones.
  - The groups are the КФП sub-functions the site already shows (23 on the site).
  - Example activities: 311 Детски градини, 322 Неспециализирани училища, 326 Професионални гимназии, 341 Университети, 122 Общинска администрация.
  - Municipal reports write the activity as 4 digits: the function digit followed by the activity, e.g. 3322 [S].
- **Economic classification (Section II, expenditure):** **42 paragraphs** (e.g. 01-00 salaries, 10-00 running costs, 42-00 transfers to households, 52-00 purchase of fixed assets) and **179 active sub-paragraphs**.
- **Organisation codes (Section VII):** central units (e.g. 1500 = Ministry of Labour and Social Policy), social security funds (5500/5591/5592/5600) and the 265 municipalities (51xx–…).
  - The 3-digit SEBRA system code is the ЕБК code divided by 100 (SEBRA 015 = ЕБК 1500). That is the join key between payments and budgets.
- **Who publishes data at activity or paragraph level:**
  - **Activity × paragraph:** only municipalities (B1 monthly / B3 quarterly forms on their own sites) and schools with delegated budgets (their own sites).
  - **Paragraph only:** the КФП as a whole for 2025 (annex pr.5, 1,736 rows × 71 columns, by budget); ministries' monthly cash reports; NHIF's B1/B3 files.
  - **Economic categories with named subsidy recipients:** each State Budget unit, in the 2025 report (annex pr.4, 2,823 rows).
  - I found **no national table by activity**. The MoF collects municipal reports in its system for municipalities (ИСО) but publishes only the art. 130г indicators (§2.3). This was a broad but not exhaustive search.

### 2.2 Programme budgets and performance reports
- **Central sources:**
  1. **ПМС № 102 of 12.08.2026 on executing the 2026 budget, Annex 1.**
     - Published in ДВ 74/18.08.2026: dv.parliament.bg idMat=245362, annex PDF https://dv.parliament.bg/DVPics/2026/74_26/4489_1.pdf (73 pages). DOCX copy: https://strategy.bg/download/1325203.
     - Covers **44 spending units, 98 policy/functional areas and 187 programmes** in euro. All programme-format units are included except the National Assembly and the judiciary.
     - For each programme: departmental spending (staff / running costs / capital), plus "administered" items by name.
     - Parsed totals: €12.38bn across 43 units. The Council of Ministers' total is laid out differently and was not parsed.
     - Policy totals match the adopted law (spot-checked for the Ministry of Labour and Social Policy).
     - This is the source that takes the site from 8 ministries to all of them. The bill's programme budgets were drafts, which is why only 8 matched the law.
  2. **Bill 52-602-01-19 on parliament.bg (ZIP).** 45 PDF programme budgets (one per first-level unit; the judiciary's comes separately as a 7z). They contain narrative, tables and performance indicators, but at bill-stage amounts.
  3. **Programme-execution review for 2025** for all programme-format units.
     - File: pril_3.docx inside https://www.minfin.bg/upload/65173/Prilojenia+-+doklad+-+izpulnenie+-+budget+2025.zip (browser-only). Its table of contents has about 47 entries, one per unit; it is about 1 MB of text.
     - Mostly narrative on results achieved. How detailed its tables are is UNVERIFIED.
     - It is not among the strategy.bg attachments of РМС 737/2026.
  4. **MoF methodology page minfin.bg/bg/241.** It holds the instructions behind the reports: БЮ № 1/02.04.2026 (quarterly programme expenditure, forms Б.1 and Б.2) and БЮ № 3/10.07.2026 (semi-annual detailed performance report). It does **not** hold the reports themselves, and no central repository of the reports was found.
- **Ministries' own sites:**
  - Each ministry publishes Б.1 as XLSX: policy/programme × law / revised plan / actual for each quarter.
  - Б.2 ("Разшифровка") is XLSM: departmental and administered spending per programme.
  - Semi-annual and annual performance reports (PDF/DOCX) carry the indicators.
  - Examples:
    - Interior Ministry: https://mvr.bg/upload/334892/1300-Otchet%20programi-30062026.xlsx and …/334893/1300-Razhifrovka%20programi-30062026.xlsm
    - Regional Development: Q2 2026 programme XLSX and H1 2026 DOCX [S, URL not recorded]
    - Labour and Social Policy: H1 2026 PDF, Разшифровка XLSM, monthly cash XLS [S, URL not recorded]
    - Health: quarterly "1600-Otchet_programi" XLS and performance reports from end-2023 to mid-2026 at mh.government.bg/bg/politiki/otcheti-i-dokladi/ [S]
    - Economy: mi.government.bg/ministerstvo/byudzhet-i-otcheti/ (2024–2026) [S]
- **Legal basis:**
  - Public Finance Act (ЗПФ) art. 79(2): programme formats are submitted with the budget bill.
  - ЗПФ art. 93: approved budgets must be published on the organisation's website.
  - ЗПФ art. 173: fine for failing to publish.
  - ПМС 102/2026 art. 30: quarterly programme reports go to the MoF and must be published **within 10 days** of submission.

### 2.3 Municipal budgets [mostly S]
- **Central data, all 265 municipalities, script-friendly:**
  - data.egov.bg 4229: quarterly financial indicators from 2017 to Q2 2026 (overdue liabilities, commitments, the art. 94/130а ratios). Mirrored as XLSX at minfin.bg/bg/810, which I checked.
  - 4230: municipal debt, quarterly 2015–2026.
  - 4233/4234: transport subsidies, which stop in 2022.
  - ЗДБ 2026 art. 51 (transfers by type) and art. 52.
  - MoF "ФО" letters (minfin.bg/bg/337, browser) carry per-municipality XLS annexes for each extra transfer. Examples: ФО-32/01.10.2026 on expected 2026 payments by investment-programme project; ФО-30 on Bulgarian Development Bank loans by project and municipality.
- **Activity × paragraph exists for every municipality but only on its own site.** One parser for the MoF "OTCHET" sheet would cover every municipality that publishes the .xls.
  - Sofia: B1 monthly / B3 quarterly .xls plus capital-programme .xlsx (sofia.bg/bg/budget).
  - Burgas: .xls back to 2007 (burgas.bg/bg/2026-1).
  - Plovdiv: quarterly ZIPs 2017–2026, including a per-school allocation .xls.
  - Varna: narrative PDF only.
  - On data.egov.bg, 186 of 266 municipal organisations have published something, but only 10 did so in 2026.
- **No NAMRB (НСОРБ) public database.** It publishes only an annual PDF analysis.

### 2.4 SEBRA, the state payment system
SEBRA (Системата за електронни бюджетни разплащания) is the payment system used by spending units with accounts at the central bank. It has three data products:

1. **Daily totals.**
   - Source: data.egov.bg dataset 7806 "Плащания в СЕБРА и други плащания в БНБ" (MoF), one CSV per working day since 22.05.2015. 2,795 files so far, posted around 11:40 the next working day.
   - Each file lists totals by 2-digit payment code (01 salaries … 10 running costs, 40 social benefits, 50 capital, 60 transfers …) for all units, then the same for each of about 70–106 primary systems: ministries, NOI, NHIF, universities, the Academy of Sciences, Sofia Municipality, the National Fund, and subsidies to municipalities.
   - Companion datasets: 4225 (MoF system by secondary units, since 30.11.2016) and 4224 (National Fund EU programmes, since 15.02.2017).
   - minfin.bg/bg/transparency is the original publication (browser-only); by law it only has to keep the current year until 31 March of the next.
   - Similar per-system series exist for NHIF (monthly XLSX since 2012, by regional fund) [S], the Ministry of Education (data.egov.bg 1612, daily) [S] and Sofia (sofia.bg/bg/sebra, 2022–2026) [S].
   - **dfg_sebra.csv** is Data for Good's Google Sheet: the same daily totals, institution × payment code × day, from 02.01.2019 to 23.05.2022 (192,906 rows, CC-BY-SA). It is **no longer updated**.
2. **Individual payments, quarterly (the payment-level source).**
   - Source: data.egov.bg dataset 20439 (uri 57f1e2e7-b235-45e8-94c4-4d69f0b1a690), published under ПМС 76/2024 (ДВ 30/2024), which added art. 12–13 to the SEBRA publication ordinance.
   - Publisher: staff of the Ministry of e-Government. Its egov.government.bg SEBRA page now redirects to midt.gov.bg.
   - Files: 01.07.2022–31.12.2023 as one ZIP (download via the portal form, not tested), then quarterly CSVs from Q1 2024 to Q2 2026. Q2 2026 was posted on 17.07.2026.
   - **indiv_2026Q2.json** is that Q2 2026 file, pulled with `POST https://data.egov.bg/api/getResourceData {"resource_uri":"4a7413d6-3ff0-441a-bcdd-ab5f55a5748b"}`. It is 87 MB and took 14 s.
     - **122,647 payments, €10.34bn.** Payment codes 10–90; minimum €2,556.46, i.e. the 5,000 lv threshold still applies in 2026.
     - 106 primary systems, **2,611 payer units** (e.g. 286 under the Ministry of Education, 415 under Sofia Municipality including individual schools and kindergartens), 32,789 distinct payee names.
     - Columns: SETTLEMENT_DATE, CLIENT_RECEIVER_NAME, CLIENT_RECEIVER_ACC (IBAN), CLIENT_RECEIVER_BIC, FIN_CODE/FIN_NAME (payer), AMOUNT, CURRENCY, REASON1/REASON2 (free text, often invoice or contract numbers), REG_DATE, REG_NO, SEBRA_PAY_CODE, ORGANIZATION, PRIMARY_ORGANIZATION, PRIMARY_ORG_CODE, CLIENT_NAME_HASH.
     - **There is no payee ЕИК column**, although the ordinance lists one.
     - Natural persons are anonymised: 15,407 rows read "ФИЗИЧЕСКО ЛИЦЕ".
   - **Not included:**
     - municipalities other than Sofia, which are not in SEBRA (only transfers *to* them appear);
     - salaries;
     - the security services, the tax agency (НАП) and Customs;
     - payments flagged "S" (confidential).
     - Data is removed after 5 years.
3. **One-off history, 05.06.2006–28.06.2022** (РМС 406/2022: payments over 5,000 lv, codes 10–97).
   - The MoF's data.egov.bg dataset 18232 ZIP fails to download: the portal says "Грешка при вземане на метаданни за ресурс" (2 Oct 2026).
   - The Ministry of e-Government's copy (dataset 19246) points to a page that now redirects.
   - A **third-party mirror**, https://register-sebra.acstre.com/ (by the company Acstre), shows the rows from 06.06.2006 to 28.06.2022 in a searchable grid with the same fields; I verified this by sorting by date. It is not official, and bulk export was not checked.
   - Searching data.egov.bg finds only 8 organisations with their own payment lists, e.g. Търговище municipality, quarterly, with payee ЕИК [S].

### 2.5 Health [S, sub-agent; spot-checked URLs return 200]
- **NHIF:**
  - **Monthly payments to each hospital**: https://www.nhif.bg/bg/hospitals/bmp/2026 (archives from 2015). PDFs with a text layer; one row per hospital, with year-to-date and monthly amounts. Three series: hospital care (382 hospitals, €1.52bn Jan–Aug 2026), medical devices, and cancer drugs paid outside the clinical-pathway price.
  - **Medicine reports, Справки 1–7**: https://www.nhif.bg/bg/nzok/medicine/1 …/7. XLS, monthly and annual, July 2020–July 2026. Product (ATC/NHIF code) × ICD-10 diagnosis; hospital × product × diagnosis (46k rows for 2025); totals by INN.
  - **Activity counts**: hospital × clinical pathway × diagnosis, counts only.
  - **Budget execution**: monthly B1/B3 XLS from 2014 at /bg/nzok/financial_report/quarter; monthly reports by budget-act line at /bg/completion-reports.
  - **Not published**: amounts per GP, specialist, dentist, laboratory or pharmacy.
  - Content is marked NHIF copyright, "all rights reserved". Check reuse terms.
- **Ministry of Health**: quarterly financial indicators for each hospital (68 state, 123 municipal; 25 indicators: revenue, costs, overdue liabilities, beds, staff …), XLSX Q2 2019–Q3 2025, at mh.government.bg/bg/politiki/standart-za-finansovo-upravlenie-na-drzhavnite-lechebni-zavedeni/.
- **Agency for Public Enterprises register** (reports.appk.government.bg): financial statements (PDF) of 117 Ministry of Health enterprises.

### 2.6 EU funds [S]
- **ИСУН public module, https://2020.eufunds.bg/** — one site for 2014–20, 2021–27, the Recovery Plan, national investments and EEA/Norway grants.
  - Open-data API: `GET /api/v1.0/opendata?ProgrammeId=…&ProgrammePeriodId=…`; programme list at `/api/v1.0/opendata/criteria`.
  - Each record: project, beneficiary (ЕИК), place down to municipality/NUTS, total value, **cumulative** paid amount, and contracts to contractors. Amounts in euro.
  - Script access works only with full browser headers. It is behind an F5 challenge and rate-limited (HTTP 429 after about 8 calls).
  - Example: the Recovery Plan programme 8010686 has 14,795 projects (154 MB). Umbrella agreements are mixed in, so totals double count.
  - The municipal investment programme (8010932) appears there with no projects.
- **MoF data.egov.bg, monthly CSV, CC-BY:**
  - 18860: 2021–27 programmes × fund.
  - 4226: 2014–20.
  - 18958: Recovery Plan by investment; at 31.07.2026 the budget was €6.89bn and €3.90bn had been paid.
- **EU-level:**
  - Kohesio API: 48,706 Bulgarian cohesion projects, with a CSV download.
  - cohesiondata.ec.europa.eu: programme level only.
  - FTS: EU money spent directly by the Commission, yearly CSV 2007–2025.
  - umispublic.government.bg holds 2007–13 and is frozen.
- **CAP:** https://seu.dfz.bg/seu/f?p=727:8110 lists beneficiary × intervention × municipality for financial years 2024–2025, still in BGN. It is an Oracle APEX app and scriptable with effort. Older years (2015–2023, with gaps) are on data.egov.bg (State Fund Agriculture = org 56; FY2023 has 295k rows).
- **UNVERIFIED:** the EU Recovery Scoreboard's "100 largest final recipients" list for Bulgaria.

### 2.7 Public procurement [S]
- **Public Procurement Agency (АОП) open data.** Policy page: https://www2.aop.bg/e-uslugi/otvoreni-danni-ot-rop/. The files are on data.egov.bg (org 502).
  - **Daily OCDS JSON since 1 Jan 2026** (CC0): buyer and supplier ЕИК, CPV codes, lots, award value, signing date, amendments. There are no execution or payment records.
  - **Yearly contract CSVs for 2016–2023** (35k contracts in 2023).
  - **2024–2025 are missing** from open data.
- **ЦАИС ЕОП** (app.eop.bg) is a JavaScript app with no public API found.
- **TED API v3** (`POST https://api.ted.europa.eu/v3/notices/search`): above-EU-threshold notices only (17.5k award notices for Bulgaria in 2025).
- **opentender.eu** is behind Cloudflare.
- **No ЕБК codes anywhere.** Link to the budget through ЕИК, municipality, and programme codes.

### 2.8 Capital and investment programmes attached to the budget
- **ЗДБ 2026, Annex 2 to art. 110** — "Програма за приоритетни стратегически инвестиционни проекти 2026–2028". In the State Gazette HTML, idMat=245041 (script).
  - **199 projects** (codes NP-25.xxx), each with capex for 2026 and forecasts for 2027–2028, a result indicator and the responsible institution. 2026 total about €1.45bn.
  - Largest institutions: Defence (34 projects, €841.5m), Regional Development (67 projects, €347.0m), then rail infrastructure, ports and health.
- **2025 report, priority projects:** РМС № 737/24.09.2026, annex pr.6 = https://strategy.bg/download/1327217 (XLSX). Also Pril_t.54.xlsx in the minfin.bg ZIP.
  - Section I: 170 projects, planned 2025 capex 2,891.8m lv vs 2,401.4m lv reported at 31.12.2025.
  - Section II: 228 "indicative" projects.
- **Municipal investment programme (Инвестиционна програма за общински проекти):**
  - **Original list:** ЗДБ 2025 Annex 3 (ДВ 26/27.03.2025, idMat=233694), https://dv.parliament.bg/DVPics/2025/26_25/1619.pdf. 120-page PDF with a text layer; **3,066 projects** (2,888 OP-24 + 178 OP-25), with total value in thousand lv and the municipality.
  - **2025 payments:** annex pr.7 = https://strategy.bg/download/1327218 (XLSX, also Pril_t.55 in the minfin ZIP).
    - **3,492 projects in 264 municipalities**, keyed by municipality ЕБК code, project code, name and municipality.
    - Columns: transfer paid in 2025, Bulgarian Development Bank financing in 2025, total.
    - 717 projects received money; 826.8m lv in total.
  - **2026 list:** **ПМС № 103/12.08.2026** (ДВ 75/2026, idMat=245381), Annex 1 = https://dv.parliament.bg/DVPics/2026/75_26/4508_1.pdf (178 pages, 3,492 projects).
    - Columns: agreement no./date, agreement value, transfers to date, 2026 forecast, amount left for later years, all in €.
    - Annex 7 is the template for a **monthly progress report the regional development ministry (МРРБ) must publish** (art. 12).
  - **Live status:** https://ipop.mrrb.bg/reports_projects_export.php, a CSV of 3,620 projects with paid amounts by year and Development Bank financing [S].
  - The legal caps for 2026 are in ЗДБ 2026 art. 113: up to €460.2m through the Development Bank and up to €600m from the central budget.
- Municipalities' own capital lists, e.g. Sofia's quarterly capital report of about 1,390 rows (project × function × activity × paragraph) [S]. ЗДБ 2026 art. 53 requires every municipality to publish its plan [S].

### 2.9 Schools, kindergartens and universities
- **Per-school budgets:** no central publication [S].
  - Schools post budgets and reports on their own sites, often as scanned PDFs at paragraph level (e.g. НПМГ since 2017, СМГ) [S].
  - Plovdiv publishes per-school and per-kindergarten allocations by formula component (.xls) [S]. Burgas's capital XLSX has a sheet for each school [S].
  - Sofia's schools and kindergartens appear as payer units in the SEBRA individual-payment file (my analysis).
- **Cost standards:** РМС № 497/03.07.2026, on minfin.bg/bg/96 (PDF, browser) and as DOCX at https://strategy.bg/download/1323211 [S].
  - Education annex: about 23 groups of standards, per institution, class or pupil, with the national count.
  - Examples: general school €44,500 per school + €9,438 per class + €1,859 per pupil; kindergarten €2,858 per child in compulsory pre-school groups.
- **Universities:** **ЗДБ 2026 art. 16(4)** lists the transfer to the Academy of Sciences (€131,577.7k) and to **each of the 33 state universities** individually, e.g. Sofia University €106,322.0k and Technical University Sofia €79,996.9k. Art. 11(4) adds the 4 military schools. This is in the State Gazette HTML the pipeline already downloads.
  - No split by teaching vs research.
  - No breakdown by Academy of Sciences institute was found.

### 2.10 Other sources [S]
- **IME openbudget is dead:** openbudget.ime.bg resolves to a hosting default page. regionalprofiles.bg has district-level XLSX only.
- **"BOOM":** no Bulgarian portal by that name exists. The World Bank's BOOST programme does **not** include Bulgaria.
- **Audit Office (Сметна палата):** audit reports are PDF only.
- **Eurostat** goes no deeper than COFOG level II (nor does anything else internationally), but it does split by subsector. OECD MUNIFI has municipal-sector totals by economic category. NSI mirrors Eurostat.

---

## 3. Source table

| # | Source | What it gives (depth) | URL | Format | Coverage | Updated | Access |
|---|---|---|---|---|---|---|---|
| 1 | ЕБК (MoF) | Classification: 9 functions / 23–24 groups / 298 activities; 42 paragraphs / 179 sub-paragraphs; organisation codes | minfin.bg/bg/1037; script copy: comsy54.bg/wp-content/uploads/2026/01/EBK-2026-public.xlsx | ZIP / XLSX / PDF | 2002–2026 | Yearly | minfin: browser; mirror: script |
| 2 | КФП monthly (MoF, data.egov.bg 4227) | КФП by budget × economic category | data.egov.bg, uri bfcdd4cb-4737-4272-92ea-9b2395f7cb14 | CSV via API | Mar 2018–Aug 2026 (plus two 2016 files) | Monthly | Script |
| 3 | State budget execution monthly (data.egov.bg 16642) | State budget, economic lines only | uri 79ce7de2-0150-4ba7-a96c-dbacb76c95b6 | CSV | Jun 2021–Aug 2026 | Monthly | Script |
| 4 | Annual КФП series | Totals by subsector (social security, local, central, total) | minfin.bg/bg/statistics/13 | XLS | 2014–2025 | Yearly | Browser |
| 5 | 2025 State Budget execution report (РМС 737/2026) | pr.4 actuals per spending unit by economic category; pr.5 КФП by paragraph/sub-paragraph × budget; pr.6/pr.7 project lists | strategy.bg/download/1327215 … 1327218 (also minfin.bg/upload/65173/…zip, which adds pril_3.docx, the programme review) | XLSX, DOCX | 2025 actual | Yearly (Sep) | strategy.bg: script; minfin: browser |
| 6 | **ПМС 102/2026, Annex 1** | 44 units → 98 policy areas → 187 programmes → staff / running costs / capital + named administered items | strategy.bg/download/1325203 (DOCX); dv.parliament.bg/DVPics/2026/74_26/4489_1.pdf | DOCX / PDF | 2026 plan | Yearly | Script |
| 7 | Programme budgets attached to the bill | 45 draft programme budgets with indicators | parliament.bg/bills/52/52-602-01-19.zip | PDF | 2026 draft | Yearly | Script |
| 8 | Ministries' quarterly programme reports (Б.1 / Б.2) and semi-annual/annual performance reports | Programme actuals by quarter; departmental vs administered; indicators | Each ministry's site, e.g. mvr.bg/upload/334892/… | XLSX / XLSM / PDF / DOCX | Varies by ministry (Interior page lists Q1–Q2 2026; Health has end-2023 to mid-2026 [S]) | Quarterly / semi-annual | Mostly script (mon.bg is behind Cloudflare [S]) |
| 9 | MoF programme-budgeting instructions | Report formats and deadlines | minfin.bg/bg/241 | PDF / XLS | 2022–2026 | Yearly | Browser |
| 10 | ЗДБ 2026 (State Gazette) | Art. 2–47 units; art. 11(4)/16(4) per university; art. 51/52 per municipality; Annex 2 (199 projects) | dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=245041 | HTML | 2026 | Yearly | Script |
| 11 | ЗДБ 2025, Annex 3 | 3,066 municipal projects (original list) | dv.parliament.bg/DVPics/2025/26_25/1619.pdf | PDF (text) | 2025 | One-off | Script (use https) |
| 12 | ПМС 103/2026, Annex 1 | 3,492 municipal projects: agreement, transfers, 2026 forecast | dv.parliament.bg/DVPics/2026/75_26/4508_1.pdf | PDF (text) | 2026 | Yearly | Script |
| 13 | ipop.mrrb.bg | Live status of 3,620 municipal investment projects | ipop.mrrb.bg/reports_projects_export.php | CSV (`;`, decimal comma) | 2024–2026 | Live | Script [S] |
| 14 | MoF "ФО" letters | Per-municipality transfers, extra subsidies, Development Bank loans by project | minfin.bg/bg/337 | PDF + XLS/XLSX | 2015–2026 | Several a month | Browser |
| 15 | Municipal fiscal indicators (4229 / minfin.bg/bg/810) | Per municipality: arrears, commitments, fiscal-rule ratios | data.egov.bg uri 980fa747-e0d0-4371-9457-f41d730040cd | CSV / XLSX | 2017–Q2 2026 | Quarterly | Script (data.egov) [S] |
| 16 | Municipal debt register (4230) | Debt per municipality | uri ee08391e-be09-44c1-b278-b4af8b62a147 | CSV | 2015–2026 | Quarterly | Script [S] |
| 17 | Municipal cash reports (B1/B3) | Activity × paragraph, plan vs actual | sofia.bg/bg/budget; burgas.bg/bg/2026-1; plovdiv.bg/item/budget-and-finance/ | XLS / ZIP / PDF | Varies | Monthly / quarterly | Script, municipality by municipality [S] |
| 18 | SEBRA daily totals (7806; 4225; 4224) | Day × spending unit × payment code | data.egov.bg uri 01293990-7330-49c6-92a2-cc73db73ec24 | CSV via API | May 2015–today | Daily | Script |
| 19 | **SEBRA individual payments (20439)** | Each payment ≥ 5,000 lv: payee, IBAN, payer unit, code, purpose | data.egov.bg uri 57f1e2e7-b235-45e8-94c4-4d69f0b1a690 | CSV (ZIP for 2022–23) | 07.2022–06.2026 | Quarterly (~3–7 weeks after quarter end) | Script |
| 20 | SEBRA history 2006–2022 | Same fields as row 19 | data.egov.bg 18232 (download broken); mirror register-sebra.acstre.com | ZIP / web grid | 06.2006–06.2022 | One-off | Official broken; mirror browser |
| 21 | MoF SEBRA page | Daily publication, payment-code list | minfin.bg/bg/transparency | HTML | Current year | Daily | Browser |
| 22 | NHIF payments per hospital | Hospital × month, 3 series | nhif.bg/bg/hospitals/bmp/2026 | PDF (text) | 2015–Aug 2026 | Monthly | Script [S] |
| 23 | NHIF medicine reports 1–7 | Product × diagnosis; hospital × product × diagnosis | nhif.bg/bg/nzok/medicine/1 | XLS | Jul 2020–Jul 2026 | Monthly | Script [S] |
| 24 | Ministry of Health hospital finances | 191 hospitals × 25 indicators | mh.government.bg/bg/politiki/standart-za-finansovo-upravlenie-na-drzhavnite-lechebni-zavedeni/ | XLSX | Q2 2019–Q3 2025 | Quarterly (lagging) | Script [S] |
| 25 | Cost standards (РМС 497/2026) | Standards per school, class, pupil, child … | strategy.bg/download/1323211; minfin.bg/bg/96 | DOCX / PDF | 2026 | Yearly | Script (strategy) [S] |
| 26 | ИСУН open-data API | EU projects, beneficiaries, contracts, cumulative payments | 2020.eufunds.bg/api/v1.0/opendata | JSON / XML | 2014–2026 | Live | Script with browser headers; rate-limited [S] |
| 27 | MoF EU-funds and Recovery Plan execution (18860, 4226, 18958) | Programme × fund; Recovery Plan investment | data.egov.bg (MoF org 103) | CSV | 2016/2023–2026 | Monthly | Script |
| 28 | Kohesio | 48,706 Bulgarian cohesion projects | kohesio.ec.europa.eu/api/projects | JSON / CSV | 2014–2027 | Ongoing | Script [S] |
| 29 | CAP beneficiaries (State Fund Agriculture) | Beneficiary × intervention × municipality | seu.dfz.bg/seu/f?p=727:8110; older years on data.egov.bg org 56 | APEX web / CSV | FY2015–2025 (gaps) | Yearly | Hard script / script [S] |
| 30 | Procurement OCDS (АОП) | Contract award: buyer, supplier ЕИК, CPV, value | www2.aop.bg/e-uslugi/otvoreni-danni-ot-rop/ → data.egov.bg org 502 | JSON (OCDS) | 1 Jan 2026– | Daily | Script [S] |
| 31 | Procurement yearly contracts | Contracts and amendments | data.egov.bg org 502 | CSV | 2016–2023 | Yearly (stalled) | Script [S] |
| 32 | TED API v3 | Above-threshold notices | api.ted.europa.eu/v3/notices/search | JSON | All years | Daily | Script [S] |
| 33 | FTS (European Commission) | Direct EU grants and contracts to Bulgarian recipients | ec.europa.eu/budget/financial-transparency-system/ | CSV / XLSX | 2007–2025 | Yearly | Script [S] |
| 34 | Eurostat gov_10a_exp | COFOG level II × transaction × subsector | Eurostat API | JSON-stat | 1995–2024 | Yearly | Script |

**Access notes.**
- **minfin.bg:** scripts get HTTP 403 from Cloudflare. A normal browser first sees a "Verify you are human" check; once it cleared in the browser session, all pages and files opened.
- The **script-friendly mirrors** of MoF content are data.egov.bg (API: `listDatasets` / `listResources` / `getResourceData`), strategy.bg (Council of Ministers decisions with annexes), dv.parliament.bg (laws and decrees; annex PDFs under /DVPics/, use https) and parliament.bg (bill ZIPs).
- **Currency:** 2026 data is in euro; earlier data is in leva (1.95583).

---

## 4. Recommended next additions

1. **Programmes and benefit lines for all ministries** (ПМС 102/2026 Annex 1, plus two quick wins from the State Gazette HTML).
   - Takes "Ministries 2026" from 8 to 44 units with programmes (187).
   - Adds a fourth level: staff / running costs / capital and the named administered items, e.g. "Месечни помощи по ЗСП" or "Целеви помощи за отопление".
   - In the same pass:
     - add **per-university transfers** (art. 16(4) and 11(4)) under education;
     - add **art. 51 per-municipality transfers** next to art. 52.
   - Programme codes match РМС 478/2026, and policy totals already match the law.
   - **Effort: about 2 days** (DOCX parse plus validation against the existing policy amounts; universities and art. 51 about half a day each).
   - Refresh once a year, when the next budget-execution decree comes out.
2. **Named capital projects.**
   - 199 priority strategic investment projects for 2026, by ministry, with 2027–28 forecasts.
   - The 2025 plan vs actual for the 170 Section I projects (pr.6).
   - The municipal investment programme: 3,492 projects by municipality, with 2025 payments (pr.7) and the 2026 forecast (ПМС 103, or the live ipop.mrrb.bg CSV).
   - Show them as a "Projects" dataset or as examples inside capital spending. They are commitments and transfers, not КФП cash by function, so they should not be added up into the donut.
   - Municipality codes (51xx) join to ЕБК Section VII.
   - **Effort: 2–3 days**; the pr.6 and pr.7 XLSX files are clean, and the ipop CSV is easier than the 178-page PDF.
3. **"Who gets paid": SEBRA individual payments.**
   - ETL the quarterly CSVs from Q1 2024 to Q2 2026 (about 120k rows a quarter), then add the 2022–23 ZIP.
   - Aggregate to top payees per ministry or agency, per payer unit (2,611) and per payment code. Join to ministries with SEBRA code × 100 = ЕБК code.
   - Normalise payee names. Keep anonymised persons as one group.
   - Exclude inter-budget flows (code 60 and the NOI/NHIF transfers) so they do not swamp the lists.
   - Present as ranked lists or clips ("the 10 biggest payees of the Ministry of X this quarter"), not as donut slices.
   - Caveats to show on the page: only payments ≥ €2,556; only Sofia among municipalities; no ЕИК.
   - **Effort: 3–5 days.**
4. **Hospital-level health spending.**
   - NHIF monthly payments per hospital (PDF parse, 2015–2026).
   - Joined on hospital registration number to the Ministry of Health's quarterly hospital finances (revenue, costs, arrears, beds).
   - Plus medicines by ATC/INN (Справка 7).
   - **Effort: 2–3 days.** Check NHIF's "all rights reserved" notice before republishing.

Smaller items:
- Eurostat subsector split (central / local / social security): about half a day.
- Municipal activity-level data for 2–3 big cities (Sofia, Burgas, Plovdiv) from the B1/B3 OTCHET sheets: 3–4 days. National coverage is not feasible without central data.

---

## 5. Not found, unverified, caveats
- **Not found:**
  - a national or central table of spending by ЕБК activity, or per-municipality activity × paragraph data, from the MoF;
  - per-school budgets in any central place;
  - NHIF payments per GP, specialist or pharmacy;
  - an Academy of Sciences breakdown by institute;
  - a NAMRB data portal;
  - procurement open data for 2024–2025, other than TED for large contracts;
  - payment-level data for municipalities other than Sofia (and Търговище's own lists).
- **Broken:** the official 2006–2022 SEBRA ZIP (data.egov.bg 18232). The only working copy found is a third-party mirror.
- **UNVERIFIED:**
  - the detailed tables inside pril_3.docx (2025 programme review);
  - the contents of ПМС 28/2025, assumed to match ПМС 102 in structure;
  - the Ministry of e-Government's 2022–23 ZIP download;
  - the EU Recovery Scoreboard "top 100 recipients";
  - an Excel export in ИСУН's web pages;
  - the State Fund Agriculture APEX download button;
  - the OECD per-municipality files;
  - NOI/ДОО execution data (not researched).
- **Checked only by sub-agents ([S] in the text):** the health, education (except universities), municipal, EU-funds and procurement details. Spot-checks of key URLs (nhif.bg, mh.government.bg, ipop.mrrb.bg, www2.aop.bg, seu.dfz.bg) returned HTTP 200 on 4 Oct 2026.
