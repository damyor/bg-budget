#!/usr/bin/env python3
"""Farm subsidies (CAP): what the State Fund Agriculture (ДФ „Земеделие“) paid each beneficiary, by financial year.

  python3 scripts/extract/cap.py --download   # fetch the sources into data/cache/cap/ (polite, cached)
  python3 scripts/extract/cap.py              # extract data/sources/cap/ from the cache

Sources: data.egov.bg organisation 56, one CSV per financial year 2015–2017 and 2021–2023 (2020 has no data), and
the fund's register at seu.dfz.bg (FY2024–2025): its search form is submitted for one province and year at a time
and the report exported as CSV (no challenge; the form's own checksums are sent back as the page gives them).

Writes data/sources/cap/ (amounts in leva, as published):
  cap-measures.csv    financial year × measure: EAGF, rural development, national aid, public storage, recipients
  cap-places.csv      financial year × province (× municipality from 2024) × kind of recipient: count and amounts
  cap-recipients.csv  the legal entities that received €25,000 or more in a financial year, by name

Natural persons (no ЕИК until 2023, a surname from 2024) and sole traders ("ЕТ …") are never written by name: they
are only counted and summed in cap-places.csv. Checks, stopping on any failure: the fund columns add up to each
row's total (old files); recipients and measures add up to the same year total; a beneficiary's rows add up to its
"ОБЩО" row (register; exact repeats of a row are dropped when that makes them add up, and at most 20 others are
reported); every municipality matches the register. See data/sources/cap/README.md.
"""

import csv
import gzip
import io
import json
import os
import re
import sys
import time
from collections import Counter
from datetime import date
from decimal import Decimal

import requests

from persons import count_given_names, personal, sole_trader, use_given_names, write_given_names

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
CACHE = os.path.join(ROOT, 'data', 'cache', 'cap')
OUT = os.path.join(ROOT, 'data', 'sources', 'cap')
TODAY = date.today().isoformat()

EGOV = 'https://data.egov.bg/api/'
# data.egov.bg, organisation 56 (Държавен фонд „Земеделие“): one CSV resource per financial year.
EGOV_YEARS = {
    2015: 'af68bcf4-872e-45ad-9cfb-9bad448283b5',
    2016: 'f86ef30e-2dc5-4142-a082-28f402bd3d4a',
    2017: '02a21ae5-4fec-4f4c-abc4-400adf348e9e',
    2020: 'bc8d117e-c4df-4d30-acb4-423b6362dd67',
    2021: '75d24a08-969f-481a-b18f-458075535a8c',
    2022: '6143ad6c-5339-42fd-9e16-813267496980',
    2023: 'd1031bc1-7cdf-4a27-8716-899a4877ad76',
}
# The fund's public register (Oracle APEX, page 8110), financial years 2024 and 2025: one CSV export per province.
APEX = 'https://seu.dfz.bg/seu/'
APEX_YEARS = (2024, 2025)
BROWSER = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'bg,en;q=0.9',
}
PAUSE = 4


def note(file, url, what):
    path = os.path.join(CACHE, 'MANIFEST.md')
    head = '' if os.path.exists(path) else '# Farm subsidies (cache)\n\n| File | URL | What | Retrieved |\n| --- | --- | --- | --- |\n'
    with open(path, 'a', encoding='utf-8') as f:
        f.write(f'{head}| {file} | {url} | {what} | {TODAY} |\n')


