import { getGoals } from "./actions"
import Link from "next/link"
import { ArrowLeft, Plus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { GoalCelebration } from "@/components/goal-celebration"

export default async function ObjetivosPage() {
  const goals = await getGoals()

  return (
    <div className="flex flex-col min-h-screen p-4 pb-24 space-y-6 pt-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Meus Objetivos</h1>
            <p className="text-sm text-muted-foreground">Acompanhe suas metas</p>
          </div>
        </div>
        <Link href="/chat" className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg">
          <Plus size={20} />
        </Link>
      </div>

      {goals.length === 0 ? (
        <Card className="bg-secondary/50 border-none glass mt-10">
          <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="text-5xl">🎯</div>
            <h3 className="text-lg font-semibold">Nenhum objetivo criado</h3>
            <p className="text-sm text-muted-foreground">Que tal começar a planejar aquela viagem ou criar sua reserva de emergência?</p>
            <Link href="/chat" className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors">
              Criar Objetivo
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {goals.map(goal => {
            const isCompleted = goal.percentage >= 100;
            const periodLabel = goal.frequency === 'daily' ? 'dia' : goal.frequency === 'weekly' ? 'semana' : 'mês';

            return (
              <Card key={goal.id} className={`border-none shadow-md overflow-hidden relative ${isCompleted ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20' : 'bg-background glass'}`}>
                {isCompleted && <GoalCelebration />}
                <CardContent className="p-5 space-y-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-2xl shadow-inner">
                        {goal.icon || '🎯'}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{goal.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          R$ {goal.totalSaved.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / 
                          R$ {goal.targetAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xl font-bold ${isCompleted ? 'text-green-500' : 'text-primary'}`}>
                        {goal.percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <Progress value={goal.percentage} className={`h-2.5 bg-secondary ${isCompleted ? '[&>div]:bg-green-500' : ''}`} />

                  {!isCompleted && (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Restam</span>
                        <span className="text-sm font-medium">{goal.periods} parcelas</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Próximo aporte</span>
                        <span className="text-sm font-medium text-green-500">R$ {goal.amountPerPeriod.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / {periodLabel}</span>
                      </div>
                    </div>
                  )}
                  {isCompleted && (
                    <div className="pt-2 text-center">
                      <span className="text-sm font-medium text-green-500 flex items-center justify-center gap-1">
                        🎉 Objetivo Concluído!
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
