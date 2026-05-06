'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export type NotificationStatus = 'unread' | 'read' | 'dismissed';

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  status: NotificationStatus;
  url: string | null;
  created_at: string;
}

// ─── Busca notificações do usuário ────────────────────────────────────────────
export async function getNotifications() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { notifications: [], unreadCount: 0 };

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .neq('status', 'dismissed')
    .order('created_at', { ascending: false })
    .limit(50);

  const notifications = (data ?? []) as AppNotification[];
  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  return { notifications, unreadCount };
}

// ─── Marca notificação como lida ──────────────────────────────────────────────
export async function markAsRead(id: string) {
  const supabase = await createClient();
  await supabase
    .from('notifications')
    .update({ status: 'read' })
    .eq('id', id);
  revalidatePath('/notificacoes');
}

// ─── Marca todas como lidas ───────────────────────────────────────────────────
export async function markAllAsRead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('notifications')
    .update({ status: 'read' })
    .eq('user_id', user.id)
    .eq('status', 'unread');
  revalidatePath('/notificacoes');
}

// ─── Remove (dismiss) notificação individual ──────────────────────────────────
export async function dismissNotification(id: string) {
  const supabase = await createClient();
  await supabase
    .from('notifications')
    .update({ status: 'dismissed' })
    .eq('id', id);
  revalidatePath('/notificacoes');
}

// ─── Limpa todas as notificações lidas/vistas ─────────────────────────────────
export async function dismissAll() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('notifications')
    .update({ status: 'dismissed' })
    .eq('user_id', user.id)
    .neq('status', 'dismissed');
  revalidatePath('/notificacoes');
}

// ─── Busca preferências de notificação ───────────────────────────────────────
export async function getNotificationPreferences() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return data;
}

// ─── Salva preferências de notificação ──────────────────────────────────────
export async function saveNotificationPreferences(prefs: {
  daily_reminder: boolean;
  weekly_summary: boolean;
  budget_alert: boolean;
  fixed_expenses: boolean;
  fixed_income: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Não autenticado' };

  const { error } = await supabase
    .from('notification_preferences')
    .upsert(
      { user_id: user.id, ...prefs, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

  revalidatePath('/configuracoes');
  return { error: error?.message ?? null };
}

// ─── Conta notificações não lidas (para o badge do sino) ─────────────────────
export async function getUnreadCount(): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'unread');

  return count ?? 0;
}
