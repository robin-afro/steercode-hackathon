import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const variants = {
      default: 'text-white hover:opacity-90',
      outline: 'border bg-transparent hover:opacity-90',
      ghost: 'hover:opacity-90',
      destructive: 'text-white hover:opacity-90',
    }

    const variantStyles = {
      default: { backgroundColor: 'var(--color-primary)' },
      outline: { borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' },
      ghost: { color: 'var(--color-text-primary)' },
      destructive: { backgroundColor: 'var(--color-destructive)' },
    }

    const sizes = {
      default: 'h-10 px-4 py-2',
      sm: 'h-9 px-3',
      lg: 'h-11 px-8',
      icon: 'h-10 w-10',
    }

    return (
      <button
        className={cn(
          'inline-flex items-center justify-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          variants[variant],
          sizes[size],
          className
        )}
        style={{
          borderRadius: 'var(--radius-md)',
          ...variantStyles[variant],
        }}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button } 