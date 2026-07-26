"""Build the versioned university dataset from the repository-root ISA PDF."""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "frontend/src/data/universities/officialUniversities.ts"
REVIEW_PATH = ROOT / "scripts/output/university-import-review.json"
EXPECTED_COUNT = 390

COUNTRY_CODES = {
    "Argentina": "AR", "Australia": "AU", "Austria": "AT", "Belgium": "BE",
    "Brazil": "BR", "Canada": "CA", "China": "CN", "Denmark": "DK",
    "Finland": "FI", "France": "FR", "Germany": "DE", "Hong Kong": "HK",
    "India": "IN", "Ireland": "IE", "Israel": "IL", "Italy": "IT",
    "Japan": "JP", "Macao": "MO", "Malaysia": "MY", "Mexico": "MX",
    "Netherlands": "NL", "New Zealand": "NZ", "Norway": "NO", "Portugal": "PT",
    "Qatar": "QA", "Republic of Korea": "KR", "Russian Federation": "RU",
    "Saudi Arabia": "SA", "Singapore": "SG", "South Africa": "ZA", "Spain": "ES",
    "State of Israel": "IL", "Sweden": "SE", "Switzerland": "CH", "Taiwan": "TW",
    "United Arab Emirates": "AE", "United Kingdom": "GB",
    "United States of America": "US",
}


def find_source() -> Path:
    matches = sorted(path for path in ROOT.glob("001335478*") if path.is_file())
    pdfs = [path for path in matches if path.suffix.lower() == ".pdf"]
    if len(pdfs) == 1:
        return pdfs[0]
    if len(matches) == 1:
        return matches[0]
    raise FileNotFoundError(f"Expected one readable 001335478* source, found: {matches}")


def clean_cell(value: str | None) -> str:
    return re.sub(r"\s*\n\s*", " ", value or "").strip()


def normalized_key(value: str) -> str:
    value = unicodedata.normalize("NFKC", value).casefold()
    return re.sub(r"[^\w]+", "", value)


def slugify(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", value).strip("-")


def ts(value: object) -> str:
    return json.dumps(value, ensure_ascii=False)


def parse_pdf(source: Path) -> tuple[list[dict[str, object]], dict[str, object]]:
    parsed: list[dict[str, object]] = []
    review: list[dict[str, object]] = []
    page_count = 0
    with pdfplumber.open(source) as pdf:
        page_count = len(pdf.pages)
        for page_number, page in enumerate(pdf.pages, 1):
            tables = page.extract_tables()
            if len(tables) != 1:
                review.append({"page": page_number, "reason": "unexpected-table-count", "value": len(tables)})
                continue
            for row_number, row in enumerate(tables[0][1:], 2):
                if not row or not any(row):
                    continue
                if len(row) != 3:
                    review.append({"page": page_number, "row": row_number, "reason": "unexpected-column-count", "raw": row})
                    continue
                english, japanese, country_cell = (clean_cell(cell) for cell in row)
                if not english or not japanese or not country_cell:
                    review.append({"page": page_number, "row": row_number, "reason": "empty-required-cell", "raw": row})
                    continue
                country_name = country_cell.split("/", 1)[0].strip()
                country_code = COUNTRY_CODES.get(country_name)
                if not country_code:
                    review.append({"page": page_number, "row": row_number, "reason": "unknown-country", "raw": row})
                    continue
                parsed.append({
                    "id": slugify(english),
                    "countryCode": country_code,
                    "officialName": english,
                    "japanese": japanese,
                    "sourcePage": page_number,
                })

    seen: set[tuple[str, str]] = set()
    deduped: list[dict[str, object]] = []
    duplicates: list[dict[str, object]] = []
    for record in parsed:
        key = (str(record["countryCode"]), normalized_key(str(record["officialName"])))
        if key in seen:
            duplicates.append(record)
        else:
            seen.add(key)
            deduped.append(record)

    stats = {
        "sourceFilename": source.name,
        "pageCount": page_count,
        "countryRegionCount": len({row["countryCode"] for row in parsed}),
        "recordsBeforeDeduplication": len(parsed),
        "recordsAfterDeduplication": len(deduped),
        "duplicateCount": len(duplicates),
        "unrecognizedRecordCount": len(review),
        "finalRecordCount": len(deduped),
        "effectiveDate": "2026-01",
        "verifiedAt": "2026-07-27",
    }
    payload = {"metadata": stats, "reviewRecords": review, "duplicates": duplicates}
    REVIEW_PATH.parent.mkdir(parents=True, exist_ok=True)
    REVIEW_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if review or duplicates or len(deduped) != EXPECTED_COUNT:
        raise ValueError(f"Import requires review: {stats}; see {REVIEW_PATH}")
    return deduped, stats


def render(records: list[dict[str, object]], source: Path) -> str:
    lines = [
        f"/* Generated from {source.name}; do not edit manually. */",
        "import type { BonusUniversity } from '@/types/university'",
        "",
        "export const officialUniversities: BonusUniversity[] = [",
    ]
    for record in records:
        lines.extend([
            "  {",
            f"    id: {ts(record['id'])},",
            f"    countryCode: {ts(record['countryCode'])},",
            f"    officialName: {ts(record['officialName'])},",
            f"    names: {{ en: [{ts(record['officialName'])}], zh: [], ja: [{ts(record['japanese'])}], aliases: [] }},",
            "    sourceTypes: ['world-ranking'],",
            f"    sourceDocument: {ts(source.name)},",
            f"    sourcePage: {record['sourcePage']},",
            "    effectiveDate: '2026-01',",
            "    verifiedAt: '2026-07-27',",
            "    manualReviewRequired: false,",
            "  },",
        ])
    return "\n".join([*lines, "]", ""])


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Fail if the committed data differs")
    args = parser.parse_args()
    source = find_source()
    records, stats = parse_pdf(source)
    content = render(records, source)
    if args.check:
        if not OUTPUT_PATH.exists() or OUTPUT_PATH.read_text(encoding="utf-8") != content:
            raise ValueError("Generated dataset is not up to date")
    else:
        OUTPUT_PATH.write_text(content, encoding="utf-8")
    print(json.dumps(stats, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
