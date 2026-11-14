#!/usr/bin/env python3
"""Interest by kind of debt and the EU contribution by own resource, as parts of the КФП boxes.

  python3 scripts/extract/interest_eu.py            # write data/sources/interest-eu/*.parts.csv
  python3 scripts/extract/interest_eu.py --verify   # also check every figure against the cached documents (macOS textutil)

The figures are typed in from the documents (a few lines of text and one small table each); --verify finds each of
them, as printed, in the cached copy (data/cache/interest-eu/, data/cache/zdb-*/):

- the Ministry of Finance's reports on the execution of the State Budget 2024 and 2025 (attachment 2 to РМС
  № 673/2025 and attachment 3 to РМС № 737/2026, strategy.bg): the State Budget's interest on external and
  domestic debt, and Bulgaria's contribution to the EU budget by own resource (the law's amount and the actual);
- the State Budget Acts 2024–2026 and the 2027 draft, art. 1(2), line 1.3 „Лихви“: the State Budget's interest
  in the plans;
- the medium-term budget forecasts that are the motives to the budget bills: the State Budget's planned interest
  on external and domestic debt, where the forecast gives it for the plan year.

Leva are converted at 1.95583. See data/sources/interest-eu/README.md.
"""

import csv
import json
import os
import re
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'data', 'sources', 'interest-eu')
CACHE = os.path.join(ROOT, 'data', 'cache')
BGN = 1.95583
HEADER = ['dataset', 'parent', 'id', 'name_bg', 'name_en', 'value_eur', 'code', 'kind_bg', 'kind_en', 'note_bg', 'note_en']

DEBT = ('Вид дълг', 'Kind of debt')
OWN = ('Собствен ресурс', 'Own resource')
SPENT_BY = ('Кой харчи', 'Spent by')

# Own resources: id, name, note, and the label of the report's table row.
RESOURCES = [
    ('g-eu.gni', 'Вноска на база брутен национален доход', 'GNI-based own resource',
     'Изравнителният ресурс: всяка държава членка внася еднакъв процент от брутния си национален доход, колкото да покрие останалата част от бюджета на ЕС.',
     'The balancing resource: every member state pays the same rate of its gross national income, as much as the rest of the EU budget needs.',
     'Вноска на база брутен национален доход'),
    ('g-eu.vat', 'Вноска на база данък върху добавената стойност', 'VAT-based own resource',
     'Еднаква ставка върху хармонизираната основа на ДДС на всяка държава членка.',
     "A uniform rate applied to each member state's harmonised VAT base.",
     'Вноска на база данък върху добавената стойност'),
    ('g-eu.tor', 'Вноска от традиционни собствени ресурси – мита', 'Traditional own resources (customs duties)',
     'Митата, събрани при внос от страни извън ЕС, без частта, която държавата задържа за разходите по събирането им.',
     'Customs duties collected on imports from outside the EU, less the share the country keeps for the cost of collecting them.',
     'Вноска от традиционни собствени ресурси – мита'),
    ('g-eu.plastics', 'Вноска на база нерециклирани отпадъци от опаковки от пластмаса', 'Non-recycled plastic packaging waste own resource',
     'Вноска според количеството пластмасови опаковки, които не са рециклирани.',
     'A contribution by the quantity of plastic packaging waste that is not recycled.',
     'Вноска на база нерециклирани отпадъци от опаковки от пластмаса'),
    ('g-eu.corrections', 'Брутни намаления за пет държави и корекция за свобода, сигурност и правосъдие', 'Gross reductions for five countries and the justice and home affairs correction',
     'Участие във финансирането на брутното намаление за Австрия, Дания, Германия, Нидерландия и Швеция и вноска за корекция за неучастие на съответни държави членки в някои политики за свобода, сигурност и правосъдие.',
     "Bulgaria's share in financing the gross reductions for Austria, Denmark, Germany, the Netherlands and Sweden, and the correction for member states that do not take part in some freedom, security and justice policies.",
     'Участие във финансирането на брутното намаление'),
]

