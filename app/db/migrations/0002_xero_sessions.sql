CREATE TABLE IF NOT EXISTS "xero_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "xero_tenant_id" text NOT NULL UNIQUE,
  "access_token_encrypted" text NOT NULL,
  "refresh_token_encrypted" text NOT NULL,
  "expires_at" bigint NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "xero_sessions_tenant_idx" ON "xero_sessions" ("xero_tenant_id");
