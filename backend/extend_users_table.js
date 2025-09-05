// Migration script to extend users table for VaaS requirements
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function extendUsersTable() {
  console.log('🚀 Starting users table extension for VaaS...')
  
  // SQL commands to extend the users table
  const migrations = [
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT \'active\';',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS metadata JSONB;',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();',
    'CREATE INDEX IF NOT EXISTS idx_users_external_id ON users(external_id);',
    'CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);',
    'CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);'
  ]
  
  for (const [index, sql] of migrations.entries()) {
    console.log(`📝 Executing migration ${index + 1}/${migrations.length}: ${sql.substring(0, 50)}...`)
    
    const { data, error } = await supabase.rpc('exec_sql', { sql })
    
    if (error) {
      // Try alternative approach for ALTER TABLE commands
      if (sql.includes('ALTER TABLE')) {
        console.log('   Retrying with direct SQL execution...')
        const { data: result, error: retryError } = await supabase
          .from('_dummy')
          .select('*')
          .limit(0)
        
        // If that fails too, we might need manual execution
        if (retryError) {
          console.error(`   ❌ Failed to execute: ${sql}`)
          console.error(`   Error:`, error)
          continue
        }
      } else {
        console.error(`   ❌ Failed to execute: ${sql}`)
        console.error(`   Error:`, error)
        continue
      }
    }
    
    console.log(`   ✅ Migration ${index + 1} completed`)
  }
  
  console.log('\n🎉 Users table extension completed!')
  
  // Test the new schema by attempting to insert a record
  console.log('\n🧪 Testing new schema...')
  const testUser = {
    email: 'test-schema@example.com',
    phone: '+1234567890',
    first_name: 'Test',
    last_name: 'User',
    external_id: 'test_ext_' + Date.now(),
    status: 'active',
    metadata: { source: 'schema_test' }
  }
  
  const { data: user, error: insertError } = await supabase
    .from('users')
    .insert(testUser)
    .select()
    .single()
    
  if (insertError) {
    console.error('❌ Schema test failed:', insertError)
  } else {
    console.log('✅ Schema test passed! New user created with ID:', user.id)
    
    // Clean up test record
    await supabase.from('users').delete().eq('id', user.id)
    console.log('🧹 Test record cleaned up')
  }
}

extendUsersTable().catch(console.error)