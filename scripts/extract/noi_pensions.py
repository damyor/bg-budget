#!/usr/bin/env python3
"""Pension spending by fund and kind of pension (actuals), from the NSSI (НОИ) statistical yearbook „Пенсии“.

  python3 scripts/extract/noi_pensions.py --download   # fetch the yearbooks into data/cache/doo-pensions/ (cached)
  python3 scripts/extract/noi_pensions.py              # write data/sources/pensions/noi-pensions-<year>.parts.csv

Each year's yearbook (Excel, one workbook per chapter) gives the year's expenditure on pensions, in leva:
table 6.2 by fund, table 6.3 by fund and kind of pension, table 10.17 the Teachers' Pension Fund. The parts split
the reports' „Пенсии“ box (КФП function V, group А) into the five funds — with the ids the budget plans give them —
and each fund into kinds of pension. Leva are converted at 1.95583.

Checks, stopping on any failure: in table 6.3 each fund's kinds add up to the fund, and the funds and the transfers
of pension rights to the total; the funds of table 6.3 (with the transfers in fund „Пенсии“) equal table 6.2;
table 10.17's three lines add up to its total. See data/sources/pensions/README.md.
"""

import csv
import os
import re
import sys
import time
import urllib.request
import zipfile

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CACHE = os.path.join(ROOT, 'data', 'cache', 'doo-pensions')
OUT = os.path.join(ROOT, 'data', 'sources', 'pensions')
BGN = 1.95583
YEARBOOKS = {
    2024: 'https://www.noi.bg/wp-content/uploads/Yearbook_Pensions_2024.zip',
    2025: 'https://www.noi.bg/wp-content/uploads/Yearbook_Pensions_2025_Excel.zip',
}


def download():
    os.makedirs(CACHE, exist_ok=True)
    for year, url in YEARBOOKS.items():
        path = os.path.join(CACHE, url.rsplit('/', 1)[1])
        if not os.path.exists(path):
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (budget-research)'})
            with urllib.request.urlopen(req, timeout=120) as r, open(path, 'wb') as f:
                f.write(r.read())
            time.sleep(3)
        folder = os.path.join(CACHE, f'yearbook{year}')
        if not os.path.isdir(folder):
            with zipfile.ZipFile(path) as z:
                z.extractall(folder)


def sheet(year, chapter, table):
    path = os.path.join(CACHE, f'yearbook{year}', f'CHAPT#{chapter}-{year}.xlsx')
    wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    ws = next(w for w in wb.worksheets if w.title.startswith(f'{table}-{year}') or w.title.startswith(f'{table}_'))
    return [[c for c in row] for row in ws.iter_rows(values_only=True)]


def norm(s):
    return re.sub(r'\s+', ' ', str(s or '')).strip()


def table_63(year):
    """Rows of table 6.3 for the year: (fund, label, leva), fund = 'I'…'IV' or 'T' (transfers)."""
    rows = sheet(year, 6, '6.3')
    header = next(r for r in rows if any(norm(c) == str(year) for c in r))
    col = next(i for i, c in enumerate(header) if norm(c) == str(year))
    out, fund = [], None
    for r in rows:
        label = next((norm(c) for c in r if isinstance(c, str) and re.match(r'^[IVІ]+\.|^\d+\.|^[AАБВB]\.|^Трансфер|^Разход', norm(c))), None)
        if not label:
            continue
        value = r[col]
        # Roman numerals are typed with Latin and Cyrillic "I" alike.
        m = re.match(r'^(IV|III|II|I)\. Фонд', label.replace('І', 'I'))
        if m:
            fund = m.group(1)
            out.append((fund, 'total', value or 0))
        elif label.startswith('Трансфер'):
            out.append(('T', 'transfers', value or 0))
        elif label.startswith('Разход за пенсии - общо'):
            out.append(('', 'grand total' if 'трансфери' in label else 'total pensions', value or 0))
        elif fund:
            out.append((fund, label, value or 0))
    return out


def table_62(year):
    rows = sheet(year, 6, '6.2')
    funds = {}
    for r in rows:
        label = norm(r[0])
        m = re.match(r'^(IV|III|II|I)\. Фонд', label.replace('І', 'I'))
        if m and isinstance(r[1], (int, float)):
            funds[m.group(1)] = r[1]
    return funds


