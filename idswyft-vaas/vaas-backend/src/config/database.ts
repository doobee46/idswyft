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

// Main API Database connection (for registering organization API keys)
const mainApiUrl = process.env.MAIN_API_SUPABASE_URL;
const mainApiKey = process.env.MAIN_API_SUPABASE_SERVICE_ROLE_KEY;

// Main API Supabase client (optional - only if integration is needed)
export const mainApiSupabase = mainApiUrl && mainApiKey 
  ? createClient(mainApiUrl, mainApiKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

console.log('🔗 Main API Database Connection Status:');
console.log('URL configured:', !!mainApiUrl);
console.log('Key configured:', !!mainApiKey);
console.log('Client created:', !!mainApiSupabase);
if (mainApiUrl) console.log('Main API URL:', mainApiUrl);
if (mainApiKey) console.log('Main API Key (first 10 chars):', mainApiKey.substring(0, 10));

// Database connection helper
export const connectVaasDB = async () => {
  try {
    console.log('🔗 Testing VaaS Supabase connection...');
    console.log('URL:', supabaseUrl);
    console.log('Key exists:', !!supabaseKey);
    
    // Test connection with a simple query
    const { data, error } = await vaasSupabase
      .from('vaas_organizations')
      .select('id')
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