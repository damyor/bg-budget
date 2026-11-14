#!/usr/bin/env python3
"""Reads a State Budget Act (or bill) published as a PDF with a text layer — the
form of the draft State Budget Act 2027 — as a stream of text lines and tables in
reading order, for the extractors that otherwise read the State Gazette HTML.

The 2027 draft prints two versions of art. 1 and art. 2: one with the Supreme
Judicial Council's own draft of the judiciary's budget ("ЧЛ. 1. С ВКЛЮЧЕН ПРОЕКТ
НА ВИСШИЯ СЪДЕБЕН СЪВЕТ", "ПРОЕКТ НА ВИСШИЯ СЪДЕБЕН СЪВЕТ") and the Council of
Ministers' opinion ("СТАНОВИЩЕ НА МИНИСТЕРСКИЯ СЪВЕТ ПО ЧЛ. 1." / "ПО ЧЛ. 2"),
which is the government's proposal. `split_versions` separates them.

Needs pdfplumber; the stream is cached next to the PDF (<name>.stream.json),
keyed by the PDF's SHA-256, because finding the tables takes a while.
"""

import hashlib
import json
import os
import re

LOOKALIKES = dict(zip('ABCEHKMOPTXYaceopxy', 'АВСЕНКМОРТХУасеорху'))


def clean(text):
    return re.sub(r'\s+', ' ', (text or '').replace('\xa0', ' ')).strip()


def fix_cyrillic(text):
    """Latin look-alike letters inside Cyrillic words ("Cмолян") → Cyrillic."""
    return re.sub(r'\w+', lambda m: ''.join(LOOKALIKES.get(c, c) for c in m.group(0)) if re.search('[Ѐ-ӿ]', m.group(0)) else m.group(0), text)


def amount(text):
    """'11 681,1' → 11681.1; blank → None; anything else raises."""
    text = clean(text).replace(' ', '')
    if text in ('', '-', '–'):
        return None
    if not re.fullmatch(r'-?\d+(,\d+)?', text):
        raise ValueError(f'not an amount: {text!r}')
    return float(text.replace(',', '.'))


def is_amount(text):
    return bool(re.fullmatch(r'-?\d{1,3}( \d{3})*(,\d+)?', clean(text)))


def r1(x):
    return round(x + 0.0, 1)


def _inside(line, bbox):
    x0, top, x1, bottom = bbox
    mid = (line['top'] + line['bottom']) / 2
    return top - 1 <= mid <= bottom + 1 and line['x0'] < x1 and line['x1'] > x0


def stream(path):
    """[{'page', 'kind': 'text', 'text'} | {'page', 'kind': 'table', 'rows'}] in reading order.

    Text lines that fall inside a table are left out (the table has them); table
    cells are cleaned (line breaks inside a cell become spaces) and empty columns dropped.
    """
    digest = hashlib.sha256(open(path, 'rb').read()).hexdigest()
    cache = f'{path}.stream.json'
    if os.path.exists(cache):
        data = json.load(open(cache, encoding='utf-8'))
        if data.get('sha256') == digest:
            return data['items']
    import pdfplumber

    items = []
    with pdfplumber.open(path) as pdf:
        for n, page in enumerate(pdf.pages, 1):
            tables = page.find_tables()
            boxes = [t.bbox for t in tables]
            entries = []
            for t in tables:
                rows = []
                for row in t.extract():
                    cells = [clean(c) for c in row if c is not None]
                    cells = [c for c in cells if c]
                    if cells:
                        rows.append(cells)
                entries.append((t.bbox[1], {'page': n, 'kind': 'table', 'rows': rows}))
            for line in page.extract_text_lines():
                if not any(_inside(line, b) for b in boxes):
                    entries.append((line['top'], {'page': n, 'kind': 'text', 'text': clean(line['text'])}))
            items += [e for _, e in sorted(entries, key=lambda e: e[0])]
    json.dump({'sha256': digest, 'items': items}, open(cache, 'w', encoding='utf-8'), ensure_ascii=False)
    return items


# (start of the judiciary's own version, start of the government's version)
VERSION_MARKS = [
    ('ЧЛ. 1. С ВКЛЮЧЕН ПРОЕКТ НА ВИСШИЯ СЪДЕБЕН СЪВЕТ', 'СТАНОВИЩЕ НА МИНИСТЕРСКИЯ СЪВЕТ ПО ЧЛ. 1'),
    ('ПРОЕКТ НА ВИСШИЯ СЪДЕБЕН СЪВЕТ', 'СТАНОВИЩЕ НА МИНИСТЕРСКИЯ СЪВЕТ ПО ЧЛ. 2'),
]


def _is_text_row(row):
    """A one-cell table row that is really text: a version mark, an article or a paragraph's opening line."""
    marks = [m for pair in VERSION_MARKS for m in pair]
    return len(row) == 1 and (any(row[0].startswith(m) for m in marks) or re.match(r'^(Чл\. \d+\. )?\(\d+\) \S', row[0]) is not None)


