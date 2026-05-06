"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
]

export function DashboardFilters({
  availableMonths,
  availableYears,
}: {
  availableMonths: string[]
  availableYears: string[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const month = parseInt(searchParams.get("month") ?? currentMonth.toString())
  const year = parseInt(searchParams.get("year") ?? currentYear.toString())
  const typeParam = searchParams.get("type") ?? "all"

  // ─── Navegação de mês ─────────────────────────────────────────────────────
  const navigate = (newMonth: number, newYear: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("month", newMonth.toString())
    params.set("year", newYear.toString())
    router.push(`?${params.toString()}`)
  }

  const goPrev = () => {
    if (month === 0) navigate(11, year - 1)
    else navigate(month - 1, year)
  }

  const goNext = () => {
    // Não avança além do mês atual
    if (year === currentYear && month === currentMonth) return
    if (month === 11) navigate(0, year + 1)
    else navigate(month + 1, year)
  }

  const isCurrentMonth = month === currentMonth && year === currentYear
  const isFirstMonth = availableYears.length > 0
    && year === parseInt(availableYears[availableYears.length - 1])
    && (availableMonths.length === 0 || month <= parseInt(availableMonths[0]))

  const updateType = (type: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("type", type)
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="space-y-3 mb-2 mt-1">
      {/* Navegador de mês/ano */}
      <div className="flex items-center justify-between bg-secondary/40 rounded-2xl px-2 py-1">
        <button
          onClick={goPrev}
          disabled={isFirstMonth}
          className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
          aria-label="Mês anterior"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="text-center">
          <p className="text-sm font-semibold tracking-tight capitalize">
            {MONTHS[month]}
          </p>
          <p className="text-xs text-muted-foreground">{year}</p>
        </div>

        <button
          onClick={goNext}
          disabled={isCurrentMonth}
          className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
          aria-label="Próximo mês"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Filtro de tipo — pills */}
      <div className="flex gap-2">
        {[
          { value: "all",     label: "Todas" },
          { value: "income",  label: "Receitas" },
          { value: "expense", label: "Despesas" },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => updateType(opt.value)}
            className={`flex-1 h-8 rounded-xl text-xs font-medium transition-colors ${
              typeParam === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
