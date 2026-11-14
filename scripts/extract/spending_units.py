#!/usr/bin/env python3
"""Extracts every first-level spending unit's expenditure by policy / functional
area (para. 2 of each unit's article) from a State Budget Act or bill published
as a PDF (the draft State Budget Act 2027), in the format of
data/sources/budget-<year>/state-budget-<year>-spending-units.csv.

  python3 -P scripts/extract/spending_units.py data/cache/zdb-2027-draft/PZDBRB-2027.pdf 2027 \
      data/sources/budget-2027/state-budget-2027-spending-units.csv

Uses the Council of Ministers' version of art. 1 and art. 2 (see zdb_pdf.py) and
prints the judiciary's own version for the record. Checks, stopping on any
failure: every unit's top-level areas add up to its "Всичко:" row, which equals
the unit's expenditure (para. 1, row II. РАЗХОДИ); every split area ("7.1.",
"7.2." …) equals the sum of its parts; art. 1(2) rows 5.2 and 5.3 (the reserves
of the judiciary and the National Assembly) equal the units' own reserves; all
units together stay below art. 1(2) II. РАЗХОДИ (the rest is the central budget:
interest, the disaster reserve …); and the judiciary's two versions differ in
art. 1(2) by exactly as much as in art. 2.
"""

import csv
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
from zdb_pdf import amount, articles, clean, fix_cyrillic, paragraph, r1, rows_between, split_versions, stream, table_after, text_of, value_of  # noqa: E402

COLUMNS = ['article', 'spending_unit', 'breakdown_type', 'row_no', 'policy_area_or_program', 'amount_thousand_EUR']


def unit_budget(items, year):
    """(unit name, para. 1 rows, para. 2 caption, para. 2 rows) of a unit's article."""
    m = re.match(rf'^Чл\. \d+\. \(1\) Приема бюджета на (.+?) за {year} г\., както следва:', text_of(items))
    if not m:
        raise ValueError(f'not a unit budget: {items[0]["text"][:100]}')
    p2 = paragraph(items, 2, 'Утвърждава')
    para1 = rows_between(items, 1, p2)
    rows, _ = table_after(items, p2)
    return fix_cyrillic(clean(m.group(1))), para1, items[p2]['text'], rows


def quotes(label):
    """„…” and „…" (closing quotes the draft mixes in) → „…“, as in the acts."""
    return re.sub(r'„([^„“”"]*)[”"]', r'„\1“', label)


def area_rows(article, rows):
    """(row_no, label, amount) of para. 2, without the header rows."""
    out = []
    for r in rows:
        if r in (['1', '2'], ['(хил. евро)']) or r[0] in ('№', 'Сума'):
            continue
        if len(r) == 1 and out and amount(r[0]) == out[-1][2]:
            continue  # a merged cell's amount drawn twice
        if len(r) == 3 and re.fullmatch(r'(\d+\.)+', r[0]):
            out.append((r[0], quotes(fix_cyrillic(r[1])), amount(r[2])))
        elif len(r) == 2 and (r[0].startswith('Всичко') or r[0].startswith('в т.ч.')):
            out.append(('', fix_cyrillic(r[0]), amount(r[1])))
        else:
            raise ValueError(f'art. {article}: unexpected row {r}')
    return out


def check_unit(article, unit, spending, areas):
    total = [a for no, l, a in areas if l.startswith('Всичко')]
    top = [(no, a) for no, l, a in areas if re.fullmatch(r'\d+\.', no)]
    if len(total) != 1 or r1(sum(a for _, a in top)) != r1(total[0]) or r1(total[0]) != r1(spending):
        raise ValueError(f'art. {article} {unit}: areas {sum(a for _, a in top):,.1f}, "Всичко:" {total}, para. 1 II. {spending:,.1f}')
    for no, a in top:
        parts = [b for n, _, b in areas if n.startswith(no) and n != no]
        if parts and r1(sum(parts)) != r1(a):
            raise ValueError(f'art. {article} {unit}: the parts of {no} add up to {sum(parts):,.1f}, not {a:,.1f}')


