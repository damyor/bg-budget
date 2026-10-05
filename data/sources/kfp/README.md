# Consolidated fiscal programme (КФП) — plans and totals

The skeleton of every "by purpose" dataset: КФП expenditure by function and sub-function, in the Ministry of
Finance's national classification. Plans, reports and forecasts of different years use the same functions, so the
build gives them the same node ids (see `scripts/lib/kfp.ts`).

| File | Content | Source |
| --- | --- | --- |
| `mtbf-2025-2028-by-function.csv` | КФП expenditure by function and sub-function (Table III-1, with the reserve distributed by function, without the EU contribution), million BGN: 2024 programme, 2025 draft, 2026–2028 forecast, plus the % of GDP printed in the table | Мотиви към законопроекта за държавния бюджет за 2025 г. (актуализирана средносрочна бюджетна прогноза 2025–2028), attachment to РМС № 88 of 24.02.2025 — https://www.strategy.bg/bg/pris/legal-information/reseniia/166337, file https://www.strategy.bg/download/1296995 |
| `kfp-totals.csv` | Per dataset: total expenditure including the EU contribution, expenditure, interest and the EU contribution, in the unit stated on each row | 2024 programme: the same memorandum (table "КФП"); 2024 actual, 2025 programme and 2025 actual: the report on the 2025 State Budget (table comparing "Отчет 2024 г.", "Програма 2025 г.", "Отчет 2025 г."); 2026 and 2027: the 2026–2028 forecast (РМС № 597/2026), see `../budget-2026/` |

Checks: the functions of each column add up to the expenditure in `kfp-totals.csv` (2024 programme BGN 79 238.0 m,
2025 programme BGN 94 685.4 m), and sub-functions add up to their function (one 0.2 m rounding difference in 2024
"Отбрана и сигурност"). The "2025 Проект" column equals the programme the 2025 report compares the outturn with,
and the "2025 programme" column of the 2026–2028 forecast (in euro).

The 2026 programme and the 2027–2028 forecast by function are in `../budget-2026/kfp-2026-by-function.csv`.
