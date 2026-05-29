# Facture MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first usable Facture app: Google sign-in, company profile, clients, invoice CRUD, Quebec-style PDF generation, and Gmail sending.

**Architecture:** Keep the Vite React frontend static in cloud hosting and run all sensitive logic on a VPS backend at `https://facture.api.amazing-ai.tools`. The backend owns Google OAuth token exchange, PostgreSQL persistence, invoice total calculation, PDF generation, and Gmail sends.

**Tech Stack:** Vite 5, React 18, TypeScript, Express, PostgreSQL, `pg`, Google OAuth 2.0, Gmail API, `pdf-lib`, Vitest, React Testing Library, Supertest.

---

## File Structure

- `server/package.json`: backend scripts and dependencies.
- `server/tsconfig.json`: backend TypeScript compiler settings.
- `server/vitest.config.ts`: backend test configuration.
- `server/src/app.ts`: Express app, middleware, routes, CORS.
- `server/src/index.ts`: HTTP server bootstrap.
- `server/src/config.ts`: environment parsing.
- `server/src/db.ts`: PostgreSQL pool and query helper.
- `server/src/schema.sql`: database schema.
- `server/src/auth/google.ts`: Google OAuth URL and callback handling.
- `server/src/auth/session.ts`: signed session cookie helpers.
- `server/src/invoices/totals.ts`: deterministic invoice tax and total math.
- `server/src/invoices/pdf.ts`: PDF rendering that matches the sample invoice.
- `server/src/invoices/routes.ts`: invoice CRUD and send routes.
- `server/src/gmail/send.ts`: Gmail message creation and send call.
- `server/src/test/*.test.ts`: backend unit and route tests.
- `src/api.ts`: frontend API client using `VITE_API_BASE_URL`.
- `src/types.ts`: shared frontend data types.
- `src/main.tsx`: replace provisioned placeholder with the Facture app shell.
- `src/styles.css`: production app layout.
- `src/test/*.test.tsx`: frontend render and state tests.
- `.env.example`: document public frontend variables.
- `server/.env.example`: document backend-only VPS variables.
- `README.md`: update local development and deployment notes.

---

### Task 1: Backend Project Skeleton

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/vitest.config.ts`
- Create: `server/src/config.ts`
- Create: `server/src/app.ts`
- Create: `server/src/index.ts`
- Create: `server/src/test/health.test.ts`

- [ ] **Step 1: Create backend package files**

```json
{
  "name": "facture-api",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "@googleapis/gmail": "^9.0.0",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "google-auth-library": "^9.15.1",
    "pdf-lib": "^1.17.1",
    "pg": "^8.13.1",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/cookie-parser": "^1.4.8",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^22.10.2",
    "@types/pg": "^8.11.10",
    "supertest": "^7.0.0",
    "@types/supertest": "^6.0.2",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Create TypeScript and Vitest config**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts"]
}
```

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 3: Write failing health test**

```ts
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';

describe('health route', () => {
  it('returns service status', async () => {
    const app = createApp();
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, service: 'facture-api' });
  });
});
```

Run: `cd server && npm test -- src/test/health.test.ts`
Expected: FAIL because `../app.js` does not exist.

- [ ] **Step 4: Implement backend config, app, and bootstrap**

```ts
import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.string().default('development'),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
});

export const config = EnvSchema.parse(process.env);
```

```ts
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { config } from './config.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.FRONTEND_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/health', (_request, response) => {
    response.json({ ok: true, service: 'facture-api' });
  });

  return app;
}
```

```ts
import { createApp } from './app.js';
import { config } from './config.js';

createApp().listen(config.PORT, () => {
  console.log(`facture-api listening on ${config.PORT}`);
});
```

- [ ] **Step 5: Verify backend skeleton**

Run: `cd server && npm install && npm test -- src/test/health.test.ts && npm run build`
Expected: PASS health test and TypeScript build.

---

### Task 2: Database Schema and Invoice Math

**Files:**
- Create: `server/src/schema.sql`
- Create: `server/src/db.ts`
- Create: `server/src/invoices/totals.ts`
- Create: `server/src/test/totals.test.ts`
- Modify: `server/src/config.ts`

- [ ] **Step 1: Add failing invoice total tests**

```ts
import { describe, expect, it } from 'vitest';
import { calculateInvoiceTotals } from '../invoices/totals.js';

