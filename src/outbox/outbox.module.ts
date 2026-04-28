import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { OutboxService } from './outbox.service';

@Module({
  imports: [PrismaModule, NotificationModule],
  providers: [OutboxService],
  exports: [OutboxService],
})
export class OutboxModule {}
