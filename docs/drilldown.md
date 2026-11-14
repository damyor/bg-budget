# Drilling down: splitting boxes further, round by round

The trees stop where their sources stop. In "Budget 2026", for example, „Икономика и транспорт › Енергетика, горива и
минно дело“ (€2.80 bn) was a leaf: the medium-term forecast gives only the sub-function total. Other documents do
say what parts of it are (the Electricity System Security Fund, the Ministry of Energy's programmes …), but each
covers only part of the box and comes in its own shape.

The drill-down mechanism is the general way to use them, one round at a time:

1. once a box is known (Sector A is X €) and some of its parts are found (a, b, c), they go into the tree with an
   explicit **remainder** for the rest, so every level still adds up;
2. what is still open, and what was tried, is written down in a **ledger** for the next round;
3. the build writes a **frontier** report of where the money stops, largest first.

Visitors see the result as they go up and down the tree: parts with their source, remainders marked as computed, and
an honest note on every box that goes no further.

All of it is in `scripts/lib/drilldown.ts`, called by `scripts/build-data.ts` after every dataset is built and before
the links between datasets are checked, the trees validated (children add up to their parent), the series for
comparing years built, the lists linked and anything written:

```
builders → parts files and grafts (in dependency order) → ledger → checks, validation, series, lists, writing → frontier
```

Files:

| File | What |
| --- | --- |
| `data/sources/<topic>/<name>.parts.csv` + `<name>.parts.json` | Parts of boxes, from one document, next to that topic's other extracts and README |
| `data/drilldown/grafts.csv` | Subtrees another dataset already has, copied under a box (or linked) |
| `data/drilldown/programme-map.csv` | Which КФП box each ministry's policy area / programme / item is grafted into, or why it is left out (see "The programme map") |
| `data/drilldown/ledger.json` | What is known about each box that stays as it is: state, note for visitors, leads, attempts |
| `data/drilldown/frontier.md` | Written by `npm run data`: depth by dataset, the open boxes, ledger problems. Committed, deterministic (no run dates), so each round's progress shows in its diff |

## Remainders

`build()` (`scripts/lib/tree-builder.ts`) turns the gap between a node and its itemised children into an explicit
child — `h-other`, `ed-other`, `s-ben-assistance`, a report slot's `<slot>.rounding` … — and marks it `rest: true`
(`BudgetNode.rest`). Parts files and grafts make their remainders the same way (`<parent>.rest`). A remainder is
always a leaf: to split one, put the parts under its parent and the remainder shrinks (see below).

On the site a remainder has a quiet „остатък“ / "remainder" tag in the list of its parent's children, and its page
says „Изчислено като разлика — частта от „{parent}“, която източниците още не разпределят.“ / "Computed as the
remainder — the part of “{parent}” the sources do not itemise yet.", followed by its ledger state and note.

## Parts files

A parts file is a CSV named `<name>.parts.csv` anywhere under `data/sources/` (the build finds them all), with a
sidecar `<name>.parts.json`. `<name>` must be unique across folders: it is the key of the source in the dataset.

CSV columns (UTF-8, comma-separated, one header row):

| Column | Required | Content |
| --- | --- | --- |
| `dataset` | yes | The dataset id (`budget-2026`, `report-2025` …). One file can serve several datasets (2026, 2027 …) |
| `parent` | yes | The id of the node the row splits — a node of the built tree, a node made by another parts file or graft, or another row's `id` (the row then nests under that row, at any depth) |
| `id` | yes | The new node's id: URL-safe (letters, digits, `-`, `.`, `_`), stable across years, from an official code where there is one. Reuse the id the same thing has in another dataset of the family (e.g. `e-energy.fses`, which the reports already have), so "Over the years" and "Compare" line them up |
| `name_bg`, `name_en` | yes | The official Bulgarian name (Latin look-alike letters in Cyrillic words are normalised) and a concise, faithful English one |
| `value_eur` | yes | Euro, a plain number with a decimal point (`1487826000`, `38412345.6`); leva are converted at 1.95583 before they go in |
| `code` | no | Official code (programme, ЕБК, ЕИК …) |
| `kind_bg`, `kind_en` | no | What kind of item it is („Фонд“ / "Fund" …); both or neither |
| `note_bg`, `note_en` | no | A short note for visitors; both or neither |

Sidecar:

```json
{
  "source": { "bg": "Актуализирана средносрочна бюджетна прогноза 2026–2028 (РМС № 597/2026), приложение 8", "en": "Updated medium-term budget forecast 2026–2028 (Council of Ministers decision 597/2026), annex 8" },
  "url": "https://strategy.bg/download/1324547",
  "basis": "mapped",
  "rest": {
    "name": { "bg": "Други разходи за енергетика", "en": "Other energy spending" },
    "note": { "bg": "…", "en": "…" }
  }
}
```

- `basis` — how the parts relate to the box:
  - `exact`: finer rows of the same accounts or document (e.g. the lines under a total of the same table);
  - `mapped`: official figures of another document placed into this box by a documented mapping (say in the topic's
    README why they belong here);
  - `payments`: recipients from payment records (see the rule on payments below).
- `rest` — the name (and note) of the remainder the parts leave.
- `replace: true` — only with a stated reason (in the README): the parts replace the box's children (e.g. recipients
  replacing a current / capital split that tells nothing more).

