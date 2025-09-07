import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('🔍 Checking for existing users...');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        createdAt: true
      }
    });
    
    console.log(`✅ Found ${users.length} users in the database:`);
    
    if (users.length === 0) {
      console.log('❌ No users found. Creating a test user...');
      
      const testUser = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: '$2b$10$rQZ8K9mN2pL1vX3yU6wA7eR4tY5uI8oP9qJ0kL1mN2oP3qR4sT5uV6wX7yZ8',
          username: 'testuser',
          fullName: 'Test User',
          description: 'Test user for development',
          isProfileInfoSet: true
        }
      });
      
      console.log('✅ Created test user:', {
        email: testUser.email,
        username: testUser.username,
        password: 'password123' // This is the plain text password for testing
      });
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} (${user.username || 'No username'}) - Created: ${user.createdAt}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
