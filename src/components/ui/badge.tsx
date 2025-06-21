import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'success'
  size?: 'sm' | 'default' | 'lg'
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', size = 'default', style, ...props }, ref) => {
    const variants = {
      default: 'text-white',
      secondary: '',
      outline: 'border bg-transparent',
      destructive: '',
      success: '',
    }

    const variantStyles = {
      default: { backgroundColor: 'var(--color-primary)', color: 'white' },
      secondary: { backgroundColor: 'var(--overlay-10)', color: 'var(--color-text-primary)' },
      outline: { borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' },
      destructive: { backgroundColor: 'var(--color-destructive)', color: 'white' },
      success: { backgroundColor: 'var(--color-success)', color: 'white' },
    }

    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      default: 'px-2.5 py-0.5 text-sm',
      lg: 'px-3 py-1 text-base',
    }

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center font-medium transition-colors',
          variants[variant],
          sizes[size],
          className
        )}
        style={{
          borderRadius: 'var(--radius-full)',
          ...variantStyles[variant],
          ...style
        }}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge } 