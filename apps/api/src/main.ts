import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // CloudFront forwards browser/Lambda requests under /api/*; the ALB health
  // check hits this container directly at /health (no CloudFront in front of
  // it), so that route stays excluded from the prefix.
  app.setGlobalPrefix('api', { exclude: [{ path: 'health', method: RequestMethod.ALL }] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();
  const port = process.env.PORT ?? 4000;
  await app.listen(port);
}
bootstrap();
