#!/usr/bin/env python3
"""Extracts the programme budgets of the State Budget spending units from Annex 1
to the Council of Ministers decree on implementing the year's State Budget Act
(2026: ПМС № 102/12.08.2026) into two tidy CSVs:

  <prefix>-programmes.csv       one row per spending unit, policy / functional area
                               and budget programme, with the amounts printed
  <prefix>-programme-lines.csv one row per leaf line of each programme: departmental
                               staff / running costs / capital and every named
                               administered item ("в т.ч." items are split into
                               their parts, with a derived remainder where the
                               parts do not cover the whole)

Every amount is checked against the totals printed in the decree (programme,
area, unit; departmental and administered subtotals); the script stops on any
mismatch. Amounts stay in the decree's currency (2026: euro, 2025: leva), in the
column amount_EUR or amount_BGN. English names and display names are
hand-written: re-running the script keeps the ones already in the output files
(matched by code and Bulgarian name) and leaves new rows blank.

  python3 scripts/extract/programme_budgets.py data/cache/pms-102-2026/annex1.docx \
      data/sources/budget-2026/state-budget-2026

The source is a .docx, or an old binary .doc converted to HTML with macOS
textutil (`textutil -convert html annex.doc`), which keeps the tables.
Needs python-docx and bs4.
"""

import csv
import os
import re
import sys

import docx
from bs4 import BeautifulSoup
from docx.oxml.ns import qn

CODE = re.compile(r'^(\d{4}\.\d{2}\.\d{2})\s*(.*)$')
GROUP_END = re.compile(r'в\s*т\.\s*ч\.\s*:\s*$')
LINES = {'Персонал': 'staff', 'Издръжка': 'running', 'Капиталови разходи': 'capital'}


def clean(text):
    text = text.replace(' ', ' ').replace(' ', ' ')
    # Roman numerals are sometimes typed with Cyrillic І.
    text = re.sub(r'^І', 'I', text.strip())
    text = re.sub(r'^ІІ', 'II', text)
    text = text.replace('ІІІ.', 'III.').replace('ІІ.', 'II.')
    return re.sub(r'\s+', ' ', text).strip()


def amount(text):
    text = clean(text).replace(' ', '')
    if text in ('', '-', '–'):
        return None
    if not re.fullmatch(r'-?\d+', text):
        raise ValueError(f'not an amount: {text!r}')
    return int(text)


def cell_text(tc):
    return clean(' '.join(''.join(t.text or '' for t in p.iter(qn('w:t'))) for p in tc.iter(qn('w:p'))))


def rows_of(tbl):
    return [[cell_text(tc) for tc in tr.iter(qn('w:tc'))] for tr in tbl.iter(qn('w:tr'))]


def paragraphs_and_tables(path):
    """Paragraph texts and tables (rows of cell texts), in document order."""
    if path.endswith('.html'):
        soup = BeautifulSoup(open(path, encoding='utf-8').read(), 'lxml')
        for child in soup.body.find_all(['p', 'table'], recursive=False):
            if child.name == 'p':
                text = clean(child.get_text(' '))
                if text:
                    yield 'p', text
            else:
                yield 't', [[clean(td.get_text(' ')) for td in tr.find_all('td')] for tr in child.find_all('tr')]
        return
    for child in docx.Document(path).element.body.iterchildren():
        if child.tag == qn('w:p'):
            text = clean(''.join(t.text or '' for t in child.iter(qn('w:t'))))
            if text:
                yield 'p', text
        elif child.tag == qn('w:tbl'):
            yield 't', rows_of(child)


def split_units(path):
    """Groups the annex into units: heading text and the unit's tables."""
    units = []
    for kind, value in paragraphs_and_tables(path):
        if kind == 'p':
            if re.match(r'^Приложение № [2-9]', value):
                break
            if re.match(r'^\d+\. ПОКАЗАТЕЛИ ПО БЮДЖЕТНИТЕ ПРОГРАМИ', value):
                units.append({'heading': value, 'tables': []})
            elif units and not units[-1]['tables'] and value.startswith('НА '):
                units[-1]['heading'] += ' ' + value
        elif units:
            units[-1]['tables'].append(value)
    return units


def parse_structure(rows, where):
    """Table 1: areas and programmes with their amounts, and the unit total."""
    items, total = [], None
    for r in rows:
        m = CODE.match(r[0]) if r else None
        if m and len(r) >= 3:
            items.append({'code': m.group(1), 'name': r[1], 'amount': amount(r[-1]) or 0})
        elif len(r) >= 2 and re.match(r'^(Общо|ОБЩО)\s*:?$', r[-2]):
            total = amount(r[-1])
    if total is None:
        raise ValueError(f'{where}: no total in the structure table')
    return items, total


