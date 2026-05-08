'use client';

import { useState } from 'react';
import { Bell, Calendar as CalendarIcon, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { confirmReminder } from '@/app/chat/actions';
import { useRouter } from 'next/navigation';

export function CreateReminderModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [remindAt, setRemindAt] = useState('09:00');
  const [frequency, setFrequency] = useState<'once' | 'daily' | 'weekly' | 'monthly'>('once');
  const [specificDate, setSpecificDate] = useState(new Date().toISOString().split('T')[0]);
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    if (!title) return;
    setLoading(true);
    try {
      await confirmReminder({
        intent: 'reminder',
        description: title,
        remind_at: remindAt,
        frequency,
        specific_date: frequency === 'once' ? specificDate : undefined,
        day_of_month: frequency === 'monthly' ? parseInt(dayOfMonth) : undefined,
      });
      setIsOpen(false);
      setTitle('');
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)}
        className="rounded-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
      >
        <Bell size={18} /> Novo Lembrete
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={() => setIsOpen(false)}>
          <div 
            className="bg-background w-full max-w-md rounded-t-[32px] sm:rounded-[32px] p-6 pb-10 space-y-6 animate-in slide-in-from-bottom-full duration-300 shadow-2xl border border-white/5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Novo Lembrete</h3>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-secondary rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">O que lembrar?</label>
                <Input 
                  placeholder="Ex: Pagar condomínio, Tomar remédio..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="h-12 rounded-2xl bg-secondary border-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Hora</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <Input 
                      type="time"
                      value={remindAt}
                      onChange={e => setRemindAt(e.target.value)}
                      className="h-12 pl-11 rounded-2xl bg-secondary border-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Frequência</label>
                  <select 
                    value={frequency}
                    onChange={e => setFrequency(e.target.value as any)}
                    className="w-full h-12 rounded-2xl bg-secondary border-none px-4 text-sm focus:ring-0"
                  >
                    <option value="once">Uma vez</option>
                    <option value="daily">Diário</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensal</option>
                  </select>
                </div>
              </div>

              {frequency === 'once' && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label className="text-sm font-medium text-muted-foreground">Data</label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <Input 
                      type="date"
                      value={specificDate}
                      onChange={e => setSpecificDate(e.target.value)}
                      className="h-12 pl-11 rounded-2xl bg-secondary border-none"
                    />
                  </div>
                </div>
              )}

              {frequency === 'monthly' && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label className="text-sm font-medium text-muted-foreground">Dia do mês</label>
                  <Input 
                    type="number"
                    min={1}
                    max={31}
                    value={dayOfMonth}
                    onChange={e => setDayOfMonth(e.target.value)}
                    className="h-12 rounded-2xl bg-secondary border-none"
                  />
                </div>
              )}
            </div>

            <Button 
              className="w-full h-14 rounded-2xl text-lg font-bold bg-blue-600 hover:bg-blue-700"
              onClick={handleSave}
              disabled={loading || !title}
            >
              {loading ? 'Salvando...' : 'Criar Lembrete'}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
