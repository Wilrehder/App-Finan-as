"use client"

import { useRouter, useSearchParams } from "next/navigation"

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
]

export function DashboardFilters({ availableMonths, availableYears }: { availableMonths: string[], availableYears: string[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const currentMonth = new Date().getMonth().toString()
  const currentYear = new Date().getFullYear().toString()

  const monthParam = searchParams.get('month') || currentMonth
  const yearParam = searchParams.get('year') || currentYear
  const typeParam = searchParams.get('type') || "all"

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set(key, value)
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-3 w-full mb-6 mt-4">
      <select 
        value={monthParam} 
        onChange={(e) => updateFilters('month', e.target.value)}
        className="w-[120px] rounded-2xl p-2 px-3 text-sm glass border-none bg-secondary/50 outline-none appearance-none cursor-pointer"
      >
        {availableMonths.map((m) => (
          <option key={m} value={m}>{MONTHS[parseInt(m)]}</option>
        ))}
      </select>

      <select 
        value={yearParam} 
        onChange={(e) => updateFilters('year', e.target.value)}
        className="w-[90px] rounded-2xl p-2 px-3 text-sm glass border-none bg-secondary/50 outline-none appearance-none cursor-pointer"
      >
        {availableYears.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      <select 
        value={typeParam} 
        onChange={(e) => updateFilters('type', e.target.value)}
        className="flex-1 min-w-[120px] rounded-2xl p-2 px-3 text-sm glass border-none bg-secondary/50 outline-none appearance-none cursor-pointer"
      >
        <option value="all">Todas</option>
        <option value="income">Receitas</option>
        <option value="expense">Despesas</option>
      </select>
    </div>
  )
}
