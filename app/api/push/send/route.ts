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
): Promise<boolean | 'remove'> {
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
  } catch (error: any) {
    console.error('Push error:', error);
    if (error.statusCode === 410 || error.statusCode === 404) {
      return 'remove';
    }
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

  // Vercel Cron envia: Authorization: Bearer <CRON_SECRET>
  // Também aceita header customizado x-cron-secret e query param secret (testes manuais)
  const authHeader = req.headers.get('authorization');
  const bearerSecret = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const secret = bearerSecret
    ?? req.headers.get('x-cron-secret')
    ?? req.nextUrl.searchParams.get('secret');

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'N�  // ─── 1. Coleta todos os dados necessários ───────────────────────────────────
  const [
    { data: allSubscriptions },
    { data: allRecurring },
    { data: allPrefs },
    { data: allReminders }
  ] = await Promise.all([
    supabase.from('push_subscriptions').select('*'),
    supabase.from('recurring_transactions').select('*'),
    supabase.from('notification_preferences').select('*'),
    supabase.from('reminders').select('*').eq('is_active', true)
  ]);

  // Mapa de usuários -> dados
  const userIds = Array.from(new Set([
    ...(allPrefs ?? []).map(p => p.user_id),
    ...(allSubscriptions ?? []).map(s => s.user_id),
    ...(allReminders ?? []).map(r => r.user_id)
  ]));

  const prefsMap: Record<string, any> = {};
  (allPrefs ?? []).forEach((p: any) => { prefsMap[p.user_id] = p; });

  const subsByUser: Record<string, any[]> = {};
  (allSubscriptions ?? []).forEach((s: any) => {
    if (!subsByUser[s.user_id]) subsByUser[s.user_id] = [];
    subsByUser[s.user_id].push(s);
  });

  const recurringByUser: Record<string, any[]> = {};
  (allRecurring ?? []).forEach((r: any) => {
    if (!recurringByUser[r.user_id]) recurringByUser[r.user_id] = [];
    recurringByUser[r.user_id].push(r);
  });

  const remindersByUser: Record<string, any[]> = {};
  (allReminders ?? []).forEach((r: any) => {
    if (!remindersByUser[r.user_id]) remindersByUser[r.user_id] = [];
    remindersByUser[r.user_id].push(r);
  });

  const failedEndpoints: string[] = [];
  let totalSaved = 0;
  let totalPushes = 0;

  // ─── 2. Processa cada usuário ───────────────────────────────────────────────
  for (const userId of userIds) {
    const prefs = prefsMap[userId] ?? {};
    if (prefs.enabled === false) continue;

    const toNotify: NotificationTemplate[] = [];
    const userRecurring = recurringByUser[userId] ?? [];
    const userReminders = remindersByUser[userId] ?? [];
    let hasImportantToday = false;

    // A. Despesa/Receita Hoje
    const todayItems = userRecurring.filter(r => getRecurringDay(r, br.year, br.month) === br.day);
    for (const item of todayItems) {
      const type = item.type === 'expense' ? 'FIXED_EXPENSE_TODAY' : 'FIXED_INCOME_TODAY';
      const prefKey = item.type === 'expense' ? 'fixed_expenses' : 'fixed_income';
      
      if (prefs[prefKey] !== false) {
        const alreadySent = await wasAlreadySentToday(supabase, userId, type, br.isoDate);
        if (!alreadySent) {
          toNotify.push(item.type === 'expense' 
            ? tplFixedExpenseToday(item.description, Number(item.amount))
            : tplFixedIncomeToday(item.description, Number(item.amount))
          );
          hasImportantToday = true;
        }
      }
    }

    // B. Despesa Amanhã
    if (prefs.fixed_expenses !== false) {
      const tomorrowItems = userRecurring.filter(r => r.type === 'expense' && getRecurringDay(r, tomorrow.year, tomorrow.month) === tomorrow.day);
      for (const item of tomorrowItems) {
        const alreadySent = await wasAlreadySentToday(supabase, userId, 'FIXED_EXPENSE_TOMORROW', br.isoDate);
        if (!alreadySent) {
          toNotify.push(tplFixedExpenseTomorrow(item.description, Number(item.amount)));
          hasImportantToday = true;
        }
      }
    }

    // C. Resumo Semanal
    if (prefs.weekly_summary !== false && br.weekday === 0 && br.hour >= 20 && br.hour < 21) {
      const alreadySent = await wasAlreadySentToday(supabase, userId, 'WEEKLY_SUMMARY', br.isoDate);
      if (!alreadySent) {
        const weekAgo = new Date(br.date); weekAgo.setDate(weekAgo.getDate() - 7);
        const { data: weekTx } = await supabase.from('transactions').select('amount, category, type').eq('user_id', userId).eq('type', 'expense').gte('transaction_date', weekAgo.toISOString().split('T')[0]);
        if (weekTx && weekTx.length > 0) {
          const total = weekTx.reduce((s: number, t: any) => s + Number(t.amount), 0);
          const byCat: Record<string, number> = {};
          weekTx.forEach((t: any) => { byCat[t.category] = (byCat[t.category] ?? 0) + Number(t.amount); });
          const topCategory = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Outros';
          toNotify.push(tplWeeklySummary({ totalExpense: total, topCategory, vsLastWeek: 0 })); // vsLastWeek simplified for brevity
        }
      }
    }

    // D. Lembrete Diário (19h-21h se nada aconteceu)
    if (!hasImportantToday && prefs.daily_reminder !== false && br.hour >= 19 && br.hour < 21) {
      const alreadySent = await wasAlreadySentToday(supabase, userId, 'DAILY_REMINDER', br.isoDate);
      if (!alreadySent) {
        const { count } = await supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('transaction_date', br.isoDate).lte('transaction_date', br.isoDate);
        if ((count ?? 0) === 0) toNotify.push(tplDailyReminder());
      }
    }

    // E. Lembretes Customizados (Tabela 'reminders')
    for (const rem of userReminders) {
      const [remHour] = rem.remind_at.split(':').map(Number);
      if (br.hour !== remHour) continue;

      let shouldSend = false;
      if (rem.last_sent_at !== br.isoDate) {
        if (rem.frequency === 'daily') shouldSend = true;
        else if (rem.frequency === 'once' && rem.specific_date === br.isoDate) shouldSend = true;
        else if (rem.frequency === 'monthly' && rem.day_of_month === br.day) shouldSend = true;
        else if (rem.frequency === 'weekly' && rem.day_of_week === br.weekday) shouldSend = true;
      }

      if (shouldSend) {
        toNotify.push({
          title: 'Lembrete 🔔',
          body: rem.title,
          type: 'CUSTOM_REMINDER',
          url: '/notificacoes',
          icon: '/icon-192x192.png'
        });
        // Marca como enviado imediatamente no banco original para não repetir
        await supabase.from('reminders').update({ last_sent_at: br.isoDate }).eq('id', rem.id);
      }
    }

    // ─── 3. Salva e Envia ──────────────────────────────────────────────────────
    for (const tpl of toNotify) {
      // 1. Salva na tabela de notificações (Garante que apareça no APP)
      await supabase.from('notifications').insert({
        user_id: userId,
        title: tpl.title,
        body: tpl.body,
        type: tpl.type,
        url: tpl.url,
        status: 'unread',
      });
      totalSaved++;

      // 2. Tenta enviar Push para todos os dispositivos deste usuário
      const userSubs = subsByUser[userId] ?? [];
      for (const sub of userSubs) {
        const pushSub: PushSubscription = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } };
        const payload = JSON.stringify({ title: tpl.title, body: tpl.body, icon: tpl.icon, badge: tpl.icon, url: tpl.url });

        try {
          await webpush.sendNotification(pushSub, payload);
          totalPushes++;
        } catch (error: any) {
          if (error.statusCode === 410 || error.statusCode === 404) {
            failedEndpoints.push(sub.endpoint);
          }
        }
      }
    }
  }

  // Cleanup
  if (failedEndpoints.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', failedEndpoints);
  }

  return NextResponse.json({ 
    success: true, 
    notifications_saved: totalSaved, 
    pushes_attempted: totalPushes,
    removed_subs: failedEndpoints.length 
  });
}
    if (shouldSend) {
        const res = await sendAndSave(supabase, userId, pushSub, {
          title: 'Lembrete 🔔',
          body: rem.title,
          type: 'CUSTOM_REMINDER',
          url: '/notificacoes',
          icon: '/icon-192x192.png'
        });

        if (res === true) {
          totalSent++;
          await supabase.from('reminders').update({ last_sent_at: br.isoDate }).eq('id', rem.id);
        } else if (res === 'remove') {
          failedEndpoints.push(sub.endpoint);
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
