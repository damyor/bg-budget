#!/usr/bin/env python3
"""NHIF (НЗОК) payments to each hospital, month by month, from the fund's monthly PDF reports.

  python3 scripts/extract/nhif_hospitals.py --download   # fetch the year pages, the PDFs and EKATTE into the cache
  python3 scripts/extract/nhif_hospitals.py              # parse the cached PDFs, write data/sources/health/
  python3 scripts/extract/nhif_hospitals.py --test <pdf> …  # parse and check single reports, print a few rows

Source: https://www.nhif.bg/bg/hospitals/bmp/<year> — every month three PDFs (text layer), each a table of
the medical establishments the fund pays for hospital care, with the cash paid in the year to date and in
the month:
  care       "Заплатени здравноосигурителни плащания за болнична медицинска помощ по лечебни заведения"
  devices    "... за медицински изделия, прилагани в болничната медицинска помощ ..."
  medicines  "... за лекарствени продукти ... прилагани в условията на болнична медицинска помощ, които НЗОК
             заплаща извън стойността на оказваните медицински услуги ..."
2024 and 2025 are in leva, 2026 in euro (whole units, as printed).

Reads data/cache/health/nhif-bmp/ (MANIFEST.md lists every file with its URL and download date) and
data/cache/health/ekatte/ek_obst.json (NSI, EKATTE 2025: the municipality codes inside the hospitals'
registration numbers). Writes data/sources/health/:
  nhif-hospital-payments.csv  reg_no, series, month, paid (in the month), ytd (year to date), currency
  hospitals.csv               one row per registration number: latest name, other spellings, RZOK,
                              municipality (EKATTE code and ЕБК code of the site's register), months seen

Checks, stopping on any failure: every file's hospitals add up to each regional (RZOK) subtotal and to the
grand total, in every amount column, to within each row's rounding to the unit (the printed counts are not
reliable and are only reported); the report date and currency in the title match the file; a registration
number is not listed twice; every establishment's municipality lies in the province of its RZOK. Reported,
not fatal: printed RZOK numbers that differ from the registration number (the RZOK name never does), and
months where the year to date is not the previous one plus the month (rounding, and five restatements).
Needs pdfplumber, bs4 and lxml.
"""

import csv
import json
import os
import re
import subprocess
import sys
import time
from collections import defaultdict
from datetime import date
from urllib.parse import unquote

import pdfplumber
from bs4 import BeautifulSoup

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
CACHE = os.path.join(ROOT, 'data', 'cache', 'health')
PDF_DIR = os.path.join(CACHE, 'nhif-bmp')
OUT = os.path.join(ROOT, 'data', 'sources', 'health')
REGISTER = os.path.join(ROOT, 'data', 'sources', 'places', 'municipalities.csv')

YEARS = (2024, 2025, 2026)
LISTING = 'https://www.nhif.bg/bg/hospitals/bmp/{year}'
AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) bg-budget data pipeline'
SERIES = {
    'care': re.compile(r'плащания за БМП'),
    'devices': re.compile(r'за МИ прилагани'),
    'medicines': re.compile(r'за лек_прод|за ЛП в условията'),
}
MONTHS_BG = ['януари', 'февруари', 'март', 'април', 'май', 'юни', 'юли', 'август', 'септември', 'октомври', 'ноември', 'декември']
LOOKALIKES = dict(zip('ABCEHKMOPTXYaceopxy', 'АВСЕНКМОРТХУасеорху'))

# RZOK number (the first two digits of a registration number) → EKATTE province code. The numbering is the
# old alphabetical order of the 28 provinces; 22 is the capital (EKATTE "SOF"), 23 Sofia Province ("SFO").
RZOK_OBLAST = {
    '01': 'BLG', '02': 'BGS', '03': 'VAR', '04': 'VTR', '05': 'VID', '06': 'VRC', '07': 'GAB', '08': 'DOB',
    '09': 'KRZ', '10': 'KNL', '11': 'LOV', '12': 'MON', '13': 'PAZ', '14': 'PER', '15': 'PVN', '16': 'PDV',
    '17': 'RAZ', '18': 'RSE', '19': 'SLS', '20': 'SLV', '21': 'SML', '22': 'SOF', '23': 'SFO', '24': 'SZR',
    '25': 'TGV', '26': 'HKV', '27': 'SHU', '28': 'JAM',
}
# The province of each RZOK as the site's register names it (data/sources/places/municipalities.csv).
RZOK_PROVINCE = {
    '01': 'Благоевград', '02': 'Бургас', '03': 'Варна', '04': 'Велико Търново', '05': 'Видин', '06': 'Враца',
    '07': 'Габрово', '08': 'Добрич', '09': 'Кърджали', '10': 'Кюстендил', '11': 'Ловеч', '12': 'Монтана',
    '13': 'Пазарджик', '14': 'Перник', '15': 'Плевен', '16': 'Пловдив', '17': 'Разград', '18': 'Русе',
    '19': 'Силистра', '20': 'Сливен', '21': 'Смолян', '22': 'София-град', '23': 'Софийска', '24': 'Стара Загора',
    '25': 'Търговище', '26': 'Хасково', '27': 'Шумен', '28': 'Ямбол',
}


