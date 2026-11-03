import { cn } from '@/lib/cn'

const base =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60'

export const button = {
  primary: cn(base, 'bg-brand text-white hover:bg-brand-strong'),
  secondary: cn(base, 'border border-line bg-white text-ink hover:bg-surface-2'),
  ghost: cn(base, 'text-brand hover:bg-brand-soft'),
}
