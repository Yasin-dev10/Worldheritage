import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import prismaClientModule from '../generated/prisma/index.js';

const { PrismaClient } = prismaClientModule;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL must be configured before starting the API.',
      );
    }

    super({ adapter: new PrismaPg(new Pool({ connectionString })) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
