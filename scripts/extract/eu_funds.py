#!/usr/bin/env python3
"""EU funds: programmes, Recovery Plan investments and EU-funded projects.

  python3 scripts/extract/eu_funds.py --download   # fetch the sources into data/cache/eu-funds/ (polite, cached)
  python3 scripts/extract/eu_funds.py              # extract data/sources/eu-funds/ from the cache

Sources: the Ministry of Finance's monthly tables on data.egov.bg (4226: 2014–2020 programmes, 18860: 2021–2027,
18958: the Recovery and Resilience Plan; only the year ends and the latest two months are fetched) and the ИСУН
open-data API (one JSON file per programme that spends EU money; the API refuses quick series of calls, so calls are
spaced and a refusal is waited out, never got around).

Writes data/sources/eu-funds/:
  programmes.csv, programmes-paid.csv   programme × fund at the latest month; paid to date at every year end
  rrp-investments.csv, rrp-paid.csv, rrp-totals.csv   the Plan by investment; paid at year ends; the Plan's totals
  projects.csv.gz, isun-programmes.csv  every ИСУН project (legal entities named as in that project), the
                                        programmes used

Checks, stopping on any failure: every snapshot's rows add up to its printed total row (to €2), cells masked by the
portal ("**********") can be rebuilt, every snapshot lists the same programmes and funds, investments are unique by
code, body and name; every ИСУН file has the number of projects it announces, project codes are unique, every
municipality matches the register, no personal identity number is left in a text. Natural persons (also those with a
number whose name is a person's, see persons.py) and sole traders keep no name, ЕИК, project name or settlement. See
data/sources/eu-funds/README.md.
"""

import csv
import gzip
import json
import os
import re
import sys
import time
from collections import Counter
from datetime import date
from decimal import Decimal

import requests

from persons import count_given_names, personal, read_given_names, sole_trader, use_given_names

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
CACHE = os.path.join(ROOT, 'data', 'cache', 'eu-funds')
OUT = os.path.join(ROOT, 'data', 'sources', 'eu-funds')

EGOV = 'https://data.egov.bg/api/'
ISUN = 'https://2020.eufunds.bg/api/v1.0/opendata'
BROWSER = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'bg,en;q=0.9',
}
# ИСУН is rate-limited: at least this many seconds between calls (ISUN_PAUSE=240 was used after a refusal), and much
# longer after HTTP 429 or an HTML page instead of JSON (that page is never solved, only waited out).
ISUN_PAUSE = int(os.environ.get('ISUN_PAUSE', '15'))
ISUN_COOLDOWN = 1800

# Ministry of Finance datasets on data.egov.bg (organisation 103, "Национален фонд").
MOF_DATASETS = {
    'p2127': '1c02f8f3-3293-40b1-9317-a4bee7af59c8',  # 18860: ERDF, ESF+, CF, JTF 2021–2027, programme × fund
    'p1420': 'e87ba264-f445-4759-a248-8b16d67a7108',  # 4226: ERDF, CF, ESF, FEAD 2014–2020, programme × fund
    'rrp': '045c6ffa-6cbd-4416-a299-dad41120681e',    # 18958: Recovery and Resilience Plan by investment
}

# ИСУН programmes that spend EU money (id → programme period id). Left out: the EEA and Norway grants,
# the Swiss–Bulgarian programme and the national programmes in СУНИ (not EU funds).
ISUN_PROGRAMMES = {
    # 2014–2020
    2: 1, 6: 1, 3: 1, 5: 1, 7: 1, 4: 1, 1: 1, 8: 1, 8010402: 1, 8010406: 1, 8010436: 1, 8010437: 1, 8010510: 1,
    # Recovery and Resilience Plan
    8010686: 2,
    # 2021–2027
    8010709: 3, 8010710: 3, 8010711: 3, 8010759: 3, 8010777: 3, 8010781: 3, 8010785: 3, 8010798: 3, 8010814: 3,
    8010828: 3, 8010829: 3, 8010851: 3, 8010862: 3, 8010879: 3, 8010936: 3,
}

TODAY = date.today().isoformat()


