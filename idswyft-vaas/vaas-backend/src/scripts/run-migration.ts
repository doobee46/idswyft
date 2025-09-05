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
    
    // Execute migration
    const { error } = await vaasSupabase.rpc('exec_sql', { 
      sql: migrationSQL 
    });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
    
    console.log('✅ Migration completed successfully');
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