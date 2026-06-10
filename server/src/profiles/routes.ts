import { Router } from 'express';
import { z } from 'zod';
import { getSession, type SessionPayload } from '../auth/session.js';
import { query } from '../db.js';

interface CompanyRow {
  id: string;
  name: string;
  legal_name: string;
  company_number: string;
  email: string;
  address: string;
  gst_number: string;
  qst_number: string;
  default_hourly_rate_cents: number;
}

interface ClientRow {
  id: string;
  name: string;
  contact_name: string;
  billing_address: string;
  email: string | null;
}

const companySchema = z.object({
  name: z.string().default(''),
  legalName: z.string().min(1),
  companyNumber: z.string().default(''),
  email: z.string().default(''),
  address: z.string().default(''),
  gstNumber: z.string().default(''),
  qstNumber: z.string().default(''),
  defaultHourlyRateCents: z.number().int().positive().default(9400),
});

const clientSchema = z.object({
  name: z.string().min(1),
  contactName: z.string().default(''),
  billingAddress: z.string().default(''),
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
        SELECT id, name, legal_name, company_number, email, address, gst_number, qst_number,
          default_hourly_rate_cents
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
          user_id, name, legal_name, company_number, email, address, gst_number, qst_number,
          default_hourly_rate_cents
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, name, legal_name, company_number, email, address, gst_number, qst_number,
          default_hourly_rate_cents
      `,
      [
        session.userId,
        input.name,
        input.legalName,
        input.companyNumber,
        input.email,
        input.address,
        input.gstNumber,
        input.qstNumber,
        input.defaultHourlyRateCents,
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
          name = $3,
          legal_name = $4,
          company_number = $5,
          email = $6,
          address = $7,
          gst_number = $8,
          qst_number = $9,
          default_hourly_rate_cents = $10
        WHERE id = $1 AND user_id = $2
        RETURNING id, name, legal_name, company_number, email, address, gst_number, qst_number,
          default_hourly_rate_cents
      `,
      [
        request.params.companyId,
        session.userId,
        input.name,
        input.legalName,
        input.companyNumber,
        input.email,
        input.address,
        input.gstNumber,
        input.qstNumber,
        input.defaultHourlyRateCents,
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
        SELECT id, name, contact_name, billing_address, email
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
        INSERT INTO clients (user_id, name, contact_name, billing_address, email)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, contact_name, billing_address, email
      `,
      [session.userId, input.name, input.contactName, input.billingAddress, input.email],
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
        SET name = $3, contact_name = $4, billing_address = $5, email = $6
        WHERE id = $1 AND user_id = $2
        RETURNING id, name, contact_name, billing_address, email
      `,
      [request.params.clientId, session.userId, input.name, input.contactName, input.billingAddress, input.email],
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
    name: row.name,
    legalName: row.legal_name,
    companyNumber: row.company_number,
    email: row.email,
    address: row.address,
    gstNumber: row.gst_number,
    qstNumber: row.qst_number,
    defaultHourlyRateCents: row.default_hourly_rate_cents,
  };
}

function mapClient(row: ClientRow) {
  return {
    id: row.id,
    name: row.name,
    contactName: row.contact_name,
    billingAddress: row.billing_address,
    email: row.email ?? '',
  };
}
