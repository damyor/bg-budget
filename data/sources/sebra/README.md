# SEBRA payments: who gets paid

The state's **individual payments of 5,000 leva (€2,556.46) or more** made through SEBRA (Система за електронни
бюджетни разплащания), the payment system of the budget at the Bulgarian National Bank, from **1 July 2022 to 30 June
2026**: 1,801,465 payments, €149.98 bn. Aggregated here into compact extracts by `scripts/extract/sebra.ts` from the
raw downloads cached in `data/cache/sebra/` (see its `MANIFEST.md`); `scripts/payments.ts` turns them into the lists of
the "Lists" page, section "Who gets paid" (`public/data/lists/payments-*.json`, `payees*`, `payee*`, `payment-codes.json`).

Payments are not tree nodes: they are the cash through which the budgets in the trees are spent. They are lists, and
the ministries of "Ministries 2024–2026" (and Sofia in "Municipalities 2024–2026") link to their payees.

## Sources

| Dataset | Publisher | What | Access | Licence |
| --- | --- | --- | --- | --- |
| data.egov.bg dataset 20439, uri `57f1e2e7-b235-45e8-94c4-4d69f0b1a690`: „Списък с извършените за съответното календарно тримесечие индивидуални плащания, инициирани с бюджетни платежни искания и финализирани в СЕБРА, с кодове за вид плащане в СЕБРА от 10 до 90 включително, на стойност, равна или превишаваща 5000 лв“ — https://data.egov.bg/data/view/57f1e2e7-b235-45e8-94c4-4d69f0b1a690 | Министерство на електронното управление (published under art. 12–13 of the ordinance on publishing SEBRA information, as amended by ПМС № 76/2024, ДВ бр. 30/2024) | One row per payment: 17 columns (below). 10 quarterly resources Q1 2024 – Q2 2026 and one ZIP for 01.07.2022–31.12.2023 | `POST https://data.egov.bg/api/getResourceData {"resource_uri": …}` (JSON); the ZIP at `https://data.egov.bg/resource/download/zip/bf12dd30-9a88-4bb1-8961-ebbc527d3e01` (`Anonymized_DD_2022-2023.csv`, 221 MB) | „Условия за предоставяне на информация без защитени авторски права (CC0)“ (data.egov.bg terms of use no. 1) |
| data.egov.bg dataset 7806, uri `01293990-7330-49c6-92a2-cc73db73ec24`: „Плащания в СЕБРА и други плащания в БНБ“ — https://data.egov.bg/data/view/01293990-7330-49c6-92a2-cc73db73ec24 | Министерство на финансите | Daily totals of all SEBRA payments (any size) by primary system and 2-digit payment code, with the official names of the codes | `getResourceData`, one resource per working day; 684 days 2024-01-02 … 2026-10-01 downloaded, those to 30.06.2026 used | CC0, as above |

All files were retrieved on **5 October 2026**. Amounts until 2025 are in leva in the source (the daily totals say
"(в лева)" / "(в евро)" in their first line); everything here is in euro, converted per payment at the fixed rate of
1.95583 and rounded to the cent.

Run again after a new quarter is published (typically 3–7 weeks after the quarter ends):

```sh
node scripts/extract/sebra-download.ts --daily              # only what is not cached yet (polite: sequential, pauses, retries)
node --max-old-space-size=8192 scripts/extract/sebra.ts     # writes this folder; stops on any failed check
npm run data
```

## Files

