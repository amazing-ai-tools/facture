CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_sub TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  refresh_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  legal_name TEXT NOT NULL,
  company_number TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL,
  gst_number TEXT NOT NULL,
  qst_number TEXT NOT NULL,
  default_hourly_rate_cents INTEGER NOT NULL DEFAULT 9400,
  payment_terms TEXT NOT NULL DEFAULT 'MOIS-SUIV',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT NOT NULL DEFAULT '',
  billing_address TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE clients ALTER COLUMN email DROP NOT NULL;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_name TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  invoice_number TEXT NOT NULL,
  document_reference TEXT NOT NULL,
  resource_name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'fr-QC' CHECK (language IN ('fr-QC', 'en', 'pt-BR')),
  payment_terms TEXT NOT NULL DEFAULT 'MOIS-SUIV',
  invoice_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid')),
  subtotal_cents INTEGER NOT NULL,
  gst_cents INTEGER NOT NULL,
  qst_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  email_message_id TEXT,
  sent_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, invoice_number)
);

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_terms TEXT NOT NULL DEFAULT 'MOIS-SUIV';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'fr-QC';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'gmail_message_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'email_message_id'
  ) THEN
    ALTER TABLE invoices RENAME COLUMN gmail_message_id TO email_message_id;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  service_date DATE NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL,
  unit_rate_cents INTEGER NOT NULL,
  line_total_cents INTEGER NOT NULL
);
