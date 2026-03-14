const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10); // Superadmin Password

  const admin = await prisma.user.upsert({
    where: { email: 'admin@amanatdev.com' },
    update: {},
    create: {
      email: 'admin@amanatdev.com',
      password: hashedPassword,
      stores: {
        create: {
          name: 'Zipper Mobility',
          googleClientId: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
          googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret',
          googleDeveloperToken: process.env.GOOGLE_DEVELOPER_TOKEN || 'your-developer-token',
          googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN || 'your-refresh-token',
          googleCustomerId: process.env.GOOGLE_CUSTOMER_ID || 'your-customer-id',
          googleLoginCustomerId: process.env.GOOGLE_LOGIN_CUSTOMER_ID || 'your-login-customer-id',
          wooUrl: process.env.WOO_URL || 'https://your-store.com',
          wooCk: process.env.WOO_CK || 'your-consumer-key',
          wooCs: process.env.WOO_CS || 'your-consumer-secret',
        },
      },
    },
  });

  console.log('✅ Success: Superadmin created and Zipper Mobility store linked!');
  console.log('📝 Note: Update your .env file with actual API credentials for the store to work.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });