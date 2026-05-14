'use client';

import { useEffect, useState } from 'react';
import { Bell, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

async function getSWRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration('/');
  if (existing) return existing;
  return navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

const STORAGE_KEY = 'atlas_notif_onboarding_done';

export function NotificationOnboardingModal() {
  const [show, setShow] = useState(false);
  const [working, setWorking] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const handleShow = () => {
      // Só mostra se:
      // 1. Browser suporta notificações
      // 2. Permissão ainda não foi decidida (não granted nem denied)
      // 3. Usuário ainda não viu este modal (localStorage)
      const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
      if (!supported || Notification.permission !== 'default' || localStorage.getItem(STORAGE_KEY)) {
        // Pula para o próximo passo: tutorial
        window.dispatchEvent(new Event('onboarding-step-tour'));
        return;
      }
      setShow(true);
    };

    window.addEventListener('onboarding-step-notifications', handleShow);
    return () => {
      window.removeEventListener('onboarding-step-notifications', handleShow);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'dismissed');
    setShow(false);
    // Avança para o próximo passo: tutorial
    window.dispatchEvent(new Event('onboarding-step-tour'));
  };

  const handleAllow = async () => {
    setWorking(true);
    try {
      const perm = await Notification.requestPermission();
      localStorage.setItem(STORAGE_KEY, 'done');

      if (perm !== 'granted') {
        setShow(false);
        window.dispatchEvent(new Event('onboarding-step-tour'));
        return;
      }

      // Inscreve no push
      const reg = await getSWRegistration();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });

      setDone(true);
      // Fecha o modal após 2s mostrando o sucesso, depois avança
      setTimeout(() => {
        setShow(false);
        window.dispatchEvent(new Event('onboarding-step-tour'));
      }, 2000);
    } catch {
      localStorage.setItem(STORAGE_KEY, 'done');
      setShow(false);
      window.dispatchEvent(new Event('onboarding-step-tour'));
    } finally {
      setWorking(false);
    }
  };

  if (!show) return null;

  return (
    // Overlay
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      {/* Bottom sheet */}
      <div className="w-full max-w-md bg-background rounded-t-3xl px-6 pt-5 pb-10 animate-in slide-in-from-bottom-4 duration-300">
        {/* Handle bar */}
        <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-5" />

        {/* Botão fechar */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={20} />
        </button>

        {done ? (
          // Estado de sucesso
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center">
              <Bell size={28} className="text-green-400" />
            </div>
            <p className="text-lg font-bold">Tudo pronto! 🎉</p>
            <p className="text-sm text-muted-foreground">
              Você receberá alertas de contas, resumos e lembretes financeiros.
            </p>
          </div>
        ) : (
          <>
            {/* Ícone */}
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center">
                <Bell size={30} className="text-primary" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold tracking-tight">Ativar notificações</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Fique por dentro das suas finanças com alertas inteligentes.
                </p>
              </div>
            </div>

            {/* Lista de benefícios */}
            <ul className="space-y-2.5 mb-7">
              {[
                { emoji: '🔴', text: 'Despesas fixas vencendo hoje ou amanhã' },
                { emoji: '🟢', text: 'Receitas previstas para o dia' },
                { emoji: '📊', text: 'Resumo semanal dos seus gastos' },
                { emoji: '💬', text: 'Lembrete diário inteligente' },
              ].map(item => (
                <li key={item.text} className="flex items-center gap-3 text-sm">
                  <span className="text-base">{item.emoji}</span>
                  <span className="text-muted-foreground">{item.text}</span>
                </li>
              ))}
            </ul>

            {/* Botões */}
            <div className="flex flex-col gap-3">
              <Button
                className="w-full h-12 rounded-xl text-base font-semibold gap-2"
                onClick={handleAllow}
                disabled={working}
              >
                {working ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Bell size={18} />
                )}
                {working ? 'Ativando...' : 'Ativar notificações'}
              </Button>
            </div>

          </>
        )}
      </div>
    </div>
  );
}
