import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  iconClassName,
  iconBgClassName,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  /** Override the icon size (e.g. "h-16 w-16"); defaults to "h-5 w-5" */
  iconClassName?: string
  /** Override the icon container background (e.g. "bg-primary/5"); defaults to "bg-muted" */
  iconBgClassName?: string
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 py-8 text-center", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-full",
          iconBgClassName ?? "bg-muted h-11 w-11"
        )}
      >
        <Icon className={cn("h-5 w-5 text-muted-foreground", iconClassName)} />
      </div>
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="max-w-xs text-xs text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
