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
  recurring_id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD
}

export async function getCalendarEvents(year: number) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, events: [] }

  const { data: recurring, error } = await supabase
    .from('recurring_transactions')
    .select('*')
    .eq('user_id', user.id)

  if (error || !recurring) {
    return { success: false, events: [] }
  }

  const events: CalendarEvent[] = [];

  for (const rec of recurring) {
    // Generate events for all 12 months
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
      const yyyy = year;

      events.push({
        id: `${rec.id}-${yyyy}-${mm}`,
        recurring_id: rec.id,
        type: rec.type,
        amount: Number(rec.amount),
        description: rec.description,
        date: `${yyyy}-${mm}-${dd}`
      });
    }
  }

  return { success: true, events };
}
