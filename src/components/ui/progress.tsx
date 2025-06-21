import * as React from "react"
import { cn } from "@/lib/utils"

export interface ProgressProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'success' | 'warning' | 'destructive'
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, size = 'default', variant = 'default', ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

    const variants = {
      default: 'bg-gray-900 dark:bg-gray-50',
      success: 'bg-green-600 dark:bg-green-400',
      warning: 'bg-yellow-600 dark:bg-yellow-400',
      destructive: 'bg-red-600 dark:bg-red-400',
    }

    const sizes = {
      sm: 'h-1',
      default: 'h-2',
      lg: 'h-3',
    }

    return (
      <div
        ref={ref}
        className={cn(
          'relative w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800',
          sizes[size],
          className
        )}
        {...props}
      >
        <div
          className={cn(
            'h-full transition-all duration-500 ease-out',
            variants[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    )
  }
)
Progress.displayName = "Progress"

export { Progress } 