# Бюджетът на България · Bulgaria's Budget

**Live: <https://damyor.github.io/bg-budget/>**

Interactive visualization of Bulgaria's public spending:

- **Spending** — a drill-down donut: click a slice to zoom into its subcategories, down to the finest level
  the published data allows. The list beside it is the readable twin of the chart (every subcategory, amount
  and share). Pick a year (2024–2027), a version (plan, actual, forecast) and a breakdown (by purpose, by
  ministry, Eurostat COFOG). Amounts can be shown as totals, per person, as a share of GDP, or as *your* share of
  them. "Over the years" under each category compares its plan and actual across all years.
- **Compare** — every category and year side by side in one table, in euro, per person, % of GDP or % of
  spending, with the share of each year's plan that was actually spent.
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
npm test         # unit tests (datasets, series, tree folding, zoom geometry, formatting, tax rules)
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
npm run data              # rebuild from cached downloads in data/raw/
npm run data -- --refresh # download fresh copies first
```

Every node has an id (used in links), Bulgarian and English names, an amount in euro and optional children.
The build validates that children add up to their parent (within rounding). Each dataset also records its year,
version (`stage`: law, draft, forecast, report), breakdown (`family`), the GDP and population of its year and the
currency of its sources. Datasets of one family share node ids, and `public/data/series-<family>.json` holds the
value of every node that appears in more than one of them — that is what the comparisons read.

| Dataset | Source | Levels |
| --- | --- | --- |
| **Budget 2024 / 2025 / 2026** (plan) | Consolidated fiscal programme (КФП) by function and sub-function from the medium-term budget forecasts (2024, 2025: explanatory memorandum to the 2025 budget bill, РМС № 88/2025; 2026: РМС № 597/2026); the year's Health Insurance Fund and Social Security budget acts; the State Budget Act's per-municipality funding of state-delegated activities (2024/2025: art. 54; 2026: art. 52) | area → function → fund / item → … → municipality (up to 6 levels) |
| **2027 forecast** | КФП 2027 forecast by function and sub-function (РМС № 597/2026). Replaced by the draft budget once it is submitted (deadline 31 October 2026) | area → function → sub-function |
| **2024 / 2025 actual** | Reports on the execution of the State Budget (РМС № 673/2025 and № 737/2026): КФП expenditure by function and group, split by budget (state budget, social security, municipalities, EU funds …) and into current/capital spending. Health: the Health Insurance Fund's own execution report by expense line (2025 preliminary), on the same nodes as the plans | area → function → sub-function → spent by → type of expense |
| **Ministries 2024 / 2025 / 2026** (plan) and **2025** (actual) | State Budget Acts, para. 2 of each spending unit's article (2024/2025: art. 2–49, 48 units; 2026: art. 2–47, 46 units) — ministries and agencies by policy / functional area; for 2026 also budget programmes of 8 of them from the programme budgets attached to the bill. The 2025 actual comes from the report on the 2025 State Budget (attachment 4 to РМС № 737/2026); the 2024 report tables are published only as scans. Policy areas get ids from their names, so the same area is comparable across years | ministry → policy area → programme |
| **Eurostat 2024** (actual) | Eurostat `gov_10a_exp` — general government expenditure by function (COFOG) and by economic transaction | area → function → type of expense |

All "by purpose" datasets use the same eight top-level areas (same ids, order and colours), so switching year or
version keeps you in the same category. The 2024 and 2025 sources are in leva and are converted at the fixed rate
of 1.95583. The "Ministries" datasets cover only the State Budget Act's spending units (2026: €13.3 bn of €56.8 bn); their
shares "of all spending" and personal shares are computed against all public spending of the year (`publicTotal`). Where an itemised
source covers only part of a function (e.g. the Health Insurance Fund within all health spending), the difference
is shown as an explicit "other" item, so every level still adds up to its parent.

GDP is Eurostat's for past years and the Ministry of Finance autumn 2026 forecast for 2026–2027; population is
taken at the start of each year (`data/sources/macro/`). The source tables are CSV extracts of the official
documents in `data/sources/` — one folder per budget or report year plus `kfp/` and `macro/`, each with a README
naming the exact documents and articles.

How much deeper the published data goes (programmes of every ministry, named projects, individual payments …) and
where to get it is surveyed in [`docs/data-depth.md`](docs/data-depth.md).

## Code map

```
scripts/            data pipeline (Node, runs TypeScript directly)
scripts/budgetPlan.ts    plans and forecasts by purpose (one builder for every year)
scripts/budgetReport.ts  actual outturn by purpose, from the State Budget execution reports
scripts/lib/kfp.ts       the КФП function skeleton shared by all years, leva → euro
src/lib/            data loading, tree indexing/search, formatting, i18n, palette, tax calculator (rules per year)
src/lib/donutLayout.ts   zoom geometry shared by the SVG chart and the video renderer
src/components/     donut, list, breadcrumbs, search, dataset picker, trend chart, segmented control
src/clip/           clip timeline, canvas renderer, MP4 encoder (Mediabunny + WebCodecs)
src/pages/          Spending, Compare, My money, Clip, About
```

Chart colours come from a palette validated for colour-vision deficiencies (adjacent-pair checks in light and
dark mode); slices beyond the 8th, and slices under 1.5%, are grouped into a grey "Other" bucket that can be
opened like any category.
