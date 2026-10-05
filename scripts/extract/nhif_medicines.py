#!/usr/bin/env python3
"""NHIF (НЗОК) spending on medicines by active ingredient (ATC code / INN), year by year, from the fund's
monthly medicine reports.

  python3 scripts/extract/nhif_medicines.py --download   # fetch the report pages and XLS files into the cache
  python3 scripts/extract/nhif_medicines.py              # parse them, write data/sources/health/

Sources: https://www.nhif.bg/bg/nzok/medicine/<n>, one XLS a month (and one for the whole of 2025):
  home      Справка 1 (ПЛС1): medicines, medical devices and dietary foods for home treatment, paid to
            pharmacies — by ATC code, NHIF product code and ICD-10 diagnosis ("Реимбурсна сума").
  hospital  Справка 7 (ПЛС2): cancer medicines and medicines for congenital coagulopathies that the fund pays
            hospitals outside the price of the clinical pathway — by ATC code and INN.
Amounts are the reimbursed sums ("Реимбурсна сума"), in leva until 2025 and in euro from January 2026.
Справка 1 also lists medical devices and dietary foods under the fund's own codes W, X, Y and Z (not WHO ATC).

Reads data/cache/health/nhif-medicines/ (MANIFEST.md lists every file with its URL and download date).
Writes data/sources/health/nhif-medicines.csv: report, year, atc, name, amount, currency, months (the number
of monthly files summed, or "year" for a year taken from its annual file), patients (people treated in the
year: the 2025 annual Справка 7 only).

Checks, stopping on any failure: every file covers the month (or year) its name says; each year has all its
months up to the latest; a printed "Grand Total" equals its rows; the twelve 2025 monthly files add up to
the 2025 annual file within 0.5% (home: -0.009%, hospital: -0.28%; the annual file has later corrections and
the 2025 ATC codes, so codes move: e.g. upadacitinib L04AA44 → L04AF03); a currency switch shows as a halving
of the monthly total in January 2026 and nowhere else. Needs xlrd, openpyxl and bs4.
"""

import csv
import os
import re
import subprocess
import sys
import time
from collections import defaultdict
from datetime import date
from urllib.parse import unquote

import openpyxl
import xlrd
from bs4 import BeautifulSoup

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
CACHE = os.path.join(ROOT, 'data', 'cache', 'health', 'nhif-medicines')
OUT = os.path.join(ROOT, 'data', 'sources', 'health')
AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) bg-budget data pipeline'

REPORTS = {'home': 1, 'hospital': 7}
LATIN = str.maketrans('АВСЕНКМОРТХ', 'ABCEHKMOPTX')
DISCOUNTED = set()
FIRST_YEAR = 2021


def fail(message):
    raise SystemExit(f'nhif_medicines.py: {message}')


def clean(text):
    return re.sub(r'\s+', ' ', str(text).replace('\xa0', ' ')).strip()


TO_LATIN = str.maketrans('АВСЕНКМОРТХаеорсху', 'ABCEHKMOPTXaeopcxy')
TO_CYRILLIC = str.maketrans('ABCEHKMOPTXYaceopxy', 'АВСЕНКМОРТХУасеорху')


def fix_letters(text):
    """Look-alike letters of the other alphabet inside a word: "РEMBROLIZUMAB" → Latin, "ПЛАСТИРИ ЗА KOЖA" → Cyrillic."""
    def word(m):
        w = m.group(0)
        latin = w.translate(TO_LATIN)
        if re.search('[A-Za-z]', w) and not re.search('[Ѐ-ӿ]', latin):
            return latin
        return w.translate(TO_CYRILLIC) if re.search('[Ѐ-ӿ]', w) else w
    return re.sub(r'\w+', word, text)


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


def links(report):
    """{period: (upload id, url, file name)} for one report; a period is "2025-07" or "2025" (the whole year)."""
    page = os.path.join(CACHE, f'listing-{REPORTS[report]}.html')
    if not os.path.exists(page):
        curl(f'https://www.nhif.bg/bg/nzok/medicine/{REPORTS[report]}', page)
        time.sleep(1)
    soup = BeautifulSoup(open(page, encoding='utf8').read(), 'lxml')
    found = defaultdict(list)
    for a in soup.find_all('a', href=True):
        href = a['href']
        if not href.startswith('/upload/'):
            continue
        name = unquote(href).split('/')[-1]
        m = re.search(r'_(\d{2})(?: cor)?\.(\d{4})(?:_\d+)?\.(xlsx?|XLS)$', name) or re.search(r'_(\d{4})\.(xlsx?)$', name)
        if not m:
            fail(f'{report}: cannot read the period of {name}')
        period = f'{m.group(2)}-{m.group(1)}' if m.lastindex == 3 else m.group(1)
        if int(period[:4]) < FIRST_YEAR:
            continue
        found[period].append((int(href.split('/')[2]), 'https://www.nhif.bg' + href, name))
    # A month published twice (a correction, or .xls and .xlsx): the file marked "cor", else the later upload.
    return {p: max(files, key=lambda f: (' cor' in f[2], f[0])) for p, files in found.items()}


