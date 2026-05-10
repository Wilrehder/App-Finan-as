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

  const typeParam = searchParams.get("type") ?? "all"
  const period = searchParams.get("period") ?? "month"
  let baseDateStr = searchParams.get("date")

  if (!baseDateStr) {
    const m = parseInt(searchParams.get("month") ?? currentMonth.toString())
    const y = parseInt(searchParams.get("year") ?? currentYear.toString())
    const d = (m === currentMonth && y === currentYear) ? now.getDate() : 1
    baseDateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  const [y, m, d] = baseDateStr.split('-').map(Number)
  const baseDate = new Date(y, m - 1, d)

  let label = ""
  let subLabel = ""

  if (period === 'day') {
    label = baseDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace(' de ', '/')
    subLabel = baseDate.getFullYear().toString()
  } else if (period === 'week') {
    const dayOfWeek = baseDate.getDay()
    const diff = baseDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    const startOfWeek = new Date(y, m - 1, diff)
    const endOfWeek = new Date(y, m - 1, diff + 6)
    label = `${String(startOfWeek.getDate()).padStart(2, '0')} a ${String(endOfWeek.getDate()).padStart(2, '0')} ${MONTHS[endOfWeek.getMonth()].substring(0, 3)}`
    subLabel = endOfWeek.getFullYear().toString()
  } else if (period === 'year') {
    label = baseDate.getFullYear().toString()
    subLabel = "Ano Inteiro"
  } else {
    label = MONTHS[baseDate.getMonth()]
    subLabel = baseDate.getFullYear().toString()
  }

  const navigate = (newDate: Date) => {
    const params = new URLSearchParams(searchParams.toString())
    const ny = newDate.getFullYear()
    const nm = String(newDate.getMonth() + 1).padStart(2, '0')
    const nd = String(newDate.getDate()).padStart(2, '0')
    params.set("date", `${ny}-${nm}-${nd}`)
    params.set("month", newDate.getMonth().toString())
    params.set("year", newDate.getFullYear().toString())
    router.push(`?${params.toString()}`)
  }

  const goPrev = () => {
    const nextDate = new Date(baseDate)
    if (period === 'day') nextDate.setDate(nextDate.getDate() - 1)
    else if (period === 'week') nextDate.setDate(nextDate.getDate() - 7)
    else if (period === 'year') nextDate.setFullYear(nextDate.getFullYear() - 1)
    else nextDate.setMonth(nextDate.getMonth() - 1)
    navigate(nextDate)
  }

  const goNext = () => {
    const nextDate = new Date(baseDate)
    if (period === 'day') nextDate.setDate(nextDate.getDate() + 1)
    else if (period === 'week') nextDate.setDate(nextDate.getDate() + 7)
    else if (period === 'year') nextDate.setFullYear(nextDate.getFullYear() + 1)
    else nextDate.setMonth(nextDate.getMonth() + 1)
    
    if (nextDate > now) {
       // Opcional: Impedir avanço futuro. Mantendo simples, não impede, mas o dev pode limitar
    }
    
    navigate(nextDate)
  }

  const isCurrentOrFuture = baseDate >= now && period !== 'month'
  // Para mês usamos a checagem anterior
  const isCurrentMonth = period === 'month' && baseDate.getMonth() === currentMonth && baseDate.getFullYear() === currentYear

  const updateType = (type: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("type", type)
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="space-y-3 mb-2 mt-1">
      {/* Filtro de período */}
      <div className="flex gap-2">
        {[
          { value: "day", label: "Dia" },
          { value: "week", label: "Semana" },
          { value: "month", label: "Mês" },
          { value: "year", label: "Ano" },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString())
              params.set("period", opt.value)
              router.push(`?${params.toString()}`)
            }}
            className={`flex-1 h-8 rounded-xl text-xs font-medium transition-colors ${
              period === opt.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-transparent"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Navegador de mês/ano */}
      <div className="flex items-center justify-between bg-secondary/40 rounded-2xl px-2 py-1">
        <button
          onClick={goPrev}
          className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
          aria-label="Anterior"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="text-center">
          <p className="text-sm font-semibold tracking-tight capitalize">
            {label}
          </p>
          <p className="text-xs text-muted-foreground">{subLabel}</p>
        </div>

        <button
          onClick={goNext}
          disabled={period === 'month' ? isCurrentMonth : false} // Pode desabilitar no futuro se quiser
          className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
          aria-label="Próximo"
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
          { value: "goal_deposit", label: "Objetivos" },
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
