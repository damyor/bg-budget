# Municipalities: codes and residents

The register of Bulgaria's 265 municipalities that every dataset uses to name and identify them
(`scripts/lib/places.ts`): the id of a municipality on the site is `<province>-<municipality>`
(e.g. `plovdiv-plovdiv`, `yambol-tundzha`, `sofiya-grad-stolichna-obshtina`), the same in every year. Made by
`scripts/extract/municipal_transfers.py` together with the yearly `municipal-transfers-<year>.csv` files (see
`../budget-2026/README.md`).

| File | Content | Source |
| --- | --- | --- |
| `municipalities.csv` | One row per municipality: `ebk_code` (ЕБК organisation code, e.g. 6609 Пловдив, 7225 Столична община), `province`, `municipality` (as printed in the State Budget Act), `residents_2023_12_31`, `residents_2024_12_31`, `residents_2025_12_31` (population at 31 December, i.e. at the start of the next budget year) | Codes: Единна бюджетна класификация за 2026 г., раздел VII „Кодове на бюджетните организации“, В) „Кодове на общини“ (Ministry of Finance, minfin.bg/bg/1037; the script-friendly copy https://comsy54.bg/wp-content/uploads/2026/01/EBK-2026-public.xlsx, sheet "Local Government", was used because minfin.bg blocks scripts), checked against the codes in attachment 7 to РМС № 737/24.09.2026 (2025 report, municipal investment programme; https://strategy.bg/download/1327218). Residents: НСИ, „Население по области, общини, местоживеене и пол“, time series `Pop_6.1.1_Pop_DR.xlsx` (sheets 2023–2025) — https://www.nsi.bg/statistical-data/206/651. Retrieved 5.10.2026 |

Names and provinces:

- `municipality` is the name as printed in the State Budget Acts 2024–2026 (identical in all three years, Latin
  look-alike letters replaced by Cyrillic): „Марица“, „Родопи“, „Тунджа“ keep their quotes, Бобовдол and Долни
  чифлик are spelled as in the act. `province` is the act's heading without "ОБЛАСТ" (Софийска for Sofia
  Province); Sofia (Столична община), which the acts list after Smolyan without a heading, is in София-град.
- Codes are matched by name within the province: the ЕБК lists Кнежа twice (5604 under Vratsa and 6511 under
  Pleven); the act lists it in Pleven Province, so 6511 is used, as in attachment 7. Sofia's 24 districts
  (7201–7224) are not municipalities and are left out.

Checks (the script stops on any failure):

- 265 municipalities in 28 provinces, each with exactly one ЕБК code. Attachment 7 has the same code for all 264
  municipalities it lists; the one it lacks (Трекляно, no project) is 6009 in the ЕБК.
- NSI: the municipalities of each province add up to the province row, and all 265 to the national total
  (6 445 481 at 31.12.2023, 6 437 360 at 31.12.2024, 6 423 207 at 31.12.2025) — the same populations the site
  uses for "per person" (`../macro/population.csv`). NSI names the town of Dobrich "Добрич - град" (2023–2024) or
  "Добрич" (2025) and the rural municipality "Добрич" (2023–2024) or "Добрич - селска" (2025); they are matched to
  Добрич and Добричка (the town is the larger, ~69 000 residents against ~17 000). "Столична" is Столична община.

## Given names

`given-names.csv` (`name`, `count`): the given names of the natural persons in the farm-subsidy data — the first-name
column of the State Fund Agriculture's register (financial years 2024–2025) and the first word of the old files'
natural persons (2015–2023) — that occur at least twice (8,218). Only names, never surnames or anything that
identifies a person. Written by `scripts/extract/cap.py` and used through `scripts/extract/persons.py` by it,
`scripts/extract/eu_funds.py`, `scripts/extract/procurement.py` and the SEBRA extractor (`scripts/extract/sebra.ts`) to
recognise beneficiaries, suppliers and payees whose name is a person's, who are then never named.
