#!/usr/bin/env python3
"""Public procurement contracts: who buys what from whom.

  python3 scripts/extract/procurement.py --download   # fetch the sources into data/cache/procurement/ (polite, cached)
  python3 scripts/extract/procurement.py              # extract data/sources/procurement/ from the cache

Sources:
- the Public Procurement Agency (АОП) on data.egov.bg, organisation 502: one CSV of contracts and one of contract
  amendments per year, 2016–2025 (from 2020 one pair from the old register, РОП, and one from the e-procurement
  platform, ЦАИС ЕОП; 2024 and 2025 only from РОП, i.e. the last procedures opened there), and the daily OCDS
  releases of the notices published in ЦАИС ЕОП since 1 January 2026;
- TED, the EU's Tenders Electronic Daily (api.ted.europa.eu v3): the award notices of Bulgarian buyers published in
  2024 and 2025 (contracts above the EU thresholds only), to cover in part the years the agency has not published.

Writes data/sources/procurement/ (see its README). Natural persons and sole traders among suppliers are never
written by name (persons.py, the rules of the EU-funds and farm-subsidy extracts).
"""

import csv
import glob
import gzip
import hashlib
import io
import json
import os
import re
import sys
import time
from collections import Counter, defaultdict
from datetime import date
from decimal import Decimal

import requests

from persons import ORGANISATION, fix_cyrillic, kind_of, read_given_names, sole_trader, use_given_names

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
CACHE = os.path.join(ROOT, 'data', 'cache', 'procurement')
OUT = os.path.join(ROOT, 'data', 'sources', 'procurement')
TODAY = date.today().isoformat()

EGOV = 'https://data.egov.bg/api/'
EGOV_DOWNLOAD = 'https://data.egov.bg/resource/download/{uri}/{fmt}'
AOP_ORG = 502
TED = 'https://api.ted.europa.eu/v3/notices/search'
TED_YEARS = (2024, 2025)
# Result notices: the standard regime, social and other specific services, public transport, and modifications.
TED_TYPES = 'can-standard can-social can-tran can-modif'
TED_FIELDS = [
    'publication-number', 'publication-date', 'notice-type', 'notice-identifier', 'notice-version', 'BT-758-notice', 'BT-140-notice',
    'procedure-type', 'procedure-identifier', 'title-proc', 'contract-nature-main-proc', 'main-classification-proc', 'buyer-name',
    'buyer-identifier', 'organisation-country-buyer', 'winner-name', 'winner-identifier', 'winner-country', 'result-lot-identifier',
    'tender-identifier', 'tender-lot-identifier', 'tender-value', 'tender-value-cur', 'contract-identifier', 'contract-tender-id',
    'contract-conclusion-date', 'BT-161-NoticeResult', 'BT-161-NoticeResult-Currency', 'total-value', 'total-value-cur',
]
PAUSE = 2


def note(file, url, what):
    path = os.path.join(CACHE, 'MANIFEST.md')
    head = '' if os.path.exists(path) else '# Public procurement (cache)\n\n| File | URL | What | Retrieved |\n| --- | --- | --- | --- |\n'
    with open(path, 'a', encoding='utf-8') as f:
        f.write(f'{head}| {file} | {url} | {what} | {TODAY} |\n')


def post(url, body, timeout=600):
    """A POST that is retried on HTTP 429 and server errors, with growing pauses."""
    for attempt in range(1, 6):
        try:
            r = requests.post(url, json=body, timeout=timeout)
            if r.status_code == 429 or r.status_code >= 500:
                raise RuntimeError(f'HTTP {r.status_code}')
            r.raise_for_status()
            return r.json()
        except Exception as e:  # noqa: BLE001 — retried, then raised
            if attempt == 5:
                raise
            print(f'  {e}; retrying in {30 * attempt} s', flush=True)
            time.sleep(30 * attempt)


def fetch_to(url, path, timeout=1200):
    """Downloads a file (the portal builds large CSVs on request, so the wait can be long), gzipped into the cache."""
    for attempt in range(1, 5):
        try:
            with requests.get(url, timeout=timeout, stream=True) as r:
                if r.status_code == 429 or r.status_code >= 500:
                    raise RuntimeError(f'HTTP {r.status_code}')
                r.raise_for_status()
                tmp = path + '.part'
                with gzip.open(tmp, 'wb') as f:
                    for chunk in r.iter_content(1 << 20):
                        f.write(chunk)
                os.replace(tmp, path)
                return
        except Exception as e:  # noqa: BLE001 — retried, then raised
            if attempt == 4:
                raise
            print(f'  {e}; retrying in {60 * attempt} s', flush=True)
            time.sleep(60 * attempt)


# ---------- downloading ----------

def egov_listing():
    """The organisation's datasets and the resources of each (cached once a day)."""
    path = os.path.join(CACHE, 'egov', 'datasets.json')
    if os.path.exists(path) and time.time() - os.path.getmtime(path) < 86400:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    listing = post(EGOV + 'listDatasets', {'criteria': {'org_ids': [AOP_ORG]}, 'records_per_page': 100, 'page_number': 1})
    out = []
    for ds in listing['datasets']:
        res = post(EGOV + 'listResources', {'criteria': {'dataset_uri': ds['uri']}, 'records_per_page': 100, 'page_number': 1})
        ds = {k: v for k, v in ds.items() if k != 'resource'}
        out.append({'dataset': ds, 'resources': res.get('resources', [])})
        time.sleep(1)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    note('egov/datasets.json', f'{EGOV}listDatasets {{"criteria":{{"org_ids":[{AOP_ORG}]}}}} + listResources', f'{len(out)} datasets of organisation {AOP_ORG}')
    return out


YEARLY = re.compile(r'Договори и изменения на договори - (\d{4})(?: \(информация от (РОП|ЦАИС ЕОП)\))?$')
OCDS_DAY = re.compile(r'на (\d\d)[.-](\d\d)[.-](\d{4})')
OCDS_PERIOD = re.compile(r'от (\d\d)-(\d\d)-(\d{4}) до (\d\d)-(\d\d)-(\d{4})')


def yearly_resources(listing):
    """(year, source, kind) → resource, for the yearly contract and amendment CSVs."""
    out = {}
    for entry in listing:
        m = YEARLY.match(entry['dataset']['name'].strip())
        if not m:
            continue
        year, source = int(m.group(1)), {'РОП': 'rop', 'ЦАИС ЕОП': 'eop', None: 'rop'}[m.group(2)]
        for r in entry['resources']:
            name = r['name']
            kind = 'contracts' if name.startswith('Договори, сключени') else 'annexes' if name.startswith('Информация за изменения') else None
            if kind:
                out[(year, source, kind)] = {**r, 'dataset': entry['dataset']}
    return out


