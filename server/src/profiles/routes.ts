import { Router } from 'express';
import { z } from 'zod';
import { getSession, type SessionPayload } from '../auth/session.js';
import { query } from '../db.js';

interface CompanyRow {
  id: string;
  legal_name: string;
  company_number: string;
  address: string;
  gst_number: string;
  qst_number: string;
  default_hourly_rate_cents: number;
  payment_terms: string;
}

interface ClientRow {
  id: string;
  name: string;
  billing_address: string;
  email: string | null;
}

const companySchema = z.object({
  legalName: z.string().min(1),
  companyNumber: z.string().min(1),
  address: z.string().min(1),
  gstNumber: z.string().min(1),
  qstNumber: z.string().min(1),
  defaultHourlyRateCents: z.number().int().positive().default(9400),
  paymentTerms: z.string().min(1).default('MOIS-SUIV'),
});

const clientSchema = z.object({
  name: z.string().min(1),
  billingAddress: z.string().min(1),
  email: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z.string().email().nullable().default(null),
  ),
});

export const profileRouter = Router();

profileRouter.use((request, response, next) => {
  const session = getSession(request);
  if (!session) {
    response.status(401).json({ error: 'Authentication required' });
    return;
  }

  response.locals.session = session;
  next();
});

profileRouter.get('/companies', async (request, response, next) => {
  try {
    const session = sessionFrom(response.locals);
    const result = await query<CompanyRow>(
      `
        SELECT id, legal_name, company_number, address, gst_number, qst_number,
          default_hourly_rate_cents, payment_terms
        FROM companies
        WHERE user_id = $1
        ORDER BY created_at DESC
      `,
      [session.userId],
    );

    response.json({ companies: result.rows.map(mapCompany) });
  } catch (error) {
    next(error);
  }
});

profileRouter.post('/companies', async (request, response, next) => {
  try {
    const session = sessionFrom(response.locals);
    const input = companySchema.parse(request.body);
    const result = await query<CompanyRow>(
      `
        INSERT INTO companies (
          user_id, legal_name, company_number, address, gst_number, qst_number,
          default_hourly_rate_cents, payment_terms
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, legal_name, company_number, address, gst_number, qst_number,
          default_hourly_rate_cents, payment_terms
      `,
      [
        session.userId,
        input.legalName,
        input.companyNumber,
        input.address,
        input.gstNumber,
        input.qstNumber,
        input.defaultHourlyRateCents,
        input.paymentTerms,
      ],
    );

    response.status(201).json({ company: mapCompany(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

profileRouter.patch('/companies/:companyId', async (request, response, next) => {
  try {
    const session = sessionFrom(response.locals);
    const input = companySchema.parse(request.body);
    const result = await query<CompanyRow>(
      `
        UPDATE companies
        SET
          legal_name = $3,
          company_number = $4,
          address = $5,
          gst_number = $6,
          qst_number = $7,
          default_hourly_rate_cents = $8,
          payment_terms = $9
        WHERE id = $1 AND user_id = $2
        RETURNING id, legal_name, company_number, address, gst_number, qst_number,
          default_hourly_rate_cents, payment_terms
      `,
      [
        request.params.companyId,
        session.userId,
        input.legalName,
        input.companyNumber,
        input.address,
        input.gstNumber,
        input.qstNumber,
        input.defaultHourlyRateCents,
        input.paymentTerms,
      ],
    );

    if (!result.rows[0]) {
      response.status(404).json({ error: 'Company not found' });
      return;
    }

    response.json({ company: mapCompany(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

profileRouter.get('/clients', async (request, response, next) => {
  try {
    const session = sessionFrom(response.locals);
    const result = await query<ClientRow>(
      `
        SELECT id, name, billing_address, email
        FROM clients
        WHERE user_id = $1
        ORDER BY created_at DESC
      `,
      [session.userId],
    );

    response.json({ clients: result.rows.map(mapClient) });
  } catch (error) {
    next(error);
  }
});

profileRouter.post('/clients', async (request, response, next) => {
  try {
    const session = sessionFrom(response.locals);
    const input = clientSchema.parse(request.body);
    const result = await query<ClientRow>(
      `
        INSERT INTO clients (user_id, name, billing_address, email)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, billing_address, email
      `,
      [session.userId, input.name, input.billingAddress, input.email],
    );

    response.status(201).json({ client: mapClient(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

profileRouter.patch('/clients/:clientId', async (request, response, next) => {
  try {
    const session = sessionFrom(response.locals);
    const input = clientSchema.parse(request.body);
    const result = await query<ClientRow>(
      `
        UPDATE clients
        SET name = $3, billing_address = $4, email = $5
        WHERE id = $1 AND user_id = $2
        RETURNING id, name, billing_address, email
      `,
      [request.params.clientId, session.userId, input.name, input.billingAddress, input.email],
    );

    if (!result.rows[0]) {
      response.status(404).json({ error: 'Client not found' });
      return;
    }

    response.json({ client: mapClient(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

function sessionFrom(responseLocals: Record<string, unknown>) {
  return responseLocals.session as SessionPayload;
}

function mapCompany(row: CompanyRow) {
  return {
    id: row.id,
    legalName: row.legal_name,
    companyNumber: row.company_number,
    address: row.address,
    gstNumber: row.gst_number,
    qstNumber: row.qst_number,
    defaultHourlyRateCents: row.default_hourly_rate_cents,
    paymentTerms: row.payment_terms,
  };
}

function mapClient(row: ClientRow) {
  return {
    id: row.id,
    name: row.name,
    billingAddress: row.billing_address,
    email: row.email ?? '',
  };
}
