"""Natural persons among beneficiaries, payees and suppliers: they are never named on the site.

Used by scripts/extract/eu_funds.py (ИСУН projects), scripts/extract/cap.py (farm subsidies) and
scripts/extract/procurement.py (contract suppliers), and run as a program by scripts/extract/sebra.ts (SEBRA
payees), so that every list follows the same rules. A beneficiary is treated as a natural person when the source
says so (no company number, a separate surname) and also when its name is a person's — a registered farmer
("ЗП …"), or a given name followed by a surname with nothing that marks an organisation. The rules err on the side of
hiding.

Sole traders ("ЕТ …", whose firm carries the owner's name) are told apart from persons (kind_of). By default a list
leaves them out too — the strict rule of the EU-funds, farm-subsidy and procurement lists. The one option of the rule,
`name_sole_traders` (unnamed), names them: the SEBRA payment lists do, as the official open data does, while names
that are only a person's stay hidden there as well.

Given names are learnt from the sources' own natural persons (the farm register's first-name column, the old farm
files' names, ИСУН's natural persons, which it shows by first name only) and kept in
data/sources/places/given-names.csv, so that every extractor uses the same list.

  python3 scripts/extract/persons.py [--name-sole-traders] < names.txt
  # one name a line in → a line out: its kind ("sole-trader", "person" or "" for an organisation), a tab, and
  # "unnamed" when the list must not show the name (persons; sole traders too unless --name-sole-traders)
"""

import csv
import os
import re
import sys
from collections import Counter

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
GIVEN_NAMES_FILE = os.path.join(ROOT, 'data', 'sources', 'places', 'given-names.csv')

LOOKALIKES = dict(zip('ABCEHKMOPTXYaceopxy', 'АВСЕНКМОРТХУасеорху'))


def fix_cyrillic(text):
    """Latin look-alike letters inside Cyrillic words ("EООД") → Cyrillic."""
    return re.sub(r'\w+', lambda m: ''.join(LOOKALIKES.get(c, c) for c in m.group(0)) if re.search('[Ѐ-ӿ]', m.group(0)) else m.group(0), text)


def sole_trader(name):
    """A sole trader (едноличен търговец): its firm name contains its owner's name, so the strict rule never shows it
    (see unnamed). Written "ЕТ …", "ЕТ"…", "ЕТ:…", "… ЕТ", or glued to a word: "ЕТДавид-…", "… Иван ВасилевЕТ",
    "ЕТДАНИЕЛ ДОБРЕВ"."""
    n = re.sub(r'\s+', ' ', fix_cyrillic(name).upper()).strip(' "„“”')
    # Written out ("ЕТ …", "… ЕТ", "едноличен търговец"): a sole trader, whatever else the name holds — an address
    # ("ЕТ Струма – … , община Струмяни"), a practice's abbreviations ("ЕТ ИППМП – ЗК – Д-р …"), or a company form
    # typed with it by mistake.
    if re.match(r'^(ЕТ|ET)[\s"„“”\'`:-]', n) or re.search(r'( |^)ЕТ$|ЕДНОЛИЧЕН ТЪРГОВЕЦ', n):
        return True
    if re.search(r'(^| )(ЕООД|ООД|ЕАД|АД|КД|СД|ДЗЗД|LTD|ЛТД|КООПЕРАЦИЯ|ЗК|ЗКПУ|ЗПК|ПК|СДРУЖЕНИЕ|ФОНДАЦИЯ|ОБЩИНА)( |$)', n):
        return False
    fixed = fix_cyrillic(name).strip(' "„“”')
    if re.match(r'^ЕТ[А-Я][а-я]', fixed) or re.search(r'[а-я0-9\'"”-]ЕТ$', fixed):
        return True
    # Glued in capitals ("ЕТДАНИЕЛ ДОБРЕВ"), unless the rest marks an organisation other than by a company form:
    # "ЕТРОПОЛСКИ МАНАСТИР" is a monastery of the town of Етрополе.
    if ORGANISATION.search(n) and not COMPANY_FORM.search(n):
        return False
    return bool(re.match(r'^ЕТ[А-Я]', n) and re.search(r'[А-Я]{2,}(ОВ|ЕВ|ОВА|ЕВА|СКИ|СКА)\b', n[2:]))


