const fs = require('fs');
const path = require('path');

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: node show-migration-sql.js <migration-file>');
  process.exit(1);
}

const migrationPath = path.join(__dirname, 'src/config/migrations', migrationFile);
if (!fs.existsSync(migrationPath)) {
  console.error(`Migration file not found: ${migrationPath}`);
  process.exit(1);
}

const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

console.log('='.repeat(80));
console.log(`SQL for migration: ${migrationFile}`);
console.log('='.repeat(80));
console.log('Copy and execute this SQL in your Supabase SQL Editor:');
console.log('='.repeat(80));
console.log();
console.log(migrationSQL);
console.log();
console.log('='.repeat(80));