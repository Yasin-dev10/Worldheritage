import { existsSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

const workingDirectory = process.cwd();
const envFiles =
  basename(workingDirectory).toLowerCase() === 'backend'
    ? [resolve(workingDirectory, '../.env'), resolve(workingDirectory, '.env')]
    : [
        resolve(workingDirectory, '.env'),
        resolve(workingDirectory, 'backend/.env'),
      ];
const envFile = envFiles.find((path) => existsSync(path));
if (envFile) loadEnvFile(envFile);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');

  const port = Number(process.env.API_PORT ?? 4001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('API_PORT must be an integer between 1 and 65535.');
  }

  await app.listen(port);
}
await bootstrap();
