# Tax Insights — Architecture Document

**Version:** 1.0 · **Last updated:** April 2026  
**Stack:** Next.js 16 · Claude API (Anthropic) · Xero API · Neon Postgres · Vercel/Netlify

---

## What This Product Does

Tax Insights is an AI-powered chat assistant that connects to a business's Xero accounting data, analyses tax deductions, and explains everything in plain English. It surfaces missed deductions, flags items needing documentation, and answers follow-up questions — all grounded in real financial data and IRS publications.

Two journeys:
- **Small Business (SB)** — `/dashboard` — plain English, no jargon, action-oriented
- **Accountant/Bookkeeper (AB)** — `/ab/dashboard` — data-dense, IRS references visible, risk flags

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                           │
│                                                                 │
│   ┌──────────────────────┐    ┌──────────────────────────┐     │
│   │   /dashboard  (SB)   │    │   /ab/dashboard  (AB)    │     │
│   │   Plain English UI   │    │   Professional Detail UI │     │
│   └──────────┬───────────┘    └────────────┬─────────────┘     │
└──────────────┼──────────────────────────────┼───────────────────┘
               │  HTTPS                        │  HTTPS
               ▼                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS APP  (Server)                        │
│                                                                 │
│  ┌─────────────────┐   ┌──────────────────┐  ┌─────────────┐  │
│  │  Auth Layer     │   │  API Routes       │  │  Skills     │  │
│  │  /api/auth/*    │   │  /api/tax/explain │  │  Loader     │  │
│  │  Xero OAuth 2.0 │   │  /api/tax/upload  │  │             │  │
│  │  iron-session   │   │  /api/chat/history│  │  5 x .md    │  │
│  └────────┬────────┘   └────────┬─────────┘  │  files →    │  │
│           │                     │             │  system     │  │
│           ▼                     ▼             │  prompt     │  │
│  ┌─────────────────┐   ┌──────────────────┐  └─────────────┘  │
│  │  Xero Cache     │   │  Chat Store      │                    │
│  │  5-min in-memory│   │  Per-tenant      │                    │
│  │  per tenant     │   │  AES-256 encrypt │                    │
│  └────────┬────────┘   └────────┬─────────┘                    │
└───────────┼──────────────────────┼──────────────────────────────┘
            │                      │
     ┌──────┘                      └──────┐
     ▼                                    ▼
┌──────────────┐                  ┌──────────────┐
│  XERO API    │                  │  NEON        │
│              │                  │  POSTGRES    │
│  - P&L       │                  │              │
│  - Balance   │                  │  tenants     │
│    Sheet     │                  │  conversations│
│  - Bank Txns │                  │  messages    │
│  - Contacts  │                  │  audit_log   │
│  - Org Info  │                  │              │
└──────────────┘                  └──────────────┘
                                         ▲
                    ┌────────────────────┘
                    │  Also reads/writes
                    ▼
┌──────────────────────────────────────────┐
│           ANTHROPIC (Claude API)          │
│                                          │
│  Model: claude-sonnet-4-6               │
│  - Reads: Xero analysis + chat history  │
│  - Reads: uploaded PDFs / CSVs          │
│  - Guided by: Skills system prompt      │
│  - Streams: response word by word       │
│  - Generates: follow-up questions       │
└──────────────────────────────────────────┘
```

---

## Request Flow — What Happens When a User Asks a Question

```
User types question
        │
        ▼
1. AUTH CHECK
   Is there a valid Xero session cookie?
   No → redirect to Xero login
   Yes → continue
        │
        ▼
2. XERO DATA PULL (cached)
   Check 5-minute in-memory cache for this tenant
   Hit  → use cached data (fast, ~50ms)
   Miss → fetch P&L + Balance Sheet + Transactions + Contacts from Xero (~2-3s)
   Run Tax Engine → categorise into IRS sections, flag risky items
        │
        ▼
3. CONVERSATION HISTORY
   Load last 10 messages from Neon Postgres for this tenant
   Decrypt with per-tenant AES-256 key
        │
        ▼
4. BUILD CLAUDE REQUEST
   System prompt = Skills (persona + IRS rules + formatting + section 179 + 1099)
   Messages = [prior conversation history] + [user's question] + [Xero data] + [any uploaded files]
        │
        ▼
5. STREAM FROM CLAUDE
   Claude reads everything and starts generating
   Response streams word-by-word via SSE (Server-Sent Events)
   Browser renders each word as it arrives
        │
        ▼
6. SAVE & COMPLETE
   Save user message + Claude response to Postgres (encrypted)
   Generate follow-up question suggestions
   Send "done" signal to browser
```

---

## Skills System — The AI's Knowledge Layer

Skills are markdown files in `app/skills/` that are injected into Claude's system prompt on every request. They give Claude its domain expertise and behavioral rules.

```
app/skills/
├── persona.md         → WHO Claude is + hard guardrails
├── irs-reference.md   → WHAT each deduction category means (plain English + publication names)
├── formatting.md      → HOW to structure responses (headers, bullets, bold)
├── section-179.md     → Section 179 equipment write-off rules
└── 1099-rules.md      → Contractor payment and 1099 rules
```

**How they work:**
1. On first request, all 5 files are loaded from disk and concatenated into one system prompt
2. The system prompt is cached in memory (never re-read from disk)
3. Claude's prompt cache (Anthropic feature) caches the system prompt on their servers — saves ~70% on cost for repeat requests
4. Skills are plain markdown — any team member can edit them without touching code

**Adding a new skill:** Create a new `.md` file in `app/skills/`, add its name to the `SKILL_ORDER` array in `app/lib/skills.ts`. Done.

---

## What Claude Provides Out of the Box vs What We Built

| Capability | Claude API built-in? | What we built |
|---|---|---|
| Text generation | ✅ Native | — |
| Streaming (word by word) | ✅ Native | Wired SSE from API → browser |
| Reading PDFs you send | ✅ Native | Upload UI + `/api/tax/upload` endpoint |
| Reading CSVs you send | ✅ Native (as text) | Same upload endpoint |
| Reading images / photos | ✅ Native | Not built yet |
| Multi-turn memory (within session) | ✅ Native (pass history array) | Chat store + history loading |
| Memory across sessions (returns user) | ❌ Not built-in | Neon Postgres + per-tenant encryption |
| Domain expertise (IRS knowledge) | ❌ Not built-in | Skills system (5 markdown files) |
| Accurate grounding in user's data | ❌ Not built-in | Xero API integration + tax engine |
| Xero connection | ❌ Not built-in | Full OAuth 2.0 flow |
| Data charts/graphs | ❌ Not built-in | Recharts library |
| Follow-up question suggestions | ❌ Not built-in | Claude generates them, we display them |
| Response caching (cost saving) | ✅ Prompt caching | Skills cached via `cache_control` |

---

## Data & Security Model

```
User's Xero Data
      │
      ├── NEVER stored in our database
      ├── Fetched fresh from Xero on every request
      └── Held in memory for max 5 minutes (cache), then discarded

User's Chat Messages
      │
      ├── Stored in Neon Postgres
      ├── Encrypted with AES-256-GCM before writing
      ├── Each tenant gets a unique encryption key
      ├── Key is derived from ENCRYPTION_MASTER_KEY + tenant_id via HKDF
      └── A database dump without the master key reveals nothing

Tenant Isolation
      └── Every database query filters by tenant_id
          No cross-tenant data access is possible
```

**Data retention:** If a tenant disconnects Xero, their data is scheduled for hard deletion after 7 days.

---

## Key Files Reference

```
app/
├── dashboard/page.tsx          → SB chat UI (main product)
├── ab/dashboard/page.tsx       → AB professional UI
│
├── api/
│   ├── auth/
│   │   ├── login/route.ts      → Redirects to Xero OAuth
│   │   ├── callback/route.ts   → Handles OAuth return, stores session
│   │   └── logout/route.ts     → Clears session
│   ├── tax/
│   │   ├── explain/route.ts    → Main endpoint: Xero → Tax Engine → Claude → Stream
│   │   └── upload/route.ts     → Handles PDF/CSV upload, returns base64
│   └── chat/
│       └── history/route.ts    → GET: load history  DELETE: clear history
│
├── components/
│   ├── AnalysisStream.tsx      → Renders Claude's streamed markdown
│   ├── InsightCard.tsx         → KPI cards (total deductions, savings etc)
│   ├── DeductionChart.tsx      → Bar chart of deductions by category
│   ├── SuggestedQuestions.tsx  → Follow-up question chips
│   └── Nav.tsx                 → Top navigation bar
│
├── lib/
│   ├── skills.ts               → Loads and caches skill files into system prompt
│   ├── tax-engine.ts           → Categorises Xero transactions into IRS sections
│   ├── xero-cache.ts           → 5-minute in-memory cache for Xero data
│   ├── xero-auth.ts            → Validates session + refreshes Xero token
│   ├── chat-store.ts           → Read/write encrypted messages to Postgres
│   ├── tenant.ts               → Resolves/creates tenant row from Xero ID
│   └── env.ts                  → Reads env vars with .env.local fallback
│
├── db/
│   ├── schema.ts               → Database table definitions (Drizzle ORM)
│   ├── client.ts               → Neon Postgres connection
│   ├── crypto.ts               → AES-256-GCM encryption per tenant
│   └── migrations/             → SQL migration files
│
└── skills/
    ├── persona.md              → JAX's voice, guardrails, hard rules
    ├── irs-reference.md        → Deduction categories + IRS publication names
    ├── formatting.md           → Response structure rules
    ├── section-179.md          → Equipment deduction rules
    └── 1099-rules.md           → Contractor payment rules
```

---

## Environment Variables

| Variable | Purpose | Required |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude API access | ✅ |
| `CLAUDE_MODEL` | Which model to use (default: `claude-sonnet-4-6`) | Optional |
| `XERO_CLIENT_ID` | Xero app credentials | ✅ |
| `XERO_CLIENT_SECRET` | Xero app credentials | ✅ |
| `XERO_REDIRECT_URI` | OAuth callback URL | ✅ |
| `XERO_SCOPES` | Xero data permissions | ✅ |
| `SESSION_SECRET` | Encrypts session cookies | ✅ |
| `DATABASE_URL` | Neon Postgres connection string | ✅ |
| `ENCRYPTION_MASTER_KEY` | Master key for chat encryption | ✅ |

---

## Current Status

| Feature | Status |
|---|---|
| Xero OAuth connection | ✅ Live |
| Tax deduction analysis | ✅ Live |
| Claude streaming explanation | ✅ Live |
| IRS skills / accurate citations | ✅ Live |
| File upload (PDF + CSV) | ✅ Live |
| Conversation memory (within session) | ✅ Live |
| Persistent memory (across sessions) | ✅ Live |
| Xero data caching (5 min) | ✅ Live |
| Small Business dashboard | ✅ Live |
| Accountant dashboard | ✅ Live |
| Photo / receipt scanning | 🔲 Planned |
| Multi-client switcher (AB) | 🔲 Planned |
| PDF export / client report | 🔲 Planned |
| Australian tax law (ATO) variant | 🔲 Planned |

---

## Planned: Agent Architecture

The next evolution is moving from a single Claude call to a **multi-agent pipeline**:

```
User question
      │
      ▼
┌─────────────────┐
│ ORCHESTRATOR    │  Decides what's needed
│ (Claude)        │  "This question needs Xero data + the uploaded receipt"
└────────┬────────┘
         │ calls
    ┌────┴─────────────────────┐
    ▼                          ▼
┌──────────┐            ┌──────────────┐
│ XERO     │            │ DOCUMENT     │
│ AGENT    │            │ READER AGENT │
│          │            │              │
│ Fetches  │            │ Reads PDFs,  │
│ specific │            │ CSVs, images │
│ data     │            │ receipts     │
└──────────┘            └──────────────┘
         │                      │
         └──────────┬───────────┘
                    ▼
            ┌──────────────┐
            │  ANSWER      │
            │  AGENT       │
            │  (Claude)    │
            │              │
            │  Synthesises │
            │  everything  │
            │  + streams   │
            └──────────────┘
```

This allows Claude to decide what it needs rather than always fetching everything upfront — faster, cheaper, and more accurate for specific questions.
