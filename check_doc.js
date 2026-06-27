const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const doc = await prisma.document.findUnique({
    where: { id: 'cmqvrjq2y0001xht84ukgx4i4' }
  });
  console.log(doc);
}
main().catch(console.error).finally(() => prisma.$disconnect());
