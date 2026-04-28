import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WebhookModule } from './webhook/webhook.module';
import { PrismaModule } from './prisma/prisma.module';
import { LoggerModule } from './logger/logger.module';

@Module({
  imports: [WebhookModule, PrismaModule, LoggerModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