describe('calculateInvoiceTotals', () => {
  it('matches the sample Quebec invoice totals', () => {
    const totals = calculateInvoiceTotals({
      lines: [{ quantity: 40.5, unitRateCents: 9400 }],
      gstRate: 0.05,
      qstRate: 0.09975,
    });

    expect(totals).toEqual({
      subtotalCents: 380700,
      gstCents: 19035,
      qstCents: 37975,
      totalCents: 437710,
    });
  });
});
```

Run: `cd server && npm test -- src/test/totals.test.ts`
Expected: FAIL because `totals.ts` does not exist.

- [ ] **Step 2: Implement deterministic invoice math**

```ts
export interface InvoiceLineInput {
  quantity: number;
  unitRateCents: number;
}

export interface InvoiceTotalInput {
  lines: InvoiceLineInput[];
  gstRate: number;
  qstRate: number;
}

export interface InvoiceTotals {
  subtotalCents: number;
  gstCents: number;
  qstCents: number;
  totalCents: number;
}

function roundCents(value: number) {
  return Math.round(value);
}

export function calculateInvoiceTotals(input: InvoiceTotalInput): InvoiceTotals {
  const subtotalCents = input.lines.reduce(
    (sum, line) => sum + roundCents(line.quantity * line.unitRateCents),
    0,
  );
  const gstCents = roundCents(subtotalCents * input.gstRate);
  const qstCents = roundCents(subtotalCents * input.qstRate);

  return {
    subtotalCents,
    gstCents,
    qstCents,
    totalCents: subtotalCents + gstCents + qstCents,
  };
}
```

- [ ] **Step 3: Add PostgreSQL schema**

```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_sub TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  legal_name TEXT NOT NULL,
  company_number TEXT NOT NULL,
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
  billing_address TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  invoice_number TEXT NOT NULL,
  document_reference TEXT NOT NULL,
  resource_name TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid')),
  subtotal_cents INTEGER NOT NULL,
  gst_cents INTEGER NOT NULL,
  qst_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  gmail_message_id TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  service_date DATE NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL,
  unit_rate_cents INTEGER NOT NULL,
  line_total_cents INTEGER NOT NULL
);
```

- [ ] **Step 4: Add database helper and environment variable**

```ts
import { Pool, QueryResultRow } from 'pg';
import { config } from './config.js';

export const pool = new Pool({ connectionString: config.DATABASE_URL });

export async function query<T extends QueryResultRow>(sql: string, params: unknown[] = []) {
  return pool.query<T>(sql, params);
}
```

Add `DATABASE_URL: z.string().url()` to `EnvSchema` in `server/src/config.ts`.

- [ ] **Step 5: Verify math and backend build**

Run: `cd server && npm test -- src/test/totals.test.ts && npm run build`
Expected: PASS total calculation test and TypeScript build.

---

### Task 3: Google OAuth Session

**Files:**
- Create: `server/src/auth/session.ts`
- Create: `server/src/auth/google.ts`
- Create: `server/src/test/auth.test.ts`
- Modify: `server/src/app.ts`
- Modify: `server/src/config.ts`

- [ ] **Step 1: Add failing auth URL test**

```ts
import { describe, expect, it } from 'vitest';
import { buildGoogleAuthUrl } from '../auth/google.js';

describe('buildGoogleAuthUrl', () => {
  it('requests identity and Gmail send scopes', () => {
    const url = new URL(buildGoogleAuthUrl('state-123'));

    expect(url.hostname).toBe('accounts.google.com');
    expect(url.searchParams.get('scope')).toContain('openid');
    expect(url.searchParams.get('scope')).toContain('email');
    expect(url.searchParams.get('scope')).toContain('https://www.googleapis.com/auth/gmail.send');
    expect(url.searchParams.get('state')).toBe('state-123');
  });
});
```

Run: `cd server && npm test -- src/test/auth.test.ts`
Expected: FAIL because `auth/google.ts` does not exist.

- [ ] **Step 2: Extend config for Google OAuth**

```ts
const EnvSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.string().default('development'),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.string().url().default('https://facture.api.amazing-ai.tools/auth/google/callback'),
  SESSION_SECRET: z.string().min(32),
});
```

- [ ] **Step 3: Implement signed session helpers**

```ts
import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { config } from '../config.js';

export interface SessionPayload {
  userId: string;
  email: string;
}

const cookieName = 'facture_session';

function sign(value: string) {
  return crypto.createHmac('sha256', config.SESSION_SECRET).update(value).digest('base64url');
}

