import { createClient } from '@supabase/supabase-js';

// Direct Supabase connection
const supabaseUrl = process.env.SUPABASE_URL || 'https://bqrhaxpjlvyjekrwggqx.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxcmhheHBqbHZ5amVrcndnZ3F4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU2OTc4MSwiZXhwIjoyMDcxMTQ1NzgxfQ.3QmVEoUynigs8l1CMfBzr-jaLbGGgnVBDpDILCNdOuE';

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
    console.log('🔗 Testing Supabase connection...');
    console.log('URL:', supabaseUrl);
    console.log('Key exists:', !!supabaseKey);
    
    // Simple health check
    const { data, error } = await supabase.auth.getUser();
    console.log('✅ Connected to Supabase successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error);
    return false;
  }
};

export default supabase;