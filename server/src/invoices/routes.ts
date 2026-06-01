import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { getSession, type SessionPayload } from '../auth/session.js';
import { query, withTransaction, type QueryFn } from '../db.js';
import { sendInvoiceEmail } from '../email/send.js';
import { calculateInvoiceTotals } from './totals.js';
import { renderInvoicePdf, type InvoicePdfInput } from './pdf.js';
import { assertQuebecInvoiceReady } from './compliance.js';
import { invoiceEmailContent, invoiceLanguages } from './localization.js';

interface InvoiceRow {
  id: string;
  company_id?: string;
  client_id?: string;
  invoice_number: string;
  language: string;
  client_name?: string;
  document_reference: string;
  resource_name: string;
  payment_terms: string;
  invoice_date: string;
  status: string;
  subtotal_cents: number;
  gst_cents: number;
  qst_cents: number;
  total_cents: number;
  email_message_id?: string | null;
  sent_at?: string | null;
  created_at?: string;
}

interface InvoiceLineRow {
  id: string;
  description: string;
  service_date: string;
  quantity: string | number;
  unit_rate_cents: number;
  line_total_cents: number;
}

interface InvoicePdfRow extends InvoiceRow {
  supplier_name: string;
  supplier_address: string;
  gst_number: string;
  qst_number: string;
  payment_terms: string;
  client_name: string;
  client_address: string;
  client_email: string | null;
}

const invoiceLineSchema = z.object({
  description: z.string().min(1),
  serviceDate: z.string().min(1),
  quantity: z.number().positive(),
  unitRateCents: z.number().int().positive(),
});

const createInvoiceSchema = z.object({
  companyId: z.string().min(1),
  clientId: z.string().min(1),
  invoiceNumber: z.string().min(1),
  language: z.enum(invoiceLanguages).default('fr-QC'),
  documentReference: z.string().min(1),
  resourceName: z.string().min(1),
  paymentTerms: z.string().min(1).default('MOIS-SUIV'),
  invoiceDate: z.string().min(1),
  lines: z.array(invoiceLineSchema).min(1),
});

const statusSchema = z.object({
  status: z.enum(['draft', 'sent', 'paid']),
});

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

invoiceRouter.get('/', asyncRoute(listInvoices));
invoiceRouter.post('/', asyncRoute(createInvoice));
invoiceRouter.get('/:invoiceId', asyncRoute(getInvoice));
invoiceRouter.patch('/:invoiceId/status', asyncRoute(updateInvoiceStatus));
invoiceRouter.patch('/:invoiceId', asyncRoute(updateInvoice));
invoiceRouter.delete('/:invoiceId', asyncRoute(deleteInvoice));
invoiceRouter.get('/:invoiceId/pdf', asyncRoute(previewInvoicePdf));
invoiceRouter.post('/:invoiceId/send', asyncRoute(sendInvoice));

function asyncRoute(handler: (request: Request, response: Response) => Promise<void>) {
  return (request: Request, response: Response, next: (error?: unknown) => void) => {
    handler(request, response).catch(next);
  };
}

function sessionFrom(responseLocals: Record<string, unknown>) {
  return responseLocals.session as SessionPayload;
}

function mapInvoice(row: InvoiceRow, lines?: InvoiceLineRow[]) {
  return {
    id: row.id,
    companyId: row.company_id,
    clientId: row.client_id,
    invoiceNumber: row.invoice_number,
    language: row.language ?? 'fr-QC',
    clientName: row.client_name,
    documentReference: row.document_reference,
    resourceName: row.resource_name,
    paymentTerms: row.payment_terms,
    invoiceDate: toDateInputValue(row.invoice_date),
    status: row.status,
    subtotalCents: row.subtotal_cents,
    gstCents: row.gst_cents,
    qstCents: row.qst_cents,
    totalCents: row.total_cents,
    emailMessageId: row.email_message_id ?? null,
    sentAt: row.sent_at ?? null,
    createdAt: row.created_at,
    ...(lines
      ? {
          lines: lines.map((line) => ({
            id: line.id,
            description: line.description,
            serviceDate: toDateInputValue(line.service_date),
            quantity: Number(line.quantity),
            unitRateCents: line.unit_rate_cents,
            lineTotalCents: line.line_total_cents,
          })),
        }
      : {}),
  };
}