export function createSessionToken(payload: SessionPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function readSessionToken(token: string): SessionPayload | null {
  const [body, signature] = token.split('.');
  if (!body || !signature || sign(body) !== signature) return null;
  return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
}

export function setSessionCookie(response: Response, payload: SessionPayload) {
  response.cookie(cookieName, createSessionToken(payload), {
    httpOnly: true,
    sameSite: 'none',
    secure: config.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });
}

export function getSession(request: Request) {
  const token = request.cookies?.[cookieName];
  return typeof token === 'string' ? readSessionToken(token) : null;
}
```

- [ ] **Step 4: Implement Google OAuth URL builder and app routes**

```ts
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { config } from '../config.js';

export const googleOAuthClient = new OAuth2Client(
  config.GOOGLE_CLIENT_ID,
  config.GOOGLE_CLIENT_SECRET,
  config.GOOGLE_REDIRECT_URI,
);

export function buildGoogleAuthUrl(state: string) {
  return googleOAuthClient.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    state,
    scope: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/gmail.send'],
  });
}

export async function getGoogleProfile(code: string) {
  const { tokens } = await googleOAuthClient.getToken(code);
  googleOAuthClient.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: 'v2', auth: googleOAuthClient });
  const { data } = await oauth2.userinfo.get();

  if (!data.id || !data.email || !data.name) {
    throw new Error('Google profile is missing required fields');
  }

  return {
    googleSub: data.id,
    email: data.email,
    name: data.name,
    refreshToken: tokens.refresh_token ?? null,
  };
}
```

Add `/auth/google/start`, `/auth/google/callback`, and `/me` routes in `server/src/app.ts`. The callback upserts the user in PostgreSQL, stores the refresh token server-side, sets the session cookie, and redirects to `FRONTEND_ORIGIN`.

- [ ] **Step 5: Verify auth pieces**

Run: `cd server && npm test -- src/test/auth.test.ts && npm run build`
Expected: PASS auth URL test and TypeScript build.

---

### Task 4: Invoice CRUD API

**Files:**
- Create: `server/src/invoices/routes.ts`
- Create: `server/src/test/invoices.test.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Add failing invoice route test**

```ts
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';

describe('invoice routes', () => {
  it('rejects unauthenticated invoice reads', async () => {
    const app = createApp();
    const response = await request(app).get('/invoices');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Authentication required' });
  });
});
```

Run: `cd server && npm test -- src/test/invoices.test.ts`
Expected: FAIL because `/invoices` is not registered.

- [ ] **Step 2: Implement invoice router guard**

```ts
import { Router } from 'express';
import { getSession } from '../auth/session.js';

export const invoiceRouter = Router();

invoiceRouter.use((request, response, next) => {
  const session = getSession(request);
  if (!session) {
    response.status(401).json({ error: 'Authentication required' });
    return;
  }
  response.locals.session = session;
  next();
});

invoiceRouter.get('/', async (_request, response) => {
  response.json({ invoices: [] });
});
```

Mount with `app.use('/invoices', invoiceRouter)` in `server/src/app.ts`.

- [ ] **Step 3: Add company, client, invoice create/list/update handlers**

Implement:

```ts
invoiceRouter.get('/', listInvoices);
invoiceRouter.post('/', createInvoice);
invoiceRouter.get('/:invoiceId', getInvoice);
invoiceRouter.patch('/:invoiceId/status', updateInvoiceStatus);
```

The create handler validates company id, client id, resource name, invoice number, document reference, invoice date, and line fields. It calculates `subtotal_cents`, `gst_cents`, `qst_cents`, and `total_cents` using `calculateInvoiceTotals`.

- [ ] **Step 4: Verify CRUD route baseline**

Run: `cd server && npm test -- src/test/invoices.test.ts && npm run build`
Expected: PASS unauthenticated guard test and TypeScript build.

---

### Task 5: PDF Generation and Gmail Send

**Files:**
- Create: `server/src/invoices/pdf.ts`
- Create: `server/src/gmail/send.ts`
- Create: `server/src/test/pdf.test.ts`
- Modify: `server/src/invoices/routes.ts`

- [ ] **Step 1: Add failing PDF smoke test**

```ts
import { describe, expect, it } from 'vitest';
import { renderInvoicePdf } from '../invoices/pdf.js';

describe('renderInvoicePdf', () => {
  it('returns a PDF buffer', async () => {
    const pdf = await renderInvoicePdf({
      invoiceNumber: 'C997672026-03-21001',
      invoiceDate: '2026-03-21',
      supplierName: '9493-1011 QUEBEC INC',
      clientName: 'Cofomo',
      clientAddress: '1000 De la Gauchetiere, Bureau 1500, Montreal, QC, H3B 4W5',
      documentReference: 'F00000349957',
      resourceName: 'Machado Da Silva, Eduardo (C99767)',
      lines: [{ description: "Main d'oeuvre", serviceDate: '2026-03-21', quantity: 40.5, unitRateCents: 9400, lineTotalCents: 380700 }],
      gstNumber: '744492612',
      qstNumber: '1230724969',
      subtotalCents: 380700,
      gstCents: 19035,
      qstCents: 37975,
      totalCents: 437710,
      paymentTerms: 'MOIS-SUIV',
    });

    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(pdf.length).toBeGreaterThan(1000);
  });
});
```

