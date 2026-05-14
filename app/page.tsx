import Link from "next/link"
import Image from "next/image"
import { CheckCircle2, MessageSquare, BarChart2, Target, Zap, ShieldCheck } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-black text-white selection:bg-primary/30 overflow-x-hidden">

      {/* Header */}
      <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-bold text-xl tracking-tight flex items-center gap-2">
            <Image src="/logo.png" alt="Finchat" width={30} height={30} className="object-contain" />
            Finchat
          </div>
          <Link
            href="/login"
            className="text-sm font-medium text-zinc-400 hover:text-white transition-colors border border-white/10 px-4 py-2 rounded-full hover:border-white/20"
          >
            Entrar
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col">

        {/* Hero */}
        <section className="relative flex flex-col items-center justify-center text-center px-6 pt-40 pb-24 min-h-screen">
          {/* Glows */}
          <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-emerald-500/12 rounded-full blur-[140px]" />
          <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-primary/8 rounded-full blur-[120px]" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-8">
            {/* Logo */}
            <div className="flex justify-center">
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-white/5 border border-white/10 p-2">
                <Image src="/logo.png" alt="Finchat" fill className="object-contain p-1" priority />
              </div>
            </div>

            {/* Badge */}
            <div className="flex justify-center">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-400/10 border border-emerald-400/20 px-4 py-1.5 rounded-full">
                Controle Financeiro com Inteligência Artificial
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tighter leading-[1.05]">
              A primeira IA para{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-primary">
                organizar seu dinheiro.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-zinc-400 max-w-lg mx-auto leading-relaxed">
              Esqueça planilhas e apps complexos. Registre gastos e acompanhe seus objetivos apenas mandando mensagens de texto.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                href="/cadastro"
                className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-lg rounded-2xl transition-all duration-200 hover:scale-105 active:scale-[0.98] shadow-[0_0_40px_-8px_rgba(52,211,153,0.5)]"
              >
                Começar agora →
              </Link>
            </div>

            <p className="text-xs text-zinc-600">
              Sem compromisso. Configure em menos de 2 minutos.
            </p>
          </div>
        </section>

        {/* Features */}
        <section className="relative px-6 py-24 bg-zinc-950">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16 space-y-3">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Tudo que você precisa,{" "}
                <span className="text-emerald-400">num só lugar</span>
              </h2>
              <p className="text-zinc-500 max-w-md mx-auto">
                Desenvolvido para quem quer controle financeiro real sem complicação.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                {
                  icon: MessageSquare,
                  title: "Registro via Chat",
                  desc: "Diga ao Finchat o que gastou e ele registra automaticamente. Simples assim.",
                },
                {
                  icon: BarChart2,
                  title: "Dashboards automáticos",
                  desc: "Gráficos e relatórios gerados automaticamente a partir das suas mensagens.",
                },
                {
                  icon: Target,
                  title: "Objetivos financeiros",
                  desc: "Defina metas e acompanhe seu progresso mês a mês com clareza.",
                },
                {
                  icon: Zap,
                  title: "IA integrada",
                  desc: "Insights personalizados sobre seus gastos gerados por inteligência artificial.",
                },
                {
                  icon: CheckCircle2,
                  title: "Contas recorrentes",
                  desc: "Cadastre uma vez e o Finchat lembra das suas contas fixas todo mês.",
                },
                {
                  icon: ShieldCheck,
                  title: "Segurança total",
                  desc: "Seus dados são criptografados e armazenados com segurança na nuvem.",
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="group p-6 rounded-2xl bg-zinc-900/60 border border-white/8 hover:border-emerald-500/30 hover:bg-zinc-900 transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:bg-emerald-500/15 transition-colors">
                    <Icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="font-bold text-white mb-1.5">{title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="relative px-6 py-24 text-center">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="w-[500px] h-[300px] bg-emerald-500/8 rounded-full blur-[100px]" />
          </div>
          <div className="relative z-10 max-w-lg mx-auto space-y-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Comece a organizar suas finanças hoje
            </h2>
            <p className="text-zinc-500">
              Junte-se a quem já usa o Finchat para ter controle real do seu dinheiro.
            </p>
            <Link
              href="/cadastro"
              className="inline-block px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-lg rounded-2xl transition-all duration-200 hover:scale-105 active:scale-[0.98] shadow-[0_0_40px_-8px_rgba(52,211,153,0.4)]"
            >
              Criar minha conta grátis →
            </Link>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 px-6 text-center text-xs text-zinc-700">
        © {new Date().getFullYear()} Finchat. Todos os direitos reservados.
      </footer>
    </div>
  )
}
