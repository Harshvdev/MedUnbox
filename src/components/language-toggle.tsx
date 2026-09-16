"use client"

import * as React from "react"
import { Globe, Check } from "lucide-react"
import { useLanguage, type Language } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export function LanguageToggle({ className }: { className?: string }) {
  const { language, setLanguage } = useLanguage()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 gap-1.5 px-2.5 text-xs font-medium rounded-lg border-border/80 bg-background/60 hover:bg-accent",
            className
          )}
          title="Change language / भाषा बदलें"
        >
          <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="font-semibold uppercase tracking-wider text-[11px]">
            {language === "hi" ? "हि" : "EN"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36 rounded-xl p-1 shadow-lg">
        <DropdownMenuItem
          onClick={() => setLanguage("en")}
          className="flex items-center justify-between py-2 text-xs font-medium cursor-pointer rounded-lg"
        >
          <span>English</span>
          {language === "en" && <Check className="h-3.5 w-3.5 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage("hi")}
          className="flex items-center justify-between py-2 text-xs font-medium cursor-pointer rounded-lg"
        >
          <span>हिन्दी (Hindi)</span>
          {language === "hi" && <Check className="h-3.5 w-3.5 text-primary" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
