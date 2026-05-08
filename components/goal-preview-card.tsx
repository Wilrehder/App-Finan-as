import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, TrendingUp } from "lucide-react"

interface GoalPreviewCardProps {
  payload: any;
}

export function GoalPreviewCard({ payload }: GoalPreviewCardProps) {
  if (!payload || payload.intent !== 'create_goal') return null;

  const { goal_name, goal_target_amount, goal_deadline, goal_frequency, goal_payment_day, goal_icon } = payload;
  
  if (!goal_target_amount || !goal_deadline || !goal_frequency) return null;
  if (goal_frequency === 'monthly' && !goal_payment_day) return null;

  // Calculate periods
  const today = new Date();
  const deadline = new Date(goal_deadline);
  
  // Apenas para evitar divisão por zero se for a mesma data
  const diffTime = Math.max(deadline.getTime() - today.getTime(), 0);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  
  let periods = 1;
  let periodLabel = '';
  
  if (goal_frequency === 'daily') {
    periods = diffDays;
    periodLabel = 'por dia';
  } else if (goal_frequency === 'weekly') {
    periods = Math.ceil(diffDays / 7) || 1;
    periodLabel = 'por semana';
  } else if (goal_frequency === 'monthly') {
    const diffMonths = (deadline.getFullYear() - today.getFullYear()) * 12 + (deadline.getMonth() - today.getMonth());
    periods = diffMonths > 0 ? diffMonths : 1;
    periodLabel = `por mês (todo dia ${goal_payment_day})`;
  }

  const amountPerPeriod = Number(goal_target_amount) / periods;

  return (
    <Card className="bg-background/50 border border-primary/20 shadow-md mt-3 w-full animate-in zoom-in-95 duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="text-2xl">{goal_icon || '🎯'}</span>
          <span>{goal_name}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Valor Desejado</span>
          <span className="text-2xl font-bold text-primary">R$ {Number(goal_target_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1 bg-secondary/50 p-2.5 rounded-xl">
            <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar size={12}/> Prazo</span>
            <span className="text-sm font-semibold">{deadline.toLocaleDateString('pt-BR')}</span>
          </div>
          <div className="flex flex-col gap-1 bg-secondary/50 p-2.5 rounded-xl">
            <span className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp size={12}/> Parcelas</span>
            <span className="text-sm font-semibold">{periods}x</span>
          </div>
        </div>

        <div className="pt-2 border-t border-white/5 flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Valor sugerido:</span>
          <span className="text-base font-bold text-green-400">R$ {amountPerPeriod.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-muted-foreground">{periodLabel}</span></span>
        </div>
      </CardContent>
    </Card>
  )
}
