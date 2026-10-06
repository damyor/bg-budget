#!/usr/bin/env python3
"""The budgets of Bulgaria's three biggest cities by ЕБК activity and paragraph, from their own reports on the cash
execution of the budget, and Plovdiv's allocation of the state budget to each school and kindergarten.

  python3 scripts/extract/city_budgets.py --download   # fetch the reports into data/cache/cities/ (polite, cached)
  python3 scripts/extract/city_budgets.py              # extract data/sources/cities/ from the cache
  python3 scripts/extract/city_budgets.py --test       # the parser's unit tests (synthetic sheets, no downloads)

Every municipality reports to the Ministry of Finance in the same Excel form, "ОТЧЕТНИ ДАННИ ПО ЕБК ЗА ИЗПЪЛНЕНИЕТО
НА БЮДЖЕТА" (monthly B1, quarterly B3; sheet "OTCHET"), once for the budget and once for each kind of account for EU
funds (КСФ, РА, ДЕС, ДМП). Section II.1 of the sheet repeats one block per ЕБК activity, its code written with the
function's digit first (3322 = function 3, activity 322 "general schools"), with every paragraph and sub-paragraph of
expenditure: the revised plan and the actual, each split into state-delegated activities, local activities and the
municipality's top-up of delegated activities ("дофинансиране"). The year-end quarterly report (B3, Q4) is used.

Writes data/sources/cities/:
  <city>-<year>.csv   activity × paragraph × sub-paragraph, one row per form, as printed (whole leva or euro)
  report-totals.csv   every report read: file, URL, period, currency and the totals it prints
  plovdiv-schools-<year>.csv  Plovdiv: each school and kindergarten's allocation by formula component

Checks, stopping on any failure: each block's paragraphs add up to its printed total (and a paragraph's sub-paragraphs
to the paragraph); the activities add up, paragraph by paragraph, to the sheet's recapitulation by paragraph and to its
"ВСИЧКО РАЗХОДИ"; the plan and the actual equal the sum of their state, local and top-up columns; each sheet is the
city's (ЕБК code), year, period and form; no activity appears twice. Needs xlrd and requests.
"""

import csv
import io
import os
import re
import sys
import time
import unittest
import zipfile
from datetime import date

import xlrd

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
CACHE = os.path.join(ROOT, 'data', 'cache', 'cities')
OUT = os.path.join(ROOT, 'data', 'sources', 'cities')
TODAY = date.today().isoformat()
PAUSE = 3
BROWSER = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    'Accept-Language': 'bg,en;q=0.9',
}

# The cities: ЕБК code (section VII of the classification, as in data/sources/places/municipalities.csv).
CITIES = {'sofia': '7225', 'plovdiv': '6609', 'burgas': '5202'}

# The forms read: the budget, and the accounts for EU funds (financial-legal form code, as printed in the sheet).
# "Чужди средства" (third-party money held by the municipality: deposits, guarantees) is not spending and is left out.
FORMS = {
    'budget': (0, 'БЮДЖЕТ'),
    'ksf': (98, 'СЕС - КСФ'),  # EU cohesion and structural funds (through the National Fund)
    'ra': (42, 'СЕС - РА'),  # EU agricultural funds (through the State Fund Agriculture)
    'des': (96, 'СЕС - ДЕС'),  # other EU funds
    'dmp': (97, 'СЕС - ДМП'),  # other international programmes
}

SOFIA = 'https://www.sofia.bg/documents/d/guest/'
PLOVDIV = 'https://www.plovdiv.bg/wp-content/uploads/'
BURGAS = 'https://www.burgas.bg/uploads/posts/'
PLOVDIV_Q4 = {2024: '2025/02/otchet-trimesechen-2024.zip', 2025: '2026/04/chetvurto-trimesechie-2025-otchet.zip'}
BURGAS_Q4 = {
    # https://www.burgas.bg/bg/2024/trimesechni-otcheti-za-kasovo-izpalnenie-na-byudzheta-kam-31122024-g
    2024: {'budget': '2025/22cb36f4422e1140c4a61e3074bb7fcb.xls', 'des': '2025/416f5755aa2bbb2c664e41959f7aac0d.xls',
           'dmp': '2025/efdcd59793e5a901791785addc8a9562.xls', 'ksf': '2025/14838e640856b25ab340c6e35461ed5c.xls',
           'ra': '2025/716f49ac24b237b9f8b188353abb9751.xls'},
    # https://www.burgas.bg/bg/2025/trimesechni-otcheti-za-kasovo-izpalnenie-na-byudzheta-kam-31122025-g
    2025: {'budget': '2026/0093feba6d9541d4d010e4c2cfe6244e.xls', 'des': '2026/74632bac6b0ea33086aebf0af8d74c9b.xls',
           'dmp': '2026/f8d4dbd8ea6947572a335755074d4854.xls', 'ksf': '2026/01bd72fd05280ba998775b48b5e0299b.xls',
           'ra': '2026/1add860b1b3183df7102dbd7ad50eead.xls'},
}
YEARS = (2024, 2025)


