import { createClient } from '@supabase/supabase-js';

// VaaS Database connection (separate from main Idswyft database)
const supabaseUrl = process.env.VAAS_SUPABASE_URL;
const supabaseKey = process.env.VAAS_SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing required environment variables: VAAS_SUPABASE_URL and VAAS_SUPABASE_SERVICE_ROLE_KEY must be set'
  );
}

// Initialize VaaS Supabase client
export const vaasSupabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Database connection helper
export const connectVaasDB = async () => {
  try {
    console.log('🔗 Testing VaaS Supabase connection...');
    console.log('URL:', supabaseUrl);
    console.log('Key exists:', !!supabaseKey);
    
    // Test connection with a simple query
    const { data, error } = await vaasSupabase
      .from('vaas_organizations')
      .select('count(*)')
      .limit(1);
      
    if (error && error.code !== 'PGRST116') { // Ignore "relation does not exist" error for new DBs
      throw error;
    }
    
    console.log('✅ Connected to VaaS Supabase successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to VaaS Supabase:', error);
    return false;
  }
};

export default vaasSupabase;