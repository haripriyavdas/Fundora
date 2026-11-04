import { useController, useFormContext, get, type FieldPath } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { ProfileUpdateBody } from '@shared/schemas'
import { SelectField } from '@/components/ui/SelectField'
import { TextField } from '@/components/ui/TextField'
import { YesNoField } from '@/components/ui/YesNoField'
import type { FieldDef } from '@/features/profile/steps'

type Path = FieldPath<ProfileUpdateBody>

/** Blank inputs become null, which the API reads as "clear this field". */
const toText = (value: unknown) =>
  typeof value === 'string' ? value.trim() || null : (value ?? null)

/** Accepts "2,50,000". Anything else non-numeric becomes NaN, which validation rejects. */
const toNumber = (value: unknown) => {
  if (value === '' || value === null || value === undefined) return null
  const cleaned = String(value).replace(/,/g, '').trim()
  return cleaned === '' ? null : Number(cleaned)
}

export function ProfileFieldInput({ def }: { def: FieldDef }) {
  const { t } = useTranslation()
  const { register, formState } = useFormContext<ProfileUpdateBody>()
  const error = (get(formState.errors, def.name) as { message?: string } | undefined)?.message
  const label = t(`profile.fields.${def.name}.label`)
  const hint =
    [
      t(`profile.fields.${def.name}.hint`, { defaultValue: '' }),
      def.sensitive ? t('profile.sensitiveNote') : '',
    ]
      .filter(Boolean)
      .join(' ') || undefined

  switch (def.kind) {
    case 'hidden':
      return null
    case 'text':
      return (
        <TextField
          label={label}
          hint={hint}
          error={error}
          {...register(def.name, { setValueAs: toText })}
        />
      )
    case 'date':
      return (
        <TextField
          type="date"
          label={label}
          hint={hint}
          error={error}
          {...register(def.name, { setValueAs: toText })}
        />
      )
    case 'number':
      // Text with a number keyboard: type="number" changes value on scroll and rejects commas
      return (
        <TextField
          inputMode={def.inputMode}
          autoComplete="off"
          label={label}
          hint={hint}
          error={error}
          {...register(def.name, { setValueAs: toNumber })}
        />
      )
    case 'select':
      return (
        <SelectField
          label={label}
          hint={hint}
          error={error}
          placeholder={t('profile.choose')}
          options={def.options.map((value) => ({
            value,
            label: t(`profile.options.${def.optionsKey}.${value}`),
          }))}
          {...register(def.name, { setValueAs: toText })}
        />
      )
    case 'yesNo':
      return <YesNoInput name={def.name} label={label} hint={hint} error={error} />
    case 'check':
      return (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-line bg-white px-3.5 py-2 text-base has-focus-visible:ring-2 has-focus-visible:ring-brand-soft">
          <input type="checkbox" className="size-5 shrink-0 accent-brand" {...register(def.name)} />
          {label}
        </label>
      )
    case 'disability':
      return <DisabilityInput label={label} hint={hint} />
  }
}

function YesNoInput({
  name,
  label,
  hint,
  error,
}: {
  name: Path
  label: string
  hint?: string
  error?: string
}) {
  const { field } = useController<ProfileUpdateBody>({ name })
  return (
    <YesNoField
      label={label}
      hint={hint}
      error={error}
      value={field.value as boolean | null | undefined}
      onChange={field.onChange}
      onBlur={field.onBlur}
    />
  )
}

/** One stored value, `{ has, percent? }`, shown as a question and a follow-up. */
function DisabilityInput({ label, hint }: { label: string; hint?: string }) {
  const { t } = useTranslation()
  const { formState } = useFormContext<ProfileUpdateBody>()
  const { field } = useController<ProfileUpdateBody, 'disability'>({ name: 'disability' })
  const value = field.value ?? null
  const errors = get(formState.errors, 'disability') as
    { message?: string; percent?: { message?: string } } | undefined

  return (
    <div className="space-y-4">
      <YesNoField
        label={label}
        hint={hint}
        error={errors?.message}
        value={value?.has}
        onBlur={field.onBlur}
        onChange={(has) => field.onChange(has ? { ...value, has } : { has })}
      />
      {value?.has && (
        <TextField
          inputMode="decimal"
          autoComplete="off"
          label={t('profile.fields.disability.percentLabel')}
          error={errors?.percent?.message}
          defaultValue={value.percent ?? ''}
          onBlur={field.onBlur}
          onChange={(e) => {
            const percent = toNumber(e.target.value)
            field.onChange(percent === null ? { has: true } : { has: true, percent })
          }}
        />
      )}
    </div>
  )
}
