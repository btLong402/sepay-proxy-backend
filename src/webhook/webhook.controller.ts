import { Controller, Post, Param, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { WebhookService } from './webhook.service';

@Controller('v1/webhooks/sepay')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post(':tenant_id')
  async handleWebhook(
    @Param('tenant_id') tenantId: string,
    @Body() payload: any,
    @Headers('x-api-key') apiKey: string,
    @Headers('X-SePay-Signature') signature: string,
  ) {
    const secret = apiKey || signature;
    if (!secret) {
      throw new UnauthorizedException('Missing authentication secret');
    }

    return this.webhookService.processWebhook(tenantId, payload, secret);
  }
}