def download_egov():
    for year, uri in EGOV_YEARS.items():
        path = os.path.join(CACHE, 'egov', f'fy{year}.json.gz')
        if os.path.exists(path):
            continue
        os.makedirs(os.path.dirname(path), exist_ok=True)
        data = None
        for attempt in range(1, 4):
            try:
                r = requests.post(EGOV + 'getResourceData', json={'resource_uri': uri}, timeout=1800)
                if r.status_code == 429 or r.status_code >= 500:
                    raise RuntimeError(f'HTTP {r.status_code}')
                r.raise_for_status()
                data = r.json()
                break
            except Exception as e:  # noqa: BLE001 — retried, then raised
                if attempt == 3:
                    raise
                print(f'  FY{year}: {e}; retrying in {60 * attempt} s')
                time.sleep(60 * attempt)
        if not isinstance(data.get('data'), list):
            # The portal has the resource but no data behind it (users reported this for 2020–2022 in 2026).
            print(f'  FY{year}: the portal returns no data ({str(data)[:100]}) — skipped')
            note(f'egov/fy{year}.json.gz', f'{EGOV}getResourceData {{"resource_uri":"{uri}"}}', f'FY{year}: no data returned ({str(data)[:60]})')
            continue
        with gzip.open(path, 'wt', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False)
        note(f'egov/fy{year}.json.gz', f'{EGOV}getResourceData {{"resource_uri":"{uri}"}}', f'FY{year}, {len(data["data"]) - 1} rows')
        print(f'  FY{year}: {len(data["data"]) - 1} rows')
        time.sleep(10)


def apex_csv(year, province):
    """One province's rows for one financial year: open the page, submit the search form, export the report as CSV."""
    s = requests.Session()
    s.headers.update(BROWSER)
    r = s.get(APEX + 'f?p=727:8110', timeout=120)
    r.raise_for_status()
    page = r.text

    def field(pattern):
        m = re.search(pattern, page)
        if not m:
            raise RuntimeError(f'APEX page: no {pattern}')
        return m.group(1)

    items = [
        {'n': 'P8110_FORYEAR', 'v': str(year)},
        {'n': 'P8110_OBLAST', 'v': province},
        {'n': 'P8110_OBSHTINA', 'v': ''},
        {'n': 'P8110_PCODE', 'v': ''},
        {'n': 'P8110_BENEFICIENT_NAME', 'v': ''},
        {'n': 'P8110_AMOUNT_FTYPE', 'v': 'GT'},
        {'n': 'P8110_AMOUNT_FILTER', 'v': ''},
        {'n': 'P8110_AMOUNT_FUND', 'v': 'TOTAL'},
        {'n': 'P8110_ADRES_DETAILS', 'v': '', 'ck': field(r'data-for="P8110_ADRES_DETAILS" value="([^"]*)"')},
    ]
    form = {
        'p_flow_id': '727',
        'p_flow_step_id': '8110',
        'p_instance': field(r'name="p_instance" value="(\d+)"'),
        'p_debug': '',
        'p_request': 'GO',
        'p_reload_on_submit': 'S',
        'p_page_submission_id': field(r'name="p_page_submission_id" value="(\d+)"'),
        'p_json': json.dumps({'salt': field(r'value="(\d+)" id="pSalt"'), 'pageItems': {'itemsToSubmit': items, 'protected': field(r'id="pPageItemsProtected" value="([^"]*)"'), 'rowVersion': ''}}, ensure_ascii=False),
    }
    time.sleep(PAUSE)
    r = s.post(APEX + 'wwv_flow.accept', data=form, timeout=300, headers={'Referer': r.url, 'Origin': 'https://seu.dfz.bg'})
    r.raise_for_status()
    target = r.json()['redirectURL']
    time.sleep(PAUSE)
    r = s.get(APEX + target, timeout=600)
    r.raise_for_status()
    session = re.search(r'name="p_instance" value="(\d+)"', r.text).group(1)
    time.sleep(PAUSE)
    r = s.get(f'{APEX}f?p=727:8110:{session}:CSV::::', timeout=1800)
    r.raise_for_status()
    if not r.headers.get('Content-Type', '').startswith('text/csv'):
        raise RuntimeError(f'FY{year} {province}: no CSV ({r.headers.get("Content-Type")})')
    return r.content


def apex_provinces():
    r = requests.get(APEX + 'f?p=727:8110', headers=BROWSER, timeout=120)
    r.raise_for_status()
    block = re.search(r'<select[^>]*id="P8110_OBLAST"[^>]*>(.*?)</select>', r.text, re.S).group(1)
    import html
    return [html.unescape(v) for v in re.findall(r'<option[^>]*value="([^"]+)"', block)]


