# WorldHeritage Somali History and Culture — Starter Batch 3

This batch adds 12 Somali-language research drafts on kinship and clan categories, minority and coastal communities, oral poetry, women's cultural transmission, xeer Ciise, craft and textile heritage, music and dance, and language diversity. It broadens coverage beyond the political chronology and archaeology in earlier batches.

Clan and community identities are treated as historically situated and internally diverse. This batch does not present a definitive clan tree, assign traits to groups, or infer an individual's identity. The EUAA material is a protection and country-of-origin information source, not a cultural encyclopedia; use it with community-led and scholarly sources during review.

## Files

- `worldheritage_somali_history_batch3.json` — canonical records, source manifest, and per-record source notes.
- `worldheritage_somali_history_batch3.csv` — record export for editorial review.
- `worldheritage_somali_history_sources_batch3.csv` — source catalogue export.

Every item is a research draft. Sources were reviewed to scope the subjects, but no item is certified as historically verified and the importer does not claim that a source proves every sentence. Review exact passages, Somali wording, regional representation, and community perspectives before approval. No image or media rights are included.

Dry-run (default):

```powershell
node backend/scripts/import-somali-history-batch.mjs --input=docs/import-data/somali-history-batch3 --report=docs/import-reports/somali-history-batch3.json
```

Apply only after reviewing the dry-run report:

```powershell
node backend/scripts/import-somali-history-batch.mjs --apply --input=docs/import-data/somali-history-batch3 --report=docs/import-reports/somali-history-batch3.json
```

The importer creates only draft content and source links, detects existing slug/title and URL duplicates, and does not overwrite records or publish content.
