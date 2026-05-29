import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSessionToken } from '../auth/session.js';

const query = vi.fn();
const withTransaction = vi.fn(async (callback: typeof query) => callback(query));

vi.mock('../db.js', () => ({
  query,
  withTransaction,
}));

describe('invoice routes', () => {
  beforeEach(() => {
    query.mockReset();
    withTransaction.mockClear();
  });

  it('rejects unauthenticated invoice reads', async () => {
    const { createApp } = await import('../app.js');
    const app = createApp();
    const response = await request(app).get('/invoices');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Authentication required' });
    expect(query).not.toHaveBeenCalled();
  });

  it('creates an invoice with calculated Quebec totals', async () => {
    const { createApp } = await import('../app.js');
    const app = createApp();
    const token = createSessionToken({ userId: 'user-123', email: 'user@example.com' });

    query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'invoice-123',
            invoice_number: 'C997672026-03-21001',
            document_reference: 'F00000349957',
            resource_name: 'Machado Da Silva, Eduardo (C99767)',
            invoice_date: '2026-03-21',
            status: 'draft',
            subtotal_cents: 380700,
            gst_cents: 19035,
            qst_cents: 37975,
            total_cents: 437710,
            created_at: '2026-03-21T00:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'line-123',
            description: "Main d'oeuvre",
            service_date: '2026-03-21',
            quantity: '40.50',
            unit_rate_cents: 9400,
            line_total_cents: 380700,
          },
        ],
      });

    const response = await request(app)
      .post('/invoices')
      .set('Cookie', [`facture_session=${token}`])
      .send({
        companyId: 'company-123',
        clientId: 'client-123',
        invoiceNumber: 'C997672026-03-21001',
        documentReference: 'F00000349957',
        resourceName: 'Machado Da Silva, Eduardo (C99767)',
        paymentTerms: 'NET 15',
        invoiceDate: '2026-03-21',
        lines: [
          {
            description: "Main d'oeuvre",
            serviceDate: '2026-03-21',
            quantity: 40.5,
            unitRateCents: 9400,
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.invoice.totalCents).toBe(437710);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO invoices'), [
      'user-123',
      'company-123',
      'client-123',
      'C997672026-03-21001',
      'F00000349957',
      'Machado Da Silva, Eduardo (C99767)',
      'NET 15',
      '2026-03-21',
      380700,
      19035,
      37975,
      437710,
    ]);
  });

  it('returns a validation error instead of hanging on invalid invoice bodies', async () => {
    const { createApp } = await import('../app.js');
    const app = createApp();
    const token = createSessionToken({ userId: 'user-123', email: 'user@example.com' });

    const response = await request(app)
      .post('/invoices')
      .set('Cookie', [`facture_session=${token}`])
      .send({ invoiceNumber: '' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid request body');
  });

  it('rejects invoice creation when company or client does not belong to the user', async () => {
    const { createApp } = await import('../app.js');
    const app = createApp();
    const token = createSessionToken({ userId: 'user-123', email: 'user@example.com' });

    query.mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .post('/invoices')
      .set('Cookie', [`facture_session=${token}`])
      .send({
        companyId: 'other-company',
        clientId: 'other-client',
        invoiceNumber: 'FAC-2026-001',
        documentReference: 'REF-001',
        resourceName: 'Consultant',
        invoiceDate: '2026-05-29',
        lines: [
          {
            description: 'Services',
            serviceDate: '2026-05-29',
            quantity: 1,
            unitRateCents: 10000,
          },
        ],
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Company or client not found' });
  });

  it('updates invoice lines and recalculates totals transactionally', async () => {
    const { createApp } = await import('../app.js');
    const app = createApp();
    const token = createSessionToken({ userId: 'user-123', email: 'user@example.com' });

    query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'invoice-123',
            invoice_number: 'FAC-2026-001',
            document_reference: 'Old reference',
            resource_name: 'Consultant',
            invoice_date: '2026-05-29',
            status: 'draft',
            subtotal_cents: 10000,
            gst_cents: 500,
            qst_cents: 998,
            total_cents: 11498,
            created_at: '2026-05-29T00:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'line-old',
            description: 'Old work',
            service_date: '2026-05-29',
            quantity: '1.00',
            unit_rate_cents: 10000,
            line_total_cents: 10000,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'invoice-123',
            invoice_number: 'FAC-2026-002',
            document_reference: 'Updated reference',
            resource_name: 'Consultant',
            invoice_date: '2026-05-29',
            status: 'draft',
            subtotal_cents: 18800,
            gst_cents: 940,
            qst_cents: 1875,
            total_cents: 21615,
            created_at: '2026-05-29T00:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'line-new',
            description: 'Updated work',
            service_date: '2026-05-29',
            quantity: '2.00',
            unit_rate_cents: 9400,
            line_total_cents: 18800,
          },
        ],
      });

    const response = await request(app)
      .patch('/invoices/invoice-123')
      .set('Cookie', [`facture_session=${token}`])
      .send({
        invoiceNumber: 'FAC-2026-002',
        documentReference: 'Updated reference',
        resourceName: 'Consultant',
        invoiceDate: '2026-05-29',
        lines: [
          {
            description: 'Updated work',
            serviceDate: '2026-05-29',
            quantity: 2,
            unitRateCents: 9400,
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.invoice.totalCents).toBe(21615);
    expect(response.body.invoice.lines[0]).toMatchObject({
      description: 'Updated work',
      lineTotalCents: 18800,
    });
    expect(withTransaction).toHaveBeenCalledOnce();
    expect(query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM invoice_lines'), ['invoice-123']);
  });

  it('rejects sending an invoice when the client has no email address', async () => {
    const { createApp } = await import('../app.js');
    const app = createApp();
    const token = createSessionToken({ userId: 'user-123', email: 'user@example.com' });

    query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'invoice-123',
            invoice_number: 'FAC-2026-001',
            document_reference: 'REF-001',
            resource_name: 'Consultant',
            invoice_date: '2026-05-29',
            status: 'draft',
            subtotal_cents: 10000,
            gst_cents: 500,
            qst_cents: 998,
            total_cents: 11498,
            email_message_id: null,
            sent_at: null,
            created_at: '2026-05-29T00:00:00.000Z',
            supplier_name: '9493-1011 QUEBEC INC',
            supplier_address: 'Montreal, QC',
            gst_number: '744492612',
            qst_number: '1230724969',
            payment_terms: 'MOIS-SUIV',
            client_name: 'Cofomo',
            client_address: '1000 De la Gauchetiere',
            client_email: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'line-123',
            description: 'Services',
            service_date: '2026-05-29',
            quantity: '1.00',
            unit_rate_cents: 10000,
            line_total_cents: 10000,
          },
        ],
      });

    const response = await request(app)
      .post('/invoices/invoice-123/send')
      .set('Cookie', [`facture_session=${token}`])
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Add a client email before sending this invoice' });
  });
});
