import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { decrypt } from '../../utils/crypto';

@Injectable()
export class SepayAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.params.tenant_id;
    const apiKey = request.headers['x-api-key'];
    const signature = request.headers['x-sepay-signature'];

    const secret = apiKey || signature;

    if (!tenantId) {
      throw new UnauthorizedException('Missing tenant ID');
    }

    if (!secret) {
      throw new UnauthorizedException('Missing authentication secret');
    }

    // 1. Fetch Tenant/User
    const user = await this.prisma.user.findUnique({
      where: { id: tenantId },
    });

    if (!user) {
      throw new UnauthorizedException('Tenant not found');
    }

    if (!user.encryptedWebhookSecret) {
      throw new UnauthorizedException('Webhook secret not configured for this tenant');
    }

    // 2. Verify Secret/API Key
    let decryptedSecret: string;
    try {
      decryptedSecret = decrypt(user.encryptedWebhookSecret);
    } catch (error) {
      throw new UnauthorizedException('Failed to decrypt tenant secret');
    }

    if (secret !== decryptedSecret) {
      throw new UnauthorizedException('Invalid authentication secret');
    }

    // Gắn thông tin user vào request để sử dụng ở các bước sau nếu cần
    request.user = user;

    return true;
  }
}