def download():
    os.makedirs(CACHE, exist_ok=True)
    rows = []
    for report in REPORTS:
        for period, (upload, url, name) in sorted(links(report).items()):
            ext = os.path.splitext(name)[1].lower()
            target = os.path.join(CACHE, f'{report}-{period}{ext}')
            if not os.path.exists(target):
                curl(url, target)
                print(f'  {os.path.basename(target)}  {os.path.getsize(target):,} bytes')
                time.sleep(1)
            rows.append(f'| {os.path.basename(target)} | {name} | {url} | {date.fromtimestamp(os.path.getmtime(target)).isoformat()} |')
    with open(os.path.join(CACHE, 'MANIFEST.md'), 'w', encoding='utf8') as f:
        f.write('# NHIF medicine reports (cache)\n\nFrom https://www.nhif.bg/bg/nzok/medicine/1 (home treatment) and /7 (hospital, outside the clinical pathway).\n\n')
        f.write('| File | Published as | URL | Retrieved |\n| --- | --- | --- | --- |\n' + '\n'.join(rows) + '\n')


# ---------- reading ----------

def sheet_rows(path):
    if path.endswith('.xlsx'):
        ws = openpyxl.load_workbook(path, read_only=True, data_only=True).worksheets[0]
        return [list(r) for r in ws.iter_rows(values_only=True)]
    sh = xlrd.open_workbook(path).sheet_by_index(0)
    return [sh.row_values(r) for r in range(sh.nrows)]


def read(path, period):
    """{atc: [name, amount, patients]} from one file, after checking the period in its title."""
    rows = sheet_rows(path)
    title = clean(rows[0][0])
    if len(period) == 7:
        month, year = period[5:], period[:4]
        covers = re.search(rf'01\.{month}\.{year}.*?(\d\d)\.{month}\.{year}', title) or re.search(rf'за м\. \w+ {year}', title)
    else:
        covers = re.search(rf'01\.01\.{period}.*?31\.12\.{period}|за {period}\s*г', title)
    if not covers:
        fail(f'{os.path.basename(path)}: the title does not cover {period}: {title}')
    # The column heads are in row 2, or row 3 after a blank row.
    at = next((i for i in (1, 2, 3) if any(clean(h or '') in ('ATC код', 'ATC') for h in rows[i])), None)
    if at is None:
        fail(f'{os.path.basename(path)}: no column heads')
    header = [clean(h) for h in rows[at]]
    col = lambda *names: next((i for i, h in enumerate(header) if h in names), None)
    atc, name, patients = col('ATC код', 'ATC'), col('ATC име', 'Международно непатентно наименование (INN)'), col('Брой ЗОЛ')
    # August 2022 (hospital) swaps the heads of the code and name columns: go by what the columns hold.
    looks_like_code = lambda i: sum(bool(re.fullmatch(r'[A-ZА-Я]\d\d\S*', clean(r[i] or ''))) for r in rows[at + 1:at + 21]) >= 15
    if atc is not None and name is not None and not looks_like_code(atc) and looks_like_code(name):
        atc, name = name, atc
    # Some months head the amount "Реимбурсна сума с отстъпка" (the reimbursed sum after the discount).
    amount = col('Реимбурсна сума', 'Реимбурсна сума с отстъпка', 'Реимбурсна стойност')
    if amount is not None and header[amount] == 'Реимбурсна сума с отстъпка':
        DISCOUNTED.add(os.path.basename(path))
    # December 2021 (hospital) has no name column; the names come from the other months.
    if None in (atc, amount):
        fail(f'{os.path.basename(path)}: unexpected columns {header}')
    out = {}
    printed_total = None
    for r in rows[at + 1:]:
        # A few codes are typed with a space ("B03AC 06") or a Cyrillic look-alike letter ("A10BК01").
        code = re.sub(r'\s+', '', str(r[atc] or '')).upper().translate(LATIN)
        if not code:
            continue
        # A "Grand Total" row in a few files: a check, not a medicine.
        if re.fullmatch(r'(GRAND)?TOTAL|ОБЩО.*', code):
            printed_total = r[amount]
            continue
        if not re.fullmatch(r'[A-Z]\d\d[A-Z]{0,2}\d{0,2}', code):
            fail(f'{os.path.basename(path)}: odd ATC code {code!r}')
        value = r[amount]
        if not isinstance(value, (int, float)):
            fail(f'{os.path.basename(path)}: {code}: amount {value!r}')
        entry = out.setdefault(code, [fix_letters(clean(r[name])) if name is not None else '', 0.0, 0])
        entry[1] += value
        if patients is not None and isinstance(r[patients], (int, float)):
            entry[2] += int(r[patients])
    if printed_total is not None and abs(printed_total - sum(v[1] for v in out.values())) > 1:
        fail(f'{os.path.basename(path)}: the rows add up to {sum(v[1] for v in out.values()):,.2f}, the total row says {printed_total:,.2f}')
    return out


