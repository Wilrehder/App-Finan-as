"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import {
  ShieldCheck, Sparkles, TrendingUp, CheckCircle2,
  LogOut, RefreshCcw, Zap, Gift, CreditCard, ArrowRight,
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { TrialCardForm } from "@/components/trial-card-form"

type View = "main" | "trial" | "direct"

export default function AssinaturaPage() {
  const [view, setView] = useState<View>("main")
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const supabase = createClient()

  // Buscar email do usuário logado
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null)
    })
  }, [supabase])

  // Polling: detecta quando o webhook do Mercado Pago liberar o acesso
  useEffect(() => {
    const interval = setInterval(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const status = user?.user_metadata?.subscription_status
      if (status === "active" || status === "trial") {
        setVerifying(true)
        await supabase.auth.refreshSession()
        window.location.href = "/chat"
      }
    }, 4000)
    return () => clearInterval(interval)
  }, [supabase])

  // Checkout externo (fluxo antigo — PIX ou parcelado no MP)
  const handleDirectSubscribe = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/mercadopago/checkout", { method: "POST" })
      const data = await response.json()
      if (data.init_point) {
        window.location.href = data.init_point
      } else {
        alert("Erro ao iniciar pagamento. Tente novamente.")
        setLoading(false)
      }
    } catch {
      alert("Erro ao conectar com o servidor.")
      setLoading(false)
    }
  }

  // Callback de sucesso do trial (TrialCardForm)
  const handleTrialSuccess = () => {
    setVerifying(true)
    // Polling já vai detectar o trial e redirecionar
  }

  if (verifying) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCcw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
          <p className="text-zinc-300 text-sm">Ativando sua conta...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-start p-6 pb-16 bg-black overflow-hidden">
      {/* Background glows */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-emerald-500/10 rounded-full blur-[140px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-primary/6 rounded-full blur-[120px]" />

      <div className="relative z-10 w-full max-w-sm space-y-6 pt-10">

        {/* Logo + Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-white/5 border border-white/10 p-1.5">
              <Image src="/logo.png" alt="Finchat" fill className="object-contain p-0.5" priority />
            </div>
          </div>
          {view === "main" && (
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">Acesso Exclusivo</h1>
              <p className="text-sm text-zinc-500 mt-1">
                Assine o Finchat e organize suas finanças com IA
              </p>
            </div>
          )}
          {view === "trial" && (
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">Teste Grátis</h1>
              <p className="text-sm text-zinc-500 mt-1">
                3 dias grátis · cancele a qualquer momento
              </p>
            </div>
          )}
          {view === "direct" && (
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">Assinar Agora</h1>
              <p className="text-sm text-zinc-500 mt-1">
                Acesso imediato · pagamento via Mercado Pago
              </p>
            </div>
          )}
        </div>

        {/* ─── VIEW: MAIN ─── */}
        {view === "main" && (
          <>
            {/* Features */}
            <div className="bg-zinc-900/60 border border-white/8 rounded-2xl p-4 space-y-3">
              {[
                { icon: Sparkles, text: "Controle financeiro via Chat com IA" },
                { icon: TrendingUp, text: "Dashboards e relatórios automáticos" },
                { icon: CheckCircle2, text: "Objetivos e metas financeiras" },
                { icon: ShieldCheck, text: "Seus dados seguros na nuvem" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <span className="text-sm text-zinc-300">{text}</span>
                </div>
              ))}
            </div>

            {/* CTA Principal — Trial */}
            <div className="space-y-3">
              {/* Card de destaque: trial */}
              <button
                onClick={() => setView("trial")}
                className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_40px_-8px_rgba(52,211,153,0.6)] overflow-hidden"
              >
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Gift className="w-5 h-5" />
                    <div className="text-left">
                      <p className="font-extrabold text-sm leading-tight">Começar teste grátis</p>
                      <p className="text-[11px] font-medium opacity-75">3 dias grátis · cartão exigido</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 opacity-80" />
                </div>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/8" />
                <span className="text-xs text-zinc-600">ou</span>
                <div className="flex-1 h-px bg-white/8" />
              </div>

              {/* Opção secundária: assinar direto */}
              <button
                onClick={() => setView("direct")}
                className="w-full rounded-2xl bg-zinc-900/80 border border-white/10 hover:border-white/20 text-white font-medium text-sm transition-all duration-200 hover:bg-zinc-800/60 active:scale-[0.98] overflow-hidden"
              >
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-4 h-4 text-zinc-400" />
                    <div className="text-left">
                      <p className="font-semibold text-sm leading-tight text-zinc-200">Assinar direto</p>
                      <p className="text-[11px] text-zinc-500">PIX R$ 69,90 · ou 12x R$ 7,11</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-500" />
                </div>
              </button>
            </div>
          </>
        )}

        {/* ─── VIEW: TRIAL (formulário de cartão) ─── */}
        {view === "trial" && userEmail && (
          <>
            <TrialCardForm userEmail={userEmail} onSuccess={handleTrialSuccess} />
            <button
              onClick={() => setView("main")}
              className="w-full text-center text-xs text-zinc-600 hover:text-zinc-400 transition-colors py-2"
            >
              ← Voltar
            </button>
          </>
        )}

        {/* ─── VIEW: DIRECT (checkout externo MP) ─── */}
        {view === "direct" && (
          <>
            {/* Pricing cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Card 1: À vista */}
              <div className="relative bg-zinc-900/80 border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center backdrop-blur-xl hover:border-white/20 transition-all">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-white/5 border border-white/10 px-2 py-1 rounded-md mb-2.5">
                  À vista
                </span>
                <span className="text-2xl font-extrabold text-white leading-none">R$ 69,90</span>
                <span className="text-xs text-zinc-500 mt-1 leading-tight">anualidade no PIX ou cartão</span>
              </div>

              {/* Card 2: Parcelado */}
              <div className="relative bg-emerald-950/50 border border-emerald-500/40 rounded-2xl p-4 flex flex-col items-center text-center backdrop-blur-xl overflow-hidden hover:border-emerald-500/60 transition-all">
                <div className="absolute -top-px left-1/2 -translate-x-1/2">
                  <span className="text-[9px] font-bold text-black bg-emerald-400 px-2 py-0.5 rounded-b-md tracking-wide uppercase whitespace-nowrap">
                    + popular
                  </span>
                </div>
                <div className="absolute -bottom-2 -right-2 opacity-10">
                  <Zap className="w-14 h-14 text-emerald-400" />
                </div>
                <span className="relative z-10 text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-400/10 border border-emerald-400/20 px-2 py-1 rounded-md mb-2.5">
                  Parcelado
                </span>
                <span className="relative z-10 text-xl font-extrabold text-white leading-none">12x de R$ 7,11</span>
                <span className="relative z-10 text-xs text-emerald-400/80 mt-1">/mês no cartão</span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleDirectSubscribe}
                disabled={loading}
                className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-70 disabled:cursor-not-allowed text-black font-bold text-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_40px_-8px_rgba(52,211,153,0.5)] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCcw className="w-5 h-5 animate-spin" />
                    Abrindo pagamento...
                  </>
                ) : (
                  "Assinar agora →"
                )}
              </button>

              <p className="text-center text-xs text-zinc-600">
                Pagamento 100% seguro via Mercado Pago
              </p>

              <button
                onClick={() => setView("main")}
                className="w-full text-center text-xs text-zinc-600 hover:text-zinc-400 transition-colors py-1"
              >
                ← Voltar
              </button>
            </div>
          </>
        )}

        {/* Logged in as + Logout */}
        <div className="flex items-center justify-center gap-2 pt-2">
          {userEmail && (
            <span className="text-xs text-zinc-600 truncate max-w-[200px]">
              {userEmail}
            </span>
          )}
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              window.location.href = "/login"
            }}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-3 h-3" />
            Sair
          </button>
        </div>

      </div>
    </div>
  )
}
