import "dotenv/config";
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Создание Prisma Client согласно документации Prisma 7
// https://www.prisma.io/docs/getting-started/prisma-orm/quickstart/prisma-postgres#7-instantiate-prisma-client
function createPrismaClient(): PrismaClient | null {
  const accelerateUrl = process.env.PRISMA_DATABASE_URL;
  const databaseUrl = process.env.DATABASE_URL;

  if (!accelerateUrl && !databaseUrl) {
    console.warn('[Prisma] Neither PRISMA_DATABASE_URL nor DATABASE_URL is set, Prisma Client will not be available');
    return null;
  }

  try {
    // Приоритет: Prisma Accelerate (оптимизирован для serverless)
    if (accelerateUrl) {
      console.log('[Prisma] Using Prisma Accelerate');
      return new PrismaClient({
        accelerateUrl,
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      });
    }

    // Прямое подключение: согласно документации Prisma 7, нужен adapter
    if (databaseUrl) {
      console.log('[Prisma] Using direct database connection with adapter');
      const connectionString = `${databaseUrl}`;
      const adapter = new PrismaPg({ connectionString });
      
      return new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      });
    }

    return null;
  } catch (error) {
    console.error('[Prisma] Failed to create Prisma Client:', error);
    return null;
  }
}

export const prisma: PrismaClient | null =
  globalForPrisma.prisma ??
  createPrismaClient()

if (process.env.NODE_ENV !== 'production' && prisma) {
  globalForPrisma.prisma = prisma
}
