#!/usr/bin/env python3
"""Social-security cash benefits by kind (actuals), from the NSSI's (НОИ) statistical report on the ДОО budget.

  python3 scripts/extract/noi_benefits.py --download   # fetch the reports into data/cache/doo-pensions/ (cached)
  python3 scripts/extract/noi_benefits.py              # write data/sources/doo-benefits/noi-benefits-<year>.parts.csv

The „Статистически отчет за изпълнението на консолидирания бюджет на ДОО“ (Excel, leva) lists the year's spending
by ЕБК paragraph. Its group Б „Социални помощи и обезщетения“ (§ 42-01) is split into the kinds of benefit the
budget plans use (`s-ben-sickness`, `s-ben-maternity` … — scripts/budgetPlan.ts), as parts of the reports'
„Социалноосигурителни фондове“ box under „Социални помощи и обезщетения“. Leva are converted at 1.95583.

Checks, stopping on any failure: every § 42-01 row of the group is a known top-level paragraph or a sub-row of
one; the subtotals (§ 42-01-40, -70, -88, -90) equal their sub-rows; the top-level rows add up to the group
(§ 42-00-00). See data/sources/doo-benefits/README.md.
"""

import csv
import os
import re
import sys
import time
import urllib.request

import xlrd

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CACHE = os.path.join(ROOT, 'data', 'cache', 'doo-pensions')
OUT = os.path.join(ROOT, 'data', 'sources', 'doo-benefits')
BGN = 1.95583
REPORTS = {
    2024: 'https://www.noi.bg/wp-content/uploads/Statisticheski_otchet_2024.xls',
    2025: 'https://www.noi.bg/wp-content/uploads/Statisticheski-otchet_2025.xls',
}

KIND = ('Вид обезщетение', 'Kind of benefit')
# Part → (top-level § 42-01 items, name, note). Ids and names are the plans' (scripts/budgetPlan.ts).
PARTS = [
    ('s-ben-sickness', ['01', '02', '03'], 'Болнични', 'Sick pay', '',
     'Обезщетения за временна неработоспособност поради общо заболяване, гледане на болен член от семейството и карантина и нетрудови злополуки (§ 42-01-01 до 03).',
     'Benefits for temporary incapacity for work due to general illness, caring for a sick family member or quarantine, and non-work accidents (§ 42-01-01 to 03).'),
    ('s-ben-maternity', ['06', '07'], 'Майчинство (бременност и раждане)', 'Maternity (pregnancy & birth)', '42-01-06',
     'Парични обезщетения за бременност и раждане (§ 42-01-06; § 42-01-07, трудоустрояване поради бременност и кърмене, когато има такива).',
     'Cash benefits for pregnancy and childbirth (§ 42-01-06; § 42-01-07, reassignment during pregnancy and breastfeeding, where there are any).'),
    ('s-ben-childcare', ['08'], 'Отглеждане на дете до 2 години', 'Childcare until age 2', '42-01-08',
     'Парични обезщетения за отглеждане на дете до 2-годишна възраст (§ 42-01-08).',
     'Cash benefits for raising a child until age 2 (§ 42-01-08).'),
    ('s-ben-unemployment', ['70'], 'Обезщетения за безработица', 'Unemployment benefits', '42-01-70',
     'Обезщетения за безработица по КСО, обезщетения по чл. 230 и 231 от ЗОВСРБ и еднократни суми по чл. 47 от Закона за насърчаване на заетостта (§ 42-01-70).',
     'Unemployment benefits under the Social Security Code, benefits under Art. 230–231 of the Defence and Armed Forces Act and lump sums under Art. 47 of the Employment Promotion Act (§ 42-01-70).'),
    ('s-ben-rehab', ['88'], 'Профилактика и рехабилитация', 'Prevention & rehabilitation', '42-01-88',
     'Парични помощи за профилактика и рехабилитация — за храна, нощувки и медицински процедури (§ 42-01-88).',
     'Cash aid for prevention and rehabilitation — meals, accommodation and medical procedures (§ 42-01-88).'),
    ('s-ben-accident', ['40'], 'Трудова злополука и професионална болест', 'Work accidents & occupational disease', '42-01-40',
     'Обезщетения за временна неработоспособност, изследване и санаторно-курортно лечение поради трудова злополука и професионална болест (§ 42-01-40).',
     'Benefits for temporary incapacity, medical examination and spa treatment due to a work accident or occupational disease (§ 42-01-40).'),
    ('s-ben-adoption', ['09', '17'], 'Осиновяване и отпуск на бащата', 'Adoption & paternity leave', '',
     'Обезщетения за осиновяване на дете до 5-годишна възраст (§ 42-01-09) и за отглеждане на дете до 8-годишна възраст от бащата (осиновителя) (§ 42-01-17).',
     'Benefits for adopting a child under 5 (§ 42-01-09) and for the father (adoptive father) raising a child under 8 (§ 42-01-17).'),
    ('s-ben-noi-other', ['90', '50', '98'], 'Други обезщетения и помощи', 'Other benefits', '',
     'Еднократни помощи при смърт (§ 42-01-90), обезщетения за трудоустрояване при временно намалена работоспособност (§ 42-01-50) и парична помощ за инвалидност без право на пенсия (§ 42-01-98).',
     'One-off death grants (§ 42-01-90), benefits for reassignment to lighter work during reduced capacity (§ 42-01-50) and cash aid for disability without a pension entitlement (§ 42-01-98).'),
]
# Subtotal → its sub-rows (sub-rows of sub-rows, e.g. § 42-01-11 under -10, are listed too and not summed).
SUBTOTALS = {
    '40': ['41', '42', '43', '44', '45', '46', '47', '48', '49'],
    '70': ['71', '74', '75'],
    '88': ['10', '30', '84', '66', '80'],
    '90': ['91', '92', '93', '94'],
}
NESTED = {'72/73', '11', '12', '13', '31', '32', '33', '85', '86', '87', '20', '21', '22', '23', '25', '26', '27', '28',
          '60', '61', '62', '63', '81', '82', '83'}