def ocds_resources(listing):
    """Label ("2026-09-30" or "2026-01-01_2026-01-14") → resource, for the daily (or fortnightly) OCDS files."""
    out = {}
    for entry in listing:
        if 'OCDS' not in entry['dataset']['name']:
            continue
        for r in entry['resources']:
            p = OCDS_PERIOD.search(r['name'])
            d = OCDS_DAY.search(r['name'])
            label = f'{p.group(3)}-{p.group(2)}-{p.group(1)}_{p.group(6)}-{p.group(5)}-{p.group(4)}' if p else f'{d.group(3)}-{d.group(2)}-{d.group(1)}' if d else None
            if not label:
                raise SystemExit(f'procurement.py: no date in OCDS resource {r["name"]!r}')
            if label in out:
                raise SystemExit(f'procurement.py: two OCDS resources for {label}')
            out[label] = {**r, 'dataset': entry['dataset']}
    return out


def download_egov():
    listing = egov_listing()
    for (year, source, kind), r in sorted(yearly_resources(listing).items()):
        path = os.path.join(CACHE, 'egov', f'{year}-{source}-{kind}.csv.gz')
        if os.path.exists(path):
            continue
        url = EGOV_DOWNLOAD.format(uri=r['uri'], fmt='csv')
        print(f'  {year} {source} {kind} …', flush=True)
        fetch_to(url, path)
        note(f'egov/{os.path.basename(path)}', url, f'{r["dataset"]["name"]}: {r["name"]}')
        time.sleep(PAUSE)
    for label, r in sorted(ocds_resources(listing).items()):
        path = os.path.join(CACHE, 'ocds', f'{label}.json.gz')
        if os.path.exists(path):
            continue
        os.makedirs(os.path.dirname(path), exist_ok=True)
        url = EGOV_DOWNLOAD.format(uri=r['uri'], fmt='json')
        print(f'  OCDS {label} …', flush=True)
        fetch_to(url, path)
        note(f'ocds/{label}.json.gz', url, r['name'])
        time.sleep(PAUSE)


def download_ted():
    os.makedirs(os.path.join(CACHE, 'ted'), exist_ok=True)
    for year in TED_YEARS:
        path = os.path.join(CACHE, 'ted', f'{year}.json.gz')
        if os.path.exists(path):
            continue
        query = f'buyer-country=BGR AND notice-type IN ({TED_TYPES}) AND publication-date>={year}0101 AND publication-date<={year}1231'
        notices, token, total = [], None, None
        while True:
            body = {'query': query, 'fields': TED_FIELDS, 'limit': 250, 'scope': 'ALL', 'paginationMode': 'ITERATION'}
            if token:
                body['iterationNextToken'] = token
            page = post(TED, body, timeout=300)
            total = page.get('totalNoticeCount', total)
            for n in page['notices']:
                n.pop('links', None)
            notices += page['notices']
            token = page.get('iterationNextToken')
            print(f'  TED {year}: {len(notices)} of {total}', flush=True)
            if not token or not page['notices']:
                break
            time.sleep(PAUSE)
        if len(notices) != total:
            raise SystemExit(f'procurement.py: TED {year}: {len(notices)} notices for {total} announced')
        with gzip.open(path, 'wt', encoding='utf-8') as f:
            json.dump({'query': query, 'fields': TED_FIELDS, 'retrieved': TODAY, 'totalNoticeCount': total, 'notices': notices}, f, ensure_ascii=False)
        note(f'ted/{year}.json.gz', f'POST {TED} {{"query": "{query}", "scope": "ALL", "paginationMode": "ITERATION"}}', f'{total} notices')


# ---------- reading ----------

BGN_PER_EUR = Decimal('1.95583')
# A personal identity number typed into a free-text field (see maskIds in scripts/lib/sebra.ts).
PERSONAL_ID = re.compile(r'((?:ЕГН|ЛНЧ|EGN)[^\d]{0,12}?)\d{10}(?!\d)', re.I)
SUBJECT_LENGTH = 150


def fail(message):
    raise SystemExit(f'procurement.py: {message}')


def mask(text):
    """Whitespace collapsed; a personal identity number typed into the text is masked."""
    text = re.sub(r'\s+', ' ', text or '').strip()
    before = None
    while before != text:
        before = text
        text = PERSONAL_ID.sub(lambda m: m.group(1) + '*' * 10, text)
    return text


def unquote(value):
    """ЦАИС ЕОП's files wrap many values in an extra pair of quotes ("\"175405647\"")."""
    v = (value or '').replace('﻿', '').strip()
    while len(v) >= 2 and v[0] == '"' and v[-1] == '"':
        v = v[1:-1].strip()
    return v


def read_table(path):
    """A cached CSV: its header (trimmed, lower case) and rows, as dicts."""
    csv.field_size_limit(10 ** 9)
    with gzip.open(path, 'rt', encoding='utf-8-sig') as f:
        table = list(csv.reader(f))
    header = [re.sub(r'\s+', ' ', h.replace('﻿', '').strip().strip('"').strip()).lower() for h in table[0]]
    return [dict(zip(header, row)) for row in table[1:] if any(c.strip() for c in row)]


def pick(row, *names):
    for n in names:
        if n in row:
            return unquote(row[n])
    return ''


def amount(text):
    """"1 234,56", "1234.56" → Decimal; "" or text → None."""
    v = re.sub(r'[\s ]', '', text or '')
    if re.fullmatch(r'-?\d+,\d+', v):
        v = v.replace(',', '.')
    if not re.fullmatch(r'-?\d+(\.\d+)?', v):
        return None
    return Decimal(v)


def day(text):
    """"25/01/2016" or "2026-09-18T00:00:00Z" → "2016-01-25"."""
    t = (text or '').strip()
    m = re.match(r'(\d\d)[./](\d\d)[./](\d{4})', t)
    if m:
        return f'{m.group(3)}-{m.group(2)}-{m.group(1)}'
    m = re.match(r'(\d{4}-\d\d-\d\d)', t)
    return m.group(1) if m else ''


class Rates:
    """ECB monthly average rates (units of a currency per euro), for amounts in other currencies than leva and euro."""

    def __init__(self):
        with open(os.path.join(CACHE, 'rates', 'ert_bil_eur_m.json'), encoding='utf-8') as f:
            d = json.load(f)
        currencies = d['dimension']['currency']['category']['index']
        times = d['dimension']['time']['category']['index']
        n = len(times)
        self.rates = {}
        for cur, ci in currencies.items():
            for t, ti in times.items():
                v = d['value'].get(str(ci * n + ti))
                if v is not None:
                    self.rates[(cur, t)] = Decimal(str(v))
        self.latest = max(times)
        self.used = Counter()

    def euro(self, value, currency, date):
        if value is None:
            return None
        if currency == 'EUR':
            return value
        if currency == 'BGN':
            return value / BGN_PER_EUR
        month = (date or '')[:7] or self.latest
        rate = self.rates.get((currency, min(month, self.latest)))
        if not rate:
            return None
        self.used[currency] += 1
        return value / rate