# The reports: interest (million BGN, as printed) and the EU contribution table (law's amount, actual; million BGN).
REPORTS = {
    2025: {
        'doc': 'interest-eu/26RH737pr.3.docx',
        'interest': {'total': '1 386,5', 'external': '1 178,4', 'domestic': '208,1'},
        'interest_text': [
            'Лихвените плащания по държавния бюджет за 2025 г. са в общ размер на 1 386,5 млн. лв.',
            'лихви по външни заеми, които за отчетния период са в размер на 1 178,4 млн. лв.',
            'Лихвите по вътрешни заеми по държавния бюджет за 2025 г. са в размер на 208,1 млн. лв.',
        ],
        'domestic_note': (
            'Основно лихви по ДЦК на вътрешния пазар: 151,1 млн. лв. лихви и 65,8 млн. лв. отстъпки, намалени с 8,8 млн. лв. премии над номинала.',
            'Mainly interest on government securities sold on the domestic market: 151.1 million leva of interest and 65.8 million of discounts, less 8.8 million of premiums above par.',
        ),
        'external_note': (
            'Лихви по външни заеми по централния бюджет (1 165,2 млн. лв.) и по държавните инвестиционни заеми, управлявани от министерства и ведомства (13,3 млн. лв.).',
            'Interest on external loans of the central budget (1,165.2 million leva) and on the state investment loans run by ministries and agencies (13.3 million).',
        ),
        'eu': {'g-eu.gni': ('1 162,8', '1 162,8'), 'g-eu.vat': ('328,7', '328,7'), 'g-eu.plastics': ('154,4', '154,4'),
               'g-eu.tor': ('270,5', '285,9'), 'g-eu.corrections': ('104,1', '104,1'), 'total': ('2 020,5', '2 036,0')},
        'plan_note': (
            'Разпределението на заложената в закона вноска по видове собствени ресурси след преразпределенията на Министерството на финансите през юни и ноември 2025 г.',
            "The law's contribution as the Ministry of Finance allocated it by own resource after its reallocations of June and November 2025.",
        ),
    },
    2024: {
        'doc': 'interest-eu/25RH673pr.2.doc',
        'interest': {'total': '953,4', 'external': '830,9', 'domestic': '122,5'},
        'interest_text': [
            'Лихвените плащания по държавния бюджет за 2024 г. са в общ размер на 953,4 млн. лв.',
            'лихви по външни заеми, които за отчетния период са в размер на 830,9 млн. лв.',
            'Лихвите по вътрешни заеми по държавния бюджет за 2024 г. са в размер на 122,5 млн. лв.',
        ],
        'domestic_note': (
            'Основно лихви по ДЦК на вътрешния пазар (включително 0,1 млн. лв. лихви на министерствата и ведомствата по вътрешни заеми).',
            'Mainly interest on government securities sold on the domestic market (including 0.1 million leva of ministries’ and agencies’ interest on domestic loans).',
        ),
        'external_note': (
            'Лихви по външни заеми по централния бюджет (814,1 млн. лв., в т.ч. 26,7 млн. лв. отстъпки) и по държавните инвестиционни заеми, управлявани от министерства и ведомства (16,8 млн. лв.).',
            'Interest on external loans of the central budget (814.1 million leva, of which 26.7 million discounts) and on the state investment loans run by ministries and agencies (16.8 million).',
        ),
        'eu': {'g-eu.gni': ('1 460,6', '896,2'), 'g-eu.vat': ('295,3', '252,5'), 'g-eu.plastics': ('114,5', '108,5'),
               'g-eu.tor': ('299,7', '247,2'), 'g-eu.corrections': ('100,9', '87,6'), 'total': ('2 271,1', '1 592,1')},
        'plan_note': (
            'Разпределението на заложената в закона вноска по видове собствени ресурси след преразпределението на Министерството на финансите през четвъртото тримесечие на 2024 г.',
            "The law's contribution as the Ministry of Finance allocated it by own resource after its reallocation in the fourth quarter of 2024.",
        ),
    },
}

