# GDP and population

Denominators for "% of GDP" and "per person". Every dataset of a year uses the same values.

| File | Content | Source |
| --- | --- | --- |
| *(cached)* `../../raw/eurostat-nama_10_gdp-BG.json` | Nominal GDP, million EUR (2024: 104 767.2; 2025: 116 018.3, provisional) | Eurostat `nama_10_gdp`, fetched by `scripts/lib/macro.ts` (`npm run data -- --refresh` updates it) |
| `gdp-forecast.csv` | Nominal GDP forecast for years Eurostat does not have yet (2026: 130 459; 2027: 141 302 million EUR) | Ministry of Finance autumn macroeconomic forecast 2026–2029, table 6 of the Fiscal Council's opinion — https://www.fiscal-council.bg/bg/publikacii/stanovishte-otnosno-esennata-makroikonomicheska-prognoza-na-mf-za-perioda-2026-2029 |
| `population.csv` | Population at the start of each year (2027 repeats the latest available figure) | Eurostat `demo_pjan` (1 January 2024 and 2025), NSI (31 December 2025) |

Note: the shares of GDP printed in the 2026 budget documents used the spring 2026 forecast (about €125 bn), so they
are higher than the shares here, which use the autumn forecast.
