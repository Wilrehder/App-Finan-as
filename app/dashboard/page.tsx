import { getDashboardData, getAvailablePeriods } from "./actions"
import { syncRecurringTransactions } from "@/lib/sync"
import { DashboardFilters } from "@/components/dashboard-filters"
import { ExpenseChart } from "@/components/ExpenseChart"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowUpIcon, ArrowDownIcon, PieChart, TrendingUp, Calendar } from "lucide-react"
import { ExportPdfButton } from "@/components/export-pdf-button"
import { NotificationBell } from "@/components/notification-bell"
import { NotificationOnboardingModal } from "@/components/notification-onboarding-modal"
import { TransactionList } from "@/components/transaction-list"
import Link from "next/link"

export const revalidate = 30 // revalida a cada 30 segundos

export default async function DashboardPage(props: { searchParams: Promise<{ month?: string; year?: string; type?: 'all'|'income'|'expense' }> }) {
  const searchParams = await props.searchParams
  
  const filters = {
    month: searchParams.month ? parseInt(searchParams.month) : undefined,
    year: searchParams.year ? parseInt(searchParams.year) : undefined,
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
      {/* Modal de onboarding de notificações — aparece 1 vez após o primeiro login */}
      <NotificationOnboardingModal />
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

      <Card className="bg-primary text-primary-foreground border-none shadow-lg">
        <CardHeader className="pb-2">
          <CardDescription className="text-primary-foreground/70 font-medium flex items-center gap-1.5">
            Total Gasto
          </CardDescription>
          <CardTitle className="text-4xl">R$ {data.expense.toFixed(2)}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mt-4 pt-4 border-t border-primary-foreground/10">
            <div className="flex flex-col">
              <span className="text-xs text-primary-foreground/70 flex items-center gap-1">
                <ArrowUpIcon size={12} className="text-green-400" /> Receitas
              </span>
              <span className="font-semibold mt-1">R$ {data.income.toFixed(2)}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-primary-foreground/70">
                Resultado do Mês
              </span>
              <span className={`font-semibold mt-1 ${data.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                R$ {data.balance.toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

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
              <ExpenseChart data={data.chartData} />
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {data.chartData.slice(0, 4).map((item, i) => (
                  <div key={item.name} className="flex items-center text-xs text-muted-foreground">
                    <div className="w-2 h-2 rounded-full mr-1 bg-primary" style={{ opacity: 1 - i * 0.2 }} />
                    {item.name}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-4">
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