def parse_programmes(rows, where):
    """Table 2: for each programme, departmental lines and administered items."""
    programmes, current, section = [], None, None
    for r in rows:
        label = r[0]
        value = r[-1] if len(r) > 1 else ''
        m = CODE.match(label)
        if m and (len(r) == 1 or not re.search(r'\d', value)):
            current = {'code': m.group(1), 'name': m.group(2).strip(), 'lines': [], 'memo': None,
                       'departmental': None, 'administered': None, 'total': None, 'items': []}
            programmes.append(current)
            section = None
            continue
        if current is None or label in ('РАЗХОДИ ПО ПРОГРАМИ', 'от тях за:'):
            continue
        if label.startswith('I. Общо ведомствени разходи'):
            current['departmental'] = amount(value)
            section = 'departmental'
        elif label.startswith('II. Администрирани разходни параграфи'):
            current['administered'] = amount(value)
            section = 'administered'
        elif label.startswith('III. Общо разходи'):
            current['total'] = amount(value)
            section = None
        elif section == 'departmental' and label in LINES:
            current['lines'].append((LINES[label], label, amount(value)))
        elif section == 'departmental' and re.match(r'^в\s*т\.\s*ч\.\s*Персонал без делегирани бюджети$', label):
            current['memo'] = amount(value)
        elif section == 'administered':
            current['items'].append({'name': label, 'amount': amount(value)})
        else:
            raise ValueError(f'{where} {current["code"]}: unexpected row {r!r}')
    return programmes


def parse_totals(rows, where):
    """Table 3: the unit's departmental, administered and total spending."""
    out = {'caption': rows[0][0], 'lines': {}}
    for r in rows[1:]:
        label, value = r[0], r[-1]
        if label.startswith('I. Общо ведомствени разходи'):
            out['departmental'] = amount(value)
        elif label.startswith('II. Администрирани'):
            out['administered'] = amount(value) or 0
        elif label.startswith('III. Общо разходи'):
            out['total'] = amount(value)
        elif label in LINES:
            out['lines'][LINES[label]] = amount(value) or 0
    return out


def group_items(items, administered, where):
    """
    Nests the parts of "…, в т.ч.:" items under them. The parts follow the
    item; how many there are is found from the administered subtotal, which
    counts each item once.
    """
    total = sum(i['amount'] or 0 for i in items)
    headers = [n for n, i in enumerate(items) if GROUP_END.search(i['name'])]
    if not headers:
        check(total == (administered or 0), f'{where}: administered items {total} ≠ subtotal {administered}')
        return [dict(i, parts=[]) for i in items]
    if len(headers) > 1:
        raise ValueError(f'{where}: more than one "в т.ч." item, extend group_items()')
    h = headers[0]
    excess = total - (administered or 0)
    run = 0
    for k in range(h + 1, len(items)):
        run += items[k]['amount'] or 0
        if run == excess:
            parts = items[h + 1:k + 1]
            if run > (items[h]['amount'] or 0):
                raise ValueError(f'{where}: parts of "{items[h]["name"]}" exceed it')
            out = [dict(i, parts=[]) for i in items[:h]]
            out.append(dict(items[h], parts=parts))
            out += [dict(i, parts=[]) for i in items[k + 1:]]
            return out
    raise ValueError(f'{where}: cannot find the parts of "{items[h]["name"]}"')


def unit_name(caption):
    m = re.match(r'^Общо разходи по бюджетн(?:ите|и) програми на (.+)$', caption)
    if not m:
        raise ValueError(f'unexpected totals caption {caption!r}')
    return m.group(1).strip()


ISSUES = []

# Typing errors in the printed decree, each one confirmed by two other printed totals (see the source README).
# document → {(programme code, field): (printed, corrected)}; field is "structure" (the area/programme table),
# "departmental", "total" or a line ("staff", "running", "capital").
CORRECTIONS = {
    'state-budget-2026': {  # ПМС № 102/2026
        # Foreign affairs: running costs (and so I.) of 1100.01.03 are €200 short of the programme total
        # (12 711 700, also in the structure table and the law) and of the ministry's running-cost total (55 676 600).
        ('1100.01.03', 'departmental'): (897_700, 897_900),
        ('1100.01.03', 'running'): (897_700, 897_900),
        # Education: the structure table prints 11 507 400 for 1700.01.05; its own I + II = III and the area total
        # (703 080 700, as in the law) give 11 570 400.
        ('1700.01.05', 'structure'): (11_507_400, 11_570_400),
        # Regional development: III of 2100.02.03 is printed 10 265 500; I + II and the structure table give 10 265 600.
        ('2100.02.03', 'total'): (10_265_500, 10_265_600),
    },
}
APPLIED = set()


