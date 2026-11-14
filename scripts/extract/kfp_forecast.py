#!/usr/bin/env python3
"""Extracts the consolidated fiscal programme (КФП) tables of the updated
medium-term budget forecast 2027–2029 (the explanatory memorandum to the draft
2027 State Budget Act, PDF):

- Table III-1, КФП expenditure by function and sub-function (reserve distributed,
  without the EU contribution), million EUR and % of GDP, 2026–2029
  → kfp-2027-by-function.csv
- Tables II-1 and II-2, the КФП's main indicators and its national budget
  → kfp-main-indicators.csv, kfp-national-budget.csv
- Annex 4, the expenditure ceilings of the budget organisations 2027–2029
  (ministries, agencies, the social security funds and the NHIF), thousand EUR
  → expenditure-ceilings-2027-2029.csv
- Annex 6, the transfers to public media, the Academy of Sciences and the state
  universities, thousand EUR → transfers-universities-media.csv

  python3 -P -E scripts/extract/kfp_forecast.py \
      data/cache/mtbf-2027-2029/UMTBF-2027-2029-motivi.pdf data/sources/budget-2027

Stops when a sub-function does not add up to its function, when the functions do
not add up to the expenditure of Table II-1 (or interest and non-interest
expenditure do not match), or when a table is not where it is expected. Needs
pdfplumber (`-P` keeps the user site-packages).
"""

import csv
import os
import re
import sys

import pdfplumber

LOOKALIKES = str.maketrans('aceopxyABCEHKMOPTX', 'асеорхуАВСЕНКМОРТХ')
NUMBER = r'-?\d{1,3}(?: \d{3})*,\d'


def clean(text):
    return re.sub(r'\s+', ' ', text.replace(' ', ' ')).strip()


def fix_cyrillic(text):
    """Latin look-alike letters inside Cyrillic words → Cyrillic."""
    return re.sub(r'\w+', lambda m: m.group(0).translate(LOOKALIKES) if re.search('[а-яА-Я]', m.group(0)) else m.group(0), text)


def amount(text):
    return round(float(text.replace(' ', '').replace(',', '.').rstrip('%')), 1)


def fail(message):
    sys.exit(f'✗ {message}')


def find_page(pdf, caption, start=0):
    """Index of the first page from `start` with a line starting with `caption` (not a table-of-contents line)."""
    for i in range(start, len(pdf.pages)):
        text = pdf.pages[i].extract_text() or ''
        for line in text.split('\n'):
            if clean(line).startswith(caption) and '....' not in line:
                return i
    fail(f'"{caption}" not found')


# ---------- Table III-1 (word positions: a few cells wrap their thousands onto the line above) ----------

COLUMNS_III1 = ['2026_expected', '2027_draft', '2028_forecast', '2029_forecast']


