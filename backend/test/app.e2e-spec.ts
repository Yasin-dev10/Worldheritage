import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { vi } from 'vitest';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma.service.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  const emptyDelegate = () => ({
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        country: emptyDelegate(),
        historicalEvent: emptyDelegate(),
        historicalPerson: emptyDelegate(),
        civilization: emptyDelegate(),
        historyArticle: emptyDelegate(),
        historicalTimeline: emptyDelegate(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  it('/api/v1/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('/api/v1/admin/dashboard denies requests without a bearer token', async () => {
    const priorIssuer = process.env.AUTH_ISSUER_URL;
    const priorClientId = process.env.AUTH_CLIENT_ID;
    process.env.AUTH_ISSUER_URL = 'https://issuer.example.test';
    process.env.AUTH_CLIENT_ID = 'worldheritage-admin-test';
    try {
      await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .expect(401);
    } finally {
      if (priorIssuer === undefined) delete process.env.AUTH_ISSUER_URL;
      else process.env.AUTH_ISSUER_URL = priorIssuer;
      if (priorClientId === undefined) delete process.env.AUTH_CLIENT_ID;
      else process.env.AUTH_CLIENT_ID = priorClientId;
    }
  });

  it.each([
    '/api/v1/countries?locale=en',
    '/api/v1/events?locale=en',
    '/api/v1/people?locale=so',
    '/api/v1/civilizations?region=East%20Africa',
    '/api/v1/articles?locale=en',
    '/api/v1/timelines?locale=so',
  ])(
    '%s returns a real empty collection when nothing is published',
    async (path) => {
      const response = await request(app.getHttpServer()).get(path).expect(200);
      expect(response.body.data).toEqual([]);
    },
  );

  it('/api/v1/search (GET) validates queries and returns an empty page', async () => {
    await request(app.getHttpServer()).get('/api/v1/search').expect(400);
    const response = await request(app.getHttpServer())
      .get('/api/v1/search?q=history&locale=en')
      .expect(200);
    expect(response.body).toEqual({ data: [], nextCursor: null, locale: 'en' });
  });

  it('/api/v1/events (GET) validates date filters', () => {
    return request(app.getHttpServer())
      .get('/api/v1/events?fromYear=2020&toYear=1900')
      .expect(400);
  });

  afterEach(async () => {
    await app.close();
  });
});