def table_1017(year):
    rows = sheet(year, 10, '10.17')
    out = {}
    for r in rows:
        label = norm(r[0])
        if label == 'Общо' and 'total' not in out:
            out['total'] = r[1]
        elif label.startswith('1. Пенсии от УПФ'):
            out['pensions'] = r[1]
        elif label.startswith('2. Добавка по чл.69'):
            out['supplements'] = r[1]
        elif label.startswith('3. Добавка за чужда помощ'):
            out['assistance'] = r[1]
    return out


def check(ok, what):
    if not ok:
        sys.exit(f'check failed: {what}')


def pick(rows, fund, pattern):
    hits = [v for f, label, v in rows if f == fund and re.search(pattern, label)]
    check(len(hits) == 1, f'fund {fund}: one row matching {pattern!r} (found {len(hits)})')
    return hits[0]


NOTE_SURVIVORS = (
    'Включително наследствените пенсии, които НОИ отчита към този вид пенсия.',
    "Including the survivors' pensions, which the NSSI counts under this kind of pension.",
)


def parts(year):
    rows = table_63(year)
    funds62 = table_62(year)
    t = table_1017(year)
    kinds = lambda fund: [v for f, label, v in rows if f == fund and label != 'total']
    total = {f: v for f, label, v in rows if label == 'total'}
    transfers = pick(rows, 'T', 'transfers')
    for f in ('I', 'II', 'III'):
        check(abs(sum(kinds(f)) - total[f]) < 1, f'6.3 fund {f}: kinds add up to {total[f]}')
    # Fund IV: A (labour pensions: three rows) and Б (Art. 69 persons: one row) are subtotals of the rows under them.
    iv = [(label, v) for f, label, v in rows if f == 'IV' and label != 'total']
    sub_a = next(v for label, v in iv if label.startswith('А.') or label.startswith('A.'))
    sub_b = next(v for label, v in iv if label.startswith('Б.'))
    check(abs(sub_a + sub_b - total['IV']) < 1, '6.3 fund IV: А + Б')
    grand = next(v for f, label, v in rows if label == 'grand total')
    check(abs(sum(total.values()) + transfers - grand) < 1, '6.3: funds + transfers = total')
    check(abs(funds62['I'] - total['I'] - transfers) < 1, '6.2 fund I = 6.3 fund I + transfers')
    for f in ('II', 'III', 'IV'):
        check(abs(funds62[f] - total[f]) < 1, f'6.2 fund {f} = 6.3')
    check(abs(t['pensions'] + t['supplements'] + t['assistance'] - t['total']) < 1, '10.17 adds up')

    I = lambda p: pick(rows, 'I', p)
    earlier = sum(I(p) for p in (r'^3\. .*ЗПЗСК', r'^4\. .*ЗПЗСК', r'^5\. .*СВОК', r'^6\. .*СВОК', r'^7\. Частни занаятчии'))
    III = lambda p: pick(rows, 'III', p)
    other_iii = sum(III(p) for p in (r'Поборнически', r'отм\.чл\.28', r'чл\.30 ?А', r'особени заслуги', r'частни земеделски', r'отделен указ', r'^[AА]\. Добавки', r'^[BВ]\. Добавки'))
    ds = f'report-{year}'
    eur = lambda v: f'{v / BGN:.2f}'
    out = [
        (ds, 's-pensions', 's-pen-labour', 'Пенсии за стаж и възраст, инвалидност и наследствени (фонд „Пенсии“)', 'Old-age, disability & survivor pensions (Pensions fund)', eur(total['I'] + transfers), '', ''),
        (ds, 's-pen-labour', 's-pen-labour.old-age', 'Пенсии за осигурителен стаж и възраст', 'Old-age pensions (insurance service and age)', eur(I(r'^2\. Пенсии за осигурителен стаж и възраст$')), *NOTE_SURVIVORS),
        (ds, 's-pen-labour', 's-pen-labour.disability', 'Пенсии за инвалидност поради общо заболяване', 'Disability pensions (general illness)', eur(I(r'^1\. Инвалидност поради общо заболяване$')), *NOTE_SURVIVORS),
        (ds, 's-pen-labour', 's-pen-labour.one-off', 'Еднократни допълнителни суми към пенсиите', 'One-off supplements to pensions', eur(I(r'Еднократна допълнителна сума')),
         'Великденската и коледната добавка за годината (по постановления на Министерския съвет) и суми за минали години.',
         'The Easter and Christmas supplements of the year (set by Council of Ministers decrees) and amounts for past years.'),
        (ds, 's-pen-labour', 's-pen-labour.earlier-schemes', 'Пенсии по ЗПЗСК, СВОК на ТПК и на частни занаятчии, търговци и др.', 'Pensions under the former cooperative schemes and of private craftsmen and traders', eur(earlier),
         'Пенсии за осигурителен стаж и възраст и за инвалидност по Закона за пенсиите на земеделските стопани кооператори (ЗПЗСК) и СВОК на ТПК и пенсии на частни занаятчии, търговци и др. (пет реда на таблица 6.3).',
         "Old-age and disability pensions under the Cooperative Farmers' Pensions Act (ЗПЗСК) and the СВОК of the production cooperatives, and pensions of private craftsmen, traders etc. (five rows of table 6.3)."),
        (ds, 's-pen-labour', 's-pen-labour.transfers', 'Трансфер за прехвърляне на пенсионни права', 'Transfers of pension rights', eur(transfers),
         'Капиталов трансфер за прехвърляне на пенсионни права към пенсионните схеми на ЕС, ЕЦБ и ЕИБ.', 'Capital transfers of pension rights to the pension schemes of the EU, the ECB and the EIB.'),
        (ds, 's-pensions', 's-pen-art69', 'Пенсии на военни, полицаи и др. (фонд по чл. 69 КСО)', 'Pensions of military, police etc. (Art. 69 fund)', eur(total['II']),
         'Пенсии на военнослужещи, служители на МВР, ДАНС, съдебни служители по чл. 69 от Кодекса за социално осигуряване.', 'Pensions of armed forces, interior ministry, security services and other staff under Art. 69 of the Social Security Code.'),
        (ds, 's-pen-art69', 's-pen-art69.old-age', 'Пенсии за осигурителен стаж и възраст', 'Old-age pensions (insurance service and age)', eur(pick(rows, 'II', r'^2\. Пенсии за осигурителен стаж и възраст$')), *NOTE_SURVIVORS),
        (ds, 's-pen-art69', 's-pen-art69.disability', 'Пенсии за инвалидност поради общо заболяване', 'Disability pensions (general illness)', eur(pick(rows, 'II', r'^1\. Инвалидност поради общо заболяване$')), *NOTE_SURVIVORS),
        (ds, 's-pensions', 's-pen-noncontrib', 'Пенсии, несвързани с трудова дейност', 'Non-contributory pensions', eur(total['III']),
         'Социални пенсии за старост и инвалидност и други пенсии, финансирани от държавния бюджет.', 'Social old-age and disability pensions and other pensions funded by the state budget.'),
        (ds, 's-pen-noncontrib', 's-pen-noncontrib.social-disability', 'Социални пенсии за инвалидност', 'Social disability pensions', eur(III(r'Социални пенсии за инвалидност')), '', ''),
        (ds, 's-pen-noncontrib', 's-pen-noncontrib.social-old-age', 'Социални пенсии за старост', 'Social old-age pensions', eur(III(r'Социални пенсии за старост')), '', ''),
        (ds, 's-pen-noncontrib', 's-pen-noncontrib.military-disability', 'Пенсии за военна инвалидност', 'Military disability pensions', eur(III(r'военна инвалидност')), '', ''),
        (ds, 's-pen-noncontrib', 's-pen-noncontrib.repressed', 'Добавки към пенсиите по чл. 9 от ЗПГРРЛ', 'Supplements for politically repressed persons', eur(III(r'^Б\. Добавка по чл\. 9')),
         'Добавки към пенсиите на репресираните лица по чл. 9 от Закона за политическа и гражданска реабилитация на репресирани лица.', 'Supplements to the pensions of repressed persons under Art. 9 of the Political and Civil Rehabilitation of Repressed Persons Act.'),
        (ds, 's-pen-noncontrib', 's-pen-noncontrib.personal', 'Персонални пенсии', 'Personal pensions', eur(III(r'Персонални пенсии')), '', ''),
        (ds, 's-pen-noncontrib', 's-pen-noncontrib.civil-disability', 'Пенсии за гражданска инвалидност', 'Civil disability pensions', eur(III(r'гражданска инвалидност')), '', ''),
        (ds, 's-pen-noncontrib', 's-pen-noncontrib.other', 'Други пенсии и добавки, несвързани с трудова дейност', 'Other non-contributory pensions and supplements', eur(other_iii),
         'Пенсии за старост (поборнически), народни, за особени заслуги, за старост на частни земеделски стопани, с отделен указ и добавки към пенсиите на участниците във войните и по чл. 4 от ЗУНТОПБГ (осем реда на таблица 6.3).',
         'Old-age (veterans of the liberation struggles), national, special-merit, private farmers\' and individually decreed pensions, and supplements for war veterans and under Art. 4 of the ЗУНТОПБГ (eight rows of table 6.3).'),
        (ds, 's-pensions', 's-pen-accident', 'Пенсии за трудова злополука и професионална болест', 'Work-accident & occupational-disease pensions', eur(total['IV']),
         'Пенсии за инвалидност поради трудова злополука и професионална болест, включително наследствените.', "Disability pensions due to a work accident or occupational disease, survivors' pensions included."),
        (ds, 's-pensions', 's-pen-teachers', 'Учителски пенсионен фонд', "Teachers' Pension Fund", eur(t['total']), '', ''),
        (ds, 's-pen-teachers', 's-pen-teachers.pensions', 'Пенсии от Учителския пенсионен фонд', "Teachers' Pension Fund pensions", eur(t['pensions']),
         'Пенсии по чл. 69в, ал. 2 и 4 от КСО за учители, пенсионирани преди възрастта за пенсия.', 'Pensions under Art. 69в(2) and (4) of the Social Security Code for teachers who retire before the pension age.'),
        (ds, 's-pen-teachers', 's-pen-teachers.supplements', 'Добавки от Учителския пенсионен фонд', "Supplements from the Teachers' Pension Fund", eur(t['supplements']),
         'Добавка по чл. 69в, ал. 3 от КСО към пенсията на учителите.', "Supplement under Art. 69в(3) of the Social Security Code to teachers' pensions."),
    ]
    for parent in ('s-pen-labour', 's-pen-art69', 's-pen-noncontrib'):
        whole = next(float(r[5]) for r in out if r[2] == parent)
        part = sum(float(r[5]) for r in out if r[1] == parent)
        check(abs(whole - part) < 1, f'{year} {parent}: the kinds ({part:,.2f}) add up to the fund ({whole:,.2f})')
    fund_sum = total['I'] + total['II'] + total['III'] + total['IV'] + transfers + t['total']
    print(f'{year}: funds and Teachers\' Pension Fund {fund_sum:,.0f} BGN = €{fund_sum / BGN:,.0f}')
    return out


def main():
    if '--download' in sys.argv:
        download()
        return
    os.makedirs(OUT, exist_ok=True)
    for year in YEARBOOKS:
        path = os.path.join(OUT, f'noi-pensions-{year}.parts.csv')
        with open(path, 'w', newline='', encoding='utf-8') as f:
            w = csv.writer(f, lineterminator='\n')
            w.writerow(['dataset', 'parent', 'id', 'name_bg', 'name_en', 'value_eur', 'kind_bg', 'kind_en', 'note_bg', 'note_en'])
            for r in parts(year):
                # Without a kind, a row would take the name of the report's level („Вид разход“: an economic split).
                kind = ('Фонд', 'Fund') if r[1] == 's-pensions' else ('Трансфер', 'Transfer') if r[2].endswith('.transfers') else ('Вид пенсия', 'Kind of pension')
                w.writerow([*r[:6], *kind, *r[6:]])
        print('wrote', os.path.relpath(path, ROOT))


if __name__ == '__main__':
    main()
