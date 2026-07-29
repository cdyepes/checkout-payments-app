import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { patchNestJsSwagger, ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';
import { Env } from './shared/config/env.schema';

export async function createApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService<Env, true>);

  // Cloud Run sits behind Google's load balancer, which sets X-Forwarded-For;
  // trust exactly one hop so req.ip (used by the rate limiter) reflects the
  // real client instead of the LB, without trusting an arbitrarily-deep chain.
  app.set('trust proxy', 1);

  app.use(helmet());
  // No cookies/session auth anywhere in this API — the checkout flow is
  // stateless (card token in, transaction id out) — so credentials stay off
  // rather than opening a cross-origin credentialed-request surface nothing needs.
  app.enableCors({ origin: config.get('CORS_ORIGIN', { infer: true }) });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ZodValidationPipe());

  patchNestJsSwagger();
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Checkout Payments API')
    .setDescription('Product, transaction, customer and delivery API for the checkout flow.')
    .setVersion('0.1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  return app;
}
