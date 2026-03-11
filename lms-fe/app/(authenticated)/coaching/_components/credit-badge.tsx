"use client"

import { CalendarCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface CreditBadgeProps {
  balance: number
}

export function CreditBadge({ balance }: CreditBadgeProps) {
  return (
    <Badge
      variant={balance > 0 ? "default" : "secondary"}
      className="gap-1 text-sm"
    >
      <CalendarCheck className="size-3.5" />
      残り {balance} 回
    </Badge>
  )
}