def money(value):
    return '' if value is None else f'{value.quantize(Decimal("0.01"))}'


def short_id(text, length=8):
    """A short, stable, URL-safe id (base 36 of a hash; not reversible)."""
    n = int(hashlib.sha1(text.encode('utf-8')).hexdigest()[:13], 16)
    digits = '0123456789abcdefghijklmnopqrstuvwxyz'
    out = ''
    while n:
        n, r = divmod(n, 36)
        out = digits[r] + out
    return out.rjust(length, '0')[-length:]


# ---------- identifiers and parties ----------

def eik_valid(code):
    """The check digit of a 9- or 13-digit ЕИК (BULSTAT)."""
    if not re.fullmatch(r'\d{9}|\d{13}', code):
        return False
    d = [int(c) for c in code]
    r = sum(d[i] * (i + 1) for i in range(8)) % 11
    if r == 10:
        r = sum(d[i] * (i + 3) for i in range(8)) % 11 % 10
    if r != d[8]:
        return False
    if len(code) == 9:
        return True
    r = sum(a * b for a, b in zip(d[8:12], (2, 7, 3, 5))) % 11
    if r == 10:
        r = sum(a * b for a, b in zip(d[8:12], (4, 9, 5, 7))) % 11 % 10
    return r == d[12]


def egn_valid(code):
    """A valid personal identity number (ЕГН): a date of birth and a check digit."""
    if not re.fullmatch(r'\d{10}', code):
        return False
    d = [int(c) for c in code]
    if sum(a * b for a, b in zip(d, (2, 4, 8, 5, 10, 9, 7, 3, 6))) % 11 % 10 != d[9]:
        return False
    month = int(code[2:4]) % 20
    return 1 <= month <= 12 and 1 <= int(code[4:6]) <= 31


# Legal forms and words that mark a foreign company (suppliers without a Bulgarian ЕИК), in Latin or Cyrillic letters and
# with or without dots ("S.A.", "а.с.", "Ges.m.b.H.", "БИ ВИ"), and a country after the name ("Еърбъс Хеликоптерс - Франция").
FOREIGN_FORM = re.compile(
    r'(^|[^A-ZА-Я])(GMBH|GES\.?\s?M\.?\s?B\.?\s?H|AG|KG|SE|S\.?\s?A|S\.?\s?A\.?\s?S|SARL|S\.?\s?R\.?\s?L|S\.?\s?P\.?\s?A|B\.?\s?V|N\.?\s?V|LTD|LIMITED|LLC|INC|CORP'
    r'|CORPORATION|PLC|OY|OYJ|AB|A\.?\s?S|A/S|ASA|APS|KFT|ZRT|S\.?\s?R\.?\s?O|SP\.?\s?Z\s?O\.?\s?O|Z\.?\s?O\.?\s?O|D\.?\s?O\.?\s?O|D\.?\s?D|S\.?\s?L|SAU|SPOL|AD|EAD|OOD|EOOD'
    r'|GROUP|COMPANY|HOLDING|INSTITUT[A-Z]*|UNIVERSIT[A-Z]*|ООО|ОАО|АО|ПАО|ЗАО|ЛИМИТИД|ГМБХ|КОРПОРЕЙШЪН|ИНК|ЛТД|АГ|СА|СРЛ|КЪМПАНИ|ГРУП|ИНЖЕНЕРИНГ'
    r'|ИНТЕРНЕШЪНЪЛ|ИНТЕРНЕШЕНЪЛ|А\.?\s?С|С\.?\s?А|Д\.?\s?Д|Д\.?\s?О\.?\s?О|З\.?\s?О\.?\s?О|БИ\s?ВИ|ЕН\s?ВИ)(?![A-ZА-Я])'
    r'|[-–(]\s*(ФРАНЦИЯ|ГЕРМАНИЯ|ЧЕХИЯ|ПОЛША|ДАНИЯ|ИТАЛИЯ|АВСТРИЯ|БЕЛГИЯ|СЛОВАКИЯ|ШВЕЙЦАРИЯ|ШВЕЦИЯ|ФИНЛАНДИЯ|НИДЕРЛАНДИЯ|ХОЛАНДИЯ|ИСПАНИЯ|ПОРТУГАЛИЯ'
    r'|ГЪРЦИЯ|РУМЪНИЯ|СЪРБИЯ|ТУРЦИЯ|УНГАРИЯ|ВЕЛИКОБРИТАНИЯ|АНГЛИЯ|ИРЛАНДИЯ|САЩ|РУСИЯ|УКРАЙНА|ИЗРАЕЛ|ЯПОНИЯ|КИТАЙ|КОРЕЯ|НОРВЕГИЯ|ХЪРВАТИЯ|СЛОВЕНИЯ'
    r'|ЛЮКСЕМБУРГ|КАНАДА|ЕСТОНИЯ|ЛАТВИЯ|ЛИТВА|МАКЕДОНИЯ|СЕВЕРНА МАКЕДОНИЯ|КИПЪР|МАЛТА)\W*$'
)
WITHHELD = re.compile(r'^(не се публикува|не е въведена информация|не е наличен|неприложимо|нпериложимо|няма|n/?a|-+|0+|\*+)!?$', re.I)


def clean_eik(raw, name):
    """An identifier as published → a 9- or 13-digit ЕИК (with prefixes, spaces and lost leading zeros put right), or the
    raw text when it is not one (foreign registration numbers, "не се публикува" …)."""
    v = re.sub(r'^(ЕИК|EIK|БУЛСТАТ|BULSTAT|UIC|BG)\s*[:№.]?\s*', '', raw.strip(), flags=re.I)
    v = re.sub(r'[xх]$', '', v)
    compact = re.sub(r'[\s.-]', '', v)
    if re.fullmatch(r'\d{9}|\d{13}', compact):
        return compact
    # Leading zeros lost in a spreadsheet: only for a Bulgarian name (a foreign company's number is left as it is).
    if re.fullmatch(r'\d{5,8}', compact) and re.search('[А-Яа-я]', name or ''):
        return compact.zfill(9)
    if re.fullmatch(r'\d{12}', compact) and re.search('[А-Яа-я]', name or ''):
        return compact.zfill(13)
    return v


