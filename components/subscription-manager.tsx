"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, XCircle } from "lucide-react"

interface SubscriptionManagerProps {
  status: string
  planType: string
  trialExpiresAt: string | null
}

export function SubscriptionManager({ status, planType, trialExpiresAt }: SubscriptionManagerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleCancel = async () => {
    if (!confirm("Tem certeza de que deseja cancelar sua assinatura? O acesso premium será revogado.")) return

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/mercadopago/cancel", { method: "POST" })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Falha ao cancelar")
      }

      window.location.reload()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  let title = "Sem plano ativo"
  let color = "text-zinc-500"
  let description = "Você não possui uma assinatura ativa no momento."
  let canCancel = false
  let canResubscribe = false

  const isTrial = status === "trial"
  const isActive = status === "active"
  const isCancelled = status === "cancelled"
  const isInactive = status === "inactive" || !status

  if (isInactive || isCancelled) {
    canResubscribe = true
  }

  if (isTrial) {
    title = `Teste Grátis (${planType === "monthly" ? "Mensal" : "Anual"})`
    color = "text-emerald-400"
    canCancel = true
    if (trialExpiresAt) {
      const expirationDate = new Date(trialExpiresAt)
      const diffDays = Math.ceil((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      if (diffDays > 0) {
        description = `Expira em ${diffDays} dia(s).`
      } else {
        description = "Expirando hoje."
      }
    }
  } else if (isActive) {
    title = `Assinatura ${planType === "monthly" ? "Mensal" : planType === "yearly" ? "Anual" : "Ativa"}`
    color = "text-emerald-500"
    canCancel = true
    description = "Sua conta premium está ativa."
  } else if (isCancelled) {
    title = "Cancelada"
    color = "text-red-400"
    description = "Sua assinatura foi cancelada."
    if (trialExpiresAt) {
      const expirationDate = new Date(trialExpiresAt)
      const diffDays = Math.ceil((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      if (diffDays > 0) {
        description = `Assinatura cancelada. Você ainda tem acesso grátis por mais ${diffDays} dia(s).`
      } else if (diffDays === 0) {
        description = "Assinatura cancelada. Você ainda tem acesso grátis até o fim de hoje."
      } else {
        description = "Sua assinatura foi cancelada e seu acesso expirou."
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 glass rounded-xl border border-white/5">
        <div>
          <h3 className={`font-semibold text-sm ${color}`}>{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {canCancel && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleCancel} 
          disabled={loading}
          className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/20"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cancelando...</>
          ) : (
            <><XCircle className="w-4 h-4 mr-2" /> Cancelar Assinatura</>
          )}
        </Button>
      )}

      {canResubscribe && (
        <Button 
          variant="default" 
          size="sm" 
          onClick={() => window.location.href = '/assinatura'}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
        >
          Assinar Novamente
        </Button>
      )}
    </div>
  )
}