# What marks an organisation, also glued to the next word ("ЗКХристо Ботев", "СУСвети Климент Охридски") or after a
# number ("119 СУ „Акад. Михаил Арнаудов“"): legal forms, cooperatives, schools, municipalities, churches, associations,
# cultural and public bodies; and, as payers abbreviate them (SEBRA, procurement), hospitals and medical centres ("УМБАЛ
# Д-р Георги Странски"; a doctor's own practice, "АИППМП Д-р …", stays a person's), universities and academies ("РУ
# Ангел Кънчев"), schools ("ПТГ Иван Райнов"), libraries and theatres ("РБ Любен Каравелов"), courts and prosecutors,
# law firms ("Адв. др. …"; a lawyer, "Адв. …", stays a person's) and abbreviated municipalities and mayoralties.
ORGANISATION = re.compile(
    r'(^|[^А-ЯA-Z])(ЕООД|ООД|ЕАД|АД|КД|КДА|СД|ДЗЗД|АДСИЦ|LTD|ЛТД|GMBH|СНЦ|ЮЛНЦ|НЧ|ЛРД|ДГС|ДЛС|ДП|ТП|СУ|ОУ|ОБУ|НУ|СОУ|ОДЗ|ДГ|ЦДГ|ПМГ|ЕГ|ПГ[А-Я]*|ФК|СК|ПФК|БК|ВК|ДОМ|СВЕТИ|СВЕТА'
    r'|МБАЛ|УМБАЛ|УМБАЛСМ|СБАЛ[А-Я]*|СБР|МОБАЛ|ДКЦ|МЦ|ДЦ|МДЦ|КОЦ|ЦПЗ|ЦКВЗ|СМДЛ|МДЛ|ЦСМП|ВМА|ГППМП|ГППДП'
    r'|РУ|ВТУ|НВУ|НМА|НСА|НХА|ТУ|МУ|ЮЗУ|ШУ|ПУ|ВУ|ВВМУ|ВВВУ|УНСС|УАСГ|ЛТУ|ХТМУ|УХТ|АУ|АМТИИ|НАТФИЗ|УНИБИТ|БАН|ВСУ|НБУ|БСУ|ВУЗФ'
    r'|ЧСУ|ЧОУ|ЧДГ|ПТГ|ПЛТГ|ТПГ|ГПЧЕ|ГПАЕ|ГПИЕ|ГПНЕ|ГПФЕ|ГПРЕ|НПГ[А-Я]*|ППМГ|СПГ[А-Я]*|НЕГ|ПЕГ|ЧЕГ|ЧПГ|МГ|СМГ|НУИ|НУФИ|НУПИД|НУМСИ|НУТИ'
    r'|ЦСОП|ЦПЛР|ЦСПП|РУО|РБ|ДТ|ДКТ|ХК|СКБ|ОФК|СЪД|ПРОКУРАТУРА)([^А-ЯA-Z]|$)'
    # a saint ("Св. Климент Охридски"), a local action group ("МИГ …"), a community centre's founding year ("Иван Вазов -
    # 1893"; firms named after their owner add later years — "Емил Попов-2007", "ЕТ Костадин Байчев- 1977" — and stay hidden)
    r'|(^|[^А-ЯA-Z])(СВ|КМ|ОБЩ|РЕГ\.\s?БИБЛ)\.|(^|[^А-ЯA-Z])АДВ\.?\s?ДР\.|^(МИГ|МИРГ)[\s"„“]|[-–]\s*(18\d\d|19[0-3]\d)\W*$'
    r'|^(ЗКПУ|ЗППК|ППЗК|ЗСПК|ЗКПТ|ОППК|ПТЗК|ППК|ПТК|ТПК|ВЗК|ЗПК|КЗУ|СКС)(?=[А-Я ]|$)'
    r'|КООПЕРАЦИЯ|СДРУЖЕНИЕ|ФОНДАЦИЯ|ЧИТАЛИЩЕ|Ч-ЩЕ|ОБЩИНА|КМЕТСТВО|УЧИЛИЩЕ|ГИМНАЗИЯ|ГРАДИНА|УНИВЕРСИТЕТ|ИНСТИТУТ|АКАДЕМИЯ'
    r'|ЦЕНТЪР|МИНИСТЕРСТВО|АГЕНЦИЯ|ДИРЕКЦИЯ|МУЗЕЙ|ГАЛЕРИЯ|ТЕАТЪР|БИБЛИОТЕКА|БОЛНИЦА|МАНАСТИР|ЦЪРКВА|ХРАМ|ЕНОРИЯ|МИТРОПОЛИЯ'
    r'|ДРУЖЕСТВО|СЪЮЗ|АСОЦИАЦИЯ|КЛУБ|КАМАРА|ФЕДЕРАЦИЯ|АНСАМБЪЛ|ОРКЕСТЪР|ГРУПА|ИЗДАТЕЛСТВО|СЪВЕТ|ЧЕРВЕН КРЪСТ|ПОДЕЛЕНИЕ|СТОПАНСТВО'
    r'|МИТНИЦА|ИНТЕРНАТ|ОБЩЕЖИТИЕ|ПРЕДПРИЯТИЕ|КОМПЛЕКС'
)
# Short marks glued to the next word, told apart in the original letters: "СУСвети …", "ЗКХристо …" (not "СУЛА …").
GLUED_MARK = re.compile(r'^(ЗК|ПК|СУ|ОУ|НУ|ОбУ|ОБУ|ДГ|ЦДГ|ПГ[А-Я]*)(?=[А-Я][а-я]|[\s"„“]|$)')
SURNAME = re.compile(r'^[А-Я]{2,}(ОВ|ЕВ|ОВА|ЕВА|ИЕВ|ИЕВА|СКИ|СКА|ЦКИ|ЦКА|ИН|ИНА|ИЧ)$')
FAMILY_NAME = re.compile(r'^[А-Я]{2,}(ОВ|ЕВ|ОВА|ЕВА)$')
# Registered farmers and the like: natural persons, unless the name also has a company form.
PERSON_MARK = re.compile(r'^(ЗП|ЗС)([\s"„“:-]|$)|ЗЕМЕДЕЛСКИ ПРОИЗВОДИТЕЛ|ЗЕМЕДЕЛСКИ СТОПАНИН|ФИЗИЧЕСКО ЛИЦЕ|САМООСИГУРЯВАЩ')
COMPANY_FORM = re.compile(r'(^|[^А-ЯA-Z])(ЕООД|ООД|ЕАД|АД|КД|КДА|СД|ДЗЗД|АДСИЦ|LTD|ЛТД)([^А-ЯA-Z]|$)')

