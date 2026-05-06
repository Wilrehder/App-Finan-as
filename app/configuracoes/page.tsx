import { createClient } from "@/utils/supabase/server"
import { logout } from "../login/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { User, LogOut, Settings, Bell, Shield, CalendarClock, ArrowUpIcon, ArrowDownIcon } from "lucide-react"
import { DeleteRecurringButton } from "@/components/delete-recurring-button"

export const dynamic = 'force-dynamic'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: recurring } = await supabase
    .from('recurring_transactions')
    .select('*')
    .eq('user_id', user?.id)
    .order('day_of_month', { ascending: true })

  return (
    <div className="flex flex-col min-h-screen p-4 pb-24 space-y-6 pt-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
        <p className="text-sm text-muted-foreground">Gerencie sua conta e preferências</p>
      </div>

      <div className="flex items-center space-x-4 glass p-4 rounded-3xl">
        <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
          <User size={32} />
        </div>
        <div>
          <h2 className="font-semibold text-lg">{user?.user_metadata?.name || 'Usuário'}</h2>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <div className="space-y-4">
        <Card className="border-none glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings size={18} /> Preferências
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Tema Escuro</span>
              <div className="w-10 h-6 bg-primary rounded-full relative">
                <div className="absolute right-1 top-1 w-4 h-4 bg-primary-foreground rounded-full" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2"><Bell size={16} /> Notificações</span>
              <div className="w-10 h-6 bg-secondary rounded-full relative border border-input">
                <div className="absolute left-1 top-1 w-4 h-4 bg-muted-foreground rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock size={18} /> Contas e Rendas Fixas
            </CardTitle>
            <CardDescription>Gerencie suas despesas e receitas mensais recorrentes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 mt-2">
            {(!recurring || recurring.length === 0) ? (
              <p className="text-sm text-muted-foreground italic">Nenhuma conta fixa cadastrada.</p>
            ) : (
              recurring.map(rec => (
                <div key={rec.id} className="flex items-center justify-between p-3 glass rounded-xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${rec.type === 'income' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                      {rec.type === 'income' ? <ArrowUpIcon size={16} /> : <ArrowDownIcon size={16} />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{rec.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Todo dia {rec.day_of_month} • R$ {Number(rec.amount).toFixed(2)}</p>
                    </div>
                  </div>
                  <DeleteRecurringButton id={rec.id} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-none glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield size={18} /> Conta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={logout}>
              <Button variant="destructive" className="w-full rounded-xl flex items-center gap-2">
                <LogOut size={18} /> Sair da conta
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
