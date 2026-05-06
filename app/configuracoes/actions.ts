"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function deleteRecurringTransaction(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('recurring_transactions')
    .delete()
    .eq('id', id)

  if (error) {
    return { success: false, message: "Erro ao excluir conta fixa." }
  }

  revalidatePath("/configuracoes")
  return { success: true, message: "Conta fixa excluída com sucesso." }
}