def note(file, url, what):
    path = os.path.join(CACHE, 'MANIFEST.md')
    head = '' if os.path.exists(path) else '# EU funds (cache)\n\n| File | URL | What | Retrieved |\n| --- | --- | --- | --- |\n'
    with open(path, 'a', encoding='utf-8') as f:
        f.write(f'{head}| {file} | {url} | {what} | {TODAY} |\n')


def egov(method, body):
    for attempt in range(1, 5):
        try:
            r = requests.post(EGOV + method, json=body, timeout=600)
            if r.status_code == 429 or r.status_code >= 500:
                raise RuntimeError(f'HTTP {r.status_code}')
            r.raise_for_status()
            return r.json()
        except Exception as e:  # noqa: BLE001 — retried, then raised
            if attempt == 4:
                raise
            print(f'  {e}; retrying in {30 * attempt} s')
            time.sleep(30 * attempt)


MONTHS_BG = ['януари', 'февруари', 'март', 'април', 'май', 'юни', 'юли', 'август', 'септември', 'октомври', 'ноември', 'декември']


def period_of(name):
    """The month a monthly resource describes: "2026-08-31", "2026-08" or "… към 31 Август 2026 г." → "2026-08"."""
    m = re.match(r'^(\d{4})-(\d\d)', name.strip())
    if m:
        return f'{m.group(1)}-{m.group(2)}'
    m = re.search(r'към\s+\d{1,2}\s+([А-Яа-я]+)\s*(\d{4})', name)
    if not m or m.group(1).lower() not in MONTHS_BG:
        raise ValueError(f'No month in resource name {name!r}')
    return f'{m.group(2)}-{MONTHS_BG.index(m.group(1).lower()) + 1:02d}'


def mof_resources(key):
    """The monthly resources of a dataset, by month (the cached listing)."""
    with open(os.path.join(CACHE, 'mof', f'{key}-resources.json'), encoding='utf-8') as f:
        return {period_of(r['name']): r for r in json.load(f)}


def wanted_months(months):
    """Year ends, the latest month and the one before it (cumulative figures: a year's payments are the difference of two year ends)."""
    latest = sorted(months)
    return {m for m in months if m.endswith('-12')} | set(latest[-2:])


def download_mof():
    os.makedirs(os.path.join(CACHE, 'mof'), exist_ok=True)
    for key, uri in MOF_DATASETS.items():
        listing = egov('listResources', {'criteria': {'dataset_uri': uri}, 'records_per_page': 100, 'page_number': 1})
        resources = listing['resources']
        if listing.get('total_records', len(resources)) > len(resources):
            resources += egov('listResources', {'criteria': {'dataset_uri': uri}, 'records_per_page': 100, 'page_number': 2})['resources']
        with open(os.path.join(CACHE, 'mof', f'{key}-resources.json'), 'w', encoding='utf-8') as f:
            json.dump(resources, f, ensure_ascii=False, indent=1)
        by_month = mof_resources(key)
        for month in sorted(wanted_months(by_month)):
            r = by_month[month]
            path = os.path.join(CACHE, 'mof', key, f'{month}.json')
            if os.path.exists(path):
                continue
            os.makedirs(os.path.dirname(path), exist_ok=True)
            data = egov('getResourceData', {'resource_uri': r['uri']})
            if not isinstance(data.get('data'), list):
                raise RuntimeError(f'{key} {r["name"]}: no data')
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False)
            note(f'mof/{key}/{month}.json', f'{EGOV}getResourceData {{"resource_uri":"{r["uri"]}"}}', f'{key}: {r["name"]}')
            print(f'  {key}: {r["name"]}')
            time.sleep(2)


