"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { PieChart, List, X, ArrowRightLeft, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { updateTransactionCategory } from "@/app/dashboard/actions"
import { useRouter } from "next/navigation"

interface Transaction {
  id: string
  description: string
  amount: number
  category: string
  type: string
  transaction_date: string
}

interface CategoryBreakdownModalProps {
  transactions: Transaction[]
  onClose: () => void
}

const PREDEFINED_CATEGORIES = [
  "Alimentação", "Transporte", "Moradia", "Saúde", 
  "Lazer", "Serviços", "Salário", "Outros", "Mercado", "Pets", "Educação"
]

export function CategoryBreakdownModal({ transactions, onClose }: CategoryBreakdownModalProps) {
  const router = useRouter()
  const expenses = transactions.filter(t => t.type === 'expense')
  const [editingTxId, setEditingTxId] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null)
  
  // Agrupar por categoria
  const byCategory = expenses.reduce((acc, tx) => {
    if (!acc[tx.category]) acc[tx.category] = { total: 0, items: [] }
    acc[tx.category].total += Number(tx.amount)
    acc[tx.category].items.push(tx)
    return acc
  }, {} as Record<string, { total: number, items: Transaction[] }>)

  // Adicionar categorias pré-definidas vazias para permitir arrastar para elas
  PREDEFINED_CATEGORIES.forEach(cat => {
    if (!byCategory[cat]) byCategory[cat] = { total: 0, items: [] }
  })

  // Ordenar categorias do maior gasto pro menor
  const sortedCategories = Object.entries(byCategory).sort((a, b) => {
    // Manter categorias com gastos primeiro, depois em ordem alfabética as vazias
    if (b[1].total !== a[1].total) return b[1].total - a[1].total
    return a[0].localeCompare(b[0])
  })

  async function handleCategoryChange(txId: string, newCategory: string) {
    setUpdating(true)
    const success = await updateTransactionCategory(txId, newCategory)
    if (success) {
      router.refresh()
      setEditingTxId(null)
    }
    setUpdating(false)
  }

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Evita scroll no body enquanto o modal estiver aberto
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [])

  if (!mounted) return null

  const modalContent = (
    <div className="fixed inset-0 z-[9999] bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-secondary border border-white/10 w-full sm:max-w-md h-[85vh] sm:h-[80vh] rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 duration-300">
        
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <PieChart className="text-indigo-500 w-5 h-5" />
            <h2 className="font-semibold text-lg text-foreground">Visão por Categoria</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary hover:bg-secondary/80 transition">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
          <p className="text-xs text-center text-muted-foreground mb-4">Arraste os gastos para alterar sua categoria rapidamente.</p>
          {sortedCategories.map(([category, data]) => (
            <div 
              key={category} 
              className={`bg-card rounded-2xl p-4 border transition-all duration-200 shadow-sm ${dragOverCategory === category ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]' : 'border-border'}`}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOverCategory(category)
              }}
              onDragLeave={() => setDragOverCategory(null)}
              onDrop={async (e) => {
                e.preventDefault()
                setDragOverCategory(null)
                const txId = e.dataTransfer.getData('text/plain')
                if (txId && !updating) {
                  const tx = expenses.find(t => t.id === txId)
                  if (tx && tx.category !== category) {
                    await handleCategoryChange(txId, category)
                  }
                }
              }}
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  {category}
                </h3>
                <span className="font-bold text-red-400">R$ {data.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              
              <div className="space-y-2">
                {data.items.length === 0 ? (
                  <div className="text-xs text-muted-foreground/50 italic py-2 text-center border border-dashed border-border rounded-xl">
                    Arraste gastos para cá
                  </div>
                ) : (
                  data.items.map(tx => (
                    <div 
                      key={tx.id} 
                      className={`flex flex-col gap-2 p-3 bg-secondary/30 rounded-xl cursor-grab active:cursor-grabbing border border-transparent hover:border-border transition ${updating ? 'opacity-50 pointer-events-none' : ''}`}
                      draggable={!updating}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', tx.id)
                        e.dataTransfer.effectAllowed = 'move'
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-2">
                          <GripVertical size={14} className="text-muted-foreground/50 mt-1 cursor-grab" />
                          <div>
                            <p className="text-sm font-medium leading-none">{tx.description}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {tx.transaction_date.split('-').reverse().join('/')}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold">
                          R$ {Number(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      
                      {/* Área de Ação (Mudar Categoria) - Fallback para clique */}
                      {editingTxId === tx.id ? (
                        <div className="mt-2 pt-2 border-t border-border flex flex-wrap gap-2 pl-5">
                          <p className="text-xs w-full text-muted-foreground mb-1">Mover para:</p>
                          {PREDEFINED_CATEGORIES.filter(c => c !== tx.category).map(cat => (
                            <button
                              key={cat}
                              disabled={updating}
                              onClick={() => handleCategoryChange(tx.id, cat)}
                              className="text-xs px-2 py-1 bg-secondary hover:bg-indigo-500/10 hover:text-indigo-500 text-foreground rounded-md transition disabled:opacity-50"
                            >
                              {cat}
                            </button>
                          ))}
                          <button 
                            onClick={() => setEditingTxId(null)}
                            className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded-md ml-auto"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setEditingTxId(tx.id)}
                          className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-indigo-400 mt-1 w-max transition pl-5"
                        >
                          <ArrowRightLeft size={10} />
                          Mudar categoria
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
