# 2026 budget sources

CSV extracts of official documents for the 2026 budget. All amounts are in euro (Bulgaria adopted the euro on
1 January 2026); the column names say whether a file is in thousands (`kEUR`) or millions (`mEUR`).
`scripts/budget2026.ts` and `scripts/ministries2026.ts` turn them into `public/data/*.json`.

minfin.bg blocks automated downloads, so the files below were extracted from the State Gazette HTML, the bill
packages on parliament.bg and the Council of Ministers decisions on strategy.bg, which carry the same content.

| File | Content | Source |
| --- | --- | --- |
| `kfp-2026-by-function.csv` | Consolidated fiscal programme (КФП) spending by function and sub-function, 2025–2028 (Table III-1) | Updated medium-term budget forecast 2026–2028, annex to Council of Ministers decision РМС № 597 of 6.08.2026 — https://strategy.bg/download/1324547 (also https://www.minfin.bg/bg/1770) |
| `kfp-main-indicators.csv`, `kfp-national-budget.csv` | КФП totals: revenue, expenditure, interest, EU-budget contribution, balance | Same document, Tables 6 and 7 |
| `nhif-2026-tables.csv` | National Health Insurance Fund budget, art. 1 (revenue and expenditure tables) | Закон за бюджета на НЗОК за 2026 г., ДВ бр. 68 от 28.07.2026 — https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=244981 |
| `social-security-2026-tables.csv` | State social security (ДОО) budget by fund, the Teachers' Pension Fund (annex 4) and the consolidated budget of the Social Security Institute | Закон за бюджета на ДОО за 2026 г., ДВ бр. 68 от 28.07.2026 — https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=244982 |
| `social-security-2026-benefits.csv` | Cash benefits by type (sick pay, maternity, childcare, unemployment …), typed in from the explanatory memorandum | Мотиви към законопроекта за бюджета на ДОО за 2026 г., вх. № 52-602-01-18 — https://www.parliament.bg/bg/bills/ID/167156 |
| `municipal-delegated-2026.csv` | State funding of state-delegated activities for each of the 265 municipalities, by function | Закон за държавния бюджет за 2026 г., чл. 52, ДВ бр. 69 от 31.07.2026 — https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=245041 |
| `transfers-universities-media.csv` | Transfers to state universities, the Academy of Sciences and public media | РМС № 597/2026 annex, Table 32 |
| `state-budget-2026-spending-units.csv` | Expenditure of the 46 first-level spending units by policy / functional area | Закон за държавния бюджет за 2026 г., чл. 2–47, ал. 2 |
| `state-budget-2026-programmes.csv` | Budget programmes of 8 spending units (defence, justice, labour, health, environment, regional development, agriculture, State Fund Agriculture), names cleaned up by hand | Programme budgets attached to the bill, вх. № 52-602-01-19 — https://www.parliament.bg/bills/52/52-602-01-19.zip. Included only where each programme set adds up exactly to the policy amount in the adopted law |

Known corrections applied in the build:

- Some names in the State Gazette text mix Latin look-alike letters into Cyrillic words ("Cмолян"); they are
  normalised to Cyrillic.
- In art. 52 the Sofia municipality (Столична община) follows the Smolyan province rows without its own heading; it
  is assigned to Sofia City.
- Where an itemised source covers only part of a function, the remainder is added as an explicit "other" item, so
  every level adds up to its parent.