# Digits 3-4 of a registration number are the EKATTE code of the municipality within the province, except
# "90" (not an EKATTE code); in Sofia city they are the district (01-24), all in Столична община.
PLACE_BY_NAME = {'0290211001': 'BGS04'}  # МБАЛ Сърце и мозък Бургас: code 90, the name says Бургас
UNPLACED = {'1626131002': 'its code says „Родопи“, its name Пловдив'}  # МЦ Литомед ООД Пловдив


def fail(message):
    raise SystemExit(f'nhif_hospitals.py: {message}')


def clean(text):
    return re.sub(r'\s+', ' ', text.replace('\xa0', ' ')).strip()


def fix_cyrillic(text):
    """Latin look-alike letters inside Cyrillic words ("БУРГАСМЕД EООД") → Cyrillic."""
    return re.sub(r'\w+', lambda m: ''.join(LOOKALIKES.get(c, c) for c in m.group(0)) if re.search('[Ѐ-ӿ]', m.group(0)) else m.group(0), text)


# ---------- download ----------

def curl(url, path):
    for attempt in range(4):
        result = subprocess.run(['curl', '-sS', '-L', '-A', AGENT, '-o', path, '-w', '%{http_code}', url], capture_output=True, text=True)
        if result.stdout == '200':
            return
        if result.stdout == '429':
            time.sleep(30 * (attempt + 1))
            continue
        fail(f'{url}: HTTP {result.stdout} {result.stderr}')
    fail(f'{url}: still HTTP 429')


def links(year):
    """(series, month, url, file name) of every report on the year's page."""
    page = os.path.join(PDF_DIR, f'listing-{year}.html')
    if not os.path.exists(page):
        curl(LISTING.format(year=year), page)
        time.sleep(1)
    soup = BeautifulSoup(open(page, encoding='utf8').read(), 'lxml')
    found = {}
    for a in soup.find_all('a', href=True):
        href = a['href']
        if not href.startswith('/upload/'):
            continue
        name = unquote(href).split('/')[-1]
        series = [s for s, pattern in SERIES.items() if pattern.search(name)]
        when = re.search(r'(\d{2})\.(\d{2})\.(\d{4})', name)
        if len(series) != 1 or not when or int(when.group(3)) != year:
            fail(f'{year}: cannot classify {name}')
        month = f'{when.group(3)}-{when.group(2)}'
        key = (series[0], month)
        if key in found and found[key][0] != href:
            fail(f'{year}: two files for {key}')
        found[key] = (href, name)
    return [(s, m, 'https://www.nhif.bg' + href, name) for (s, m), (href, name) in sorted(found.items())]


EKATTE_ZIP = 'https://www.nsi.bg/nrnm/ekatte/archive/json/Ekatte-2025-json.zip/download'


