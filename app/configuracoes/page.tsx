import { createClient } from "@/utils/supabase/server"
import { logout } from "../login/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { User, LogOut, Settings, Shield, CalendarClock, ArrowUpIcon, ArrowDownIcon, Bell } from "lucide-react"
import { DeleteRecurringButton } from "@/components/delete-recurring-button"
import { EditRecurringModal } from "@/components/edit-recurring-modal"
import { PushToggle } from "@/components/push-toggle"
import { NotificationPreferences } from "@/components/notification-preferences"
import { getNotificationPreferences } from "@/app/notificacoes/actions"
import { ThemeToggle } from "@/components/theme-toggle"
import { RestartTourButton } from "@/components/restart-tour-button"
import { SubscriptionManager } from "@/components/subscription-manager"
import { CreditCard } from "lucide-react"

export const revalidate = 30

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: recurring }, notifPrefs] = await Promise.all([
    supabase
      .from('recurring_transactions')
      .select('*')
      .eq('user_id', user?.id)
      .order('day_of_month', { ascending: true }),
    getNotificationPreferences(),
  ])

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
            <ThemeToggle />
            <PushToggle />
            <RestartTourButton />
          </CardContent>
        </Card>

        {/* Card de Minha Assinatura */}
        <Card className="border-none glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard size={18} /> Minha Assinatura
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SubscriptionManager 
              status={user?.user_metadata?.subscription_status || "inactive"} 
              planType={user?.user_metadata?.plan_type || "monthly"} 
              trialExpiresAt={user?.user_metadata?.trial_expires_at || null} 
              subscriptionExpiresAt={user?.user_metadata?.subscription_expires_at || null}
              mpSubscriptionId={user?.user_metadata?.mp_subscription_id || null}
            />
          </CardContent>
        </Card>

        {/* Card de preferências de notificação */}
        <Card className="border-none glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell size={18} /> Notificações
            </CardTitle>
            <CardDescription>Escolha quais notificações deseja receber.</CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationPreferences initial={notifPrefs} />
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
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Todo {rec.is_business_day ? `${rec.day_of_month}º dia útil` : `dia ${rec.day_of_month}`} • R$ {Number(rec.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <EditRecurringModal item={rec} />
                    <DeleteRecurringButton id={rec.id} />
                  </div>
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
