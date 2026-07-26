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

`universityAliases.ts` contains searchable Chinese names and common
abbreviations that are not present in the source PDF. Aliases improve search
only; they never create a separate bonus record. The calculator awards the
bonus only after the user selects one of the 390 official records by its stable
ID.

Alias overrides are keyed by the stable generated university ID and include a
preferred display name, controlled simplified/traditional/common aliases,
translation status and verification date. The current curated layer covers 75
records, prioritising mainland China, Hong Kong, Taiwan, Macao, Singapore,
major Japanese universities and internationally well-known institutions.
Records without a reliable Chinese name display the untouched PDF
`officialName`; do not machine-translate them.

When the Immigration Services Agency publishes a new list:

1. replace the root PDF;
2. update metadata and the extraction assertions if the official page count or
   record count changed;
3. regenerate the dataset;
4. check for duplicate IDs and names;
5. run the frontend build and school search regression checks.
