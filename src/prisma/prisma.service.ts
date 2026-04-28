import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

let prismaInstance: PrismaClient;

if (!globalForPrisma.prisma) {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  
  globalForPrisma.prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

prismaInstance = globalForPrisma.prisma;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();
    // Sử dụng Proxy để chuyển hướng toàn bộ cuộc gọi đến prismaInstance toàn cục
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (prop in prismaInstance) {
          const value = (prismaInstance as any)[prop];
          if (typeof value === 'function') {
            return value.bind(prismaInstance);
          }
          return value;
        }
        const targetValue = (target as any)[prop];
        if (typeof targetValue === 'function') {
          return targetValue.bind(target);
        }
        return targetValue;
      },
    });
  }

  async onModuleInit() {
    // Pool tự động quản lý kết nối
  }

  async onModuleDestroy() {
    // Không ngắt kết nối trên serverless để tái sử dụng connection pool
  }
}



