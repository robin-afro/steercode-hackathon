'use client'

import * as React from "react"
import { Search, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (query: string) => void
  isLoading?: boolean
}

const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  ({ className, onSearch, isLoading = false, ...props }, ref) => {
    const [query, setQuery] = React.useState("")

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      if (query.trim() && onSearch) {
        onSearch(query.trim())
      }
    }

    return (
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            ref={ref}
            className={cn(
              "flex h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-10 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:ring-offset-gray-950 dark:placeholder:text-gray-400 dark:focus-visible:ring-gray-300",
              className
            )}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about the codebase... (e.g., 'How does user authentication work?')"
            {...props}
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
          )}
        </div>
      </form>
    )
  }
)
SearchBar.displayName = "SearchBar"

export { SearchBar } 