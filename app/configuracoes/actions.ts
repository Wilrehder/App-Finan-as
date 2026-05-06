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

export async function updateRecurringTransaction(
  id: string, 
  data: { description: string, amount: number, day_of_month: number, is_business_day: boolean }
) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('recurring_transactions')
    .update(data)
    .eq('id', id)

  if (error) {
    return { success: false, message: "Erro ao atualizar conta fixa." }
  }

  revalidatePath("/configuracoes")
  return { success: true, message: "Conta fixa atualizada com sucesso." }
}
