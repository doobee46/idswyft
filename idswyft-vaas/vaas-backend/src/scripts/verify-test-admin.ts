#!/usr/bin/env tsx

import { vaasSupabase } from '../config/database.js';

async function verifyTestAdmin() {
  try {
    console.log('🔄 Verifying test admin email...');
    
    const email = 'admintest@example.com';
    
    // Update the admin user to mark email as verified
    const { data, error } = await vaasSupabase
      .from('vaas_admins')
      .update({ 
        email_verified: true,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('email', email)
      .select('id, email, first_name, last_name, status, email_verified');
      
    if (error) {
      console.error('❌ Failed to verify email:', error);
      process.exit(1);
    }
    
    if (!data || data.length === 0) {
      console.error('❌ Admin user not found with email:', email);
      process.exit(1);
    }
    
    console.log('✅ Test admin email verified successfully!');
    console.log('📝 Admin details:', data[0]);
    console.log('');
    console.log('🎯 Account is now ready for login:');
    console.log('  Email: admintest@example.com');
    console.log('  Organization: testenterprise');
    console.log('  Status: active');
    console.log('  Email Verified: true');
    console.log('  Login URL: https://app.idswyft.app');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Script error:', err);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  verifyTestAdmin();
}

export { verifyTestAdmin };