"use client"

import { useEffect, useRef, useState } from "react"
import { CreditCard, Shield, Check, RefreshCcw, AlertCircle } from "lucide-react"

type PlanType = "monthly" | "annual"

interface TrialCardFormProps {
  userEmail: string
  onSuccess: () => void
}

declare global {
  interface Window {
    MercadoPago: any
    cardPaymentBrickController?: { unmount: () => void }
  }
}

export function TrialCardForm({ userEmail, onSuccess }: TrialCardFormProps) {
  const [plan, setPlan] = useState<PlanType>("monthly")
  const [accepted, setAccepted] = useState(false)
  const [sdkReady, setSdkReady] = useState(false)
  const [brickMounted, setBrickMounted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const brickContainerRef = useRef<HTMLDivElement>(null)
  const currentPlanRef = useRef<PlanType>(plan)

  // Manter ref atualizada para o callback do Brick ter acesso ao plano atual
  useEffect(() => {
    currentPlanRef.current = plan
  }, [plan])

  // Carrega o SDK do Mercado Pago
  useEffect(() => {
    if (document.getElementById("mp-sdk")) {
      if (window.MercadoPago) setSdkReady(true)
      return
    }
    const script = document.createElement("script")
    script.id = "mp-sdk"
    script.src = "https://sdk.mercadopago.com/js/v2"
    script.async = true
    script.onload = () => setSdkReady(true)
    document.head.appendChild(script)
  }, [])

  // Monta o Brick quando SDK estiver pronto e aceite feito
  useEffect(() => {
    if (!sdkReady || !accepted || brickMounted) return
    mountBrick()
  }, [sdkReady, accepted]) // eslint-disable-line

  // Remonta quando muda o plano (após já estar montado)
  useEffect(() => {
    if (!brickMounted) return
    window.cardPaymentBrickController?.unmount()
    setBrickMounted(false)
    setTimeout(() => mountBrick(), 100)
  }, [plan]) // eslint-disable-line

  function mountBrick() {
    const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || ""
    const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" })
    const bricks = mp.bricks()

    bricks
      .create("cardPayment", "mp-card-brick", {
        initialization: {
          amount: currentPlanRef.current === "monthly" ? 7.11 : 69.9,
          payer: { email: userEmail },
        },
        customization: {
          visual: {
            style: { theme: "dark" },
            hideFormTitle: true,
          },
          paymentMethods: {
            minInstallments: 1,
            maxInstallments: currentPlanRef.current === "monthly" ? 1 : 12,
          },
        },
        callbacks: {
          onReady: () => setBrickMounted(true),
          onError: (err: any) => {
            console.error("MP Brick error:", err)
            setError("Erro ao carregar o formulário de cartão. Tente recarregar a página.")
          },
          onSubmit: async (formData: any) => {
            setSubmitting(true)
            setError(null)
            try {
              const res = await fetch("/api/mercadopago/trial", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  card_token: formData.token,
                  plan_type: currentPlanRef.current,
                }),
              })
              const data = await res.json()
              if (data.success) {
                onSuccess()
              } else {
                setError(data.error || "Erro ao ativar o teste. Tente novamente.")
                setSubmitting(false)
              }
            } catch {
              setError("Erro de conexão. Tente novamente.")
              setSubmitting(false)
            }
          },
        },
      })
      .then((controller: any) => {
        window.cardPaymentBrickController = controller
      })
  }

  return (
    <div className="space-y-5">

      {/* Seletor de plano */}
      <div>
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">
          Plano após o teste grátis
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {/* Mensal */}
          <button
            type="button"
            onClick={() => setPlan("monthly")}
            className={`relative rounded-2xl p-3.5 text-left border transition-all duration-200 ${
              plan === "monthly"
                ? "bg-emerald-950/60 border-emerald-500/70 shadow-[0_0_20px_-4px_rgba(52,211,153,0.3)]"
                : "bg-zinc-900/60 border-white/8 hover:border-white/20"
            }`}
          >
            {plan === "monthly" && (
              <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-black" strokeWidth={3} />
              </span>
            )}
            <span className={`text-[10px] font-bold uppercase tracking-widest ${plan === "monthly" ? "text-emerald-400" : "text-zinc-500"}`}>
              Mensal
            </span>
            <p className={`text-lg font-extrabold mt-0.5 leading-none ${plan === "monthly" ? "text-white" : "text-zinc-400"}`}>
              R$ 7,11
            </p>
            <p className={`text-[10px] mt-0.5 ${plan === "monthly" ? "text-emerald-400/80" : "text-zinc-600"}`}>
              /mês no cartão
            </p>
          </button>

          {/* Anual */}
          <button
            type="button"
            onClick={() => setPlan("annual")}
            className={`relative rounded-2xl p-3.5 text-left border transition-all duration-200 ${
              plan === "annual"
                ? "bg-emerald-950/60 border-emerald-500/70 shadow-[0_0_20px_-4px_rgba(52,211,153,0.3)]"
                : "bg-zinc-900/60 border-white/8 hover:border-white/20"
            }`}
          >
            <div className="absolute -top-px left-1/2 -translate-x-1/2">
              <span className="text-[9px] font-bold text-black bg-emerald-400 px-2 py-0.5 rounded-b-md tracking-wide uppercase whitespace-nowrap">
                economize 17%
              </span>
            </div>
            {plan === "annual" && (
              <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-black" strokeWidth={3} />
              </span>
            )}
            <span className={`text-[10px] font-bold uppercase tracking-widest ${plan === "annual" ? "text-emerald-400" : "text-zinc-500"}`}>
              Anual
            </span>
            <p className={`text-lg font-extrabold mt-0.5 leading-none ${plan === "annual" ? "text-white" : "text-zinc-400"}`}>
              R$ 69,90
            </p>
            <p className={`text-[10px] mt-0.5 ${plan === "annual" ? "text-emerald-400/80" : "text-zinc-600"}`}>
              /ano no cartão
            </p>
          </button>
        </div>
      </div>

      {/* Box de transparência */}
      <div className="bg-zinc-900/60 border border-white/8 rounded-2xl p-4 space-y-2.5">
        <p className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          Como funciona o teste grátis
        </p>
        <ul className="space-y-2">
          {[
            { bold: "3 dias totalmente grátis", rest: " — sem cobrança hoje." },
            {
              bold: "Após o período",
              rest: `, você é cobrado automaticamente ${plan === "monthly" ? "R$ 7,11/mês" : "R$ 69,90/ano"}.`,
            },
            { bold: "Cancele quando quiser", rest: " antes do prazo e não paga nada." },
            { bold: "Cobrança de R$ 1,00 estornada", rest: " imediatamente — só para validar seu cartão." },
            { bold: "Não precisa de conta", rest: " no Mercado Pago." },
          ].map(({ bold, rest }, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
              <span className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
              <span>
                <strong className="text-zinc-200">{bold}</strong>
                {rest}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Checkbox de aceite */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <div className="relative mt-0.5 flex-shrink-0">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="sr-only"
            id="trial-accept"
          />
          <div
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
              accepted
                ? "bg-emerald-500 border-emerald-500"
                : "bg-transparent border-zinc-600 group-hover:border-zinc-400"
            }`}
          >
            {accepted && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
          </div>
        </div>
        <span className="text-xs text-zinc-400 leading-relaxed">
          Entendo que, após os 3 dias de teste, serei cobrado automaticamente{" "}
          <strong className="text-zinc-200">
            {plan === "monthly" ? "R$ 7,11/mês" : "R$ 69,90/ano"}
          </strong>{" "}
          e posso cancelar antes disso sem custo algum.
        </span>
      </label>

      {/* Formulário de cartão (MP Brick) */}
      {accepted && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5" />
            Dados do cartão
          </p>

          {/* Dica sobre autopreenchimento */}
          <div className="flex items-start gap-2 bg-amber-950/40 border border-amber-500/25 rounded-xl px-3 py-2.5">
            <span className="text-amber-400 text-sm flex-shrink-0">⚠️</span>
            <p className="text-[11px] text-amber-300/80 leading-relaxed">
              <strong className="text-amber-300">Digite o nome e o CPF manualmente.</strong>{" "}
              O preenchimento automático do celular pode causar erro de validação nesses campos.
            </p>
          </div>

          {/* Container do Brick */}
          <div
            className={`transition-opacity duration-300 ${brickMounted ? "opacity-100" : "opacity-0"}`}
          >
            <div id="mp-card-brick" ref={brickContainerRef} />
          </div>

          {/* Skeleton enquanto carrega */}
          {!brickMounted && (
            <div className="h-48 rounded-2xl bg-zinc-900/60 border border-white/8 flex items-center justify-center">
              <RefreshCcw className="w-5 h-5 text-zinc-600 animate-spin" />
            </div>
          )}
        </div>
      )}


      {/* Erro */}
      {error && (
        <div className="flex items-start gap-2.5 bg-red-950/50 border border-red-500/30 rounded-2xl p-3.5">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* Loading de submissão */}
      {submitting && (
        <div className="flex flex-col items-center gap-3 py-4">
          <RefreshCcw className="w-6 h-6 text-emerald-400 animate-spin" />
          <p className="text-sm text-zinc-400">Ativando seu teste grátis...</p>
        </div>
      )}
    </div>
  )
}