def download():
    os.makedirs(PDF_DIR, exist_ok=True)
    ekatte = os.path.join(CACHE, 'ekatte')
    if not os.path.exists(os.path.join(ekatte, 'ek_obst.json')):
        import zipfile
        os.makedirs(ekatte, exist_ok=True)
        archive = os.path.join(CACHE, 'Ekatte-2025-json.zip')
        curl(EKATTE_ZIP, archive)
        with zipfile.ZipFile(archive) as z:
            z.extract('ek_obst.json', ekatte)
    manifest_path = os.path.join(PDF_DIR, 'manifest.csv')
    manifest = {}
    if os.path.exists(manifest_path):
        with open(manifest_path, encoding='utf8') as f:
            manifest = {r['file']: r for r in csv.DictReader(f)}
    for year in YEARS:
        for series, month, url, name in links(year):
            file = f'{series}-{month}.pdf'
            path = os.path.join(PDF_DIR, file)
            if not os.path.exists(path):
                curl(url, path)
                manifest[file] = {'file': file, 'url': url, 'title': name, 'retrieved': date.today().isoformat()}
                print(f'  {file}  {os.path.getsize(path):,} bytes')
                time.sleep(1)
    with open(manifest_path, 'w', encoding='utf8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=['file', 'url', 'title', 'retrieved'])
        w.writeheader()
        for file in sorted(manifest):
            w.writerow(manifest[file])
    with open(os.path.join(PDF_DIR, 'MANIFEST.md'), 'w', encoding='utf8') as f:
        f.write('# NHIF payments to hospitals (cache)\n\nMonthly PDF reports from https://www.nhif.bg/bg/hospitals/bmp/<year>.\n\n')
        f.write('| File | Title | URL | Retrieved |\n| --- | --- | --- | --- |\n')
        for file in sorted(manifest):
            r = manifest[file]
            f.write(f"| {file} | {r['title']} | {r['url']} | {r['retrieved']} |\n")
    print(f'{len(manifest)} files in {PDF_DIR}')


if __name__ == '__main__' and '--download' in sys.argv:
    download()
    sys.exit(0)


# ---------- parsing one report ----------

DIGIT = re.compile(r'[0-9]')


def is_bold(c):
    return 'Bold' in c['fontname']


def page_lines(page):
    """The page's characters as lines (grouped by their top), each sorted left to right."""
    lines = []
    for c in sorted(page.chars, key=lambda c: c['top']):
        if lines and c['top'] - lines[-1][0] <= 2.5:
            lines[-1][1].append(c)
        else:
            lines.append((c['top'], [c]))
    return [sorted(cs, key=lambda c: c['x0']) for _, cs in lines]


def digit_runs(chars):
    """Runs of adjacent digits: (first index, last index) in the line."""
    runs, start = [], None
    for i, c in enumerate(chars):
        adjacent = start is not None and DIGIT.match(chars[i - 1]['text']) and c['x0'] - chars[i - 1]['x1'] < 1.0 and is_bold(c) == is_bold(chars[i - 1])
        if DIGIT.match(c['text']):
            if not adjacent:
                if start is not None:
                    runs.append((start, i - 1))
                start = i
        elif start is not None:
            runs.append((start, i - 1))
            start = None
    if start is not None:
        runs.append((start, len(chars) - 1))
    return runs


def number(chars, where):
    """An amount from its characters: digits, thousands spaces, an optional minus; None when blank."""
    text = ''.join(c['text'] for c in sorted(chars, key=lambda c: c['x0'])).replace(' ', '')
    if not text:
        return None
    if not re.fullmatch(r'-?\d+', text):
        fail(f'{where}: not an amount: {text!r}')
    return int(text)


def is_amount(c):
    return bool(DIGIT.match(c['text'])) or c['text'] == '-'


def amount_chars(chars):
    return [c for c in chars if is_amount(c)]


def number_groups(chars):
    """
    The amounts among characters: digits that touch, or that a thousands space exactly bridges, are one
    amount; any other gap starts the next. Other characters (a long name running on into the amounts, or
    the padding spaces of its cell) are ignored.
    """
    digits = sorted(amount_chars(chars), key=lambda c: c['x0'])
    spaces = [c for c in chars if c['text'] == ' ']
    groups = []
    for c in digits:
        prev = groups[-1][-1] if groups else None
        joined = prev is not None and (
            abs(c['x0'] - prev['x1']) < 0.5
            or any(abs(sp['x0'] - prev['x1']) < 0.3 and abs(sp['x1'] - c['x0']) < 0.3 for sp in spaces)
        )
        if joined:
            groups[-1].append(c)
        else:
            groups.append([c])
    return groups


def parse_report(path):
    """
    One monthly report: {'month', 'currency', 'columns' (the months of its month columns, the report month
    last), 'total' and 'regions' (count, year to date, one amount per month column), 'rows'}.
    """
    pdf = pdfplumber.open(path)
    where = os.path.basename(path)
    head = clean(pdf.pages[0].extract_text() or '')
    when = re.search(r'към (\d{2})\.(\d{2})\.(\d{4})\s*(?:година|г\.)?\s*\(в (лева|евро)\)', head)
    if not when:
        fail(f'{where}: no report date and currency in the title')
    year, month = int(when.group(3)), int(when.group(2))
    report = {'month': f'{year}-{month:02d}', 'currency': 'BGN' if when.group(4) == 'лева' else 'EUR', 'rows': [], 'regions': {}, 'total': None}
    # Usually one month column (the report month); February 2026 also has January's.
    columns_head = re.split(r'Общо РЗОК|ОБЩО', head)[0]
    heads = re.findall(r'(?<![а-я])(' + '|'.join(MONTHS_BG) + r')(?![а-я])', columns_head)
    names = [MONTHS_BG.index(m) + 1 for m in heads]
    if not names or names[-1] != month or names != sorted(set(names)):
        fail(f'{where}: month columns {heads} do not end with the report month')
    report['columns'] = [f'{year}-{n:02d}' for n in names]
    edges = None  # right ends of the year-to-date column and of each month column, from the grand total
    for p, page in enumerate(pdf.pages):
        for chars in page_lines(page):
            text = clean(''.join(c['text'] for c in chars))
            bold = [c for c in chars if is_bold(c)]
            regular = [c for c in chars if not is_bold(c)]
            runs = digit_runs(chars)
            reg = [(a, b) for a, b in runs if b - a == 9 and not is_bold(chars[a])]
            if reg:
                a, b = reg[0]
                reg_no = ''.join(c['text'] for c in chars[a:b + 1])
                if edges is None:
                    fail(f'{where}: a hospital before the grand total')
                before = [r for r in runs if r[1] < a]
                if not before:
                    fail(f'{where}: no RZOK before {reg_no}')
                rzok = ''.join(c['text'] for c in chars[before[0][0]:before[0][1] + 1])
                # The region's name runs from the RZOK number to the row number (missing on a few rows).
                region_end = before[1][0] if len(before) > 1 else a
                region = clean(''.join(c['text'] for c in chars[before[0][1] + 1:region_end]))
                after = chars[b + 1:]
                ytd_chars = amount_chars([c for c in after if is_bold(c)])
                # The month amounts start right of the year-to-date column; a long name runs on into the amount
                # columns, so its letters are skipped and the spaces inside the amounts are not part of it.
                groups = number_groups([c for c in after if not is_bold(c) and c['x0'] > edges[0]])
                taken = {id(c) for g in groups for c in g}
                # The thousands spaces: those that exactly bridge two digits of one amount.
                taken |= {
                    id(c) for c in after
                    if c['text'] == ' ' and not is_bold(c)
                    and any(abs(a['x1'] - c['x0']) < 0.3 and abs(c['x1'] - b['x0']) < 0.3 for g in groups for a, b in zip(g, g[1:]))
                }
                name = clean(''.join(c['text'] for c in after if not is_bold(c) and id(c) not in taken))
                report['rows'].append({
                    'rzok': rzok, 'region': region, 'reg_no': reg_no, 'name': fix_cyrillic(name), 'numbered': len(before) > 1,
                    'ytd': number(ytd_chars, f'{where} {reg_no} ytd') or 0,
                    'groups': [(max(c['x1'] for c in g), number(g, f'{where} {reg_no} month')) for g in groups],
                })
                continue
            if bold and not regular and DIGIT.search(text):
                label = re.sub(r'[\d\s-]+', ' ', text).strip()
                total = re.fullmatch(r'(Общо РЗОК|ОБЩО)', label)
                region = re.fullmatch(r'РЗОК (.+)', label)
                if not (total or (region and edges is not None)):
                    continue
                count = int(''.join(c['text'] for c in chars[runs[0][0]:runs[0][1] + 1]))
                groups = number_groups([c for c in bold if c['x0'] > chars[runs[0][1]]['x1'] + 20])
                if len(groups) != 1 + len(report['columns']):
                    fail(f'{where}: {len(groups)} amounts in "{label}" for {len(report["columns"])} month columns')
                if total:
                    edges = [max(c['x1'] for c in g) for g in groups]
                values = [number(g, f'{where} {label}') for g in groups]
                entry = {'count': count, 'ytd': values[0], 'months': values[1:]}
                if total:
                    report['total'] = entry
                else:
                    report['regions'][region.group(1)] = entry
                continue
            # Page numbers ("2/8") and the title and column heads repeated on every page.
            if edges is not None and DIGIT.search(text) and not re.fullmatch(r'\d+/\d+|.*към \d.*|\d{1,2}\.\d{1,2}\.\d{4}(\s*[а-я]+)+', text):
                print(f'  ? {where} p{p + 1}: {text[:100]}')
    pdf.close()
    if report['total'] is None:
        fail(f'{where}: no grand total')
    # Each month amount goes to the column whose amounts end nearest to it (the totals are aligned
    # differently from the rows, so the columns are measured on the rows that fill all of them).
    k = len(report['columns'])
    full = [r['groups'] for r in report['rows'] if len(r['groups']) == k]
    if not full:
        fail(f'{where}: no row fills all {k} month columns')
    ends = [sorted(g[i][0] for g in full)[len(full) // 2] for i in range(k)]
    for r in report['rows']:
        months = [0] * k
        for x, value in r.pop('groups'):
            i = min(range(k), key=lambda j: abs(ends[j] - x))
            if abs(ends[i] - x) > 3 or months[i]:
                fail(f'{where} {r["reg_no"]}: an amount ending at {x:.1f} is in no month column {ends}')
            months[i] = value
        r['months'] = months
    return report


def adds_up(rows, total):
    """
    The rows' amounts add up to the total, give or take each row's rounding to the unit. The printed count
    is not checked: some files count rows that are not printed (their row numbers are skipped and the
    amounts add up without them), others print rows of zeros, numbered or not, that they do not count, and
    one (May 2024) prints an unnumbered row with money that its count leaves out but its amounts include.
    """
    slack = len(rows) / 2
    sums = [sum(r['months'][i] for r in rows) for i in range(len(total['months']))]
    return (
        abs(total['ytd'] - sum(r['ytd'] for r in rows)) <= slack
        and all(abs(a - b) <= slack for a, b in zip(total['months'], sums))
    )


def check_report(report, where):
    rows = report['rows']
    if not adds_up(rows, report['total']):
        fail(f'{where}: rows ({len(rows)}, {sum(r["ytd"] for r in rows)}, {[sum(r["months"][i] for r in rows) for i in range(len(report["columns"]))]}) do not add up to the total {report["total"]}')
    report['unprinted'] = report['total']['count'] - sum(1 for r in rows if r['ytd'] or any(r['months']))
    if len({r['reg_no'] for r in rows}) != len(rows):
        fail(f'{where}: a registration number is listed twice')
    # Rows are checked against the subtotal of the region printed on them; the RZOK is the registration
    # number's first two digits (the printed RZOK number is wrong on a few rows, its name never was).
    by_region = defaultdict(list)
    names = {}
    for r in rows:
        if r['reg_no'][:2] != r['rzok']:
            print(f'  ! {where}: {r["reg_no"]} ({r["region"]}) is printed with RZOK number {r["rzok"]}')
        by_region[r['region']].append(r)
        names.setdefault(r['reg_no'][:2], set()).add(r['region'])
    if set(report['regions']) != set(by_region):
        fail(f'{where}: regional subtotals {sorted(report["regions"])} for rows in {sorted(by_region)}')
    for region, total in report['regions'].items():
        if not adds_up(by_region[region], total):
            fail(f'{where}: {region} does not add up to its subtotal {total}')
    for rzok, printed in names.items():
        if len(printed) != 1:
            fail(f'{where}: RZOK {rzok} is printed as {sorted(printed)}')
    report['rzok_names'] = {rzok: printed.pop() for rzok, printed in names.items()}


# ---------- all reports ----------

def parsed_reports():
    """Every cached report, parsed and checked: {(series, month): report}. Parses are cached by file size and date."""
    cache_path = os.path.join(PDF_DIR, 'parsed.json')
    cache = json.load(open(cache_path, encoding='utf8')) if os.path.exists(cache_path) else {}
    reports = {}
    for file in sorted(os.listdir(PDF_DIR)):
        m = re.fullmatch(r'(care|devices|medicines)-(\d{4}-\d{2})\.pdf', file)
        if not m:
            continue
        path = os.path.join(PDF_DIR, file)
        stamp = f'{os.path.getsize(path)}:{int(os.path.getmtime(path))}'
        if cache.get(file, {}).get('stamp') != stamp:
            report = parse_report(path)
            check_report(report, file)
            cache[file] = {'stamp': stamp, 'report': report}
        report = cache[file]['report']
        if report['month'] != m.group(2):
            fail(f'{file}: the report is for {report["month"]}')
        reports[(m.group(1), m.group(2))] = report
    json.dump(cache, open(cache_path, 'w', encoding='utf8'), ensure_ascii=False)
    return reports


def monthly(reports):
    """
    Every hospital's payment in every month, per series: {(series, reg_no): {month: (paid, ytd)}}, where
    ytd is the year-to-date figure printed in that month's report (None when the report is missing).
    A missing report's month is the next report's year to date less its month. Also returns the checks.
    """
    out = defaultdict(dict)
    notes = []
    for series in SERIES:
        for year in YEARS:
            months = sorted(m for (s, m) in reports if s == series and m.startswith(str(year)))
            if not months:
                continue
            last = int(months[-1][5:])
            expected = [f'{year}-{n:02d}' for n in range(1, last + 1)]
            missing = [m for m in expected if m not in months]
            for month in months:
                report = reports[(series, month)]
                for r in report['rows']:
                    if not (r['ytd'] or any(r['months'])):
                        continue
                    # The report month is the last month column; an earlier one (February 2026 also has
                    # January) must agree with that month's own report.
                    for col, value in zip(report['columns'][:-1], r['months'][:-1]):
                        if (series, col) in reports:
                            own = next((x['months'][-1] for x in reports[(series, col)]['rows'] if x['reg_no'] == r['reg_no']), 0)
                            if own != value:
                                notes.append(f'{series} {col} {r["reg_no"]}: {value} in the {month} report, {own} in its own')
                    out[(series, r['reg_no'])][month] = (r['months'][-1], r['ytd'])
            for month in missing:
                after = f'{year}-{int(month[5:]) + 1:02d}'
                before = f'{year}-{int(month[5:]) - 1:02d}'
                if after not in months:
                    fail(f'{series} {month}: no report, nor one for the next month')
                for r in reports[(series, after)]['rows']:
                    prior = out.get((series, r['reg_no']), {}).get(before, (0, 0))[1] or 0
                    value = r['ytd'] - r['months'][-1] - prior
                    if value:
                        out[(series, r['reg_no'])][month] = (value, None)
                notes.append(f'{series} {month}: no report; each month is the {after} year to date less its month')
            # Year to date = previous year to date + month, for every hospital in every report.
            off, amount, large = 0, 0, []
            for key, values in out.items():
                if key[0] != series:
                    continue
                running = 0
                for month in expected:
                    paid, ytd = values.get(month, (0, None))
                    running += paid
                    if ytd is not None and ytd != running:
                        off += 1
                        amount += ytd - running
                        if abs(ytd - running) > 5:
                            large.append(f'{key[1]} {month}: {ytd - running:+,}')
                        running = ytd
            if off:
                notes.append(f'{series} {year}: {off} hospital-months where the year to date is not the sum of the months (net {amount:+,}); more than 5: {"; ".join(large) or "none"}')
    return out, notes


def write_csv(path, header, rows):
    with open(path, 'w', encoding='utf8', newline='') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(header)
        w.writerows(rows)
    print(f'{os.path.relpath(path, ROOT)}: {len(rows)} rows, {os.path.getsize(path):,} bytes')


def municipalities():
    """EKATTE municipality code → (province, ЕБК code) through the site's register, matched by name."""
    ekatte = [x for x in json.load(open(os.path.join(CACHE, 'ekatte', 'ek_obst.json'), encoding='utf-8-sig')) if 'obshtina' in x]
    with open(REGISTER, encoding='utf8') as f:
        register = list(csv.DictReader(f))
    # EKATTE calls the rural municipality around Dobrich "Добрич-селска"; the budget acts call it "Добричка".
    alias = {'добричселска': 'добричка'}
    key = lambda name: (lambda k: alias.get(k, k))(re.sub(r'[\s„“"”-]|община$', '', fix_cyrillic(name).lower()))
    by_name = {(r['province'], key(r['municipality'])): r for r in register}
    province = {code: name for rzok, code in RZOK_OBLAST.items() for name in [RZOK_PROVINCE[rzok]]}
    out = {}
    for x in ekatte:
        prov = province[x['obshtina'][:3]]
        r = by_name.get((prov, key(x['name'])))
        if r is None:
            fail(f'EKATTE {x["obshtina"]} {x["name"]} ({prov}) is not in the register')
        out[x['obshtina']] = (prov, r['ebk_code'], r['municipality'])
    if len(out) != len(register):
        fail(f'{len(out)} EKATTE municipalities for {len(register)} in the register')
    return out


def main():
    reports = parsed_reports()
    found = sorted(reports)
    print(f'{len(found)} reports: ' + ', '.join(f'{s} {min(m for x, m in found if x == s)}..{max(m for x, m in found if x == s)}' for s in SERIES))
    for (series, month), report in sorted(reports.items()):
        if report['currency'] != ('EUR' if month >= '2026' else 'BGN'):
            fail(f'{series} {month}: amounts in {report["currency"]}')
        if report['unprinted']:
            print(f'  {series} {month}: the count includes {report["unprinted"]} rows without money or not printed')
    payments, notes = monthly(reports)
    for note in notes:
        print('  ' + note)

    # ---------- the hospitals ----------
    names = defaultdict(lambda: defaultdict(int))  # reg_no → name → reports
    seen = defaultdict(set)
    rzok_names = {}
    for (series, month), report in reports.items():
        rzok_names.update(report['rzok_names'])
        for r in report['rows']:
            if r['ytd'] or any(r['months']):
                names[r['reg_no']][(month, r['name'])] += 1
                seen[r['reg_no']].add(month)
    places = municipalities()
    hospitals = []
    unplaced = []
    for reg_no in sorted(names):
        spellings = sorted(names[reg_no], reverse=True)
        latest = spellings[0][1]
        others = sorted({n for _, n in spellings} - {latest})
        rzok = reg_no[:2]
        code = RZOK_OBLAST[rzok] + reg_no[2:4]
        if rzok == '22' and 1 <= int(reg_no[2:4]) <= 24:
            code = 'SOF46'
        code = PLACE_BY_NAME.get(reg_no, code)
        if reg_no in UNPLACED or code not in places:
            code = ''
        province, ebk, municipality = places[code] if code else (RZOK_PROVINCE[rzok], '', '')
        if province != RZOK_PROVINCE[rzok]:
            fail(f'{reg_no}: municipality {municipality} is not in the province of RZOK {rzok}')
        if not ebk:
            unplaced.append(f'{reg_no} {latest}' + (f' ({UNPLACED[reg_no]})' if reg_no in UNPLACED else ''))
        months = sorted(seen[reg_no])
        hospitals.append([reg_no, latest, ' | '.join(others), rzok, province, code, ebk, municipality, months[0], months[-1]])
    if unplaced:
        print(f'  {len(unplaced)} registration numbers without a clear municipality: ' + '; '.join(unplaced))

    os.makedirs(OUT, exist_ok=True)
    rows = []
    for (series, reg_no), values in sorted(payments.items(), key=lambda kv: (kv[0][1], list(SERIES).index(kv[0][0]))):
        for month, (paid, ytd) in sorted(values.items()):
            rows.append([reg_no, series, month, paid, '' if ytd is None else ytd, 'EUR' if month >= '2026' else 'BGN'])
    write_csv(os.path.join(OUT, 'nhif-hospital-payments.csv'), ['reg_no', 'series', 'month', 'paid', 'ytd', 'currency'], rows)
    write_csv(
        os.path.join(OUT, 'hospitals.csv'),
        ['reg_no', 'name', 'other_names', 'rzok', 'province', 'ekatte_municipality', 'ebk_code', 'municipality', 'first_month', 'last_month'],
        hospitals,
    )

    # ---------- totals by year, for the README ----------
    for series in SERIES:
        for year in YEARS:
            last = max((m for (s, m) in reports if s == series and m.startswith(str(year))), default=None)
            if not last:
                continue
            report = reports[(series, last)]
            months_sum = sum(paid for (s, _), v in payments.items() if s == series for m, (paid, _) in v.items() if m.startswith(str(year)))
            print(f'  {series} {year} to {last}: {report["total"]["count"]} establishments, year to date {report["total"]["ytd"]:,} {report["currency"]}, months add up to {months_sum:,}')


if __name__ == '__main__' and '--test' in sys.argv:
    for path in sys.argv[2:]:
        r = parse_report(path)
        check_report(r, path)
        print(path, r['month'], r['columns'], r['currency'], r['total'], len(r['regions']), 'unprinted', r['unprinted'])
        for row in r['rows'][:3]:
            print('   ', row)
        long = [row for row in r['rows'] if len(row['name']) > 45]
        for row in long[:5]:
            print('   long', row)
    sys.exit(0)

if __name__ == '__main__':
    main()
