"use client"

import { useEffect, useState, useCallback } from "react"
import { Bell, BellOff, Loader2 } from "lucide-react"

type Status = "loading" | "unsupported" | "denied" | "off" | "on" | "error"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

async function getSWRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/")
  if (existing) return existing
  return Promise.race([
    navigator.serviceWorker.register("/sw.js", { scope: "/" }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Service Worker indisponível. Reabra o app.")), 6000)
    ),
  ])
}

export function PushToggle() {
  const [status, setStatus] = useState<Status>("loading")
  const [working, setWorking] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  // Verifica o estado atual da subscription
  const checkStatus = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported")
      return
    }
    if (Notification.permission === "denied") {
      setStatus("denied")
      return
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration("/")
      if (!reg) { setStatus("off"); return }
      const sub = await reg.pushManager.getSubscription()
      setStatus(sub ? "on" : "off")
    } catch {
      setStatus("off")
    }
  }, [])

  useEffect(() => {
    // Timeout de segurança
    const timeout = setTimeout(() => setStatus("off"), 5000)
    checkStatus().finally(() => clearTimeout(timeout))
    return () => clearTimeout(timeout)
  }, [checkStatus])

  // Re-verifica quando o usuário volta para a aba/app
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") checkStatus()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [checkStatus])

  const enable = async () => {
    setWorking(true)
    setErrorMsg("")
    try {
      const perm = await Notification.requestPermission()
      if (perm !== "granted") {
        setStatus("denied")
        return
      }

      if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        setErrorMsg("Configuração de notificações incompleta. Contate o suporte.")
        return
      }

      const reg = await getSWRegistration()
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      })

      // Atualiza o toggle IMEDIATAMENTE após o browser conceder — não espera a API
      setStatus("on")

      // Salva no banco em background (não bloqueia a UI)
      fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      }).catch(() => {
        // Falha silenciosa — o push está ativo no browser, DB é secundário
        console.warn("Falha ao salvar subscription no banco")
      })
    } catch (err: any) {
      console.error("Erro ao ativar push:", err)
      setErrorMsg("Recarregue o app e tente novamente.")
      setStatus("off")
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
        fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {})
        await sub.unsubscribe()
      }
      setStatus("off")
    } catch (err) {
      console.error("Erro ao desativar push:", err)
    } finally {
      setWorking(false)
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
          Acesse as configurações do seu celular para permitir notificações do Finchat.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
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

      {errorMsg && (
        <p className="text-xs text-red-400">{errorMsg}</p>
      )}

      {status === "on" && (
        <p className="text-xs text-muted-foreground">
          Você receberá avisos de contas fixas, lembretes e resumos financeiros.
        </p>
      )}
    </div>
  )
}
