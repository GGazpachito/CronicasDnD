import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const singleton = globalThis as typeof globalThis & { __dndPrisma?: PrismaClient };

export function db():PrismaClient {
  const connectionString=process.env.DATABASE_URL;
  if(!connectionString)throw new Error('DATABASE_URL no configurada en apps/web/.env.local');
  if(!singleton.__dndPrisma){
    singleton.__dndPrisma=new PrismaClient({adapter:new PrismaPg({connectionString})});
  }
  return singleton.__dndPrisma;
}
