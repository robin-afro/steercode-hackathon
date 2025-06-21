'use client'

import * as React from "react"
import { Toast, ToastProps } from "./toast"

interface ToastContextValue {
  toast: (props: Omit<ToastProps, 'id' | 'onClose'>) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  warning: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined)

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastItem extends ToastProps {
  id: string
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const addToast = React.useCallback((props: Omit<ToastProps, 'id' | 'onClose'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const duration = props.duration ?? 5000
    
    const toast: ToastItem = {
      ...props,
      id,
      onClose: () => removeToast(id)
    }
    
    setToasts((prev) => [...prev, toast])
    
    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration)
    }
  }, [removeToast])

  const contextValue: ToastContextValue = React.useMemo(() => ({
    toast: addToast,
    success: (title: string, description?: string) => 
      addToast({ type: 'success', title, description }),
    error: (title: string, description?: string) => 
      addToast({ type: 'error', title, description }),
    warning: (title: string, description?: string) => 
      addToast({ type: 'warning', title, description }),
    info: (title: string, description?: string) => 
      addToast({ type: 'info', title, description })
  }), [addToast])

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
} 