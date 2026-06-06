-- Formline database schema

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

CREATE TABLE IF NOT EXISTS form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitter_name TEXT,
  submitter_email TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS form_submissions_form_id_idx ON form_submissions (form_id);
