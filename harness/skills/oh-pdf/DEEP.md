# oh-pdf — Deep Reference

## When to Use

When asked to "make a PDF", "export to PDF", "turn this markdown into a PDF", or "generate a document". Works with any markdown file — docs, reports, essays, memos.

## Print Pipeline

The PDF is generated in two stages: markdown → HTML (with print CSS) → PDF (via headless browser).

### Stage 1: Markdown → HTML

Convert the markdown to semantic HTML. Use a library like `marked`, `remark`, or `markdown-it`.

Required HTML structure:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>/* print-optimized CSS */</style>
</head>
<body>
  <!-- Optional cover page -->
  <section class="cover">
    <h1>Title</h1>
    <p class="author">Author</p>
    <p class="date">Date</p>
  </section>
  
  <!-- Optional TOC (generated from headings) -->
  <section class="toc">
    <h2>Contents</h2>
    <nav><!-- populated by JS --></nav>
  </section>
  
  <!-- Content with page break handling -->
  <article class="content">
    {converted markdown}
  </article>
</body>
</html>
```

### Stage 2: HTML → PDF

Use a headless browser with print-to-PDF capability:

Primary options (in preference order):
1. `@pagedjs/pagedjs` + Puppeteer/Playwright — full Paged.js polyfill for CSS paged media
2. `puppeteer` `page.pdf()` — built-in Chrome print-to-PDF
3. `playwright` `page.pdf()` — same engine, different API

```bash
# Using puppeteer
npx puppeteer browsers install chrome  # first time
node -e "
  const puppeteer = require('puppeteer');
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({ path: 'output.pdf', format: 'Letter', margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' } });
    await browser.close();
  })();
"
```

### Print CSS Essentials

```css
@page {
  size: letter;
  margin: 1in;
  @top-right { content: counter(page) " of " counter(pages); }
}

/* Page break control */
h1 { page-break-before: always; break-before: page; }
h1:first-of-type { page-break-before: avoid; }
pre, table { page-break-inside: avoid; }
p { orphans: 3; widows: 3; }

/* Typography */
body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 11pt; line-height: 1.6; color: #111; }
h1 { font-size: 18pt; margin-top: 2em; }
h2 { font-size: 14pt; margin-top: 1.5em; }
h3 { font-size: 12pt; margin-top: 1.2em; }
code { font-family: 'Courier New', monospace; font-size: 9pt; }

/* Cover page */
.cover { page-break-after: always; text-align: center; padding-top: 30%; }
.cover h1 { font-size: 24pt; margin-bottom: 0.5em; }
.cover .author { font-size: 12pt; color: #555; }

/* TOC */
.toc { page-break-after: always; }
.toc a { color: inherit; text-decoration: none; }
.toc a::after { content: leader('.') target-counter(attr(href), page); }

/* Draft watermark */
.watermark {
  position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg);
  font-size: 72pt; color: rgba(255, 0, 0, 0.1); z-index: 9999;
  pointer-events: none;
}
```

## Configuration Options

| Option | Default | Values | Description |
|--------|---------|--------|-------------|
| page-size | letter | letter, a4, legal | Page dimensions |
| margins | 1in | CSS length | All margins or top/right/bottom/left |
| cover | false | true/false | Generate cover page from title/author/date |
| toc | false | true/false | Generate clickable table of contents |
| page-numbers | true | true/false | "N of M" footer |
| watermark | none | string | Diagonal watermark text ("DRAFT", "CONFIDENTIAL") |
| header-template | none | HTML string | Custom running header |
| footer-template | none | HTML string | Custom footer (mutex with page-numbers) |
| chapter-breaks | true | true/false | Start new page at each H1 |
| tagged | true | true/false | Accessible PDF metadata |

## Common Patterns

### 80% case — memo/letter
```
Generate PDF from markdown: letter, 1in margins, page numbers, no cover.
```

### Publication — essay/report
```
Generate PDF with cover page, table of contents, chapter breaks per H1,
author name, title page.
```

### Draft — watermark
```
Generate PDF with diagonal "DRAFT" watermark across every page.
```

### Documentation
```
Generate PDF from docs/ directory: letter, 1in margins, TOC, chapter breaks,
tagged/accessible PDF. Save to docs/output.pdf.
```

## Anti-patterns

- Using text-based PDF generation (text-to-PDF loses layout fidelity)
- Skipping font embedding (PDF renders differently on different machines)
- No page break control (orphans/widows, code blocks splitting across pages)
- Missing responsive consideration (code blocks need `overflow-wrap` or `white-space: pre-wrap`)
- Watermark that overlaps readable content (use low opacity, diagonal)
