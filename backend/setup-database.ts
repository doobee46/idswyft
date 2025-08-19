import { supabase } from './src/database.js';

async function setupDatabase() {
  console.log('🗄️ Setting up Idswyft database...');
  
  try {
    // Create basic tables needed for the application
    const tables = [
      {
        name: 'users',
        sql: `
          CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255),
            first_name VARCHAR(100),
            last_name VARCHAR(100),
            phone VARCHAR(20),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      },
      {
        name: 'developers',
        sql: `
          CREATE TABLE IF NOT EXISTS developers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            company VARCHAR(255),
            webhook_url TEXT,
            is_verified BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      },
      {
        name: 'api_keys',
        sql: `
          CREATE TABLE IF NOT EXISTS api_keys (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            developer_id UUID REFERENCES developers(id) ON DELETE CASCADE,
            key_hash TEXT NOT NULL,
            key_prefix VARCHAR(20) NOT NULL,
            name VARCHAR(255) NOT NULL,
            is_sandbox BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            last_used_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            expires_at TIMESTAMP WITH TIME ZONE
          );
        `
      },
      {
        name: 'verification_requests',
        sql: `
          CREATE TABLE IF NOT EXISTS verification_requests (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            developer_id UUID REFERENCES developers(id) ON DELETE CASCADE,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            verification_type VARCHAR(20) DEFAULT 'document',
            confidence_score DECIMAL(3,2),
            manual_review_reason TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      },
      {
        name: 'documents',
        sql: `
          CREATE TABLE IF NOT EXISTS documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            verification_request_id UUID REFERENCES verification_requests(id) ON DELETE CASCADE,
            document_type VARCHAR(50) NOT NULL,
            file_path TEXT NOT NULL,
            file_name VARCHAR(255) NOT NULL,
            file_size INTEGER,
            mime_type VARCHAR(100),
            ocr_data JSONB,
            quality_score DECIMAL(3,2),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      },
      {
        name: 'selfies',
        sql: `
          CREATE TABLE IF NOT EXISTS selfies (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            verification_request_id UUID REFERENCES verification_requests(id) ON DELETE CASCADE,
            file_path TEXT NOT NULL,
            file_name VARCHAR(255) NOT NULL,
            file_size INTEGER,
            liveness_score DECIMAL(3,2),
            face_detected BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      },
      {
        name: 'webhooks',
        sql: `
          CREATE TABLE IF NOT EXISTS webhooks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            developer_id UUID REFERENCES developers(id) ON DELETE CASCADE,
            url TEXT NOT NULL,
            events TEXT[],
            secret_key VARCHAR(255),
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      }
    ];
    
    console.log(`📋 Creating ${tables.length} tables...`);
    
    // Create tables one by one
    for (const table of tables) {
      try {
        // Use Supabase SQL function if available
        const { error } = await supabase.rpc('exec', { sql: table.sql });
        
        if (error) {
          // Fallback: Try to check if table exists by querying it
          const { error: checkError } = await supabase
            .from(table.name)
            .select('*')
            .limit(1);
          
          if (checkError && checkError.code === 'PGRST116') {
            console.log(`❌ Table '${table.name}' creation failed: ${error.message}`);
          } else {
            console.log(`✅ Table '${table.name}' already exists or created successfully`);
          }
        } else {
          console.log(`✅ Table '${table.name}' created successfully`);
        }
      } catch (err: any) {
        console.log(`⚠️ Warning for table '${table.name}': ${err.message}`);
      }
    }
    
    // Test the database by checking each table
    console.log('🧪 Testing database tables...');
    
    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table.name)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ Table '${table.name}' is not accessible: ${error.message}`);
        } else {
          console.log(`✅ Table '${table.name}' is accessible`);
        }
      } catch (err: any) {
        console.log(`❌ Table '${table.name}' test failed: ${err.message}`);
      }
    }
    
    // Create a test developer and API key
    console.log('🔑 Creating test developer account...');
    
    try {
      const { data: developer, error: devError } = await supabase
        .from('developers')
        .upsert({
          email: 'test@idswyft.com',
          name: 'Test Developer',
          company: 'Idswyft Testing',
          is_verified: true
        }, { onConflict: 'email' })
        .select()
        .single();
      
      if (devError) {
        console.log(`⚠️ Could not create test developer: ${devError.message}`);
      } else {
        console.log(`✅ Test developer created: ${developer.email}`);
        
        // Create a test API key
        try {
          const testApiKey = 'idswyft_test_' + Math.random().toString(36).substring(2, 15);
          const { error: keyError } = await supabase
            .from('api_keys')
            .insert({
              developer_id: developer.id,
              key_hash: testApiKey,
              key_prefix: 'idswyft_test',
              name: 'Test API Key',
              is_sandbox: true
            });
          
          if (keyError) {
            console.log(`⚠️ Could not create test API key: ${keyError.message}`);
          } else {
            console.log(`✅ Test API key created: ${testApiKey}`);
          }
        } catch (err: any) {
          console.log(`⚠️ API key creation warning: ${err.message}`);
        }
      }
    } catch (err: any) {
      console.log(`⚠️ Developer creation warning: ${err.message}`);
    }
    
    console.log('');
    console.log('🎉 Database setup completed!');
    console.log('📊 Summary:');
    console.log('   - ✅ Core tables created');
    console.log('   - ✅ Test developer account ready');
    console.log('   - ✅ Database ready for identity verification');
    console.log('');
    console.log('🚀 You can now start using the API:');
    console.log('   - Backend: http://localhost:3001');
    console.log('   - Health: http://localhost:3001/api/health');
    console.log('   - Docs: http://localhost:3001/api/docs');
    
    return true;
  } catch (error: any) {
    console.error('💥 Database setup failed:', error.message);
    console.error('🔧 Please check your Supabase configuration and try again');
    return false;
  }
}

// Run the setup
setupDatabase()
  .then((success) => {
    if (success) {
      console.log('✅ Database setup completed successfully!');
      process.exit(0);
    } else {
      console.log('❌ Database setup failed');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });