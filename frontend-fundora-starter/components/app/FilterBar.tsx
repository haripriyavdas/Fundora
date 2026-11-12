import { Search, SlidersHorizontal } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { button } from '@/components/ui/button'
import { SelectField } from '@/components/ui/SelectField'
import { FILTER_OPTIONS, type FilterKey, type Filters } from '@/features/schemes/filters'
import { cn } from '@/lib/cn'

type SelectKey = Exclude<FilterKey, 'q' | 'openOnly'>

/**
 * Search, filters and sort for scheme lists. Values live in the URL (the page passes them in and
 * gets changes back), so refresh, back and shared links keep them. Collapsed behind a button on phones.
 */
export function FilterBar({
  filters,
  onChange,
  onClear,
  search = false,
  stateFilter = false,
  defaultSort,
}: {
  filters: Filters
  onChange: (key: FilterKey, value: string | undefined) => void
  onClear: () => void
  search?: boolean
  stateFilter?: boolean
  defaultSort: 'match' | 'closing'
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const selects: SelectKey[] = [
    'aidType',
    'providerType',
    'group',
    ...(stateFilter ? (['state'] as const) : []),
  ]
  const active = selects.filter((key) => filters[key]).length + (filters.openOnly ? 1 : 0)

  const optionLabel = (key: SelectKey, value: string) =>
    key === 'state' ? t(`profile.options.state.${value}`) : t(`schemes.${key}.${value}`)

  return (
    <section aria-label={t('schemes.filters.label')} className="space-y-4">
      {search && (
        <SearchBox
          key={filters.q ?? ''}
          initial={filters.q ?? ''}
          onSearch={(q) => onChange('q', q || undefined)}
        />
      )}

      <button
        type="button"
        className={cn(button.secondary, 'w-full sm:hidden')}
        aria-expanded={open}
        aria-controls="scheme-filters"
        onClick={() => setOpen((v) => !v)}
      >
        <SlidersHorizontal aria-hidden className="size-4" />
        {active > 0
          ? t('schemes.filters.toggleCount', { count: active })
          : t('schemes.filters.toggle')}
      </button>

      <div
        id="scheme-filters"
        className={cn(
          'grid-cols-2 gap-4 rounded-2xl border border-line bg-white p-4 sm:grid lg:grid-cols-4',
          open ? 'grid' : 'hidden',
        )}
      >
        {selects.map((key) => (
          <SelectField
            key={key}
            className="col-span-2 sm:col-span-1"
            label={t(`schemes.filters.${key}`)}
            placeholder={t(key === 'state' ? 'schemes.filters.allStates' : 'schemes.filters.any')}
            options={FILTER_OPTIONS[key].map((value) => ({
              value,
              label: optionLabel(key, value),
            }))}
            value={filters[key] ?? ''}
            onChange={(e) => onChange(key, e.target.value || undefined)}
          />
        ))}
        <SelectField
          className="col-span-2 sm:col-span-1"
          label={t('schemes.filters.sort')}
          placeholder={t(`schemes.sort.${defaultSort}`)}
          options={FILTER_OPTIONS.sort
            .filter((value) => value !== defaultSort)
            .map((value) => ({ value, label: t(`schemes.sort.${value}`) }))}
          value={filters.sort && filters.sort !== defaultSort ? filters.sort : ''}
          onChange={(e) => onChange('sort', e.target.value || undefined)}
        />
        <label className="col-span-2 flex min-h-11 items-center gap-3 self-end text-sm font-medium text-ink sm:col-span-1">
          <input
            type="checkbox"
            className="size-5 accent-accent"
            checked={filters.openOnly === 'true'}
            onChange={(e) => onChange('openOnly', e.target.checked ? 'true' : undefined)}
          />
          {t('schemes.filters.openOnly')}
        </label>
        {active > 0 && (
          <button
            type="button"
            className={cn(button.ghost, 'col-span-2 justify-self-start sm:col-span-1 sm:self-end')}
            onClick={onClear}
          >
            {t('schemes.filters.clear')}
          </button>
        )}
      </div>
    </section>
  )
}

/** Searches on submit rather than on every key, which is kinder to slow connections. */
function SearchBox({ initial, onSearch }: { initial: string; onSearch: (q: string) => void }) {
  const { t } = useTranslation()
  const [value, setValue] = useState(initial)

  function submit(e: FormEvent) {
    e.preventDefault()
    onSearch(value.trim())
  }

  return (
    <form role="search" onSubmit={submit} className="flex gap-2">
      <label htmlFor="scheme-search" className="sr-only">
        {t('schemes.filters.search')}
      </label>
      <div className="relative flex-1">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted"
        />
        <input
          id="scheme-search"
          type="search"
          maxLength={100}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t('schemes.filters.searchPlaceholder')}
          className="min-h-11 w-full rounded-full border border-line bg-white pr-4 pl-10 text-base text-ink focus:border-accent focus:ring-2 focus:ring-tile focus:outline-none"
        />
      </div>
      <button type="submit" className={button.ink}>
        {t('schemes.filters.searchButton')}
      </button>
    </form>
  )
}
