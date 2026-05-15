import Image from "next/image"
import { use } from "react"
import Link from "next/link"
import { OtpForm } from "./otp-form"

export default function VerificarPage(props: { searchParams: Promise<{ email?: string, error?: string, message?: string }> }) {
  const searchParams = use(props.searchParams)
  const email = searchParams.email
  
  if (!email) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-white text-center">
        <p>E-mail não fornecido. <Link href="/cadastro" className="text-emerald-500 hover:text-emerald-400 font-medium underline">Voltar para o cadastro</Link></p>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-6 bg-black overflow-hidden">
        {/* Background glows */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/15 rounded-full blur-[120px]" />
        
        {/* Card */}
        <div className="relative w-full max-w-sm bg-zinc-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl p-8 space-y-7">
            {/* Subtle inner glow top */}
            <div className="pointer-events-none absolute -top-px left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />

            {/* Logo + Title */}
            <div className="flex flex-col items-center gap-3 text-center">
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-white/5 border border-white/10 p-2">
                    <Image src="/logo.png" alt="Finchat" fill className="object-contain p-1" priority />
                </div>
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-white">Verifique seu e-mail</h1>
                    <p className="text-sm text-zinc-400 mt-2">
                        Enviamos um código de 8 dígitos para<br />
                        <span className="text-emerald-400 font-medium">{email}</span>
                    </p>
                </div>
            </div>

            <OtpForm email={email} error={searchParams.error} message={searchParams.message} />

            {/* Footer link */}
            <p className="text-center text-sm text-zinc-500">
                Digitou o e-mail errado?{" "}
                <Link href="/cadastro" className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
                    Voltar
                </Link>
            </p>
        </div>
    </div>
  )
}