| File | Rows | Content |
| --- | --- | --- |
| `quarters.csv` | 11 | One row per source file: `file`, `period`, `rows`, `repaired` (rows realigned, see below), `currency`, `amount` (source currency), `amount_eur`, `first_date`, `last_date` |
| `systems.csv` | 109 | Primary systems (`code`: SEBRA's 3-digit code; the ЕБК code of the spending unit is code × 100 — the one exception seen, the Anti-Corruption Commission, SEBRA 181 / ЕБК 8100, has no individual payments), `name_bg` as published most often, `payments`, `amount_eur`, `first_date`, `last_date` |
| `payer-units.csv` | 3,697 | Paying units (FIN_NAME, the "second-level" payer: a regional health insurance fund, a police directorate, a school …): `id` (`<system>-<5 letters>`, stable), `system`, `name` as published most often, `spellings`, `payments`, `amount_eur` |
| `payees.csv.gz` | 65,588 | Payees: `id` (8 letters, stable; `persons` for the one group of natural persons and sole traders, named "ФИЗИЧЕСКИ ЛИЦА И ЕДНОЛИЧНИ ТЪРГОВЦИ"), `name` (the spelling published most often), `class` (company, nonprofit, public, person, other), `rule` (what decided the class), `spellings`, `aliases` (up to three other spellings that add words, for search), `payments`, `amount_eur`, `first_date`, `last_date` |
| `flows.csv.gz` | 549,455 | The aggregate everything is built from: `quarter` (of the settlement date) × `payee` × `unit` × `code` (payment code) → `payments`, `amount_eur` |
| `payments-large.csv.gz` | 36,226 | Every single payment of €500,000 or more (the site shows those of €1 m or more): `id` (`<quarter>-<n>`), `date`, `payee`, `unit`, `code`, `amount_eur`, `amount` and `currency` as published, `purpose` (REASON1 · REASON2; empty for natural persons and sole traders) |
| `daily-totals.csv` | 9,589 | Dataset 7806 summed by `quarter` × `system` × `code` (all payment codes, 01–98), `amount_eur`, `days` |
| `codes.csv` | 23 | The official name of every payment code, as printed in the daily files (`code`, `name_bg`) |

No IBAN, account number, BIC or name hash is written to any file, nor the name of a natural person or sole trader
(below). Committed size: 10.0 MB.

**Personal identity numbers.** Payers sometimes type an ЕГН or ЛНЧ into a free-text field — the payee's name, their own
unit's name, the purpose. Every such field is masked as it is read (`maskIds`): "ЕГН", "ЛНЧ" or "EGN" followed within
a few characters by a number of exactly 10 digits ("ЕГН/ЕИК 8001011234", also a second number after the first) becomes
"**********", and IBANs become "[IBAN]"; 9-digit ЕИК company ids stay. A spelling that mentions an identity number is
never a payee's display name or alias. The extractor, `npm run data` and a test fail if any file here or in
`public/data/lists/` still holds an unmasked number.

## Columns of the source and how they are read

`SETTLEMENT_DATE, CLIENT_RECEIVER_NAME, CLIENT_RECEIVER_ACC, CLIENT_RECEIVER_BIC, FIN_CODE, FIN_NAME, AMOUNT, CURRENCY,
REASON1, REASON2, REG_DATE, REG_NO, SEBRA_PAY_CODE, ORGANIZATION, PRIMARY_ORGANIZATION, PRIMARY_ORG_CODE, CLIENT_NAME_HASH`.
There is no payee ЕИК (company number). Natural persons are published as "ФИЗИЧЕСКО ЛИЦЕ" with a masked account.

Quirks of the published files, all handled by `parsePayment` in `scripts/lib/sebra.ts`:
- **Q4 2024** starts with a byte-order mark; 142 rows are shifted — 14 by an empty column after the payee name, the
  others by purposes split at commas into extra columns (realigned).
- **Q3 2024** has another layout: ORGANIZATION empty, PRIMARY_ORGANIZATION = the system code without leading zeros,
  PRIMARY_ORG_CODE = the name hash, FIN_CODE without leading zeros. 438 of its rows have purposes split at commas into
  extra columns, pushing the rest right and cutting off the last columns (realigned: the registration date and the
  2-digit payment code are found after the purposes; the system comes from FIN_CODE's first three digits).
- **2022–2023**: one row lacks its currency column (realigned).
- 33 rows were cut off before their payment code; they take the code their payer used most for the same payee (or for
  any payee). 52 rows lost both their system column and their unit code; they take the system of their unit's name.
- FIN_CODE is masked ("**********") on 213,321 rows from 2024 on; the unit is then known by its name only.

## Payer units

A unit is one FIN_NAME within a system, compared without case, quotes, punctuation and extra spaces; spellings that
share a FIN_CODE are joined. 3,697 units in 109 systems.

## Payees: grouping the spellings

Names are as the payer typed them: cut at 26–35 characters, with or without the legal form, in many spellings (Bulgarian
Posts appears under 253). `nameKey` (scripts/lib/sebra.ts) compares names in upper case, with Latin look-alike letters fixed,
HTML debris ("&QUOT;", "&КУОТ") and quotes and punctuation removed and the legal form written one way and moved to the
end ("ООД „Фарма Юнион“" = "ФАРМА ЮНИОН О.О.Д." → `ФАРМА ЮНИОН|ООД`; forms glued to the last word or cut short at the
field's end are recognised). Then `groupPayees`:

1. Every account (IBAN) is one payee, whatever names it was typed with (a bank's name typed for its client's account
   goes with the client).
2. Accounts whose most frequent name is the same key are one payee (a company with several accounts, or one account per
   customer, as with telecoms and utilities) — except names many different payees share: schools and kindergartens
   named after the same patron, community centres, clubs, churches, or a bare "ОБЩИНА"; those stay one payee per account.
3. A name joins another when it is the same without spaces ("ДП НК ЖИ" = "ДП НКЖИ"), the same without its legal form
   (when only one form exists), cut short at 20 letters or more ("ЕВН БЪЛГАРИЯ ЕЛЕКТРОСНАБДЯ"), or the other's name
   (two words or more) followed by a branch word or a place ("БЪЛГАРСКИ ПОЩИ ЕАД ОПС ДОБРИЧ" → "БЪЛГАРСКИ ПОЩИ ЕАД").
4. Natural persons and sole traders are one group, and the purposes of payments to them are dropped: every name with
   "ФИЗИЧЕСКО ЛИЦЕ" (also "Д-Р ФИЗИЧЕСКО ЛИЦЕ", doctors' practices whose names the publisher anonymised), names that
   are only a person's name (a given name learnt from sole traders' and doctors' names, then one or two Bulgarian
   surnames), and — since October 2026 — every spelling that the rules of the EU-funds and farm-subsidy extracts,
   `scripts/extract/persons.py` (run by the extractor; it needs python3), take for a sole trader ("ЕТ …", whose firm
   carries the owner's name) or a person's name (a given name from `../places/given-names.csv` and a surname with
   nothing that marks an organisation: doctors' and dentists' own practices, private bailiffs, lawyers, "ЗП …"; not
   hospitals, universities, schools, courts or law firms, which the rules recognise as organisations). The extractor
   stops if any payee name or alias it writes is still a person's or a sole trader's.

Result: 100,443 distinct name keys and 88,797 accounts → **65,588 payees**; 17,906 of them were published under more
than one spelling.

**What the October 2026 rules changed.** 6,944 payees that were named before are now in the group — 5,644 sole traders
(€1,061.7 m, 117,092 payments) and 1,300 payees whose name is a person's (€186.2 m, 27,558 payments) — and 17 others
lost spellings that were a person's and were regrouped. With the spellings of persons that were inside other payees'
groups, the group grew by 145,866 payments and €1,260,492,957: from 334,140 payments and €3.05 bn to 480,006 payments
and €4.31 bn. The payee lists, the payee pages, the largest payments and the search name none of them. The display name is the spelling published most often. Ids are short hashes of the payee's main
name (and, for account-only payees, of the account — truncated, so not reversible); they stay the same as long as the
main spelling does.

## Classes of payees

`classify` (scripts/lib/sebra.ts), in this order: natural person or sole trader (above); public (the Military Medical
Academy and its hospitals, the central bank, state enterprises "ДП", universities "ВУ"); company (a commercial legal form
— ЕООД, ООД, ЕАД, АД, СД, КД, КДА, АДСИЦ, ДЗЗД, a foreign form, an insurer or a cooperative — or a name that marks one: hospitals and medical
practices, posts, banks, utilities, telecoms, consortia); public (a name starting with "ОБЩИНА", "МИНИСТЕРСТВО");
nonprofit (associations, foundations, community centres, clubs, federations, churches, parties, unions); public (a
name that marks a public body: municipality, ministry, agency, the social security and health funds, courts, schools,
universities, institutes, museums, theatres, directorates, regional administrations …); public (at least half of the
money paid into accounts at the central bank, or as transfers between budgets, code 60); otherwise unclassified. A
payee's class is the one of its spellings with the most money ("unclassified" only when no spelling says more).

| Class | Payees | Payments | € bn | Decided by |
| --- | ---: | ---: | ---: | --- |
| Companies | 50,020 | 1,004,714 | 71.29 | legal form 47,736 (€59.56 bn), name 2,284 (€11.73 bn) |
| Public sector | 6,864 | 241,705 | 72.94 | name 5,973 (€68.74 bn), central-bank account 152 (€2.33 bn), transfers 739 (€1.86 bn) |
| Natural persons and sole traders (not named) | 1 group | 480,006 | 4.31 | |
| Non-profits | 4,156 | 26,991 | 0.71 | name |
| Unclassified | 4,547 | 48,049 | 0.74 | |

The lists hide the public sector until it is chosen ("All, with “Public sector”"), so that transfers to the social
security institute (€28.4 bn), municipalities and other budgets do not crowd out the suppliers.

## Checks

The extractor stops unless: the header is the 17 known columns; every row has a date, a positive amount in the file's
currency (leva until 2025, euro in 2026) and a known payment code (10, 18, 20, 30, 40, 50, 60, 70, 80, 88, 89, 90) after
realignment; every quarterly file holds only its own quarter; every unit code starts with its system's code; payee ids
are unique; and the flows add up, payment by payment and cent by cent, to the rows read.

**Rows and amounts per file, against the raw files** (rows counted, AMOUNT summed by an independent script):

| File | Rows | Realigned | Amount (source currency) | € |
| --- | ---: | ---: | ---: | ---: |
| 2022-2023.zip | 610,363 | 1 | 101,894,302,836.13 BGN | 52,097,729,787.14 |
| 2024Q1 | 92,375 | 0 | 14,556,528,520.98 BGN | 7,442,634,798.51 |
| 2024Q2 | 122,378 | 0 | 18,875,372,091.71 BGN | 9,650,824,507.47 |
| 2024Q3 | 86,958 | 438 | 16,814,605,325.42 BGN | 8,597,171,190.40 |
| 2024Q4 | 156,002 | 142 | 20,946,705,997.59 BGN | 10,709,880,720.23 |
| 2025Q1 | 100,021 | 0 | 16,500,627,511.75 BGN | 8,436,636,885.88 |
| 2025Q2 | 127,227 | 0 | 20,213,793,038.86 BGN | 10,335,148,275.88 |
| 2025Q3 | 100,242 | 0 | 19,290,140,422.02 BGN | 9,862,892,183.76 |
| 2025Q4 | 170,416 | 0 | 24,724,604,403.17 BGN | 12,641,489,494.42 |
| 2026Q1 | 112,836 | 0 | 9,865,249,538.44 EUR | 9,865,249,538.44 |
| 2026Q2 | 122,647 | 0 | 10,344,931,935.05 EUR | 10,344,931,935.05 |
| **Total** | **1,801,465** | **581** | | **149,984,589,317.18** |

Every file matches its raw rows exactly; Q2 2026 also matches the count made when the source was surveyed (122,647
payments, €10.34 bn). The site's lists total the same €149.98 bn (whole euros per row).

**Against SEBRA's daily totals (dataset 7806), payment codes 10–90.** The daily totals include payments under
5,000 leva and confidential ones and are net of refunds, so the individual payments should be a little less:

| Quarter | Individual (€ bn) | Daily totals (€ bn) | Share |
| --- | ---: | ---: | ---: |
| 2024 Q1 | 6.24 | 6.54 | 95.5% |
| 2024 Q2 | 8.63 | 9.33 | 92.5% |
| 2024 Q3 | 7.76 | 8.07 | 96.2% |
| 2024 Q4 | 9.59 | 10.05 | 95.4% |
| 2025 Q1 | 7.25 | 7.55 | 96.1% |
| 2025 Q2 | 9.10 | 9.53 | 95.5% |
| 2025 Q3 | 8.94 | 9.27 | 96.4% |
| 2025 Q4 | 11.35 | 14.00 | 81.1% |
| 2026 Q1 | 8.46 | 8.82 | 96.0% |
| 2026 Q2 | 9.22 | 9.65 | 95.5% |

Without the central budget's subsidies to municipalities (systems 444 and 488), which the daily files list by name
without a payment code. The Q4 2025 gap is the Ministry of Finance: €2.05 bn with code 70 (repayable financing: shares,
loans) in the daily totals and none in the individual list; over the period, the Ministry of Finance (the tax agency
and Customs are in its system and excluded) and Defence (confidential payments) account for most of what is missing.

**Two ministries, code by code** (individual / daily totals, € m):

| | 2024 | 2025 | 2026 H1 |
| --- | --- | --- | --- |
| Ministry of Health (016) | 445.1 / 477.8 = 93.2% | 426.2 / 464.7 = 91.7% | 168.8 / 186.6 = 90.4% |
| Ministry of Regional Development (021) | 1,474.3 / 1,485.3 = 99.3% | 1,723.5 / 1,716.7 = 100.4% | 393.0 / 399.0 = 98.5% |

In 2025, the Ministry of Health's running costs (code 10, many small invoices) are 71.0% covered (74.0 of 104.2), its
subsidies to companies (30) 99.7%, capital (50) 97.8% and transfers (60) 100%; Regional Development's running costs
101.1%, capital 99.0%, transfers 99.9%, loan repayments (80) 100%. Shares a little above 100%
come from code 89 ("other financing") and refunds, which the daily totals net out. The "Payments by type" list shows the
same comparison for every system, code and year.

**Spot checks against the raw rows:**
- КОНСОРЦИУМ БУЛЕМУ, 01.07.2025: 278,541,485.28 BGN, code 50, paid by "МТС К8.И1 ПОДВИЖЕН СЪСТАВ" in the National Fund's
  Recovery and Resilience system (983), purpose "ПМС 33/25.04.25 Г. Д 9/2025 Г.АВАНС" → on the site €142,416,000, the
  largest single payment of 2025 outside the public sector.
- ДКК ЕАД, 21.11.2025: 200,000,000 BGN, code 70, Ministry of Economy and Industry (020), "УВЕЛИЧ.КАПИТАЛ ДКК ЕАД" →
  €102,258,376.
- ТЕРА СКАУТ ЕООД: 17 payments, €773,612.39, from six units (the Ministry of Culture's centre for underwater
  archaeology, two institutes of the Academy of Sciences, the University of Mining and Geology under two spellings,
  Plovdiv University, an EU programme of the innovation ministry); by year 56,947 / 34,389 / 151,455 / 402,056 /
  128,766 → the payee's page shows the same by unit and year (2026: 128,765, rounding).
- Q2 2026 as a whole, see above.
