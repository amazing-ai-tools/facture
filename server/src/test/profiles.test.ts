import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSessionToken } from '../auth/session.js';

const query = vi.fn();

vi.mock('../db.js', () => ({
  query,
}));

describe('profile routes', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('lists companies for the signed-in user', async () => {
    const { createApp } = await import('../app.js');
    const app = createApp();
    const token = createSessionToken({ userId: 'user-123', email: 'user@example.com' });

    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'company-123',
          legal_name: '9493-1011 QUEBEC INC',
          company_number: '949301',
          address: 'Montreal, QC',
          gst_number: '744492612',
          qst_number: '1230724969',
          default_hourly_rate_cents: 9400,
          payment_terms: 'MOIS-SUIV',
        },
      ],
    });

    const response = await request(app).get('/companies').set('Cookie', [`facture_session=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body.companies[0]).toMatchObject({
      id: 'company-123',
      legalName: '9493-1011 QUEBEC INC',
      paymentTerms: 'MOIS-SUIV',
    });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE user_id = $1'), ['user-123']);
  });

  it('updates only companies owned by the signed-in user', async () => {
    const { createApp } = await import('../app.js');
    const app = createApp();
    const token = createSessionToken({ userId: 'user-123', email: 'user@example.com' });

    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'company-123',
          legal_name: 'Updated Company Inc.',
          company_number: '949301',
          address: 'Updated address',
          gst_number: '744492612',
          qst_number: '1230724969',
          default_hourly_rate_cents: 9900,
          payment_terms: 'NET 30',
        },
      ],
    });

    const response = await request(app)
      .patch('/companies/company-123')
      .set('Cookie', [`facture_session=${token}`])
      .send({
        legalName: 'Updated Company Inc.',
        companyNumber: '949301',
        address: 'Updated address',
        gstNumber: '744492612',
        qstNumber: '1230724969',
        defaultHourlyRateCents: 9900,
        paymentTerms: 'NET 30',
      });

    expect(response.status).toBe(200);
    expect(response.body.company.legalName).toBe('Updated Company Inc.');
    expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1 AND user_id = $2'), [
      'company-123',
      'user-123',
      'Updated Company Inc.',
      '949301',
      'Updated address',
      '744492612',
      '1230724969',
      9900,
      'NET 30',
    ]);
  });

  it('allows saving a company before tax and address details are complete', async () => {
    const { createApp } = await import('../app.js');
    const app = createApp();
    const token = createSessionToken({ userId: 'user-123', email: 'user@example.com' });

    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'company-123',
          legal_name: '9493-1011 QUEBEC INC',
          company_number: '',
          address: '',
          gst_number: '',
          qst_number: '',
          default_hourly_rate_cents: 9400,
          payment_terms: 'MOIS-SUIV',
        },
      ],
    });

    const response = await request(app)
      .post('/companies')
      .set('Cookie', [`facture_session=${token}`])
      .send({
        legalName: '9493-1011 QUEBEC INC',
        companyNumber: '',
        address: '',
        gstNumber: '',
        qstNumber: '',
        defaultHourlyRateCents: 9400,
        paymentTerms: 'MOIS-SUIV',
      });

    expect(response.status).toBe(201);
    expect(response.body.company).toMatchObject({
      id: 'company-123',
      legalName: '9493-1011 QUEBEC INC',
      companyNumber: '',
    });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO companies'), [
      'user-123',
      '9493-1011 QUEBEC INC',
      '',
      '',
      '',
      '',
      9400,
      'MOIS-SUIV',
    ]);
  });

  it('returns 404 when updating another user client', async () => {
    const { createApp } = await import('../app.js');
    const app = createApp();
    const token = createSessionToken({ userId: 'user-123', email: 'user@example.com' });

    query.mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .patch('/clients/client-456')
      .set('Cookie', [`facture_session=${token}`])
      .send({
        name: 'Cofomo',
        billingAddress: '1000 De la Gauchetiere',
        email: 'ap@cofomo.example',
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Client not found' });
  });

  it('allows saving a client before the email address or billing address is known', async () => {
    const { createApp } = await import('../app.js');
    const app = createApp();
    const token = createSessionToken({ userId: 'user-123', email: 'user@example.com' });

    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'client-123',
          name: 'Cofomo',
          billing_address: '',
          email: null,
        },
      ],
    });

    const response = await request(app)
      .post('/clients')
      .set('Cookie', [`facture_session=${token}`])
      .send({
        name: 'Cofomo',
        billingAddress: '',
        email: '',
      });

    expect(response.status).toBe(201);
    expect(response.body.client).toMatchObject({
      id: 'client-123',
      name: 'Cofomo',
      email: '',
    });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO clients'), [
      'user-123',
      'Cofomo',
      '',
      null,
    ]);
  });
});