def main():
    files = defaultdict(dict)  # report → period → path
    for file in sorted(os.listdir(CACHE)):
        m = re.fullmatch(r'(home|hospital)-(\d{4}(?:-\d\d)?)\.(xlsx?)', file)
        if m:
            files[m.group(1)][m.group(2)] = os.path.join(CACHE, file)
    out = []
    for report in REPORTS:
        data = {period: read(path, period) for period, path in sorted(files[report].items())}
        months = sorted(p for p in data if len(p) == 7)
        latest = months[-1]
        for year in range(FIRST_YEAR, int(latest[:4]) + 1):
            last = 12 if str(year) < latest[:4] else int(latest[5:])
            missing = [f'{year}-{m:02d}' for m in range(1, last + 1) if f'{year}-{m:02d}' not in data]
            if missing:
                fail(f'{report}: no files for {missing}')
        totals = {p: sum(v[1] for v in data[p].values()) for p in months}
        # Leva until December 2025, euro from January 2026: the only halving of the monthly total.
        for prev, cur in zip(months, months[1:]):
            ratio = totals[cur] / totals[prev]
            if (cur == '2026-01') != (ratio < 0.65) or ratio > 1.6:
                fail(f'{report}: the total goes from {totals[prev]:,.0f} ({prev}) to {totals[cur]:,.0f} ({cur})')
        for period in [p for p in data if len(p) == 4]:
            year_months = [p for p in months if p.startswith(period)]
            if len(year_months) != 12:
                continue
            diffs = []
            for code in set(data[period]) | {c for p in year_months for c in data[p]}:
                summed = sum(data[p].get(code, ['', 0, 0])[1] for p in year_months)
                annual = data[period].get(code, ['', 0, 0])[1]
                if abs(summed - annual) > 1:
                    diffs.append((abs(summed - annual), code, summed, annual))
            months_total = sum(totals[p] for p in year_months)
            annual_total = sum(v[1] for v in data[period].values())
            print(f'  {report} {period}: 12 monthly files {months_total:,.2f}, annual file {annual_total:,.2f} ({months_total / annual_total - 1:+.4%}); {len(diffs)} of {len(data[period])} codes differ by more than 1, the most: '
                  + '; '.join(f'{c} {a:,.2f} vs {b:,.2f}' for _, c, a, b in sorted(diffs, reverse=True)[:5]))
            if abs(months_total / annual_total - 1) > 0.005:
                fail(f'{report} {period}: the monthly files and the annual file differ by more than 0.5%')
        for year in range(FIRST_YEAR, int(latest[:4]) + 1):
            year_months = [p for p in months if p.startswith(str(year))]
            amounts, names = defaultdict(float), {}
            # A year with an annual file (2025) is taken from it: it has the corrections made after the monthly
            # files and the ATC codes of the year's end.
            annual = data.get(str(year))
            for p in [str(year)] if annual else year_months:
                for code, (name, amount, _) in data[p].items():
                    amounts[code] += amount
                    names[code] = name or names.get(code, '')
            for code in sorted(amounts):
                patients = annual[code][2] if annual and report == 'hospital' else ''
                out.append([report, year, code, names[code], f'{amounts[code]:.2f}', 'EUR' if year >= 2026 else 'BGN', 'year' if annual else len(year_months), patients])
            print(f'  {report} {year}: {len(amounts)} codes, {sum(amounts.values()):,.2f} {"EUR" if year >= 2026 else "BGN"} from ' + ('the annual file' if annual else f'{len(year_months)} monthly files'))
    if DISCOUNTED:
        print(f'  amount headed "Реимбурсна сума с отстъпка" in: {", ".join(sorted(DISCOUNTED))}')
    path = os.path.join(OUT, 'nhif-medicines.csv')
    with open(path, 'w', encoding='utf8', newline='') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['report', 'year', 'atc', 'name', 'amount', 'currency', 'months', 'patients'])
        w.writerows(out)
    print(f'{os.path.relpath(path, ROOT)}: {len(out)} rows, {os.path.getsize(path):,} bytes')


if __name__ == '__main__':
    if '--download' in sys.argv:
        download()
    else:
        main()
