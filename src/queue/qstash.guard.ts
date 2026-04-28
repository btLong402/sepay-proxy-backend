import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Receiver } from '@upstash/qstash';

@Injectable()
export class QstashGuard implements CanActivate {
  private receiver: Receiver;

  constructor() {
    const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
    const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

    this.receiver = new Receiver({
      currentSigningKey: currentSigningKey || '',
      nextSigningKey: nextSigningKey || '',
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Bỏ qua kiểm tra ở môi trường Local nếu thiếu Key
    if (process.env.NODE_ENV !== 'production' && !process.env.QSTASH_CURRENT_SIGNING_KEY) {
      return true;
    }

    const signature = request.headers['upstash-signature'];
    if (!signature) {
      throw new UnauthorizedException('Missing Upstash-Signature header');
    }

    const body = request.rawBody;
    if (!body) {
      throw new UnauthorizedException('Missing raw request body for verification');
    }

    try {
      const isValid = await this.receiver.verify({
        signature,
        body: body.toString('utf8'),
      });

      if (!isValid) {
        throw new UnauthorizedException('Invalid Upstash signature');
      }
    } catch (error) {
      throw new UnauthorizedException(`Signature verification failed: ${error.message}`);
    }

    return true;
  }
}
