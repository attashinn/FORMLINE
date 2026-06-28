-- Formline database schema
-- Table order matters: clients must exist before form_submissions.converted_client_id FK.

CREATE TABLE IF NOT EXISTS forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  share_token TEXT NOT NULL UNIQUE DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS forms_owner_id_idx ON forms (owner_id);
CREATE INDEX IF NOT EXISTS forms_share_token_idx ON forms (share_token);

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  company_size TEXT NOT NULL DEFAULT '',
  brand_colors JSONB NOT NULL DEFAULT '[]'::jsonb,
  style_references TEXT NOT NULL DEFAULT '',
  goals TEXT NOT NULL DEFAULT '',
  budget TEXT NOT NULL DEFAULT '',
  deadline TEXT NOT NULL DEFAULT '',
  services JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'New',
  portal_token TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT clients_status_check CHECK (status IN ('New', 'In Progress', 'Completed'))
);

CREATE INDEX IF NOT EXISTS clients_owner_id_idx ON clients (owner_id);
CREATE INDEX IF NOT EXISTS clients_updated_at_idx ON clients (updated_at DESC);
CREATE INDEX IF NOT EXISTS clients_portal_token_idx ON clients (portal_token);

CREATE TABLE IF NOT EXISTS form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitter_name TEXT,
  submitter_email TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'New',
  converted_client_id UUID REFERENCES clients(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS form_submissions_form_id_idx ON form_submissions (form_id);
CREATE INDEX IF NOT EXISTS form_submissions_converted_client_id_idx ON form_submissions (converted_client_id);

CREATE TABLE IF NOT EXISTS client_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT '',
  data_url TEXT, -- legacy intake embeds, new uploads use url (storage.server.ts)
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS client_files_client_id_idx ON client_files (client_id);

CREATE TABLE IF NOT EXISTS client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS client_notes_client_id_idx ON client_notes (client_id);

CREATE TABLE IF NOT EXISTS client_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'update',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS client_activity_client_id_idx ON client_activity (client_id);

CREATE TABLE IF NOT EXISTS client_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date TIMESTAMPTZ,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS client_tasks_client_id_idx ON client_tasks (client_id);

CREATE TABLE IF NOT EXISTS automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled Automation',
  description TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT false,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  connections JSONB NOT NULL DEFAULT '[]'::jsonb,
  runs INTEGER NOT NULL DEFAULT 0,
  last_run TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS automations_owner_id_idx ON automations (owner_id);
CREATE INDEX IF NOT EXISTS automations_owner_enabled_idx ON automations (owner_id, enabled);

-- Cached Clerk owner profiles (email lookup for notifications / cron)
CREATE TABLE IF NOT EXISTS owners (
  owner_id UUID PRIMARY KEY,
  clerk_user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  first_name TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS owners_clerk_user_id_idx ON owners (clerk_user_id);
CREATE INDEX IF NOT EXISTS owners_email_idx ON owners (email);

-- Bcrypt password hashes (app-owned; Clerk handles sessions only)
CREATE TABLE IF NOT EXISTS owner_credentials (
  owner_id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  hash_algorithm TEXT NOT NULL DEFAULT 'bcrypt',
  hash_cost INTEGER NOT NULL DEFAULT 12,
  needs_rehash BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS owner_credentials_email_idx ON owner_credentials (email);
CREATE INDEX IF NOT EXISTS owner_credentials_needs_rehash_idx ON owner_credentials (needs_rehash);

CREATE TABLE IF NOT EXISTS owner_settings (
  owner_id UUID PRIMARY KEY,
  notification_email TEXT,
  notification_form_submit BOOLEAN NOT NULL DEFAULT true,
  notification_weekly_digest BOOLEAN NOT NULL DEFAULT false,
  notification_client_status_change BOOLEAN NOT NULL DEFAULT true,
  notification_form_published BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_owner_id_idx ON notifications (owner_id);
CREATE INDEX IF NOT EXISTS notifications_owner_read_idx ON notifications (owner_id, read);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Invoice',
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Unpaid',
  due_date TIMESTAMPTZ,
  notes TEXT NOT NULL DEFAULT '',
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  send_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT invoices_status_check CHECK (status IN ('Unpaid', 'Paid', 'Overdue'))
);

CREATE INDEX IF NOT EXISTS invoices_owner_id_idx ON invoices (owner_id);
CREATE INDEX IF NOT EXISTS invoices_client_id_idx ON invoices (client_id);

-- Backfill columns for databases created before line items / notes support
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS line_items JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS send_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- Alter table to support country and currency selection
ALTER TABLE owner_settings ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'US';
ALTER TABLE owner_settings ADD COLUMN IF NOT EXISTS currency_code TEXT DEFAULT 'USD';