# The State Budget Acts, art. 1(2), line 1.3 „Лихви“ (thousand BGN until 2025, thousand EUR from 2026).
LAWS = {
    'budget-2024': ('zdb-2024-interest', '966 835,0', 'BGN', 'zdb-2024/zdb-2024.html'),
    'budget-2025': ('zdb-2025-interest', '1 567 008,8', 'BGN', 'zdb-2025/zdb-2025.html'),
    'budget-2026': ('zdb-2026-interest', '1 030 666,2', 'EUR', 'zdb-2026/zdb-2026.html'),
    'budget-2027': ('zdb-2027-draft-interest', '1 396 089,2', 'EUR', 'zdb-2027-draft/PZDBRB-2027.pdf.stream.json'),
}

# The forecasts' sentence on interest for the plan year (million EUR): dataset → (file, document, external, domestic, total, text).
FORECASTS = {
    'budget-2027': ('mtbf-2027-2029-interest', 'mtbf-2027-2029/UMTBF-2027-2029-motivi.pdf', '1 228,7', '167,4', '1 396,1',
                    'през 2027 г. да достигнат до 1 396,1 млн. евро (1 228,7 млн. евро по външния и 167,4 млн. евро по вътрешния държавен дълг)'),
}


def num(s):
    return float(s.replace(' ', '').replace(',', '.'))


def eur(million_bgn):
    return f'{num(million_bgn) * 1e6 / BGN:.2f}'


def check(ok, what):
    if not ok:
        sys.exit(f'check failed: {what}')


def report_rows(year):
    r = REPORTS[year]
    i = r['interest']
    check(abs(num(i['external']) + num(i['domestic']) - num(i['total'])) < 0.05, f'{year}: external + domestic interest = total')
    eu = r['eu']
    for col, what in ((0, 'law'), (1, 'actual')):
        parts = sum(num(eu[k][col]) for k in eu if k != 'total')
        check(abs(parts - num(eu['total'][col])) <= 0.15, f'{year} EU contribution ({what}): own resources add up to the total')
    rows = [
        [f'report-{year}', 'g-interest.state', 'g-interest.state.external', 'Лихви по външния дълг', 'Interest on external debt',
         eur(i['external']), '', *DEBT, *r['external_note']],
        [f'report-{year}', 'g-interest.state', 'g-interest.state.domestic', 'Лихви по вътрешния дълг', 'Interest on domestic debt',
         eur(i['domestic']), '', *DEBT, *r['domestic_note']],
    ]
    for pid, bg, en, note_bg, note_en, _ in RESOURCES:
        rows.append([f'report-{year}', 'g-eu', pid, bg, en, eur(eu[pid][1]), '', *OWN, note_bg, note_en])
    for pid, bg, en, note_bg, note_en, _ in RESOURCES:
        rows.append([f'budget-{year}', 'g-eu', pid, bg, en, eur(eu[pid][0]), '', *OWN, f'{note_bg} {r["plan_note"][0]}', f'{note_en} {r["plan_note"][1]}'])
    return rows


def law_rows(dataset):
    name, amount, unit, _ = LAWS[dataset]
    value = num(amount) * 1000 / (BGN if unit == 'BGN' else 1)
    return name, [[dataset, 'g-interest', 'g-interest.state', 'Държавен бюджет (министерства и ведомства)', 'State budget (ministries & agencies)',
                   f'{value:.2f}', '', *SPENT_BY,
                   'Ред 1.3 „Лихви“ на държавния бюджет по чл. 1, ал. 2 от закона — основно лихвите по държавния дълг.',
                   'Line 1.3 “Interest” of the State Budget in art. 1(2) of the act — mainly the interest on government debt.']]