def download_isun():
    os.makedirs(os.path.join(CACHE, 'isun'), exist_ok=True)
    session = requests.Session()
    session.headers.update(BROWSER)
    criteria = os.path.join(CACHE, 'isun', 'criteria.json')
    if not os.path.exists(criteria):
        r = session.get(f'{ISUN}/criteria', timeout=120)
        r.raise_for_status()
        with open(criteria, 'w', encoding='utf-8') as f:
            json.dump(r.json(), f, ensure_ascii=False, indent=1)
        note('isun/criteria.json', f'{ISUN}/criteria', 'programme list')
        time.sleep(ISUN_PAUSE)
    for programme, period in ISUN_PROGRAMMES.items():
        path = os.path.join(CACHE, 'isun', f'{programme}.json.gz')
        if os.path.exists(path):
            continue
        url = f'{ISUN}?ProgrammeId={programme}&ProgrammePeriodId={period}'
        for attempt in range(1, 4):
            r = session.get(url, timeout=1800)
            if r.status_code == 200 and r.headers.get('Content-Type', '').startswith('application/json'):
                break
            # HTTP 429 or a challenge page: wait it out (never solve it), then try once more with a fresh session.
            print(f'  {programme}: HTTP {r.status_code} {r.headers.get("Content-Type")}, waiting {ISUN_COOLDOWN * attempt} s', flush=True)
            if attempt == 3:
                print(f'  {programme}: still refused — stopping; {r.text[:200]!r}')
                sys.exit(1)
            time.sleep(ISUN_COOLDOWN * attempt)
            session = requests.Session()
            session.headers.update(BROWSER)
        data = r.json()
        with gzip.open(path, 'wt', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False)
        note(f'isun/{programme}.json.gz', url, f'{data.get("totalProjects")} projects, generated {data.get("generatedAt")}')
        print(f'  {programme}: {data.get("totalProjects")} projects, {len(r.content) / 1e6:.1f} MB', flush=True)
        time.sleep(ISUN_PAUSE)


# ---------- the Ministry of Finance's programme and Recovery Plan tables ----------

MASK = '**********'


def fail(message):
    raise SystemExit(f'eu_funds.py: {message}')


def cell(row, i):
    return (row[i] if i is not None and i < len(row) and row[i] is not None else '').strip()


def amount(text):
    """A number as printed (euro, with decimals); None for a blank or a masked cell.

    data.egov.bg replaces some 10-digit numbers with "**********" (it takes them for personal identity
    numbers); those cells are rebuilt from the other columns or the total row, see rebuild().
    """
    text = text.replace(' ', '').replace('\xa0', '')
    if not text or text == MASK or text == '-':
        return None
    return Decimal(text)


# Programmes of the two periods, recognised by a phrase of their name as printed (the names vary slightly over time).
PROGRAMMES = {
    '2014-2020': [
        ('transport-14', 'Транспорт и транспортна инфраструктура', 'Оперативна програма „Транспорт и транспортна инфраструктура“', 'Operational Programme Transport and Transport Infrastructure'),
        ('environment-14', 'Околна среда', 'Оперативна програма „Околна среда“', 'Operational Programme Environment'),
        ('science-14', 'Наука и образование', 'Оперативна програма „Наука и образование за интелигентен растеж“', 'Operational Programme Science and Education for Smart Growth'),
        ('regions-14', 'Региони в растеж', 'Оперативна програма „Региони в растеж“', 'Operational Programme Regions in Growth'),
        ('hrd-14', 'Развитие на човешките ресурси', 'Оперативна програма „Развитие на човешките ресурси“', 'Operational Programme Human Resources Development'),
        ('innovation-14', 'Иновации и конкурентоспособност', 'Оперативна програма „Иновации и конкурентоспособност“', 'Operational Programme Innovation and Competitiveness'),
        ('sme-14', 'малки и средни предприятия', 'Оперативна програма „Инициатива за малки и средни предприятия“', 'SME Initiative Operational Programme'),
        ('governance-14', 'Добро управление', 'Оперативна програма „Добро управление“', 'Operational Programme Good Governance'),
        ('fead-14', 'най-нуждаещите', 'Оперативна програма за храни и/или основно материално подпомагане (ФЕПНЛ)', 'Operational Programme for Food and/or Basic Material Assistance (FEAD)'),
    ],
    '2021-2027': [
        ('transport-21', 'Транспортна свързаност', 'Програма „Транспортна свързаност“', 'Transport Connectivity Programme'),
        ('environment-21', 'Околна среда', 'Програма „Околна среда“', 'Environment Programme'),
        ('ta-21', 'Техническа помощ', 'Програма „Техническа помощ“', 'Technical Assistance Programme'),
        ('competitiveness-21', 'Конкурентоспособност и иновации', 'Програма „Конкурентоспособност и иновации в предприятията“', 'Competitiveness and Innovation in Enterprises Programme'),
        ('regions-21', 'Развитие на регионите', 'Програма „Развитие на регионите“', 'Development of the Regions Programme'),
        ('research-21', 'Научни изследвания', 'Програма „Научни изследвания, иновации и дигитализация за интелигентна трансформация“', 'Research, Innovation and Digitalisation for Smart Transformation Programme'),
        ('hrd-21', 'Развитие на човешките ресурси', 'Програма „Развитие на човешките ресурси“', 'Human Resources Development Programme'),
        ('education-21', 'Образование', 'Програма „Образование“', 'Education Programme'),
        ('food-21', 'Храни и основно материално', 'Програма „Храни и основно материално подпомагане“', 'Food and Basic Material Support Programme'),
    ],
}
FUNDS = {'ЕФРР': 'ERDF', 'КФ': 'CF', 'ЕСФ': 'ESF', 'ЕСФ+': 'ESF+', 'ФЕПН': 'FEAD'}
# Programme-table columns, recognised by their headings (which change over the years); the paid EU and national
# parts are the first and second "Платено" columns before "Общо платено" where they have no name of their own.
FIELDS = ['budget_eu', 'budget_national', 'budget_total', 'received_prefinancing', 'received_claims', 'received_total',
          'paid_eu', 'paid_national', 'paid_total', 'declared', 'certified']


