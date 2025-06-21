import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'outline' | 'ghost' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', style, ...props }, ref) => {
    const variants = {
      default: 'hover:opacity-90',
      primary: 'hover:opacity-90',
      outline: 'border hover:opacity-90',
      ghost: 'hover:opacity-90',
      destructive: 'hover:opacity-90',
    }

    const getVariantStyles = (variant: string) => {
      switch (variant) {
        case 'primary':
          return {
            backgroundColor: 'var(--color-primary)',
            color: 'white',
            borderColor: 'var(--color-primary)',
          }
        case 'outline':
          return {
            backgroundColor: 'transparent',
            color: 'var(--color-text-primary)',
            borderColor: 'var(--color-border)',
          }
        case 'ghost':
          return {
            backgroundColor: 'transparent',
            color: 'var(--color-text-primary)',
          }
        case 'destructive':
          return {
            backgroundColor: 'var(--color-destructive)',
            color: 'white',
          }
        default:
          return {
            backgroundColor: 'var(--color-text-primary)',
            color: 'var(--color-canvas)',
          }
      }
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
          'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          variants[variant],
          sizes[size],
          className
        )}
        style={{
          ...getVariantStyles(variant),
          ...style
        }}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button } 