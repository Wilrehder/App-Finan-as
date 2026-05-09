"use server"

import { createClient } from "@/utils/supabase/server"

export async function getGoals() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error("Unauthorized")

  const { data: goals, error } = await supabase
    .from('goals')
    .select('*, goal_deposits(amount)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error || !goals) {
    console.error(error)
    return []
  }

  return goals.map(goal => {
    const totalSaved = goal.goal_deposits.reduce((acc: number, dep: any) => acc + Number(dep.amount), 0)
    const targetAmount = Number(goal.target_amount)
    
    // Calculate periods
    const today = new Date();
    const deadline = new Date(goal.deadline);
    const diffTime = Math.max(deadline.getTime() - today.getTime(), 0);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    
    let periods = 1;
    if (goal.frequency === 'daily') {
      periods = diffDays;
    } else if (goal.frequency === 'weekly') {
      periods = Math.ceil(diffDays / 7) || 1;
    } else if (goal.frequency === 'monthly') {
      const diffMonths = (deadline.getFullYear() - today.getFullYear()) * 12 + (deadline.getMonth() - today.getMonth());
      periods = diffMonths > 0 ? diffMonths : 1;
    }

    const remainingAmount = targetAmount - totalSaved;
    // originalAmountPerPeriod is fixed and should be used to display installments and calculate paid ones
    const originalAmountPerPeriod = targetAmount / periods;
    // amountPerPeriod is dynamic, useful for "próximo aporte sugerido se você quiser terminar a tempo"
    const amountPerPeriod = remainingAmount > 0 ? remainingAmount / periods : 0;
    const percentage = Math.min((totalSaved / targetAmount) * 100, 100);

    return {
      id: goal.id,
      name: goal.name,
      targetAmount,
      totalSaved,
      deadline: goal.deadline,
      frequency: goal.frequency,
      icon: goal.icon,
      percentage,
      remainingAmount,
      periods,
      amountPerPeriod,
      originalAmountPerPeriod
    }
  })
}

export async function deleteGoal(goalId: string) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', goalId)
    .eq('user_id', user.id)

  if (error) {
    return { success: false, message: "Erro ao excluir o objetivo." }
  }

  return { success: true }
}