def programme_columns(header):
    cols = {}
    paid_parts = []
    for i, h in enumerate(header):
        h = re.sub(r'\s+', ' ', (h or '')).strip()
        if 'Бюджет' in h and 'ЕС' in h:
            cols['budget_eu'] = i
        elif 'Бюджет' in h and 'национално' in h:
            cols['budget_national'] = i
        elif 'Бюджет' in h and 'ОБЩО' in h:
            cols['budget_total'] = i
        elif 'предварително' in h:
            cols['received_prefinancing'] = i
        elif h.startswith('Получени') and 'заявления' in h:
            cols['received_claims'] = i
        elif h.startswith('Общо получени'):
            cols['received_total'] = i
        elif h.startswith('Общо платено'):
            cols['paid_total'] = i
        elif h == 'ЕС' or h.startswith('Платено ЕС'):
            cols['paid_eu'] = i
        elif h == 'НС' or h.startswith('Платено НС'):
            cols['paid_national'] = i
        elif h.startswith('Платено'):
            paid_parts.append(i)
        elif 'декларирани' in h:
            cols['declared'] = i
        elif 'сертифиц' in h:
            cols['certified'] = i
    if len(paid_parts) == 2:
        cols['paid_eu'], cols['paid_national'] = paid_parts
    missing = [f for f in FIELDS if f not in cols and f != 'certified']
    if missing:
        fail(f'programme table: no column for {missing} in {header}')
    return cols


def programme_key(period, name):
    for key, phrase, *_ in PROGRAMMES[period]:
        if phrase in name:
            return key
    return None


def rebuild(rows, total):
    """Masked cells: from the other two of each part–part–total triple, then from the column's total row."""
    triples = [('budget_eu', 'budget_national', 'budget_total'), ('received_prefinancing', 'received_claims', 'received_total'), ('paid_eu', 'paid_national', 'paid_total')]

    def by_triple(r):
        for a, b, s in triples:
            known = [r.get(a), r.get(b), r.get(s)]
            if known.count(None) == 1:
                if r.get(s) is None:
                    r[s] = r[a] + r[b]
                elif r.get(a) is None:
                    r[a] = r[s] - r[b]
                else:
                    r[b] = r[s] - r[a]

    for r in rows:
        by_triple(r)
    if total:
        by_triple(total)
        for f in FIELDS:
            missing = [r for r in rows if r.get(f) is None and f in r]
            if len(missing) == 1 and total.get(f) is not None:
                missing[0][f] = total[f] - sum(r[f] for r in rows if r is not missing[0] and r.get(f) is not None)
        for r in rows:
            by_triple(r)
        for f in FIELDS:
            if total.get(f) is None and f in total and all(r.get(f) is not None for r in rows):
                total[f] = sum(r[f] for r in rows)
        by_triple(total)


