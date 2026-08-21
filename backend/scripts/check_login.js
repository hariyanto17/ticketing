const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  const username = process.argv[2] || 'admin';
  const password = process.argv[3] || 'test1234';
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      console.log('User not found');
      process.exit(0);
    }
    console.log('User found:', { id: user.id, username: user.username, isActive: user.isActive });
    const ok = await bcrypt.compare(password, user.passwordHash || '');
    console.log('Password match:', ok);
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
