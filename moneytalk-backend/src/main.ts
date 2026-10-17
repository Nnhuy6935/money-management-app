// Phải import đầu tiên: nạp .env theo NODE_ENV trước khi các module đọc process.env
import { isSwaggerEnabled, loadedEnvFiles, validateEnv } from './config/env';
import { basename } from 'node:path';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  validateEnv();

  const app = await NestFactory.create(AppModule);

  configureApp(app);

  if (isSwaggerEnabled()) {
    setupSwagger(app);
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  Logger.log(
    `NODE_ENV=${process.env.NODE_ENV} | port=${port} | env files: ${
      loadedEnvFiles.map((f) => basename(f)).join(', ') || '(none)'
    }`,
    'Bootstrap',
  );
}

void bootstrap();
