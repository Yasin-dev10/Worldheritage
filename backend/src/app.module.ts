import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { CountriesController } from './countries.controller.js';
import { PrismaService } from './prisma.service.js';

@Module({
  imports: [],
  controllers: [AppController, CountriesController],
  providers: [PrismaService],
})
export class AppModule {}
