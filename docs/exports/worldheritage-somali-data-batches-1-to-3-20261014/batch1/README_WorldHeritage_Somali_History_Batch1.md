# WorldHeritage — Somali History Starter Batch 1

## Files
- `worldheritage_somali_history_batch1.json`: records plus source manifest.
- `worldheritage_somali_history_batch1.csv`: records for spreadsheet review.
- `worldheritage_somali_history_sources.csv`: source catalogue.

## Editorial warning
This is a starter dataset of 30 records, not a complete or publication-ready history of Somalia. Records marked `research_draft`, `needs_editorial_review`, or `editorial_guideline` must not be published automatically. Some records are topic outlines rather than fully researched articles.

## Before importing
1. Inspect the actual WorldHeritage schema and map these fields to existing entities.
2. Run dry-run validation and duplicate detection.
3. Verify each claim against the cited source and add page/chapter-level references.
4. Review Somali wording, date precision, regional balance, and differing interpretations.
5. Verify image rights separately before attaching any media.
6. Import into staging first. Preserve existing records.

## Date handling
Dates are strings and may be year-only, month-level, exact day, approximate, or absent. Use `date_precision`; never invent exact dates for unknown events.

## Source policy
URLs are research starting points, not a guarantee that every sentence is fully supported. Government and institutional records may reflect a particular perspective. For contested topics, compare independent sources and document disagreements.
