import bcrypt from 'bcrypt';
import { vaasSupabase } from '../config/database.js';

async function updateTestAdminPassword() {
  try {
    console.log('🔄 Updating test admin password...');
    
    const email = 'admintest@example.com';
    const newPassword = 'Demotest@2025';
    
    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    console.log('🔐 Password hashed successfully');
    
    // Update the admin user password
    const { data, error } = await vaasSupabase
      .from('vaas_admins')
      .update({ 
        password_hash: passwordHash,
        email_verified: true,
        status: 'active'
      })
      .eq('email', email)
      .select('id, email, first_name, last_name');
      
    if (error) {
      console.error('❌ Failed to update password:', error);
      process.exit(1);
    }
    
    if (!data || data.length === 0) {
      console.error('❌ Admin user not found with email:', email);
      process.exit(1);
    }
    
    console.log('✅ Test admin password updated successfully!');
    console.log('📝 Admin details:', data[0]);
    console.log('');
    console.log('🎯 Test Account Details:');
    console.log('  Email: admintest@example.com');
    console.log('  Password: Demotest@2025');
    console.log('  Organization: testenterprise');
    console.log('  Login URL: https://app.idswyft.app');
    console.log('');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Script error:', err);
    process.exit(1);
  }
}

updateTestAdminPassword();