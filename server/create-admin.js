
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('=== Creating admin user ===');
  
  // Hash password
  const hashedPwd = await bcrypt.hash('admin123', 10);
  
  // Create or update admin user
  const adminUser = await prisma.user.upsert({
    where: { phone: '13800000000' },
    update: {},
    create: {
      id: 'user-admin',
      name: '系统管理员',
      phone: '13800000000',
      password: hashedPwd,
      role: 'ADMIN',
    },
  });
  
  console.log('✅ Admin user created successfully!');
  console.log('Phone: 13800000000');
  console.log('Password: admin123');
  console.log('User:', adminUser);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

