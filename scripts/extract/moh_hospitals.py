#!/usr/bin/env python3
"""The Ministry of Health's quarterly financial indicators of the state and municipal hospitals, joined to the
NHIF registration numbers of data/sources/health/hospitals.csv.

  python3 scripts/extract/moh_hospitals.py --download   # fetch the year-end files and the latest quarter
  python3 scripts/extract/moh_hospitals.py              # parse them, write data/sources/health/

Source: https://mh.government.bg/bg/politiki/standart-za-finansovo-upravlenie-na-drzhavnite-lechebni-zavedeni/
("Финансови показатели на лечебни заведения за болнична помощ", one XLSX a quarter, Q2 2019 – Q3 2025; sheets
"Държавни ЛЗБП", "Общински ЛЗБП" and a copy of NHIF payments). Used: the fourth quarter of 2019–2024 (whole
years) and the latest quarter, Q3 2025. Amounts are in thousand leva, cumulative from 1 January (revenue,
costs, patients) or at the end of the quarter (liabilities); staff and beds are monthly averages.

The ministry names hospitals only by name, so data/sources/health/moh-hospitals.csv (made once, reviewed
by hand) gives the NHIF registration number of every spelling used in these files, or none with the reason.

Writes data/sources/health/moh-hospital-finances.csv: period, ownership, moh_name, reg_no, revenue_kBGN,
costs_kBGN, liabilities_kBGN, overdue_kBGN, patients, doctors, nurses, beds.

Checks, stopping on any failure: every hospital row of every sheet adds up to the sheet's "ОБЩО" row in
revenue, costs, liabilities and overdue liabilities (to 1 thousand leva; the 2021 file has no total rows);
every spelling is in the mapping;
no registration number is matched twice in one period. Needs openpyxl.
"""

import csv
import os
import re
import subprocess
import sys
import time
from datetime import date

import openpyxl

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
CACHE = os.path.join(ROOT, 'data', 'cache', 'health', 'moh')
OUT = os.path.join(ROOT, 'data', 'sources', 'health')

BASE = 'https://mh.government.bg'
# Period → the file's path on mh.government.bg (as linked from the page above on 5 Oct 2026).
FILES = {
    '2019-12': '/upload/4959/finansovi_pokazateli_na__lzbp_iv_trimesechie_2019.xlsx',
    '2020-12': '/upload/4955/finansovi_pokazateli_na__lzbp_iv_trimesechie_2020.xlsx',
    '2021-12': '/upload/4951/finansovi_pokazateli_na_lzbp_iv_trimesechie_2021.xlsx',
    '2022-12': '/upload/4947/2022_q4.xlsx',
    '2023-12': '/upload/11496/finansovi_ pokazateli_ na lzbp_ Q4 _2023.xlsx',
    '2024-12': '/upload/17413/finansovi_ pokazateli_na_lzbp_2024 Q4 .xlsx',
    '2025-09': '/upload/17415/finansovi-pokazateli_ na_ lzbp_2025 Q3.xlsx',
}
INDICATORS = {
    # id: (heading of the column group, sub-heading: 'period' = the file's own quarter, or a fixed label)
    'revenue_kBGN': ('Общо приходи', 'period'),
    'costs_kBGN': ('Общо разходи', 'period'),
    'liabilities_kBGN': ('Общо задължения', 'Текущо тримесечие'),
    'overdue_kBGN': ('Просрочени задължения', 'Текущо тримесечие'),
    'patients': ('Брой преминали болни', 'period'),
    'doctors': ('Средно месечен брой лекари', 'period'),
    'nurses': ('Средно месечен брой специалисти по здравни грижи', 'period'),
    'beds': ('Средно месечен брой легла', 'period'),
}
SUMMED = ['revenue_kBGN', 'costs_kBGN', 'liabilities_kBGN', 'overdue_kBGN']


def fail(message):
    raise SystemExit(f'moh_hospitals.py: {message}')


def clean(text):
    return re.sub(r'\s+', ' ', str(text).replace('\xa0', ' ')).strip()


def cache_file(period):
    return os.path.join(CACHE, f'{period}.xlsx')


def download():
    os.makedirs(CACHE, exist_ok=True)
    lines = []
    for period, path in FILES.items():
        target = cache_file(period)
        url = BASE + path.replace(' ', '%20')
        if not os.path.exists(target):
            result = subprocess.run(['curl', '-sS', '-L', '-o', target, '-w', '%{http_code}', url], capture_output=True, text=True)
            if result.stdout != '200':
                fail(f'{url}: HTTP {result.stdout} {result.stderr}')
            time.sleep(1)
        lines.append(f'| {period}.xlsx | {url} | {date.fromtimestamp(os.path.getmtime(target)).isoformat()} |')
    with open(os.path.join(CACHE, 'MANIFEST.md'), 'w', encoding='utf8') as f:
        f.write('# Ministry of Health: financial indicators of hospitals (cache)\n\n')
        f.write('From https://mh.government.bg/bg/politiki/standart-za-finansovo-upravlenie-na-drzhavnite-lechebni-zavedeni/\n\n')
        f.write('| File | URL | Retrieved |\n| --- | --- | --- |\n' + '\n'.join(lines) + '\n')


