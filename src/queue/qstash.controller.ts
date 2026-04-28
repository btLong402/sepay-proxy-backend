import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { QstashGuard } from './qstash.guard';
import { WebhookService } from '../webhook/webhook.service';
import * as Sentry from '@sentry/node';

@Controller('v1/webhooks/qstash')
@UseGuards(QstashGuard)
export class QstashController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('process')
  async processEvent(
    @Body() data: { tenantId: string; payload: any },
  ) {
    try {
      await this.webhookService.handleQStashEvent(data.tenantId, data.payload);
      return { success: true };
    } catch (error) {
      // Ghi nhận lỗi vào Sentry
      Sentry.captureException(error);
      
      // Rethrow lỗi để QStash nhận biết thất bại và thực hiện Retry
      throw error;
    }
  }
}