Run: `cd server && npm test -- src/test/pdf.test.ts`
Expected: FAIL because `pdf.ts` does not exist.

- [ ] **Step 2: Implement PDF renderer**

Use `pdf-lib` to create a letter-size page. Draw supplier, client, invoice metadata, one labour table, tax registration numbers, GST/TPS, QST/TVQ, and total to pay. Keep the layout close to the sample PDF: corporate supplier block at top, client block left, invoice metadata right, line table center, totals block bottom right.

- [ ] **Step 3: Implement Gmail sender**

```ts
import { gmail_v1, google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config.js';

export interface SendInvoiceEmailInput {
  refreshToken: string;
  to: string;
  subject: string;
  body: string;
  filename: string;
  pdf: Uint8Array;
}

export async function sendInvoiceEmail(input: SendInvoiceEmailInput) {
  const auth = new OAuth2Client(config.GOOGLE_CLIENT_ID, config.GOOGLE_CLIENT_SECRET, config.GOOGLE_REDIRECT_URI);
  auth.setCredentials({ refresh_token: input.refreshToken });
  const gmail = google.gmail({ version: 'v1', auth });
  const raw = buildMimeMessage(input);
  const response = await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
  return response.data as gmail_v1.Schema$Message;
}

function buildMimeMessage(input: SendInvoiceEmailInput) {
  const boundary = `facture_${Date.now()}`;
  const pdfBase64 = Buffer.from(input.pdf).toString('base64');
  const message = [
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    input.body,
    '',
    `--${boundary}`,
    `Content-Type: application/pdf; name="${input.filename}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${input.filename}"`,
    '',
    pdfBase64,
    `--${boundary}--`,
  ].join('\r\n');

  return Buffer.from(message).toString('base64url');
}
```

- [ ] **Step 4: Add invoice preview and send endpoints**

Implement:

```ts
invoiceRouter.get('/:invoiceId/pdf', previewInvoicePdf);
invoiceRouter.post('/:invoiceId/send', sendInvoice);
```

`previewInvoicePdf` returns `application/pdf`. `sendInvoice` renders the PDF, sends it through Gmail, stores the Gmail message id, `sent_at`, and status `sent`.

- [ ] **Step 5: Verify PDF and backend build**

Run: `cd server && npm test -- src/test/pdf.test.ts && npm run build`
Expected: PASS PDF smoke test and TypeScript build.

---

### Task 6: Frontend App Shell and API Client

**Files:**
- Create: `src/api.ts`
- Create: `src/types.ts`
- Create: `src/test/app.test.tsx`
- Modify: `src/main.tsx`
- Modify: `src/styles.css`
- Modify: `package.json`

- [ ] **Step 1: Add frontend test dependencies**

Run: `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`
Expected: package files include frontend test tooling.

- [ ] **Step 2: Add failing app render test**

```tsx
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../main';

describe('App', () => {
  it('renders the Facture dashboard shell', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Facture' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument();
  });
});
```

Run: `npm test -- src/test/app.test.tsx`
Expected: FAIL because `App` is not exported and no test script exists yet.

- [ ] **Step 3: Add frontend test script**

```json
{
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "tsc && vite build",
    "preview": "vite preview --host 0.0.0.0",
    "test": "vitest run --environment jsdom"
  }
}
```

- [ ] **Step 4: Implement API client**

```ts
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export function loginWithGoogle() {
  window.location.href = `${apiBaseUrl}/auth/google/start`;
}

export async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
}
```

- [ ] **Step 5: Replace placeholder with invoice app shell**

Export `App` from `src/main.tsx`. Render a work-focused interface with a left navigation, Google sign-in action, company setup panel, invoice list panel, and a PDF preview placeholder wired to the future API endpoints.

- [ ] **Step 6: Verify frontend shell**

Run: `npm test -- src/test/app.test.tsx && npm run build`
Expected: PASS render test and production build.

---

### Task 7: Frontend Invoice Forms and Send Flow