def corrected(document, code, field, value):
    fix = CORRECTIONS.get(document, {}).get((code, field))
    if not fix:
        return value
    if value != fix[0]:
        raise ValueError(f'{document} {code} {field}: expected the printed {fix[0]}, found {value}')
    APPLIED.add((code, field))
    return fix[1]


def apply_corrections(document, items, programmes):
    for i in items:
        i['amount'] = corrected(document, i['code'], 'structure', i['amount'])
    for prog in programmes:
        for field in ('departmental', 'administered', 'total'):
            prog[field] = corrected(document, prog['code'], field, prog[field])
        prog['lines'] = [(line, label, corrected(document, prog['code'], line, value)) for line, label, value in prog['lines']]


def check(ok, message):
    """Records an amount that does not match a printed total."""
    if not ok:
        ISSUES.append(message)


def currency(rows):
    """The table header says "(в евро)" or "(в лева)"."""
    header = ' '.join(' '.join(r) for r in rows[:3])
    if 'в евро' in header:
        return 'EUR'
    if 'в лева' in header:
        return 'BGN'
    raise ValueError(f'no currency in {header!r}')


def extract(path, document):
    units = split_units(path)
    structure, lines = [], []
    currencies = set()
    for unit in units:
        heading = unit['heading']
        if len(unit['tables']) != 3:
            raise ValueError(f'{heading}: expected 3 tables, found {len(unit["tables"])}')
        currencies.add(currency(unit['tables'][0]))
        items, unit_total = parse_structure(unit['tables'][0], heading)
        programmes = parse_programmes(unit['tables'][1], heading)
        totals = parse_totals(unit['tables'][2], heading)
        apply_corrections(document, items, programmes)
        code = items[0]['code'][:4]
        name = unit_name(totals['caption'])

        # Areas and their programmes, in the order printed. A row named "Бюджетна програма …" with an
        # area-level code (xxxx.yy.00, or the irregular xxxx.00.yy) is a programme of its own, at area level.
        by_code = {i['code']: i for i in items}
        structure.append({'unit_code': code, 'code': code, 'level': 'unit', 'name_bg': name, 'amount': unit_total})
        check(totals['total'] == unit_total, f'{name}: structure total {unit_total} ≠ totals table {totals["total"]}')
        policy_of = {}  # programme code → area code
        policies = []
        for i in items:
            standalone = i['name'].startswith('Бюджетна програма') and (i['code'].endswith('.00') or i['code'][5:7] == '00')
            if i['code'].endswith('.00') or standalone:
                policies.append({**i, 'programmes': []})
                structure.append({'unit_code': code, 'code': i['code'], 'level': 'policy', 'name_bg': i['name'], 'amount': i['amount']})
                if standalone:
                    policy_of[i['code']] = i['code']
            else:
                area = policies[-1] if policies else None
                if not area or area['code'][:7] != i['code'][:7]:
                    raise ValueError(f'{name} {i["code"]}: a programme outside its area')
                area['programmes'].append(i)
                policy_of[i['code']] = area['code']
                structure.append({'unit_code': code, 'code': i['code'], 'level': 'programme', 'name_bg': i['name'], 'amount': i['amount']})
        check(sum(p['amount'] for p in policies) == unit_total, f'{name}: areas do not add up to the unit total')
        for p in policies:
            if p['programmes']:
                check(sum(c['amount'] for c in p['programmes']) == p['amount'], f'{name} {p["code"]}: programmes do not add up')
            elif p['code'] not in policy_of:
                raise ValueError(f'{name} {p["code"]}: an area without programmes')
        programme_codes = set(policy_of)

        # Lines of each programme.
        seen = set()
        sums = {'staff': 0, 'running': 0, 'capital': 0, 'administered': 0}
        for prog in programmes:
            where = f'{name} {prog["code"]}'
            if prog['code'] not in programme_codes:
                raise ValueError(f'{where}: not in the structure table')
            seen.add(prog['code'])
            dep = sum(v or 0 for _, _, v in prog['lines'])
            check(dep == (prog['departmental'] or 0), f'{where}: departmental lines {dep} ≠ subtotal {prog["departmental"]}')
            grouped = group_items(prog['items'], prog['administered'], where)
            total = (prog['departmental'] or 0) + (prog['administered'] or 0)
            check(total == prog['total'] == by_code[prog['code']]['amount'], f'{where}: I+II {total}, III {prog["total"]}, structure table {by_code[prog["code"]]["amount"]}')
            policy = policy_of[prog['code']]
            row = lambda **kw: lines.append({'unit_code': code, 'policy_code': policy, 'programme_code': prog['code'], **kw})
            for line, label, value in prog['lines']:
                if not value:
                    continue
                sums[line] += value
                memo = prog['memo'] if line == 'staff' else None
                if memo and 0 < memo < value:
                    # "в т.ч. Персонал без делегирани бюджети": the rest is staff in the delegated budgets.
                    row(line=line, item_no='1', name_bg='Персонал без делегирани бюджети', group_bg=label, amount=memo, derived='')
                    row(line=line, item_no='2', name_bg='Персонал в делегираните бюджети', group_bg=label, amount=value - memo, derived='remainder')
                else:
                    row(line=line, item_no='', name_bg=label, group_bg='', amount=value, derived='')
            for n, item in enumerate(grouped, 1):
                sums['administered'] += item['amount'] or 0
                if not item['parts']:
                    row(line='administered', item_no=str(n), name_bg=item['name'], group_bg='', amount=item['amount'] or 0, derived='')
                    continue
                for k, part in enumerate(item['parts'], 1):
                    row(line='administered', item_no=f'{n}.{k}', name_bg=part['name'], group_bg=item['name'], amount=part['amount'] or 0, derived='')
                rest = item['amount'] - sum(p['amount'] or 0 for p in item['parts'])
                if rest:
                    row(line='administered', item_no=f'{n}.{len(item["parts"]) + 1}', name_bg='Други', group_bg=item['name'], amount=rest, derived='remainder')
        # A programme with no money (printed as "0" or blank) may be left out of the lines table.
        missing = {c for c in programme_codes - seen if by_code[c]['amount']}
        if missing:
            raise ValueError(f'{name}: no lines for {sorted(missing)}')
        for key in ('staff', 'running', 'capital'):
            check(sums[key] == totals['lines'].get(key, 0), f'{name}: {key} {sums[key]} ≠ unit total {totals["lines"].get(key)}')
        check(sums['administered'] == totals['administered'], f'{name}: administered {sums["administered"]} ≠ unit total {totals["administered"]}')
    unused = set(CORRECTIONS.get(document, {})) - APPLIED
    if unused:
        raise ValueError(f'corrections not applied: {sorted(unused)}')
    if len(currencies) != 1:
        raise ValueError(f'mixed currencies: {currencies}')
    return structure, lines, currencies.pop()


