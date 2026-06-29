import { getDashboardData, getAvailablePeriods } from "./actions"
import { syncRecurringTransactions } from "@/lib/sync"
import { DashboardFilters } from "@/components/dashboard-filters"
import { TransactionTypeFilter } from "@/components/transaction-type-filter"
import { ExpenseChart, CHART_COLORS } from "@/components/ExpenseChart"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowUpIcon, ArrowDownIcon, PieChart, TrendingUp, Calendar, ChevronRight } from "lucide-react"
import { ExportPdfButton } from "@/components/export-pdf-button"
import { NotificationBell } from "@/components/notification-bell"
import { TransactionList } from "@/components/transaction-list"
import { FinInsights } from "@/components/fin-insights"
import { getCalendarEvents, CalendarEvent } from "@/app/calendario/actions"
import Link from "next/link"

// Helper para formatar data dos eventos do widget
function formatEventDate(eventDateStr: string, todayDateStr: string) {
  if (eventDateStr === todayDateStr) return "Hoje";
  
  const [ty, tm, td] = todayDateStr.split('-').map(Number);
  const [ey, em, ed] = eventDateStr.split('-').map(Number);
  
  const tDate = new Date(ty, tm - 1, td);
  const eDate = new Date(ey, em - 1, ed);
  
  const diffTime = eDate.getTime() - tDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return "Amanhã";
  
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${ed} de ${months[em - 1]}`;
}

export const revalidate = 30 // revalida a cada 30 segundos

export default async function DashboardPage(props: { searchParams: Promise<{ month?: string; year?: string; type?: 'all'|'income'|'expense'; date?: string; period?: string }> }) {
  const searchParams = await props.searchParams

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const [yearStr, monthStr, dayStr] = todayStr.split('-')
  const currentYear = parseInt(yearStr)
  const currentMonth = parseInt(monthStr)

  const filters = {
    month: searchParams.month ? parseInt(searchParams.month) : undefined,
    year: searchParams.year ? parseInt(searchParams.year) : undefined,
    date: searchParams.date,
    period: searchParams.period as any,
    type: undefined // Sempre busca tudo para os cards e gráficos
  }

  // Sync roda em background sem bloquear a navegação
  syncRecurringTransactions()

  // Queries paralelas — não esperam uma a outra
  const [data, availablePeriods, calendarRes] = await Promise.all([
    getDashboardData(filters),
    getAvailablePeriods(),
    getCalendarEvents(new Date().getFullYear())
  ])

  // Filtragem local das transações do extrato
  const currentType = searchParams.type ?? 'all'
  const filteredTransactions = data.transactions.filter(t => {
    if (currentType === 'all') return true
    return t.type === currentType
  })

  // Filtragem de eventos para o widget de calendário (deduplicando recorrentes e metas)
  const allEvents = calendarRes.success && calendarRes.events ? calendarRes.events : []
  
  // Ordena todos os eventos a partir de hoje por data
  const sortedFutureEvents = allEvents
    .filter((e: CalendarEvent) => e.date >= todayStr)
    .sort((a: CalendarEvent, b: CalendarEvent) => a.date.localeCompare(b.date))

  // Mantém apenas a próxima ocorrência de cada evento recorrente ou meta
  const uniqueFutureEvents: CalendarEvent[] = []
  const seenIds = new Set<string>()

  for (const e of sortedFutureEvents) {
    let baseId = e.id
    if (e.recurring_id) {
      baseId = `recurring-${e.recurring_id}`
    } else if (e.id.startsWith('goal-')) {
      baseId = e.id.split('-').slice(0, 2).join('-') // e.g. "goal-123"
    } else if (e.reminder_id) {
      baseId = `reminder-${e.reminder_id}`
    }

    if (!seenIds.has(baseId)) {
      seenIds.add(baseId)
      uniqueFutureEvents.push(e)
    }
  }

  const todayEvents = uniqueFutureEvents.filter((e: CalendarEvent) => e.date === todayStr)
  const upcomingEvents = uniqueFutureEvents
    .filter((e: CalendarEvent) => e.date > todayStr)
    .slice(0, 2)

  const weekdays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"]
  const monthsList = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
  const todayDateObj = new Date(currentYear, currentMonth - 1, parseInt(dayStr))
  const weekdayName = weekdays[todayDateObj.getDay()]

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

      {/* Widget de Calendário Customizado */}
      <Link href="/calendario" className="block group animate-in fade-in zoom-in-95 duration-500 delay-75">
        <Card className="bg-secondary/20 hover:bg-secondary/35 border border-white/5 hover:border-primary/20 transition-all duration-300 shadow-md rounded-3xl p-5 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
            <span className="text-5xl">📅</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* LADO ESQUERDO: Data de Hoje e Eventos de Hoje */}
            <div className="md:col-span-1 flex flex-col justify-between md:border-r md:border-white/5 md:pr-6">
              <div>
                <span className="text-[11px] font-bold tracking-widest text-rose-500 uppercase">
                  {weekdayName}
                </span>
                <h2 className="text-5xl font-extrabold text-white mt-1 leading-none tracking-tighter">
                  {dayStr}
                </h2>
              </div>
              
              <div className="mt-4">
                {todayEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground font-medium">
                    Nenhum Evento Hoje
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {todayEvents.map(e => (
                      <div key={e.id} className="flex items-center gap-2 text-xs">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          e.type === 'income' ? 'bg-green-500' :
                          e.type === 'expense' ? 'bg-rose-500' :
                          e.type === 'reminder' ? 'bg-amber-500' : 'bg-indigo-500'
                        }`} />
                        <span className="font-semibold truncate text-foreground">{e.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* LADO DIREITO: Próximos Eventos */}
            <div className="md:col-span-2 flex flex-col justify-center space-y-4">
              {upcomingEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4">
                  Sem compromissos futuros este mês.
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map(e => {
                    const eventDateObj = new Date(e.date + 'T00:00:00');
                    const eventWeekday = weekdays[eventDateObj.getDay()].toUpperCase();
                    const eventDay = eventDateObj.getDate();
                    const eventMonthName = monthsList[eventDateObj.getMonth()].toUpperCase();
                    
                    return (
                      <div key={e.id} className="space-y-1">
                        <span className="text-[10px] font-bold tracking-wider text-muted-foreground/80 uppercase">
                          {eventWeekday}, {eventDay} DE {eventMonthName}
                        </span>
                        <div className="flex items-center gap-2 text-sm bg-white/5 hover:bg-white/10 p-2.5 rounded-xl border border-white/5 transition-colors">
                          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                            e.type === 'income' ? 'bg-green-500' :
                            e.type === 'expense' ? 'bg-rose-500' :
                            e.type === 'reminder' ? 'bg-amber-500' : 'bg-indigo-500'
                          }`} />
                          <span className="font-medium truncate text-foreground flex-1">{e.description}</span>
                          {e.amount && (
                            <span className="text-xs font-semibold text-muted-foreground">
                              R$ {e.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Card>
      </Link>

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

      <div id="tour-dashboard-transactions" className="space-y-4 animate-in fade-in slide-in-from-bottom duration-500 delay-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Extrato do Período</h2>
          <ExportPdfButton
            transactions={filteredTransactions}
            income={data.income}
            expense={data.expense}
            balance={data.balance}
            periodLabel={`${new Date(filters.year ?? new Date().getFullYear(), filters.month ?? new Date().getMonth(), 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`}
          />
        </div>
        <TransactionTypeFilter />
        <TransactionList transactions={filteredTransactions} />
      </div>
    </div>
  )
}

