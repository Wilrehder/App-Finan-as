import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
async function test() {
  const { data, error } = await supabase.from('goal_deposits').select('id, amount, deposit_date, goals!inner(user_id)').limit(1)
  console.log(error)
}
test()
