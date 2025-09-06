#!/usr/bin/env tsx

import bcrypt from 'bcrypt';
import { vaasSupabase } from '../config/database.js';

async function createTestAdmin() {
  try {
    console.log('🔄 Creating test admin user...');
    
    const testData = {
      firstName: 'Test',
      lastName: 'Admin',
      email: 'admintest@example.com',
      company: 'TestCompany2025',
      password: 'Demotest@2025'
    };
    
    // First, create the organization
    console.log('📋 Creating organization...');
    const { data: orgData, error: orgError } = await vaasSupabase
      .from('vaas_organizations')
      .insert({
        name: testData.company,
        slug: testData.company.toLowerCase().replace(/\s+/g, '-'),
        subscription_tier: 'starter',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();
      
    if (orgError) {
      console.error('❌ Failed to create organization:', orgError);
      process.exit(1);
    }
    
    console.log('✅ Organization created:', orgData.name);
    
    // Hash the password
    console.log('🔐 Hashing password...');
    const passwordHash = await bcrypt.hash(testData.password, 10);
    
    // Create the admin user
    console.log('👤 Creating admin user...');
    const { data: adminData, error: adminError } = await vaasSupabase
      .from('vaas_admins')
      .insert({
        first_name: testData.firstName,
        last_name: testData.lastName,
        email: testData.email,
        password_hash: passwordHash,
        organization_id: orgData.id,
        role: 'owner',
        status: 'active',
        email_verified: true, // Mark as verified for testing
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();
      
    if (adminError) {
      console.error('❌ Failed to create admin user:', adminError);
      process.exit(1);
    }
    
    console.log('✅ Test admin user created successfully!');
    console.log('');
    console.log('🎯 Test Account Details:');
    console.log('  Email:', testData.email);
    console.log('  Password:', testData.password);
    console.log('  Organization:', testData.company);
    console.log('  Admin ID:', adminData.id);
    console.log('  Organization ID:', orgData.id);
    console.log('  Status: active');
    console.log('  Email Verified: true');
    console.log('  Login URL: https://app.idswyft.app');
    console.log('');
    console.log('📝 Account is ready for login!');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Script error:', err);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createTestAdmin();
}

export { createTestAdmin };