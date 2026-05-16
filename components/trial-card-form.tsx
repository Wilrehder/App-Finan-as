"use client"

import { useEffect, useRef, useState } from "react"
import { CreditCard, Shield, Check, RefreshCcw, AlertCircle, Lock } from "lucide-react"

type PlanType = "monthly" | "annual"

interface TrialCardFormProps {
  userEmail: string
  onSuccess: () => void
}

declare global {
  interface Window { MercadoPago: any }
}

function formatCPF(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11)
  return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2")
}

const fieldBox = "h-12 rounded-xl border border-white/10 bg-zinc-900/80 px-4 flex items-center overflow-hidden"

export function TrialCardForm({ userEmail, onSuccess }: TrialCardFormProps) {
  const [plan, setPlan] = useState<PlanType>("monthly")
  const [accepted, setAccepted] = useState(false)
  const [sdkReady, setSdkReady] = useState(false)
  const [fieldsReady, setFieldsReady] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sdkError, setSdkError] = useState(false)
  const [name, setName] = useState("")
  const [cpf, setCpf] = useState("")
  const mpRef = useRef<any>(null)
  const fieldsRef = useRef<any>(null)
  const mountedRef = useRef(false)
  const planRef = useRef<PlanType>(plan)

  useEffect(() => { planRef.current = plan }, [plan])

  // Carrega SDK IMEDIATAMENTE ao montar o componente (não espera o checkbox)
  useEffect(() => {
    const existingScript = document.getElementById("mp-sdk")
    if (existingScript) {
      if (window.MercadoPago) setSdkReady(true)
      else existingScript.addEventListener("load", () => setSdkReady(true))
      return
    }
    const script = document.createElement("script")
    script.id = "mp-sdk"
    script.src = "https://sdk.mercadopago.com/js/v2"
    script.async = true
    script.onload = () => setSdkReady(true)
    script.onerror = () => setSdkError(true)
    document.head.appendChild(script)
  }, [])

  // Monta os campos quando: SDK pronto + checkbox marcado + ainda não montou
  useEffect(() => {
    if (!sdkReady || !accepted || mountedRef.current) return
    mountedRef.current = true

    // Aguarda o React pintar os divs no DOM antes de montar os iframes
    setTimeout(() => {
      try {
        const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || ""
        if (!publicKey) { setSdkError(true); return }

        const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" })
        mpRef.current = mp

        // Verifica se os elementos existem no DOM
        if (!document.getElementById("mp-cn")) {
          setError("Erro interno: recarregue a página."); return
        }

        // IMPORTANTE: guardar a MESMA instância para usar no createCardToken
        const fields = mp.fields()
        fieldsRef.current = fields

        const style = { color: "#e4e4e7", placeholderColor: "#52525b", fontSize: "15px" }
        let ready = 0
        const onReady = () => { ready++; if (ready >= 3) setFieldsReady(true) }

        const cn = fields.create("cardNumber", { style, placeholder: "0000 0000 0000 0000" })
        const ex = fields.create("expirationDate", { style, placeholder: "MM/AA" })
        const cv = fields.create("securityCode", { style, placeholder: "CVV" })

        cn.mount("mp-cn"); cn.on("ready", onReady)
        ex.mount("mp-ex"); ex.on("ready", onReady)
        cv.mount("mp-cv"); cv.on("ready", onReady)

      } catch (err: any) {
        console.error("MP mount error:", err)
        setSdkError(true)
      }
    }, 150)
  }, [sdkReady, accepted])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanCPF = cpf.replace(/\D/g, "")
    if (!name.trim()) { setError("Informe o nome do titular."); return }
    if (cleanCPF.length !== 11) { setError("CPF inválido. Digite os 11 dígitos."); return }
    if (!fieldsRef.current) { setError("Formulário não carregado. Recarregue a página."); return }

    setSubmitting(true)
    setError(null)
    try {
      // Usa a MESMA instância fields() guardada no ref
      const result = await fieldsRef.current.createCardToken({
        cardholderName: name.trim(),
        identificationType: "CPF",
        identificationNumber: cleanCPF,
      })

      if (!result.token) throw new Error(result.error?.message || "Token não gerado")

      const res = await fetch("/api/mercadopago/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_token: result.token, plan_type: planRef.current }),
      })
      const data = await res.json()
      if (data.success) {
        onSuccess()
      } else {
        setError(data.error || "Erro ao ativar. Tente novamente.")
        setSubmitting(false)
      }
    } catch (err: any) {
      setError(err.message || "Verifique os dados do cartão e tente novamente.")
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Seletor de plano */}
      <div>
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Plano após o teste grátis</p>
        <div className="grid grid-cols-2 gap-2.5">
          {(["monthly", "annual"] as PlanType[]).map((p) => (
            <button key={p} type="button" onClick={() => setPlan(p)}
              className={`relative rounded-2xl p-3.5 text-left border transition-all duration-200 ${plan === p ? "bg-emerald-950/60 border-emerald-500/70 shadow-[0_0_20px_-4px_rgba(52,211,153,0.3)]" : "bg-zinc-900/60 border-white/8 hover:border-white/20"}`}>
              {p === "annual" && (
                <div className="absolute -top-px left-1/2 -translate-x-1/2">
                  <span className="text-[9px] font-bold text-black bg-emerald-400 px-2 py-0.5 rounded-b-md tracking-wide uppercase whitespace-nowrap">economize 17%</span>
                </div>
              )}
              {plan === p && (
                <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-black" strokeWidth={3} />
                </span>
              )}
              <span className={`text-[10px] font-bold uppercase tracking-widest ${plan === p ? "text-emerald-400" : "text-zinc-500"}`}>{p === "monthly" ? "Mensal" : "Anual"}</span>
              <p className={`text-lg font-extrabold mt-0.5 leading-none ${plan === p ? "text-white" : "text-zinc-400"}`}>{p === "monthly" ? "R$ 7,11" : "R$ 69,90"}</p>
              <p className={`text-[10px] mt-0.5 ${plan === p ? "text-emerald-400/80" : "text-zinc-600"}`}>{p === "monthly" ? "/mês" : "/ano"}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Transparência */}
      <div className="bg-zinc-900/60 border border-white/8 rounded-2xl p-4 space-y-2.5">
        <p className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />Como funciona
        </p>
        <ul className="space-y-2">
          {[
            ["3 dias totalmente grátis", " — sem cobrança hoje."],
            ["Após o período", `, cobrado automaticamente ${plan === "monthly" ? "R$ 7,11/mês" : "R$ 69,90/ano"}.`],
            ["Cancele quando quiser", " antes do prazo, sem custo."],
            ["Cobrança de R$ 1,00 estornada", " para validar o cartão."],
            ["Sem conta no Mercado Pago", " necessária."],
          ].map(([b, r], i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
              <span className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
              <span><strong className="text-zinc-200">{b}</strong>{r}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Checkbox */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <div className="relative mt-0.5 flex-shrink-0">
          <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="sr-only" />
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${accepted ? "bg-emerald-500 border-emerald-500" : "bg-transparent border-zinc-600 group-hover:border-zinc-400"}`}>
            {accepted && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
          </div>
        </div>
        <span className="text-xs text-zinc-400 leading-relaxed">
          Entendo que, após os 3 dias, serei cobrado <strong className="text-zinc-200">{plan === "monthly" ? "R$ 7,11/mês" : "R$ 69,90/ano"}</strong> e posso cancelar antes sem custo.
        </span>
      </label>

      {/* Erro do SDK */}
      {sdkError && (
        <div className="flex items-start gap-2.5 bg-red-950/50 border border-red-500/30 rounded-2xl p-3.5">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">Não foi possível carregar o formulário de pagamento. Verifique sua conexão e recarregue a página.</p>
        </div>
      )}

      {/* Formulário de cartão */}
      {accepted && !sdkError && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5" />Dados do cartão
          </p>

          {/* Número */}
          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block">Número do cartão</label>
            <div className={fieldBox}>
              {!fieldsReady && <RefreshCcw className="w-4 h-4 text-zinc-600 animate-spin mr-2 flex-shrink-0" />}
              <div id="mp-cn" className="flex-1 h-full" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">Vencimento</label>
              <div className={fieldBox}><div id="mp-ex" className="flex-1 h-full" /></div>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">CVV</label>
              <div className={fieldBox}><div id="mp-cv" className="flex-1 h-full" /></div>
            </div>
          </div>

          {/* Nome — input HTML normal */}
          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block">Nome no cartão</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value.toUpperCase())}
              placeholder="COMO APARECE NO CARTÃO"
              autoComplete="cc-name"
              className="h-12 w-full rounded-xl border border-white/10 bg-zinc-900/80 px-4 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>

          {/* CPF — input HTML normal */}
          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block">CPF do titular</label>
            <input
              type="text"
              value={cpf}
              onChange={e => setCpf(formatCPF(e.target.value))}
              placeholder="000.000.000-00"
              inputMode="numeric"
              autoComplete="off"
              maxLength={14}
              className="h-12 w-full rounded-xl border border-white/10 bg-zinc-900/80 px-4 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-950/50 border border-red-500/30 rounded-2xl p-3.5">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !fieldsReady}
            className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_-8px_rgba(52,211,153,0.5)] flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><RefreshCcw className="w-5 h-5 animate-spin" />Ativando seu teste...</>
            ) : !fieldsReady ? (
              <><RefreshCcw className="w-4 h-4 animate-spin" />Carregando formulário...</>
            ) : (
              <><Lock className="w-4 h-4" />Começar 3 dias grátis</>
            )}
          </button>

          <p className="text-center text-[10px] text-zinc-600 flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" />Dados protegidos pelo Mercado Pago
          </p>
        </form>
      )}
    </div>
  )
}
