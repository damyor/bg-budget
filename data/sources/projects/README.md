# Named capital projects

Lists of the investment projects the state funds by name: the **priority strategic investment projects** of the
ministries (State Budget Act annexes and the 2025 report) and the **Investment Programme for Municipal Projects**
(Инвестиционна програма за общински проекти). Made by `scripts/extract/capital_projects.py` from the cached
downloads listed in `data/cache/projects/MANIFEST.md` (run it again after refreshing them);
`scripts/projects.ts` turns them into the lists on the site's "Lists" page, section "Investment projects" (`public/data/lists/`).

Projects are not tree nodes: their money is part of the capital spending and transfers that the ministries' and
municipalities' trees already count, so they are shown as lists and linked from the matching ministry or
municipality instead.

| File | Content | Source |
| --- | --- | --- |
| `national-priority-projects-2026.csv` | The 199 projects of the programme for 2026–2028: capital spending in 2026, forecasts for 2027 and 2028, result indicator, responsible institution; **thousand EUR** | Закон за държавния бюджет на Република България за 2026 г., приложение № 2 към чл. 110, ал. 1 „Програма за приоритетни стратегически инвестиционни проекти с национално финансиране за периода 2026 – 2028 г.“, ДВ бр. 69 от 31.07.2026 — https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=245041 |
| `national-priority-projects-2025-report.csv` | 2025: section I, the programme (176 projects), and section II, the reserve list (228 rows): planned (section II: indicative) capital spending for 2025 and the capital spending or transfers reported at 31.12.2025; **thousand BGN** | Отчет за изпълнението на държавния бюджет за 2025 г., приложение № 6 (`Приложение № 2, Раздел I и II, към чл. 110`) към РМС № 737 от 24.09.2026 — https://strategy.bg/download/1327217 (decision: https://www.strategy.bg/bg/pris/legal-information/reseniia/171087) |
| `municipal-investment-2025-report.csv` | 3,492 municipal projects with the municipality's ЕБК code: the transfer paid in 2025, the financing through the Bulgarian Development Bank in 2025 and their total; **thousand BGN** | Same report, приложение № 7 „Справка по Инвестиционната програма за общински проекти по чл. 113 от ЗДБРБ за 2025 година (Приложение 3)“ — https://strategy.bg/download/1327218 |
| `municipal-investment-2026-decree.csv` | The same 3,492 projects as listed for 2026: application and agreement (no., date), agreement value, total transfers so far, the 2026 forecast and the amount left for later years; **EUR** (cents) | ПМС № 103 от 12.08.2026 г. за определяне на проекти от Инвестиционната програма за общински проекти … и условия и ред за финансирането им през 2026 г., приложение № 1, ДВ бр. 75/2026 — annex https://dv.parliament.bg/DVPics/2026/75_26/4508_1.pdf (178 pages, text layer), decree https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=245381 |
| `municipal-investment-ipop.csv` | The same 3,492 projects in the regional development ministry's public register: agreement value, payment claims under review, approved and awaiting payment, total paid, paid by the ministry in 2024–2025 / 2026 / another year and paid by the Bulgarian Development Bank; **EUR** (cents) | МРРБ, https://ipop.mrrb.bg/reports_projects_export.php (CSV export, `;` separated, decimal comma; served as `spravka_proekti_20261005_145207.csv`) |

All files were retrieved on **5 October 2026**. The ipop.mrrb.bg export is live: the committed file is the state
of the register at 14:52 that day.

## Columns

