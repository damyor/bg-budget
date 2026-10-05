interface Option<T extends string> {
  value: T
  label: string
  disabled?: boolean
  title?: string
}

interface Props<T extends string> {
  label: string
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
}

/** A row of mutually exclusive buttons (radio group semantics). */
export function Segmented<T extends string>({ label, value, options, onChange }: Props<T>) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          disabled={o.disabled}
          title={o.title}
          className={o.value === value ? 'on' : undefined}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
