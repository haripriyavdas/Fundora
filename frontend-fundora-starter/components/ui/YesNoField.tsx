import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'

type Props = {
  label: string
  /** `null` means not answered yet, which is different from No. */
  value: boolean | null | undefined
  onChange: (value: boolean) => void
  onBlur?: () => void
  error?: string
  hint?: string
}

/** A yes/no question as two radio buttons with large tap targets. */
export function YesNoField({ label, value, onChange, onBlur, error, hint }: Props) {
  const { t } = useTranslation()
  const id = useId()
  const describedBy =
    [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined

  return (
    <fieldset aria-describedby={describedBy}>
      <legend className="mb-1.5 block text-sm font-medium text-ink">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        {[
          { answer: true, text: t('common.yes') },
          { answer: false, text: t('common.no') },
        ].map(({ answer, text }) => (
          <label
            key={text}
            className={cn(
              'flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border bg-white px-3.5 text-base',
              'has-focus-visible:ring-2 has-focus-visible:ring-brand-soft',
              value === answer ? 'border-brand bg-brand-soft font-medium' : 'border-line',
            )}
          >
            <input
              type="radio"
              name={id}
              checked={value === answer}
              onChange={() => onChange(answer)}
              onBlur={onBlur}
              className="size-5 shrink-0 accent-brand"
            />
            {text}
          </label>
        ))}
      </div>
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
    </fieldset>
  )
}
