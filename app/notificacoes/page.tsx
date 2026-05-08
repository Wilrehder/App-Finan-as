import { getNotifications } from './actions';
import { NotificationCenter } from '@/components/notification-center';
import { CreateReminderModal } from '@/components/create-reminder-modal';

export default async function NotificacoesPage() {
  const { notifications, unreadCount } = await getNotifications();

  return (
    <div className="flex flex-col min-h-screen pb-24 pt-8">
      <div className="px-4 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notificações</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Tudo em dia ✓'}
          </p>
        </div>
        <CreateReminderModal />
      </div>

      <NotificationCenter notifications={notifications} />
    </div>
  );
}
