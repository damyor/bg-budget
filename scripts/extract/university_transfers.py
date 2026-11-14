#!/usr/bin/env python3
"""Extracts the transfers to each state university and to the Academy of Sciences
from the State Budget Act (State Gazette HTML, or a PDF such as the 2027 draft):
the Ministry of Education's transfers (2026, 2027: art. 16(4)) and the Ministry
of Defence's transfers to the military schools (2026, 2027: art. 11(4)).

  python3 scripts/extract/university_transfers.py data/cache/zdb-2026/zdb-2026.html \
      data/sources/budget-2026/state-budget-2026-university-transfers.csv
  python3 -P scripts/extract/university_transfers.py data/cache/zdb-2027-draft/PZDBRB-2027.pdf \
      data/sources/budget-2027/state-budget-2027-university-transfers.csv \
      data/sources/budget-2026/state-budget-2026-university-transfers.csv

Every list is checked against its printed "Всичко:" total. Ids, display names and
English names are hand-written: re-running keeps the ones already in the output
file, or takes them from an earlier year's file given as the third argument
(matched by the Bulgarian name); a name found in neither stops the script. Needs
bs4 and lxml (HTML) or pdfplumber (PDF, see zdb_pdf.py).
"""

import csv
import os
import re
import sys

from bs4 import BeautifulSoup

# Caption that precedes each table → the paying ministry's ЕБК code.
TABLES = [
    ('Определя трансферите от бюджета на Министерството на образованието и науката за Българската академия на науките и за държавните висши училища', '1700'),
    ('Определя трансферите от бюджета на Министерството на отбраната за държавните висши училища', '1200'),
]
COLUMNS = ['article', 'paragraph', 'from_unit_code', 'item_no', 'id', 'name_bg', 'short_bg', 'name_en', 'amount_kEUR']


def clean(text):
    return re.sub(r'\s+', ' ', text.replace(' ', ' ')).strip()


def amount(text):
    return float(clean(text).replace(' ', '').replace(',', '.'))


def article_of(caption):
    """The article ("Чл. 16.") and paragraph ("(4)") a caption belongs to."""
    para = re.match(r'^\((\d+)\)', clean(caption.get_text()))
    node = caption
    while node is not None:
        node = node.find_previous('p')
        m = re.match(r'^Чл\. (\d+)\.', clean(node.get_text())) if node is not None else None
        if m:
            return m.group(1), para.group(1) if para else ''
    raise ValueError('no article before the caption')


def extract(path):
    soup = BeautifulSoup(open(path, encoding='utf-8').read(), 'lxml')
    rows = []
    for caption_text, payer in TABLES:
        caption = soup.find(lambda tag: tag.name == 'p' and caption_text in clean(tag.get_text()))
        if caption is None:
            raise ValueError(f'caption not found: {caption_text}')
        article, paragraph = article_of(caption)
        table = caption.find_next('table')
        items, total = [], None
        for tr in table.find_all('tr'):
            cells = [clean(td.get_text()) for td in tr.find_all('td')]
            if len(cells) < 3:
                continue
            if cells[1].startswith('Всичко'):
                total = amount(cells[2])
            elif re.fullmatch(r'\d+\.', cells[0]):
                items.append({'article': article, 'paragraph': paragraph, 'from_unit_code': payer, 'item_no': cells[0].rstrip('.'),
                              'name_bg': cells[1], 'amount_kEUR': f'{amount(cells[2]):.1f}'})
        if total is None or round(sum(float(i['amount_kEUR']) for i in items), 1) != round(total, 1):
            raise ValueError(f'art. {article}({paragraph}): items do not add up to {total}')
        rows += items
    return rows


def extract_pdf(path):
    """The same lists from a PDF, in the Council of Ministers' version."""
    sys.path.insert(0, os.path.dirname(__file__))
    from zdb_pdf import articles, split_versions, stream, table_after, text_of

    government, _, _ = split_versions(stream(path))
    rows = []
    for caption_text, payer in TABLES:
        found = [(n, i) for n, items in articles(government).items() for i, item in enumerate(items)
                 if item['kind'] == 'text' and re.match(r'^\(\d+\) ', item['text']) and caption_text in text_of(items, i)]
        if len(found) != 1:
            raise ValueError(f'caption found {len(found)} times: {caption_text}')
        article, i = found[0]
        items = articles(government)[article]
        paragraph = re.match(r'^\((\d+)\)', items[i]['text']).group(1)
        table, _ = table_after(items, i)
        items_, total = [], None
        for cells in table:
            if cells[0].startswith('Всичко'):
                total = amount(cells[-1])
            elif len(cells) == 3 and re.fullmatch(r'\d+\.', cells[0]):
                items_.append({'article': str(article), 'paragraph': paragraph, 'from_unit_code': payer, 'item_no': cells[0].rstrip('.'),
                               'name_bg': cells[1], 'amount_kEUR': f'{amount(cells[2]):.1f}'})
        if total is None or round(sum(float(r['amount_kEUR']) for r in items_), 1) != round(total, 1):
            raise ValueError(f'art. {article}({paragraph}): items do not add up to {total}')
        rows += items_
    return rows


def main():
    source, target = sys.argv[1], sys.argv[2]
    rows = extract_pdf(source) if source.endswith('.pdf') else extract(source)
    old = {}
    for path in [p for p in (sys.argv[3] if len(sys.argv) > 3 else None, target) if p and os.path.exists(p)]:
        with open(path, newline='', encoding='utf-8') as f:
            old.update({r['name_bg']: r for r in csv.DictReader(f)})
    for r in rows:
        for col in ('id', 'short_bg', 'name_en'):
            r[col] = old.get(r['name_bg'], {}).get(col, '')
    if len(sys.argv) > 3 and any(not r['id'] for r in rows):
        raise ValueError(f'no id for: {", ".join(r["name_bg"] for r in rows if not r["id"])}')
    with open(target, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, COLUMNS, lineterminator='\n')
        w.writeheader()
        w.writerows(rows)
    for payer in ('1700', '1200'):
        part = [r for r in rows if r['from_unit_code'] == payer]
        print(f'{payer}: {len(part)} institutions, {sum(float(r["amount_kEUR"]) for r in part):,.1f} thousand EUR')


if __name__ == '__main__':
    main()