def download():
    os.makedirs(CACHE, exist_ok=True)
    for url in REPORTS.values():
        path = os.path.join(CACHE, url.rsplit('/', 1)[1])
        if not os.path.exists(path):
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (budget-research)'})
            with urllib.request.urlopen(req, timeout=120) as r, open(path, 'wb') as f:
                f.write(r.read())
            time.sleep(3)


def check(ok, what):
    if not ok:
        sys.exit(f'check failed: {what}')


def group_b(year):
    """§ 42 rows of group Б: {item: leva}, item = the last part of the paragraph code ('01', '72/73' …), and the total."""
    book = xlrd.open_workbook(os.path.join(CACHE, REPORTS[year].rsplit('/', 1)[1]))
    rows, total, on = {}, None, False
    for sh in book.sheets():
        # The amounts are in the column headed „Отчет за <year> г.“.
        col = next((c for r in range(min(8, sh.nrows)) for c in range(sh.ncols)
                    if re.sub(r'\s+', ' ', str(sh.cell_value(r, c))).strip() == f'Отчет за {year} г.'), None)
        for r in range(sh.nrows):
            label = re.sub(r'\s+', ' ', str(sh.cell_value(r, 0))).strip()
            code = re.sub(r'[\s-]+', '-', str(sh.cell_value(r, 1)).strip())
            if 'ГРУПА Б' in label:
                on = True
            elif 'ГРУПА В' in label:
                on = False
            if not on or not re.match(r'^4[12]-', code):
                continue
            check(col is not None, f'{year} {sh.name}: column „Отчет за {year} г.“')
            value = sh.cell_value(r, col)
            value = float(value) if value not in ('', None) else 0.0
            if code == '42-00-00':
                total = value
            elif code.startswith('42-01-') and code != '42-01-00':
                rows[code[6:]] = value
            elif code == '41-01-27':  # a typo in the report for § 42-01-27 (a sub-row of rehabilitation)
                rows['27'] = value
    check(total is not None, f'{year}: § 42-00-00 found')
    return rows, total


def parts(year):
    rows, total = group_b(year)
    top = {i for _, items, *_ in PARTS for i in items}
    subs = {i for s in SUBTOTALS.values() for i in s}
    unknown = set(rows) - top - subs - NESTED
    check(not unknown, f'{year}: unknown § 42-01 items {sorted(unknown)}')
    for parent, children in SUBTOTALS.items():
        check(abs(rows.get(parent, 0) - sum(rows.get(c, 0) for c in children)) < 1, f'{year}: § 42-01-{parent} = its sub-rows')
    check(abs(sum(rows.get(i, 0) for i in top) - total) < 1, f'{year}: the top-level rows add up to § 42-00-00 ({total:,.0f})')
    ds = f'report-{year}'
    out = []
    for pid, items, bg, en, code, note_bg, note_en in PARTS:
        leva = sum(rows.get(i, 0) for i in items)
        out.append([ds, 's-benefits.social-security', pid, bg, en, f'{leva / BGN:.2f}', code, *KIND, note_bg, note_en])
    print(f'{year}: group Б {total:,.0f} BGN = €{total / BGN:,.0f}')
    return out


def main():
    if '--download' in sys.argv:
        download()
        return
    os.makedirs(OUT, exist_ok=True)
    for year in REPORTS:
        path = os.path.join(OUT, f'noi-benefits-{year}.parts.csv')
        with open(path, 'w', newline='', encoding='utf-8') as f:
            w = csv.writer(f, lineterminator='\n')
            w.writerow(['dataset', 'parent', 'id', 'name_bg', 'name_en', 'value_eur', 'code', 'kind_bg', 'kind_en', 'note_bg', 'note_en'])
            w.writerows(parts(year))
        print('wrote', os.path.relpath(path, ROOT))


if __name__ == '__main__':
    main()
