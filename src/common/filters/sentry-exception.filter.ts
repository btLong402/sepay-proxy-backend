import { Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';

@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // Send error to Sentry
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(exception);
    }

    // Log to console for local debugging
    console.error(exception);

    // Delegate to base filter (handles sending HTTP response)
    super.catch(exception, host);
  }
}