def read_programmes(key, month):
    """One snapshot of a programme table: {(programme, fund): {field: Decimal}}, checked against its total row."""
    period = '2014-2020' if key == 'p1420' else '2021-2027'
    with open(os.path.join(CACHE, 'mof', key, f'{month}.json'), encoding='utf-8') as f:
        data = json.load(f)['data']
    cols = programme_columns(data[0])
    rows, total, last_programme = [], None, None
    for raw in data[1:]:
        fund = re.sub(r'\s+', '', cell(raw, 0)).replace('"', '')
        name = cell(raw, 1)
        values = {f: amount(cell(raw, i)) for f, i in cols.items()}
        if not any(cell(raw, i) for i in cols.values()):
            continue
        # The total row: no programme, "Общо:" in the currency column or nothing at all.
        if not name and (cell(raw, 2) in ('Общо:', '') and not fund):
            total = values
            continue
        prog = programme_key(period, name) if name else last_programme
        if not prog:
            fail(f'{key} {month}: unknown programme {name!r}')
        if not fund and prog == 'fead-14':
            fund = 'ФЕПН'
        if fund not in FUNDS:
            fail(f'{key} {month}: unknown fund {fund!r} for {name!r}')
        last_programme = prog
        rows.append({'programme': prog, 'fund': fund, 'name': name or None, **values})
    rebuild(rows, total)
    keys = [(r['programme'], r['fund']) for r in rows]
    if len(set(keys)) != len(keys):
        fail(f'{key} {month}: a programme and fund appear twice')
    if total:
        for f in cols:
            if total.get(f) is None or any(r.get(f) is None for r in rows):
                continue
            diff = abs(sum(r[f] for r in rows) - total[f])
            if diff > 2:
                fail(f'{key} {month}: {f} rows add up to {sum(r[f] for r in rows)}, the total row says {total[f]}')
    for r in rows:
        for f in cols:
            if r.get(f) is None:
                fail(f'{key} {month}: {r["programme"]} {r["fund"]} {f} is masked and cannot be rebuilt')
    return {(r['programme'], r['fund']): r for r in rows}, total


def rrp_key(r):
    """An investment row compared across months: code, responsible body and name (К4.И1 has two rows)."""
    return (re.sub(r'\s+', '', r['code'].replace('ИЗ', 'И3')), re.sub(r'\s+', ' ', r['body']).strip(), re.sub(r'\W+', '', (r['name'] or '').lower())[:40])


def read_rrp(month):
    """One snapshot of the Recovery Plan table: one row per investment (and responsible body), and the plan's total row."""
    with open(os.path.join(CACHE, 'mof', 'rrp', f'{month}.json'), encoding='utf-8') as f:
        data = json.load(f)['data']
    rows, total = [], None
    if data[0][0] == 'Инвестиция':
        # The layout of 2023: "К1.И1 МОН" (code and body in one cell), no name.
        for raw in data[1:]:
            label = cell(raw, 0)
            values = [amount(cell(raw, i)) for i in range(2, 9)]
            if not label:
                total = dict(zip(['budget_eu', 'budget_national', 'budget_total', 'received', 'paid_eu', 'paid_national', 'paid_total'], values))
                continue
            code, _, body = label.partition(' ')
            rows.append({'code': code, 'name': None, 'body': body, **dict(zip(['budget_eu', 'budget_national', 'budget_total', 'received', 'paid_eu', 'paid_national', 'paid_total'], values))})
    else:
        for raw in data[2:]:
            code = cell(raw, 1)
            if not code or code.startswith('*'):
                continue
            values = dict(zip(['budget_eu', 'budget_national', 'budget_total', 'received', 'paid_eu', 'paid_national', 'paid_total'], [amount(cell(raw, i)) for i in range(5, 12)]))
            if code.startswith('ОБЩО'):
                total = values
                continue
            rows.append({'code': code, 'name': cell(raw, 2), 'body': cell(raw, 3), **values})
    for r in rows:
        for a, b, s in [('budget_eu', 'budget_national', 'budget_total'), ('paid_eu', 'paid_national', 'paid_total')]:
            if None in (r[a], r[b], r[s]):
                if [r[a], r[b], r[s]].count(None) == 1:
                    r[s] = r[s] if r[s] is not None else r[a] + r[b]
                    r[a] = r[a] if r[a] is not None else r[s] - r[b]
                    r[b] = r[b] if r[b] is not None else r[s] - r[a]
                else:
                    fail(f'rrp {month}: {r["code"]} {a}/{b}/{s} cannot be rebuilt')
    for f in ['budget_eu', 'budget_national', 'budget_total', 'paid_eu', 'paid_national', 'paid_total']:
        s = sum(r[f] for r in rows)
        if total and total.get(f) is not None and abs(s - total[f]) > 2:
            fail(f'rrp {month}: {f} rows add up to {s}, the total row says {total[f]}')
    return rows, total


