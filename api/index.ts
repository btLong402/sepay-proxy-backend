import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import express from 'express';

const server = express();

// Lưu trữ Raw Body phục vụ cho việc xác thực chữ ký (Signature Verification)
server.use(
  express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    },
  }),
);

let isAppInitialized = false;


async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  // Enable CORS or global pipes here if needed
  // app.enableCors();
  await app.init();
  isAppInitialized = true;
}

export default async (req: any, res: any) => {
  if (!isAppInitialized) {
    await bootstrap();
  }
  server(req, res);
};
