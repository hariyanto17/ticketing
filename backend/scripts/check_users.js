const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany();
    console.log(users.map(u => ({ id: u.id, username: u.username, email: u.email, passwordHash: u.passwordHash ? u.passwordHash.slice(0,10)+"..." : '(null)'})));
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
