"use client"

import { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { CategoryBreakdownModal } from './category-breakdown-modal'

interface Transaction {
  id: string
  description: string
  amount: number
  category: string
  type: string
  transaction_date: string
}

interface ChartProps {
  data: { name: string; value: number }[]
  transactions?: Transaction[]
}

export const CHART_COLORS = ['#818cf8', '#60a5fa', '#34d399', '#a78bfa', '#fbbf24', '#f472b6', '#94a3b8']

export function ExpenseChart({ data, transactions = [] }: ChartProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [includeGoals, setIncludeGoals] = useState(false)

  let displayData = [...data]
  if (includeGoals) {
    const goalsTotal = transactions.filter(t => t.type === 'goal_deposit').reduce((acc, t) => acc + Number(t.amount), 0)
    if (goalsTotal > 0) {
      displayData.push({ name: 'Objetivos', value: goalsTotal })
      displayData.sort((a, b) => b.value - a.value)
    }
  }

  if (!displayData || displayData.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
        Nenhum gasto registrado este mês.
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-end mb-2">
        <label className="flex items-center cursor-pointer gap-2 select-none">
          <div className="relative">
            <input 
              type="checkbox" 
              className="sr-only" 
              checked={includeGoals} 
              onChange={() => setIncludeGoals(!includeGoals)} 
            />
            <div className={`block w-10 h-6 rounded-full transition-colors ${includeGoals ? 'bg-indigo-500' : 'bg-secondary'}`}></div>
            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${includeGoals ? 'translate-x-4' : ''}`}></div>
          </div>
          <span className="text-xs text-muted-foreground">Incluir Objetivos</span>
        </label>
      </div>

      <div className="h-48 w-full mt-2 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setIsModalOpen(true)}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={displayData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
              onClick={() => setIsModalOpen(true)}
            >
              {displayData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.name === 'Objetivos' ? '#a5b4fc' : CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: any) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: 'none', color: '#fafafa' }}
              itemStyle={{ color: '#fafafa' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {isModalOpen && (
        <CategoryBreakdownModal 
          transactions={transactions} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </>
  )
}
