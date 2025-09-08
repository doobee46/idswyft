import '../config/index.js'; // Load environment variables
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Build PostgreSQL connection string from Supabase URL
const supabaseUrl = process.env.VAAS_SUPABASE_URL!;
const supabaseKey = process.env.VAAS_SUPABASE_SERVICE_ROLE_KEY!;

// Extract database connection info from Supabase URL
// Format: https://xxxx.supabase.co -> postgresql://postgres:[password]@db.xxxx.supabase.co:5432/postgres
const matches = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
if (!matches) {
  throw new Error('Invalid Supabase URL format');
}

const projectRef = matches[1];

// For Supabase, we need the database password from environment variables
const dbPassword = process.env.VAAS_DB_PASSWORD || process.env.DB_PASSWORD;
if (!dbPassword) {
  console.log('⚠️  Database password not found in environment variables.');
  console.log('Please add VAAS_DB_PASSWORD or DB_PASSWORD to your .env file.');
  console.log('You can find this in your Supabase project settings under Database.');
  process.exit(1);
}

const connectionString = `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

async function executeMigrations() {
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false // Required for Supabase
    }
  });

  try {
    console.log('🔗 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database');

    // Execute verification documents table migration
    console.log('🔄 Creating vaas_verification_documents table...');
    const documentsSQL = fs.readFileSync(
      path.join(__dirname, '../config/migrations/create-verification-documents-table.sql'),
      'utf-8'
    );
    await client.query(documentsSQL);
    console.log('✅ Documents table created');

    // Execute verification session fields migration
    console.log('🔄 Adding fields to vaas_verification_sessions...');
    const sessionFieldsSQL = fs.readFileSync(
      path.join(__dirname, '../config/migrations/add-verification-session-fields.sql'),
      'utf-8'
    );
    await client.query(sessionFieldsSQL);
    console.log('✅ Session fields added');

    console.log('🎉 All migrations applied successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    if (error instanceof Error && error.message.includes('password authentication failed')) {
      console.log('\n📝 To fix this, add your database password to .env:');
      console.log('VAAS_DB_PASSWORD=your_database_password_here');
      console.log('\nGet your password from: Supabase Dashboard > Settings > Database');
    }
    
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

executeMigrations()
  .then(() => {
    console.log('✨ Migration process completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration process failed:', error);
    process.exit(1);
  });