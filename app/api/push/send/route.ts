import { NextRequest, NextResponse } from 'next/server';
import webpush, { PushSubscription } from 'web-push';
import { createClient } from '@/utils/supabase/server';
import {
  tplDailyReminder,
  tplWeeklySummary,
  tplFixedExpenseTomorrow,
  tplFixedExpenseToday,
  tplFixedIncomeToday,
  NotificationTemplate,
} from '@/lib/notificationTemplates';

// ─── Helpers de data ──────────────────────────────────────────────────────────

function getBRDate() {
  const now = new Date();
  // Offset Brasília UTC-3
  const brOffset = -3 * 60;
  const local = new Date(now.getTime() + (brOffset - now.getTimezoneOffset()) * 60000);
  return {
    date: local,
    day: local.getDate(),
    month: local.getMonth(),
    year: local.getFullYear(),
    weekday: local.getDay(), // 0=dom, 6=sab
    hour: local.getHours(),
    isoDate: local.toISOString().split('T')[0], // YYYY-MM-DD
  };
}

function getNthBusinessDay(year: number, month: number, nth: number): number {
  let count = 0;
  let day = 1;
  const max = new Date(year, month + 1, 0).getDate();
  while (day <= max) {
    const d = new Date(year, month, day).getDay();
    if (d !== 0 && d !== 6) count++;
    if (count === nth) return day;
    day++;
  }
  let last = max;
  while (true) {
    const d = new Date(year, month, last).getDay();
    if (d !== 0 && d !== 6) return last;
    last--;
  }
}

function getRecurringDay(rec: any, year: number, month: number): number {
  return rec.is_business_day
    ? getNthBusinessDay(year, month, rec.day_of_month)
    : Math.min(rec.day_of_month, new Date(year, month + 1, 0).getDate());
}

// ─── Salva notificação no banco e envia push ──────────────────────────────────

async function sendAndSave(
  supabase: any,
  userId: string,
  pushSub: PushSubscription,
  tpl: NotificationTemplate
): Promise<boolean> {
  // Salva no banco de notificações
  await supabase.from('notifications').insert({
    user_id: userId,
    title: tpl.title,
    body: tpl.body,
    type: tpl.type,
    url: tpl.url,
    status: 'unread',
  });

  // Envia push
  const payload = JSON.stringify({
    title: tpl.title,
    body: tpl.body,
    icon: tpl.icon,
    badge: tpl.icon,
    url: tpl.url,
  });

  try {
    await webpush.sendNotification(pushSub, payload);
    return true;
  } catch {
    return false;
  }
}

// ─── Verifica cooldown: retorna true se já foi enviado esse tipo hoje ─────────

async function wasAlreadySentToday(
  supabase: any,
  userId: string,
  type: string,
  isoDate: string
): Promise<boolean> {
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type', type)
    .gte('created_at', `${isoDate}T00:00:00`)
    .lte('created_at', `${isoDate}T23:59:59`);
  return (count ?? 0) > 0;
}