def write_csv(name, header, rows):
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name), 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(header)
        w.writerows(rows)
    print(f'  {name}: {len(rows)} rows')


def money(d):
    return '' if d is None else f'{d.quantize(Decimal("0.01"))}'


def extract_programmes():
    """programmes.csv (the latest month, every column) and programmes-paid.csv (paid to date at each year end)."""
    latest_rows, by_year = [], []
    for key, period in (('p1420', '2014-2020'), ('p2127', '2021-2027')):
        months = sorted(m for m in mof_resources(key) if os.path.exists(os.path.join(CACHE, 'mof', key, f'{m}.json')))
        latest = months[-1]
        snapshots = {m: read_programmes(key, m)[0] for m in months}
        names = {k: n for k, _, n, _ in PROGRAMMES[period]}
        for (prog, fund), r in snapshots[latest].items():
            latest_rows.append([period, prog, fund, FUNDS[fund], names[prog], r['name'], *[money(r.get(f)) for f in FIELDS], f'{latest}-{monthrange(latest)}'])
            for m in months:
                if m.endswith('-12') or m == latest:
                    s = snapshots[m].get((prog, fund))
                    by_year.append([period, prog, fund, f'{m}-{monthrange(m)}', money(s['paid_total']) if s else ''])
        # Every snapshot lists the same programmes and funds.
        for m, s in snapshots.items():
            if set(s) != set(snapshots[latest]):
                fail(f'{key} {m}: programmes differ from {latest}: {set(s) ^ set(snapshots[latest])}')
    write_csv('programmes.csv', ['period', 'programme', 'fund', 'fund_en', 'programme_bg', 'printed_name', *[f'{f}_EUR' for f in FIELDS], 'as_of'], latest_rows)
    write_csv('programmes-paid.csv', ['period', 'programme', 'fund', 'as_of', 'paid_total_EUR'], by_year)


def monthrange(month):
    import calendar
    y, m = map(int, month.split('-'))
    return f'{calendar.monthrange(y, m)[1]:02d}'


def extract_rrp():
    """rrp-investments.csv (the latest month) and rrp-paid.csv (paid to date at each year end, matched on code and body)."""
    months = sorted(m for m in mof_resources('rrp') if os.path.exists(os.path.join(CACHE, 'mof', 'rrp', f'{m}.json')))
    latest = months[-1]
    rows, total = read_rrp(latest)
    keys = [rrp_key(r) for r in rows]
    if len(set(keys)) != len(keys):
        fail('rrp: an investment and body appear twice')
    out = [[r['code'], r['name'], r['body'], *[money(r[f]) for f in ['budget_eu', 'budget_national', 'budget_total', 'paid_eu', 'paid_national', 'paid_total']], f'{latest}-{monthrange(latest)}'] for r in rows]
    write_csv('rrp-investments.csv', ['code', 'name', 'body', 'budget_eu_EUR', 'budget_national_EUR', 'budget_total_EUR', 'paid_eu_EUR', 'paid_national_EUR', 'paid_total_EUR', 'as_of'], out)
    paid = []
    for m in months:
        if not (m.endswith('-12') or m == latest) or m < '2024-12':
            continue
        earlier = read_rrp(m)[0]
        snap = {rrp_key(r): r for r in earlier}
        # A row whose responsible body was renamed ("БАН СНД" → "БАН СНД/КП") matches on code and name alone.
        by_name = {}
        for r in earlier:
            by_name.setdefault((rrp_key(r)[0], rrp_key(r)[2]), []).append(r)
        for r, k in zip(rows, keys):
            s = snap.get(k)
            if s is None and len(by_name.get((k[0], k[2]), [])) == 1:
                s = by_name[(k[0], k[2])][0]
            paid.append([r['code'], r['body'], f'{m}-{monthrange(m)}', money(s['paid_total']) if s else ''])
    write_csv('rrp-paid.csv', ['code', 'body', 'as_of', 'paid_total_EUR'], paid)
    received = total.get('received') if total else None
    with open(os.path.join(OUT, 'rrp-totals.csv'), 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['as_of', 'budget_eu_EUR', 'budget_national_EUR', 'budget_total_EUR', 'received_from_ec_EUR', 'paid_eu_EUR', 'paid_national_EUR', 'paid_total_EUR'])
        for m in months:
            if m.endswith('-12') or m in months[-2:]:
                _, t = read_rrp(m)
                w.writerow([f'{m}-{monthrange(m)}', *[money(t.get(k)) for k in ['budget_eu', 'budget_national', 'budget_total', 'received', 'paid_eu', 'paid_national', 'paid_total']]])
    print(f'  rrp: {len(rows)} investments at {latest}, received from the EC {received}')


