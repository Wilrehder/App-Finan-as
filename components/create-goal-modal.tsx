"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, TrendingUp, X } from "lucide-react"
import { confirmGoal } from "@/app/chat/actions"
import { useRouter } from "next/navigation"

interface CreateGoalModalProps {
  onClose: () => void;
}

const EMOJIS = ['✈️', '🚗', '🏠', '📱', '💻', '💰', '🎓', '🏥']

export function CreateGoalModal({ onClose }: CreateGoalModalProps) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [icon, setIcon] = useState("🎯")
  const [targetAmount, setTargetAmount] = useState("")
  const [deadline, setDeadline] = useState("")
  const [frequency, setFrequency] = useState<'daily'|'weekly'|'monthly'>("monthly")
  
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<{ periods: number, amountPerPeriod: number } | null>(null)

  useEffect(() => {
    if (!targetAmount || !deadline || !frequency) {
      setPreview(null)
      return
    }

    const today = new Date()
    const deadlineDate = new Date(deadline)
    const diffTime = Math.max(deadlineDate.getTime() - today.getTime(), 0)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1
    
    let periods = 1;
    if (frequency === 'daily') {
      periods = diffDays;
    } else if (frequency === 'weekly') {
      periods = Math.ceil(diffDays / 7) || 1;
    } else if (frequency === 'monthly') {
      const diffMonths = (deadlineDate.getFullYear() - today.getFullYear()) * 12 + (deadlineDate.getMonth() - today.getMonth());
      periods = diffMonths > 0 ? diffMonths : 1;
    }

    const amount = Number(targetAmount)
    setPreview({
      periods,
      amountPerPeriod: amount / periods
    })

  }, [targetAmount, deadline, frequency])

  const handleSave = async () => {
    if (!name || !targetAmount || !deadline) {
      alert("Por favor, preencha todos os campos obrigatórios.")
      return
    }

    setLoading(true)
    const payload = {
      intent: 'create_goal' as const,
      goal_name: name,
      goal_target_amount: Number(targetAmount),
      goal_deadline: deadline,
      goal_frequency: frequency,
      goal_icon: icon
    }

    const res = await confirmGoal(payload)
    setLoading(false)
    
    if (res.success) {
      router.refresh()
      onClose()
    } else {
      alert(res.message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-background rounded-3xl p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto no-scrollbar"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold tracking-tight text-primary">Novo Objetivo</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-muted-foreground">Ícone e Nome</label>
            <div className="flex gap-2">
              <div className="relative group">
                <select 
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className="appearance-none h-12 w-14 rounded-xl bg-secondary text-center text-2xl cursor-pointer"
                >
                  <option value="🎯">🎯</option>
                  {EMOJIS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <Input
                placeholder="Ex: Viagem Japão"
                value={name}
                onChange={e => setName(e.target.value)}
                className="h-12 rounded-xl flex-1 bg-secondary border-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-muted-foreground">Valor Total Desejado (R$)</label>
            <Input
              type="number"
              placeholder="Ex: 12000"
              value={targetAmount}
              onChange={e => setTargetAmount(e.target.value)}
              className="h-12 rounded-xl bg-secondary border-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-muted-foreground">Frequência</label>
              <select 
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
                className="w-full h-12 rounded-xl bg-secondary border-none px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="monthly">Mensal</option>
                <option value="weekly">Semanal</option>
                <option value="daily">Diária</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-muted-foreground">Prazo Final</label>
              <Input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="h-12 rounded-xl bg-secondary border-none"
              />
            </div>
          </div>
        </div>

        {/* Prévia Automática */}
        {preview && (
          <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
            <CardContent className="p-4 space-y-3">
              <h4 className="text-xs uppercase tracking-wider font-bold text-indigo-400">Projeção do Plano</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1 bg-background/50 p-2.5 rounded-xl">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase font-semibold"><TrendingUp size={10}/> Parcelas</span>
                  <span className="text-sm font-bold text-foreground">{preview.periods}x</span>
                </div>
                <div className="flex flex-col gap-1 bg-background/50 p-2.5 rounded-xl">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase font-semibold"><Calendar size={10}/> Valor Frequente</span>
                  <span className="text-sm font-bold text-green-500">R$ {preview.amountPerPeriod.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Button 
          className="w-full h-14 rounded-full text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-all active:scale-[0.98]" 
          onClick={handleSave}
          disabled={loading || !name || !targetAmount || !deadline}
        >
          {loading ? "Salvando..." : "Criar Objetivo"}
        </Button>
      </div>
    </div>
  )
}