def latest_spelling(counts):
    """Of spellings counted by (year, spelling): the latest year's most frequent one."""
    return sorted(counts.items(), key=lambda kv: (kv[0][0], kv[1], kv[0][1]), reverse=True)[0][0][1]


PERSONS_KEY = 'persons'
WITHHELD_KEY = 'withheld'


class Parties:
    """Suppliers (and buyers): who they are, under one key across the sources. Legal entities with an ЕИК are keyed by
    it, other legal entities (foreign companies, consortia without a number) by their name; natural persons and sole
    traders are one group and never named (persons.py); a supplier the source does not publish is one group too."""

    def __init__(self):
        self.year = ''        # the year of the file being read (set by the readers)
        self.names = {}       # key → Counter of spellings
        self.latest = {}      # key → Counter of (year, spelling)
        self.kind = {}        # key → legal / foreign / joint / person / withheld
        self.eik = {}         # key → ЕИК or ''
        self.members = {}     # joint key → member keys
        self.stats = Counter()

    def one(self, raw_id, raw_name, country=''):
        """(key, kind) of one supplier."""
        name = mask(unquote(raw_name))
        ident = clean_eik(unquote(raw_id), name)
        upper = fix_cyrillic(name).upper()
        if not name and (not ident or WITHHELD.match(ident)):
            self.stats['withheld'] += 1
            return WITHHELD_KEY, 'withheld'
        if WITHHELD.match(name) or name.lower().startswith('не се публикува'):
            self.stats['withheld'] += 1
            return WITHHELD_KEY, 'withheld'
        kind = kind_of(name)
        if kind:
            self.stats[kind] += 1
            return PERSONS_KEY, kind
        if '*' in ident or egn_valid(ident) and not eik_valid(ident):
            self.stats['person-number'] += 1
            return PERSONS_KEY, 'person'
        if re.fullmatch(r'\d{9}|\d{13}', ident):
            key, kind = ident, 'legal'
            if not eik_valid(ident):
                self.stats['eik-check-digit'] += 1
        elif (ident and not WITHHELD.match(ident) and not re.fullmatch(r'\d{10}', ident) and (country and country != 'BGR' or re.search('[A-Za-z]', ident) or FOREIGN_FORM.search(upper))) \
                or ORGANISATION.search(upper) or FOREIGN_FORM.search(upper):
            # A foreign company (its own registration number, or a foreign legal form), or a Bulgarian organisation
            # without a number (a consortium, "ДЗЗД …"): by name.
            key, kind = 'x' + short_id(re.sub(r'[^0-9A-ZА-Я]+', ' ', upper).strip()), 'legal'
            ident = ''
        else:
            # No number and nothing that marks an organisation: taken for a natural person, as in the EU-funds lists.
            self.stats['person-no-number'] += 1
            return PERSONS_KEY, 'person'
        self.names.setdefault(key, Counter())[name] += 1
        self.latest.setdefault(key, Counter())[(self.year, name)] += 1
        self.kind[key] = kind
        self.eik[key] = ident
        return key, kind

    def supplier(self, ids, names, countries=()):
        """(key, kind) of a contract's supplier; several (a joint contract) become one key of their own."""
        ids, names, countries = list(ids), list(names), list(countries)
        if len(names) <= 1 and len(ids) <= 1:
            return self.one(ids[0] if ids else '', names[0] if names else '', countries[0] if countries else '')
        if len(names) == 1:
            # One name with several numbers (a consortium and its members): the name.
            return self.one(next((i for i in ids if re.fullmatch(r'\d{9}|\d{13}', clean_eik(i, names[0]))), ''), names[0], countries[0] if countries else '')
        parts = [self.one(ids[i] if i < len(ids) and len(ids) == len(names) else '', n, countries[i] if i < len(countries) else '') for i, n in enumerate(names)]
        keys = sorted(set(k for k, _ in parts))
        if len(keys) == 1:
            return parts[0]
        key = 'j' + short_id('|'.join(keys))
        self.members[key] = keys
        self.kind[key] = 'joint'
        self.eik[key] = ''
        self.names.setdefault(key, Counter())[' | '.join(dict.fromkeys(self.display_part(k, kind) for k, kind in parts))] += 1
        self.stats['joint'] += 1
        return key, 'joint'

    def display_part(self, key, kind):
        if key == PERSONS_KEY:
            return 'едноличен търговец' if kind == 'sole-trader' else 'физическо лице'
        if key == WITHHELD_KEY:
            return 'не е публикуван'
        return self.names[key].most_common(1)[0][0]

    def name(self, key):
        """The spelling of the latest year (the most frequent of that year): companies are renamed, and the old register
        added former names ("… /старо наименование …/")."""
        if key in (PERSONS_KEY, WITHHELD_KEY):
            return ''
        if key not in self.latest:
            return self.names[key].most_common(1)[0][0]
        return latest_spelling(self.latest[key])


# ---------- the yearly contract files (АОП, data.egov.bg) ----------

OBJECTS = {'доставки': 'supplies', 'услуги': 'services', 'строителство': 'works', 'конкурс за проект': 'design-contest'}
OCDS_OBJECTS = {'goods': 'supplies', 'services': 'services', 'works': 'works'}


def split_parties(raw_id, raw_name):
    """The suppliers of a row of a yearly file: several are separated by " ||| " (until 2019) or "; " (ЦАИС ЕОП)."""
    ids = [x for x in re.split(r'\s*\|\|\|\s*|\s*;\s*', raw_id or '') if x.strip()]
    names = [x for x in re.split(r'\s*\|\|\|\s*', raw_name or '') if x.strip()]
    if len(names) == 1 and len(ids) > 1:
        names = [x for x in re.split(r'\s*;\s*', raw_name) if x.strip()]
    return ids, names


def contract_number(text):
    return re.sub(r'[\s"„“”\'№]+', '', (text or '').upper())


def read_annexes(rates, files):
    """Amendments by (procurement number, contract number, supplier number): [published, value after, currency]."""
    out = defaultdict(list)
    for path in sorted(glob.glob(os.path.join(CACHE, 'egov', '*-annexes.csv.gz'))):
        year, source = os.path.basename(path).split('-')[:2]
        rows = read_table(path)
        n = 0
        for r in rows:
            unp = pick(r, 'унп', 'уникален номер на поръчката')
            no = contract_number(pick(r, 'договор номер', 'номер на договор'))
            supplier = clean_eik(pick(r, 'еик на изпълнителя'), pick(r, 'изпълнител', 'име на изпълнител'))
            published = day(pick(r, 'публикуван на'))
            after = amount(pick(r, 'стойност след изменението'))
            currency = pick(r, 'валута').upper()
            out[(unp, no, supplier)].append((published, after, currency))
            n += 1
        files.append({'file': f'egov/{os.path.basename(path)}', 'year': year, 'source': source, 'kind': 'annexes', 'rows': len(rows), 'kept': n})
    return out


