"use client"

import { useEffect, useState, useRef } from "react"
import { ChevronLeft, LayoutDashboard, Settings, Trash2 } from "lucide-react"
import { getCalendarEvents, CalendarEvent } from "./actions"
import Link from "next/link"
import { EditRecurringModal } from "@/components/edit-recurring-modal"
import { deleteReminder } from "../chat/actions"

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
]

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"]

export default function CalendarioPage() {
  const [view, setView] = useState<'year' | 'month'>('year')
  const [currentYear] = useState(new Date().getFullYear())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [monthScrollTarget, setMonthScrollTarget] = useState<number>(new Date().getMonth())
  const [sheetOpen, setSheetOpen] = useState(false)

  const monthListRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getCalendarEvents(currentYear).then(res => {
      if (res.success && res.events) {
        setEvents(res.events)
      }
    })
  }, [currentYear])

  useEffect(() => {
    if (view === 'month' && monthListRef.current) {
      const el = document.getElementById(`month-${monthScrollTarget}`)
      if (el) {
        el.scrollIntoView({ behavior: 'auto' })
      }
    }
  }, [view, monthScrollTarget])

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay()
  }

  const hasEvent = (dateString: string) => events.filter(e => e.date === dateString)

  const handleDayClick = (dateStr: string) => {
    const eventsForDay = events.filter(e => e.date === dateStr)
    if (eventsForDay.length > 0) {
      if (dateStr === selectedDate && sheetOpen) {
        setSheetOpen(false)
      } else {
        setSelectedDate(dateStr)
        setSheetOpen(true)
      }
    } else {
      setSelectedDate(dateStr)
      setSheetOpen(false)
    }
  }

  const handleMonthClick = (monthIndex: number) => {
    setMonthScrollTarget(monthIndex)
    setView('month')
  }

  // Map dateStr -> { hasIncome, hasExpense, hasReminder }
  const eventDateMap = events.reduce<Record<string, { hasIncome: boolean; hasExpense: boolean; hasReminder: boolean }>>((acc, e) => {
    if (!acc[e.date]) acc[e.date] = { hasIncome: false, hasExpense: false, hasReminder: false }
    if (e.type === 'income') acc[e.date].hasIncome = true
    if (e.type === 'expense') acc[e.date].hasExpense = true
    if (e.type === 'reminder') acc[e.date].hasReminder = true
    return acc
  }, {})

  const selectedEvents = hasEvent(selectedDate)

  // YEAR VIEW
  if (view === 'year') {
    return (
      <div className="min-h-screen bg-background text-foreground pb-20">
        <div className="pt-12 px-5 sticky top-0 bg-background/90 backdrop-blur-md z-10 pb-2">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-4xl font-bold text-red-500 tracking-tight">{currentYear}</h1>
            <div className="flex gap-4 text-primary">
              <Link href="/dashboard"><LayoutDashboard size={22} /></Link>
              <Link href="/configuracoes"><Settings size={22} /></Link>
            </div>
          </div>
        </div>

        <div className="px-5 grid grid-cols-3 gap-x-4 gap-y-8 mt-4">
          {MONTH_NAMES.map((monthName, monthIndex) => {
            const daysInMonth = getDaysInMonth(currentYear, monthIndex)
            const firstDay = getFirstDayOfMonth(currentYear, monthIndex)
            const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
            const blanks = Array.from({ length: firstDay }, (_, i) => i)

            return (
              <div key={monthName} onClick={() => handleMonthClick(monthIndex)} className="cursor-pointer">
                <h3 className="text-[14px] font-bold text-red-500 mb-1">{monthName}</h3>
                <div className="grid grid-cols-7 gap-x-[2px] gap-y-0.5 text-[8px] text-muted-foreground font-medium mb-1">
                  {WEEKDAYS.map((d, i) => <div key={i} className="text-center">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-x-[2px] gap-y-0.5 text-[10px] font-medium">
                  {blanks.map(b => <div key={`b-${b}`} />)}
                  {days.map(d => {
                    const dateStr = `${currentYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                    const isToday = dateStr === new Date().toISOString().split('T')[0]
                    const info = eventDateMap[dateStr]
                    return (
                      <div key={d} className="flex flex-col items-center">
                        <div className={`text-center flex justify-center items-center rounded-full ${isToday ? 'bg-red-500 text-white w-4 h-4 mx-auto' : 'text-foreground'}`}>
                          {d}
                        </div>
                        {/* dots: expense = red, income = green, reminder = blue */}
                        {info && !isToday && (
                          <div className="flex gap-[1px] mt-[1px]">
                            {info.hasExpense && <div className="w-[3px] h-[3px] rounded-full bg-red-500/70" />}
                            {info.hasIncome && <div className="w-[3px] h-[3px] rounded-full bg-green-500/70" />}
                            {info.hasReminder && <div className="w-[3px] h-[3px] rounded-full bg-blue-500/70" />}
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

  // MONTH VIEW (CONTINUOUS)
  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* Header */}
      <div className="pt-12 px-4 pb-2 flex justify-between items-center shrink-0">
        <button onClick={() => setView('year')} className="flex items-center text-red-500 font-medium text-lg">
          <ChevronLeft size={24} className="-ml-1" />
          <span>{currentYear}</span>
        </button>
        <div className="flex gap-4 text-primary">
          <Link href="/dashboard"><LayoutDashboard size={22} /></Link>
        </div>
      </div>

      {/* Weekdays Sticky Bar */}
      <div className="grid grid-cols-7 border-b border-border/40 pb-2 text-xs font-semibold text-muted-foreground px-2 shrink-0">
        {WEEKDAYS.map((d, i) => <div key={i} className="text-center">{d}</div>)}
      </div>

      {/* Continuous Scrollable Months */}
      <div ref={monthListRef} className="flex-1 overflow-y-auto px-2 pb-32 no-scrollbar">
        {MONTH_NAMES.map((monthName, monthIndex) => {
          const daysInMonth = getDaysInMonth(currentYear, monthIndex)
          const firstDay = getFirstDayOfMonth(currentYear, monthIndex)
          const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
          const blanks = Array.from({ length: firstDay }, (_, i) => i)

          return (
            <div key={monthName} id={`month-${monthIndex}`} className="mt-8 mb-4">
              <h2 className="text-2xl font-bold mb-4 ml-2">{monthName}</h2>
              <div className="grid grid-cols-7 gap-y-4">
                {blanks.map(b => <div key={`blank-${b}`} className="h-10" />)}
                {days.map(d => {
                  const dateStr = `${currentYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                  const isSelected = dateStr === selectedDate
                  const isToday = dateStr === new Date().toISOString().split('T')[0]
                  const info = eventDateMap[dateStr]
                  const hasIncome = info?.hasIncome ?? false
                  const hasExpense = info?.hasExpense ?? false

                  return (
                    <div
                      key={d}
                      onClick={() => handleDayClick(dateStr)}
                      className="flex flex-col items-center justify-start h-10 cursor-pointer relative"
                    >
                      <div className={`
                        flex items-center justify-center w-8 h-8 rounded-full text-lg font-medium transition-all
                        ${isSelected && sheetOpen
                          ? (isToday ? 'bg-red-500 text-white' : 'bg-primary/20 text-primary')
                          : (isToday ? 'text-red-500' : 'text-foreground')}
                      `}>
                        {d}
                      </div>

                      {/* Dots Container */}
                      <div className="flex gap-0.5 mt-0.5">
                        {hasExpense && <div className="w-1.5 h-1.5 rounded-full bg-red-500/80" />}
                        {hasIncome && <div className="w-1.5 h-1.5 rounded-full bg-green-500/80" />}
                        {info?.hasReminder && <div className="w-1.5 h-1.5 rounded-full bg-blue-500/80" />}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom Sheet Details overlay */}
      {sheetOpen && selectedEvents.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-secondary/95 backdrop-blur-xl border-t border-white/10 p-5 pt-3 rounded-t-3xl shadow-[0_-20px_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-full duration-300 z-[70] pb-32">
          {/* Handle — clicável para minimizar */}
          <button
            onClick={() => setSheetOpen(false)}
            className="w-full flex justify-center mb-4 py-1 -mt-1"
            aria-label="Fechar painel"
          >
            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
          </button>

          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Contas em {selectedDate.split('-').reverse().join('/')}
            </h3>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-bold">Fixas</span>
          </div>

          <div className="space-y-3 max-h-[40vh] overflow-y-auto no-scrollbar pb-2">
            {selectedEvents.map(ev => (
              <div key={ev.id} className="flex justify-between items-center bg-background/50 p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    ev.type === 'income' ? 'bg-green-500' : 
                    ev.type === 'reminder' ? 'bg-blue-500' : 'bg-red-500'
                  }`} />
                  <div className="flex flex-col">
                    <span className="font-medium text-sm leading-tight">{ev.description}</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      {ev.type === 'reminder' 
                        ? `Lembrete às ${ev.time}`
                        : `Todo ${ev.is_business_day ? `${ev.day_of_month}º dia útil` : `dia ${ev.day_of_month}`}`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {ev.type !== 'reminder' && (
                    <span className={`font-semibold text-sm ${ev.type === 'income' ? 'text-green-500' : 'text-foreground'}`}>
                      {ev.type === 'income' ? '+' : '-'} R$ {ev.amount?.toFixed(2)}
                    </span>
                  )}
                  {ev.type === 'reminder' ? (
                    <div className="flex gap-2">
                      <button 
                        onClick={async () => {
                          if (confirm('Excluir este lembrete?')) {
                            await deleteReminder(ev.reminder_id!);
                            const res = await getCalendarEvents(currentYear);
                            if (res.success && res.events) setEvents(res.events);
                          }
                        }}
                        className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
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
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
