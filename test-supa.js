const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) console.error(error);
  else {
    const activeUsers = data.users.filter(u => u.user_metadata?.subscription_status === 'active');
    console.log(`Found ${activeUsers.length} active users out of ${data.users.length}`);
    activeUsers.forEach(u => console.log(u.email, u.user_metadata));
  }
}
check();
