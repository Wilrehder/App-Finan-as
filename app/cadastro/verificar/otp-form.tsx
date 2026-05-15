"use client"

import { useState, useRef, useEffect } from "react"
import { verifyOtp, resendOtp } from "@/app/login/actions"
import { useFormStatus } from "react-dom"

function VerifyButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
    >
      {pending ? "Verificando..." : "Confirmar código"}
    </button>
  )
}

function ResendButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
    >
      {pending ? "Enviando..." : "Reenviar código"}
    </button>
  )
}

export function OtpForm({ email, error, message }: { email: string, error?: string, message?: string }) {
  const [otp, setOtp] = useState(["", "", "", "", "", "", "", ""])
  const [countdown, setCountdown] = useState(60)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Timer para o reenvio
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // Reset timer se a mensagem de sucesso de reenvio aparecer
  useEffect(() => {
    if (message) {
      setCountdown(60)
    }
  }, [message])

  const handleChange = (index: number, value: string) => {
    if (!/^[0-9]*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    if (value !== "" && index < 7) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && otp[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 8)
    if (pastedData) {
      const newOtp = [...otp]
      for (let i = 0; i < pastedData.length; i++) {
        newOtp[i] = pastedData[i]
      }
      setOtp(newOtp)
      const nextFocus = Math.min(pastedData.length, 7)
      inputRefs.current[nextFocus]?.focus()
    }
  }

  const isComplete = otp.every((digit) => digit !== "")

  return (
    <div className="space-y-6">
      <form action={verifyOtp} className="space-y-6">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="code" value={otp.join("")} />
        
        <div className="flex justify-between gap-1 sm:gap-1.5">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className="w-8 h-12 text-center text-lg font-bold bg-white/5 border border-white/10 rounded-xl text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 focus:bg-white/10 transition-all outline-none sm:w-10 sm:h-14 sm:text-xl"
            />
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm text-center">
            {error}
          </div>
        )}
        
        {message && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-sm text-center">
            {message}
          </div>
        )}

        <div className="transition-opacity duration-300" style={{ opacity: isComplete ? 1 : 0.5, pointerEvents: isComplete ? 'auto' : 'none' }}>
            <VerifyButton />
        </div>
      </form>

      <form action={resendOtp} className="text-center">
        <input type="hidden" name="email" value={email} />
        <div className="text-sm text-zinc-500 flex items-center justify-center gap-1">
          Não recebeu o código?{" "}
          {countdown > 0 ? (
            <span className="font-medium text-zinc-400">Aguarde {countdown}s</span>
          ) : (
            <ResendButton />
          )}
        </div>
      </form>
    </div>
  )
}
