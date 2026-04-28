import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { decrypt } from '../utils/crypto';
import { AxiomService } from '../logger/axiom.service';

@Injectable()
export class WebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly axiom: AxiomService,
  ) {}

  async processWebhook(tenantId: string, payload: any, secret: string) {
    // 1. Fetch Tenant/User
    const user = await this.prisma.user.findUnique({
      where: { id: tenantId },
    });

    if (!user) {
      throw new UnauthorizedException('Tenant not found');
    }

    if (!user.encryptedWebhookSecret) {
      throw new UnauthorizedException('Webhook secret not configured for this tenant');
    }

    // 2. Verify Secret/API Key
    let decryptedSecret: string;
    try {
      decryptedSecret = decrypt(user.encryptedWebhookSecret);
    } catch (error) {
      throw new InternalError('Failed to decrypt tenant secret');
    }

    if (secret !== decryptedSecret) {
      throw new UnauthorizedException('Invalid authentication secret');
    }

    // 3. Store Raw Webhook Event
    await this.prisma.webhookEvent.create({
      data: {
        provider: 'SEPAY',
        payload: payload,
        processedStatus: 'RECEIVED',
      },
    });

    // 4. Extract Data
    const sepayId = payload.id?.toString();
    const amount = parseFloat(payload.amount_in || payload.amount || '0');
    const content = payload.transaction_content || payload.content;
    const transferDateStr = payload.transaction_date || payload.transfer_date;

    if (!sepayId) {
      throw new BadRequestException('Missing SePay transaction ID in payload');
    }

    // 5. Check Idempotency
    const existingTx = await this.prisma.transaction.findUnique({
      where: { sepayId },
    });

    if (existingTx) {
      // Already processed, return success to avoid SePay retries
      return { success: true, message: 'Transaction already processed' };
    }

    // 6. Save Transaction
    const transferDate = transferDateStr ? new Date(transferDateStr) : new Date();

    await this.prisma.transaction.create({
      data: {
        sepayId,
        userId: user.id,
        amount,
        content,
        transferDate,
      },
    });

    await this.axiom.logEvent({
      event: 'transaction_processed',
      tenantId,
      sepayId,
      amount,
    });

    // TODO: Phase 3 - Trigger FCM Notification

    return { success: true, message: 'Webhook processed successfully' };
  }
}

class InternalError extends Error {}

