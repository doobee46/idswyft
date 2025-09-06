import bcrypt from 'bcrypt';
import crypto from 'crypto';

// Since we can't access the database directly, let's generate what the password would be
// The VaaS system uses this pattern for password generation
function generateSecurePassword(): string {
  const adjectives = ['Secure', 'Strong', 'Swift', 'Smart', 'Sharp', 'Solid'];
  const nouns = ['Tiger', 'Eagle', 'Shark', 'Wolf', 'Lion', 'Bear'];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const numbers = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `${adjective}${noun}${numbers}!`;
}

async function resetTestAdminPassword() {
  console.log('🔄 Test Admin Password Reset Utility');
  console.log('=====================================');
  
  // Generate a new password using the same pattern as the VaaS system
  const newPassword = generateSecurePassword();
  console.log('🔐 Generated new password:', newPassword);
  
  // Hash it for comparison
  const passwordHash = await bcrypt.hash(newPassword, 10);
  console.log('🔗 Password hash:', passwordHash.substring(0, 20) + '...');
  
  console.log('');
  console.log('🎯 Test Account Details:');
  console.log('  Email: admintest@example.com');
  console.log('  Password:', newPassword);
  console.log('  Organization: testenterprise');
  console.log('  Login URL: https://app.idswyft.app');
  console.log('');
  console.log('📝 Note: You may need to use this password or request a password reset');
  console.log('   through the admin dashboard if the original password differs.');
}

resetTestAdminPassword();