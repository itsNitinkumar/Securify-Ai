## DOCX Template (Word-Native) Reports

This backend supports generating `.docx` reports using a real Word template via `docxtemplater`.

### Where To Put The Template

1. Add your exported Word template file here:
`backend/src/templates/professional-report-template.docx`

2. (Optional) Add a local logo image (PNG preferred) here:
`backend/src/templates/securify-logo-light.png`

If the DOCX template file is not present, the backend falls back to HTML-to-DOCX conversion.

### Supported Data / Placeholders

The renderer passes both flat keys and nested objects.

Flat keys (easy drop-in):

- `{CLIENT_NAME}`
- `{PROJECT_NAME}`
- `{DATE}`

Findings loop (example):

```
{#findings}
{index}. {title} ({severity})
Affected: {affected_target}

Description:
{description}

Steps:
{steps_to_reproduce}

Recommendation:
{recommendation}

References:
{references}
{/findings}
```

Severity counts:

- `{severity_counts.critical}`
- `{severity_counts.high}`
- `{severity_counts.medium}`
- `{severity_counts.low}`
- `{severity_counts.informational}`

Logo (image module):

- Use image tag syntax (docxtemplater-image-module-free): `{%logo}`
- Backend supplies `logo` as a local file path if available.
