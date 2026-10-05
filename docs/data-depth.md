# How deep does Bulgarian public-spending data go? A verified inventory (2–5 Oct 2026)

## Short answer

Yes, much more detail is online than the site used in September 2026. Below the levels it had then, there are official sources for all of the following; since October 2026 most of them are on the site:

- **Every ministry and agency, down to budget programme** (203 programmes in 44 spending units), each split into staff, running costs and capital, plus named benefit lines such as monthly social assistance or heating aid. (On the site since October 2026.)
- **Money per university** and **money per municipality by transfer type** (both on the site since October 2026).
- **About 3,900 named capital projects**, with planned and paid amounts. (On the site since October 2026: the 199 priority projects for 2026–2028, the 176 + 228 of 2025 with plan vs actual, and the 3,492 municipal investment projects.)
- **Monthly payments to each hospital** and reimbursements for each medicine. (On the site since October 2026: what the NHIF paid each of 390 establishments, Jan 2024 – Aug 2026, with the Ministry of Health's finances of 165 state and municipal hospitals, and the reimbursed medicines by active ingredient, 2021 – Jul 2026; "Lists" › "Health".)
- **EU-funded projects and contracts**, and **public-procurement contracts**. (On the site since October 2026: the EU programmes' budgets and payments, the Recovery Plan by investment, every project of the EU-funded programmes in ИСУН, and farm subsidies by measure, municipality and recipient, "Lists" › "EU funds"; and 239,431 procurement contracts of 2016–2023 and 2026 with every supplier's and buyer's page, plus TED's award notices for 2024–2025, "Lists" › "Public procurement". The EU beneficiaries' own contracts with contractors are still new.)
- **Individual state payments of 5,000 lv (€2,556.46) or more**, each with the payee's name, date, amount and payment purpose. Quarterly files cover July 2022 onward (the series started in June 2024), and a one-off release covers June 2006 to June 2022. (On the site since October 2026: all 1.8 million payments of July 2022 – June 2026, "Lists" › "Who gets paid".)

Most of this can be downloaded by a script.

**The one big gap:** no one publishes a national table of spending by ЕБК *activity* (the 3-digit codes such as "kindergartens" or "street lighting"). That level exists only in each municipality's and each school's own reports, in mixed formats.

**How things were checked.** Unless a claim is marked otherwise, it was opened on 2–5 Oct 2026, either by me or by a research sub-agent using curl.

- **[S]** marks a claim checked only by a sub-agent.
- **UNVERIFIED** marks anything nobody opened.
- "Script" means curl/HTTP works.
- "Browser" means a human browser session is needed.

**What "new" means here.** The site already uses:

- КФП spending by function and sub-function, split by budget and by current/capital spending;
- the Health Insurance Fund (NHIF) and State Social Security (ДОО) budget-act tables;
- State Budget Act (ЗДБ) art. 52 (2024/2025: art. 54): state-delegated activities by municipality and function;
- ЗДБ art. 51 (2024/2025: art. 53): the central budget's transfers to each municipality by type, since October 2026 ("Municipalities" 2024–2026, with ЕБК codes and NSI residents per municipality);
- ЗДБ art. 2–47: the 46 spending units by policy area; since October 2026 also every budget programme of the 44 (2026) / 46 (2025) programme-format units, with staff / running costs / capital and the named administered items (ПМС № 102/2026 and № 28/2025, Annex 1);
- ЗДБ 2026 art. 16(4): the subsidy to each state university and the Academy of Sciences;
- since October 2026, the named capital projects as lists ("Lists" page): ЗДБ 2026 Annex 2, the 2025 report's
  attachments pr.6 and pr.7, ПМС № 103/2026 Annex 1 and the ipop.mrrb.bg register;
- since October 2026, the SEBRA individual payments of 5,000 lv or more, 07.2022–06.2026 (data.egov.bg 20439), with the
  daily SEBRA totals of 2024 – June 2026 (7806) to measure their coverage ("Lists" › "Who gets paid");
- since October 2026, the NHIF's monthly payments to each hospital (Jan 2024 – Aug 2026; in the 2024/2025 actuals the hospital-care
  line is split by region and hospital), the Ministry of Health's quarterly hospital finances (year ends 2019–2024, Q3 2025) and the
  NHIF medicine reports 1 and 7 by active ingredient (2021 – Jul 2026) ("Lists" › "Health");
- since October 2026, the EU programmes of 2014–2020 and 2021–2027 and the Recovery Plan (Ministry of Finance, data.egov.bg
  4226, 18860, 18958), every project of the EU-funded programmes in ИСУН, and the State Fund Agriculture's payments by
  beneficiary (data.egov.bg org 56 for FY2015–2017 and 2021–2023, seu.dfz.bg for FY2024–2025) ("Lists" › "EU funds");
- since October 2026, the Public Procurement Agency's contracts and amendments of 2016–2025 and the OCDS releases of
  ЦАИС ЕОП of 2026 (data.egov.bg org 502), and TED's award notices of Bulgarian buyers of 2024–2025 ("Lists" › "Public
  procurement");
- Eurostat COFOG level 2 by economic transaction.

---

## 1. The depth ladder (level 0 = total, level 10 = single payment)

| Level | Unit of analysis and classification | Best source(s) | Years | Machine-readable? | On the site? |
|---|---|---|---|---|---|
| 0 | Total public spending (КФП, or Eurostat S13) | MoF КФП: monthly CSVs on data.egov.bg; annual XLS on minfin.bg; medium-term forecast | Monthly 2018–Aug 2026 (two 2016 files); annual 2014–2025 | Yes (data.egov.bg script; minfin.bg browser) | Used |
| 1 | Function: 9 ЕБК functions / 10 COFOG divisions | Medium-term forecast (РМС 597/2026); annual execution report; Eurostat gov_10a_exp | Plan 2025–2028; actuals to 2025 (MoF) / 2024 (Eurostat) | Yes | Used |
| 2 | Sub-function = ЕБК group (23–24; the site shows the КФП's 23) or COFOG group (~70) × budget (state / municipal / social security / EU funds) × current/capital; Eurostat × transaction | Same, plus Eurostat **by subsector** (S1311 central, S1313 local, S1314 social security) [S] | Same | Yes | Used, except the subsector split |
| 3a | Spending unit: 46 State Budget Act units, NHIF, ДОО funds | ЗДБ art. 2–47; NHIF and ДОО budget acts; **2025 actuals per unit, by economic category, with named subsidy recipients** (execution report annex pr.4) | 2025 actual, 2026 plan | Yes (XLSX, State Gazette HTML) | Plan used (2024–2026); 2025 actuals by policy area used ("Ministries 2025 (actual)", from pr.4); per-unit actuals by economic category are new |
| 3b | Municipality (265) × transfer type | ЗДБ art. 51 and 52 (2024/2025: art. 53 and 54): delegated-activities subsidy (by function), equalising subsidy, capital subsidy, winter roads, other targeted transfers (for the minimum wage); MoF "ФО" letters with per-municipality XLS annexes for transfers added during the year (browser) | 2024–2026 plan | Yes | Used ("Municipalities" 2024–2026); ФО letters are new |
| 4 | Policy area (80 areas + 2 "other programmes" groups + 17 programmes at area level) → budget programme (203 in 44 units) | **ПМС № 102/2026, Annex 1** covers all 44 programme-format units; draft programme budgets attached to the bill (45 PDFs) | 2026; 2025 via ПМС № 28/2025 (same structure, 46 units) | Yes: DOCX on strategy.bg, PDF on dv.parliament.bg; 2025 as .doc | Used: all units, 2025 and 2026 plans |
| 5 | Programme × economic element: staff / running costs / capital + **named "administered" items** (e.g. monthly social assistance €78.6m, heating aid €49.5m); whole КФП by **ЕБК paragraph (42) and sub-paragraph (179)** × budget | ПМС 102 Annex 1 (plan); ministries' quarterly programme reports, forms Б.1/Б.2 (actuals); annex pr.5 of the 2025 report (КФП by paragraph) | 2026 plan; 2026 quarterly actuals; 2025 actual | Yes (DOCX, XLSX/XLSM) | Plan used (2025, 2026); actuals and ЕБК paragraphs are new |
| 6 | ЕБК **activity** (298 3-digit codes) × paragraph | Only each municipality's own monthly/quarterly cash reports (MoF forms B1/B3) and each school's own budget. No central table found | Varies; Sofia 2018–2026, Burgas back to 2007, Plovdiv 2017–2026 [S] | Partly (.xls for Sofia and Burgas, PDF for Varna) | New, but fragmented |
| 7 | Institution / entity: each university (33 + Academy of Sciences); each hospital (~382); each SEBRA payer unit (3,697 in July 2022 – June 2026, 2,611 in Q2 2026 alone; incl. Sofia's schools); per-school allocations (Plovdiv); cost standards per pupil/class/school | ЗДБ art. 16(4) and 11(4); NHIF monthly per hospital [S]; Ministry of Health quarterly hospital finances [S]; SEBRA individual payments; РМС 497/2026 standards [S] | 2026 (universities); 2015–2026 (NHIF); 2019–Q3 2025 (Ministry of Health) | Yes (HTML, PDF with text, XLSX, CSV) | Universities and the Academy used (2026); SEBRA payer units used (3,697 units, 2022–2026, "Who gets paid — by paying unit"); hospitals used (390, NHIF Jan 2024 – Aug 2026, Ministry of Health finances for 165, "Lists" › "Health", and in the 2024/2025 actuals); per-school data and standards are new |
| 8 | Project | Priority strategic investment projects (199 for 2026; 176 + 228 in 2025 with plan vs actual); municipal investment programme (3,492 projects); EU projects (ИСУН API [S]; Kohesio 48,706 Bulgarian projects [S]); Recovery Plan investments (MoF monthly) and its 14,795 projects in ИСУН [S]; CAP beneficiary × intervention [S]; municipal capital lists (Sofia ~1,390 rows [S]) | 2014–2026 | Yes (XLSX, CSV, JSON API, PDF) | Used: priority projects 2025–2028 and the municipal investment programme ("Lists" › "Investment projects"); the EU programmes, the Recovery Plan's investments, the ИСУН projects and CAP payments by measure, municipality and recipient ("Lists" › "EU funds") — October 2026; municipalities' own lists are new |
| 9 | Contract | Procurement: daily OCDS JSON since 1 Jan 2026; yearly contract CSVs 2016–2025 (2024–2025 only the old register's last contracts); TED API for above-threshold contracts; ЦАИС ЕОП's own JSON open data (since 29.06.2026, said to reach back to 2020; not explored). EU-funded contracts, beneficiary → contractor (ИСУН) [S] | 2016–2023, then 2026; **2024–25 gap** except TED | Yes | Used: 239,431 contracts of 2016–2023 and 2026, supplier and buyer pages, TED 2024–2025 ("Public procurement", October 2026); ИСУН contracts are new |
| 10 | Single payment | **SEBRA individual payments ≥ 5,000 lv** (quarterly, Q3 2022–Q2 2026); one-off release 06.06.2006–28.06.2022 (official ZIP broken; third-party mirror); daily SEBRA totals by spending unit × payment code since May 2015; NHIF payments per hospital per month; medicine reimbursement by product × diagnosis | 2006–2026 | Yes (CSV/JSON via the data.egov.bg API) | Used: every individual payment of 07.2022–06.2026 (aggregated; payments of €1 m or more one by one) and the daily totals of 2024–06.2026 ("Who gets paid", October 2026); NHIF payments per hospital per month (2024–Aug 2026) and medicines by active ingredient per year (2021–Jul 2026) ("Health", October 2026); the 2006–2022 history and medicines by diagnosis or hospital are new |

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
  - The 3-digit SEBRA system code is the ЕБК code divided by 100 (SEBRA 015 = ЕБК 1500). That is the join key between payments and budgets (used since October 2026 for 43 of the 48 units; one exception found: the Anti-Corruption Commission is SEBRA 181, ЕБК 8100, and it has no individual payments).
- **Who publishes data at activity or paragraph level:**
  - **Activity × paragraph:** only municipalities (B1 monthly / B3 quarterly forms on their own sites) and schools with delegated budgets (their own sites).
  - **Paragraph only:** the КФП as a whole for 2025 (annex pr.5, 1,736 rows × 71 columns, by budget); ministries' monthly cash reports; NHIF's B1/B3 files.
  - **Economic categories with named subsidy recipients:** each State Budget unit, in the 2025 report (annex pr.4, 2,823 rows).
  - I found **no national table by activity**. The MoF collects municipal reports in its system for municipalities (ИСО) but publishes only the art. 130г indicators (§2.3). This was a broad but not exhaustive search.

### 2.2 Programme budgets and performance reports
- **Central sources:**
  1. **ПМС № 102 of 12.08.2026 on executing the 2026 budget, Annex 1.**
     - Published in ДВ 74/18.08.2026: dv.parliament.bg idMat=245362, annex PDF https://dv.parliament.bg/DVPics/2026/74_26/4489_1.pdf (73 pages). DOCX copy: https://strategy.bg/download/1325203.
     - Covers **44 spending units, 80 policy/functional areas (plus 2 "other programmes" groups and 17 programmes listed at area level) and 203 programmes** in euro. All programme-format units are included except the National Assembly and the judiciary.
     - For each programme: departmental spending (staff / running costs / capital), plus "administered" items by name.
     - Parsed in full (October 2026): €12.50bn across 44 units, 99 area rows, 203 programmes and 768 programme lines. Every unit and area total equals the adopted law; three programme amounts are misprinted and corrected from the other printed totals (see `data/sources/budget-2026/README.md`).
     - On the site since October 2026 ("Ministries 2026"), in place of the bill's draft programme budgets used before, of which only 8 matched the law.
     - **ПМС № 28/16.04.2025** (strategy.bg/download/1293509, .doc) has the same Annex 1 for 2025 in leva: 46 units, all equal to the 2025 law; also on the site ("Ministries 2025").
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
  - ЗДБ 2026 art. 51 (transfers by type) and art. 52 (delegated activities by function); in 2024 and 2025 art. 53 and 54, same tables. Checked and on the site since October 2026: every column equals the act's printed totals, and the grand total equals "Общините" in art. 1 (2) (2026: 4 927 964.0 thousand EUR; 2025: 8 925 909.1 and 2024: 7 872 497.4 thousand BGN).
  - ЕБК codes of all 265 municipalities: ЕБК 2026 section VII В), cross-checked with attachment 7 to РМС № 737/2026; residents by municipality: NSI time series Pop_6.1.1 (31 December, 2010–2025, XLSX, script). Both in `data/sources/places/municipalities.csv`.
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
   - Files: 01.07.2022–31.12.2023 as one ZIP, then quarterly CSVs from Q1 2024 to Q2 2026. Q2 2026 was posted on 17.07.2026.
   - The ZIP downloads by script (verified 5 Oct 2026): `GET https://data.egov.bg/resource/download/zip/bf12dd30-9a88-4bb1-8961-ebbc527d3e01` → 32.8 MB, `Anonymized_DD_2022-2023.csv` (221 MB, 610,363 payments, same 17 columns, in leva). Licence of both datasets: data.egov.bg terms no. 1, "без защитени авторски права (CC0)".
   - **On the site since October 2026** ("Lists" › "Who gets paid", `data/sources/sebra/README.md`): all 1,801,465 payments, €149.98 bn, grouped into 65,588 payees (since the person rules of October 2026, natural persons and sole traders are one unnamed group) and 3,697 paying units in 109 systems. The files have quirks (a different column layout in Q3 2024, purposes split at commas into extra columns, FIN_CODE masked on 213,321 rows from 2024); every row is realigned and the totals match the raw files exactly. Against the daily totals (7806, codes 10–90, without the subsidies to municipalities), the individual payments cover 92–96% a quarter (81% in Q4 2025, when €2.05 bn of Ministry of Finance financing, code 70, is missing from the individual list).
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

### 2.5 Health (hospital payments, medicine reports and Ministry of Health finances checked in October 2026; the rest [S])
On the site since October 2026 ("Lists" › "Health", and hospitals in the 2024/2025 actuals); extracts, checks and the reuse
question in `data/sources/health/README.md`.
- **NHIF:**
  - **Monthly payments to each hospital**: https://www.nhif.bg/bg/hospitals/bmp/<year> (2015–2026). Three PDFs a month with a
    text layer, one row per establishment with its 10-digit registration number (RZOK, EKATTE municipality code, type,
    serial), the year to date and the month: hospital care (382 establishments, €1,517.9 m Jan–Aug 2026), medical devices
    and medicines paid outside the clinical-pathway price. Script-friendly. The December 2022 report has today's layout (it
    parses with the same extractor); 2015 and 2019 have a column per month instead; 2020–2021 not checked. Hospital care adds up to 99.8–99.9% of the NHIF's
    budget line; medicines to 99.9% of its payments to hospitals for cancer drugs; devices to only about half of their line.
  - **Medicine reports, Справки 1–7**: https://www.nhif.bg/bg/nzok/medicine/1 …/7. XLS, one a month from July 2020 and one for
    the whole of 2025. 1–4 are medicines, devices and foods for home treatment (pharmacies): product (ATC, NHIF code) × ICD-10
    diagnosis (1), by RZOK (2, 4) or by diagnosis (3); 5–7 are cancer and coagulopathy medicines paid to hospitals outside the
    pathway price: by RZOK, hospital (registration number) and diagnosis (5, about 10 MB a month), by diagnosis (6) and by ATC
    and INN with patients (7). Used: 1 and 7, by active ingredient and year. The files have many small format changes (see the
    README); ATC codes change over the years (WHO revisions).
  - **Activity counts**: hospital × clinical pathway × diagnosis, counts only [S].
  - **Budget execution**: monthly B1/B3 XLS from 2014 at /bg/nzok/financial_report/quarter; monthly reports by budget-act line at /bg/completion-reports.
  - **Not published**: amounts per GP, specialist, dentist, laboratory or pharmacy.
  - The NHIF's terms of use (/bg/terms-of-use) claim copyright over the site's content with all rights reserved; the site uses
    only figures from the reports, with links (reasoning in the README; to be confirmed with the user).
- **Ministry of Health**: quarterly financial indicators of the state (61 in Q3 2025) and municipal (119) hospitals — revenue,
  costs, liabilities, overdue liabilities, patients, doctors, nurses, beds and ratios — XLSX Q2 2019–Q3 2025, at
  mh.government.bg/bg/politiki/standart-za-finansovo-upravlenie-na-drzhavnite-lechebni-zavedeni/. Names only (no number or
  ЕИК); matched to the NHIF numbers by name: 165 of 180 in Q3 2025 (the rest get no NHIF hospital-care payments).
- **Agency for Public Enterprises register** (reports.appk.government.bg): financial statements (PDF) of 117 Ministry of Health enterprises.

### 2.6 EU funds and farm subsidies (checked in October 2026)
On the site since October 2026 ("Lists" › "EU funds"); extracts, checks and licences in `data/sources/eu-funds/README.md`
and `data/sources/cap/README.md`.
- **MoF data.egov.bg, monthly CSV (organisation 103, terms "Признание", CC BY), read with `getResourceData`:**
  - 4226: the 2014–2020 programmes of the ERDF, CF, ESF, FEAD (12 programme × fund rows), monthly since 2016-07;
    18860: the 2021–2027 programmes of the ERDF, ESF+ and CF (11 rows; the Just Transition Fund has no row of its own —
    ИСУН puts all its projects under "Development of the Regions", one row labelled ERDF whose budget seems to include
    them), monthly since 2023-01. Columns: budget (EU, national, total), received from the Commission
    (pre-financing, on claims), paid (EU, national, total), declared and certified expenditure — all cumulative, in euro.
    At 31.08.2026: 2014–2020 budget €9.29 bn, paid €9.18 bn; 2021–2027 budget €12.87 bn, paid €3.41 bn.
  - 18958: the Recovery and Resilience Plan by investment and responsible body; at 31.07.2026 a budget of €6.89 bn and
    €3.90 bn paid, at 31.08.2026 €7.07 bn and €5.13 bn (€1.23 bn paid in August, the Plan's last month); €4.28 bn
    received from the Commission.
  - **The portal masks ten-digit numbers** it takes for personal identity numbers (`**********`), e.g. budgets of
    1,228,150,000; they are rebuilt from the other columns or the total row. Layouts change over the years.
- **ИСУН public module, https://2020.eufunds.bg/** — one site for 2014–20, 2021–27, the Recovery Plan, national
  investments and EEA/Norway grants.
  - Open-data API: `GET /api/v1.0/opendata?ProgrammeId=…&ProgrammePeriodId=…` (JSON: projects, contracts with
    contractors, entities); programme list at `/api/v1.0/opendata/criteria` (52 programmes).
  - Each project: code, fund, dates, status, beneficiary (ЕИК; natural persons with no ЕИК and only a first name),
    place of execution (country › NUTS 1 › NUTS 2 › province › municipality › settlement), total value and the
    **cumulative** paid amount, in euro. No EU share per project.
  - Access: ordinary requests with browser-like headers work. After about ten calls in a few minutes, and again after
    13 calls 4 minutes apart, it answers with an HTML page instead of data (HTTP 200, not 429); waiting it out (20,
    then 30 minutes) and spacing calls 4 minutes apart fetched all 29 EU programmes in about two and a half hours.
    Nothing was solved or bypassed.
  - The paid amounts of each 2014–2020 programme's projects match the MoF's paid figures to within 0.5%; for 2021–2027
    ИСУН (5 Oct) is 0–8% above the MoF table (31 Aug), except Development of the Regions: €736 m against €540 m, €180 m
    of the difference being the Just Transition Fund's financial-instruments agreement with the Fund of Funds, which
    started on 10 Sep 2026.
  - The Recovery Plan programme 8010686 (14,801 projects) holds umbrella agreements together with the final
    recipients' projects, so its totals double count: 25 agreements of ministries, agencies and the Development Bank
    (€8.49 bn of €17.98 bn of project value) are treated as umbrella agreements and hidden by default; payments are
    recorded on the final recipients' projects (€4.90 bn paid, against €5.13 bn in the MoF table).
  - The municipal investment programme (8010932) appears there with no projects.
- **EU-level:**
  - Kohesio (kohesio.ec.europa.eu): its API answers scripts (`/api/projects?country=…&limit=1000`: 48,706 Bulgarian
    projects with label, dates and EU/total budget, but no programme, beneficiary or place); the CSV export
    (`/api/projects/download/csv`) stops at 1,000 rows; project details (`/api/projects/<Q-id>`) have the beneficiary
    and the co-financing rate, one request per project; the SPARQL endpoint and the wiki behind it answer 403. There is
    no ИСУН code to join on, so it is not used.
  - cohesiondata.ec.europa.eu: programme level only.
  - FTS: EU money spent directly by the Commission, yearly CSV 2007–2025.
  - umispublic.government.bg holds 2007–13 and is frozen.
- **CAP (State Fund Agriculture):**
  - data.egov.bg organisation 56: one CSV per financial year (16 October – 15 October) for 2015, 2016, 2017, 2021, 2022,
    2023 (CC BY); 2020 has an entry but no data behind it, 2018–2019 were never published. Columns: ЕИК (legal entities
    only; natural persons by name), province, EAGF direct payments, other EAGF, EAFRD with national co-financing, public
    storage, measure. FY2023: 295,266 rows, 2,226.4 million leva.
  - https://seu.dfz.bg/seu/f?p=727:8110 (Oracle APEX), financial years 2024 and 2025: beneficiary × intervention ×
    municipality, in leva, no ЕИК (natural persons have a separate surname column). A plain search form plus the
    report's CSV export (one per province and year) — no challenge. FY2024: 54,942 recipients, 3,198 million leva;
    FY2025: 58,041, 3,104 million leva. From 2024 it also lists national state aid that the older files lack.
- **UNVERIFIED:** the EU Recovery Scoreboard's "100 largest final recipients" list for Bulgaria.

### 2.7 Public procurement (checked in October 2026)
On the site since October 2026 ("Lists" › "Public procurement"); extracts, checks and licences in
`data/sources/procurement/README.md`.
- **Public Procurement Agency (АОП) on data.egov.bg (organisation 502).** Policy page:
  https://www2.aop.bg/e-uslugi/otvoreni-danni-ot-rop/.
  - **Yearly contract and amendment CSVs**, 2016–2025: one file a year from the old register (РОП) until 2019, then one
    from РОП and one from the e-procurement platform ЦАИС ЕОП for 2020–2023; **2024 and 2025 only from РОП** — the last
    contracts of procedures opened there (136 and 50 contracts); the platform's contracts of those years are not on the
    portal. 35,343 ЦАИС ЕОП contracts in 2023. Supplier and buyer ЕИК, object, EU funding, offers, value at signing
    (without VAT), no CPV code. Licences: CC0 (2020, 2023–2025), CC BY (2016–2017, 2021–2022), none stated (2018–2019).
    24 supplier "ЕИК"s in the files are personal identity numbers (registered farmers and other persons).
  - **OCDS releases of every ЦАИС ЕОП notice since 1 Jan 2026** (CC0): fortnightly files until 3 June 2026, daily since
    (with 265 releases repeated once at the switch). Buyer and supplier ЕИК, CPV per lot, procedure (open/selective/
    limited only), offers, contract value without VAT, signing date, amendments; no payments. 30,727 contracts to
    30 September (26,719 from 2026 award notices; 4,008 earlier contracts amended in 2026).
  - **ЦАИС ЕОП's own JSON open data** (https://app.eop.bg/today/reporting/open-data): daily files of procedures,
    contracts and amendments since 29 June 2026, which by the Agency's rules cover data from 2020 — the likeliest
    source for 2024–2025 at contract level. A JavaScript application; not explored.
  - **The Agency's yearly reports on the procurement market** (https://www2.aop.bg/aop/god-dokladi/pazara-na-op/) give
    the totals: 35,343 contracts, 15.8 bn leva (2023); 36,212, 21.6 bn leva (2024); 40,089, 23.3 bn leva (2025).
- **TED API v3** (`POST https://api.ted.europa.eu/v3/notices/search`): answers scripts; award notices of Bulgarian
  buyers: 15,933 in 2024 and 17,475 in 2025 (without modification notices and replaced versions), above the EU
  thresholds only. Notice values are totals of a notice's contracts (framework maxima included), 132–153% of the
  Agency's totals for all contracts; 18% of the notices name no winner in TED's data.
- **opentender.eu** is behind Cloudflare [S].
- **No ЕБК codes anywhere.** Buyers are linked to the trees by ЕИК and name (ministries and municipalities), suppliers to
  the SEBRA payees by exact name and to the EU projects by ЕИК.

### 2.8 Capital and investment programmes attached to the budget
On the site since October 2026 as lists ("Lists" › "Investment projects"), linked from the ministries and municipalities; extracts, checks
and caveats in `data/sources/projects/README.md`.
- **ЗДБ 2026, Annex 2 to art. 110** — "Програма за приоритетни стратегически инвестиционни проекти 2026–2028". In the State Gazette HTML, idMat=245041 (script).
  - **199 projects** (codes NP-25.xxx, a few NP-26.xxx), each with capex for 2026 and forecasts for 2027–2028, a result indicator and the responsible institution. **2026 total €1,438.6m** (2027: €1,773.5m, 2028: €2,244.9m).
  - Largest institutions: Defence (34 projects, €841.5m), Regional Development (67 projects, **€357.2m**; an earlier count here said €347.0m), then rail infrastructure (€123.3m), rolling stock (€41.7m), ports (€16.2m) and health (€14.6m) — each of the last four equals the matching capital-transfer or capital item of ПМС № 102/2026, Annex 1.
- **2025 report, priority projects:** РМС № 737/24.09.2026, annex pr.6 = https://strategy.bg/download/1327217 (XLSX). Also Pril_t.54.xlsx in the minfin.bg ZIP.
  - Section I: **176 projects**, planned 2025 capex 2,924.9m lv (equal, project by project, to the 2025 Act's Annex 2) vs 2,401.4m lv reported at 31.12.2025. Six of them are paid through transfers to universities, Plovdiv municipality or hospitals and report 0; without them, 170 projects and 2,891.8m lv (the figures given here before).
  - Section II: the reserve list, 228 rows with "indicative" amounts (3,811.1m lv; 346.8m lv reported); one code is printed twice.
- **Municipal investment programme (Инвестиционна програма за общински проекти):**
  - **Original list:** ЗДБ 2025 Annex 3 (ДВ 26/27.03.2025, idMat=233694), https://dv.parliament.bg/DVPics/2025/26_25/1619.pdf. 120-page PDF with a text layer; **3,066 projects** (2,888 OP-24 + 178 OP-25), with total value in thousand lv and the municipality.
  - **2025 payments:** annex pr.7 = https://strategy.bg/download/1327218 (XLSX, also Pril_t.55 in the minfin ZIP).
    - **3,492 projects in 264 municipalities**, keyed by municipality ЕБК code, project code, name and municipality.
    - Columns: transfer paid in 2025, Bulgarian Development Bank financing in 2025, total.
    - 717 projects received money; 826.8m lv in total.
  - **2026 list:** **ПМС № 103/12.08.2026** (ДВ 75/2026, idMat=245381), Annex 1 = https://dv.parliament.bg/DVPics/2026/75_26/4508_1.pdf (178 pages, 3,492 projects).
    - Columns: application and agreement no./date, agreement value, transfers to date, 2026 forecast (excluding payments to 31.07.2026), amount left for later years, all in €. Printed totals: agreements €3,006.9m, transfers €1,064.2m, 2026 forecast €2,555.6m (against legal caps of €460.2m through the Development Bank and €600m from the central budget), later €923.5m. Parsed by its ruled cell borders (pdfplumber).
    - Annex 7 is the template for a **monthly progress report the regional development ministry (МРРБ) must publish** (art. 12).
  - **Live status:** https://ipop.mrrb.bg/reports_projects_export.php, a CSV (UTF-8, `;`, decimal comma) checked on 5 Oct 2026: **3,492 projects** (not 3,620), the codes, municipalities and names of pr.7; agreement value, claims under review, approved and unpaid, paid by the ministry in 2024–2025 / 2026 and by the Development Bank. Totals that day: agreements €3,010.5m, paid €1,122.0m.
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
  - On the site since October 2026: the 33 universities under "Budget 2026" › Education › State universities (they add up exactly to the subsidy) and the Academy under Science.
  - These transfers are **not** part of the Ministry of Education's or Defence's expenditure in the act (they are "Предоставени трансфери", outside "Разходи"), so no programme of either ministry contains them; "Ministries 2026" only mentions them in a note.
  - ПМС № 102/2026 Annex 2 splits each university's transfer into teaching, research, student support, capital and other transfers (not used yet).
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
| 5 | 2025 State Budget execution report (РМС 737/2026) | pr.4 actuals per spending unit by economic category; pr.5 КФП by paragraph/sub-paragraph × budget; pr.6/pr.7 project lists | strategy.bg/download/1327215 … 1327218 (also minfin.bg/upload/65173/…zip, which adds pril_3.docx, the programme review) | XLSX, DOCX | 2025 actual | Yearly (Sep) | strategy.bg: script; minfin: browser; on the site |
| 6 | **ПМС 102/2026, Annex 1** | 44 units → 80 policy areas (+ 19 other area rows) → 203 programmes → staff / running costs / capital + named administered items | strategy.bg/download/1325203 (DOCX); dv.parliament.bg/DVPics/2026/74_26/4489_1.pdf | DOCX / PDF | 2026 plan | Yearly | Script; on the site |
| 7 | Programme budgets attached to the bill | 45 draft programme budgets with indicators | parliament.bg/bills/52/52-602-01-19.zip | PDF | 2026 draft | Yearly | Script |
| 8 | Ministries' quarterly programme reports (Б.1 / Б.2) and semi-annual/annual performance reports | Programme actuals by quarter; departmental vs administered; indicators | Each ministry's site, e.g. mvr.bg/upload/334892/… | XLSX / XLSM / PDF / DOCX | Varies by ministry (Interior page lists Q1–Q2 2026; Health has end-2023 to mid-2026 [S]) | Quarterly / semi-annual | Mostly script (mon.bg is behind Cloudflare [S]) |
| 9 | MoF programme-budgeting instructions | Report formats and deadlines | minfin.bg/bg/241 | PDF / XLS | 2022–2026 | Yearly | Browser |
| 10 | ЗДБ 2026 (State Gazette) | Art. 2–47 units; art. 11(4)/16(4) per university; art. 51/52 per municipality; Annex 2 (199 projects) | dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=245041 | HTML | 2026 | Yearly | Script; on the site |
| 11 | ЗДБ 2025, Annex 3 | 3,066 municipal projects (original list) | dv.parliament.bg/DVPics/2025/26_25/1619.pdf | PDF (text) | 2025 | One-off | Script (use https) |
| 12 | ПМС 103/2026, Annex 1 | 3,492 municipal projects: agreement, transfers, 2026 forecast | dv.parliament.bg/DVPics/2026/75_26/4508_1.pdf | PDF (text) | 2026 | Yearly | Script; on the site |
| 13 | ipop.mrrb.bg | Live status of the 3,492 municipal investment projects | ipop.mrrb.bg/reports_projects_export.php | CSV (`;`, decimal comma) | 2024–2026 | Live | Script; on the site |
| 14 | MoF "ФО" letters | Per-municipality transfers, extra subsidies, Development Bank loans by project | minfin.bg/bg/337 | PDF + XLS/XLSX | 2015–2026 | Several a month | Browser |
| 15 | Municipal fiscal indicators (4229 / minfin.bg/bg/810) | Per municipality: arrears, commitments, fiscal-rule ratios | data.egov.bg uri 980fa747-e0d0-4371-9457-f41d730040cd | CSV / XLSX | 2017–Q2 2026 | Quarterly | Script (data.egov) [S] |
| 16 | Municipal debt register (4230) | Debt per municipality | uri ee08391e-be09-44c1-b278-b4af8b62a147 | CSV | 2015–2026 | Quarterly | Script [S] |
| 17 | Municipal cash reports (B1/B3) | Activity × paragraph, plan vs actual | sofia.bg/bg/budget; burgas.bg/bg/2026-1; plovdiv.bg/item/budget-and-finance/ | XLS / ZIP / PDF | Varies | Monthly / quarterly | Script, municipality by municipality [S] |
| 18 | SEBRA daily totals (7806; 4225; 4224) | Day × spending unit × payment code | data.egov.bg uri 01293990-7330-49c6-92a2-cc73db73ec24 | CSV via API | May 2015–today | Daily | Script; 7806 on the site (2024 – June 2026) |
| 19 | **SEBRA individual payments (20439)** | Each payment ≥ 5,000 lv: payee, IBAN, payer unit, code, purpose | data.egov.bg uri 57f1e2e7-b235-45e8-94c4-4d69f0b1a690 | CSV (ZIP for 2022–23) | 07.2022–06.2026 | Quarterly (~3–7 weeks after quarter end) | Script (ZIP too); on the site |
| 20 | SEBRA history 2006–2022 | Same fields as row 19 | data.egov.bg 18232 (download broken); mirror register-sebra.acstre.com | ZIP / web grid | 06.2006–06.2022 | One-off | Official broken; mirror browser |
| 21 | MoF SEBRA page | Daily publication, payment-code list | minfin.bg/bg/transparency | HTML | Current year | Daily | Browser |
| 22 | NHIF payments per hospital | Hospital × month, 3 series | nhif.bg/bg/hospitals/bmp/2026 | PDF (text) | 2015–Aug 2026 | Monthly | Script; on the site (2024–2026) |
| 23 | NHIF medicine reports 1–7 | Product × diagnosis; hospital × product × diagnosis; by ATC/INN | nhif.bg/bg/nzok/medicine/1 | XLS | Jul 2020–Jul 2026 | Monthly (+ 2025 annual) | Script; 1 and 7 on the site (2021–2026) |
| 24 | Ministry of Health hospital finances | 180 hospitals × ~25 indicators | mh.government.bg/bg/politiki/standart-za-finansovo-upravlenie-na-drzhavnite-lechebni-zavedeni/ | XLSX | Q2 2019–Q3 2025 | Quarterly (lagging) | Script; on the site (year ends, Q3 2025) |
| 25 | Cost standards (РМС 497/2026) | Standards per school, class, pupil, child … | strategy.bg/download/1323211; minfin.bg/bg/96 | DOCX / PDF | 2026 | Yearly | Script (strategy) [S] |
| 26 | ИСУН open-data API | EU projects, beneficiaries, contracts, cumulative payments | 2020.eufunds.bg/api/v1.0/opendata | JSON | 2014–2026 | Live | Script with browser headers and long pauses (refuses after ~10 quick calls); projects on the site |
| 27 | MoF EU-funds and Recovery Plan execution (18860, 4226, 18958) | Programme × fund; Recovery Plan investment | data.egov.bg (MoF org 103) | CSV | 2016/2023–2026 | Monthly | Script; on the site |
| 28 | Kohesio | 48,706 Bulgarian cohesion projects (label, dates, EU and total budget) | kohesio.ec.europa.eu/api/projects | JSON / CSV (1,000 rows max) | 2014–2027 | Ongoing | Script for the listing; no beneficiary or ИСУН code; SPARQL 403 |
| 29 | CAP beneficiaries (State Fund Agriculture) | Beneficiary × intervention × municipality (FY2024–25); beneficiary × measure × province (older) | seu.dfz.bg/seu/f?p=727:8110; older years on data.egov.bg org 56 | APEX form + CSV export / CSV | FY2015–2017, 2021–2025 | Yearly | Script; on the site |
| 30 | Procurement OCDS (АОП) | Contract award: buyer, supplier ЕИК, CPV, value, amendments | www2.aop.bg/e-uslugi/otvoreni-danni-ot-rop/ → data.egov.bg org 502 | JSON (OCDS) | 1 Jan 2026– | Daily | Script; on the site |
| 31 | Procurement yearly contracts (АОП) | Contracts and amendments | data.egov.bg org 502 | CSV | 2016–2023; 2024–2025 old register only | Yearly | Script; on the site |
| 32 | TED API v3 | Above-threshold notices | api.ted.europa.eu/v3/notices/search | JSON | All years | Daily | Script; 2024–2025 award notices on the site |
| 33 | FTS (European Commission) | Direct EU grants and contracts to Bulgarian recipients | ec.europa.eu/budget/financial-transparency-system/ | CSV / XLSX | 2007–2025 | Yearly | Script [S] |
| 34 | Eurostat gov_10a_exp | COFOG level II × transaction × subsector | Eurostat API | JSON-stat | 1995–2024 | Yearly | Script; on the site (2024, without the subsector split) |
| 35 | ЦАИС ЕОП JSON open data | Procedures, contracts, amendments | app.eop.bg/today/reporting/open-data | JSON | 2020– (per the AOP rules) | Daily | JavaScript app; not explored |

**Access notes.**
- **minfin.bg:** scripts get HTTP 403 from Cloudflare. A normal browser first sees a "Verify you are human" check; once it cleared in the browser session, all pages and files opened.
- The **script-friendly mirrors** of MoF content are data.egov.bg (API: `listDatasets` / `listResources` / `getResourceData`), strategy.bg (Council of Ministers decisions with annexes), dv.parliament.bg (laws and decrees; annex PDFs under /DVPics/, use https) and parliament.bg (bill ZIPs).
- **Currency:** 2026 data is in euro; earlier data is in leva (1.95583).

---

## 4. Recommended next additions

1. **Programmes and benefit lines for all ministries** — **done (October 2026)** for the 2025 and 2026 plans (ПМС № 28/2025 and № 102/2026, Annex 1; per-university transfers from ЗДБ 2026 art. 16(4) and 11(4)).
   - "Ministries 2025/2026" now go unit → area → programme → staff / running costs / capital and named administered items (e.g. "Месечни помощи по ЗСП", "Целеви помощи за отопление") → their parts; 2025 and 2026 programmes are compared in "Compare".
   - Still open from this item: Annex 2's split of each university's transfer, per-university lists for 2024–2025, and programme *actuals* (ministries' quarterly Б.1/Б.2 reports, or pril_3 of the 2025 report).
   - **Per-municipality transfers — done (October 2026)**: "Municipalities 2024/2025/2026" (ЗДБ art. 53/51 with the art. 54/52 split by function): province → municipality → type of transfer → function, with each municipality's ЕБК code and NSI residents (amounts per resident). Municipality ids (`plovdiv-plovdiv`, `scripts/lib/places.ts`) are shared with the "by purpose" trees, and the ЕБК code on each node is the join key for the project and payment data of later phases. Not included: transfers added during the year (ФО letters), municipalities' own revenue and EU funds, and actual (executed) transfers.
   - Refresh once a year: run `scripts/extract/programme_budgets.py` on the next budget-execution decree (expected around April–August of the budget year).
2. **Named capital projects — done (October 2026).**
   - The "Lists" page ("Investment projects") shows four lists: the 199 priority projects for 2026–2028 (with each one's 2025 plan and actual where the code matches), the 2025 programme's 176 projects with plan vs actual, the 228-row reserve list, and the 3,492 municipal investment projects with 2025 payments (pr.7), the 2026 forecast (ПМС № 103/2026) and the live status (ipop.mrrb.bg at 5 Oct 2026), joined on the project code.
   - They are lists, not donut slices; a ministry in "Ministries 2025/2026" and a municipality in "Municipalities 2025/2026" link to their projects, and each project links back. The list format (`ListFile`, with shards for large lists) now also carries the SEBRA payments, hospitals, medicines, EU projects, farm subsidies and contracts.
   - Refresh: run `scripts/extract/capital_projects.py` after downloading a new ipop.mrrb.bg export (the register changes daily); add the 2027 annex when the 2027 budget is adopted. Not done: English names for the ~400 national projects (optional), and municipalities' own capital lists (e.g. Sofia's ~1,390 rows).
3. **"Who gets paid": SEBRA individual payments — done (October 2026).**
   - All quarterly files and the 2022–23 ZIP (07.2022–06.2026, 1.8 million payments) are aggregated by
     `scripts/extract/sebra.ts` into `data/sources/sebra/` (10.0 MB) and shown as five lists: the largest payees of
     each payer system by year and quarter (linked from every ministry of "Ministries 2024–2026" through SEBRA code × 100
     = ЕБК code, and from Sofia), of each paying unit, a search of all 65,588 payees with a page of who paid each, every
     payment of €1 m or more, and the totals by payment code against the daily SEBRA totals.
   - Payee spellings are grouped by account (never shown) and by name; natural persons and sole traders are one group
     without names or purposes — since October 2026 by the rules of the EU-funds lists (`scripts/extract/persons.py`),
     which moved 6,944 payees named before (5,644 sole traders, 1,300 person-like names; €1.25 bn) into the group, now
     €4.31 bn; payments to the public sector (municipalities, NOI, NHIF, budget bodies) are classified and hidden until chosen.
   - Refresh each quarter: `node scripts/extract/sebra-download.ts --daily`, then the extractor and `npm run data`.
   - Not done: the 2006–2022 history (official ZIP broken, mirror unofficial); the SEBRA series of other bodies (NHIF,
     Ministry of Education, Sofia); links from each municipality to the transfers it received (payees "ОБЩИНА …" of
     systems 444/488); the payee ЕИК (not published).
4. **Hospital-level health spending — done (October 2026).**
   - NHIF monthly payments to each of 390 establishments, Jan 2024 – Aug 2026 (95 PDFs, three series), keyed on the
     registration number, with the municipality from its EKATTE code; in the 2024 and 2025 actuals the hospital-care line
     is split by region and hospital (99.8% / 99.9% of the line; the rest is an explicit slice).
   - The Ministry of Health's year-end and latest-quarter finances joined by name (no number in its files): 165 of 180
     hospitals in Q3 2025.
   - Medicines by active ingredient and year, 2021 – Jul 2026, from Справки 1 and 7 (2025 from the annual files).
   - Not done: 2015–2023 (2022–2023 seem to have today's layout and would be cheap; 2015 and 2019 need a second parser); the top
     medicines of each hospital (Справка 5, about 10 MB a month, a 2025 annual file exists); why the devices reports
     cover only half of their budget line; medicines by diagnosis. The NHIF's "all rights reserved" notice is to be
     confirmed with the user (see the README).

5. **EU funds and farm subsidies — done (October 2026).**
   - "Lists" › "EU funds": the 18 cohesion-policy programmes of 2014–2020 and 2021–2027 (MoF 4226 and 18860: budget,
     received from the Commission, paid to date and by year, by fund), the Recovery Plan's 58 investments (18958), all
     82,531 projects of the EU-funded programmes in ИСУН (beneficiary, municipality, value, paid to date), and the State
     Fund Agriculture's payments by measure, by municipality (FY2024–2025) and by recipient (FY2015–2017, 2021–2025).
   - Natural persons and sole traders are never named (neither are their projects): counts and totals only.
   - Every "Spent by: EU funds" slice of the 2024/2025 actuals links to the programmes and the Plan; every municipality
     to its EU projects (2024–2026) and its farm subsidies (financial years 2024 and 2025).
   - Refresh monthly: `python3 scripts/extract/eu_funds.py --download` (the ИСУН part takes about two and a half hours because of
     its rate limit), then without `--download`; CAP once a year, `python3 scripts/extract/cap.py --download` after
     adding the new financial year.
   - Not done: the EU share of each project (ИСУН does not publish it; Kohesio has it but no key to join on); splitting
     the Recovery Plan's umbrella agreements from their sub-projects; contracts of EU beneficiaries; CAP
     for 2018–2020 (not published); FTS direct EU spending; the 2007–13 programmes.

6. **Public procurement — done (October 2026).**
   - "Lists" › "Public procurement" (`data/sources/procurement/README.md`): the Public Procurement Agency's yearly
     contract files 2016–2025 (old register and ЦАИС ЕОП, with the amendments) and the OCDS releases of 1 Jan – 30 Sep
     2026 (deduplicated to one row per contract: 30,727, 26,719 from 2026 award notices) — 239,431 contracts, €58.5 bn
     excluding VAT; every 2026 contract and those of €1 m or more of 2016–2023 one by one; totals by CPV division; all
     20,755 suppliers with their buyers by year (linked to their SEBRA payee by exact name; with the number and value
     of their EU projects, matched by ЕИК); all 3,737 buyers with their suppliers by year, linked from 45 ministries
     and agencies (43 in 2026) and 262 municipalities
     (register `buyer-nodes.csv`); TED's 33,408 award notices of 2024–2025 as a separate, partial list.
   - Checked: every file's rows and sums against an independent recount; 2023 against the Agency's market report
     (35,343 contracts, value within 0.001% once a 165 m leva entry error the report also drops is set aside); two value
     errors are left out of the totals; natural persons and sole traders never named.
   - Refresh: `python3 scripts/extract/procurement.py --download` (new OCDS days), then without `--download`, and
     `npm run data`.
   - Not done: ЦАИС ЕОП's JSON open data (app.eop.bg/today/reporting/open-data, since 29.06.2026, by the Agency's rules
     from 2020 on) would fill 2024–2025 at contract level — a JavaScript application, not explored; contracts outside
     the Public Procurement Act; the EU beneficiaries' contracts in ИСУН; payments under contracts (not published).

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
  - procurement contracts of 2024–2025 on data.egov.bg, other than the old register's last 186 (the Agency's reports
    give the totals: 36,212 contracts, 21.6 bn leva in 2024; 40,089, 23.3 bn leva in 2025), and TED for large ones;
    ЦАИС ЕОП's own JSON open data may hold them;
  - payment-level data for municipalities other than Sofia (and Търговище's own lists).
- **Broken:** the official 2006–2022 SEBRA ZIP (data.egov.bg 18232). The only working copy found is a third-party mirror.
- **UNVERIFIED:**
  - the detailed tables inside pril_3.docx (2025 programme review);
  - the EU Recovery Scoreboard "top 100 recipients";
  - an Excel export in ИСУН's web pages;
  - the OECD per-municipality files;
  - NOI/ДОО execution data (not researched).
- **Checked only by sub-agents ([S] in the text):** the health activity counts, education (except universities), municipal details (the hospital payments, medicine reports and Ministry of Health hospital finances, the EU-funds and CAP sources of §2.6 and the procurement sources of §2.7 were checked in October 2026). Spot-checks of key URLs (nhif.bg, mh.government.bg, ipop.mrrb.bg, www2.aop.bg, seu.dfz.bg) returned HTTP 200 on 4 Oct 2026.