async function listInvoices(_request: Request, response: Response) {
  const session = sessionFrom(response.locals);
  const result = await query<InvoiceRow>(
    `
      SELECT invoices.id, invoices.company_id, invoices.client_id, invoices.invoice_number, clients.name AS client_name,
        invoices.document_reference, invoices.resource_name, invoices.language, invoices.invoice_date, invoices.status,
        invoices.payment_terms, invoices.subtotal_cents, invoices.gst_cents, invoices.qst_cents, invoices.total_cents,
        invoices.email_message_id, invoices.sent_at, invoices.created_at
      FROM invoices
      JOIN clients ON clients.id = invoices.client_id AND clients.user_id = invoices.user_id
      WHERE invoices.user_id = $1
      ORDER BY invoices.created_at DESC
    `,
    [session.userId],
  );

  response.json({ invoices: result.rows.map((row) => mapInvoice(row)) });
}

async function createInvoice(request: Request, response: Response) {
  const session = sessionFrom(response.locals);
  const input = createInvoiceSchema.parse(request.body);
  const lineTotals = input.lines.map((line) => ({
    ...line,
    lineTotalCents: Math.round(line.quantity * line.unitRateCents),
  }));
  const totals = calculateInvoiceTotals({
    lines: input.lines,
    gstRate: 0.05,
    qstRate: 0.09975,
  });

  const { invoice, insertedLines } = await withTransaction(async (txQuery) => {
    const invoiceResult = await insertInvoice(txQuery, session.userId, input, totals);
    const invoice = invoiceResult.rows[0];
    if (!invoice) {
      return { invoice: null, insertedLines: [] };
    }

    const insertedLines: InvoiceLineRow[] = [];
    for (const line of lineTotals) {
      const lineResult = await txQuery<InvoiceLineRow>(
        `
          INSERT INTO invoice_lines (
            invoice_id, description, service_date, quantity, unit_rate_cents, line_total_cents
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, description, service_date, quantity, unit_rate_cents, line_total_cents
        `,
        [
          invoice.id,
          line.description,
          line.serviceDate,
          line.quantity,
          line.unitRateCents,
          line.lineTotalCents,
        ],
      );
      insertedLines.push(lineResult.rows[0]);
    }

    return { invoice, insertedLines };
  });

  if (!invoice) {
    response.status(404).json({ error: 'Company or client not found' });
    return;
  }

  response.status(201).json({ invoice: mapInvoice(invoice, insertedLines) });
}

async function insertInvoice(
  txQuery: QueryFn,
  userId: string,
  input: z.infer<typeof createInvoiceSchema>,
  totals: ReturnType<typeof calculateInvoiceTotals>,
) {
  return txQuery<InvoiceRow>(
    `
      INSERT INTO invoices (
        user_id, company_id, client_id, invoice_number, language, document_reference, resource_name,
        payment_terms, invoice_date, subtotal_cents, gst_cents, qst_cents, total_cents
      )
      SELECT $1, companies.id, clients.id, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      FROM companies
      JOIN clients ON clients.id = $3 AND clients.user_id = $1
      WHERE companies.id = $2 AND companies.user_id = $1
      RETURNING id, company_id, client_id, invoice_number, language, document_reference, resource_name, invoice_date, status,
        payment_terms, subtotal_cents, gst_cents, qst_cents, total_cents, created_at
    `,
    [
      userId,
      input.companyId,
      input.clientId,
      input.invoiceNumber,
      input.language,
      input.documentReference,
      input.resourceName,
      input.paymentTerms,
      input.invoiceDate,
      totals.subtotalCents,
      totals.gstCents,
      totals.qstCents,
      totals.totalCents,
    ],
  );
}

async function getInvoice(request: Request, response: Response) {
  const session = sessionFrom(response.locals);
  const invoice = await loadInvoice(request.params.invoiceId, session.userId);
  if (!invoice) {
    response.status(404).json({ error: 'Invoice not found' });
    return;
  }

  response.json({ invoice: mapInvoice(invoice.invoice, invoice.lines) });
}

async function updateInvoiceStatus(request: Request, response: Response) {
  const session = sessionFrom(response.locals);
  const input = statusSchema.parse(request.body);
  const result = await query<InvoiceRow>(
    `
      UPDATE invoices
      SET status = $3
      WHERE id = $1 AND user_id = $2
      RETURNING id, company_id, client_id, invoice_number, language, document_reference, resource_name, invoice_date, status,
        payment_terms, subtotal_cents, gst_cents, qst_cents, total_cents, email_message_id, sent_at, created_at
    `,
    [request.params.invoiceId, session.userId, input.status],
  );

  if (!result.rows[0]) {
    response.status(404).json({ error: 'Invoice not found' });
    return;
  }

  response.json({ invoice: mapInvoice(result.rows[0]) });
}