def by_function(page):
    words = page.extract_words()
    head = next(w for w in words if w['text'] == 'ПОКАЗАТЕЛИ')
    foot = next(w for w in words if w['text'].startswith('Източник') and w['top'] > head['top'])
    # The column headers "Очаквано Проект …" are one line below ПОКАЗАТЕЛИ.
    body = [w for w in words if head['bottom'] + 12 < w['top'] < foot['top']]
    labels = [w for w in body if w['x0'] < 225]
    numbers = sorted((w for w in body if w['x0'] >= 225), key=lambda w: (round(w['top']), w['x0']))

    # Join the groups of one number printed on one line ("6" "460,3").
    tokens = []
    for w in numbers:
        prev = tokens[-1] if tokens else None
        if prev and abs(prev['top'] - w['top']) < 1 and w['x0'] - prev['x1'] < 4 and re.fullmatch(r'-?\d+', prev['text']):
            prev['text'] += ' ' + w['text']
            prev['x1'] = w['x1']
        else:
            tokens.append(dict(text=w['text'], top=w['top'], x1=w['x1']))
    # Columns by right edge: the right edges of complete numbers.
    edges = []
    for tok in sorted((t for t in tokens if ',' in t['text']), key=lambda t: t['x1']):
        if not edges or tok['x1'] - edges[-1][-1] > 3:
            edges.append([tok['x1']])
        else:
            edges[-1].append(tok['x1'])
    edges = [sum(e) / len(e) for e in edges]
    if len(edges) != 8:
        fail(f'Table III-1: {len(edges)} columns, expected 8')
    columns = [[] for _ in edges]
    for tok in tokens:
        i = min(range(len(edges)), key=lambda k: abs(edges[k] - tok['x1']))
        if abs(edges[i] - tok['x1']) > 8:
            fail(f'Table III-1: "{tok["text"]}" is in no column')
        columns[i].append(tok)
    # A cell that wraps prints its thousands ("20") on the line above the rest ("394,3").
    cells = []
    for i, col in enumerate(columns):
        pending = []
        for tok in sorted(col, key=lambda t: t['top']):
            if ',' not in tok['text']:
                pending.append(tok['text'])
                continue
            cells.append(dict(col=i, top=tok['top'], text=' '.join(pending + [tok['text']])))
            pending = []
        if pending:
            fail(f'Table III-1: dangling "{pending}" in column {i}')

    # Label lines → items (a function starts with a capital letter, a sub-function with "-"; other lines continue).
    lines = []
    for w in sorted(labels, key=lambda w: (round(w['top']), w['x0'])):
        if lines and abs(lines[-1]['top'] - w['top']) < 1:
            lines[-1]['text'] += ' ' + w['text']
        else:
            lines.append(dict(top=w['top'], text=w['text']))
    items = []
    for line in lines:
        text = fix_cyrillic(clean(line['text']))
        if text.startswith('-') or text[0].isupper():
            items.append(dict(top=line['top'], text=text))
        elif items:
            items[-1]['text'] += ' ' + text
        else:
            fail(f'Table III-1: continuation line "{text}" first')
    rows = []
    for k, item in enumerate(items):
        end = items[k + 1]['top'] - 1 if k + 1 < len(items) else foot['top']
        mine = [c for c in cells if item['top'] - 1 <= c['top'] < end]
        if sorted(c['col'] for c in mine) != list(range(8)):
            fail(f'Table III-1: "{item["text"]}" has cells in columns {sorted(c["col"] for c in mine)}')
        mine.sort(key=lambda c: c['col'])
        sub = item['text'].startswith('-')
        name = clean(item['text'].lstrip('- '))
        rows.append(dict(
            level='subfunction' if sub else 'function',
            name=name,
            values=[amount(c['text']) for c in mine[:4]],
            pct=[c['text'] for c in mine[4:]],
        ))
    return rows


def check_functions(rows, expenditure, interest):
    """Sub-functions add up to their function, functions to Table II-1's expenditure."""
    function = None
    subs = {}
    for r in rows:
        if r['level'] == 'function':
            function = r
            subs[r['name']] = []
        else:
            subs[function['name']].append(r)
    for r in rows:
        if r['level'] != 'function' or not subs[r['name']]:
            continue
        for i, col in enumerate(COLUMNS_III1):
            total = sum(s['values'][i] for s in subs[r['name']])
            if abs(total - r['values'][i]) > 0.1 * len(subs[r['name']]):
                fail(f'Table III-1 {col}: sub-functions of "{r["name"]}" add up to {total:.1f}, not {r["values"][i]}')
    functions = [r for r in rows if r['level'] == 'function']
    if len(functions) != 9:
        fail(f'Table III-1: {len(functions)} functions, expected 9')
    for i, col in enumerate(COLUMNS_III1):
        total = sum(r['values'][i] for r in functions)
        if abs(total - expenditure[i]) > 0.5:
            fail(f'Table III-1 {col}: functions add up to {total:.1f}, Table II-1 "Разходи" {expenditure[i]}')
        unclassified = functions[-1]
        if not unclassified['name'].startswith('Р-ди некласифицирани') or abs(unclassified['values'][i] - interest[i]) > 0.05:
            fail(f'Table III-1 {col}: "{unclassified["name"]}" {unclassified["values"][i]} ≠ interest {interest[i]}')
        print(f'  {col}: 9 functions = {total:.1f} = Table II-1 expenditure {expenditure[i]}')


# ---------- Tables II-1 and II-2 (text lines) ----------

COLUMNS_II = ['2025_report', '2026_expected', '2027_draft', '2028_forecast', '2029_forecast']


