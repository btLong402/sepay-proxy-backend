import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { QstashGuard } from './qstash.guard';
import { WebhookService } from '../webhook/webhook.service';
import { OutboxService } from '../outbox/outbox.service';
import * as Sentry from '@sentry/node';

@Controller('v1/webhooks/qstash')
@UseGuards(QstashGuard)
export class QstashController {
  constructor(
    private readonly webhookService: WebhookService,
    private readonly outboxService: OutboxService,
  ) {}

  @Post('process')
  async processEvent(
    @Body() data: { tenantId: string; payload: any },
  ) {
    try {
      await this.webhookService.handleQStashEvent(data.tenantId, data.payload);
      return { success: true };
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    }
  }

  @Post('outbox')
  async processOutbox(
    @Body() data: { eventId: string },
  ) {
    try {
      await this.outboxService.processEvent(data.eventId);
      return { success: true };
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    }
  }
}