def download_apex():
    provinces = apex_provinces()
    if len(provinces) != 28:
        raise RuntimeError(f'APEX: {len(provinces)} provinces')
    for year in APEX_YEARS:
        for province in provinces:
            name = re.sub(r'[^\w]+', '-', province).strip('-')
            path = os.path.join(CACHE, 'apex', str(year), f'{name}.csv.gz')
            if os.path.exists(path):
                continue
            os.makedirs(os.path.dirname(path), exist_ok=True)
            time.sleep(PAUSE)
            for attempt in range(1, 4):
                try:
                    content = apex_csv(year, province)
                    break
                except Exception as e:  # noqa: BLE001 — retried, then raised
                    if attempt == 3:
                        raise
                    print(f'  FY{year} {province}: {e}; retrying in {60 * attempt} s')
                    time.sleep(60 * attempt)
            with gzip.open(path, 'wb') as f:
                f.write(content)
            note(f'apex/{year}/{name}.csv.gz', f'{APEX}f?p=727:8110 (FY {year}, province {province}; CSV export of the report)', f'{len(content) / 1e6:.1f} MB, cp1251')
            print(f'  FY{year} {province}: {len(content) / 1e6:.1f} MB')


# ---------- extraction ----------

REGISTER = os.path.join(ROOT, 'data', 'sources', 'places', 'municipalities.csv')
BGN_PER_EUR = Decimal('1.95583')
# Legal entities that received at least this much (euro) in a financial year are listed by name.
LISTED_FROM_EUR = 25_000
PROVINCES = {'София (столица)': 'София-град', 'София (област)': 'Софийска'}
NATIONAL_AID = re.compile(r'национална помощ|държавна помощ|de minimis|минимална помощ', re.I)


def fail(message):
    raise SystemExit(f'cap.py: {message}')


def norm(name):
    return re.sub(r'[\s„“"”\'-]', '', name).lower()


def register():
    with open(REGISTER, encoding='utf-8') as f:
        rows = list(csv.DictReader(f))
    provinces = {r['province'] for r in rows}
    places = {(norm(r['province']), norm(r['municipality'])): r for r in rows}
    # The register spells three municipalities differently from the State Budget Act.
    places[(norm('София-град'), norm('Столична'))] = places[(norm('София-град'), norm('Столична община'))]
    places[(norm('Добрич'), norm('Добрич-селска'))] = places[(norm('Добрич'), norm('Добричка'))]
    places[(norm('Добрич'), norm('Добрич-град'))] = places[(norm('Добрич'), norm('Добрич'))]
    return provinces, places


def province_of(name, provinces):
    p = PROVINCES.get(name.strip(), name.strip())
    if p not in provinces:
        fail(f'unknown province {name!r}')
    return p


def amount(text):
    text = (text or '').strip()
    return Decimal(0) if text in ('', '-') else Decimal(text)


def blank_totals():
    return {'eagf': Decimal(0), 'rural': Decimal(0), 'national': Decimal(0), 'storage': Decimal(0), 'total': Decimal(0)}


class Year:
    """What one financial year's register says, summed: by beneficiary, by measure and by place."""

    def __init__(self, fy):
        self.fy = fy
        self.recipients = {}   # key → {kind, name, eik, province, municipality, ebk, totals, measures}
        self.measures = {}     # (code, measure) → {kind sums, recipients set}

    def add(self, key, kind, name, eik, province, ebk, municipality, measure_code, measure, parts):
        r = self.recipients.get(key)
        if r is None:
            r = self.recipients[key] = {'kind': kind, 'name': name, 'eik': eik, 'province': province, 'ebk': ebk, 'municipality': municipality, 'totals': blank_totals()}
        for k, v in parts.items():
            r['totals'][k] += v
        r['totals']['total'] += sum(parts.values())
        m = self.measures.setdefault((measure_code, measure), {'totals': blank_totals(), 'recipients': set()})
        for k, v in parts.items():
            m['totals'][k] += v
        m['totals']['total'] += sum(parts.values())
        m['recipients'].add(key)


