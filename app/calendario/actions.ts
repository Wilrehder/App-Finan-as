"use server"

import { createClient } from "@/utils/supabase/server"

function getNthBusinessDay(year: number, month: number, nth: number): number {
  let businessDaysCount = 0;
  let currentDay = 1;
  const maxDays = new Date(year, month + 1, 0).getDate();

  while (currentDay <= maxDays) {
    const date = new Date(year, month, currentDay);
    const dayOfWeek = date.getDay();

    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDaysCount++;
    }

    if (businessDaysCount === nth) {
      return currentDay;
    }

    currentDay++;
  }

  let lastDay = maxDays;
  while (true) {
    const d = new Date(year, month, lastDay).getDay();
    if (d !== 0 && d !== 6) return lastDay;
    lastDay--;
  }
}

export type CalendarEvent = {
  id: string;
  recurring_id?: string;
  reminder_id?: string;
  type: 'income' | 'expense' | 'reminder';
  amount?: number;
  description: string;
  date: string; // YYYY-MM-DD
  day_of_month?: number;
  is_business_day?: boolean;
  time?: string;
}

export async function getCalendarEvents(year: number) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, events: [] }

  const [ { data: recurring }, { data: reminders } ] = await Promise.all([
    supabase.from('recurring_transactions').select('*').eq('user_id', user.id),
    supabase.from('reminders').select('*').eq('user_id', user.id).eq('is_active', true)
  ]);

  const events: CalendarEvent[] = [];

  // 1. Process Recurring Transactions
  if (recurring) {
    for (const rec of recurring) {
      for (let month = 0; month < 12; month++) {
        let targetDay: number;
        const maxDaysInMonth = new Date(year, month + 1, 0).getDate();

        if (rec.is_business_day) {
          targetDay = getNthBusinessDay(year, month, rec.day_of_month);
        } else {
          targetDay = Math.min(rec.day_of_month, maxDaysInMonth);
        }

        const mm = String(month + 1).padStart(2, '0');
        const dd = String(targetDay).padStart(2, '0');

        events.push({
          id: `${rec.id}-${year}-${mm}`,
          recurring_id: rec.id,
          type: rec.type,
          amount: Number(rec.amount),
          description: rec.description,
          date: `${year}-${mm}-${dd}`,
          day_of_month: rec.day_of_month,
          is_business_day: rec.is_business_day
        });
      }
    }
  }

  // 2. Process Reminders
  if (reminders) {
    for (const rem of reminders) {
      if (rem.frequency === 'once' && rem.specific_date) {
        if (rem.specific_date.startsWith(String(year))) {
          events.push({
            id: `rem-${rem.id}`,
            reminder_id: rem.id,
            type: 'reminder',
            description: rem.title,
            date: rem.specific_date,
            time: rem.remind_at
          });
        }
      } else if (rem.frequency === 'daily') {
        for (let month = 0; month < 12; month++) {
          const days = new Date(year, month + 1, 0).getDate();
          for (let d = 1; d <= days; d++) {
            events.push({
              id: `rem-${rem.id}-${month}-${d}`,
              reminder_id: rem.id,
              type: 'reminder',
              description: rem.title,
              date: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
              time: rem.remind_at
            });
          }
        }
      } else if (rem.frequency === 'monthly' && rem.day_of_month) {
        for (let month = 0; month < 12; month++) {
          const maxDays = new Date(year, month + 1, 0).getDate();
          const d = Math.min(rem.day_of_month, maxDays);
          events.push({
            id: `rem-${rem.id}-${month}`,
            reminder_id: rem.id,
            type: 'reminder',
            description: rem.title,
            date: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
            time: rem.remind_at
          });
        }
      } else if (rem.frequency === 'weekly' && rem.day_of_week !== undefined) {
        for (let month = 0; month < 12; month++) {
          const days = new Date(year, month + 1, 0).getDate();
          for (let d = 1; d <= days; d++) {
            const date = new Date(year, month, d);
            if (date.getDay() === rem.day_of_week) {
              events.push({
                id: `rem-${rem.id}-${month}-${d}`,
                reminder_id: rem.id,
                type: 'reminder',
                description: rem.title,
                date: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
                time: rem.remind_at
              });
            }
          }
        }
      }
    }
  }

  return { success: true, events };
}