def quarter_label(period):
    """'2025-09' → 'Q3 2025' (how the files head their columns)."""
    year, month = period.split('-')
    return f'Q{int(month) // 3} {year}'


def columns(header, sub, period):
    """Column of every indicator: the group heading spans the columns to its right until the next one."""
    group, groups = '', []
    for i in range(len(header)):
        if header[i] not in (None, ''):
            group = clean(header[i])
        groups.append(group)
    wanted = quarter_label(period).replace(' ', '')
    found = {}
    for key, (heading, label) in INDICATORS.items():
        matches = [
            i for i in range(len(header))
            if groups[i].startswith(heading)
            and clean(sub[i] or '').replace(' ', '') == (wanted if label == 'period' else label.replace(' ', ''))
        ]
        if len(matches) != 1:
            fail(f'{period}: {len(matches)} columns for {key} ({heading} / {label})')
        found[key] = matches[0]
    return found


def number(value):
    if value in (None, '', '-'):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = clean(value).replace(' ', '').replace(',', '.')
    return float(text) if re.fullmatch(r'-?\d+(\.\d+)?', text) else None


def read_period(period):
    wb = openpyxl.load_workbook(cache_file(period), read_only=True, data_only=True)
    out = []
    for index, ownership in ((0, 'state'), (1, 'municipal')):
        rows = list(wb.worksheets[index].iter_rows(values_only=True))
        header, sub = rows[0], rows[1]
        name_col = 1 if clean(header[0] or '') == 'Област' else 0
        cols = columns(header, sub, period)
        total, hospitals = None, []
        for row in rows[2:]:
            name = clean(row[name_col] or '')
            if not name:
                continue
            values = {key: number(row[c]) for key, c in cols.items()}
            if name.startswith('ОБЩО'):
                total = values
                continue
            # Subtotals by legal form in the state sheet (" ЕАД", " АД", " ЕООД").
            if name in ('ЕАД', 'АД', 'ЕООД', 'ООД'):
                continue
            hospitals.append({'period': period, 'ownership': ownership, 'moh_name': name, **values})
        # The 2021 file has no total rows to check against.
        if total is None:
            print(f'  {period} {ownership}: no total row')
            total = {key: sum(h[key] or 0 for h in hospitals) for key in SUMMED}
        for key in SUMMED:
            got = sum(h[key] or 0 for h in hospitals)
            if abs(got - (total[key] or 0)) > 1:
                fail(f'{period} {ownership}: {key} of the hospitals is {got:,.1f}, the total row says {total[key]:,.1f}')
        out += hospitals
    return out


def main():
    with open(os.path.join(OUT, 'moh-hospitals.csv'), encoding='utf8') as f:
        mapping = {(r['ownership'], r['moh_name']): r for r in csv.DictReader(f)}
    with open(os.path.join(OUT, 'hospitals.csv'), encoding='utf8') as f:
        nhif = {r['reg_no'] for r in csv.DictReader(f)}
    rows = []
    for period in FILES:
        hospitals = read_period(period)
        seen = {}
        for h in hospitals:
            match = mapping.get((h['ownership'], h['moh_name']))
            if match is None:
                fail(f'{period}: "{h["moh_name"]}" ({h["ownership"]}) is not in moh-hospitals.csv')
            reg_no = match['reg_no']
            if reg_no and reg_no not in nhif:
                fail(f'{period}: {h["moh_name"]} is matched to {reg_no}, not in hospitals.csv')
            if reg_no in seen:
                fail(f'{period}: {reg_no} is matched by both {seen[reg_no]} and {h["moh_name"]}')
            if reg_no:
                seen[reg_no] = h['moh_name']
            h['reg_no'] = reg_no
        matched = sum(1 for h in hospitals if h['reg_no'])
        print(f'{period}: {len(hospitals)} hospitals ({sum(h["ownership"] == "state" for h in hospitals)} state), {matched} matched to an NHIF number ({matched / len(hospitals):.0%})')
        rows += hospitals
    fmt = lambda v, places: '' if v is None else f'{v:.{places}f}'
    path = os.path.join(OUT, 'moh-hospital-finances.csv')
    with open(path, 'w', encoding='utf8', newline='') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['period', 'ownership', 'moh_name', 'reg_no', *INDICATORS])
        for h in rows:
            w.writerow([h['period'], h['ownership'], h['moh_name'], h['reg_no'],
                        *(fmt(h[k], 3 if k.endswith('kBGN') else 1) for k in INDICATORS)])
    print(f'{os.path.relpath(path, ROOT)}: {len(rows)} rows, {os.path.getsize(path):,} bytes')


if __name__ == '__main__':
    if '--download' in sys.argv:
        download()
    else:
        main()
