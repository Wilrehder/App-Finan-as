"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, Circle, X, Plus, Trash2 } from "lucide-react"
import { createPortal } from "react-dom"
import { confirmGoalDeposit } from "@/app/chat/actions"
import { deleteGoal } from "@/app/objetivos/actions"
import { useRouter } from "next/navigation"

interface GoalDetailsModalProps {
  goal: any;
  onClose: () => void;
}

export function GoalDetailsModal({ goal, onClose }: GoalDetailsModalProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleDeposit = async (amount: number) => {
    setLoading(true)
    const payload = {
      intent: 'goal_deposit' as const,
      goal_name: goal.name,
      amount: amount
    }

    const res = await confirmGoalDeposit(payload)
    setLoading(false)

    if (res.success) {
      router.refresh()
    } else {
      alert(res.message)
    }
  }

  const handleExtraDeposit = () => {
    const amountStr = prompt(`Qual o valor do aporte extra para ${goal.name}?`)
    if (!amountStr) return;
    
    const amount = Number(amountStr.replace(',', '.'))
    if (isNaN(amount) || amount <= 0) {
      alert("Valor inválido.")
      return;
    }

    handleDeposit(amount)
  }

  const handleDelete = async () => {
    if (confirm("Tem certeza que deseja excluir este objetivo? Esta ação não apagará suas transações de saldo, mas removerá a meta permanentemente.")) {
      setLoading(true)
      const res = await deleteGoal(goal.id)
      setLoading(false)
      
      if (res.success) {
        router.refresh()
        onClose()
      } else {
        alert(res.message)
      }
    }
  }

  if (!mounted) return null;

  const getInstallmentInfo = (g: any) => {
    if (g.frequency === 'monthly') {
      return g.payment_day ? `Todo dia ${g.payment_day}` : 'Mensal';
    }
    if (g.frequency === 'weekly') {
      const weekdays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
      return g.payment_day !== null && g.payment_day !== undefined ? `Toda ${weekdays[g.payment_day]}` : 'Semanal';
    }
    return 'Diário';
  }

  const isCompleted = goal.percentage >= 100;
  const totalPeriods = goal.totalPeriods || goal.periods;
  const amountPerInstallment = goal.originalAmountPerPeriod || (goal.targetAmount / totalPeriods);
  const paidPeriods = amountPerInstallment > 0 ? Math.min(Math.floor(goal.totalSaved / amountPerInstallment), totalPeriods) : totalPeriods;
  const remainingPeriods = totalPeriods - paidPeriods;
  const remainingAmount = Math.max(goal.targetAmount - goal.totalSaved, 0);
  const dynamicAmountPerPeriod = remainingPeriods > 0 ? remainingAmount / remainingPeriods : 0;
  
  // Create an array representing the installments
  const installments = Array.from({ length: totalPeriods }, (_, i) => {
    const isPaid = i < paidPeriods || isCompleted;
    return {
      index: i + 1,
      isPaid,
      amount: isPaid ? amountPerInstallment : dynamicAmountPerPeriod
    }
  });

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-background animate-in slide-in-from-bottom-full duration-300">
      <div className="flex justify-between items-center p-6 border-b border-border/10 shrink-0">
        <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <span className="text-2xl">{goal.icon || '🎯'}</span>
          <span>{goal.name}</span>
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={handleDelete} disabled={loading} className="w-10 h-10 flex items-center justify-center rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors">
            <Trash2 size={18} />
          </button>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-32">
        
        {/* Progress Header */}
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Guardado</span>
              <p className="text-3xl font-bold text-primary">
                R$ {goal.totalSaved.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">
                  de R$ {goal.targetAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] bg-secondary px-2.5 py-1 rounded-full text-muted-foreground font-bold uppercase tracking-wider">
                  {getInstallmentInfo(goal)}
                </span>
              </div>
            </div>
            <span className={`text-2xl font-bold ${isCompleted ? 'text-green-500' : 'text-primary'}`}>
              {goal.percentage.toFixed(0)}%
            </span>
          </div>
          <Progress value={goal.percentage} className={`h-3 bg-secondary ${isCompleted ? '[&>div]:bg-green-500' : ''}`} />
        </div>

        {/* Action Button */}
        {!isCompleted && (
          <Button onClick={handleExtraDeposit} variant="secondary" className="w-full rounded-2xl h-14 text-primary font-semibold flex items-center gap-2 hover:bg-secondary/80">
            <Plus size={20} />
            Adicionar Aporte Extra
          </Button>
        )}

        {/* Installments List */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Parcelas do Plano</h4>
          <div className="space-y-2">
            {installments.map((inst, idx) => (
              <div 
                key={idx}
                className={`flex items-center justify-between p-4 rounded-2xl border ${inst.isPaid ? 'bg-green-500/10 border-green-500/20' : 'bg-secondary/50 border-transparent'} transition-colors`}
              >
                <div className="flex items-center gap-3">
                  {inst.isPaid ? (
                    <CheckCircle2 className="text-green-500" size={24} />
                  ) : (
                    <button 
                      onClick={() => handleDeposit(inst.amount)} 
                      disabled={loading}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Circle size={24} />
                    </button>
                  )}
                  <div className="flex flex-col">
                    <span className={`font-semibold ${inst.isPaid ? 'text-green-500' : 'text-foreground'}`}>
                      Parcela {inst.index}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {inst.isPaid ? 'Pago' : 'Pendente'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className={`font-bold ${inst.isPaid ? 'text-green-500' : 'text-foreground'}`}>
                    R$ {inst.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  {!inst.isPaid && (
                    <Button 
                      size="sm" 
                      onClick={() => handleDeposit(inst.amount)}
                      disabled={loading}
                      className="rounded-full bg-primary hover:bg-primary/90"
                    >
                      Pagar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Histórico de Aportes */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Histórico de Aportes</h4>
          {goal.deposits && goal.deposits.length > 0 ? (
            <div className="space-y-2">
              {goal.deposits.map((dep: any, idx: number) => {
                const dateStr = dep.deposit_date ? dep.deposit_date.split('-').reverse().join('/') : 'Data N/A';
                return (
                  <div key={dep.id || idx} className="flex justify-between items-center bg-secondary/15 hover:bg-secondary/25 p-4 rounded-2xl border border-white/5 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm text-foreground">
                        Aporte Realizado
                      </span>
                      <span className="text-xs text-muted-foreground mt-0.5">
                        Feito em {dateStr}
                      </span>
                    </div>
                    <span className="font-bold text-sm text-green-500">
                      + R$ {Number(dep.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4 bg-secondary/5 rounded-2xl border border-white/5">
              Nenhum aporte registrado ainda.
            </p>
          )}
        </div>

      </div>
    </div>,
    document.body
  )
}