def reports():
    """(city, year, form, url, member of the ZIP or None, cache file) of every report read."""
    out = []
    for year in YEARS:
        for form in FORMS:
            # Sofia, https://www.sofia.bg/bg/web/guest/<year>-financial-year: B3 for Q4 (the 2024 budget's slug ends in "-").
            slug = f'b3_{year}_4_7225' + ('-' if year == 2024 else '') if form == 'budget' else f'ib3_{year}_4_7225_{form}'
            out.append(('sofia', year, form, SOFIA + slug, None, f'sofia/{year}-{form}.xls'))
            # Plovdiv, https://www.plovdiv.bg/item/budget-and-finance/otsheti-budjet/quarterly-reports-eu-<year>/: one ZIP.
            member = f'B3_{year}_4_6609.xls' if form == 'budget' else f'IB3_{year}_4_6609_{form.upper()}.xls'
            out.append(('plovdiv', year, form, PLOVDIV + PLOVDIV_Q4[year], member, f'plovdiv/{os.path.basename(PLOVDIV_Q4[year])}'))
            out.append(('burgas', year, form, BURGAS + BURGAS_Q4[year][form], None, f'burgas/{year}-{form}.xls'))
    return out


# Plovdiv: "Информация за разпределението на средствата от държавния бюджет по училища и детски градини, и по
# компоненти на формулите" (https://www.plovdiv.bg/item/budget-and-finance/delegated-budget/formuli-sredstva-<year>/).
SCHOOLS = {
    2024: (PLOVDIV + '2024/03/Informatsiya-za-razpredelenieto-na-sredstvata-ot-darzhavniya-byudzhet-za-2024-godina.xls',
           'plovdiv/schools-2024.xls', ''),
    2025: (PLOVDIV + '2025/05/formuli2025.xls', 'plovdiv/schools-2025.xls', 'Заповед № 25ОА-1347/28.04.2025'),
    2026: (PLOVDIV + '2026/09/Informatsia-za-razpredelenieto-na-sredstvata-ot-darzhavniya-byudzhet-za-2026-godina.xls',
           'plovdiv/schools-2026.xls', 'Заповед № 26ОА-2326/28.08.2026'),
}


def note(file, url):
    path = os.path.join(CACHE, 'MANIFEST.md')
    head = '' if os.path.exists(path) else '# Big cities (cache)\n\n| File | URL | Retrieved |\n| --- | --- | --- |\n'
    with open(path, 'a', encoding='utf-8') as f:
        f.write(f'{head}| {file} | {url} | {TODAY} |\n')


def download():
    import requests

    wanted = {(url, path) for _, _, _, url, _, path in reports()} | {(url, path) for url, path, _ in SCHOOLS.values()} | {STANDARDS}
    for url, path in sorted(wanted, key=lambda w: w[1]):
        full = os.path.join(CACHE, path)
        if os.path.exists(full):
            continue
        os.makedirs(os.path.dirname(full), exist_ok=True)
        for attempt in range(1, 4):
            r = requests.get(url, headers=BROWSER, timeout=300)
            if r.status_code == 429 or r.status_code >= 500:
                print(f'  {path}: HTTP {r.status_code}, waiting {60 * attempt} s')
                time.sleep(60 * attempt)
                continue
            r.raise_for_status()
            break
        else:
            raise RuntimeError(f'{url}: gave up')
        with open(full, 'wb') as f:
            f.write(r.content)
        note(path, url)
        print(f'  {path}: {len(r.content):,} bytes')
        time.sleep(PAUSE)


# ---------- the OTCHET sheet ----------

# Columns of the sheet's tables (0-based): revised plan (total, state, local, top-up), actual (state, local, top-up, total).
PLAN, PLAN_STATE, PLAN_LOCAL, PLAN_TOPUP, ACT_STATE, ACT_LOCAL, ACT_TOPUP, ACTUAL = range(4, 12)
VALUE_COLUMNS = ['plan', 'plan_state', 'plan_local', 'plan_topup', 'actual_state', 'actual_local', 'actual_topup', 'actual']
HEADERS = {
    PLAN: 'уточнен план общо', PLAN_STATE: 'държавни дейности', PLAN_LOCAL: 'местни дейности', PLAN_TOPUP: 'дофинансиране',
    ACT_STATE: 'държавни дейности -отчет', ACT_LOCAL: 'местни дейности - отчет', ACT_TOPUP: 'дофинансиране - отчет', ACTUAL: 'отчет общо',
}


def number(v):
    if v in ('', None):
        return 0
    if isinstance(v, str):
        v = v.replace('\xa0', '').replace(' ', '').replace(',', '.')
        if v in ('', '-'):
            return 0
    x = float(v)
    if abs(x - round(x)) > 1e-6:
        raise ValueError(f'not whole units: {v}')
    return int(round(x))


def code_of(v):
    """A paragraph or sub-paragraph code as printed (100, 1011, 98) → its 4-digit ЕБК code ("0100", "1011", "9800")."""
    if isinstance(v, str):
        v = v.strip()
        if not re.fullmatch(r'\d+(\.0)?', v):
            return None
    if not isinstance(v, (int, float, str)) or v == '':
        return None
    n = int(float(v))
    if n <= 0:
        return None
    return f'{n:02d}00' if n < 100 else f'{n:04d}'


def norm(s):
    return re.sub(r'\s+', ' ', str(s)).strip().lower()


