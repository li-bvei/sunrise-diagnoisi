# Official university dataset

This directory is the versioned frontend index for the highly skilled
professional university bonus.

- Primary source: repository-root `001335478.pdf`
- Title: `A list of universities for adding points / 加点対象となる大学一覧`
- Version date: January 2026 / 令和8年1月
- Parsed pages: 19
- Universities: 390 unique records
- Countries or regions: 37

`officialUniversities.ts` is generated mechanically from every table row in
the local PDF. Do not edit it manually. Regenerate it from the repository root:

```powershell
python scripts/extract_official_universities.py
```

`universityAliases.ts` contains 75 curated Chinese names and common
abbreviations. `machineTranslatedNames.ts` contains Chinese machine
translations for the remaining 315 records. Both layers improve display and
search only; they never create a separate bonus record. The calculator awards
the bonus only after the user selects one of the 390 official records by its
stable ID.

Alias overrides are keyed by the stable generated university ID and include a
preferred display name, controlled simplified/traditional/common aliases,
translation status and verification date. The current curated layer covers 75
records, prioritising mainland China, Hong Kong, Taiwan, Macao, Singapore,
major Japanese universities and internationally well-known institutions.
Every record therefore has a Chinese display name. The untouched PDF
`officialName` remains the formal matching and audit value.

To promote a machine-translated name after manual review, add the stable ID and
confirmed name to `universityAliases.ts` with `verified` or `common-name`
status, then remove the same ID from `machineTranslatedNames.ts`. Never merge
records by translated name and never let a PDF regeneration overwrite either
name layer.

When the Immigration Services Agency publishes a new list:

1. replace the root PDF;
2. update metadata and the extraction assertions if the official page count or
   record count changed;
3. regenerate the dataset;
4. check for duplicate IDs and names;
5. run the frontend build and school search regression checks.
