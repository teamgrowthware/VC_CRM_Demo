import { PrismaClient } from '@prisma/client';
import { DATABASE_URL } from './config';

process.env.DATABASE_URL = DATABASE_URL;

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

export default prisma;
