import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface CheckboxProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  className?: string
}

export function Checkbox({ checked, onCheckedChange, className }: CheckboxProps) {
  return (
    <button
      type="button"
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
        checked
          ? "bg-violet-600 border-violet-600 text-white"
          : "border-gray-300 bg-white hover:border-violet-400",
        className
      )}
    >
      {checked && <Check className="h-3 w-3" />}
    </button>
  )
}
