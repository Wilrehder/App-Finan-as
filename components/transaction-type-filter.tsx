"use client"

import { useRouter, useSearchParams } from "next/navigation"

export function TransactionTypeFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const typeParam = searchParams.get("type") ?? "all"

  const updateType = (type: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("type", type)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex gap-2 w-full">
      {[
        { value: "all",     label: "Todas" },
        { value: "income",  label: "Receitas" },
        { value: "expense", label: "Despesas" },
        { value: "goal_deposit", label: "Objetivos" },
      ].map(opt => (
        <button
          key={opt.value}
          onClick={() => updateType(opt.value)}
          className={`flex-1 h-9 rounded-xl text-xs font-medium transition-all ${
            typeParam === opt.value
              ? "bg-primary text-primary-foreground shadow-sm scale-[1.02]"
              : "bg-secondary/50 text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