def read_yearly(parties, rates, files):
    annexes = read_annexes(rates, files)
    matched = set()
    contracts = []
    for path in sorted(glob.glob(os.path.join(CACHE, 'egov', '*-contracts.csv.gz'))):
        year, source = os.path.basename(path).split('-')[:2]
        parties.year = year
        rows = read_table(path)
        sums = Counter()
        kept = 0
        seen = Counter()
        for r in rows:
            doc = pick(r, 'id на документ', 'номер на документ')
            unp = pick(r, 'унп', 'уникален номер на поръчката')
            no_raw = pick(r, 'договор номер', 'номер на договор')
            supplier_raw = pick(r, 'еик на изпълнителя')
            supplier_name = pick(r, 'изпълнител')
            currency = pick(r, 'валута').upper()
            value = amount(pick(r, 'стойност при сключване'))
            signed = day(pick(r, 'договор дата', 'дата на договор'))
            published = day(pick(r, 'публикуван на'))
            if not published.startswith(year):
                fail(f'{path}: a contract published on {published}')
            key, kind = parties.supplier(*split_parties(supplier_raw, supplier_name))
            buyer_raw = pick(r, 'еик на възложителя')
            buyer_ids = [clean_eik(b, 'Б') for b in re.split(r'\s*;\s*', buyer_raw) if b.strip()]
            buyer_names = [b for b in re.split(r'\s*;\s*', pick(r, 'възложител')) if b.strip()]
            vat = pick(r, 'ддс').lower()
            obj = OBJECTS.get(pick(r, 'обект', 'обект на поръчката').lower().strip())
            eu = pick(r, 'eu финансиране').lower()
            offers = pick(r, 'брой оферти')
            subject = pick(r, 'предмет на договора') or pick(r, 'предмет на поръчката')
            # The contract's id: its notice's number in the register and its place among the notice's contracts.
            seen[doc] += 1
            cid = f'{source[0]}{doc}-{seen[doc]}'
            eur = rates.euro(value, currency, signed or published) if currency not in ('', 'НЕ СЕ ПУБЛИКУВА') else None
            if currency and currency != 'НЕ СЕ ПУБЛИКУВА':
                sums[currency] += value or 0
            sums['EUR total'] += eur or 0
            # Amendments of this contract published from its year on.
            amendments = annexes.get((unp, contract_number(no_raw), clean_eik(supplier_raw, supplier_name)), [])
            if amendments:
                matched.add((unp, contract_number(no_raw), clean_eik(supplier_raw, supplier_name)))
            last = max(amendments, default=None)
            after = rates.euro(last[1], last[2] or currency, last[0]) if last and last[1] is not None and last[2] not in ('НЕ СЕ ПУБЛИКУВА',) else None
            contracts.append({
                'id': cid, 'source': source, 'year': year, 'published': published, 'signed': signed,
                'procurement': unp, 'notice': doc, 'contract_no': mask(no_raw)[:60],
                'buyer': buyer_ids[0] if buyer_ids else '', 'buyer_name': mask(buyer_names[0]) if buyer_names else mask(pick(r, 'възложител')),
                'buyers': len(buyer_ids), 'supplier': key, 'supplier_kind': kind,
                'subject': mask(subject), 'object': obj or '', 'cpv': '', 'procedure': '',
                'eu': '1' if eu in ('1', 'true') else '0' if eu in ('0', 'false') else '',
                'offers': offers if re.fullmatch(r'\d+', offers) else '',
                'currency': currency if currency != 'НЕ СЕ ПУБЛИКУВА' else '', 'value': value, 'vat': 'incl' if 'с ддс' in vat else '',
                'value_eur': eur, 'amendments': len(amendments), 'value_after_eur': after, 'amended': last[0] if last else '',
                'basis': 'award',
            })
            kept += 1
        files.append({'file': f'egov/{os.path.basename(path)}', 'year': year, 'source': source, 'kind': 'contracts', 'rows': len(rows), 'kept': kept,
                      **{f'sum_{c}': money(v) for c, v in sums.items()}})
    annex_total = sum(len(v) for v in annexes.values())
    annex_matched = sum(len(annexes[k]) for k in matched)
    print(f'  amendments: {annex_matched} of {annex_total} matched to a contract of 2016–2025 (the others amend earlier contracts)')
    return contracts, annex_total, annex_matched


# ---------- OCDS 2026 (ЦАИС ЕОП, data.egov.bg) ----------

