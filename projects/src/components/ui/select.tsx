import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  children: React.ReactNode
  className?: string
}

interface SelectItemProps {
  value: string
  children: React.ReactNode
  onSelect?: (value: string) => void
  isSelected?: boolean
}

export function Select({ value, onValueChange, placeholder, children, className }: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Find selected label
  let selectedLabel: React.ReactNode = placeholder
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === SelectItem) {
      const props = child.props as SelectItemProps
      if (props.value === value) {
        selectedLabel = props.children
      }
    }
  })

  // Clone children to inject onSelect handler
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && child.type === SelectItem) {
      const props = child.props as SelectItemProps
      return React.cloneElement(child, {
        onSelect: (val: string) => {
          onValueChange?.(val)
          setIsOpen(false)
        },
        isSelected: value === props.value,
      })
    }
    return child
  })

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={cn(!value && "text-gray-400")}>
          {selectedLabel}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 text-sm shadow-lg">
          {enhancedChildren}
        </div>
      )}
    </div>
  )
}

export function SelectItem({ value, children, onSelect, isSelected }: SelectItemProps) {
  return (
    <div
      onClick={() => onSelect?.(value)}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 px-3 text-sm outline-none hover:bg-gray-100",
        isSelected && "bg-violet-50 text-violet-600"
      )}
    >
      {children}
    </div>
  )
}

export function SelectTrigger({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  return <span className="text-gray-400">{placeholder}</span>
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

