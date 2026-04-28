import { Module, forwardRef } from '@nestjs/common';
import { QstashService } from './qstash.service';
import { QstashGuard } from './qstash.guard';
import { QstashController } from './qstash.controller';
import { WebhookModule } from '../webhook/webhook.module';
import { OutboxModule } from '../outbox/outbox.module';

@Module({
  imports: [forwardRef(() => WebhookModule), OutboxModule],
  controllers: [QstashController],
  providers: [QstashService, QstashGuard],
  exports: [QstashService],
})
export class QueueModule {}
