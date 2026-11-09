import { cn } from '@/lib/cn'

const base =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:text-base'

export const button = {
  primary: cn(base, 'bg-brand text-white hover:bg-brand-strong'),
  secondary: cn(base, 'border border-line-strong bg-white text-ink hover:bg-surface-2'),
  ink: cn(base, 'bg-accent text-on-accent hover:bg-accent-strong'),
  ghost: cn(base, 'text-ink underline-offset-4 hover:bg-tile'),
  /** White pill on a red hero card */
  onBrand: cn(base, 'bg-white text-ink hover:bg-surface-2'),
}