# ---------- ИСУН: the projects ----------

REGISTER = os.path.join(ROOT, 'data', 'sources', 'places', 'municipalities.csv')
# ИСУН spells two provinces and one municipality differently from the State Budget Act.
PROVINCE_ALIAS = {'софияград': 'софияград', 'софияобласт': 'софийска', 'софияокръг': 'софийска'}
MUNICIPALITY_ALIAS = {('софияград', 'столична'): 'столичнаобщина', ('добрич', 'добричград'): 'добрич'}
# A personal identity number typed into a free-text field (see maskIds in scripts/lib/sebra.ts).
PERSONAL_ID = re.compile(r'((?:ЕГН|ЛНЧ|EGN)[^\d]{0,12}?)\d{10}(?!\d)', re.I)


def norm(name):
    """A place name compared across sources: no quotes, spaces, hyphens or case."""
    return re.sub(r'[\s„“"”\'-]', '', name).lower()


def register_index():
    with open(REGISTER, encoding='utf-8') as f:
        rows = list(csv.DictReader(f))
    return {(norm(r['province']), norm(r['municipality'])): r['ebk_code'] for r in rows}


def place_parts(text):
    """"България, Северна и югоизточна България (BG3), Северозападен (BG31), Плевен (BG314), Левски, гр.Левски" →
    country, NUTS 1, NUTS 2, province (NUTS 3), municipality, settlement (as many as given), without the NUTS codes."""
    return [re.sub(r'\s*\((?:BG|bg)[0-9A-Za-z]*\)\s*$', '', p.strip()) for p in text.split(',')]


def short_place(parts, settlement=True):
    """A place as the list shows it: province, municipality and settlement; a region or "България" when that is all."""
    if len(parts) >= 4:
        return ', '.join(parts[3:] if settlement else parts[3:5])
    return parts[-1]


def municipality_code(parts, index):
    if len(parts) < 5:
        return None
    province = PROVINCE_ALIAS.get(norm(parts[3]), norm(parts[3]))
    municipality = MUNICIPALITY_ALIAS.get((province, norm(parts[4])), norm(parts[4]))
    code = index.get((province, municipality))
    if not code:
        fail(f'unknown place {parts[3]} / {parts[4]}')
    return code


def mask(text):
    """Whitespace collapsed; a personal identity number typed into the text is masked."""
    text = re.sub(r'\s+', ' ', text or '').strip()
    before = None
    while before != text:
        before = text
        text = PERSONAL_ID.sub(lambda m: m.group(1) + '*' * 10, text)
    return text


def read_isun(programme):
    with gzip.open(os.path.join(CACHE, 'isun', f'{programme}.json.gz'), 'rt', encoding='utf-8') as f:
        return json.load(f)