`national-priority-projects-2026.csv` — `no` (1–199, as printed), `code` (`NP-25.001-0001` …), `name_bg`,
`capex_2026_kEUR`, `capex_2027_kEUR`, `capex_2028_kEUR` (one decimal as printed; empty where the annex prints "–" or
nothing), `indicator_bg` ("–" where none is published), `institution_bg` (as printed; the transport ministry's
entries name the state company that carries the project out, "Министерство на транспорта и съобщенията/Национална
компания „Железопътна инфраструктура“"), `footnote` (`**` on NP-25.003-0019: "От които 2000 хил. евро са включени в
бюджета на Министерството на културата за 2026 г."). The annex's other footnote says the indicators of the Ministry
of Defence's and the National Protection Service's projects are classified; those 35 rows have "–".

`national-priority-projects-2025-report.csv` — `section` (`I` programme, `II` reserve list), `no`, `code`,
`footnote` (`**` / `***` as printed after the code, see below), `name_bg`, `plan_2025_kBGN` (section I: "Размер на
капиталови разходи по проекта през 2025 г.", section II: "Индикативен размер …"), `actual_2025_kBGN` ("Отчет за
капиталови разходи/трансфери към 31.12.2025 г."), `indicator_bg`, `institution_bg`. Amounts are the cell values
rounded to 3 decimals (exact to the lev); "-" is written as empty. The footnotes:
- `**` NP-25.001-0047 and NP-25.001-0048: the money is given by the Ministry of Education and Science as subsidies to
  state universities, which report the capital spending (2 082,5 and 4 131,6 thousand BGN at 31.12.2025);
  NP-25.001-0049: transfers of 15 908,2 thousand BGN to Plovdiv municipality (ПМС № 156/2025 and № 265/2025), which
  reports the spending.
- `***` NP-25.001-0043, -0044, -0045: the Ministry of Health's capital spending was reduced by 19 193 516 BGN and the
  money given as transfers (5 666,8 / 8 955,5 / 4 571,2 thousand BGN).
These six projects report 0 in the "actual" column; the site shows the footnote instead of a share spent.

`municipal-investment-2025-report.csv` — `ebk_code` (the municipality's ЕБК code, as printed), `code`
(`OP-24.001-0001` …), `name_bg`, `responsible_bg` ("Община Банско, област Благоевград"), `transfer_2025_kBGN`
("Предоставен трансфер за 2025 г."), `bdb_2025_kBGN` ("Предоставено финансиране за 2025 г.", through the Bulgarian
Development Bank), `total_2025_kBGN` (5 decimals, as in the cells).

`municipal-investment-2026-decree.csv` — `code`, `name_bg`, `municipality`, `province` (as printed), `ebk_code`
(added by the extractor: the municipality's code in `../places/municipalities.csv`), `application` ("Заявление за
финансиране (No, дата)", empty for 588 projects), `agreement` ("Сключено споразумение №/дата"; printed as "0" for the
1,121 projects without one, written as empty), `agreement_EUR`, `transfers_EUR` ("Общо предоставени трансфери"),
`forecast_2026_EUR` ("Прогнозен бюджет на проекта за 2026 г.*"), `later_EUR` ("Оставащи за реализация в бъдещ
период"). The decree prints "- €" for zero (written as `0`) and leaves some cells blank (written as empty: 580 in the
2026 forecast, 2,884 in "later"). Its footnote: "* Прогнозният бюджет за 2026 г. на проект не включва стойността на
извършените плащания до 31.07.2026 г. (вкл. и плащанията чрез ББР)".

`municipal-investment-ipop.csv` — `code`, `province`, `municipality` (as in the export), `ebk_code` (added, as
above), `agreement_EUR`, `in_verification_EUR` ("Заявено в процес на проверка от МРРБ"), `approved_unpaid_EUR`
("Одобрено за плащане от МРРБ и очакващо разплащане"), `paid_EUR` ("Общо изплатено"), `paid_mrrb_2024_2025_EUR`,
`paid_mrrb_2026_EUR`, `paid_mrrb_other_EUR` ("друга / неуточнена година"), `paid_bdb_EUR` ("Изплатено от ББР"; blank
in the export is written as 0). The export's project names are identical to attachment 7's for all 3,492 codes (the
extractor checks this), so they are not repeated here.

## How the extract was made

- **Annex 2 (2026)** is a table in the State Gazette HTML. One empty row at a page break is skipped; the "**" after
  project 199's 2026 amount is moved to `footnote`; Latin look-alike letters in Cyrillic words are replaced
  ("Oбезпечаване").
- **Attachments 6 and 7** are clean XLSX sheets. In attachment 6 the institution names close their quotes with `"`;
  they are written with „…“ as in the 2026 annex. NP-25.002-0082 appears twice in section II (88,3 and 117,8
  thousand BGN, also twice in the 2025 Act); both rows are kept.
- **ПМС № 103/2026, Annex 1** is a PDF table with ruled cells. Every character is assigned to the cell whose borders
  contain its centre (column borders are read on each page, as they shift slightly between pages), so long words
  that overflow a cell stay in it. A dash the PDF puts before 5 municipality names ("- Кричим") is removed. The names
  keep the PDF's line-break hyphens ("Пет-рич", a soft hyphen in the register); apart from those, they match
  attachment 7 except for three (two missing dots after "ул" and one name cut off at the end of its cell), so the
  site uses attachment 7's names.
- **ipop.mrrb.bg** spells Sofia "София град / Столична" and Sofia Province "София област", and some names differ in
  spacing or case ("Вълчидол", "Долна Баня"); places are matched to the register without spaces, hyphens, quotes or
  case, with those three aliases.

## Checks (the extractor stops on any failure)

- Annex 2 (2026): projects numbered 1–199, codes unique. 2026: 1 438 621,1; 2027: 1 773 490,5; 2028: 2 244 940,1
  thousand EUR. Defence: 34 projects, 841 511,2; regional development: 67 projects, 357 231,1.
- Attachment 6: each section adds up to its "ОБЩО" row — section I plan 2 924 945,9 and actual 2 401 383,7, section II
  3 811 126,1 and 346 842,4 thousand BGN. **The plan equals the State Budget Act 2025, Annex 2 (ДВ бр. 26/2025),
  project by project** (same projects in the same order; the Act prints one decimal). Without the six footnoted
  projects, section I is 170 projects with a plan of 2 891 827,6 thousand BGN.
- Attachment 7: 3,492 projects in 264 municipalities (Трекляно has none), 717 with money in 2025; transfer + Development
  Bank = total on every row; the columns add up to the summary row (749 999,99995 + 76 795,195 = 826 795,195 thousand
  BGN). Each ЕБК code is in the register and names the municipality the row names.
- ПМС № 103/2026: 178 pages, 3,492 projects, the codes of attachment 7 with the same municipality; the columns add up
  to "Общо всичко:" (agreements 3 006 870 159,18; transfers 1 064 239 765,61; 2026 forecast 2 555 613 686,18; later
  923 459 145,22 €) within €0.10 — the printed totals were summed before rounding to the cent.
- ipop.mrrb.bg: the same 3,492 codes, municipalities and names; on every row the paid parts add up to the total paid.
  Totals at 5.10.2026: agreements €3 010 451 096,68; paid €1 121 972 229,26 (ministry 2024–2025 €639 012 724,24,
  2026 €62 052 666,77; Development Bank €420 906 838,25); claims under review €162 733 003,87; approved and awaiting
  payment €149 428 241,25. 2,371 projects have an agreement, 1,580 have been paid something.

Cross-checks against other documents (in `src/lib/__tests__/projects.test.ts`):

- The 2026 projects of the transport ministry equal, per state company, the capital transfers in the programme
  budgets (ПМС № 102/2026, Annex 1, programme 2300.01.01): rail infrastructure €123 322 500, new trains and rolling
  stock €41 650 700, ports €16 151 700. The health ministry's six projects (€14 588 500) equal its two items
  "Капиталови разходи за приоритетни стратегически инвестиционни проекти" (€1 088 500 + €13 500 000); the
  energy-efficiency project for 48 blocks of flats (NP-25.001-0111) equals the regional development ministry's item
  for it (€17 438 900). Defence's €841.5 m fits in its capital spending (€868.9 m).
- The municipal programme's legal ceiling for 2026 is in the State Budget Act 2026, art. 113: up to €460.2 m through
  the Bulgarian Development Bank and up to €600 m from the central budget (also art. 2 of ПМС № 103/2026). The decree's
  2026 forecasts add up to €2.56 bn, far more: they are the projects' needs, not money set aside.
- The earlier inventory (`docs/data-depth.md`) gave €347.0 m for the regional development ministry's 2026 projects
  and "170 projects, 2 891,8 m lv" for 2025; the annex adds up to €357.2 m, and section I has 176 projects (170
  without the six footnoted ones).

Spot checks against the documents: NP-25.001-0016 (F-16 Block 70, phase II) 374 904,6 / 243 400,9 / 589 305,0
thousand EUR; NP-25.121-0006 274,8 / – / 4 864,8; OP-24.001-0001 (Банско): decree agreement 2 789 097,21 €,
transfers 2 629 780,95 €, ipop paid 2 376 722,72 € by the ministry + 253 058,23 € by the Development Bank;
OP-24.001-0003: 1 254,21417 thousand BGN in 2025 (attachment 7); OP-24.001-2355: 2026 forecast 872 536,16 € (decree).