STRUCTURE_COLUMNS = ['unit_code', 'code', 'level', 'name_bg', 'short_bg', 'name_en', 'amount']
LINE_COLUMNS = ['unit_code', 'policy_code', 'programme_code', 'line', 'item_no', 'name_bg', 'short_bg', 'name_en', 'group_bg', 'group_short_bg', 'group_en',
                'amount', 'derived']


def keep_names(path, rows, key, columns):
    """Carries hand-written names over from an earlier version of the file."""
    if not os.path.exists(path):
        return
    with open(path, newline='', encoding='utf-8') as f:
        old = {key(r): r for r in csv.DictReader(f)}
    for r in rows:
        prev = old.get(key(r))
        for col in columns:
            r[col] = prev.get(col, '') if prev else ''


def write(path, columns, rows, cur):
    """Writes the rows; the amount column is named after the currency (amount_EUR, amount_BGN)."""
    named = [f'amount_{cur}' if c == 'amount' else c for c in columns]
    with open(path, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, named, lineterminator='\n')
        w.writeheader()
        for r in rows:
            w.writerow({n: r.get(c, '') for n, c in zip(named, columns)})


def main():
    source, prefix = sys.argv[1], sys.argv[2]
    structure, lines, cur = extract(source, os.path.basename(prefix))
    if ISSUES:
        sys.exit('Amounts that do not match the printed totals:\n  ' + '\n  '.join(ISSUES))
    keep_names(f'{prefix}-programmes.csv', structure, lambda r: (r['code'], r['name_bg']), ('short_bg', 'name_en'))
    keep_names(f'{prefix}-programme-lines.csv', lines, lambda r: (r['programme_code'], r['line'], r['group_bg'], r['name_bg']),
               ('short_bg', 'name_en', 'group_short_bg', 'group_en'))
    write(f'{prefix}-programmes.csv', STRUCTURE_COLUMNS, structure, cur)
    write(f'{prefix}-programme-lines.csv', LINE_COLUMNS, lines, cur)
    units = [s for s in structure if s['level'] == 'unit']
    print(f'{len(units)} units, {sum(1 for s in structure if s["level"] == "policy")} areas, '
          f'{len({l["programme_code"] for l in lines})} programmes, {len(lines)} lines, '
          f'{sum(u["amount"] for u in units):,} {cur}')


if __name__ == '__main__':
    main()
