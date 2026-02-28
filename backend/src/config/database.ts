import { createClient } from '@supabase/supabase-js';

// Supabase connection - requires environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set'
  );
}

// Initialize Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Database connection helper
export const connectDB = async () => {
  try {
    // Simple health check — do NOT log the URL (leaks infrastructure details)
    const { data, error } = await supabase.auth.getUser();
    console.log('✅ Connected to Supabase');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
};

export default supabase;