async function updateInvoice(request: Request, response: Response) {
  const session = sessionFrom(response.locals);
  const input = createInvoiceSchema.partial({ companyId: true, clientId: true, lines: true }).parse(request.body);
  const existing = await loadInvoice(request.params.invoiceId, session.userId);
  if (!existing) {
    response.status(404).json({ error: 'Invoice not found' });
    return;
  }

  const lines = input.lines ?? existing.lines.map((line) => ({
    description: line.description,
    serviceDate: line.service_date,
    quantity: Number(line.quantity),
    unitRateCents: line.unit_rate_cents,
  }));
  const lineTotals = lines.map((line) => ({
    ...line,
    lineTotalCents: Math.round(line.quantity * line.unitRateCents),
  }));
  const totals = calculateInvoiceTotals({
    lines,
    gstRate: 0.05,
    qstRate: 0.09975,
  });

  const { invoice, insertedLines } = await withTransaction(async (txQuery) => {
    const result = await txQuery<InvoiceRow>(
      `
        UPDATE invoices
        SET
          company_id = COALESCE($3, company_id),
          client_id = COALESCE($4, client_id),
          invoice_number = COALESCE($5, invoice_number),
          language = COALESCE($6, language),
          document_reference = COALESCE($7, document_reference),
          resource_name = COALESCE($8, resource_name),
          payment_terms = COALESCE($9, payment_terms),
          invoice_date = COALESCE($10, invoice_date),
          subtotal_cents = $11,
          gst_cents = $12,
          qst_cents = $13,
          total_cents = $14
        WHERE id = $1
          AND user_id = $2
          AND ($3 IS NULL OR EXISTS (SELECT 1 FROM companies WHERE id = $3 AND user_id = $2))
          AND ($4 IS NULL OR EXISTS (SELECT 1 FROM clients WHERE id = $4 AND user_id = $2))
        RETURNING id, company_id, client_id, invoice_number, language, document_reference, resource_name, invoice_date, status,
          payment_terms, subtotal_cents, gst_cents, qst_cents, total_cents, email_message_id, sent_at, created_at
      `,
      [
        request.params.invoiceId,
        session.userId,
        input.companyId ?? null,
        input.clientId ?? null,
        input.invoiceNumber ?? null,
        input.language ?? null,
        input.documentReference ?? null,
        input.resourceName ?? null,
        input.paymentTerms ?? null,
        input.invoiceDate ?? null,
        totals.subtotalCents,
        totals.gstCents,
        totals.qstCents,
        totals.totalCents,
      ],
    );

    await txQuery('DELETE FROM invoice_lines WHERE invoice_id = $1', [request.params.invoiceId]);

    const insertedLines: InvoiceLineRow[] = [];
    for (const line of lineTotals) {
      const lineResult = await txQuery<InvoiceLineRow>(
        `
          INSERT INTO invoice_lines (
            invoice_id, description, service_date, quantity, unit_rate_cents, line_total_cents
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, description, service_date, quantity, unit_rate_cents, line_total_cents
        `,
        [
          request.params.invoiceId,
          line.description,
          line.serviceDate,
          line.quantity,
          line.unitRateCents,
          line.lineTotalCents,
        ],
      );
      insertedLines.push(lineResult.rows[0]);
    }

    return { invoice: result.rows[0], insertedLines };
  });

  if (!invoice) {
    response.status(404).json({ error: 'Invoice, company, or client not found' });
    return;
  }

  response.json({ invoice: mapInvoice(invoice, insertedLines) });
}

async function deleteInvoice(request: Request, response: Response) {
  const session = sessionFrom(response.locals);
  const result = await query<{ id: string }>(
    'DELETE FROM invoices WHERE id = $1 AND user_id = $2 RETURNING id',
    [request.params.invoiceId, session.userId],
  );

  if (!result.rows[0]) {
    response.status(404).json({ error: 'Invoice not found' });
    return;
  }

  response.status(204).send();
}

async function previewInvoicePdf(request: Request, response: Response) {
  const session = sessionFrom(response.locals);
  const invoice = await loadInvoicePdfInput(request.params.invoiceId, session.userId);
  if (!invoice) {
    response.status(404).json({ error: 'Invoice not found' });
    return;
  }

  const readiness = assertQuebecInvoiceReady(invoice.pdfInput);
  if (!readiness.ok) {
    response.status(400).json({ error: readiness.error, missing: readiness.missing });
    return;
  }

  const pdf = await renderInvoicePdf(invoice.pdfInput);
  response.type('application/pdf').send(pdf);
}

