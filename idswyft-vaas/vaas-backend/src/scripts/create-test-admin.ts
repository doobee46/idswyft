// Using built-in fetch (Node.js 18+)

// Test admin user data
const testAdminData = {
  company_name: 'Test Enterprise Solutions',
  company_email: 'contact@testenterprise.com',
  admin_first_name: 'John',
  admin_last_name: 'Doe',
  admin_email: 'admin@testenterprise.com',
  admin_password: 'TestPassword123!',
  phone_number: '+1-555-0123',
  company_size: 'medium' as const,
  industry: 'Technology'
};

async function createTestAdmin() {
  try {
    console.log('Creating test admin user...');
    
    // Get the API base URL from environment or default to localhost
    const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testAdminData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Test admin user created successfully!');
      console.log('\n--- Account Details ---');
      console.log(`Organization: ${result.data.organization.name}`);
      console.log(`Organization Slug: ${result.data.organization.slug}`);
      console.log(`Admin Email: ${result.data.admin.email}`);
      console.log(`Admin Name: ${result.data.admin.first_name} ${result.data.admin.last_name}`);
      console.log(`Role: ${result.data.admin.role}`);
      console.log(`Free Credits: ${result.data.organization.verification_credits}`);
      console.log(`Email Verified: ${result.data.admin.email_verified}`);
      console.log('\n--- Login Instructions ---');
      console.log('1. Go to the VaaS Admin Dashboard');
      console.log('2. Use these credentials:');
      console.log(`   Email: ${testAdminData.admin_email}`);
      console.log(`   Password: ${testAdminData.admin_password}`);
      console.log(`   Organization: ${result.data.organization.slug}`);
      console.log('\n--- Next Steps ---');
      console.log('- Email verification is required (check console logs for verification link)');
      console.log('- You can now test the admin dashboard features');
      console.log('- API keys can be generated from the admin panel');
    } else {
      console.error('❌ Failed to create test admin user');
      console.error('Status:', response.status);
      console.error('Error:', result);
      
      if (result.error?.code === 'EMAIL_ALREADY_EXISTS') {
        console.log('\n--- Existing Account ---');
        console.log('The test admin user already exists. You can login with:');
        console.log(`Email: ${testAdminData.admin_email}`);
        console.log(`Password: ${testAdminData.admin_password}`);
        console.log('Organization: test-enterprise-solutions');
      }
    }
  } catch (error) {
    console.error('❌ Error creating test admin user:', error);
    console.log('\nMake sure the VaaS backend is running on the expected port.');
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  createTestAdmin();
}

export default createTestAdmin;