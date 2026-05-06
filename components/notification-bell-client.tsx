'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useEffect, useState } from 'react';

export function NotificationBellClient() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Busca contagem via fetch para não bloquear o client component
    fetch('/api/notifications/unread-count')
      .then(r => r.json())
      .then(d => setCount(d.count ?? 0))
      .catch(() => {});
  }, []);

  return (
    <Link
      href="/notificacoes"
      className="relative h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80 transition-colors"
      aria-label="Notificações"
    >
      <Bell size={20} />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1 leading-none">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  );
}
