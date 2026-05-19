---
name: oh-pdf
description: "Convert markdown to publication-quality PDF with cover page, TOC, watermarks, page numbers"
tier: 2
route:
  pass: surface
  fail: oh-builder
  blocker: surface
---

# oh-pdf

Turn any markdown file into a publication-quality PDF. 1in margins, intelligent page breaks, page numbers, cover pages, running headers, curly quotes, clickable TOC, diagonal DRAFT watermark.

## Steps

1. **Read** — Read the markdown file. Identify document type (memo/letter, essay/report, documentation) and structural elements (headings, code blocks, tables).
2. **Configure** — Set page size (letter/A4), margins, cover page, TOC, watermark, header/footer. Default: letter, 1in, page numbers, no cover.
3. **Render HTML** — Convert markdown to semantic HTML with print-optimized CSS. Embed fonts, set page breaks, style running headers.
4. **Generate PDF** — Use headless Chromium (via `@pagedjs/pagedjs`, `puppeteer`, or `playwright`) to render HTML to PDF. Verify output.
5. **Deliver** — Save to specified path or default `<input>-<timestamp>.pdf`. Report output path and page count.

## Routing

| Outcome | Route |
|---------|-------|
| pass | → surface |
| fail | → oh-builder |
| blocker | → surface |