async function sendInvoice(request: Request, response: Response) {
  const session = sessionFrom(response.locals);
  const invoice = await loadInvoicePdfInput(request.params.invoiceId, session.userId);
  if (!invoice) {
    response.status(404).json({ error: 'Invoice not found' });
    return;
  }
  if (!invoice.clientEmail) {
    response.status(400).json({ error: 'Add a client email before sending this invoice' });
    return;
  }

  const readiness = assertQuebecInvoiceReady(invoice.pdfInput);
  if (!readiness.ok) {
    response.status(400).json({ error: readiness.error, missing: readiness.missing });
    return;
  }

  const pdf = await renderInvoicePdf(invoice.pdfInput);
  const email = invoiceEmailContent(invoice.pdfInput.language ?? 'fr-QC', invoice.pdfInput.invoiceNumber);
  const message = await sendInvoiceEmail({
    to: invoice.clientEmail,
    subject: email.subject,
    body: email.body,
    filename: `${invoice.pdfInput.invoiceNumber}.pdf`,
    pdf,
  });

  const updateResult = await query<InvoiceRow>(
    `
      UPDATE invoices
      SET status = 'sent', sent_at = now(), email_message_id = $3
      WHERE id = $1 AND user_id = $2
      RETURNING id, company_id, client_id, invoice_number, language, document_reference, resource_name, invoice_date, status,
        payment_terms, subtotal_cents, gst_cents, qst_cents, total_cents, email_message_id, sent_at, created_at
    `,
    [request.params.invoiceId, session.userId, message.messageId ?? null],
  );

  response.json({ invoice: mapInvoice(updateResult.rows[0]), emailMessageId: message.messageId ?? null });
}

async function loadInvoice(invoiceId: string, userId: string) {
  const invoiceResult = await query<InvoiceRow>(
    `
      SELECT id, company_id, client_id, invoice_number, language, document_reference, resource_name, invoice_date, status,
        payment_terms, subtotal_cents, gst_cents, qst_cents, total_cents, email_message_id, sent_at, created_at
      FROM invoices
      WHERE id = $1 AND user_id = $2
    `,
    [invoiceId, userId],
  );
  const invoice = invoiceResult.rows[0];
  if (!invoice) return null;

  const lineResult = await query<InvoiceLineRow>(
    `
      SELECT id, description, service_date, quantity, unit_rate_cents, line_total_cents
      FROM invoice_lines
      WHERE invoice_id = $1
      ORDER BY service_date, id
    `,
    [invoice.id],
  );

  return { invoice, lines: lineResult.rows };
}

async function loadInvoicePdfInput(invoiceId: string, userId: string) {
  const invoiceResult = await query<InvoicePdfRow>(
    `
      SELECT invoices.id, invoices.invoice_number, invoices.document_reference,
        invoices.resource_name, invoices.language, invoices.payment_terms, invoices.invoice_date, invoices.status,
        invoices.subtotal_cents, invoices.gst_cents, invoices.qst_cents, invoices.total_cents,
        invoices.email_message_id, invoices.sent_at, invoices.created_at,
        companies.legal_name AS supplier_name, companies.address AS supplier_address,
        companies.gst_number, companies.qst_number,
        clients.name AS client_name, clients.billing_address AS client_address,
        clients.email AS client_email
      FROM invoices
      JOIN companies ON companies.id = invoices.company_id AND companies.user_id = invoices.user_id
      JOIN clients ON clients.id = invoices.client_id AND clients.user_id = invoices.user_id
      WHERE invoices.id = $1 AND invoices.user_id = $2
    `,
    [invoiceId, userId],
  );
  const invoice = invoiceResult.rows[0];
  if (!invoice) return null;

  const lineResult = await query<InvoiceLineRow>(
    `
      SELECT id, description, service_date, quantity, unit_rate_cents, line_total_cents
      FROM invoice_lines
      WHERE invoice_id = $1
      ORDER BY service_date, id
    `,
    [invoice.id],
  );

  const pdfInput: InvoicePdfInput = {
    invoiceNumber: invoice.invoice_number,
    language: invoice.language as InvoicePdfInput['language'],
    invoiceDate: toDateInputValue(invoice.invoice_date),
    supplierName: invoice.supplier_name,
    supplierAddress: invoice.supplier_address,
    clientName: invoice.client_name,
    clientAddress: invoice.client_address,
    documentReference: invoice.document_reference,
    resourceName: invoice.resource_name,
    lines: lineResult.rows.map((line) => ({
      description: line.description,
      serviceDate: toDateInputValue(line.service_date),
      quantity: Number(line.quantity),
      unitRateCents: line.unit_rate_cents,
      lineTotalCents: line.line_total_cents,
    })),
    gstNumber: invoice.gst_number,
    qstNumber: invoice.qst_number,
    subtotalCents: invoice.subtotal_cents,
    gstCents: invoice.gst_cents,
    qstCents: invoice.qst_cents,
    totalCents: invoice.total_cents,
    paymentTerms: invoice.payment_terms,
  };

  return { pdfInput, clientEmail: invoice.client_email ?? '' };
}

function toDateInputValue(value: string | Date) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}