def read_ocds(parties, rates, files):
    releases = {}
    duplicates = 0
    for path in sorted(glob.glob(os.path.join(CACHE, 'ocds', '*.json.gz'))):
        with gzip.open(path, 'rt', encoding='utf-8') as f:
            package = json.load(f)
        if package.get('license') != 'https://opendefinition.org/licenses/cc-zero/':
            fail(f'{path}: licence {package.get("license")}')
        n = len(package['releases'])
        for r in package['releases']:
            if r['id'] in releases:
                duplicates += 1
                if json.dumps(releases[r['id']], sort_keys=True) != json.dumps(r, sort_keys=True):
                    fail(f'release {r["id"]} published twice with different content')
                continue
            releases[r['id']] = r
        files.append({'file': f'ocds/{os.path.basename(path)}', 'year': '2026', 'source': 'ocds', 'kind': 'releases', 'rows': n, 'kept': n})
    # Every contract (ocid, contract id) once: the award notice gives what was signed; later releases (amendment notices)
    # give the value after the amendment and the amendments themselves.
    parties.year = '2026'
    by_contract = defaultdict(list)
    for r in releases.values():
        for c in r.get('contracts', []):
            by_contract[(r['ocid'], c['id'])].append((r['date'], r['id'], r, c))
    contracts = []
    for (ocid, cid), seen in sorted(by_contract.items()):
        seen.sort(key=lambda x: (x[0], x[1]))
        awards = [x for x in seen if 'award' in x[2]['tag']]
        first = awards[0] if awards else seen[0]
        last = seen[-1]
        _, rid, r, c = first
        parties_by_id = {p['id']: p for p in r['parties']}
        award = next((a for a in r.get('awards', []) if a['id'] == c['awardID']), None)
        if award is None and awards:
            fail(f'{rid}: contract {cid} without its award')
        suppliers = [parties_by_id.get(s['id'], s) for s in (award or {}).get('suppliers', [])]
        if not suppliers:
            # An amendment notice of a contract signed before 2026 names its supplier among the parties.
            suppliers = [p for p in r['parties'] if 'supplier' in p.get('roles', [])]
        key, kind = parties.supplier(
            [(s.get('identifier') or {}).get('id', '') or '' for s in suppliers], [s.get('name', '') for s in suppliers],
            [(s.get('address') or {}).get('countryName', '') for s in suppliers],
        )
        buyer = parties_by_id.get(r['buyer']['id'], {})
        lots = [l for l in r['tender'].get('lots', []) if award and l['id'] in award.get('relatedLots', [])]
        items = [i for i in r['tender'].get('items', []) if i.get('relatedLot') in {l['id'] for l in lots}] or r['tender'].get('items', [])
        cpv = next((i['classification']['id'] for i in items if (i.get('classification') or {}).get('scheme') == 'CPV'), '')
        category = (lots[0].get('mainProcurementCategory') if lots else None) or r['tender'].get('mainProcurementCategory')
        bids = [s for s in (r.get('bids') or {}).get('statistics', []) if s.get('measure') == 'bids' and s.get('relatedLot') in {l['id'] for l in lots}]
        value = Decimal(str(c['value']['amount'])) if c.get('value', {}).get('amount') is not None else None
        currency = c.get('value', {}).get('currency', '')
        signed = day(c.get('dateSigned'))
        after_c = last[3]
        after = Decimal(str(after_c['value']['amount'])) if last is not first and after_c.get('value', {}).get('amount') is not None else None
        amendments = {(x[1], a.get('id')) for x in seen for a in x[3].get('amendments', [])}
        amended = max((day(a.get('date')) for x in seen for a in x[3].get('amendments', [])), default='')
        contracts.append({
            'id': f'o{ocid.rsplit("-", 1)[-1]}-{cid}', 'source': 'ocds', 'year': '2026', 'published': day(first[0]), 'signed': signed,
            'procurement': ocid, 'notice': rid.split('/')[0], 'contract_no': cid,
            'buyer': clean_eik((buyer.get('identifier') or {}).get('id', ''), 'Б'), 'buyer_name': mask(buyer.get('name', '')), 'buyers': 1,
            'supplier': key, 'supplier_kind': kind,
            'subject': mask(c.get('title') or (lots[0].get('title') if lots else '') or r['tender'].get('title', '')),
            'object': OCDS_OBJECTS.get(category, ''), 'cpv': cpv, 'procedure': r['tender'].get('procurementMethod') or '',
            'eu': '', 'offers': str(int(bids[0]['value'])) if bids and str(bids[0].get('value', '')).isdigit() else '',
            'currency': currency, 'value': value, 'vat': '', 'value_eur': rates.euro(value, currency, signed or day(first[0])),
            'amendments': len(amendments),
            'value_after_eur': rates.euro(after, after_c['value'].get('currency', currency), amended or signed) if after is not None else None,
            'amended': amended, 'basis': 'award' if awards else 'amended',
        })
    print(f'  OCDS: {len(releases)} releases ({duplicates} published twice, identical), {len(contracts)} contracts '
          f'({sum(1 for c in contracts if c["basis"] == "award")} in award notices)')
    return contracts


# ---------- TED 2024–2025 ----------

TED_PROCEDURES = {'open', 'restricted', 'neg-wo-call', 'neg-w-call', 'comp-dial', 'innovation', 'comp-tend', 'oth-single', 'oth-mult'}


def read_ted(parties, rates, files):
    notices = []
    for year in TED_YEARS:
        path = os.path.join(CACHE, 'ted', f'{year}.json.gz')
        parties.year = str(year)
        with gzip.open(path, 'rt', encoding='utf-8') as f:
            data = json.load(f)
        if len(data['notices']) != data['totalNoticeCount']:
            fail(f'TED {year}: {len(data["notices"])} notices for {data["totalNoticeCount"]}')
        # A change notice (BT-758: the notice and version it changes) replaces the notice it changes.
        changed = {n['BT-758-notice'] for n in data['notices'] if n.get('BT-758-notice')}
        version = lambda n: f'{n.get("notice-identifier")}-{int(n.get("notice-version") or 1):02d}'
        counts = Counter()
        kept = 0
        for n in data['notices']:
            if n.get('notice-type') == 'can-modif':
                counts['modification notices'] += 1
                continue
            if version(n) in changed:
                counts['changed by a later notice'] += 1
                continue
            # Joint procurement led by a foreign buyer (e.g. a European research network): its value is the whole
            # framework's, not Bulgaria's.
            if (n.get('organisation-country-buyer') or ['BGR'])[0] != 'BGR':
                counts['led by a foreign buyer'] += 1
                continue
            bul = lambda field: (n.get(field) or {}).get('bul') or next(iter((n.get(field) or {}).values()), None) or []
            names = list(dict.fromkeys(bul('winner-name')))
            ids = list(dict.fromkeys(n.get('winner-identifier') or []))
            countries = n.get('winner-country') or []
            # Winners are listed once each (not per lot); their numbers, names and countries in the same order.
            winners = [parties.one(ids[i] if i < len(ids) and len(ids) == len(names) else '', name, countries[i] if i < len(countries) else '') for i, name in enumerate(names)]
            title = (n.get('title-proc') or {}).get('bul') or next(iter((n.get('title-proc') or {}).values()), '')
            buyer_names = bul('buyer-name')
            buyer_ids = n.get('buyer-identifier') or []
            value = Decimal(str(n['total-value'])) if n.get('total-value') is not None else None
            currency = (n.get('total-value-cur') or [''])[0]
            published = day(n.get('publication-date'))
            concluded = min((day(d) for d in n.get('contract-conclusion-date') or []), default='')
            cpv = (n.get('main-classification-proc') or [''])[0]
            procedure = n.get('procedure-type') or ''
            notices.append({
                'id': n['publication-number'], 'year': published[:4], 'published': published, 'concluded': concluded,
                'buyer': clean_eik(buyer_ids[0], 'Б') if buyer_ids else '', 'buyer_name': mask(buyer_names[0]) if buyer_names else '',
                'title': mask(title if isinstance(title, str) else ' '.join(title)), 'cpv': cpv,
                'procedure': procedure if procedure in TED_PROCEDURES else ('other' if procedure else ''),
                'winners': winners, 'lots': len(set(n.get('result-lot-identifier') or [])),
                'currency': currency, 'value': value, 'value_eur': rates.euro(value, currency, concluded or published),
                'type': n.get('notice-type'),
            })
            kept += 1
        files.append({'file': f'ted/{year}.json.gz', 'year': str(year), 'source': 'ted', 'kind': 'notices', 'rows': len(data['notices']), 'kept': kept})
        print(f'  TED {year}: {len(data["notices"])} notices, {kept} award notices kept; left out: {dict(counts)}')
    return notices