**Files:**
- Create: `src/components/CompanyForm.tsx`
- Create: `src/components/ClientForm.tsx`
- Create: `src/components/InvoiceEditor.tsx`
- Create: `src/components/InvoicePreview.tsx`
- Create: `src/components/InvoiceList.tsx`
- Create: `src/test/invoice-editor.test.tsx`
- Modify: `src/main.tsx`
- Modify: `src/api.ts`

- [ ] **Step 1: Add failing invoice editor test**

```tsx
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InvoiceEditor } from '../components/InvoiceEditor';

describe('InvoiceEditor', () => {
  it('calculates sample invoice total in the form', () => {
    render(<InvoiceEditor onSave={() => undefined} />);

    fireEvent.change(screen.getByLabelText('Hours'), { target: { value: '40.5' } });
    fireEvent.change(screen.getByLabelText('Hourly rate'), { target: { value: '94' } });

    expect(screen.getByText('$4,377.10')).toBeInTheDocument();
  });
});
```

Run: `npm test -- src/test/invoice-editor.test.tsx`
Expected: FAIL because `InvoiceEditor` does not exist.

- [ ] **Step 2: Implement invoice editor total preview**

Create `InvoiceEditor` with controlled fields for invoice number, document reference, service date, resource name, description, hours, hourly rate, GST/TPS, and QST/TVQ. Calculate the same sample total client-side for immediate feedback while preserving backend calculation as the source of truth.

- [ ] **Step 3: Implement forms and list components**

Add company, client, invoice list, and PDF preview components. Keep forms dense and operational: labels, inputs, save buttons, status tags, and send button.

- [ ] **Step 4: Wire API mutations**

Add `postJson`, `patchJson`, and PDF preview helpers to `src/api.ts`. Use credentials on every request.

- [ ] **Step 5: Verify invoice UI**

Run: `npm test -- src/test/invoice-editor.test.tsx && npm run build`
Expected: PASS editor calculation test and production build.

---

### Task 8: Environment Docs and Deployment Notes

**Files:**
- Create: `.env.example`
- Create: `server/.env.example`
- Modify: `README.md`

- [ ] **Step 1: Add frontend environment example**

```dotenv
VITE_APP_NAME=Facture
VITE_APP_DOMAIN=facture.app.amazing-ai.tools
VITE_API_BASE_URL=https://facture.api.amazing-ai.tools
VITE_BUGZERO_APP_KEY=bz_55c06d2aece6
VITE_BUGZERO_WIDGET_URL=https://bugzero.amazing-ai.tools/widget.js
```

- [ ] **Step 2: Add backend environment example**

```dotenv
NODE_ENV=production
PORT=4000
FRONTEND_ORIGIN=https://facture.app.amazing-ai.tools
DATABASE_URL=postgres://facture:change-me@localhost:5432/facture
GOOGLE_CLIENT_ID=replace-with-google-client-id
GOOGLE_CLIENT_SECRET=replace-with-google-client-secret
GOOGLE_REDIRECT_URI=https://facture.api.amazing-ai.tools/auth/google/callback
SESSION_SECRET=replace-with-at-least-32-random-characters
```

- [ ] **Step 3: Update README with product and local development notes**

Document:

```md
# Facture

Facture is a private Google-authenticated invoice app for creating Quebec-style consulting invoices, generating PDFs, and sending them to clients with Gmail.

## Frontend

- Cloud URL: https://facture.app.amazing-ai.tools
- Local dev: npm run dev
- API base URL: VITE_API_BASE_URL

## Backend

- VPS API URL: https://facture.api.amazing-ai.tools
- Local dev: cd server && npm run dev
- Production secrets stay on the VPS and are not committed.

## Google OAuth

Configure JavaScript origin:

- https://facture.app.amazing-ai.tools

Configure redirect URI:

- https://facture.api.amazing-ai.tools/auth/google/callback
```

- [ ] **Step 4: Verify docs and full build**

Run: `npm run build && cd server && npm run build`
Expected: frontend and backend TypeScript builds pass.

---

## Self-Review

- Spec coverage: the plan covers Google sign-in, company data, clients, invoice CRUD, Quebec invoice totals, PDF preview, Gmail sending, cloud frontend, and VPS backend at `https://facture.api.amazing-ai.tools`.
- Placeholder scan: no `{{PLACEHOLDER}}` tokens are present; environment examples use explicit replace-with values for secret-bearing keys.
- Type consistency: invoice money fields use cents in backend and display dollars in frontend. API base URL is consistently `https://facture.api.amazing-ai.tools`.
