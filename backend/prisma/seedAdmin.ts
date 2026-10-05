import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== SEEDING BASE DATA & ADMIN ===");

  // 1. Ensure Branch exists
  let branch = await prisma.branch.findFirst({ where: { code: "PLANET" } });
  if (!branch) {
    branch = await prisma.branch.findFirst();
  }
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        name: "Planet Cinema",
        code: "PLANET",
        address: "Makassar",
        city: "Makassar",
        province: "Sulawesi Selatan",
        phone: "0000000",
        email: "admin@planetsinemaid.com",
        timezone: "Asia/Makassar",
        status: "ACTIVE",
      },
    });
    console.log("Branch created:", branch.name, branch.code);
  } else {
    console.log("Existing branch used:", branch.name, branch.code);
  }

  // 2. Ensure Role exists
  let role = await prisma.role.findFirst({ where: { name: "ADMINISTRATOR" } });
  if (!role) {
    role = await prisma.role.create({
      data: {
        name: "ADMINISTRATOR",
        description: "System Administrator",
        status: "ACTIVE",
      },
    });
    console.log("Role created:", role.name);
  } else {
    console.log("Existing role used:", role.name);
  }

  // 3. Ensure Administrator User exists
  const username = "Hari";
  const passwordPlain = "H4r1y4nt0";
  const email = "hari@planetsinemaid.com";

  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: username },
        { email: email }
      ]
    }
  });

  const passwordHash = await bcrypt.hash(passwordPlain, 10);

  if (!user) {
    user = await prisma.user.create({
      data: {
        branchId: branch.id,
        roleId: role.id,
        username: username,
        name: "Hari",
        email: email,
        passwordHash: passwordHash,
        isActive: true,
        status: "ACTIVE",
      },
    });
    console.log("Admin user created successfully:", user.username);
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        branchId: branch.id,
        roleId: role.id,
        username: username,
        name: "Hari",
        email: email,
        passwordHash: passwordHash,
        isActive: true,
        status: "ACTIVE",
      },
    });
    console.log("Admin user updated successfully:", user.username);
  }

  console.log("SEEDING_COMPLETED_SUCCESSFULLY");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
