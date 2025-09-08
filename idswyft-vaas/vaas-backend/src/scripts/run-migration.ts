import '../config/index.js'; // Load environment variables
import { vaasSupabase } from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration(migrationFile: string) {
  try {
    console.log(`🔄 Running migration: ${migrationFile}`);
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../config/migrations', migrationFile);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Split SQL into individual statements and execute them
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      const { error } = await vaasSupabase
        .from('_migration_temp')
        .select('*')
        .limit(0); // This is just to test connection
      
      if (error) {
        console.error('❌ Database connection failed:', error);
        throw error;
      }
      
      // Execute raw SQL using the .sql() method if available, or use a workaround
      try {
        // This is a workaround since Supabase client doesn't directly support DDL
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        
        // For now, we'll log the SQL and you'll need to run it manually in Supabase dashboard
        console.log('📝 SQL Statement to run manually in Supabase:');
        console.log(statement);
        console.log('---');
      } catch (statementError) {
        console.error(`❌ Failed to execute statement: ${statement.substring(0, 50)}...`);
        throw statementError;
      }
    }
    
    console.log('✅ Migration SQL statements logged - please execute them in Supabase dashboard');
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
}

// Get migration file from command line args
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: npm run migrate <migration-file>');
  console.error('Example: npm run migrate add_enterprise_signups_table.sql');
  process.exit(1);
}

// Run migration
runMigration(migrationFile)
  .then(() => {
    console.log('🎉 Migration process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration process failed:', error);
    process.exit(1);
  });