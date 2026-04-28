import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WebhookModule } from './webhook/webhook.module';
import { PrismaModule } from './prisma/prisma.module';
import { LoggerModule } from './logger/logger.module';
import { QueueModule } from './queue/queue.module';
import { NotificationModule } from './notification/notification.module';
import { AuthModule } from './auth/auth.module';
import { DeviceModule } from './device/device.module';
import { TransactionModule } from './transaction/transaction.module';
import { ConfigModule } from '@nestjs/config';



import { SentryModule } from '@sentry/nestjs/setup';
import { APP_FILTER } from '@nestjs/core';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';
import * as Joi from 'joi';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test', 'staging').default('development'),
        DATABASE_URL: Joi.string().required(),
        DIRECT_URL: Joi.string().required(),
        ENCRYPTION_KEY: Joi.string().length(64).required(),
        QSTASH_TOKEN: Joi.string().required(),
        QSTASH_CURRENT_SIGNING_KEY: Joi.string().required(),
        QSTASH_NEXT_SIGNING_KEY: Joi.string().required(),
        FIREBASE_SERVICE_ACCOUNT_BASE64: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        SENTRY_DSN: Joi.string().optional(),
        AXIOM_TOKEN: Joi.string().optional(),

        AXIOM_DATASET: Joi.string().optional(),
      }),
    }),
    WebhookModule,
    PrismaModule,
    LoggerModule,
    QueueModule,
    NotificationModule,
    AuthModule,
    DeviceModule,
    TransactionModule,
  ],
  controllers: [AppController],



  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
  ],
})
export class AppModule {}