How the parts go in (on the built trees, before anything is checked or written):

- **The box is a leaf** → the parts become its children; the gap (more than €0.2 m) becomes `<parent>.rest`
  (`rest: true`, named by the sidecar). A single part equal to its box splits nothing and fails: say it in a note.
- **The box has a remainder child** → the parts are appended and the remainder shrinks by their sum; it goes when
  it reaches rounding (€0.2 m). A `.rounding` child of the reports is not a remainder for this.
- **The box has children and no remainder** → fails, unless `replace: true`.
- Children are sorted by value again. The box's own value never changes, and no value is ever scaled or estimated
  to make parts fit.
- **Fails**, naming the file, the box and the amounts, when: the parts add up to more than the box (beyond €0.2 m),
  or more than its remainder; the parent or dataset does not exist; an id is taken; the box is itself a remainder;
  files and grafts depend on each other in a cycle.

Provenance: the sidecar's source goes once into the dataset (`Dataset.refs[<name>] = {name, url, basis}`) and each
part gets `ref: "<name>"`. On the site a part's page shows „Източник на сумата: <source>“ with a link, and for
`mapped` "placed here by a documented mapping", for `payments` "from individual payments". Nodes the builders made
have no `ref`: the dataset's own sources (in the footer) apply.

## Grafts

`data/drilldown/grafts.csv` reuses a subtree another dataset already has, typically a ministry's programmes
("Ministries 2026") under the КФП box they belong to ("Budget 2026"):

```
dataset,parent,source_dataset,source_node,mode,id,name_bg,name_en,note_bg,note_en,rest_bg,rest_en,rest_note_bg,rest_note_en
budget-2026,e-energy,ministries-2026,moen-energy,part,,,,,,,,,
budget-2026,education,ministries-2026,p1800-02-08,part,,Обучение на кадри в изкуството и културата — Министерство на културата,Training in the arts and culture — Ministry of Culture,Държавните училища по изкуствата и културата.,The state schools of the arts and culture.,,,,
report-2025,e-energy.state,ministries-report-2025,moen-energy,link,,,,,,,,,
```

- `mode=part` (the default) copies the built subtree of `source_node` under `parent`, with the same accounting as
  parts (leaf → children and a remainder; appended into a remainder; never over the box). The copy's root id is
  `id`, or `<parent>.<source_node>`; its descendants become `<root id>.<their id>` — unique, URL-safe and stable as
  long as the source ids are. Names and note can be overridden for the root. The root links back to the original
  node (`seeAlso`, "The same in “Ministries 2026”"); the copies drop their own links. Their `ref` is the source
  dataset (basis `mapped`, named by its `sourceShort`), or the parts file a copied node came from. Only the root
  keeps its note (or takes `note_*`); the copies below it drop theirs, which the original has one link away — this
  keeps the datasets small.
