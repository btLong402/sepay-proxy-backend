import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client } from '@upstash/qstash';

@Injectable()
export class QstashService implements OnModuleInit {
  private client: Client;

  onModuleInit() {
    const token = process.env.QSTASH_TOKEN;
    if (!token) {
      // Ở môi trường local/test có thể bỏ qua nếu không dùng
      console.warn('QSTASH_TOKEN is missing. QStash integration will not work.');
      return;
    }
    this.client = new Client({ token });
  }

  async publishWebhookEvent(tenantId: string, payload: any) {
    if (!this.client) {
      throw new Error('QStash client is not initialized. Check QSTASH_TOKEN.');
    }

    const vercelUrl = process.env.VERCEL_URL || 'localhost:3000';
    const protocol = vercelUrl.startsWith('localhost') ? 'http' : 'https';
    const callbackUrl = `${protocol}://${vercelUrl}/v1/webhooks/qstash/process`;

    return this.client.publishJSON({
      url: callbackUrl,
      body: {
        tenantId,
        payload,
      },
    });
  }
}
