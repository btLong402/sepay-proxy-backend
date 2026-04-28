import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = global as unknown as {
  pool: Pool;
  adapter: PrismaPg;
};

if (!globalForPrisma.pool) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is missing in environment variables');
  }
  globalForPrisma.pool = new Pool({ connectionString });
  globalForPrisma.adapter = new PrismaPg(globalForPrisma.pool);
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      adapter: globalForPrisma.adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  async onModuleInit() {
    // Pool tự động quản lý kết nối
  }

  async onModuleDestroy() {
    // Không đóng pool trên Serverless để tái sử dụng connection pool
  }
}




