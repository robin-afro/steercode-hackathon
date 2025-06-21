import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'success'
  size?: 'sm' | 'default' | 'lg'
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-gray-900 text-white dark:bg-gray-50 dark:text-gray-900',
      secondary: 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50',
      outline: 'border border-gray-300 bg-transparent text-gray-900 dark:border-gray-700 dark:text-gray-50',
      destructive: 'bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-50',
      success: 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-50',
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
          'inline-flex items-center rounded-full font-medium transition-colors',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge } 