import '../config/index.js'; // Load environment variables
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use service role key for admin operations
const supabaseUrl = process.env.VAAS_SUPABASE_URL!;
const supabaseServiceKey = process.env.VAAS_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSQLStatement(sql: string): Promise<void> {
  try {
    console.log(`Executing SQL: ${sql.substring(0, 50)}...`);
    
    // Use the REST API to execute raw SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({
        sql: sql
      })
    });
    
    if (!response.ok) {
      // If the RPC doesn't exist, try alternative approach
      if (response.status === 404) {
        console.log('RPC exec not available, using alternative approach...');
        
        // Try using a simple query to test if we can execute DDL
        // For Supabase, we might need to use the dashboard or create our own exec function
        const testResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/version`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey
          }
        });
        
        console.log('⚠️  Direct SQL execution not available via API.');
        console.log('Please execute the following SQL in Supabase dashboard:');
        console.log('---');
        console.log(sql);
        console.log('---');
        return;
      }
      
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ SQL executed successfully');
    
  } catch (error) {
    console.error('❌ Failed to execute SQL:', error);
    console.log('Please execute this SQL manually in Supabase dashboard:');
    console.log('---');
    console.log(sql);
    console.log('---');
  }
}

async function applyMigration(migrationFile: string): Promise<void> {
  try {
    console.log(`🔄 Applying migration: ${migrationFile}`);
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../config/migrations', migrationFile);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Split into statements and execute each one
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        await executeSQLStatement(statement + ';');
      }
    }
    
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting database migrations...');
    
    // Apply migrations in order
    await applyMigration('create-verification-documents-table.sql');
    await applyMigration('add-verification-session-fields.sql');
    
    console.log('🎉 All migrations completed successfully');
  } catch (error) {
    console.error('💥 Migration process failed:', error);
    process.exit(1);
  }
}

main();