def read_egov(fy, provinces):
    """data.egov.bg (FY2015–2023): one row per beneficiary and measure; legal entities with their ЕИК, natural persons by name only."""
    with gzip.open(os.path.join(CACHE, 'egov', f'fy{fy}.json.gz'), 'rt', encoding='utf-8') as f:
        data = json.load(f)['data']
    header = data[0]
    expected = ['', 'Финансова година', 'ЕИК', 'Бенефициент', 'Област', 'ЕФГЗ-ДП', 'ЕФГЗ', 'ЕЗФРСР-НБ', 'Общо', 'Публично складиране', 'Описание', 'Мярка']
    if header != expected:
        fail(f'FY{fy}: unexpected columns {header}')
    year = Year(fy)
    printed = Decimal(0)
    for r in data[1:]:
        if r[1] != str(fy):
            fail(f'FY{fy}: a row of financial year {r[1]}')
        eik = (r[2] or '').strip()
        name = re.sub(r'\s+', ' ', r[3] or '').strip()
        province = province_of(r[4], provinces)
        kind = ('sole-trader' if sole_trader(name) else 'person' if personal(name) else 'legal') if re.fullmatch(r'\d{9}|\d{13}', eik) else 'person'
        if eik and not re.fullmatch(r'\d{9}|\d{13}', eik):
            fail(f'FY{fy}: unexpected ЕИК {eik!r}')
        # Natural persons have no ЕИК: one person is a name in a province (two namesakes in a province count once).
        key = eik if eik else f'{name}|{province}'
        # "ЕЗФРСР-НБ" holds rural development with its national co-financing, and also the transitional national aid
        # (ПНДТ, ПНДЖ …) and other national aid, which are national money alone.
        aid = NATIONAL_AID.search(r[10] or '')
        parts = {'eagf': amount(r[5]) + amount(r[6]), 'rural': Decimal(0) if aid else amount(r[7]), 'storage': amount(r[9]), 'national': amount(r[7]) if aid else Decimal(0)}
        if abs(sum(parts.values()) - amount(r[8])) > Decimal('0.02'):
            fail(f'FY{fy}: {name}: parts {sum(parts.values())} ≠ total {r[8]}')
        printed += amount(r[8])
        measure = re.sub(r'\s+', ' ', r[10]).strip()
        year.add(key, kind, name if kind == 'legal' else None, eik if kind == 'legal' else '', province, '', '', '', measure, parts)
        # How much of the measure's EAGF money is direct payments (ЕФГЗ-ДП), to tell them from market measures.
        m = year.measures[('', measure)]
        m['direct'] = m.get('direct', Decimal(0)) + amount(r[5])
    return year, printed


