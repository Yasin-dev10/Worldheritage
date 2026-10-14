# WorldHeritage Somali History — Starter Batch 2

This batch adds 21 research records and a 10-item source catalogue. It expands coverage from early coastal archaeology through the 1990s, including regional archaeology, political transitions, language policy, drought, and international operations.

## Files

- `worldheritage_somali_history_batch2.json` — canonical records, source manifest, import policy, and per-source claim notes.
- `worldheritage_somali_history_batch2.csv` — record export for editorial review.
- `worldheritage_somali_history_sources_batch2.csv` — source catalogue export.

The records are research drafts, not publication-ready history. Sources were opened to scope these summaries, but the import process does not certify that each source proves every sentence. Review source passages, exact dates, Somali wording, regional context, and disagreements before approval. Some sources represent a U.S. or UN institutional perspective. No images or media rights are included.

Import without changing the starter dataset:

```powershell
node backend/scripts/import-somali-history-batch.mjs --apply --input=docs/import-data/somali-history-batch2 --report=docs/import-reports/somali-history-batch2.json
```

Omit `--apply` for a dry run. Imported items remain `DRAFT`; existing records are skipped by slug/title and never overwritten.