# ---------- writing ----------

def write_csv(name, header, rows):
    path = os.path.join(OUT, name)
    if name.endswith('.gz'):
        with gzip.open(path, 'wt', encoding='utf-8', newline='') as f:
            w = csv.writer(f, lineterminator='\n')
            w.writerow(header)
            w.writerows(rows)
    else:
        with open(path, 'w', encoding='utf-8', newline='') as f:
            w = csv.writer(f, lineterminator='\n')
            w.writerow(header)
            w.writerows(rows)
    print(f'  {name}: {len(rows)} rows, {os.path.getsize(path) / 1e6:.2f} MB')


def cpv_divisions():
    """The 45 CPV divisions with their official Bulgarian and English names (CPV 2008)."""
    import zipfile
    import openpyxl
    with zipfile.ZipFile(os.path.join(CACHE, 'cpv', 'cpv_2008_xls.zip')) as z:
        name = next(n for n in z.namelist() if n.lower().endswith('.xlsx'))
        book = openpyxl.load_workbook(io.BytesIO(z.read(name)), read_only=True)
    rows = book.worksheets[0].iter_rows(values_only=True)
    header = next(rows)
    code, bg, en = header.index('CODE'), header.index('BG'), header.index('EN')
    return [(r[code][:2], r[bg].strip(), r[en].strip()) for r in rows if r[code] and re.fullmatch(r'\d{2}000000-\d', r[code])]


# Buyers whose name in the procurement data is not the tree's (by ЕИК, checked by hand): the ministry renamed in 2023,
# and the agency the State Budget Act names without "Държавна агенция".
BUYER_ALIASES = {
    '831909905': ('ministries', 'mafood'),  # Министерство на земеделието, храните и горите → … на земеделието и храните
    '831913661': ('ministries', 'state-reserve'),  # Държавна агенция „Държавен резерв и военновременни запаси“
}


def official(text):
    """A body's name compared across sources: no abbreviations in slashes or parentheses ("/МЗ/", "(ДАТО)"), no "на
    Република България", no quotes, punctuation or case."""
    t = fix_cyrillic(text).upper()
    t = re.sub(r'/[^/]{1,15}/|\([^()]{1,15}\)|\bНА РЕПУБЛИКА БЪЛГАРИЯ\b|\bРЕПУБЛИКА БЪЛГАРИЯ\b', ' ', t)
    return re.sub(r'[\s„“"”\'«»().,/-]+', ' ', t).strip()


def buyer_nodes(buyers):
    """The register of buyers that are a node of the trees: a ministry or agency of the State Budget Act ("Ministries") by
    its exact name (any spelling the buyer was published with), a municipality ("Municipalities") by "Община <name>" or
    "Столична община"; BUYER_ALIASES by ЕИК. A node that two buyers match is left out (the match is not certain)."""
    out = []
    units = {}
    for path in sorted(glob.glob(os.path.join(ROOT, 'public', 'data', 'ministries-*.json'))):
        with open(path, encoding='utf-8') as f:
            for node in json.load(f)['root']['children']:
                name = node['name']['bg']
                inner = re.search(r'\((.{16,})\)', name)
                for variant in [name] + ([inner.group(1)] if inner else []):
                    units.setdefault(official(variant), node['id'])
    if not units:
        fail('public/data/ministries-*.json not found: run `npm run data` first (the buyers are matched to its units)')
    with open(os.path.join(ROOT, 'data', 'sources', 'places', 'municipalities.csv'), encoding='utf-8') as f:
        places = list(csv.DictReader(f))
    municipalities = {}
    for p in places:
        name = official(p['municipality'])
        # Without spaces: the act writes "Бобовдол", buyers "Община Бобов дол".
        for n in ['СТОЛИЧНАОБЩИНА'] if p['ebk_code'] == '7225' else [f'ОБЩИНА{name}'.replace(' ', ''), f'ОБЩИНАГРАД{name}'.replace(' ', '')]:
            # Two municipalities of one name (Бяла in the provinces of Varna and Ruse) cannot be told apart by name.
            municipalities[n] = None if n in municipalities else p['ebk_code']
    matches = defaultdict(set)
    for eik, b in buyers.items():
        if eik in BUYER_ALIASES:
            matches[BUYER_ALIASES[eik]].add(eik)
            continue
        if not eik_valid(eik) or len(eik) != 9:
            continue
        for spelling in b['names']:
            n = official(spelling)
            if n in units:
                matches[('ministries', units[n])].add(eik)
            elif municipalities.get(n.replace(' ', '')):
                matches[('municipalities', municipalities[n.replace(' ', '')])].add(eik)
    for (family, node), eiks in sorted(matches.items()):
        if len(eiks) > 1:
            print(f'  buyer register: {family} {node} matches {len(eiks)} buyers ({", ".join(sorted(eiks))}) — left out')
            continue
        eik = next(iter(eiks))
        out.append([eik, buyers[eik]['name'], family, node])
    return out