def read_apex(fy, provinces, places):
    """The fund's register (FY2024–2025), one CSV per province: a beneficiary's "ОБЩО" row, then a row per intervention.

    The rows of a beneficiary should add up to its "ОБЩО" row in each fund. Where they do not, rows repeated
    exactly are dropped if that makes them add up (an artefact of the export); the few beneficiaries whose rows
    still differ keep their rows (the payments) and are reported in `mismatches`.
    """
    year = Year(fy)
    folder = os.path.join(CACHE, 'apex', str(fy))
    files = sorted(os.listdir(folder))
    if len(files) != 28:
        fail(f'FY{fy}: {len(files)} province files, not 28')
    unmatched = Counter()
    year.mismatches = []
    year.duplicates = 0
    printed = Decimal(0)
    serial = 0
    funds = ((10, 11), (12, 13), (14, 15))

    def adds_up(total, details):
        return all(abs(sum(amount(d[c]) for d in details) - amount(total[c_total])) <= Decimal('0.05') for c, c_total in funds)

    for file in files:
        rows = list(csv.reader(io.StringIO(gzip.open(os.path.join(folder, file)).read().decode('cp1251')), delimiter=';'))
        if rows[0][:7] != ['Име или код на бенефициент', 'Фамилно име на бенефициент', 'Група', 'Област', 'Община', 'Код', 'Интервенция']:
            fail(f'FY{fy} {file}: unexpected columns {rows[0]}')
        blocks = []
        for r in rows[1:]:
            if r[6] == 'ОБЩО':
                blocks.append((r, []))
            elif not blocks:
                fail(f'FY{fy} {file}: a row before any "ОБЩО" row')
            else:
                blocks[-1][1].append(r)
        for total, details in blocks:
            printed += amount(total[17])
            if not adds_up(total, details):
                unique = list({tuple(d[5:18]): d for d in details}.values())
                if adds_up(total, unique):
                    year.duplicates += len(details) - len(unique)
                else:
                    year.mismatches.append((file, total[0], [float(sum(amount(d[c]) for d in unique) - amount(total[ct])) for c, ct in funds]))
                details = unique
            serial += 1
            name = re.sub(r'\s+', ' ', total[0]).strip()
            person = total[1].strip() not in ('-', '')
            kind = 'person' if person else 'sole-trader' if sole_trader(name) else 'person' if personal(name) else 'legal'
            province = province_of(total[3], provinces)
            place = places.get((norm(province), norm(total[4])))
            if not place:
                unmatched[(province, total[4])] += 1
                continue
            for r in details:
                eagf, eafrd, nb = amount(r[10]), amount(r[12]), amount(r[14])
                code = r[5].strip()
                # The national budget's money is co-financing where the intervention also has EAFRD money (the
                # rural-development interventions, codes V and VI), otherwise national aid.
                rural = code.startswith(('V.', 'VI.')) or eafrd != 0
                parts = {'eagf': eagf, 'rural': eafrd + (nb if rural else 0), 'national': Decimal(0) if rural else nb, 'storage': Decimal(0)}
                year.add(str(serial), kind, name if kind == 'legal' else None, '', province, place['ebk_code'], place['municipality'], '' if code == '-' else code, re.sub(r'\s+', ' ', r[6]).strip(), parts)
    if unmatched:
        fail(f'FY{fy}: municipalities not in the register: {unmatched.most_common(10)}')
    if len(year.mismatches) > 20:
        fail(f'FY{fy}: {len(year.mismatches)} beneficiaries whose rows do not add up')
    return year, printed


def measure_kind(code, measure, sums, direct):
    """direct payments (EAGF), market measures (EAGF), rural development (EAFRD with national co-financing), national aid."""
    if sums['national'] > max(sums['eagf'], sums['rural']):
        return 'national'
    if sums['rural'] > sums['eagf']:
        return 'rural'
    if sums['storage'] > 0 or re.search(r'училищ|лоз|вин|пчел|плодове и зеленчуци|складиране|организации на производители|промоци', measure, re.I):
        return 'market'
    if direct is not None and direct < sums['eagf'] / 2:
        return 'market'
    return 'direct'


def bgn(d):
    return f'{d.quantize(Decimal("0.01"))}'


def apex_rows(fy):
    folder = os.path.join(CACHE, 'apex', str(fy))
    for file in sorted(os.listdir(folder)):
        yield file, list(csv.reader(io.StringIO(gzip.open(os.path.join(folder, file)).read().decode('cp1251')), delimiter=';'))


