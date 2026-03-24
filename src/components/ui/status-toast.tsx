import { AlertCircle, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type StatusToastProps = {
  message: string
  variant?: 'success' | 'error'
  className?: string
}

function getVariantClasses(variant: StatusToastProps['variant']) {
  if (variant === 'error') {
    return {
      container: 'border-[#820002] bg-[#1f1f21] text-[#ffb4ae]',
      iconWrap: 'bg-[#820002]/20',
      icon: 'text-[#ff6b6b]'
    }
  }

  return {
    container: 'border-[#14532d] bg-black text-[#86efac]',
    iconWrap: 'bg-[#052e16]',
    icon: 'text-[#86efac]'
  }
}

export function StatusToast({ message, variant = 'success', className }: StatusToastProps) {
  const Icon = variant === 'error' ? AlertCircle : Check
  const variantClasses = getVariantClasses(variant)

  return (
    <div
      className={cn(
        'pointer-events-none fixed bottom-6 right-6 z-92 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium shadow-xl',
        variantClasses.container,
        className
      )}
      role="status"
      aria-live="polite"
    >
      <span className={cn('inline-flex size-6 items-center justify-center rounded-full', variantClasses.iconWrap)}>
        <Icon className={cn('size-3.5', variantClasses.icon)} />
      </span>
      <span>{message}</span>
    </div>
  )
}
