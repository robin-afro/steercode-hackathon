'use client'

import * as React from "react"
import { Search, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (query: string) => void
  isLoading?: boolean
  defaultValue?: string
}

const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  ({ className, onSearch, isLoading = false, defaultValue = "", style, ...props }, ref) => {
    const [query, setQuery] = React.useState(defaultValue)

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      if (query.trim() && onSearch) {
        onSearch(query.trim())
      }
    }

    return (
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search 
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" 
            style={{ color: 'var(--color-text-secondary)' }}
          />
          <input
            ref={ref}
            className={cn(
              "flex h-10 w-full rounded-md border pl-10 pr-10 py-2 text-sm ring-offset-2 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
              className
            )}
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
              ...style
            }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about the codebase... (e.g., 'How does user authentication work?')"
            {...props}
          />
          {isLoading && (
            <Loader2 
              className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" 
              style={{ color: 'var(--color-text-secondary)' }}
            />
          )}
        </div>
      </form>
    )
  }
)
SearchBar.displayName = "SearchBar"

export { SearchBar } 