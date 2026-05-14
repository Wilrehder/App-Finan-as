import Link from "next/link"
import Image from "next/image"
import { use } from "react"
import { login, signInWithGoogle } from "./actions"
import { Input } from "@/components/ui/input"
import { SubmitButton } from "@/components/submit-button"

// Google SVG inline
function GoogleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 flex-shrink-0">
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
    </svg>
  )
}

export default function LoginPage(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = use(props.searchParams)
  const error = searchParams.error

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-6 bg-black overflow-hidden">
      {/* Background glows */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/15 rounded-full blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 w-[300px] h-[300px] bg-primary/10 rounded-full blur-[100px]" />

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
            <h1 className="text-2xl font-extrabold tracking-tight text-white">Bem-vindo de volta</h1>
            <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Finchat · Controle Financeiro</p>
          </div>
        </div>

        {/* Google */}
        <form action={signInWithGoogle}>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 h-12 rounded-2xl bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 hover:border-white/20 transition-all duration-200 active:scale-[0.98]"
          >
            <GoogleIcon />
            Continuar com o Google
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center gap-3">
          <div className="flex-1 h-px bg-white/8" />
          <span className="text-[11px] uppercase tracking-widest text-zinc-600 font-medium whitespace-nowrap">ou entre com e-mail</span>
          <div className="flex-1 h-px bg-white/8" />
        </div>

        {/* Email form */}
        <form action={login} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider" htmlFor="email">
              E-mail
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="seu@email.com"
              required
              className="h-12 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-emerald-500/20 focus:bg-white/8 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider" htmlFor="password">
                Senha
              </label>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              className="h-12 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-emerald-500/20 focus:bg-white/8 transition-all"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm text-center">
              {error}
            </div>
          )}

          <SubmitButton
            defaultText="Entrar"
            pendingText="Entrando..."
          />
        </form>

        {/* Footer link */}
        <p className="text-center text-sm text-zinc-500">
          Não tem uma conta?{" "}
          <Link href="/cadastro" className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
            Cadastre-se grátis
          </Link>
        </p>
      </div>
    </div>
  )
}
