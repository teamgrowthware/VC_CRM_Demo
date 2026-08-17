import { PrismaClient } from '@prisma/client';
import { DATABASE_URL, DEMO_DATABASE_URL } from './config';
import { AsyncLocalStorage } from 'async_hooks';

process.env.DATABASE_URL = DATABASE_URL;

export const contextStorage = new AsyncLocalStorage<{ isDemo?: boolean }>();

const prismaProd = new PrismaClient({
  log: ['error', 'warn'],
});

const prismaDemo = DEMO_DATABASE_URL 
  ? new PrismaClient({
      datasourceUrl: DEMO_DATABASE_URL,
      log: ['error', 'warn'],
    })
  : null;

const prismaProxy = new Proxy(prismaProd, {
  get(target, prop) {
    const store = contextStorage.getStore();
    if (store?.isDemo && prismaDemo) {
      return (prismaDemo as any)[prop];
    }
    return (target as any)[prop];
  }
});

export default prismaProxy;