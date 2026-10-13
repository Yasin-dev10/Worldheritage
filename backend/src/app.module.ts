import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { CountriesController } from './countries.controller.js';
import { EventsController } from './events.controller.js';
import { PeopleController } from './people.controller.js';
import { CivilizationsController } from './civilizations.controller.js';
import { ArticlesController } from './articles.controller.js';
import { TimelinesController } from './timelines.controller.js';
import { SearchController } from './search.controller.js';
import { PrismaService } from './prisma.service.js';
import { AdminController } from './admin.controller.js';
import { OidcAuthGuard } from './oidc-auth.guard.js';
import { RolesGuard } from './roles.guard.js';

@Module({
  imports: [],
  controllers: [
    AppController,
    CountriesController,
    EventsController,
    PeopleController,
    CivilizationsController,
    ArticlesController,
    TimelinesController,
    SearchController,
    AdminController,
  ],
  providers: [PrismaService, OidcAuthGuard, RolesGuard],
})
export class AppModule {}
