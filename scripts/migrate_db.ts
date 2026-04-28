import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is missing in environment variables');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting migration...');

  try {
    // 1. Create Enum OutboxStatus
    await prisma.$executeRawUnsafe(`
      CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'DEAD_LETTER', 'RETRY_SCHEDULED');
    `);
    console.log('Enum OutboxStatus created.');
  } catch (e: any) {
    if (e.message.includes('already exists') || e.message.includes('42710')) {
      console.log('Enum OutboxStatus already exists.');
    } else {
      throw e;
    }
  }

  try {
    // 2. Create Table outbox_events
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "outbox_events" (
        "id" TEXT NOT NULL,
        "idempotencyKey" TEXT,
        "eventType" TEXT NOT NULL,
        "aggregateId" TEXT NOT NULL,
        "aggregateType" TEXT NOT NULL,
        "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "processedAt" TIMESTAMP(3),
        "schemaVersion" INTEGER NOT NULL DEFAULT 1,
        "eventVersion" INTEGER NOT NULL DEFAULT 1,
        "correlationId" TEXT,
        "payload" JSONB NOT NULL,
        "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
        "retryCount" INTEGER NOT NULL DEFAULT 0,
        "nextRetryAt" TIMESTAMP(3),
        "lastError" TEXT,
        "lockedBy" TEXT,
        "leaseExpiresAt" TIMESTAMP(3),

        CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('Table outbox_events created.');
  } catch (e: any) {
    if (e.message.includes('already exists') || e.message.includes('42P07')) {
      console.log('Table outbox_events already exists.');
    } else {
      throw e;
    }
  }

  try {
    // 3. Create Indexes
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX "outbox_events_idempotencyKey_key" ON "outbox_events"("idempotencyKey");
    `);
    console.log('Index outbox_events_idempotencyKey_key created.');
  } catch (e: any) {
    if (e.message.includes('already exists') || e.message.includes('42710')) {
      console.log('Index outbox_events_idempotencyKey_key already exists.');
    } else {
      throw e;
    }
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE INDEX "outbox_events_status_nextRetryAt_idx" ON "outbox_events"("status", "nextRetryAt");
    `);
    console.log('Index outbox_events_status_nextRetryAt_idx created.');
  } catch (e: any) {
    if (e.message.includes('already exists') || e.message.includes('42710')) {
      console.log('Index outbox_events_status_nextRetryAt_idx already exists.');
    } else {
      throw e;
    }
  }

  console.log('Migration completed successfully.');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
