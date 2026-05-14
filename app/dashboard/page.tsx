import { getDashboardData, getAvailablePeriods } from "./actions"
import { syncRecurringTransactions } from "@/lib/sync"
import { DashboardFilters } from "@/components/dashboard-filters"
import { ExpenseChart, CHART_COLORS } from "@/components/ExpenseChart"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowUpIcon, ArrowDownIcon, PieChart, TrendingUp, Calendar, ChevronRight } from "lucide-react"
import { ExportPdfButton } from "@/components/export-pdf-button"
import { NotificationBell } from "@/components/notification-bell"
import { TransactionList } from "@/components/transaction-list"
import { FinInsights } from "@/components/fin-insights"
import Link from "next/link"

export const revalidate = 30 // revalida a cada 30 segundos

export default async function DashboardPage(props: { searchParams: Promise<{ month?: string; year?: string; type?: 'all'|'income'|'expense'; date?: string; period?: string }> }) {
  const searchParams = await props.searchParams
  
  const filters = {
    month: searchParams.month ? parseInt(searchParams.month) : undefined,
    year: searchParams.year ? parseInt(searchParams.year) : undefined,
    date: searchParams.date,
    period: searchParams.period as any,
    type: searchParams.type
  }

  // Sync roda em background sem bloquear a navegação
  syncRecurringTransactions()

  // Queries paralelas — não esperam uma a outra
  const [data, availablePeriods] = await Promise.all([
    getDashboardData(filters),
    getAvailablePeriods()
  ])

  return (
    <div className="flex flex-col min-h-screen p-4 pb-24 space-y-6 animate-in fade-in duration-500 pt-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Painel Financeiro</h1>
          <p className="text-sm text-muted-foreground">Analise suas movimentações</p>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <Link href="/calendario" className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-primary hover:bg-secondary/80 transition-colors">
            <Calendar size={20} />
          </Link>
          <ExportPdfButton
            transactions={data.transactions}
            income={data.income}
            expense={data.expense}
            balance={data.balance}
            periodLabel={`${new Date(filters.year ?? new Date().getFullYear(), filters.month ?? new Date().getMonth(), 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`}
          />
          <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
            <PieChart size={20} className="text-primary" />
          </div>
        </div>
      </div>

      {/* Componente de Filtros Interativos */}
      <DashboardFilters 
        availableMonths={availablePeriods.availableMonths} 
        availableYears={availablePeriods.availableYears} 
      />

      <Card id="tour-dashboard-overview" className="bg-primary text-primary-foreground border-none shadow-lg">
        <CardHeader className="pb-2">
          <CardDescription className="text-primary-foreground/70 font-medium flex items-center gap-1.5">
            Resultado do {data.periodLabel === 'day' ? 'Dia' : data.periodLabel === 'week' ? 'Período' : data.periodLabel === 'year' ? 'Ano' : 'Mês'}
          </CardDescription>
          <CardTitle className="text-4xl flex items-center gap-2">
            R$ {data.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </CardTitle>
          {data.changes && (
            <div className={`flex items-center gap-1 text-sm mt-1 ${data.changes.balance > 0 ? 'text-green-400' : data.changes.balance < 0 ? 'text-red-400' : 'text-primary-foreground/50'}`}>
              {data.changes.balance > 0 ? <ArrowUpIcon size={14} /> : data.changes.balance < 0 ? <ArrowDownIcon size={14} /> : null}
              <span>{Math.abs(data.changes.balance)}% vs anterior</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-primary-foreground/10">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-primary-foreground/70 font-semibold mb-1">
                Receitas
              </span>
              <span className="text-sm font-semibold text-green-400">R$ {data.income.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              {data.changes && (
                <div className={`flex items-center gap-0.5 text-[10px] mt-0.5 ${data.changes.income > 0 ? 'text-green-400/80' : data.changes.income < 0 ? 'text-red-400/80' : 'text-primary-foreground/50'}`}>
                  {data.changes.income > 0 ? <ArrowUpIcon size={10} /> : data.changes.income < 0 ? <ArrowDownIcon size={10} /> : null}
                  <span>{Math.abs(data.changes.income)}%</span>
                </div>
              )}
            </div>
            
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase tracking-wider text-primary-foreground/70 font-semibold mb-1">
                Despesas
              </span>
              <span className="text-sm font-semibold text-red-400">R$ {data.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              {data.changes && (
                <div className={`flex items-center gap-0.5 text-[10px] mt-0.5 ${data.changes.expense > 0 ? 'text-red-400/80' : data.changes.expense < 0 ? 'text-green-400/80' : 'text-primary-foreground/50'}`}>
                  {data.changes.expense > 0 ? <ArrowUpIcon size={10} /> : data.changes.expense < 0 ? <ArrowDownIcon size={10} /> : null}
                  <span>{Math.abs(data.changes.expense)}%</span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-wider text-primary-foreground/70 font-semibold mb-1">
                Objetivos
              </span>
              <span className="text-sm font-semibold text-indigo-300">R$ {(data.goalsTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              {data.changes && (
                <div className={`flex items-center gap-0.5 text-[10px] mt-0.5 ${data.changes.goals > 0 ? 'text-indigo-300/80' : data.changes.goals < 0 ? 'text-primary-foreground/50' : 'text-primary-foreground/50'}`}>
                  {data.changes.goals > 0 ? <ArrowUpIcon size={10} /> : data.changes.goals < 0 ? <ArrowDownIcon size={10} /> : null}
                  <span>{Math.abs(data.changes.goals)}%</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Link id="tour-dashboard-goals" href="/objetivos" className="block animate-in fade-in zoom-in-95 duration-500 delay-100">
        <Card className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 hover:border-indigo-500/40 transition-colors shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <span className="text-6xl">🎯</span>
          </div>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                <span className="text-lg">🎯</span>
              </div>
              <div>
                <h3 className="font-semibold text-base">Meus Objetivos</h3>
                <p className="text-xs text-muted-foreground">Acompanhe suas metas financeiras</p>
              </div>
            </div>
            <ChevronRight className="text-muted-foreground h-5 w-5" />
          </CardContent>
        </Card>
      </Link>

      <FinInsights />

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-secondary/30 border-none glass">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
            <span className="text-xs text-muted-foreground mb-1">Transações</span>
            <span className="text-2xl font-bold">{data.totalTransactions}</span>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary/30 border-none glass">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
            <span className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><TrendingUp size={12}/> Economia</span>
            <span className="text-2xl font-bold text-green-500">{data.savingsRate}%</span>
          </CardContent>
        </Card>

        {data.chartData.length > 0 && (
          <Card className="col-span-2 border-none glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Gastos por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <ExpenseChart data={data.chartData} transactions={data.transactions} />
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {data.chartData.slice(0, 4).map((item, i) => (
                  <div key={item.name} className="flex items-center text-xs text-muted-foreground">
                    <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    {item.name}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div id="tour-dashboard-transactions" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Extrato do Período</h2>
          <ExportPdfButton
            transactions={data.transactions}
            income={data.income}
            expense={data.expense}
            balance={data.balance}
            periodLabel={`${new Date(filters.year ?? new Date().getFullYear(), filters.month ?? new Date().getMonth(), 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`}
          />
        </div>
        <TransactionList transactions={data.transactions} />
      </div>
    </div>
  )
}

