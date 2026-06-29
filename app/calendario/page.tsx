"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, LayoutDashboard, Calendar, Grid, Trash2, CalendarDays } from "lucide-react"
import { getCalendarEvents, CalendarEvent } from "./actions"
import Link from "next/link"
import { EditRecurringModal } from "@/components/edit-recurring-modal"
import { deleteReminder } from "../chat/actions"

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
]

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
const WEEKDAYS_SHORT = ["D", "S", "T", "Q", "Q", "S", "S"]

export default function CalendarioPage() {
  const [view, setView] = useState<'year' | 'month'>('month')
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  )
  const [selectedEventDetails, setSelectedEventDetails] = useState<CalendarEvent | null>(null)

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

  useEffect(() => {
    getCalendarEvents(currentYear).then(res => {
      if (res.success && res.events) {
        setEvents(res.events)
      }
    })
  }, [currentYear])

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay()
  }

  const goPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(prev => prev - 1)
    } else {
      setCurrentMonth(prev => prev - 1)
    }
  }

  const goNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(prev => prev + 1)
    } else {
      setCurrentMonth(prev => prev + 1)
    }
  }

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr)
  }

  const handleMonthClick = (monthIndex: number) => {
    setCurrentMonth(monthIndex)
    setView('month')
  }

  // Map dateStr -> { hasIncome, hasExpense, hasReminder, hasGoal }
  const eventDateMap = events.reduce<Record<string, { hasIncome: boolean; hasExpense: boolean; hasReminder: boolean; hasGoal: boolean }>>((acc, e) => {
    if (!acc[e.date]) acc[e.date] = { hasIncome: false, hasExpense: false, hasReminder: false, hasGoal: false }
    if (e.type === 'income') acc[e.date].hasIncome = true
    if (e.type === 'expense') acc[e.date].hasExpense = true
    if (e.type === 'reminder') acc[e.date].hasReminder = true
    if (e.type === 'goal') acc[e.date].hasGoal = true
    return acc
  }, {})

  // Filtra os eventos do mês a partir do dia selecionado (inclusive) até o final do mês
  const currentMonthStr = String(currentMonth + 1).padStart(2, '0')
  const monthPrefix = `${currentYear}-${currentMonthStr}`

  const selectedEvents = events
    .filter(e => e.date.startsWith(monthPrefix) && e.date >= selectedDate)
    .sort((a, b) => a.date.localeCompare(b.date))

  // VIEW: YEAR
  if (view === 'year') {
    return (
      <div className="min-h-screen bg-background text-foreground pb-20 p-4 pt-8 animate-in fade-in duration-300">
        <div className="sticky top-0 bg-background/90 backdrop-blur-md z-10 pb-4 mb-4 border-b border-white/5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setView('month')}
                className="h-10 w-10 rounded-xl bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
                title="Voltar ao Mês"
              >
                <ChevronLeft size={20} />
              </button>
              <h1 className="text-3xl font-extrabold text-foreground tracking-tight">{currentYear}</h1>
            </div>
            <div className="flex gap-3 text-primary">
              <Link href="/dashboard" className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-primary hover:bg-secondary/80 transition-colors" title="Painel">
                <LayoutDashboard size={20} />
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-6">
          {MONTH_NAMES.map((monthName, monthIndex) => {
            const daysInMonth = getDaysInMonth(currentYear, monthIndex)
            const firstDay = getFirstDayOfMonth(currentYear, monthIndex)
            const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
            const blanks = Array.from({ length: firstDay }, (_, i) => i)

            return (
              <div 
                key={monthName} 
                onClick={() => handleMonthClick(monthIndex)} 
                className="cursor-pointer bg-secondary/10 hover:bg-secondary/20 border border-white/5 rounded-2xl p-4 transition-all duration-250 hover:scale-[1.02]"
              >
                <h3 className="text-sm font-bold text-primary mb-3">{monthName}</h3>
                <div className="grid grid-cols-7 gap-x-[2px] gap-y-1 text-[9px] text-muted-foreground font-semibold mb-2">
                  {WEEKDAYS_SHORT.map((d, i) => <div key={i} className="text-center">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-x-[2px] gap-y-1 text-[11px] font-medium">
                  {blanks.map(b => <div key={`b-${b}`} />)}
                  {days.map(d => {
                    const dateStr = `${currentYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                    const isToday = dateStr === todayStr
                    const info = eventDateMap[dateStr]
                    return (
                      <div key={d} className="flex flex-col items-center justify-center min-h-[22px]">
                        <div className={`
                          text-center flex justify-center items-center rounded-full text-xs w-5 h-5
                          ${isToday ? 'bg-rose-500 text-white font-bold' : 'text-foreground'}
                        `}>
                          {d}
                        </div>
                        {info && !isToday && (
                          <div className="flex gap-[1.5px] mt-[2px]">
                            {info.hasExpense && <div className="w-[4px] h-[4px] rounded-full bg-rose-500" />}
                            {info.hasIncome && <div className="w-[4px] h-[4px] rounded-full bg-green-500" />}
                            {info.hasReminder && <div className="w-[4px] h-[4px] rounded-full bg-amber-500" />}
                            {info.hasGoal && <div className="w-[4px] h-[4px] rounded-full bg-indigo-500" />}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // VIEW: MONTH (REDISEHNED)
  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const blanks = Array.from({ length: firstDay }, (_, i) => i)

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 p-4 pt-8 animate-in fade-in duration-300 flex flex-col max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div className="flex items-center gap-2">
          <Link 
            href="/dashboard" 
            className="h-10 w-10 rounded-xl bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
            title="Voltar ao Painel"
          >
            <ChevronLeft size={20} />
          </Link>
          <button
            onClick={() => setView('year')}
            className="h-10 w-10 rounded-xl bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors text-primary"
            title="Ver Ano"
          >
            <Grid size={20} />
          </button>
        </div>
        <div className="flex items-center gap-1 bg-secondary/40 rounded-xl p-0.5 border border-white/5">
          <button 
            onClick={goPrevMonth}
            className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="px-2 text-sm font-semibold min-w-[100px] text-center">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>
          <button 
            onClick={goNextMonth}
            className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Calendário Mensal Card */}
      <div className="bg-secondary/15 border border-white/5 rounded-3xl p-5 shadow-lg mb-6">
        {/* Dias da semana */}
        <div className="grid grid-cols-7 gap-1 text-center mb-4">
          {WEEKDAYS.map((d, i) => (
            <div key={i} className="text-xs font-bold text-muted-foreground/85 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Grade de Dias */}
        <div className="grid grid-cols-7 gap-y-3 gap-x-1">
          {blanks.map(b => <div key={`blank-${b}`} className="aspect-square" />)}
          {days.map(d => {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
            const isSelected = dateStr === selectedDate
            const isToday = dateStr === todayStr
            const info = eventDateMap[dateStr]

            return (
              <div
                key={d}
                onClick={() => handleDayClick(dateStr)}
                className="flex flex-col items-center justify-center aspect-square cursor-pointer relative group"
              >
                <div className={`
                  flex items-center justify-center w-9 h-9 rounded-full text-base font-semibold transition-all duration-200
                  ${isSelected 
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.08]' 
                    : isToday 
                    ? 'border-2 border-rose-500 text-rose-500 font-bold' 
                    : 'text-foreground hover:bg-secondary/40'}
                `}>
                  {d}
                </div>

                {/* Event Dots */}
                {info && (
                  <div className="flex gap-[2px] mt-1 absolute bottom-0.5">
                    {info.hasExpense && <div className="w-[4px] h-[4px] rounded-full bg-rose-500" />}
                    {info.hasIncome && <div className="w-[4px] h-[4px] rounded-full bg-green-500" />}
                    {info.hasReminder && <div className="w-[4px] h-[4px] rounded-full bg-amber-500" />}
                    {info.hasGoal && <div className="w-[4px] h-[4px] rounded-full bg-indigo-500" />}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Seção de Compromissos do Dia Selecionado */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <CalendarDays size={18} className="text-primary" />
            Compromissos a partir de {selectedDate.split('-').reverse().join('/')}
          </h3>
          <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase bg-secondary/50 px-2.5 py-1 rounded-full">
            {selectedEvents.length} {selectedEvents.length === 1 ? 'evento' : 'eventos'}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-4 no-scrollbar">
          {selectedEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center bg-secondary/5 border border-white/5 rounded-3xl">
              <span className="text-4xl mb-2 opacity-35">📅</span>
              <p className="text-sm text-muted-foreground">
                Nenhum compromisso agendado para esta data.
              </p>
            </div>
          ) : (
            selectedEvents.map(ev => (
              <div 
                key={ev.id} 
                onClick={() => setSelectedEventDetails(ev)}
                className="flex justify-between items-center bg-secondary/15 hover:bg-secondary/25 p-4 rounded-2xl border border-white/5 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                    ev.type === 'income' ? 'bg-green-500' : 
                    ev.type === 'reminder' ? 'bg-amber-500' : 
                    ev.type === 'goal' ? 'bg-indigo-500' : 'bg-rose-500'
                  }`} />
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm leading-snug text-foreground truncate">{ev.description}</span>
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md flex-shrink-0">
                        Dia {ev.date.split('-').reverse().join('/').split('/')[0]}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      {ev.type === 'reminder' 
                        ? `Lembrete às ${ev.time}`
                        : ev.type === 'goal' 
                        ? `Aporte planejado`
                        : `Todo ${ev.is_business_day ? `${ev.day_of_month}º dia útil` : `dia ${ev.day_of_month}`}`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-3" onClick={(e) => e.stopPropagation()}>
                  {ev.type !== 'reminder' && (
                    <span className={`font-bold text-sm ${ev.type === 'income' || ev.type === 'goal' ? 'text-green-500' : 'text-foreground'}`}>
                      {ev.type === 'income' || ev.type === 'goal' ? '+' : '-'} R$ {ev.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  )}
                  {ev.type === 'reminder' ? (
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm('Excluir este lembrete?')) {
                          await deleteReminder(ev.reminder_id!);
                          const res = await getCalendarEvents(currentYear);
                          if (res.success && res.events) setEvents(res.events);
                        }
                      }}
                      className="h-8 w-8 rounded-lg flex items-center justify-center bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors"
                      aria-label="Excluir lembrete"
                    >
                      <Trash2 size={15} />
                    </button>
                  ) : ev.type === 'goal' ? (
                    <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide">Meta</span>
                  ) : (
                    <EditRecurringModal item={{
                      id: ev.recurring_id!,
                      description: ev.description,
                      amount: ev.amount!,
                      day_of_month: ev.day_of_month!,
                      is_business_day: ev.is_business_day!
                    }} />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal de Detalhes do Compromisso */}
      {selectedEventDetails && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-secondary border border-white/10 p-6 rounded-3xl max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className={`w-3.5 h-3.5 rounded-full ${
                selectedEventDetails.type === 'income' ? 'bg-green-500' : 
                selectedEventDetails.type === 'reminder' ? 'bg-amber-500' : 
                selectedEventDetails.type === 'goal' ? 'bg-indigo-500' : 'bg-rose-500'
              }`} />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {selectedEventDetails.type === 'income' ? 'Receita' :
                 selectedEventDetails.type === 'expense' ? 'Despesa' :
                 selectedEventDetails.type === 'reminder' ? 'Lembrete' : 'Meta'}
              </span>
            </div>

            <div className="space-y-2">
              <h4 className="text-lg font-bold text-foreground leading-snug break-words">
                {selectedEventDetails.description}
              </h4>
              <p className="text-xs text-muted-foreground">
                {selectedEventDetails.type === 'reminder' 
                  ? `Agendado para às ${selectedEventDetails.time}`
                  : selectedEventDetails.type === 'goal' 
                  ? `Aporte planejado`
                  : `Recorrência: ${selectedEventDetails.is_business_day ? `${selectedEventDetails.day_of_month}º dia útil` : `todo dia ${selectedEventDetails.day_of_month}`}`}
              </p>
            </div>

            <div className="pt-2 border-t border-white/5 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-muted-foreground block uppercase font-medium">Data</span>
                <span className="text-sm font-semibold text-foreground">
                  {selectedEventDetails.date.split('-').reverse().join('/')}
                </span>
              </div>
              {selectedEventDetails.amount && (
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block uppercase font-medium">Valor</span>
                  <span className={`text-base font-bold ${selectedEventDetails.type === 'income' || selectedEventDetails.type === 'goal' ? 'text-green-500' : 'text-foreground'}`}>
                    R$ {selectedEventDetails.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedEventDetails(null)}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/95 transition-colors mt-2"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
