"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { GoalCelebration } from "@/components/goal-celebration"
import { GoalDetailsModal } from "./goal-details-modal"

interface GoalCardProps {
  goal: any;
}

export function GoalCard({ goal }: GoalCardProps) {
  const [open, setOpen] = useState(false)

  const isCompleted = goal.percentage >= 100;
  const periodLabel = goal.frequency === 'daily' ? 'dia' : goal.frequency === 'weekly' ? 'semana' : 'mês';

  return (
    <>
      <Card 
        onClick={() => setOpen(true)}
        className={`border-none shadow-md overflow-hidden relative cursor-pointer hover:scale-[1.02] transition-transform active:scale-[0.98] ${isCompleted ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20' : 'bg-background glass'}`}
      >
        {isCompleted && <GoalCelebration />}
        <CardContent className="p-5 space-y-4 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-2xl shadow-inner shrink-0">
                {goal.icon || '🎯'}
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight">{goal.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  R$ {goal.totalSaved.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / 
                  R$ {goal.targetAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
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
      
      {open && <GoalDetailsModal goal={goal} onClose={() => setOpen(false)} />}
    </>
  )
}
