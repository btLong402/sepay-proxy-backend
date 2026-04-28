import { Controller, Post, Param, Body, UsePipes, ValidationPipe, UseGuards } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { SepayPayloadDto } from './dto/sepay-payload.dto';
import { SepayAuthGuard } from '../common/guards/sepay-auth.guard';

@Controller('v1/webhooks/sepay')
@UseGuards(SepayAuthGuard)
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post(':tenant_id')
  @UsePipes(new ValidationPipe({ transform: true }))
  async handleWebhook(
    @Param('tenant_id') tenantId: string,
    @Body() payload: SepayPayloadDto,
  ) {
    return this.webhookService.processWebhook(tenantId, payload);
  }
}