def indicator_table(page, caption):
    text = page.extract_text()
    lines = [clean(l) for l in text.split('\n')]
    start = next(i for i, l in enumerate(lines) if l.startswith(caption))
    rows = []
    last = None
    for line in lines[start + 1:]:
        if line.startswith('Източник'):
            break
        pct = re.findall(r'-?\d+,\d%', line)
        if len(pct) == 5:
            label = line[: line.index(pct[0])].strip()
            rows.append(dict(indicator=f'{last} ({label})', unit='pctGDP', values=[p.rstrip('%').replace(',', '.') for p in pct]))
            continue
        found = list(re.finditer(NUMBER, line))
        if len(found) < 5:
            continue
        values = [m.group(0) for m in found[-5:]]
        label = fix_cyrillic(line[: found[-5].start()].strip())
        if not label or re.search(r'\d', label):
            fail(f'{caption}: odd line "{line}"')
        last = label
        rows.append(dict(indicator=label, unit='mEUR', values=[str(amount(v)) for v in values]))
    if not rows:
        fail(f'{caption}: no rows')
    return rows


def indicator(rows, name):
    row = next((r for r in rows if r['indicator'] == name), None)
    if row is None:
        fail(f'indicator "{name}" not found')
    return [float(v) for v in row['values']]


# ---------- Annex 6 (text lines) ----------

def transfers(page):
    lines = [clean(l) for l in (page.extract_text() or '').split('\n')]
    start = next(i for i, l in enumerate(lines) if l.startswith('№ Бюджетни взаимоотношения'))
    rows = []
    label = []
    for line in lines[start + 1:]:
        values = re.findall(NUMBER, line)
        m = re.match(r'^(\d(?:\.\d)?) (.*)$', line)
        if m and not label and len(values) < 3:
            label = [m.group(1), m.group(2)]
            continue
        if len(values) >= 3:
            values = values[-3:]
            head = line[: len(line) - len(' '.join(values))].strip()
            if label:
                no, name = label[0], ' '.join(x for x in [label[1], head] if x)
            elif m:
                no, name = m.group(1), m.group(2)[: len(m.group(2)) - len(' '.join(values))].strip()
            else:
                no, name = '', head
            rows.append([no.replace('.', ','), fix_cyrillic(name), *values])
            label = []
        elif label:
            label[1] += ' ' + line
        elif re.fullmatch(r'\d+', line):
            break  # page number
    if len(rows) != 10:
        fail(f'Annex 6: {len(rows)} rows, expected 10')
    total, academy, universities = (amount(rows[i][2]) for i in (5, 6, 7))
    if abs(academy + universities - total) > 0.05:
        fail(f'Annex 6: {academy} + {universities} ≠ {total}')
    return rows


# ---------- Annex 4 (text lines over two pages) ----------

def ceilings(pdf, first):
    rows = []
    for i in range(first, first + 3):
        lines = [clean(l) for l in (pdf.pages[i].extract_text() or '').split('\n')]
        for line in lines:
            if line.startswith('ПРИЛОЖЕНИЕ № 5'):
                break
            found = list(re.finditer(NUMBER, line))
            if len(found) == 3 and found[-1].end() == len(line):
                head = line[: found[0].start()].strip()
                m = re.match(r'^(\d+) (.*)$', head)
                no, name = (m.group(1), m.group(2)) if m else ('', head)
                rows.append([no, fix_cyrillic(name), *[f'{amount(x.group(0)):.1f}' for x in found]])
            elif rows and line and not re.fullmatch(r'\d+', line) and not line.startswith(('№ ', '(в хил', 'ТАВАНИ', 'ПРИЛОЖЕНИЕ')):
                rows[-1][1] += ' ' + fix_cyrillic(line)  # a name wrapped onto the next line
        else:
            continue
        break
    numbered = [r for r in rows if r[0]]
    if [int(r[0]) for r in numbered] != list(range(1, 50)) or not numbered[-1][1].startswith('Национална здравноосигурителна каса'):
        fail(f'Annex 4: {len(numbered)} numbered rows, expected 1–49 ending with the NHIF')
    return rows


def check_ceilings(rows, units_csv):
    """The ceilings of the state-budget organisations equal their expenditure in the bill (art. 2–48)."""
    if not os.path.exists(units_csv):
        return
    totals = {round(float(r['amount_thousand_EUR']), 1) for r in csv.DictReader(open(units_csv, encoding='utf-8')) if r['policy_area_or_program'].startswith('Всичко')}
    funds = ('Национален осигурителен институт', 'Фонд „Гарантирани', 'Учителски пенсионен фонд', 'Национална здравноосигурителна каса')
    for r in rows:
        if r[0] and not r[1].startswith(funds) and float(r[2]) not in totals:
            fail(f'Annex 4: {r[1]} {r[2]} is no unit total of the bill')
    print('  Annex 4: the 45 state-budget organisations equal their totals in the bill')


