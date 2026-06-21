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
    
    // Calculate total periods fixed from the goal's creation date to the deadline
    const startDate = goal.created_at ? new Date(goal.created_at) : new Date();
    const deadline = new Date(goal.deadline);
    const totalDiffTime = Math.max(deadline.getTime() - startDate.getTime(), 0);
    const totalDiffDays = Math.ceil(totalDiffTime / (1000 * 60 * 60 * 24)) || 1;
    
    let totalPeriods = 1;
    if (goal.frequency === 'daily') {
      totalPeriods = totalDiffDays;
    } else if (goal.frequency === 'weekly') {
      totalPeriods = Math.ceil(totalDiffDays / 7) || 1;
    } else if (goal.frequency === 'monthly') {
      const diffMonths = (deadline.getFullYear() - startDate.getFullYear()) * 12 + (deadline.getMonth() - startDate.getMonth());
      totalPeriods = diffMonths > 0 ? diffMonths : 1;
    }

    const remainingAmount = Math.max(targetAmount - totalSaved, 0);
    const originalAmountPerPeriod = totalPeriods > 0 ? targetAmount / totalPeriods : targetAmount;
    
    // Calculate paid periods based on totalSaved and originalAmountPerPeriod
    const paidPeriods = originalAmountPerPeriod > 0 ? Math.min(Math.floor(totalSaved / originalAmountPerPeriod), totalPeriods) : totalPeriods;
    
    // Remaining periods
    const periods = totalPeriods - paidPeriods;
    
    // Recalculated amount per period for the remaining unpaid periods
    const amountPerPeriod = periods > 0 ? remainingAmount / periods : 0;
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
      originalAmountPerPeriod,
      totalPeriods
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
