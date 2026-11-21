import { PrismaClient } from '@prisma/client'

/**
 * Global Prisma client singleton.
 * In development, Next.js hot-reloads create new module instances, which
 * would exhaust the connection pool. The global singleton pattern prevents that.
 */

const globalForPrisma = globalThis

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
