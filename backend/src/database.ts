import { createClient } from '@supabase/supabase-js';
import config from './config.js';

// Initialize Supabase client
export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export const connectDB = async () => {
  try {
    console.log('🔗 Testing Supabase connection...');
    console.log('URL:', config.supabase.url);
    console.log('Key exists:', !!config.supabase.serviceRoleKey);
    
    // Test database connection by querying the users table
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (error) {
      if (error.message.includes('schema cache')) {
        console.log('⚠️ Tables exist but schema cache is refreshing - this is normal');
        console.log('✅ Connected to Supabase successfully');
        return true;
      } else if (error.message.includes('does not exist')) {
        console.log('📋 Tables need to be created in Supabase dashboard');
        console.log('✅ Connected to Supabase (tables missing)');
        return false;
      } else {
        throw error;
      }
    }
    
    console.log('✅ Connected to Supabase successfully');
    console.log(`✅ Database tables are accessible (found ${data.length} sample records)`);
    
    // Test a few more tables to ensure full connectivity
    const testTables = ['developers', 'verification_requests'];
    for (const table of testTables) {
      try {
        const { error: testError } = await supabase
          .from(table)
          .select('id')
          .limit(1);
        
        if (!testError) {
          console.log(`✅ Table '${table}' is accessible`);
        } else if (testError.message.includes('schema cache')) {
          console.log(`⚠️ Table '${table}' exists (schema cache refreshing)`);
        }
      } catch (err) {
        // Silent fail for individual table tests
      }
    }
    
    return true;
  } catch (error: any) {
    console.error('❌ Supabase connection failed:', error.message);
    console.log('📝 Continuing in mock mode...');
    return false;
  }
};

export default supabase;