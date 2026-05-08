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

  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
        Nenhum gasto registrado este mês.
      </div>
    )
  }

  return (
    <>
      <div className="h-48 w-full mt-4 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setIsModalOpen(true)}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
              onClick={() => setIsModalOpen(true)}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
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
