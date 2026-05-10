"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ShieldCheck, Sparkles, TrendingUp, Lock } from "lucide-react"

export default function AssinaturaPage() {
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/mercadopago/checkout', {
        method: 'POST',
      })
      const data = await response.json()
      
      if (data.init_point) {
        window.location.href = data.init_point
      } else {
        alert("Erro ao iniciar pagamento. Tente novamente.")
        setLoading(false)
      }
    } catch (error) {
      console.error(error)
      alert("Erro ao conectar com o servidor.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md glass p-8 rounded-3xl space-y-8 border border-white/10 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-secondary/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex justify-center">
          <div className="bg-primary/20 p-4 rounded-full">
            <Lock className="w-10 h-10 text-primary" />
          </div>
        </div>

        <div className="space-y-2 relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight">
            Acesso Exclusivo
          </h1>
          <p className="text-muted-foreground">
            O Finchat é uma ferramenta premium. Assine para organizar suas finanças com Inteligência Artificial.
          </p>
        </div>

        <div className="bg-black/20 rounded-2xl p-6 text-left space-y-4 relative z-10">
          <div className="flex items-center gap-3">
            <Sparkles className="text-primary w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">Controle financeiro via Chat com IA</span>
          </div>
          <div className="flex items-center gap-3">
            <TrendingUp className="text-primary w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">Dashboards automáticos e inteligentes</span>
          </div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-primary w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">Seus dados seguros na nuvem</span>
          </div>
        </div>

        <div className="space-y-4 relative z-10">
          <div className="flex items-end justify-center gap-1">
            <span className="text-4xl font-extrabold">R$ 69,90</span>
            <span className="text-muted-foreground pb-1">/ ano</span>
          </div>

          <Button 
            size="lg" 
            className="w-full rounded-full shadow-lg shadow-primary/25 text-lg font-bold h-14"
            onClick={handleSubscribe}
            disabled={loading}
          >
            {loading ? "Processando..." : "Assinar Plano Anual"}
          </Button>
          
          <p className="text-xs text-muted-foreground text-center">
            Pagamento 100% seguro processado pelo Mercado Pago.
          </p>
        </div>
      </div>
    </div>
  )
}
