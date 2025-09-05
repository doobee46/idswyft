import { vaasSupabase } from '../config/database.js';

async function createEnterpriseSignupsTable() {
  try {
    console.log('🔄 Creating vaas_enterprise_signups table...');
    
    // First check if table already exists
    const { data: existingTable } = await vaasSupabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'vaas_enterprise_signups')
      .single();
    
    if (existingTable) {
      console.log('✅ Table vaas_enterprise_signups already exists');
      return;
    }
    
    // Create the table using raw SQL
    const createTableSQL = `
-- Enterprise Signup Tracking
CREATE TABLE vaas_enterprise_signups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES vaas_organizations(id) ON DELETE SET NULL,
    
    -- Signup Data (stored as JSONB for flexibility)
    signup_data JSONB NOT NULL,
    
    -- Processing Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'processing', 'completed', 'failed')
    ),
    
    -- Notifications
    admin_notified BOOLEAN DEFAULT FALSE,
    welcome_email_sent BOOLEAN DEFAULT FALSE,
    
    -- Follow-up tracking
    sales_contacted BOOLEAN DEFAULT FALSE,
    onboarding_scheduled BOOLEAN DEFAULT FALSE,
    demo_completed BOOLEAN DEFAULT FALSE,
    
    -- Notes
    admin_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Extract commonly queried fields for indexing
    company_name VARCHAR(255) GENERATED ALWAYS AS (signup_data->>'company') STORED,
    admin_email VARCHAR(255) GENERATED ALWAYS AS (signup_data->>'email') STORED,
    estimated_volume VARCHAR(50) GENERATED ALWAYS AS (signup_data->>'estimatedVolume') STORED
);
    `;
    
    const { error: createError } = await vaasSupabase.rpc('exec_sql', { 
      sql: createTableSQL 
    });
    
    if (createError) {
      console.error('❌ Failed to create table:', createError);
      throw createError;
    }
    
    // Create indexes
    const createIndexesSQL = `
-- Create indexes for performance
CREATE INDEX idx_vaas_enterprise_signups_org_id ON vaas_enterprise_signups(organization_id);
CREATE INDEX idx_vaas_enterprise_signups_status ON vaas_enterprise_signups(status);
CREATE INDEX idx_vaas_enterprise_signups_email ON vaas_enterprise_signups(admin_email);
CREATE INDEX idx_vaas_enterprise_signups_company ON vaas_enterprise_signups(company_name);
CREATE INDEX idx_vaas_enterprise_signups_created ON vaas_enterprise_signups(created_at);
    `;
    
    const { error: indexError } = await vaasSupabase.rpc('exec_sql', { 
      sql: createIndexesSQL 
    });
    
    if (indexError) {
      console.warn('⚠️  Warning: Failed to create indexes:', indexError);
      // Don't fail for index creation issues
    }
    
    // Create trigger
    const createTriggerSQL = `
-- Add updated_at trigger
CREATE TRIGGER update_vaas_enterprise_signups_updated_at 
    BEFORE UPDATE ON vaas_enterprise_signups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;
    
    const { error: triggerError } = await vaasSupabase.rpc('exec_sql', { 
      sql: createTriggerSQL 
    });
    
    if (triggerError) {
      console.warn('⚠️  Warning: Failed to create trigger:', triggerError);
      // Don't fail for trigger creation issues
    }
    
    console.log('✅ Table vaas_enterprise_signups created successfully');
    
  } catch (error) {
    console.error('❌ Error creating table:', error);
    throw error;
  }
}

// Run the migration
createEnterpriseSignupsTable()
  .then(() => {
    console.log('🎉 Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });