# WorldHeritage web

The Next.js App Router web application also serves the initial Phase 5 admin dashboard. Admin login and required identity-provider configuration are documented in [Phase 5 CMS status](../docs/PHASE5.md).

Next.js App Router, strict TypeScript, and Tailwind CSS public platform. It reads published content from the NestJS API on the server; browser code never connects to PostgreSQL.

## Routes

- `/`, `/explore`, `/countries`, `/countries/[slug]`
- `/events`, `/events/[slug]`
- `/figures`, `/figures/[slug]`
- `/timelines`, `/timelines/[slug]`
- `/civilizations`, `/civilizations/[slug]`
- `/history`, `/history/[slug]`, `/search`
- `/about`, `/editorial-policy`, `/contact`

Country, event, figure, timeline, civilization, and article collections use cursor pagination. Country search can filter by region. Event browsing supports text, category, and year range filters; civilization browsing supports a region filter. Global search supports collection and event year filters.

## Local development

From the repository root, configure `.env` as described in the root README, apply backend migrations, and start the API and web workspaces in separate terminals:

```powershell
npm.cmd run db:generate --workspace backend
npm.cmd run db:deploy --workspace backend
npm.cmd run dev:api
npm.cmd run dev:web
```

The web server reads `API_URL`, `API_BASE_URL`, or `NEXT_PUBLIC_API_URL` in that order and defaults to `http://localhost:4001/api/v1`. Set `SITE_URL` to the deployed canonical origin. Do not put secrets in `NEXT_PUBLIC_*` variables.

## Content and API status

The public API exposes published records for all listed collections. Records without a source citation are excluded from the historical collections. The repository does not seed historical content; collection pages therefore show an honest empty state until reviewed, sourced records are published. The contact page explains that no public contact channel is configured yet.

Use the root README's lint, typecheck, unit, e2e, format, and production build commands to verify changes.