def _text_rows_out(items):
    """Text the PDF draws inside a table (one-cell rows) becomes a text line between two tables."""
    out = []
    for item in items:
        if item['kind'] != 'table' or not any(_is_text_row(r) for r in item['rows']):
            out.append(item)
            continue
        rows = []
        for r in item['rows']:
            if _is_text_row(r):
                if rows:
                    out.append({**item, 'rows': rows})
                out.append({'page': item['page'], 'kind': 'text', 'text': r[0]})
                rows = []
            else:
                rows.append(r)
        if rows:
            out.append({**item, 'rows': rows})
    return out


def split_versions(items):
    """(government, judiciary, n): the act with the Council of Ministers' articles, the judiciary's versions alone, and how many there were."""
    government, judiciary, skipping, found = [], [], None, 0
    for item in _text_rows_out(items):
        text = item.get('text', '') if item['kind'] == 'text' else ''
        if skipping is None:
            mark = next((m for m in VERSION_MARKS if text.startswith(m[0])), None)
            if mark:
                skipping = mark[1]
                found += 1
                continue
            government.append(item)
        elif text.startswith(skipping):
            skipping = None
        else:
            judiciary.append(item)
    if skipping is not None:
        raise ValueError(f'no "{skipping}" after the judiciary\'s version')
    return government, judiciary, found


def articles(items):
    """Article number → its items (from "Чл. N." to the next article)."""
    result, current = {}, None
    for item in items:
        if item['kind'] == 'text':
            m = re.match(r'^Чл\. (\d+)\.', item['text'])
            if m:
                current = int(m.group(1))
                if current in result:
                    raise ValueError(f'art. {current} twice')
                result[current] = []
        if current is not None:
            result[current].append(item)
    return result


def is_page_number(item):
    return item['kind'] == 'text' and re.fullmatch(r'\d{1,3}', item['text']) is not None


AMOUNT = r'-?\d{1,3}(?: \d{3})*,\d'


def row_of_line(text):
    """A table row the PDF draws without its top border (the first row on a page) comes out as a text line: split it."""
    m = re.fullmatch(rf'([IVXІ]+\.|(?:\d+\.)+)?\s*(.+?)\s+({AMOUNT})', text)
    if not m:
        raise ValueError(f'text inside a table: {text[:100]}')
    return [c for c in m.groups() if c]


def table_after(items, start, until=r'^Всичко'):
    """Rows of the table that follows items[start], continued over page breaks until a row whose name matches `until`.

    Returns (rows, index of the item after the table).
    """
    i = start
    while i < len(items) and items[i]['kind'] != 'table':
        i += 1
    if i == len(items):
        raise ValueError('no table')
    rows, pending = [], []
    while i < len(items):
        item = items[i]
        if item['kind'] == 'table':
            if pending:
                raise ValueError(f'a row without an amount: {" ".join(pending)[:100]}')
            for row in item['rows']:
                rows.append(row)
                if until is not None and any(re.match(until, c) for c in row[:2]):
                    return rows, i + 1  # the PDF may draw the next paragraph in the same table
            if until is None:
                return rows, i + 1
        elif not is_page_number(item) and not re.fullmatch(r'\(хил\. евро\)|Сума|№ .*|1 2', item['text']):
            # A row drawn as text (the first row on a page) may take several lines; its amount ends it.
            pending.append(item['text'])
            if re.search(rf'(^|\s){AMOUNT}$', item['text']):
                rows.append(row_of_line(' '.join(pending)))
                pending = []
                if until is not None and re.match(until, rows[-1][0]):
                    return rows, i + 1
        i += 1
    raise ValueError('the table does not end')


def rows_between(items, start, stop):
    """Every table row from items[start] to items[stop], with rows drawn as text lines split; other text is skipped."""
    rows = []
    for item in items[start:stop]:
        if item['kind'] == 'table':
            rows += item['rows']
        elif not is_page_number(item) and re.search(rf'\s{AMOUNT}$', item['text']) and not re.match(r'^\(\d+\)', item['text']):
            rows.append(row_of_line(item['text']))
    return rows


def value_of(rows, no, label):
    """The amount of the row numbered `no` whose name starts with `label`."""
    found = [amount(r[-1]) for r in rows if len(r) >= 3 and r[0] == no and r[1].startswith(label)]
    if len(found) != 1:
        raise ValueError(f'row {no} {label}: {len(found)} matches')
    return found[0]


def split_row(text):
    """A row of a wide table drawn as a text line, "Бургас 156 501,8 151 120,1 …" → its cells; other text → [text]."""
    m = re.fullmatch(rf'(.*?\D)\s+((?:{AMOUNT}\s+)*{AMOUNT})', text)
    return [m.group(1).strip()] + re.findall(AMOUNT, m.group(2)) if m else [text]


def paragraph(items, para, start_words=''):
    """Index of the text line that starts paragraph `para` ("(2) Утвърждава …")."""
    for i, item in enumerate(items):
        if item['kind'] == 'text' and re.match(rf'^(Чл\. \d+\. )?\({para}\) ' + re.escape(start_words), item['text']):
            return i
    raise ValueError(f'paragraph ({para}) not found')


def text_of(items, start=0, stop=None):
    """The article's text lines from `start` to the first table (or `stop`), joined."""
    out = []
    for item in items[start:stop]:
        if item['kind'] == 'table':
            break
        if not is_page_number(item):
            out.append(item['text'])
    return clean(' '.join(out))
