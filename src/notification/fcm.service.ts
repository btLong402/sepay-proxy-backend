import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FcmService implements OnModuleInit {
  private isInitialized = false;

  onModuleInit() {
    const base64ServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (!base64ServiceAccount) {
      console.warn('FIREBASE_SERVICE_ACCOUNT_BASE64 is missing. FCM will not work.');
      return;
    }

    try {
      const serviceAccountJson = Buffer.from(base64ServiceAccount, 'base64').toString('utf-8');
      const serviceAccount = JSON.parse(serviceAccountJson);

      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      }
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Firebase Admin SDK:', error);
    }
  }

  async sendToToken(token: string, title: string, body: string, data?: any) {
    if (!this.isInitialized) {
      console.warn('FCM is not initialized. Skipping push notification.');
      return { success: false, error: 'FCM not initialized' };
    }

    try {
      const message: admin.messaging.Message = {
        token,
        notification: {
          title,
          body,
        },
        data: data || {},
      };

      const response = await admin.messaging().send(message);
      return { success: true, messageId: response };
    } catch (error) {
      console.error(`Failed to send FCM notification to token ${token}:`, error);
      return { success: false, error: error.message };
    }
  }

  async sendMoneyIn(token: string, amount: number, content: string) {
    const formattedAmount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    const title = '💰 Biến động số dư: TIỀN VÀO';
    const body = `Bạn vừa nhận được ${formattedAmount}. Nội dung: ${content}`;
    
    return this.sendToToken(token, title, body, {
      type: 'MONEY_IN',
      amount: amount.toString(),
      content: content || '',
    });
  }

  async sendMoneyOut(token: string, amount: number, content: string) {
    const formattedAmount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    const title = '💸 Biến động số dư: TIỀN RA';
    const body = `Tài khoản của bạn vừa bị trừ ${formattedAmount}. Nội dung: ${content}`;
    
    return this.sendToToken(token, title, body, {
      type: 'MONEY_OUT',
      amount: amount.toString(),
      content: content || '',
    });
  }
}