def extract():
    use_given_names(read_given_names())
    os.makedirs(OUT, exist_ok=True)
    rates = Rates()
    parties = Parties()
    files = []
    yearly, annex_total, annex_matched = read_yearly(parties, rates, files)
    ocds = read_ocds(parties, rates, files)
    ted = read_ted(parties, rates, files)
    contracts = yearly + ocds
    ids = [c['id'] for c in contracts]
    if len(set(ids)) != len(ids):
        fail(f'{len(ids) - len(set(ids))} contract ids appear twice')
    print(f'  suppliers: {dict(parties.stats)}; other currencies converted at ECB rates: {dict(rates.used)}')

    # Buyers by ЕИК: the name published most often.
    buyers = {}
    for c in contracts:
        if not c['buyer']:
            continue
        b = buyers.setdefault(c['buyer'], {'names': Counter(), 'latest': Counter(), 'n': 0, 'eur': Decimal(0)})
        b['names'][c['buyer_name']] += 1
        b['latest'][(c['year'], c['buyer_name'])] += 1
        b['n'] += 1
        b['eur'] += c['value_eur'] or 0
    for n in ted:
        if n['buyer'] and n['buyer_name']:
            b = buyers.setdefault(n['buyer'], {'names': Counter(), 'latest': Counter(), 'n': 0, 'eur': Decimal(0)})
            b['names'][n['buyer_name']] += 0
            b['latest'][(n['year'], n['buyer_name'])] += 1
    for eik, b in buyers.items():
        # The spelling of the latest year (the old register added former names: "… /старо наименование …/").
        b['name'] = latest_spelling(b['latest'])
    # Buyers are contracting authorities (public bodies and companies) by law, many named after a person ("Интернат
    # „Христо Ботев“"): only a sole trader's name ("ЕТ …") would be left out.
    for eik, b in buyers.items():
        if sole_trader(b['name']):
            print(f'  a buyer that is a sole trader: {eik[:3]}… — not named')
            b['name'] = ''

    hidden = lambda c: c['supplier'] == PERSONS_KEY
    rows = []
    for c in sorted(contracts, key=lambda c: (c['year'], c['source'], c['published'], c['id'])):
        rows.append([
            c['id'], c['source'], c['year'], c['published'], c['signed'], c['procurement'], c['contract_no'],
            c['buyer'], c['buyers'], c['supplier'], c['supplier_kind'], '' if hidden(c) else c['subject'][:SUBJECT_LENGTH], c['object'], c['cpv'], c['procedure'],
            c['eu'], c['offers'], c['currency'], money(c['value']), c['vat'], money(c['value_eur']), c['amendments'], money(c['value_after_eur']),
            c['amended'], c['basis'],
        ])
    header = ['id', 'source', 'year', 'published', 'signed', 'procurement', 'contract_no', 'buyer', 'buyers', 'supplier', 'supplier_kind',
              'subject', 'object', 'cpv', 'procedure', 'eu', 'offers', 'currency', 'value', 'vat', 'value_EUR', 'amendments', 'value_after_EUR', 'amended', 'basis']
    for stale in glob.glob(os.path.join(OUT, 'contracts*.csv.gz')):
        os.remove(stale)
    for year in sorted({r[2] for r in rows}):
        write_csv(f'contracts-{year}.csv.gz', header, [r for r in rows if r[2] == year])
    write_csv('ted-notices.csv.gz', ['id', 'year', 'published', 'concluded', 'buyer', 'buyer_name', 'title', 'cpv', 'procedure', 'winners', 'winner_kinds', 'lots',
                                     'currency', 'value', 'value_EUR', 'type'],
              [[n['id'], n['year'], n['published'], n['concluded'], n['buyer'], n['buyer_name'] if not sole_trader(n['buyer_name']) else '', n['title'][:SUBJECT_LENGTH],
                n['cpv'], n['procedure'], ' '.join(k for k, _ in n['winners']), ' '.join(kind for _, kind in n['winners']), n['lots'], n['currency'], money(n['value']),
                money(n['value_eur']), n['type']] for n in sorted(ted, key=lambda n: (n['published'], n['id']))])
    used = {c['supplier'] for c in contracts} | {k for n in ted for k, _ in n['winners']}
    used |= {m for k in list(used) for m in parties.members.get(k, [])}
    write_csv('suppliers.csv.gz', ['key', 'kind', 'eik', 'name', 'spellings', 'members'],
              [[k, parties.kind[k], parties.eik[k], parties.name(k), len(parties.names[k]), ' '.join(parties.members.get(k, []))]
               for k in sorted(used - {PERSONS_KEY, WITHHELD_KEY})])
    write_csv('buyers.csv.gz', ['eik', 'name', 'spellings', 'contracts', 'value_EUR'],
              [[eik, b['name'], len(b['names']), b['n'], money(b['eur'])] for eik, b in sorted(buyers.items())])
    write_csv('buyer-nodes.csv', ['eik', 'name', 'family', 'node'], buyer_nodes(buyers))
    write_csv('cpv-divisions.csv', ['division', 'name_bg', 'name_en'], cpv_divisions())
    keys = sorted({k for f in files for k in f})
    order = ['file', 'year', 'source', 'kind', 'rows', 'kept'] + [k for k in keys if k.startswith('sum_')]
    write_csv('files.csv', order, [[f.get(k, '') for k in order] for f in files])
    print(f'  amendments in the yearly files: {annex_total}, {annex_matched} matched to their contract')

    # Checks: nothing written names a natural person or a sole trader, or holds a personal identity number.
    names = [r[3] for r in csv.reader(io.StringIO(gzip.open(os.path.join(OUT, 'suppliers.csv.gz'), 'rt', encoding='utf-8').read()))][1:]
    named = [n for n in names if n and kind_of(n) and ' | ' not in n]
    if named:
        fail(f'{len(named)} supplier names are a person\'s or a sole trader\'s, e.g. {named[:3]}')
    for name in os.listdir(OUT):
        if not re.search(r'\.csv(\.gz)?$', name):
            continue
        path = os.path.join(OUT, name)
        text = gzip.open(path, 'rt', encoding='utf-8').read() if name.endswith('.gz') else open(path, encoding='utf-8').read()
        if PERSONAL_ID.search(text):
            fail(f'{name}: an unmasked personal identity number')
        egns = [m for m in re.findall(r'(?<![\d.,])\d{10}(?![\d.,])', text) if egn_valid(m) and not eik_valid(m)]
        if egns:
            fail(f'{name}: {len(egns)} ten-digit numbers that are valid personal identity numbers')


RATES = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/ert_bil_eur_m?format=JSON&lang=EN&statinfo=AVG&sinceTimePeriod=2015-01'
RATE_CURRENCIES = ('USD', 'GBP', 'CHF', 'CZK', 'SEK', 'DKK', 'PLN', 'RON', 'HUF', 'NOK', 'JPY')
CPV_LIST = 'https://ted.europa.eu/documents/d/ted/cpv_2008_xls'


def download_reference():
    """ECB monthly exchange rates (Eurostat ert_bil_eur_m), for the few contracts in other currencies than leva and euro, and
    the CPV 2008 code list (for the names of the CPV divisions)."""
    os.makedirs(os.path.join(CACHE, 'rates'), exist_ok=True)
    path = os.path.join(CACHE, 'rates', 'ert_bil_eur_m.json')
    if not os.path.exists(path):
        url = RATES + ''.join(f'&currency={c}' for c in RATE_CURRENCIES)
        r = requests.get(url, timeout=300)
        r.raise_for_status()
        with open(path, 'w', encoding='utf-8') as f:
            f.write(r.text)
        note('rates/ert_bil_eur_m.json', url, 'ECB reference rates, monthly averages (Eurostat)')
    os.makedirs(os.path.join(CACHE, 'cpv'), exist_ok=True)
    path = os.path.join(CACHE, 'cpv', 'cpv_2008_xls.zip')
    if not os.path.exists(path):
        r = requests.get(CPV_LIST, timeout=300)
        r.raise_for_status()
        with open(path, 'wb') as f:
            f.write(r.content)
        note('cpv/cpv_2008_xls.zip', CPV_LIST, 'CPV 2008 (version 2013), all languages')


if __name__ == '__main__':
    if '--download' in sys.argv:
        os.makedirs(CACHE, exist_ok=True)
        download_egov()
        download_ted()
        download_reference()
    else:
        extract()