def extract_projects():
    """projects.csv.gz (one row per project) and isun-programmes.csv."""
    index = register_index()
    with open(os.path.join(CACHE, 'isun', 'criteria.json'), encoding='utf-8') as f:
        criteria = {p['id']: p for p in json.load(f)['programmes']}
    projects, beneficiaries, numbered, programmes = [], set(), set(), []
    kinds = Counter()
    # Given names: those learnt from the farm subsidies (scripts/extract/cap.py) and ИСУН's own natural persons, whom it
    # shows by first name only.
    downloaded = [p for p in ISUN_PROGRAMMES if os.path.exists(os.path.join(CACHE, 'isun', f'{p}.json.gz'))]
    first = count_given_names(e.get('entityName') for p in downloaded for e in read_isun(p)['entities'] if not (e.get('entityUin') or '').strip())
    use_given_names(read_given_names() + first)
    for programme in ISUN_PROGRAMMES:
        if not os.path.exists(os.path.join(CACHE, 'isun', f'{programme}.json.gz')):
            # A refresh cut short by ИСУН's refusals must not publish fewer projects.
            fail(f'ИСУН programme {programme} is not downloaded: run with --download first')
        data = read_isun(programme)
        entities = {e['entityId']: e for e in data['entities']}
        if len(data['projects']) != data['totalProjects']:
            fail(f'{programme}: {len(data["projects"])} projects, the file says {data["totalProjects"]}')
        for p in data['projects']:
            e = entities.get(p['projectBeneficiary']['entityId'])
            if not e:
                fail(f'{p["id"]}: no beneficiary')
            uin = (e.get('entityUin') or '').strip()
            name = mask(e.get('entityName'))
            # Legal entities have a 9-digit ЕИК (13 for a branch); natural persons have none, and ИСУН shows only their first
            # name. Some natural persons do have a number (registered farmers, "ЗП …"): a name that is a person's is one too.
            if not re.fullmatch(r'\d{9}|\d{13}', uin):
                kind = 'person'
            else:
                kind = 'sole-trader' if sole_trader(name) else 'person' if personal(name) else 'legal'
                if kind == 'person':
                    numbered.add(uin)
            kinds[kind] += 1
            places = [pl.get('municipality') or '' for pl in (p.get('placeOfExecution') or [])]
            codes = {municipality_code(place_parts(pl), index) for pl in places}
            code = next(iter(codes)) if len(codes) == 1 and None not in codes else ''
            # Where a natural person or sole trader is the beneficiary, the project's name (which often names them) and
            # the settlement are left out; the municipality stays.
            shown = kind == 'legal'
            place = ' | '.join(dict.fromkeys(short_place(place_parts(pl), shown) for pl in places))
            paid = [a.get('value') for a in (p.get('actuallyPaidAmounts') or []) if a.get('value') is not None]
            if len(paid) > 1:
                fail(f'{p["id"]}: {len(paid)} paid amounts')
            projects.append([
                p['id'], programme, (p.get('sourceofFunding') or '').replace(' ', ''), mask(p['name']) if shown else '',
                uin if shown else '', name if shown else '', kind, (p.get('initialDate') or '')[:10], (p.get('endDate') or '')[:10],
                p.get('status') or '', money(Decimal(str(p['totalValue']))) if p.get('totalValue') is not None else '',
                money(Decimal(str(paid[0]))) if paid else '', code, place,
            ])
            if shown:
                beneficiaries.add(uin)
        info = criteria[programme]
        programmes.append([programme, info['programmePeriodId'], info['name'], data['totalProjects'], data['generatedAt'][:10]])
    codes = [r[0] for r in projects]
    if len(set(codes)) != len(codes):
        fail(f'{len(codes) - len(set(codes))} project codes appear twice')
    for row in projects:
        for text in (row[3], row[5], row[13]):
            if PERSONAL_ID.search(text):
                fail(f'{row[0]}: an unmasked personal identity number')
    os.makedirs(OUT, exist_ok=True)
    with gzip.open(os.path.join(OUT, 'projects.csv.gz'), 'wt', encoding='utf-8', newline='') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['code', 'programme', 'fund', 'name', 'beneficiary', 'beneficiary_name', 'beneficiary_kind', 'start', 'end', 'status', 'value_EUR', 'paid_EUR', 'ebk_code', 'place'])
        w.writerows(sorted(projects))
    stale = os.path.join(OUT, 'beneficiaries.csv.gz')
    if os.path.exists(stale):
        os.remove(stale)
    write_csv('isun-programmes.csv', ['programme', 'period', 'name', 'projects', 'generated'], programmes)
    print(f'  projects.csv.gz: {len(projects)} projects ({dict(kinds)}) of {len(beneficiaries)} legal entities;'
          f' {len(numbered)} beneficiaries with a number are natural persons by their name')


if __name__ == '__main__':
    if '--download' in sys.argv:
        download_mof()
        download_isun()
    else:
        extract_programmes()
        extract_rrp()
        extract_projects()
