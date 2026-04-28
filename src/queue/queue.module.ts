import { Module, forwardRef } from '@nestjs/common';
import { QstashService } from './qstash.service';
import { QstashGuard } from './qstash.guard';
import { QstashController } from './qstash.controller';
import { WebhookModule } from '../webhook/webhook.module';

@Module({
  imports: [forwardRef(() => WebhookModule)],
  controllers: [QstashController],
  providers: [QstashService, QstashGuard],
  exports: [QstashService],
})
export class QueueModule {}