def forecast_rows(dataset):
    name, _, external, domestic, total, _ = FORECASTS[dataset]
    check(abs(num(external) + num(domestic) - num(total)) < 0.05, f'{dataset}: external + domestic interest = total')
    m = lambda v: f'{num(v) * 1e6:.2f}'
    return name, [
        [dataset, 'g-interest.state', 'g-interest.state.external', 'Лихви по външния дълг', 'Interest on external debt', m(external), '', *DEBT, '', ''],
        [dataset, 'g-interest.state', 'g-interest.state.domestic', 'Лихви по вътрешния дълг', 'Interest on domestic debt', m(domestic), '', *DEBT, '', ''],
    ]


def text_of(path):
    if path.endswith('.pdf'):
        import pdfplumber
        with pdfplumber.open(path) as pdf:
            return '\n'.join(p.extract_text() or '' for p in pdf.pages)
    if path.endswith('.json'):
        return json.dumps(json.load(open(path, encoding='utf-8')), ensure_ascii=False)
    if path.endswith('.html'):
        return open(path, encoding='utf-8', errors='replace').read()
    with tempfile.TemporaryDirectory() as tmp:
        out = os.path.join(tmp, 'doc.txt')
        subprocess.run(['textutil', '-convert', 'txt', '-output', out, path], check=True)
        return open(out, encoding='utf-8').read()


def flat(t):
    t = re.sub(r'<[^>]+>', ' ', t).replace('\xa0', ' ')
    return re.sub(r'\s+', ' ', t)


def verify():
    for year, r in REPORTS.items():
        t = flat(text_of(os.path.join(CACHE, r['doc'])))
        for s in r['interest_text']:
            check(s in t, f'{year}: „{s}“ in {r["doc"]}')
        table = t[t.index(f'Вноска на Република България в общия бюджет на ЕС за {year} г. – общо и по видове собствени ресурси'):]
        for pid, *_, label in RESOURCES:
            law, actual = r['eu'][pid]
            check(re.search(re.escape(label) + r'.{0,260}?' + re.escape(f' {law} {actual} '), table), f'{year}: {label} {law} / {actual}')
        law, actual = r['eu']['total']
        check(re.search(re.escape(f'ОБЩО ВНОСКА В ОБЩИЯ БЮДЖЕТ НА ЕС ЗА {year} г.') + r' ' + re.escape(f'{law} {actual}'), table), f'{year}: total {law} / {actual}')
        print(f'{year}: report figures found in {r["doc"]}')
    for dataset, (_, amount, _, doc) in LAWS.items():
        t = flat(text_of(os.path.join(CACHE, doc)))
        hits = re.findall(r'1\.3\.?"?,? "?Лихви"?,? "?([\d ]+,\d)', t)
        check(hits and all(h.strip() == amount for h in hits), f'{dataset}: line 1.3 „Лихви“ = {amount} in {doc} (found {hits})')
        print(f'{dataset}: 1.3 „Лихви“ {amount} found in {doc}')
    for dataset, (_, doc, *_, sentence) in FORECASTS.items():
        check(sentence in flat(text_of(os.path.join(CACHE, doc))), f'{dataset}: „{sentence}“ in {doc}')
        print(f'{dataset}: the interest sentence found in {doc}')


def write(name, rows):
    path = os.path.join(OUT, f'{name}.parts.csv')
    with open(path, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(HEADER)
        w.writerows(rows)
    print('wrote', os.path.relpath(path, ROOT))


def main():
    if '--verify' in sys.argv:
        verify()
    os.makedirs(OUT, exist_ok=True)
    for year in REPORTS:
        write(f'mof-report-{year}', report_rows(year))
    for dataset in LAWS:
        write(*law_rows(dataset))
    for dataset in FORECASTS:
        write(*forecast_rows(dataset))


if __name__ == '__main__':
    main()
