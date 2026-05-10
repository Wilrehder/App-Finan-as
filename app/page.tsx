import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { MessageSquare, TrendingUp, ShieldCheck } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="flex items-center justify-between p-6">
        <div className="font-bold text-xl tracking-tight flex items-center gap-2">
          <Image src="/logo.png" alt="Finchat" width={32} height={32} className="object-contain" />
          Finchat
        </div>
        <Link href="/login">
          <Button variant="ghost" className="rounded-full">Entrar</Button>
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-10">
        <div className="space-y-4 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Finanças Simplificadas
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Controle seu dinheiro via <span className="text-primary">Chat</span>.
          </h1>
          <p className="text-muted-foreground text-lg px-4">
            Diga adeus às planilhas complexas. Apenas mande uma mensagem e nós organizamos tudo para você.
          </p>
        </div>

        <div className="w-full max-w-sm glass p-6 rounded-3xl space-y-4 text-left border border-white/5">
          <div className="flex items-end justify-end">
            <div className="bg-primary text-primary-foreground p-3 rounded-2xl rounded-br-none text-sm font-medium">
              gasto 120 mercado
            </div>
          </div>
          <div className="flex items-end justify-start">
            <div className="bg-secondary text-secondary-foreground p-3 rounded-2xl rounded-bl-none text-sm font-medium flex items-center gap-2">
              <span className="text-lg">✅</span> Despesa de R$ 120,00 registrada na categoria Mercado.
            </div>
          </div>
        </div>

        <Link href="/cadastro" className="w-full max-w-xs">
          <Button size="lg" className="w-full rounded-full shadow-lg shadow-primary/20 text-lg font-semibold">
            Assinar Finchat
          </Button>
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 max-w-lg text-left">
          <div className="space-y-2">
            <MessageSquare className="text-primary h-6 w-6" />
            <h3 className="font-semibold">Interface de Chat</h3>
            <p className="text-sm text-muted-foreground">Registre tudo como se estivesse conversando com um amigo.</p>
          </div>
          <div className="space-y-2">
            <TrendingUp className="text-primary h-6 w-6" />
            <h3 className="font-semibold">Dashboard Inteligente</h3>
            <p className="text-sm text-muted-foreground">Acompanhe seus gastos com gráficos intuitivos e claros.</p>
          </div>
          <div className="space-y-2">
            <ShieldCheck className="text-primary h-6 w-6" />
            <h3 className="font-semibold">Seguro & Privado</h3>
            <p className="text-sm text-muted-foreground">Seus dados são criptografados e sincronizados na nuvem.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
