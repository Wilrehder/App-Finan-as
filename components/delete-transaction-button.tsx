"use client"

import { useState } from "react"
import { Trash2, Loader2 } from "lucide-react"
import { deleteTransaction } from "@/app/dashboard/delete-actions"

interface DeleteTransactionButtonProps {
  id: string
  description: string
  isRecurring?: boolean
}

export function DeleteTransactionButton({ id, description, isRecurring }: DeleteTransactionButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (isRecurring) {
      const confirmed = window.confirm(
        "Atenção: Esta é uma conta fixa.\n\nA exclusão apagará apenas o lançamento do mês atual. Se quiser excluir a recorrência futura, você terá que excluí-la em Configurações > Gerenciar Contas e Rendas Fixas.\n\nDeseja prosseguir com a exclusão deste mês?"
      )
      if (!confirmed) return
      setLoading(true)
      await deleteTransaction(id)
      setLoading(false)
      return
    }

    if (!confirming) {
      setConfirming(true)
      // Auto-cancela confirmação após 3s
      setTimeout(() => setConfirming(false), 3000)
      return
    }
    setLoading(true)
    await deleteTransaction(id)
    setLoading(false)
    setConfirming(false)
  }

  if (loading) {
    return (
      <button className="p-2 rounded-full" disabled>
        <Loader2 size={14} className="animate-spin text-muted-foreground" />
      </button>
    )
  }

  if (confirming) {
    return (
      <button
        onClick={handleClick}
        className="text-xs font-semibold text-red-400 px-2 py-1 rounded-full bg-red-500/10 hover:bg-red-500/20 transition-colors whitespace-nowrap"
        title="Clique novamente para confirmar"
      >
        Confirmar
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      className="p-2 rounded-full hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
      title={`Excluir: ${description}`}
    >
      <Trash2 size={14} />
    </button>
  )
}