// ─── Rota principal do cron ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const supabase = await createClient();
  const br = getBRDate();

  // Tomorrows
  const tomorrowDate = new Date(br.date);
  tomorrowDate.setDate(br.day + 1);
  const tomorrow = {
    day: tomorrowDate.getDate(),
    month: tomorrowDate.getMonth(),
    year: tomorrowDate.getFullYear(),
  };

  // Busca subscriptions + preferências + recorrentes em paralelo
  const [{ data: subscriptions }, { data: recurring }, { data: allPrefs }] = await Promise.all([
    supabase.from('push_subscriptions').select('*'),
    supabase.from('recurring_transactions').select('*'),
    supabase.from('notification_preferences').select('*'),
  ]);

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, message: 'Nenhuma subscription ativa' });
  }

  const prefsMap: Record<string, any> = {};
  (allPrefs ?? []).forEach((p: any) => { prefsMap[p.user_id] = p; });

  const recurringByUser: Record<string, any[]> = {};
  (recurring ?? []).forEach((r: any) => {
    if (!recurringByUser[r.user_id]) recurringByUser[r.user_id] = [];
    recurringByUser[r.user_id].push(r);
  });

  const failedEndpoints: string[] = [];
  let totalSent = 0;

  for (const sub of subscriptions) {
    const userId = sub.user_id;
    const prefs = prefsMap[userId] ?? {};

    // Se notificações desativadas globalmente, pula
    if (prefs.enabled === false) continue;

    const pushSub: PushSubscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    };

    const userRecurring = recurringByUser[userId] ?? [];
    let sentImportantToday = false;

    // ── 1. Despesa fixa hoje (prioridade máxima) ──────────────────────────────
    if (prefs.fixed_expenses !== false) {
      const todayExpenses = userRecurring.filter(r =>
        r.type === 'expense' &&
        getRecurringDay(r, br.year, br.month) === br.day
      );

      for (const rec of todayExpenses) {
        const alreadySent = await wasAlreadySentToday(supabase, userId, 'FIXED_EXPENSE_TODAY', br.isoDate);
        if (!alreadySent) {
          const ok = await sendAndSave(supabase, userId, pushSub, tplFixedExpenseToday(rec.description, Number(rec.amount)));
          if (ok) { totalSent++; sentImportantToday = true; }
        }
      }
    }

    // ── 2. Receita fixa hoje ──────────────────────────────────────────────────
    if (prefs.fixed_income !== false) {
      const todayIncomes = userRecurring.filter(r =>
        r.type === 'income' &&
        getRecurringDay(r, br.year, br.month) === br.day
      );

      for (const rec of todayIncomes) {
        const alreadySent = await wasAlreadySentToday(supabase, userId, 'FIXED_INCOME_TODAY', br.isoDate);
        if (!alreadySent) {
          const ok = await sendAndSave(supabase, userId, pushSub, tplFixedIncomeToday(rec.description, Number(rec.amount)));
          if (ok) { totalSent++; sentImportantToday = true; }
        }
      }
    }

    // ── 3. Despesa fixa amanhã ────────────────────────────────────────────────
    if (prefs.fixed_expenses !== false) {
      const tomorrowExpenses = userRecurring.filter(r =>
        r.type === 'expense' &&
        getRecurringDay(r, tomorrow.year, tomorrow.month) === tomorrow.day
      );

      for (const rec of tomorrowExpenses) {
        const alreadySent = await wasAlreadySentToday(supabase, userId, 'FIXED_EXPENSE_TOMORROW', br.isoDate);
        if (!alreadySent) {
          const ok = await sendAndSave(supabase, userId, pushSub, tplFixedExpenseTomorrow(rec.description, Number(rec.amount)));
          if (ok) { totalSent++; sentImportantToday = true; }
        }
      }
    }

    // ── 4. Resumo semanal (domingo 20h–21h) ───────────────────────────────────
    if (prefs.weekly_summary !== false && br.weekday === 0 && br.hour >= 20 && br.hour < 21) {
      const alreadySent = await wasAlreadySentToday(supabase, userId, 'WEEKLY_SUMMARY', br.isoDate);
      if (!alreadySent) {
        // Busca dados da semana (últimos 7 dias)
        const weekAgo = new Date(br.date);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const { data: weekTx } = await supabase
          .from('transactions')
          .select('amount, category, type')
          .eq('user_id', userId)
          .eq('type', 'expense')
          .gte('transaction_date', weekAgo.toISOString().split('T')[0]);

        if (weekTx && weekTx.length > 0) {
          const total = weekTx.reduce((s: number, t: any) => s + Number(t.amount), 0);
          const byCat: Record<string, number> = {};
          weekTx.forEach((t: any) => { byCat[t.category] = (byCat[t.category] ?? 0) + Number(t.amount); });
          const topCategory = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Outros';

          // Semana anterior para comparação
          const twoWeeksAgo = new Date(weekAgo);
          twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 7);
          const { data: prevWeekTx } = await supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', userId)
            .eq('type', 'expense')
            .gte('transaction_date', twoWeeksAgo.toISOString().split('T')[0])
            .lt('transaction_date', weekAgo.toISOString().split('T')[0]);

          const prevTotal = (prevWeekTx ?? []).reduce((s: number, t: any) => s + Number(t.amount), 0);

          const ok = await sendAndSave(supabase, userId, pushSub, tplWeeklySummary({
            totalExpense: total,
            topCategory,
            vsLastWeek: total - prevTotal,
          }));
          if (ok) { totalSent++; sentImportantToday = true; }
        }
      }
    }

    // ── 5. Lembrete diário inteligente (19h–21h, só se não houve nada importante) ──
    if (!sentImportantToday && prefs.daily_reminder !== false && br.hour >= 19 && br.hour < 21) {
      const alreadySent = await wasAlreadySentToday(supabase, userId, 'DAILY_REMINDER', br.isoDate);
      if (!alreadySent) {
        // Só envia se o usuário não registrou nada hoje
        const { count } = await supabase
          .from('transactions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('transaction_date', br.isoDate)
          .lte('transaction_date', br.isoDate);

        if ((count ?? 0) === 0) {
          const ok = await sendAndSave(supabase, userId, pushSub, tplDailyReminder());
          if (ok) totalSent++;
        }
      }
    }
  }

  // Remove subscriptions inválidas (410/404)
  if (failedEndpoints.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', failedEndpoints);
  }

  return NextResponse.json({ success: true, sent: totalSent, removed: failedEndpoints.length });
}
