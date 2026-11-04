import { forwardRef, useId, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  placeholder: string
  options: readonly { value: string; label: string }[]
  error?: string
  hint?: string
}

/** A native select: light, and familiar on low-end phones. Same layout as TextField. */
export const SelectField = forwardRef<HTMLSelectElement, Props>(function SelectField(
  { label, placeholder, options, error, hint, className, ...select },
  ref,
) {
  const id = useId()
  const describedBy =
    [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <select
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'min-h-11 w-full rounded-xl border bg-white px-3 text-base text-ink',
          'focus:border-brand focus:ring-2 focus:ring-brand-soft focus:outline-none',
          error ? 'border-not' : 'border-line',
        )}
        {...select}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-not">
          {error}
        </p>
      )}
    </div>
  )
})
