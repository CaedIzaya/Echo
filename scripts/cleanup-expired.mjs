import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const now = new Date();

  const weekly = await prisma.weeklyReport.deleteMany({
    where: {
      expiresAt: {
        not: null,
        lte: now,
      },
    },
  });

  const shareLinks = await prisma.shareLink.deleteMany({
    where: {
      expiresAt: {
        not: null,
        lte: now,
      },
    },
  });

  // eslint-disable-next-line no-console
  console.log(
    `[cleanup-expired] deleted weeklyReports=${weekly.count}, shareLinks=${shareLinks.count} at ${now.toISOString()}`,
  );
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[cleanup-expired] failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

















