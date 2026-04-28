import { Injectable, UnauthorizedException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { AxiomService } from '../logger/axiom.service';
import { QstashService } from '../queue/qstash.service';
import { FcmService } from '../notification/fcm.service';

@Injectable()
export class WebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly axiom: AxiomService,
    @Inject(forwardRef(() => QstashService))
    private readonly qstashService: QstashService,
    private readonly fcmService: FcmService,
  ) {}

  async processWebhook(tenantId: string, payload: any) {
    // 1. Fetch Tenant/User
    const user = await this.prisma.user.findUnique({
      where: { id: tenantId },
    });

    if (!user) {
      throw new UnauthorizedException('Tenant not found');
    }

    // 2. Đẩy vào QStash Queue để xử lý bất đồng bộ
    await this.qstashService.publishWebhookEvent(tenantId, payload);

    return { success: true, message: 'Webhook queued successfully' };
  }

  async handleQStashEvent(tenantId: string, payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: tenantId },
      include: { fcmTokens: true },
    });

    if (!user) {
      throw new Error('Tenant not found during async processing');
    }

    // 1. Extract Data
    const sepayId = payload.id?.toString();
    const amount = parseFloat(payload.amount_in || payload.amount || '0');
    const content = payload.transaction_content || payload.content;
    const transferDateStr = payload.transaction_date || payload.transfer_date;

    if (!sepayId) {
      throw new BadRequestException('Missing SePay transaction ID in payload');
    }

    const transferDate = transferDateStr ? new Date(transferDateStr) : new Date();

    // 2. Đảm bảo Transaction tồn tại (Idempotency Check)
    let transaction = await this.prisma.transaction.findUnique({
      where: {
        sepayId_userId: {
          sepayId,
          userId: user.id,
        },
      },
    });

    if (!transaction) {
      try {
        let outboxEventId: string | null = null;

        transaction = await this.prisma.$transaction(
          async (tx) => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${sepayId}))`;

            const existing = await tx.transaction.findUnique({
              where: {
                sepayId_userId: {
                  sepayId,
                  userId: user.id,
                },
              },
            });
            if (existing) return existing;

            const newTx = await tx.transaction.create({
              data: {
                sepayId,
                userId: user.id,
                amount,
                content,
                transferDate,
              },
            });

            const tokens = user.fcmTokens ? user.fcmTokens.map((t) => t.token) : [];
            const outbox = await tx.outboxEvent.create({
              data: {
                idempotencyKey: `${sepayId}_${user.id}_MONEY_IN`,
                eventType: 'TRANSACTION_CREATED',
                aggregateId: newTx.id,
                aggregateType: 'TRANSACTION',
                payload: {
                  transactionId: newTx.id,
                  userId: user.id,
                  notificationType: 'MONEY_IN',
                  deviceTargets: tokens,
                  metadata: {
                    amount,
                    content,
                  },
                } as any,
                status: 'PENDING',
              },
            });

            outboxEventId = outbox.id;

            return newTx;
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          },
        );

        if (outboxEventId) {
          await this.qstashService.publishOutboxEvent(outboxEventId);
        }
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          transaction = await this.prisma.transaction.findUnique({
            where: {
              sepayId_userId: {
                sepayId,
                userId: user.id,
              },
            },
          });
        } else {
          throw error;
        }
      }
    }

    if (!transaction) {
      throw new Error('Failed to fetch or create transaction');
    }

    // 4. Lưu log vào Axiom
    await this.axiom.logEvent({
      event: 'transaction_processed',
      tenantId,
      sepayId,
      amount,
    });
  }
}

class InternalError extends Error {}