- `rest_bg`, `rest_en` (and `rest_note_bg`, `rest_note_en`) name the box's remainder once the copy is in — the one a
  graft into a leaf makes (`<parent>.rest`, otherwise „Други (неразпределени)“ / "Other (not itemised)") or a
  builder's remainder the copy shrinks (it keeps its id, e.g. `ed-other`, and takes the new name, and the note when
  one is given). At most one row per box names it, and the build fails if nothing is left to name. A remainder made
  by a graft takes no kind (the copy's kind is a level of another dataset).
- `mode=link` only adds a `seeAlso` from `parent` to the source node (its name, or `name_*`, is the link's text) —
  for related breakdowns whose scope does not fit, e.g. a ministry's spending that is larger than the КФП box it
  relates to.
- A graft runs after the parts and grafts that create its parent, and after those that add parts inside the subtree
  it copies.

The first row (14 November 2026) put the Ministry of Energy's policy area „Енергетика“ (2400.01) from "Ministries
2026" under „Енергетика, горива и минно дело“ in "Budget 2026" (why: data/sources/budget-2026/README.md); the same
day the programme map grafted the rest (below).

### The programme map

`data/drilldown/programme-map.csv` (columns `dataset, source_dataset, source_node, code, name_bg, value_eur, target,
reason`) walks every unit of "Ministries 2025/2026/2027" down to the level that is mapped: `target` is the box (a
node id of the "by purpose" tree, e.g. `o-police`, or a builder's remainder such as `ed-other`), `split` (see the
rows below it) or `left out`, with a one-line reason. Every mapped row is one graft row (into the box, or into the
remainder's parent, which shrinks it). `src/lib/__tests__/programmeMap.test.ts` checks that the map covers every unit
once with the dataset's amounts and that it and `grafts.csv` agree.

The rules (14 November 2026):

- **ЕБК activities decide the box.** A programme belongs to a sub-function when its spending is booked under that
  sub-function's activities in the ЕБК functional classification (`data/sources/cities/ebk-activities.csv`): roads
  832 → transport, fire service 224 → police, art schools 323 → education, state archives 747 → culture, the
  statistics institute 141 → general services … The ministries' „Администрация“ programmes and the independent and
  control bodies go to the executive bodies (function I, 101–139).
- **Go down until it fits.** An area whose programmes belong to different boxes is split into its programmes, a
  programme into its items (e.g. the labour ministry's benefits, ЕБК 511–519, to benefits; their staff, 522, to
  services). What cannot be placed with confidence (a mixed programme without a split, an unclear activity) is left
  out and stays in the remainder, with the reason in the map. Never scaled.
- **No transfers to other budgets the tree already counts:** no programme item is a transfer to the NHIF, the ДОО,
  ФСЕС or the universities' subsidies (those are outside „Разходи“ in the decree); items that are transfers to
  municipalities spent under other functions (State Fund Agriculture's VAT refunds on municipal projects) are left
  out.
- **The 2027 draft** gives areas only: an area is grafted when, in 2026, all of it goes to one box. **"Ministries
  2024"** has the programme budgets too since 14 November 2026 (ПМС № 13/2024): each node is mapped at the level the
  2025 map uses for the same id, with the 2025 reason, so the grafted copies have the ids of 2025.
- **The 2025 actual** ("Ministries 2025 (actual)", areas only) goes only into the actual's state-budget boxes that are
  leaves or remainders (so far only „Здравеопазване“'s remainder takes parts: the health ministry's areas). The other
  state-budget boxes are split into current and capital spending: parts there would replace that split, which is left
  open, so they get `mode=link` rows to the matching ministries or areas instead (links are not in the map).
- **Cross-check against the 2025 actual.** The 2025 report's КФП by function has a state-budget column per
  sub-function; the same mapping applied to "Ministries 2025 actual" (areas) and the 2025 plan (for split areas)
  must not exceed it. It fits everywhere (police €2,351.7 m of €2,402.2 m, judiciary €779.7 m of €792.1 m, executive
  bodies €1,000.6 m of €1,016.2 m, agriculture €446.8 m of €447.1 m on the actual areas, prisons and religion
  exactly) except sport (+€8.7 m, not resolved) and services, where personal assistance is paid through the
  municipalities' column. The same check is why the defence ministry's military police and intelligence, the
  meteorology institute and the innovation ministry's grants are left out. Details per year: the budget READMEs.

## The ledger

`data/drilldown/ledger.json` is an array of entries, typed as `LedgerEntry` in `scripts/lib/drilldown.ts`:

```json
{
  "family": "functions",
  "node": "e-energy",
  "datasets": ["budget-2026", "budget-2027"],
  "state": "todo",
  "note": { "bg": "…", "en": "…" },
  "checked": "2026-10-13",
  "leads": [{ "source": "MTBF 2026–2028 annex 8: ФСЕС …", "url": "https://strategy.bg/download/1324547", "basis": "mapped", "covers": "2026 ≈53%", "access": "script", "note": "…" }],
  "tried": [{ "date": "2026-10-13", "what": "Table III-1: function totals only." }]
}
```

- `node` — a node id; `datasets` — only these datasets of the family (default: every one that has the node). Use
  `datasets` where the situation differs by year (e.g. `e-energy` is a leaf in the plans but split by payer in the
  reports). Two entries may not cover the same node of the same dataset.
- `state`:
  - `todo` — there are leads to follow;
  - `no-source` — nothing finer is published (say what was checked, and when, in `checked` and `tried`);
  - `blocked` — finer data exists but cannot be used yet (e.g. medicines per active ingredient are gross amounts,
    before the discounts the budget lines deduct);
  - `final` — as fine as it should go (e.g. one kind of benefit, paid to people). Only `final` closes a remainder in
    the frontier.
- `note` — for visitors: short, true and useful; none on a `todo` unless it says something worth knowing.
- `checked` — when the sources were last checked (shown with `no-source`).
- `leads` (`source` required; `url`, `basis`, `covers`, `access`: `script` / `browser` / `unknown`, `note`) and
  `tried` (`date`, `what`) stay in the repo; mark a lead "to verify" when unsure.

The build checks the shape (unknown fields, states, dates, datasets of the wrong family …) and stops on a malformed
entry. It copies only `{state, note, checked}` onto each matching node, as `status`. It does not stop on **stale**
entries but lists them in the frontier: a node that no longer exists (in a dataset the entry names, or in every
dataset of the family), or a `final` / `no-source` box that has parts now (an economic split below it does not count).

What visitors read under a box (`src/lib/nodeNotes.ts`, strings in `src/lib/i18n.ts`):

| Box | Note |
| --- | --- |
| leaf, no entry | „Засега това е най-подробното ниво в данните на сайта.“ / "For now this is the finest level in the site's data." |
| `todo` | the same, then „Проучваме източници за по-подробна разбивка.“ / "We are looking into sources for a finer breakdown." |
| `no-source` | „Не са публикувани по-подробни данни (проверено на {date}).“ / "No finer data has been published (checked {date})." |
| `blocked` | „По-подробни данни има, но засега не могат да се използват.“ / "Finer data exists but cannot be used yet." |
| `final` | nothing of its own |
| remainder | „Изчислено като разлика — частта от „{parent}“, която източниците още не разпределят.“ / "Computed as the remainder — the part of “{parent}” the sources do not itemise yet.", then its state |

The entry's own note follows in every case. A box with parts and a status (e.g. a report's ФСЕС, split only into
current and capital) shows the state and note too.

## The frontier

`npm run data` prints one line per dataset and writes `data/drilldown/frontier.md`:

- **Depth by dataset** (all families): the total; the money-weighted leaf depth (root = 0, area = 1); and three
  shares of the total, each leaf counted once — in remainder leaves (€1 m or more, `.rounding` left out), else in
  economic-split leaves, else in leaves at depth ≤ 2 (an area, function or sub-function).
- **Open boxes**, by euro, the top 40 of each "by purpose" dataset and the top 15 of the others: value, share of the
  total, path (Bulgarian names) and id, depth, why it is open, ledger state, first lead. A box is open when it is
  - a leaf not marked `final` or `no-source`;
  - a remainder not marked `final`;
  - a node whose children are all an economic split — listed once there, not again for its children.
  `.rounding` leaves are not boxes.
- **Ledger problems**: stale entries, and open boxes of €250 m or more with no ledger entry (in every dataset).

**Economic split** ("accounting-only") means a level that splits a box only by economic category, not by purpose or
recipient. The set, matched on the Bulgarian name of the node's kind (or of its level, the deepest level for nodes
beyond the list): „Вид разход“ (the reports' current / capital split, Eurostat's transactions, and the big cities'
kinds of spending — salaries, running costs, subsidies, capital), „Ведомствен разход“ (the ministries' departmental
staff / running costs / capital) and „Параграф“ / „Подпараграф“ (the cities' ЕБК paragraphs). So a city's
finest purpose level is its ЕБК activity, and an activity split into kinds of spending is one open box. Named
administered items of the ministries („Администриран разход“) and the municipalities' mayors / staff split are not
in the set.

## Rules

- **Parts add up**: they never exceed their box; the gap is an explicit remainder, never a scaled or estimated figure.
- **Same period and scope**: plans split plans, actuals split actuals, and a part covers the same scope as its box
  (consolidated, net of transfers between public budgets).
- **One split per box**: parts are appended only into a remainder; `replace` only with a stated reason in the
  topic's README.
- **Payments** become parts only when the payer is the box's spending body for the same period and the payments
  cover at least 95% and at most 100% of the box; otherwise they stay lists, linked from the box.
- **Money passed to another public body** (a municipality, a fund, a hospital that is itself in the КФП …) is not
  a recipient in a consolidated tree.
- **Natural persons are never named** (one group, as in the lists).
- **Ids are stable** and come from official codes; the same thing has the same id in every dataset of a family.
- **Watch the dataset sizes**: "Spending" loads a whole dataset JSON; report the growth of each file a round
  touches (raw and gzipped) and split long lists out as lists instead of tree nodes.
- Every new parts file is cross-checked against an independent total, and at least three of its figures against the
  source document, as for any other dataset (in its README).

## A round

1. Read `data/drilldown/frontier.md`: the largest open boxes, their state and leads.
2. Pick the biggest boxes with the best leads (script-reachable, same period and scope, high coverage).
3. Add a parts file (with its README section) or a graft row — or, when nothing usable exists, set the box's ledger
   entry to `no-source` or `blocked` with the evidence (`checked`, `tried`).
4. `npm run data`: the build checks that everything adds up, the ids are free and the ledger is well formed, and
   rewrites the frontier.
5. Update the ledger: move done boxes on (their parts get their own entries if they stay open), fix stale entries,
   add entries for new open boxes of €250 m or more.
6. `npm test`, `npm run lint`, `npm run build`; commit the parts, the ledger and the new frontier together.

## The first fill (13 October 2026)

No parts or grafts yet: this round built the mechanism, marked the existing remainders and filled the ledger with 78
entries from what was already known locally (docs/data-depth.md, the source READMEs, the datasets, and the
Ministry of Finance documents checked on 13 October 2026 for the energy box): 67 `todo`, 4 `no-source` (the NHIF's
payments per doctor, dentist and laboratory), 3 `blocked` (medicines per active ingredient: gross amounts) and 4
`final` (single kinds of social-security benefit); 30 carry a note for visitors. Every open box of €250 m or more
in Budget 2026, the 2027 forecast and the 2025 actual has an entry; the frontier lists those of the other datasets
still without one. Baseline:

| Dataset | ≤ 2 levels | Remainders | Economic split |
| --- | ---: | ---: | ---: |
| Budget 2026 (€56.8 bn) | 37.6% | 16.6% | 0% |
| 2027 forecast (€55.4 bn) | 93.3% | 0% | 0% |
| 2025 actual (€47.5 bn) | 28.3% | 1.6% | 52.8% |

The site's dataset files grew by the new fields only (`rest`, `status`): at most +1.0 KB gzipped per file.

## The programme round (14 November 2026)

The programme map grafted 148 areas, programmes and items of "Ministries 2026" into 21 boxes of "Budget 2026"
(€12.94 bn of the ministries' €13.33 bn; €387 m left out), 148 of "Ministries 2025" into "Budget 2025" (€12.08 bn of
€12.44 bn) and 79 areas of the 2027 draft into "Budget 2027 (draft)" (€6.85 bn of €14.40 bn: areas that are mixed in
2026 wait for the 2027 programme budgets). New remainders and the grafted parts of €250 m or more have ledger entries.

| Dataset | ≤ 2 levels | Remainders | Economic split | Depth |
| --- | ---: | ---: | ---: | ---: |
| Budget 2025 | 36.7% → 5.3% | 15.5% → 23.9% | 0% → 14.7% | 2.73 → 3.33 |
| Budget 2026 | 32.6% → 4.4% | 18.8% → 25.0% | 0% → 13.7% | 2.78 → 3.31 |
| Budget 2027 (draft) | 73.8% → 60.0% | 13.5% → 18.3% | 0% | 2.32 → 2.50 |

Remainders grow because leaf boxes became parts plus an explicit remainder (EU funds, municipalities, other budgets).
The dataset files grew by 42.0 KB (2025) and 39.3 KB (2026) gzipped (copies keep only their root's note), 9.8 KB
for 2027, and the comparison series (`series-functions.json`) by 39.2 KB.

The same day the map was applied to two more datasets:

- **Budget 2024** ← "Ministries 2024" (areas only): 79 areas and bodies, €4,906.0 m of €8,738.1 m, into 16 boxes;
  €3,832.1 m left out, mostly mixed areas (defence, the labour ministry's benefits, roads, arts) that the 2024 decree
  on the programme budgets (not extracted yet) would split. Details: data/sources/budget-2024/README.md.
- **2025 actual** ← "Ministries 2025 (actual)": the health ministry's three areas (€588.2 m) into „Здравеопазване“
  (its remainder shrinks from €762.4 m to €174.2 m), and 24 links from 12 state-budget boxes to their ministries or
  areas; whether the areas fit each box is in its ledger entry. Details: data/sources/report-2025/README.md.

| Dataset | ≤ 2 levels | Remainders | Economic split | Depth |
| --- | ---: | ---: | ---: | ---: |
| Budget 2024 | 31.4% → 8.7% | 14.9% → 28.8% | 0% | 2.81 → 3.07 |
| 2025 actual | 0.0% → 1.2% | 1.9% → 0.6% | 50.2% | 3.85 |

`budget-2024.json` grew by 9.3 KB gzipped, `report-2025.json` by 1.8 KB and `series-functions.json` by 2.9 KB.

## Annexes 7 and 8 of the forecasts (14 November 2026)

Column „Разходи“ (2.1) of annexes 7 and 8 of the forecasts 2026–2028 and 2027–2029, as for ФСЕС: State Fund
Agriculture's EU account into „Селско стопанство …“ (€693.0 m in 2026, €615.7 m in the 2027 draft), ПУДООС into
the environment, the Agricultural Academy and ДП „Научно-производствен център“ into science, and ДП „Управление и
стопанисване на язовири“ into „Други дейности по икономиката“ — each where its column in the 2024 and 2025 reports
by function puts it. The National Fund's account is not mapped (many functions, totals only). Details:
data/sources/budget-2026/README.md and data/sources/budget-2027/README.md.

| Dataset | ≤ 2 levels | Remainders | Depth |
| --- | ---: | ---: | ---: |
| Budget 2026 | 2.5% | 25.0% → 23.6% | 3.33 |
| Budget 2027 (draft) | 57.5% → 55.1% | 18.3% → 19.4% | 2.55 → 2.58 |

The same annexes for the 2024 and 2025 plans (same day), from the forecasts that accompanied those budgets — 2024–2026
(РМС № 830/2023, in bill 49-302-01-76) and 2025–2028 (РМС № 88/2025) — in thousand BGN: ФСЕС (€1,334.3 m / €1,034.9 m),
State Fund Agriculture's EU account (€670.2 m / €1,182.5 m), ПУДООС, the Agricultural Academy, ДП НПЦ and ДП УСЯ, with
the same ids. Details: data/sources/budget-2024/README.md and data/sources/budget-2025/README.md.

| Dataset | ≤ 2 levels | Remainders | Depth |
| --- | ---: | ---: | ---: |
| Budget 2024 | 8.7% | 28.8% → 24.6% | 3.07 → 3.08 |
| Budget 2025 | 1.5% | 24.0% → 19.3% | 3.37 |

## The 2024 programme budgets (14 November 2026)

Annex 1 of ПМС № 13/29.01.2024 (data/sources/budget-2024/README.md) took "Ministries 2024" from policy areas down to
197 programmes and 655 lines (130 → 884 nodes, depth 3 → 5), with the ids of 2025/2026 for the same programmes. The
programme map then split the 2024 areas it had left out as mixed (defence, the labour ministry's benefits, roads, the
arts, the interior ministry's support area, higher education and research, State Fund Agriculture's subsidies, justice,
sport for students) and switched the prisons and the economy ministry's areas to programme level as in 2025: 148 nodes
of "Ministries 2024", €8,425.6 m of €8,738.1 m, in 20 boxes of "Budget 2024" (was 79 areas, €4,906.0 m); €312.5 m left
out with the 2025 reasons.

| Dataset | ≤ 2 levels | Remainders | Economic split | Depth |
| --- | ---: | ---: | ---: | ---: |
| Budget 2024 | 8.7% → 1.3% | 24.6% → 21.0% | 0% → 11.5% | 3.08 → 3.34 |
| Ministries 2024 | 99.8% → 8.1% | 0% | 0% → 57.3% | 1.89 → 3.38 |

`ministries-2024.json` grew by 39.6 KB gzipped (10.1 → 49.8 KB), `budget-2024.json` by 29.0 KB (66.1 → 95.1 KB).
