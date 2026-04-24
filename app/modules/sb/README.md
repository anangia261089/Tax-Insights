# Small Business (SB) Journey Module

## Who this is for
Small business owners who want to understand their tax deductions in plain English.
No accounting knowledge assumed. Everything explained simply.

## User goals
- "Am I missing any deductions?"
- "What can I write off this year?"
- "What do I need to bring to my accountant?"

## Design principles
- No jargon. No IRS section codes visible to users.
- Every number explained in context ("you spent X on Y")
- Action-oriented — always ends with "what to do next"
- Mobile-friendly — owner checks this on their phone

## Pages
- `/dashboard` — main chat interface (current implementation)

## Key components
- `InsightCard` — KPI cards (total deductions, savings, flagged items)
- `AnalysisStream` — Claude's streamed plain-English explanation
- `SuggestedQuestions` — follow-up question chips

## Claude prompt style
Plain English. Analogies welcome. Cite IRS publications by name not number.
Always end with numbered action items.