def header(rows):
    """The sheet's heading: entity, ЕБК code, year, period, financial-legal form, currency, form version."""
    info = {}
    for r, row in enumerate(rows[:30]):
        cells = [str(c).strip() if isinstance(c, str) else c for c in row]
        for c, v in enumerate(cells):
            if v == 'година' and c + 1 < len(cells):
                info['year'] = int(cells[c + 1])
            if v == 'ФИНАНСОВО-ПРАВНА ФОРМА':
                info['form'] = (int(cells[c + 1]), str(cells[c + 2]).strip())
            if isinstance(v, str) and v.startswith('код по ЕБК'):
                info['ebk'] = str(cells[c + 1]).strip().split('.')[0]
            if isinstance(v, str) and v in ('(в лева)', '(в евро)'):
                info['currency'] = 'BGN' if v == '(в лева)' else 'EUR'
            if isinstance(v, str) and v.startswith('Бланка версия'):
                info['version'] = v
            if v == 'за периода от':
                start, end = rows[r + 1][c], rows[r + 1][c + 1]
                info['start'], info['end'] = start, end
                info['entity'] = str(rows[r + 1][1]).strip()
    missing = {'year', 'form', 'ebk', 'currency', 'start', 'end'} - set(info)
    if missing:
        raise ValueError(f'no {", ".join(sorted(missing))} in the heading')
    return info


def check_columns(rows, r):
    """The table header at row r names the eight value columns in the expected order."""
    for c, name in HEADERS.items():
        if norm(rows[r][c]) != name:
            raise ValueError(f'row {r + 1}: column {c + 1} is "{rows[r][c]}", expected "{name}"')


def values(row):
    return [number(row[c]) for c in range(PLAN, ACTUAL + 1)]


def add(a, b):
    return [x + y for x, y in zip(a, b)]


def check_split(where, v):
    """Plan = state + local + top-up, and the same for the actual."""
    if v[0] != v[1] + v[2] + v[3] or v[7] != v[4] + v[5] + v[6]:
        raise ValueError(f'{where}: the total is not the sum of state, local and top-up: {v}')


def parse_otchet(rows):
    """
    Section II.1 of the OTCHET sheet (rows of cell values) → (heading, items, recap, total):
      items  {(programme, activity, paragraph, code): [8 values]} at the finest level printed: a sub-paragraph ("10",
             "1016"), or a paragraph without sub-paragraphs ("40", "4000"); activity as printed (4 digits, function
             first); programme: the EU programme of a block in the forms for EU funds ("98226"), or "";
      heading  also has the programmes' names ({code: name});
      recap  {paragraph: [8 values]} from "II. РАЗХОДИ - РЕКАПИТУЛАЦИЯ ПО ПАРАГРАФИ И ПОДПАРАГРАФИ";
      total  the sheet's "II. ВСИЧКО РАЗХОДИ".
    Raises ValueError when anything does not add up.
    """
    info = header(rows)
    recap, total = {}, None
    items, names = {}, {}
    seen = set()
    r, n = 0, len(rows)
    while r < n:
        row = rows[r]
        text3 = norm(row[3]) if len(row) > 3 else ''
        # The recapitulation by paragraph: paragraph rows (code in column 2) until its "ВСИЧКО" row.
        if text3.startswith('ii. разходи - рекапитулация'):
            check_columns(rows, r + 1)
            r += 2
            while r < n and norm(rows[r][1]) != 'всичко':
                code = code_of(rows[r][1])
                if code and isinstance(rows[r][2], str) and rows[r][2].strip():
                    recap[code[:2]] = add(recap.get(code[:2], [0] * 8), values(rows[r]))
                r += 1
            if r == n or not norm(rows[r][3]).startswith('ii. всичко разходи'):
                raise ValueError('no "II. ВСИЧКО РАЗХОДИ" after the recapitulation')
            total = values(rows[r])
            check_split('II. ВСИЧКО РАЗХОДИ', total)
            r += 1
            continue
        # An activity block: "оп/дейност" with the 4-digit code, then paragraphs and sub-paragraphs, then "99-99".
        if norm(row[1]) == 'оп/дейност':
            activity = f'{int(float(row[2])):04d}'
            # In the forms for EU funds a block is one programme's spending on the activity: the programme's code and
            # name are in the row above (the budget's blocks have a code there but no name).
            above = rows[r - 1]
            programme = f'{int(float(above[2]))}' if isinstance(above[3], str) and above[3].strip() else ''
            if programme:
                names[programme] = re.sub(r'\s+', ' ', above[3]).strip()
            if (programme, activity) in seen:
                raise ValueError(f'activity {activity}{" of programme " + programme if programme else ""} appears twice')
            seen.add((programme, activity))
            check_columns(rows, r - 3)
            paragraph, paragraph_values, parts = None, None, []
            block = {}

            def close():
                # A paragraph's sub-paragraphs add up to it; a paragraph without them is kept itself.
                if paragraph is None:
                    return
                if parts:
                    s = [0] * 8
                    for _, v in parts:
                        s = add(s, v)
                    if s != paragraph_values:
                        raise ValueError(f'activity {activity}, §{paragraph}: sub-paragraphs {s} ≠ paragraph {paragraph_values}')
                    for code, v in parts:
                        block[(paragraph, code)] = add(block.get((paragraph, code), [0] * 8), v)
                elif any(paragraph_values):
                    key = (paragraph, paragraph + '00')
                    block[key] = add(block.get(key, [0] * 8), paragraph_values)

            r += 1
            block_total = None
            while r < n:
                row = rows[r]
                if norm(row[1]) == 'край на дейност':
                    break
                if str(row[2]).strip() == '99-99':
                    block_total = values(row)
                    r += 1
                    continue
                p = code_of(row[1])
                s = code_of(row[2])
                if p and isinstance(row[2], str) and row[2].strip():
                    close()
                    paragraph, paragraph_values, parts = p[:2], values(row), []
                elif s and isinstance(row[3], str) and row[3].strip() and paragraph is not None and (row[3].strip()[:1] != '<'):
                    if s == activity:  # the activity's own name row ("3311 | 311 Детски градини")
                        r += 1
                        continue
                    v = values(row)
                    if any(v):
                        parts.append((s, v))
                r += 1
            close()
            if block_total is None:
                raise ValueError(f'activity {activity}: no "99-99" total')
            s = [0] * 8
            for v in block.values():
                s = add(s, v)
            if s != block_total:
                raise ValueError(f'activity {activity}: paragraphs {s} ≠ printed total {block_total}')
            check_split(f'activity {activity}', block_total)
            for (paragraph, code), v in block.items():
                check_split(f'activity {activity}, {code}', v)
                items[(programme, activity, paragraph, code)] = v
        r += 1
    if total is None:
        raise ValueError('no "II. ВСИЧКО РАЗХОДИ"')
    # The activities add up to the recapitulation, paragraph by paragraph, and to the total.
    by_paragraph = {}
    for (_, _, paragraph, _), v in items.items():
        by_paragraph[paragraph] = add(by_paragraph.get(paragraph, [0] * 8), v)
    for p in sorted(set(by_paragraph) | set(recap)):
        if by_paragraph.get(p, [0] * 8) != recap.get(p, [0] * 8):
            raise ValueError(f'§{p}: activities {by_paragraph.get(p)} ≠ recapitulation {recap.get(p)}')
    s = [0] * 8
    for v in items.values():
        s = add(s, v)
    if s != total:
        raise ValueError(f'activities {s} ≠ "II. ВСИЧКО РАЗХОДИ" {total}')
    info['programmes'] = names
    return info, items, recap, total


