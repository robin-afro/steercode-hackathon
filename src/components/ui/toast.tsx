'use client'

import * as React from "react"
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ToastProps {
  id: string
  title?: string
  description?: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  onClose?: () => void
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ id, title, description, type = 'info', onClose }, ref) => {
    const getIcon = () => {
      switch (type) {
        case 'success':
          return <CheckCircle className="h-5 w-5" style={{ color: 'var(--color-success)' }} />
        case 'error':
          return <XCircle className="h-5 w-5" style={{ color: 'var(--color-destructive)' }} />
        case 'warning':
          return <AlertTriangle className="h-5 w-5" style={{ color: 'var(--color-warning)' }} />
        case 'info':
        default:
          return <Info className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
      }
    }

    const getBorderColor = () => {
      switch (type) {
        case 'success':
          return 'var(--color-success)'
        case 'error':
          return 'var(--color-destructive)'
        case 'warning':
          return 'var(--color-warning)'
        case 'info':
        default:
          return 'var(--color-primary)'
      }
    }

    return (
      <div
        ref={ref}
        className={cn(
          "pointer-events-auto relative flex w-full max-w-md items-start gap-3 rounded-lg border p-4 shadow-lg transition-all",
          "animate-in slide-in-from-right-full duration-300"
        )}
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: getBorderColor(),
          borderLeftWidth: '4px',
          borderLeftStyle: 'solid'
        }}
      >
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        
        <div className="flex-1 space-y-1">
          {title && (
            <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {title}
            </div>
          )}
          {description && (
            <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {description}
            </div>
          )}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 rounded-md p-1 transition-colors hover:opacity-70"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }
)
Toast.displayName = "Toast"

export { Toast } 