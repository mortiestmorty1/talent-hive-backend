import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('🔧 Creating test user...');
    
    // Hash the password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash('password123', salt);
    
    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: hashedPassword,
        username: 'testuser',
        fullName: 'Test User',
        description: 'Test user for development',
        isProfileInfoSet: true
      }
    });
    
    console.log('✅ Test user created successfully!');
    console.log('📧 Email: test@example.com');
    console.log('🔑 Password: password123');
    console.log('👤 Username: testuser');
    console.log('🆔 User ID:', testUser.id);
    
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    
    // If database connection fails, provide manual test credentials
    console.log('\n🔧 Since database connection failed, here are manual test credentials:');
    console.log('📧 Email: test@example.com');
    console.log('🔑 Password: password123');
    console.log('👤 Username: testuser');
    console.log('\n💡 You can use these credentials to test the frontend login form.');
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
