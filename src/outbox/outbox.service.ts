import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FcmService } from '../notification/fcm.service';

@Injectable()
export class OutboxService {
  private readonly maxRetries = 5;

  constructor(
    private readonly prisma: PrismaService,
    private readonly fcmService: FcmService,
  ) {}

  async processEvent(eventId: string) {
    const event = await this.prisma.outboxEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      console.warn(`[OutboxService] Event ${eventId} not found.`);
      return;
    }

    if (event.status === 'PROCESSED') {
      console.log(`[OutboxService] Event ${eventId} was already processed. Skipping.`);
      return;
    }

    const leaseDurationMs = 10000; // 10 seconds (short lease for fast QStash retries)
    const leaseExpiresAt = new Date(Date.now() + leaseDurationMs);

    const updatedEvents: any[] = await this.prisma.$queryRawUnsafe(`
      UPDATE "outbox_events"
      SET "status" = 'PROCESSING', "lockedBy" = 'QStash', "leaseExpiresAt" = $1
      WHERE "id" = $2 AND (
        "status" IN ('PENDING', 'RETRY_SCHEDULED') 
        OR ("status" = 'PROCESSING' AND "leaseExpiresAt" <= NOW())
      )
      RETURNING *;
    `, leaseExpiresAt, eventId);

    if (!updatedEvents || updatedEvents.length === 0) {
      console.log(`[OutboxService] Event ${eventId} is currently locked or processed.`);
      return;
    }

    console.log(`[OutboxService] Claimed event ${eventId} for processing.`);

    try {
      if (event.eventType === 'TRANSACTION_CREATED') {
        await this.handleTransactionCreated(event);
      } else {
        console.warn(`[OutboxService] Unknown event type: ${event.eventType}`);
      }

      await this.prisma.outboxEvent.update({
        where: { id: eventId },
        data: {
          status: 'PROCESSED',
          processedAt: new Date(),
          lockedBy: null,
          leaseExpiresAt: null,
        },
      });
      console.log(`[OutboxService] Event ${eventId} processed successfully.`);
    } catch (error: any) {
      console.error(`[OutboxService] Failed to process event ${eventId}:`, error);

      const nextRetryCount = event.retryCount + 1;
      const isDeadLetter = nextRetryCount >= this.maxRetries;
      
      const backoffSeconds = Math.pow(2, nextRetryCount) * 5;
      const nextRetryAt = isDeadLetter ? null : new Date(Date.now() + backoffSeconds * 1000);

      await this.prisma.outboxEvent.update({
        where: { id: eventId },
        data: {
          status: isDeadLetter ? 'DEAD_LETTER' : 'RETRY_SCHEDULED',
          retryCount: nextRetryCount,
          nextRetryAt,
          lastError: error.message || String(error),
          lockedBy: null,
          leaseExpiresAt: null,
        },
      });

      throw error;
    }
  }

  private async handleTransactionCreated(event: any) {
    const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
    const { transactionId, metadata } = payload;

    if (!transactionId || !metadata) {
      throw new Error('Invalid payload for TRANSACTION_CREATED event');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        transactions: {
          some: { id: transactionId },
        },
      },
      include: { fcmTokens: true },
    });

    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
      console.log(`[OutboxService] No FCM tokens found for transaction ${transactionId}. Skipping.`);
      return;
    }

    const existingLogs = await this.prisma.notificationLog.findMany({
      where: {
        transactionId,
        status: 'SUCCESS',
      },
    });
    const successfulTokenIds = existingLogs.map((log) => log.fcmTokenId);

    let anyFailed = false;
    let lastFcmError = '';

    for (const tokenObj of user.fcmTokens) {
      if (successfulTokenIds.includes(tokenObj.id)) {
        continue;
      }

      const result = await this.fcmService.sendMoneyIn(tokenObj.token, metadata.amount, metadata.content);

      await this.prisma.notificationLog.create({
        data: {
          transactionId,
          fcmTokenId: tokenObj.id,
          status: result.success ? 'SUCCESS' : 'FAILED',
          errorReason: result.success ? null : result.error,
        },
      });

      if (!result.success) {
        anyFailed = true;
        lastFcmError = result.error;
      }
    }

    if (anyFailed) {
      throw new Error(`One or more FCM notifications failed. Last error: ${lastFcmError}`);
    }
  }
}