def main():
    pdf, year, target = sys.argv[1], int(sys.argv[2]), sys.argv[3]
    government, judiciary, versions = split_versions(stream(pdf))
    arts = articles(government)

    # Art. 1 (2): the state budget's expenditure.
    a1 = arts[1]
    art1 = rows_between(a1, paragraph(a1, 2), paragraph(a1, 3))
    expenditure = value_of(art1, 'II.', 'РАЗХОДИ')
    reserves = {'съдебната власт': value_of(art1, '5.2.', 'По бюджета на съдебната власт'), 'Народното събрание': value_of(art1, '5.3.', 'По бюджета на Народното събрание')}
    interest = value_of(art1, '1.3.', 'Лихви')
    disaster = value_of(art1, '5.1.', 'По централния бюджет')

    out, units = [], []
    for article in sorted(arts):
        items = arts[article]
        if article < 2 or not re.match(rf'^Чл\. \d+\. \(1\) Приема бюджета на ', items[0]['text']):
            continue
        unit, para1, caption, rows = unit_budget(items, year)
        spending = value_of(para1, 'II.', 'РАЗХОДИ')
        areas = area_rows(article, rows)
        check_unit(article, unit, spending, areas)
        if unit in reserves:
            own = value_of(para1, '3.', 'Резерв за непредвидени')
            if r1(own) != r1(reserves[unit]):
                raise ValueError(f'{unit}: reserve {own}, art. 1(2) {reserves[unit]}')
        kind = 'functional_area' if 'функционални области' in caption else 'policy_or_program'
        units.append((article, unit, spending))
        out += [[article, unit, kind, no, label, f'{a:.1f}'] for no, label, a in areas]

    if [a for a, _, _ in units] != list(range(2, 2 + len(units))):
        raise ValueError(f'unit articles are not consecutive: {[a for a, _, _ in units]}')
    all_units = sum(s for _, _, s in units)
    rest = expenditure - all_units
    if not rest > interest + disaster:
        raise ValueError(f'the units ({all_units:,.1f}) leave less than interest and the disaster reserve of art. 1(2) II. ({expenditure:,.1f})')

    # The judiciary's own version (Supreme Judicial Council): art. 1(2) II. and art. 2 differ by the same amount.
    if versions:
        jarts = articles(judiciary)
        j1 = rows_between(jarts[1], paragraph(jarts[1], 2), paragraph(jarts[1], 3))
        _, jpara1, _, jrows = unit_budget(jarts[2], year)
        jspending = value_of(jpara1, 'II.', 'РАЗХОДИ')
        jexp = value_of(j1, 'II.', 'РАЗХОДИ')
        cm_jud = next(s for _, u, s in units if u == 'съдебната власт')
        if r1(jexp - expenditure) != r1(jspending - cm_jud):
            raise ValueError(f'judiciary versions: art. 1(2) differs by {jexp - expenditure:,.1f}, art. 2 by {jspending - cm_jud:,.1f}')
        jareas = area_rows(2, jrows)
        print(f'Judiciary\'s own version (not used): art. 2 expenditure {jspending:,.1f}, art. 1(2) II. {jexp:,.1f}, art. 1(1) I. '
              f'{value_of(rows_between(jarts[1], 0, paragraph(jarts[1], 2)), "I.", "ПРИХОДИ"):,.1f}; areas: '
              + '; '.join(f'{no} {l} {a:,.1f}' for no, l, a in jareas if re.fullmatch(r'\d+\.', no)))

    os.makedirs(os.path.dirname(target), exist_ok=True)
    with open(target, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(COLUMNS)
        w.writerows(out)
    print(f'{len(units)} spending units (art. {units[0][0]}–{units[-1][0]}), {len(out)} rows; expenditure {all_units:,.1f} thousand EUR; '
          f'art. 1(2) II. {expenditure:,.1f}, of which the central budget {rest:,.1f} (interest {interest:,.1f}, disaster reserve {disaster:,.1f})')
    print(f'  → {target}')


if __name__ == '__main__':
    main()
