import Link from "next/link"
import Image from "next/image"
import { use } from "react"
import { login, signInWithGoogle } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SubmitButton } from "@/components/submit-button"

export default function LoginPage(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = use(props.searchParams)
  const error = searchParams.error
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm space-y-8 glass p-8 rounded-3xl">
        <div className="space-y-2 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative w-20 h-20">
              <Image 
                src="/logo.png" 
                alt="Prisma Logo" 
                fill
                className="object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                priority
              />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Prisma</h1>
          <p className="text-muted-foreground text-sm uppercase tracking-widest mt-1">
            Controle Financeiro Inteligente
          </p>
        </div>

        <div className="space-y-4">
          <form action={signInWithGoogle}>
            <Button variant="outline" className="w-full h-12 rounded-xl border-white/10 hover:bg-white/5 flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
              </svg>
              Continuar com o Google
            </Button>
          </form>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-muted" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground glass rounded-lg">Ou entre com e-mail</span>
            </div>
          </div>

          <form action={login} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email">
              E-mail
            </label>
            <Input id="email" name="email" type="email" placeholder="seu@email.com" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="password">
              Senha
            </label>
            <Input id="password" name="password" type="password" required />
          </div>

          {error && (
            <div className="bg-destructive/15 text-destructive p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Simple way to display error handling client-side since searchParams is async */}
          <SubmitButton defaultText="Entrar" pendingText="Entrando..." />
          </form>
        </div>

        <div className="text-center text-sm">
          Não tem uma conta?{" "}
          <Link href="/cadastro" className="font-semibold text-primary hover:underline">
            Cadastre-se
          </Link>
        </div>
      </div>
    </div>
  )
}
