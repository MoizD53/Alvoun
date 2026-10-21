import { PrismaClient } from "@prisma/client"
import { createClient } from "@libsql/client"
import { PrismaLibSQL } from "@prisma/adapter-libsql"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  (() => {
    const dbUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || '';
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (
      authToken &&
      (dbUrl.startsWith('libsql://') || dbUrl.startsWith('https://') || dbUrl.includes('turso.io'))
    ) {
      const libsql = createClient({
        url: dbUrl,
        authToken: authToken,
      });
      const adapter = new PrismaLibSQL(libsql);
      return new PrismaClient({ adapter });
    }
    return new PrismaClient();
  })();

globalForPrisma.prisma = prisma;
