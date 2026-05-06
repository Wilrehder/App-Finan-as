"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { deleteRecurringTransaction } from "@/app/configuracoes/actions"
import { Button } from "@/components/ui/button"

export function DeleteRecurringButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja apagar esta conta fixa? Isso não afetará os meses passados.")) return
    
    setLoading(true)
    await deleteRecurringTransaction(id)
    setLoading(false)
  }

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={handleDelete}
      disabled={loading}
      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
    >
      <Trash2 size={16} />
    </Button>
  )
}
