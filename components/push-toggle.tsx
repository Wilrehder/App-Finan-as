"use client"

import { useEffect, useState } from "react"
import { Bell, BellOff, Loader2 } from "lucide-react"

type Status = "loading" | "unsupported" | "denied" | "off" | "on" | "error"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

// Wrapper com timeout para não travar quando o SW ainda não está ativo
function getSWRegistration(timeoutMs = 5000): Promise<ServiceWorkerRegistration> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Service Worker não está ativo. Tente após recarregar o app.")), timeoutMs)
    ),
  ])
}

export function PushToggle() {
  const [status, setStatus] = useState<Status>("loading")
  const [working, setWorking] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported")
      return
    }

    const perm = Notification.permission
    if (perm === "denied") {
      setStatus("denied")
      return
    }

    // Timeout de segurança: se o SW demorar mais de 4s para ativar,
    // mostra o toggle como "off" ao invés de ficar girando para sempre
    const timeout = setTimeout(() => {
      setStatus("off")
    }, 4000)

    navigator.serviceWorker.ready
      .then((reg) => {
        clearTimeout(timeout)
        return reg.pushManager.getSubscription()
      })
      .then((sub) => {
        setStatus(sub ? "on" : "off")
      })
      .catch(() => {
        clearTimeout(timeout)
        setStatus("off")
      })

    return () => clearTimeout(timeout)
  }, [])

  const enable = async () => {
    setWorking(true)
    setErrorMsg("")
    try {
      const perm = await Notification.requestPermission()
      if (perm !== "granted") {
        setStatus("denied")
        return
      }

      const reg = await getSWRegistration()
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      })

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      })

      if (res.ok) {
        setStatus("on")
      } else {
        setErrorMsg("Erro ao salvar. Tente novamente.")
      }
    } catch (err: any) {
      console.error("Erro ao ativar push:", err)
      setErrorMsg("Recarregue o app e tente novamente.")
    } finally {
      setWorking(false)
    }
  }

  const disable = async () => {
    setWorking(true)
    setErrorMsg("")
    try {
      const reg = await getSWRegistration()
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setStatus("off")
    } catch (err) {
      console.error("Erro ao desativar push:", err)
    } finally {
      setWorking(false)
    }
  }

  const testNotification = async () => {
    if (Notification.permission === "granted") {
      const reg = await getSWRegistration()
      reg.showNotification("Prisma 💰", {
        body: "Notificações estão funcionando! 🎉",
        icon: "/icon-192x192.png",
        badge: "/icon-192x192.png",
        vibrate: [100, 50, 100],
      } as NotificationOptions)
    }
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-between py-1">
        <span className="text-sm font-medium flex items-center gap-2">
          <Bell size={16} /> Notificações
        </span>
        <Loader2 size={16} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="flex flex-col gap-1 py-1">
        <span className="text-sm font-medium flex items-center gap-2">
          <Bell size={16} /> Notificações
        </span>
        <p className="text-xs text-red-400">{errorMsg || "Erro inesperado. Recarregue o app."}</p>
      </div>
    )
  }

  if (status === "unsupported") {
    return (
      <div className="flex items-center justify-between py-1 opacity-50">
        <span className="text-sm font-medium flex items-center gap-2">
          <BellOff size={16} /> Notificações
        </span>
        <span className="text-xs text-muted-foreground">Não suportado</span>
      </div>
    )
  }

  if (status === "denied") {
    return (
      <div className="flex flex-col gap-1 py-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-2">
            <BellOff size={16} className="text-red-500" /> Notificações bloqueadas
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Acesse as configurações do navegador para permitir notificações.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium flex items-center gap-2">
          <Bell size={16} className={status === "on" ? "text-primary" : ""} />
          Notificações
        </span>
        <button
          onClick={status === "on" ? disable : enable}
          disabled={working}
          className={`relative w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none ${
            status === "on" ? "bg-primary" : "bg-secondary border border-input"
          }`}
          aria-label={status === "on" ? "Desativar notificações" : "Ativar notificações"}
        >
          {working ? (
            <Loader2
              size={12}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-muted-foreground"
            />
          ) : (
            <div
              className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${
                status === "on" ? "left-6" : "left-1"
              }`}
            />
          )}
        </button>
      </div>

      {errorMsg && status !== "on" && (
        <p className="text-xs text-red-400">{errorMsg}</p>
      )}

      {status === "on" && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Você receberá avisos de contas fixas que vencem hoje ou amanhã.
          </p>
          <button
            onClick={testNotification}
            className="text-xs text-primary font-medium hover:underline ml-2 shrink-0"
          >
            Testar
          </button>
        </div>
      )}
    </div>
  )
}
