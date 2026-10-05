import { familiesFor, FAMILY_LABEL, findEntry, STAGE_HINT, STAGE_LABEL, switchEntry, versionsFor, yearsOf } from '../lib/datasets'
import { useLang, useT } from '../lib/i18n'
import type { DatasetFamily, DatasetIndexEntry } from '../lib/types'
import { Segmented } from './Segmented'

interface Props {
  datasets: DatasetIndexEntry[]
  value: string
  onChange: (id: string) => void
}

/**
 * Picks a dataset in three steps: the year, the version (plan, actual,
 * forecast) and — where a year has more than one — the breakdown (by purpose,
 * by ministry, by municipality, Eurostat).
 */
export function DatasetPicker({ datasets, value, onChange }: Props) {
  const t = useT()
  const lang = useLang()
  const current = findEntry(datasets, value)
  const families = familiesFor(datasets, current.year)
  const versions = versionsFor(datasets, current.year, current.family)

  return (
    <div className="dataset-picker">
      <Segmented
        label={t('year')}
        value={String(current.year)}
        onChange={(y) => onChange(switchEntry(datasets, current, { year: Number(y) }).id)}
        options={yearsOf(datasets).map((y) => ({ value: String(y), label: String(y) }))}
      />
      <Segmented
        label={t('version')}
        value={current.id}
        onChange={onChange}
        options={versions.map((d) => ({ value: d.id, label: STAGE_LABEL[d.stage][lang], title: STAGE_HINT[d.stage][lang] }))}
      />
      {families.length > 1 && (
        <Segmented<DatasetFamily>
          label={t('breakdown')}
          value={current.family}
          onChange={(family) => onChange(switchEntry(datasets, current, { family }).id)}
          options={families.map((f) => ({ value: f, label: FAMILY_LABEL[f][lang] }))}
        />
      )}
    </div>
  )
}
