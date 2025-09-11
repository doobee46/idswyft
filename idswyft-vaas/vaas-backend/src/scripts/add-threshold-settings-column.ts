#!/usr/bin/env tsx

import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

// Create Supabase client directly here after loading env vars
const supabaseUrl = process.env.VAAS_SUPABASE_URL;
const supabaseKey = process.env.VAAS_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables:');
  console.error('VAAS_SUPABASE_URL:', !!supabaseUrl);
  console.error('VAAS_SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey);
  process.exit(1);
}

const vaasSupabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function addThresholdSettingsColumn() {
  try {
    console.log('🔗 Environment loaded successfully');
    console.log('🔗 Supabase URL:', supabaseUrl);
    console.log('🔗 Supabase Key exists:', !!supabaseKey);
    console.log('🔄 Adding threshold_settings column to vaas_organizations table...');
    
    // First, check if the table exists and what columns it has
    console.log('🔍 Checking existing table structure...');
    const { data: tableInfo, error: tableError } = await vaasSupabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'vaas_organizations')
      .eq('table_schema', 'public');
    
    if (tableError) {
      console.error('❌ Failed to query table structure:', tableError);
    } else {
      console.log('📋 Current table columns:', tableInfo);
    }
    
    // Check if threshold_settings column already exists
    const hasThresholdSettings = tableInfo?.some(col => col.column_name === 'threshold_settings');
    
    if (hasThresholdSettings) {
      console.log('✅ threshold_settings column already exists!');
      return;
    }
    
    // Try adding the column using a direct ALTER TABLE
    console.log('🔄 Adding threshold_settings column...');
    const { error } = await vaasSupabase.rpc('exec_sql', {
      sql: `ALTER TABLE vaas_organizations ADD COLUMN threshold_settings JSONB DEFAULT NULL;`
    });
    
    if (error) {
      console.error('❌ Failed to add threshold_settings column:', error);
      
      // Try alternative approach using direct SQL
      console.log('🔄 Trying alternative approach...');
      
      const { error: altError } = await vaasSupabase
        .from('vaas_organizations')
        .select('threshold_settings')
        .limit(1);
        
      if (altError && altError.code === '42703') {
        console.log('⚠️  Column does not exist. Manual database update required.');
        console.log('📝 Please run this SQL command in your Supabase dashboard:');
        console.log('');
        console.log('ALTER TABLE vaas_organizations ADD COLUMN threshold_settings JSONB DEFAULT NULL;');
        console.log('');
      } else {
        console.log('✅ Column may already exist or different error occurred');
      }
    } else {
      console.log('✅ threshold_settings column added successfully!');
    }
    
  } catch (err) {
    console.error('❌ Script error:', err);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  addThresholdSettingsColumn();
}

export { addThresholdSettingsColumn };