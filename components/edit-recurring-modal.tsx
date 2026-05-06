"use client"

import { useState } from "react"
import { Pencil, X } from "lucide-react"
import { updateRecurringTransaction } from "@/app/configuracoes/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type RecurringItem = {
  id: string
  description: string
  amount: number
  day_of_month: number
  is_business_day: boolean
}

export function EditRecurringModal({ item }: { item: RecurringItem }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    description: item.description,
    amount: item.amount.toString(),
    day_of_month: item.day_of_month.toString(),
    is_business_day: item.is_business_day
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    await updateRecurringTransaction(item.id, {
      description: formData.description,
      amount: parseFloat(formData.amount),
      day_of_month: parseInt(formData.day_of_month),
      is_business_day: formData.is_business_day
    })
    
    setLoading(false)
    setIsOpen(false)
  }

  return (
    <>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => setIsOpen(true)}
        className="text-muted-foreground hover:text-foreground hover:bg-secondary"
      >
        <Pencil size={16} />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-background border border-white/10 p-6 rounded-3xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Editar Conta Fixa</h3>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Descrição</label>
                <Input 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  required
                  className="bg-secondary/50 border-none rounded-xl"
                />
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Valor (R$)</label>
                <Input 
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={e => setFormData({...formData, amount: e.target.value})}
                  required
                  className="bg-secondary/50 border-none rounded-xl"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Dia do Mês</label>
                  <Input 
                    type="number"
                    min="1"
                    max="31"
                    value={formData.day_of_month}
                    onChange={e => setFormData({...formData, day_of_month: e.target.value})}
                    required
                    className="bg-secondary/50 border-none rounded-xl"
                  />
                </div>
                
                <div className="flex items-center gap-2 mt-5">
                  <input 
                    type="checkbox"
                    id={`is-business-${item.id}`}
                    checked={formData.is_business_day}
                    onChange={e => setFormData({...formData, is_business_day: e.target.checked})}
                    className="w-5 h-5 rounded border-white/20 bg-secondary"
                  />
                  <label htmlFor={`is-business-${item.id}`} className="text-sm font-medium">
                    Dia útil?
                  </label>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <Button 
                  type="button"
                  variant="ghost" 
                  onClick={() => setIsOpen(false)}
                  className="flex-1 rounded-xl bg-secondary/50 hover:bg-secondary"
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  className="flex-1 rounded-xl"
                  disabled={loading}
                >
                  {loading ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
