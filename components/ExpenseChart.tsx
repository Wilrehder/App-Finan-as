"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface ChartProps {
  data: { name: string; value: number }[]
}

const COLORS = ['#fafafa', '#a1a1aa', '#52525b', '#3f3f46', '#27272a', '#18181b']

export function ExpenseChart({ data }: ChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
        Nenhum gasto registrado este mês.
      </div>
    )
  }

  return (
    <div className="h-48 w-full mt-4">
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
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: any) => `R$ ${Number(value).toFixed(2)}`}
            contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: 'none', color: '#fafafa' }}
            itemStyle={{ color: '#fafafa' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
