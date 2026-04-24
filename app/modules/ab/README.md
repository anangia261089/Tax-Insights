# Accountant/Bookkeeper (AB) Journey Module

## Who this is for
Accountants and bookkeepers managing multiple small business clients.
They know tax law — they need efficiency, accuracy, and client-ready outputs.

## User goals
- "Give me a full tax position summary I can review with my client"
- "Flag everything that needs documentation before filing"
- "Show me year-over-year comparison"
- "Export a report I can send to my client"

## Design principles
- Data-dense — show more, explain less
- IRS publication references visible and clickable
- Client switcher — manage multiple Xero orgs
- Export to PDF / copy to clipboard
- Professional tone, not simplified

## Pages (planned)
- `/ab/dashboard` — multi-client overview
- `/ab/client/[id]` — single client deep-dive
- `/ab/report/[id]` — printable client report

## Key components (planned)
- `ClientSwitcher` — switch between connected Xero orgs
- `TaxPositionTable` — detailed line-by-line breakdown
- `FlaggedItemsList` — everything needing documentation
- `ExportButton` — PDF/CSV export
- `YearComparison` — current vs prior year

## Claude prompt style
Professional. Full IRS citations. Flag risk levels (low/medium/high).
Include relevant deadlines. Suggest specific documentation requirements.