def extract():
    provinces, places = register()
    # The given names to look for in other names: the register's natural persons give their first names separately,
    # the old files' natural persons (no ЕИК) their full names. Kept in data/sources/places/given-names.csv for
    # scripts/extract/eu_funds.py too.
    def first_names():
        for fy in APEX_YEARS:
            for _, rows in apex_rows(fy):
                yield from (r[0] for r in rows[1:] if len(r) > 6 and r[6] == 'ОБЩО' and r[1].strip() not in ('-', ''))
        for fy in EGOV_YEARS:
            path = os.path.join(CACHE, 'egov', f'fy{fy}.json.gz')
            if os.path.exists(path):
                with gzip.open(path, 'rt', encoding='utf-8') as f:
                    yield from ((r[3] or '').split(' ')[0] for r in json.load(f)['data'][1:] if not (r[2] or '').strip())

    counts = count_given_names(first_names())
    write_given_names(Counter({n: c for n, c in counts.items() if c >= 2}))
    use_given_names(counts)
    print(f'  {sum(1 for c in counts.values() if c >= 2)} given names learnt')
    years = []
    for fy in sorted(EGOV_YEARS):
        if os.path.exists(os.path.join(CACHE, 'egov', f'fy{fy}.json.gz')):
            years.append(read_egov(fy, provinces))
    for fy in APEX_YEARS:
        if os.path.isdir(os.path.join(CACHE, 'apex', str(fy))):
            years.append(read_apex(fy, provinces, places))
    measures, place_rows, recipients = [], [], []
    for year, printed in years:
        total = sum(r['totals']['total'] for r in year.recipients.values())
        by_measure = sum(m['totals']['total'] for m in year.measures.values())
        if abs(total - by_measure) > Decimal('1'):
            fail(f'FY{year.fy}: beneficiaries add up to {total}, measures to {by_measure}')
        # The old files: every row counted. The register: the payments, against its "ОБЩО" rows (see read_apex).
        mismatches = getattr(year, 'mismatches', [])
        if abs(total - printed) > Decimal('1'):
            if not mismatches:
                fail(f'FY{year.fy}: beneficiaries add up to {total}, the printed totals to {printed}')
            print(f'  FY{year.fy}: payments {total} vs "ОБЩО" rows {printed}; {getattr(year, "duplicates", 0)} repeated rows dropped; rows ≠ "ОБЩО" for {mismatches}')
        for (code, measure), m in sorted(year.measures.items(), key=lambda x: -x[1]['totals']['total']):
            s = m['totals']
            kind = measure_kind(code, measure, s, m.get('direct'))
            measures.append([year.fy, code, measure, kind, bgn(s['eagf']), bgn(s['rural']), bgn(s['national']), bgn(s['storage']), bgn(s['total']), len(m['recipients'])])
        by_place = {}
        for r in year.recipients.values():
            p = by_place.setdefault((r['province'], r['municipality'], r['ebk'], r['kind']), {'n': 0, 'totals': blank_totals()})
            p['n'] += 1
            for k, v in r['totals'].items():
                p['totals'][k] += v
            if r['kind'] == 'legal' and r['totals']['total'] >= LISTED_FROM_EUR * BGN_PER_EUR:
                t = r['totals']
                recipients.append([year.fy, r['eik'], r['name'], r['province'], r['municipality'], r['ebk'], bgn(t['eagf']), bgn(t['rural']), bgn(t['national']), bgn(t['storage']), bgn(t['total'])])
        for (province, municipality, ebk, kind), p in sorted(by_place.items()):
            t = p['totals']
            place_rows.append([year.fy, province, municipality, ebk, kind, p['n'], bgn(t['eagf']), bgn(t['rural']), bgn(t['national']), bgn(t['storage']), bgn(t['total'])])
        kinds = Counter(r['kind'] for r in year.recipients.values())
        print(f'  FY{year.fy}: {len(year.recipients)} recipients {dict(kinds)}, {total / 1_000_000:.1f} million leva, {len(year.measures)} measures')
    os.makedirs(OUT, exist_ok=True)
    amounts = ['eagf_BGN', 'rural_BGN', 'national_BGN', 'storage_BGN', 'total_BGN']
    write(os.path.join(OUT, 'cap-measures.csv'), ['fy', 'code', 'measure', 'kind', *amounts, 'recipients'], measures)
    write(os.path.join(OUT, 'cap-places.csv'), ['fy', 'province', 'municipality', 'ebk_code', 'kind', 'recipients', *amounts], place_rows)
    write(os.path.join(OUT, 'cap-recipients.csv'), ['fy', 'eik', 'name', 'province', 'municipality', 'ebk_code', *amounts], sorted(recipients, key=lambda r: (r[0], -Decimal(r[10]))))


def write(path, header, rows):
    with open(path, 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(header)
        w.writerows(rows)
    print(f'  {os.path.basename(path)}: {len(rows)} rows')


if __name__ == '__main__':
    if '--download' in sys.argv:
        os.makedirs(CACHE, exist_ok=True)
        download_egov()
        download_apex()
    else:
        extract()
