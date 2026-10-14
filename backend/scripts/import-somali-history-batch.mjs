#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const defaultInputDirectory = resolve(process.env.USERPROFILE ?? 'C:/Users/Yasin-dev', 'Downloads/worldheritage_somali_history_batch1 (1)');
const defaultReport = resolve(root, 'docs/import-reports/somali-history-batch1.json');
const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const inputFlag = process.argv.find((arg) => arg.startsWith('--input='));
const reportFlag = process.argv.find((arg) => arg.startsWith('--report='));
const inputDirectory = inputFlag ? resolve(inputFlag.slice('--input='.length)) : defaultInputDirectory;
const reportPath = reportFlag ? resolve(reportFlag.slice('--report='.length)) : defaultReport;

for (const envPath of [resolve(root, '.env'), resolve(root, 'backend/.env')]) {
  if (process.env.DATABASE_URL) break;
  if (!existsSync(envPath)) continue;
  const line = readFileSync(envPath, 'utf8').split(/\r?\n/).find((entry) => /^DATABASE_URL=/.test(entry));
  if (line) process.env.DATABASE_URL = line.slice('DATABASE_URL='.length).trim().replace(/^("|')(.*)\1$/, '$2');
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const databaseUrl = new URL(process.env.DATABASE_URL);
const [{ PrismaPg }, { Pool }, prismaClientModule] = await Promise.all([
  import('@prisma/adapter-pg'), import('pg'), import('@prisma/client'),
]);
const { PrismaClient } = prismaClientModule.default;

const parseCsv = (text) => {
  const rows = [];
  let row = [], value = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted && char === '"' && text[i + 1] === '"') { value += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(value); value = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(value); value = '';
      if (row.some((cell) => cell.length)) rows.push(row);
      row = [];
    } else value += char;
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted field.');
  if (value.length || row.length) { row.push(value); rows.push(row); }
  const [header, ...data] = rows;
  if (!header) return [];
  return data.map((cells) => Object.fromEntries(header.map((name, index) => [name.replace(/^\uFEFF/, ''), cells[index] ?? ''])));
};
const normalizeSlug = (slug) => slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();
const parseYear = (text) => {
  const match = typeof text === 'string' && text.match(/-?\d{1,4}/);
  return match ? Number(match[0]) : null;
};
const dateFields = (record) => {
  const precision = ({ exact_day: 'EXACT_DAY', month: 'MONTH', year: 'YEAR', year_range: 'RANGE', approximate_range: 'RANGE', approximate_start: 'CIRCA' })[record.date_precision] ?? 'UNKNOWN';
  const dateDisplay = record.start_date && record.end_date && record.start_date !== record.end_date
    ? `${record.start_date} – ${record.end_date}` : record.start_date ?? null;
  return { dateDisplay, startYear: parseYear(record.start_date), endYear: parseYear(record.end_date), datePrecision: precision };
};
const sourceKind = (source) => {
  const type = `${source.type} ${source.author}`.toLowerCase();
  if (/primary|official|constitutional|diplomatic|security council resolution/.test(type)) return 'PRIMARY';
  if (/scholarly|academic|journal article/.test(type)) return 'SCHOLARLY_SECONDARY';
  if (/institutional|historical report|government historical/.test(type)) return 'REFERENCE';
  if (/archival/.test(type)) return 'ARCHIVAL_RECORD';
  if (/reference|repository/.test(type)) return 'REFERENCE';
  return 'OTHER';
};

const jsonFile = readdirSync(inputDirectory).find((file) => /^worldheritage_somali_history_batch\d+\.json$/i.test(file));
if (!jsonFile) throw new Error('Input directory must contain worldheritage_somali_history_batchN.json.');
const batchNumber = jsonFile.match(/batch(\d+)/i)?.[1];
const recordCsvFile = `worldheritage_somali_history_batch${batchNumber}.csv`;
const sourceCsvCandidates = [`worldheritage_somali_history_sources_batch${batchNumber}.csv`, 'worldheritage_somali_history_sources.csv'];
const sourceCsvFile = sourceCsvCandidates.find((file) => existsSync(resolve(inputDirectory, file)));
if (!existsSync(resolve(inputDirectory, recordCsvFile)) || !sourceCsvFile) throw new Error('Record or source CSV export is missing.');
const json = JSON.parse(readFileSync(resolve(inputDirectory, jsonFile), 'utf8'));
const csvRecords = parseCsv(readFileSync(resolve(inputDirectory, recordCsvFile), 'utf8'));
const csvSources = parseCsv(readFileSync(resolve(inputDirectory, sourceCsvFile), 'utf8'));
const sourceManifest = Array.isArray(json.sources) ? json.sources : [];
const sourceMap = new Map(sourceManifest.map((source) => [source.id, source]));
const csvById = new Map(csvRecords.map((record) => [record.id, record]));
const report = {
  dataset: json.dataset_name,
  version: json.version,
  mode: apply ? 'apply' : 'dry-run',
  status: 'completed',
  createdAt: new Date().toISOString(),
  policy: 'Imported content remains DRAFT; no publish operation is performed.',
  historicalVerification: 'Not completed. Source URLs are research leads; no claim has been checked against its cited source.',
  schemaMapping: {
    historical_topic: 'HistoryArticle + ArticleTranslation (so) + ArticleSource',
    historical_event: 'HistoricalEvent + EventTranslation (so) + EventSource',
    historical_figure: 'HistoricalPerson + PersonTranslation (so) + PersonSource',
    editorial_guideline: 'Skipped; editorial guidance is not a historical content record.',
    preservedInRevisionSnapshot: ['dataset record ID/type', 'English title', 'period', 'region', 'original date strings and precision', 'editorial notes', 'source catalogue entries'],
    notFirstClassFields: ['article date/period/region', 'person region', 'claim-level verification checklist and reviewer identity'],
  },
  databaseTarget: `${databaseUrl.hostname}:${databaseUrl.port}${databaseUrl.pathname}`,
  counts: { inputRecords: json.records.length, importable: 0, imported: 0, skipped: 0, errors: 0, sourcesCreated: 0, sourcesReused: 0 },
  records: [],
  sources: [],
  datasetChecks: [],
};
const inputErrors = [];
if (json.records.length !== csvRecords.length) inputErrors.push(`JSON has ${json.records.length} records; CSV has ${csvRecords.length}.`);
for (const record of json.records) {
  const csv = csvById.get(record.id);
  if (!csv) { inputErrors.push(`${record.id}: missing from CSV export.`); continue; }
  if (csv.slug !== record.slug || csv.type !== record.type || csv.title_so !== record.title_so) inputErrors.push(`${record.id}: key fields differ between JSON and CSV.`);
  const csvSources = (csv.source_ids ?? '').split(';').filter(Boolean).sort();
  if (JSON.stringify(csvSources) !== JSON.stringify([...(record.source_ids ?? [])].sort())) inputErrors.push(`${record.id}: source IDs differ between JSON and CSV.`);
}
const csvSourceMap = new Map(csvSources.map((source) => [source.id, source]));
if (csvSources.length !== sourceManifest.length) inputErrors.push('JSON and CSV source catalogue counts differ.');
for (const source of sourceManifest) {
  const csv = csvSourceMap.get(source.id);
  if (!csv || csv.title !== source.title || csv.url !== source.url) inputErrors.push(`${source.id}: source catalogue differs between JSON and CSV.`);
}
report.datasetChecks.push(...inputErrors.map((message) => ({ status: 'error', message })));

let prisma;
try {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  await prisma.$connect();
  const databaseInfo = await prisma.$queryRaw`SELECT current_database()::text AS database, current_schema()::text AS schema, to_regclass('public.sources')::text AS sources_table`;
  report.database = databaseInfo[0];

  if (inputErrors.length && apply) throw new Error('JSON/CSV cross-check failed; refusing to modify the database.');

  const prepared = json.records.map((record) => {
    const issues = [];
    if (!record.id || !record.slug || !record.title_so || !record.summary_so || !record.body_so) issues.push('Missing required identity or Somali content.');
    const slug = normalizeSlug(record.slug ?? '');
    if (!slug || slug.length > 200) issues.push('Slug cannot be mapped to the existing ASCII slug convention.');
    const sourceRefs = (record.source_ids ?? []).map((id) => sourceMap.get(id));
    if (!sourceRefs.length || sourceRefs.some((source) => !source)) issues.push('One or more source IDs are missing from the source catalogue.');
    if (record.type === 'editorial_guideline') return { record, action: 'skipped', reason: 'Editorial guidance, not a historical content entity.' };
    if (!['historical_topic', 'historical_event', 'historical_figure'].includes(record.type)) issues.push(`No existing content model mapping for type ${record.type}.`);
    if (record.title_so.length > 500 || record.summary_so.length > 2000 || record.body_so.length > 100000) issues.push('Content exceeds existing model limits.');
    return { record, slug, sourceRefs, issues, action: issues.length ? 'needs_schema_mapping' : 'ready' };
  });
  report.counts.importable = prepared.filter((item) => item.action === 'ready').length;

  const existingSources = await prisma.source.findMany({ select: { id: true, title: true, url: true, stableIdentifier: true } });
  const sourceMatches = new Map();
  for (const source of sourceManifest) {
    const existing = existingSources.find((item) => item.url === source.url || item.stableIdentifier === source.url);
    if (existing) sourceMatches.set(source.id, existing.id);
    report.sources.push({ id: source.id, title: source.title, status: existing ? 'reused' : apply ? 'pending' : 'would_create' });
  }
  for (const item of prepared) {
    const { record } = item;
    if (item.action === 'skipped') { report.records.push({ datasetId: record.id, type: record.type, slug: record.slug, status: 'skipped', reason: item.reason }); report.counts.skipped++; continue; }
    if (item.action !== 'ready') { report.records.push({ datasetId: record.id, type: record.type, slug: record.slug, status: item.action, issues: item.issues }); report.counts.errors++; continue; }
    const slug = item.slug;
    let existing = record.type === 'historical_topic'
      ? await prisma.historyArticle.findFirst({ where: { OR: [{ slug }, { translations: { some: { locale: 'so', title: record.title_so } } }] }, select: { id: true, slug: true } })
      : record.type === 'historical_event'
        ? await prisma.historicalEvent.findFirst({ where: { OR: [{ slug }, { translations: { some: { locale: 'so', title: record.title_so } } }] }, select: { id: true, slug: true } })
        : await prisma.historicalPerson.findFirst({ where: { OR: [{ slug }, { translations: { some: { locale: 'so', title: record.title_so } } }] }, select: { id: true, slug: true } });
    if (existing) {
      report.records.push({ datasetId: record.id, type: record.type, slug, status: 'skipped_duplicate', existingId: existing.id, existingSlug: existing.slug });
      report.counts.skipped++;
      continue;
    }
    const sourceIssues = item.sourceRefs.filter((source) => !sourceMatches.has(source.id) && existingSources.some((existingSource) => existingSource.url === source.url || existingSource.stableIdentifier === source.url));
    for (const source of sourceIssues) {
      const match = existingSources.find((candidate) => candidate.url === source.url || candidate.stableIdentifier === source.url);
      if (match) sourceMatches.set(source.id, match.id);
    }
    if (!apply) {
      report.records.push({ datasetId: record.id, type: record.type, slug, status: 'would_import', state: 'DRAFT', sources: item.sourceRefs.length });
      continue;
    }
    const created = await prisma.$transaction(async (tx) => {
      for (const source of item.sourceRefs) {
        if (sourceMatches.has(source.id)) continue;
        const found = await tx.source.findFirst({ where: { OR: [{ url: source.url ?? undefined }, { stableIdentifier: source.url ?? undefined }] }, select: { id: true } });
        if (found) sourceMatches.set(source.id, found.id);
        else {
          const createdSource = await tx.source.create({ data: {
            sourceKind: sourceKind(source), title: source.title, creator: source.author ?? null,
            publisherOrCollection: source.publisherOrCollection ?? null,
            publicationDateText: source.year ?? null, stableIdentifier: source.url ?? null,
            url: source.url ?? null, rightsStatus: 'UNKNOWN',
          } });
          sourceMatches.set(source.id, createdSource.id);
          const reportSource = report.sources.find((entry) => entry.id === source.id);
          if (reportSource) reportSource.status = 'created';
          report.counts.sourcesCreated++;
        }
      }
      const links = item.sourceRefs.map((source) => ({ sourceId: sourceMatches.get(source.id), claimNote: `${record.source_claim_notes?.[source.id] ?? `Source reference for ${record.id}; check its support against the full source.`} Historical verification has not been completed.`, claimStanding: 'UNCERTAIN', locator: null }));
      let content;
      if (record.type === 'historical_topic') {
        content = await tx.historyArticle.create({ data: {
          slug, authorName: 'WorldHeritage Somali History Batch 1', state: 'DRAFT',
          translations: { create: { locale: 'so', title: record.title_so, summary: record.summary_so, body: record.body_so } },
          sources: { create: links },
        } });
      } else if (record.type === 'historical_event') {
        const date = dateFields(record);
        content = await tx.historicalEvent.create({ data: {
          slug, category: 'Somali history', calendar: null, ...date,
          dateCertainty: record.date_precision.startsWith('approximate') ? 'POSSIBLE' : record.date_precision === 'unknown' ? 'UNKNOWN' : 'UNKNOWN',
          state: 'DRAFT', translations: { create: { locale: 'so', title: record.title_so, summary: record.summary_so, body: record.body_so } },
          sources: { create: links },
        } });
      } else {
        content = await tx.historicalPerson.create({ data: {
          slug, state: 'DRAFT', translations: { create: { locale: 'so', title: record.title_so, summary: record.summary_so, body: record.body_so } },
          sources: { create: links },
        } });
      }
      const snapshot = { ...record, sourceCatalog: item.sourceRefs, importDataset: json.dataset_name, importVersion: json.version, sourceSupportVerified: false };
      await tx.contentRevision.create({ data: { contentType: record.type, contentId: content.id, revisionNumber: 1, state: 'DRAFT', editorSubject: 'worldheritage:somali-history-batch-1', snapshot } });
      await tx.auditEvent.create({ data: { actorSubject: 'worldheritage:somali-history-batch-1', action: 'SOMALI_HISTORY_BATCH_IMPORTED', targetType: record.type, targetId: content.id, metadata: { dataset: json.dataset_name, version: json.version, datasetRecordId: record.id, state: 'DRAFT', sourceSupportVerified: false, originalSlug: record.slug, region: record.region, period: record.period, notes: record.notes } } });
      return content;
    });
    report.records.push({ datasetId: record.id, type: record.type, slug, status: 'imported', state: 'DRAFT', id: created.id, sources: item.sourceRefs.length });
    report.counts.imported++;
  }
  report.counts.sourcesReused = sourceMatches.size - report.counts.sourcesCreated;
  report.counts.errors += inputErrors.length;
  if (inputErrors.length) report.status = 'completed_with_input_errors';
} catch (error) {
  report.status = 'failed';
  report.error = error instanceof Error ? error.message : String(error);
} finally {
  if (prisma) await prisma.$disconnect();
}

const pendingSources = new Set(report.sources.filter((source) => source.status === 'pending').map((source) => source.id));
if (!apply) for (const source of report.sources) if (pendingSources.has(source.id)) source.status = 'would_create';
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ reportPath, ...report.counts, status: report.status, mode: report.mode }, null, 2));
if (report.status === 'failed' || report.status === 'completed_with_input_errors' || report.counts.errors) process.exitCode = 1;