GIVEN_NAMES = set()


def count_given_names(names):
    """Given names as they appear alone (a first-name column, or ИСУН's natural persons): name → count."""
    return Counter(n.strip().upper() for n in names if re.fullmatch(r'[А-Яа-я]{3,15}', (n or '').strip()))


def use_given_names(counts, minimum=2):
    GIVEN_NAMES.clear()
    GIVEN_NAMES.update(n for n, c in counts.items() if c >= minimum)


def read_given_names():
    with open(GIVEN_NAMES_FILE, encoding='utf-8') as f:
        return Counter({r['name']: int(r['count']) for r in csv.DictReader(f)})


def write_given_names(counts):
    with open(GIVEN_NAMES_FILE, 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['name', 'count'])
        w.writerows(sorted(counts.items()))


def personal(name):
    """A name that is (or holds) a natural person's name and marks no organisation: a registered farmer ("ЗП Петко
    Телкиев", "Иван Иванов - физическо лице") or a given name followed by a surname, also glued to another word
    ("БулпигДимитър Димитров", "ИЛСИИВАН ИВАНОВ")."""
    name = fix_cyrillic(name)
    n = re.sub(r'\s+', ' ', name.upper()).strip(' "„“”')
    if PERSON_MARK.search(n):
        return not COMPANY_FORM.search(n)
    if ORGANISATION.search(n) or GLUED_MARK.match(name.strip(' "„“”')):
        return False
    tokens = re.findall(r'[А-ЯA-Z]+', re.sub(r'([а-я])([А-Я])', r'\1 \2', re.sub(r'\s+', ' ', name)).upper())
    # A full Bulgarian name: a given name, then the father's name and the family name ("Сула Атанасова Господинова").
    words = re.findall(r'[А-Я]+', n)
    if len(words) == 3 and len(re.sub(r'[^А-Я ]', '', n).split()) == 3 and SURNAME.match(words[1]) and SURNAME.match(words[2]):
        return True
    # A given name glued to a word before it ("ИЛСИИВАН ИВАНОВ") counts only before a family name in -ов/-ев: adjectives
    # such as "НАЦИОНАЛЕН СТУДЕНТСКИ" would match otherwise.
    glued = lambda w: any(w.endswith(g) for g in GIVEN_NAMES if len(g) >= 4 and len(w) - len(g) >= 2)
    return any(SURNAME.match(b) and (a in GIVEN_NAMES or FAMILY_NAME.match(b) and glued(a)) for a, b in zip(tokens, tokens[1:]))


def kind_of(name):
    """"sole-trader", "person" (a name that is a person's) or "" (an organisation)."""
    return 'sole-trader' if sole_trader(name) else 'person' if personal(name) else ''


def unnamed(kind, name_sole_traders=False):
    """Whether a list leaves out a name of this kind (kind_of): a person's always; a sole trader's unless the list
    names sole traders (`name_sole_traders`: the SEBRA payment lists, which name them as the published data does)."""
    return kind == 'person' or (kind == 'sole-trader' and not name_sole_traders)


if __name__ == '__main__':
    # Names on standard input, one a line, with the given names of data/sources/places/given-names.csv; the kind of
    # each and whether the list leaves it out on standard output, in the same order.
    name_sole_traders = '--name-sole-traders' in sys.argv[1:]
    use_given_names(read_given_names())
    kinds = (kind_of(line.rstrip('\n')) for line in sys.stdin)
    sys.stdout.write(''.join(f'{k}\t{"unnamed" if unnamed(k, name_sole_traders) else ""}\n' for k in kinds))
