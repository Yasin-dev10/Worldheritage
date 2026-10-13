import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'prisma/config';

const backendDirectory = dirname(fileURLToPath(import.meta.url));
const envFiles = [
  resolve(backendDirectory, '../.env'),
  resolve(backendDirectory, '.env'),
];
const envFile = envFiles.find((path) => existsSync(path));
if (envFile) loadEnvFile(envFile);

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://user:password@localhost:5432/worldheritage?schema=public',
  },
});
