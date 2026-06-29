"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"

export async function deleteTransaction(id: string) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { success: false, message: "Não autorizado" }

  // Busca a transação para saber se é recorrente
  const { data: tx } = await supabase
    .from("transactions")
    .select("recurring_id, description")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  let error;
  if (tx && tx.recurring_id) {
    // Se for recorrente, apenas marcamos como deletada no título para evitar que o sync a recrie
    const res = await supabase
      .from("transactions")
      .update({ description: `[DELETED] ${tx.description}` })
      .eq("id", id)
      .eq("user_id", user.id)
    error = res.error
  } else {
    // Se não for recorrente, deleta fisicamente
    const res = await supabase
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
    error = res.error
  }

  if (error) return { success: false, message: "Erro ao excluir transação" }

  revalidatePath("/dashboard")
  return { success: true }
}
