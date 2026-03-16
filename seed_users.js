import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // I'll need the user to provide this or I'll try with admin auth if I can't

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createSeedUsers() {
  const users = [
    {
      email: 'alvarosantosmartin6@gmail.com',
      password: 'Viajes000',
      data: { full_name: 'Alvaro' }
    },
    {
      email: 'Andreas498@gmail.com',
      password: 'Viajes000',
      data: { full_name: 'Andrea' }
    }
  ];

  for (const userData of users) {
    console.log(`Creating user: ${userData.email}...`);
    const { data, error } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      user_metadata: userData.data,
      email_confirm: true
    });

    if (error) {
      console.error(`Error creating user ${userData.email}:`, error.message);
    } else {
      console.log(`User created successfully: ${data.user.id}`);
    }
  }
}

createSeedUsers();