def sheet_rows(data):
    book = xlrd.open_workbook(file_contents=data)
    sheet = book.sheet_by_name('OTCHET')
    width = max(12, sheet.ncols)
    return [sheet.row_values(r) + [''] * (width - sheet.ncols) for r in range(sheet.nrows)], book.datemode


def read_report(path, member):
    full = os.path.join(CACHE, path)
    if member:
        with zipfile.ZipFile(full) as zf:
            names = {os.path.basename(i.filename): i for i in zf.infolist()}
            if member not in names:
                raise FileNotFoundError(f'{path}: no {member} ({", ".join(sorted(names))})')
            return zf.read(names[member])
    with open(full, 'rb') as f:
        return f.read()


def iso(serial, datemode):
    return xlrd.xldate_as_datetime(serial, datemode).date().isoformat()


def extract():
    os.makedirs(OUT, exist_ok=True)
    activities = ebk_activities()
    totals = []
    tables, programmes = {}, {}
    for city, year, form, url, member, path in reports():
        rows, datemode = sheet_rows(read_report(path, member))
        where = f'{city} {year} {form}'
        try:
            info, items, _, total = parse_otchet(rows)
        except ValueError as e:
            raise SystemExit(f'✗ {where} ({path}{" › " + member if member else ""}): {e}')
        start, end = iso(info['start'], datemode), iso(info['end'], datemode)
        expected = (info['ebk'], info['year'], info['form'], start, end)
        if expected != (CITIES[city], year, FORMS[form], f'{year}-01-01', f'{year}-12-31'):
            raise SystemExit(f'✗ {where}: the sheet is {expected}')
        for (programme, activity, paragraph, code), v in items.items():
            if activity[1:] not in activities or int(activity[0]) != activities[activity[1:]][0]:
                raise SystemExit(f'✗ {where}: activity {activity} is not in the ЕБК 2026 (or not under function {activity[0]})')
            tables.setdefault((city, year), []).append([form, programme, activity, paragraph, code] + v)
        for code, name in info['programmes'].items():
            if programmes.setdefault(code, name) != name:
                raise SystemExit(f'✗ programme {code} is both "{programmes[code]}" and "{name}"')
        totals.append({
            'city': city, 'year': year, 'form': form, 'file': path + (f' › {member}' if member else ''), 'url': url,
            'period': f'{start}/{end}', 'currency': info['currency'], 'version': info.get('version', ''),
            'activities': len({a for _, a, _, _ in items}), **dict(zip(VALUE_COLUMNS, total)),
        })
        print(f'✓ {where}: {len({a for _, a, _, _ in items})} activities, {len(items)} rows, actual {total[7]:,} {info["currency"]} (plan {total[0]:,})')
    for (city, year), rows in sorted(tables.items()):
        rows.sort(key=lambda r: (list(FORMS).index(r[0]), r[1], r[2], r[4]))
        with open(os.path.join(OUT, f'{city}-{year}.csv'), 'w', newline='', encoding='utf-8') as f:
            w = csv.writer(f, lineterminator='\n')
            w.writerow(['form', 'programme', 'activity', 'paragraph', 'code'] + VALUE_COLUMNS)
            w.writerows(rows)
    with open(os.path.join(OUT, 'eu-programmes.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['programme', 'name'])
        w.writerows(sorted(programmes.items()))
    plovdiv_schools()
    education_standards()
    with open(os.path.join(OUT, 'report-totals.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=list(totals[0]), lineterminator='\n')
        w.writeheader()
        w.writerows(totals)


# ---------- Plovdiv: each school's and kindergarten's allocation ----------

# The components of the formulas (and the standards outside them), as the sheets label their columns, without the share
# of the standard ("98,33%*К1*БДяг" → "К1*БДяг"): an id for each, the same in every year. The professional fields of
# vocational schools (activity 326) label two columns each, pupils and money; the money column is named by the field.
COMPONENTS = [
    (r'^К1\*БДяг$', 'nursery-children'),
    (r'^К1\*БД2-3$', 'children-2-3'),
    (r'^К1\*БД4-6$', 'children-4-6'),
    (r'^К2\*Бгрупи$', 'groups'),
    (r'^К1\*БДсг$', 'special-children'),
    (r'^К1\*БДппг$', 'half-day-children'),
    (r'^К1\*БДцпг$', 'full-day-children'),
    (r'^К2\*Бппг$', 'half-day-groups'),
    (r'^К2\*Бцг$', 'full-day-groups'),
    (r'^К1\*БУ$', 'pupils'),
    (r'^К2\*Бпарал\.?$', 'classes'),
    (r'^К1\*БГр$', 'dormitory-groups'),
    (r'^Норм\.\*БГр$', 'all-day-groups'),
    (r'^Норм\.\*БУ$', 'all-day-pupils'),
    (r'^Средства за институция$', 'institution'),
    (r'^Добавка за деца в пригодени сгради', 'adapted-buildings'),
    (r'^Добавка за детски градини - паметници на културата', 'listed-buildings'),
    (r'^Добавка за функциониращ басейн', 'pool'),
    (r'^(2% )?Резерв за нерегулярни разходи', 'reserve'),
    (r'^Добавка за училищна площ', 'floor-area'),
    (r'^Добавка за паралелка с профил', 'arts-class-supplement'),
    (r'^Добавка за училища, с бр\.на учениците (от 110 )?до 300', 'small-school'),
    (r'^Добавка за училища, с бр\.на учениците под 110', 'very-small-school'),
    (r'^Средства за ученици в паралелка с профил', 'arts-pupils'),
    (r'^Средства за паралелка с профил', 'arts-classes'),
    (r'^Средства за ученици в индивидуална форма', 'individual'),
    (r'^Средства за ученици в самостоятелна форма', 'self-study'),
    (r'^Средства за паралелка за професионална подготовка', 'vocational-classes'),
    (r'^Физически науки, информатика', 'field-science'),
    (r'^Изкуства, хуманитарни науки', 'field-arts'),
    (r'^Услуги за личността', 'field-services'),
    (r'^Стопанско управление', 'field-business'),
    (r'^Селско, горско, рибно стопанство', 'field-agriculture'),
    (r'^Норматив за подпомагане храненето на децата от подготвителните групи', 'meals-preschool'),
    (r'^Норматив за подпомагане храненето на децата от подготвителните класове', 'meals-school'),
    (r'^Норматив за издръжка на дете в общинска детска градина', 'fees-compensation'),
    (r'^Допълващ стандарт за ученик в комбинирана форма', 'combined-form'),
    (r'^Допълващ стандарт за материална база', 'facilities'),
    (r'^Допълващ стандарт за ученик с разширена подготовка по музика', 'music'),
    (r'^Допълващ стандарт за първи и втори гимназиален етап', 'upper-secondary'),
    (r'^Допълващ стандарт за дневна форма и дуална система', 'vocational-dual'),
    (r'^Средства за занимания по интереси', 'interests'),
    (r'^Норматив за ученик, записан в неспециализирано училище, обучаващ се в ЦСОП', 'special-centre'),
    (r'^Средства за стипендии', 'scholarships'),
    (r'^Норматив за създаване на условия за приобщаващо образование', 'inclusive'),
    (r'^Норматив за дете/ученик на ресурсно подпомагане', 'resource-support'),
]


def component_of(label):
    label = re.sub(r'\s+', ' ', label).strip()
    label = re.sub(r'^\d+(,\d+)?%\*', '', label)
    for pattern, key in COMPONENTS:
        if re.search(pattern, label):
            return key
    raise ValueError(f'unknown component "{label}"')


def school_sheet(sheet, year):
    """
    One activity's sheet → (activity, rows, printed): rows of (institution, pupils or children, {component: (part,
    amount)}), part being "formula" (the formula, or the standards of activity 338) or "above" (standards paid on
    top of the formula); printed: the sheet's total row by column. Checks that every row's components add up to its
    printed formula totals.
    """
    rows = [sheet.row_values(r) for r in range(sheet.nrows)]
    m = re.search(r'дейност (\d{3})', str(rows[1][0]))
    if not m:
        raise ValueError(f'{sheet.name}: no activity in the title')
    activity = m.group(1)
    head = next(r for r, row in enumerate(rows) if str(row[0]).strip() == '№ по ред')
    # The header row names most columns; a formula's coefficients stand where the row below names the component, and
    # "Средства над определените по формула" heads the standards paid on top of the formula, named in the row below.
    labels, field = [], None
    for c in range(sheet.ncols):
        top, below = rows[head][c], rows[head + 1][c] if head + 1 < len(rows) else ''
        top = re.sub(r'\s+', ' ', top).strip() if isinstance(top, str) else ''
        below = re.sub(r'\s+', ' ', below).strip() if isinstance(below, str) else ''
        if c < 2:
            labels.append(None)
        elif top.startswith('Брой') or below.startswith('Брой'):
            if top and not top.startswith('Брой'):
                field = top  # a professional field: its pupils here, its money in the next column
            labels.append(('count', 'groups' if 'групи' in (top + below).lower() else 'pupils'))
        elif re.match(r'^Общо средства по (формула|нормативи)', top):
            labels.append(('total', None))
        else:
            text = below if not top or top.startswith('Средства над определените по формула') else top
            if not text:
                labels.append(None)
                continue
            if field and re.match(r'^\d+%\*К1\*БУ$', text):
                text, field = field, None
            labels.append(('component', component_of(text)))
    # Components before the last printed total are the formula's (the standards of activity 338); those after it are
    # paid on top of the formula.
    last = max(c for c, label in enumerate(labels) if label and label[0] == 'total')
    labels = [(('formula' if c < last else 'above'), label[1]) if label and label[0] == 'component' else label for c, label in enumerate(labels)]
    out, printed = [], None
    for row in rows[head + 1:]:
        name = str(row[1]).strip()
        first = str(row[0]).strip()
        if first.upper().startswith(('ВСИЧКО', 'ОБЩО')) or name.upper().startswith(('ВСИЧКО', 'ОБЩО')):
            printed = {c: number(row[c]) for c, label in enumerate(labels) if label}
            break
        if not isinstance(row[0], float) or not name:
            continue
        pupils = sum(number(row[c]) for c, label in enumerate(labels) if label == ('count', 'pupils'))
        parts = {}
        formula = 0
        totals = 0
        for c, label in enumerate(labels):
            if not label or label[0] == 'count':
                continue
            v = number(row[c])
            if label[0] == 'total':
                totals += v
            elif v:
                part, key = label
                old = parts.get(key, (part, 0))
                if old[0] != part:
                    raise ValueError(f'{sheet.name}: {key} both in and above the formula')
                parts[key] = (part, old[1] + v)
                if part == 'formula':
                    formula += v
        if formula != totals:
            raise ValueError(f'{sheet.name}, {name}: formula components {formula} ≠ printed totals {totals}')
        out.append((name, pupils, parts))
    if printed is None:
        raise ValueError(f'{sheet.name}: no total row')
    return activity, out, printed, labels


# Names of one school written two ways in different years (after the normalisation below).
NAME_ALIASES = {'СУНАЙДЕНГЕРОВ': 'СУНГЕРОВ', 'СУСИМОНБОЛИВАР': 'СУСБОЛИВАР'}


def norm_name(name):
    """The key that joins an institution's rows across years: capitals, no quotes, dots or spaces, Cyrillic letters."""
    name = re.sub(r'[„“”"\'.\s]+', ' ', name.upper()).strip()
    name = name.translate(str.maketrans('ABCEHKMOPTXY', 'АВСЕНКМОРТХУ'))
    name = re.sub(r'\bСВЕТИ\b', 'СВ', name).replace(' ', '')
    return NAME_ALIASES.get(name, name)


def plovdiv_schools():
    """Plovdiv's allocation of the state budget to each school and kindergarten, 2024–2026, by formula component."""
    rows = []
    seen = {year: set() for year in SCHOOLS}
    for year, (url, path, _) in sorted(SCHOOLS.items()):
        book = xlrd.open_workbook(os.path.join(CACHE, path))
        currency = 'BGN' if year < 2026 else 'EUR'
        for sheet in book.sheets():
            activity, institutions, printed, labels = school_sheet(sheet, year)
            sums = {}
            for name, pupils, parts in institutions:
                if (activity, norm_name(name)) in seen[year]:
                    raise SystemExit(f'✗ Plovdiv schools {year}: {name} twice in activity {activity}')
                seen[year].add((activity, norm_name(name)))
                for key, (part, v) in parts.items():
                    rows.append([year, activity, norm_name(name), name, part, key, v, currency])
                    sums[key] = sums.get(key, 0) + v
                if pupils:
                    rows.append([year, activity, norm_name(name), name, 'count', 'pupils', pupils, ''])
            # Every component adds up to the sheet's total row.
            by_key = {}
            for c, label in enumerate(labels):
                if label and label[0] in ('formula', 'above'):
                    by_key[label[1]] = by_key.get(label[1], 0) + printed.get(c, 0)
            for key in set(by_key) | set(sums):
                if by_key.get(key, 0) != sums.get(key, 0):
                    raise SystemExit(f'✗ Plovdiv schools {year}, {sheet.name}: {key} adds up to {sums.get(key, 0)}, the total row prints {by_key.get(key, 0)}')
            total = sum(v for k, v in sums.items())
            print(f'✓ Plovdiv schools {year}, activity {activity}: {len(institutions)} institutions, {total:,} {currency}')
    with open(os.path.join(OUT, 'plovdiv-schools.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['year', 'activity', 'key', 'institution', 'part', 'component', 'value', 'currency'])
        w.writerows(rows)


# ---------- the cost standards of state-delegated education (РМС № 497/2026) ----------

STANDARDS = ('https://strategy.bg/download/1323211', 'standards/rms497-2026.docx')


def education_standards():
    """
    Annex 2 of Council of Ministers decision 497/03.07.2026 (the standards of the state-delegated activities that
    municipalities carry out, with the natural indicators they are applied to), section III "Образование": every
    standard with its measure, the national count and the amount per unit, under its numbered heading. A heading that
    carries numbers is a standard itself; rows such as "- за площ …" or "до 10 места" are bands of the heading above.
    """
    import docx

    table = docx.Document(os.path.join(CACHE, STANDARDS[1])).tables[6]
    footnote = lambda text: re.sub(r'(?<=[а-яА-Яa-z“”"\)])\d$', '', text.strip())  # noqa: E731 — "Детски градини4"
    number = lambda text: float(text.replace(' ', '').replace(',', '.')) if text else None  # noqa: E731
    out, in_education = [], False
    section = heading = number_of = None
    for r in table.rows:
        # Merged cells repeat in python-docx; keep each underlying cell once.
        cells, seen_tc = [], set()
        for c in r.cells:
            if id(c._tc) not in seen_tc:
                seen_tc.add(id(c._tc))
                cells.append(re.sub(r'\s+', ' ', c.text).strip())
        first = cells[0] if cells else ''
        if re.match(r'^[IVX]+\. Функция', first.replace('І', 'I')):
            in_education = 'Образование' in first
            continue
        if not in_education or not first or len(cells) < 4:
            continue
        measure, count, standard = cells[-3], cells[-2], cells[-1]
        m = re.match(r'^(\d+)(?:\.(\d+))?\.?\s+(.*)$', first)
        if m:
            name = footnote(m.group(3)).rstrip(':').strip()
            if m.group(2) is None:
                section = heading = name
                number_of = m.group(1)
            else:
                heading = name
            label = name
        elif re.match(r'^[-–]\s*|^(до|от|над) ', first):
            label = f'{heading}: {footnote(re.sub(r"^[-–]\s*", "", first))}'
        else:
            label = footnote(first)
        if not standard or measure == standard:
            continue  # a heading without numbers of its own
        out.append([number_of, section, re.sub(r'\s+', ' ', label), measure, number(count), number(standard)])
    with open(os.path.join(OUT, 'standards-2026-education.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['section_no', 'section', 'standard', 'measure', 'count', 'euro'])
        for row in out:
            w.writerow(row[:4] + ['' if row[4] is None else f'{row[4]:g}', f'{row[5]:g}'])
    print(f'✓ Cost standards 2026, education: {len(out)} standards in {len({r[0] for r in out})} sections')
    return out


# ---------- the ЕБК activities ----------

EBK = os.path.join(ROOT, 'data', 'cache', 'municipalities', 'EBK-2026-public.xlsx')
ROMAN = {'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9}


def clean_name(name):
    """Official names, with spacing normalised and one typo of the ЕБК file fixed ("грижаа")."""
    name = re.sub(r'\s+', ' ', name).strip()
    name = re.sub(r',(?=\S)', ', ', name)
    return name.replace('родителска грижаа', 'родителска грижа')


def ebk_activities():
    """
    Section VI of the ЕБК 2026 (sheet "Функции", the detailed list after the summary): function → group → activity.
    Three codes (863–865) are printed twice, the second time with the names of 875–877 (left over from an older
    edition); the first is kept.
    """
    import openpyxl

    rows = list(openpyxl.load_workbook(EBK, read_only=True)['Функции'].iter_rows(values_only=True))
    start = next(i for i, row in enumerate(rows) if row[0] == '=+A2')  # the detailed list repeats the title
    out, fn, group = {}, None, ''
    for row in rows[start + 1:]:
        cells = [str(c).strip() for c in row if c is not None and str(c).strip()]
        if not cells:
            continue
        head = cells[0].replace('І', 'I').replace('Х', 'X')
        m = re.match(r'^([IVX]+)\.', head)
        if m:
            fn, group = ROMAN[m.group(1)], ''
            continue
        if cells[0].startswith('Група'):
            group = clean_name(cells[1]) if len(cells) > 1 else ''
            continue
        closed = cells[0] == 'закрита'
        if closed:
            cells = cells[1:]
        if re.fullmatch(r'\d{3}', cells[0]) and cells[0] not in out:
            if int(cells[0][0]) != fn:
                raise SystemExit(f'✗ ЕБК: activity {cells[0]} under function {fn}')
            out[cells[0]] = (fn, group, clean_name(cells[1]), 'closed' if closed else '')
    if len(out) < 290:
        raise SystemExit(f'✗ ЕБК: only {len(out)} activities')
    with open(os.path.join(OUT, 'ebk-activities.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['activity', 'function', 'group', 'name', 'status'])
        for code, (fn, group, name, status) in sorted(out.items()):
            w.writerow([code, fn, group, name, status])
    print(f'✓ ЕБК 2026: {len(out)} activities')
    return out


# ---------- tests ----------

def synthetic(blocks, recap_extra=None, total_override=None):
    """A minimal OTCHET sheet: heading, recapitulation and activity blocks, as rows of 13 cells."""
    blank = lambda: [''] * 13  # noqa: E731
    rows = [blank() for _ in range(20)]
    rows[2][1], rows[2][2] = 'година', 2025.0
    rows[7][4] = 'за периода от '
    rows[8][1], rows[8][4], rows[8][5] = 'Пловдив', 45658.0, 46022.0
    rows[11][4], rows[11][5] = 'код по ЕБК:', '6609'
    rows[14][3], rows[14][4], rows[14][5] = 'ФИНАНСОВО-ПРАВНА ФОРМА', 0.0, 'БЮДЖЕТ'
    rows[17][11] = '(в лева)'

    def head():
        h = blank()
        h[1], h[2], h[3] = '§§', 'под-§§', 'Н А И М Е Н О В А Н И Е'
        for c, name in HEADERS.items():
            h[c] = name.upper() if c == PLAN else name
        return h

    def line(c1, c2, c3, v):
        row = blank()
        row[1], row[2], row[3] = c1, c2, c3
        row[4:12] = [x if x == '' else float(x) for x in v]
        return row

    by_paragraph, total = {}, [0] * 8
    body = []
    for activity, name, paragraphs in blocks:
        body += [head(), blank(), blank(), line('оп/дейност', float(activity), '<------ ДЕЙНОСТ', [''] * 8), line('', float(activity), name, [''] * 8)]
        block_total = [0] * 8
        for p, pname, v, subs in paragraphs:
            body.append(line(float(p), pname, '', v))
            for s, sname, sv in subs:
                body.append(line('', float(s), sname, sv))
            key = code_of(float(p))[:2]
            by_paragraph[key] = add(by_paragraph.get(key, [0] * 8), v)
            block_total = add(block_total, v)
        body.append(line('', '99-99', 0.0, block_total))
        body.append(line('край на дейност', '', '', [''] * 8))
        total = add(total, block_total)
    recap = [line('', '', 'II. РАЗХОДИ - РЕКАПИТУЛАЦИЯ ПО ПАРАГРАФИ И ПОДПАРАГРАФИ', [''] * 8), head()]
    for p, v in sorted((recap_extra or by_paragraph).items()):
        recap.append(line(float(int(p) * 100 if p != '98' else 98), 'name', '', v))
    recap.append(line('ВСИЧКО', '99-99', 'II. ВСИЧКО РАЗХОДИ - РЕКАПИТУЛАЦИЯ ПО ПАРАГРАФИ И ПОДПАРАГРАФИ', total_override or total))
    return rows + recap + body


class ParserTest(unittest.TestCase):
    KINDERGARTENS = ('3311', '311 Детски градини', [
        (100, 'Заплати', [10, 10, 0, 0, 9, 0, 0, 9], [(101, 'по трудови', [10, 10, 0, 0, 9, 0, 0, 9])]),
        (1000, 'Издръжка', [7, 4, 2, 1, 6, 3, 1, 10], [(1016, 'енергия', [5, 4, 0, 1, 4, 3, 0, 7]), (1020, 'услуги', [2, 0, 2, 0, 2, 0, 1, 3])]),
        (5200, 'Придобиване на ДМА', [3, 0, 3, 0, 0, 2, 0, 2], []),
    ])
    LIGHTING = ('6604', '604 Осветление на улици и площади', [(1000, 'Издръжка', [5, 0, 5, 0, 0, 4, 0, 4], [(1016, 'енергия', [5, 0, 5, 0, 0, 4, 0, 4])])])

    def test_reads_activity_blocks_at_the_finest_level(self):
        info, items, recap, total = parse_otchet(synthetic([self.KINDERGARTENS, self.LIGHTING]))
        self.assertEqual(info['ebk'], '6609')
        self.assertEqual(info['form'], (0, 'БЮДЖЕТ'))
        self.assertEqual(info['currency'], 'BGN')
        self.assertEqual(sorted(items), [('', '3311', '01', '0101'), ('', '3311', '10', '1016'), ('', '3311', '10', '1020'), ('', '3311', '52', '5200'), ('', '6604', '10', '1016')])
        self.assertEqual(items[('', '3311', '10', '1016')], [5, 4, 0, 1, 4, 3, 0, 7])
        self.assertEqual(recap['10'], [12, 4, 7, 1, 6, 7, 1, 14])
        self.assertEqual(total[7], 9 + 10 + 2 + 4)

    def test_codes(self):
        self.assertEqual(code_of(100.0), '0100')
        self.assertEqual(code_of(1011.0), '1011')
        self.assertEqual(code_of(98.0), '9800')
        self.assertEqual(code_of(552.0), '0552')
        self.assertIsNone(code_of('Издръжка'))

    def test_stops_when_sub_paragraphs_do_not_add_up(self):
        broken = ('3311', '311 Детски градини', [(1000, 'Издръжка', [7, 4, 2, 1, 6, 3, 1, 10], [(1016, 'енергия', [5, 4, 0, 1, 4, 3, 0, 7])])])
        with self.assertRaisesRegex(ValueError, 'sub-paragraphs'):
            parse_otchet(synthetic([broken]))

    def test_stops_when_activities_miss_the_recapitulation(self):
        with self.assertRaisesRegex(ValueError, 'recapitulation'):
            parse_otchet(synthetic([self.LIGHTING], recap_extra={'10': [5, 0, 5, 0, 0, 4, 0, 5]}))
        with self.assertRaisesRegex(ValueError, 'ВСИЧКО'):
            parse_otchet(synthetic([self.LIGHTING], total_override=[5, 0, 5, 0, 0, 4, 0, 5]))

    def test_stops_on_a_repeated_activity(self):
        with self.assertRaisesRegex(ValueError, 'twice'):
            parse_otchet(synthetic([self.LIGHTING, self.LIGHTING]))


if __name__ == '__main__':
    if '--test' in sys.argv:
        unittest.main(argv=[sys.argv[0]])
    elif '--download' in sys.argv:
        download()
    else:
        extract()