def main():
    pdf_path, out_dir = sys.argv[1], sys.argv[2]
    pdf = pdfplumber.open(pdf_path)

    p_ii1 = find_page(pdf, 'Табл. II-1: Основни показатели по КФП')
    main_rows = indicator_table(pdf.pages[p_ii1], 'Табл. II-1')
    p_ii2 = find_page(pdf, 'Табл. II-2: КФП – Национален бюджет', p_ii1)
    national_rows = indicator_table(pdf.pages[p_ii2], 'Табл. II-2')
    for name, rows in [('kfp-main-indicators.csv', main_rows), ('kfp-national-budget.csv', national_rows)]:
        with open(os.path.join(out_dir, name), 'w', newline='', encoding='utf-8') as f:
            w = csv.writer(f)
            w.writerow(['indicator', 'unit', *COLUMNS_II])
            for r in rows:
                w.writerow([r['indicator'], r['unit'], *r['values']])
        print(f'✓ {name}: {len(rows)} rows')

    expenditure = indicator(main_rows, 'Разходи')[1:]
    interest = indicator(main_rows, 'Лихви')[1:]
    total_with_eu = indicator(main_rows, 'ОБЩО РАЗХОДИ И ВНОСКА В БЮДЖЕТА НА ЕС')
    eu = indicator(main_rows, 'Вноска в общия бюджет на ЕС')
    spending = indicator(main_rows, 'Разходи')
    for i, col in enumerate(COLUMNS_II):
        if abs(spending[i] + eu[i] - total_with_eu[i]) > 0.15:
            fail(f'Table II-1 {col}: expenditure + EU contribution ≠ total')
    non_interest = indicator(main_rows, 'Нелихвени разходи')
    for i, col in enumerate(COLUMNS_II):
        if abs(non_interest[i] + indicator(main_rows, 'Лихви')[i] - spending[i]) > 0.15:
            fail(f'Table II-1 {col}: non-interest + interest ≠ expenditure')

    p_iii1 = find_page(pdf, 'Табл. III-1: Разходи по функции по КФП', p_ii2)
    rows = by_function(pdf.pages[p_iii1])
    check_functions(rows, expenditure, interest)
    function = None
    with open(os.path.join(out_dir, 'kfp-2027-by-function.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['level', 'function', 'subfunction', *[f'{c}_mEUR' for c in COLUMNS_III1], *[f'{c[:4]}_pctGDP' for c in COLUMNS_III1]])
        for r in rows:
            if r['level'] == 'function':
                function = r['name']
            w.writerow([r['level'], function, r['name'] if r['level'] == 'subfunction' else '', *[f'{v:.1f}' for v in r['values']], *[p.rstrip('%').replace(',', '.') for p in r['pct']]])
    print(f'✓ kfp-2027-by-function.csv: {len(rows)} rows (page {p_iii1 + 1})')

    p_annex4 = find_page(pdf, 'ПРИЛОЖЕНИЕ № 4:', p_iii1)
    rows4 = ceilings(pdf, p_annex4)
    check_ceilings(rows4, os.path.join(out_dir, 'state-budget-2027-spending-units.csv'))
    with open(os.path.join(out_dir, 'expenditure-ceilings-2027-2029.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['no', 'organisation', '2027_kEUR', '2028_kEUR', '2029_kEUR'])
        w.writerows(rows4)
    print(f'✓ expenditure-ceilings-2027-2029.csv: {len(rows4)} rows (page {p_annex4 + 1})')

    p_annex6 = find_page(pdf, 'ПРИЛОЖЕНИЕ № 6:', p_annex4)
    with open(os.path.join(out_dir, 'transfers-universities-media.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['№', 'Бюджетни взаимоотношения (трансфери)', '2027 г.', '2028 г.', '2029 г.'])
        w.writerows(transfers(pdf.pages[p_annex6]))
    print(f'✓ transfers-universities-media.csv (page {p_annex6 + 1})')


if __name__ == '__main__':
    main()
