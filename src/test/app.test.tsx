import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../main';

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('App', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders a document-first invoice studio shell', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Facture studio' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Active invoice context' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Invoice workbench' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument();
  });

  it('loads the signed-in workspace from the API', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith('/me')) {
        return Promise.resolve(jsonResponse({ user: { id: 'user-123', email: 'owner@example.com' } }));
      }
      if (url.endsWith('/companies')) {
        return Promise.resolve(
          jsonResponse({
            companies: [
              {
                id: 'company-123',
                legalName: '9493-1011 QUEBEC INC',
                companyNumber: '949301',
                address: 'Montreal, QC',
                gstNumber: '744492612',
                qstNumber: '1230724969',
                defaultHourlyRateCents: 9400,
                paymentTerms: 'MOIS-SUIV',
              },
            ],
          }),
        );
      }
      if (url.endsWith('/clients')) {
        return Promise.resolve(
          jsonResponse({
            clients: [
              {
                id: 'client-123',
                name: 'Cofomo',
                billingAddress: '1000 De la Gauchetiere',
                email: 'ap@cofomo.example',
              },
            ],
          }),
        );
      }
      if (url.endsWith('/invoices')) {
        return Promise.resolve(
          jsonResponse({
            invoices: [
              {
                id: 'invoice-123',
                invoiceNumber: 'C997672026-03-21001',
                clientName: 'Cofomo',
                documentReference: 'F00000349957',
                resourceName: 'Machado Da Silva, Eduardo (C99767)',
                invoiceDate: '2026-03-21',
                status: 'draft',
                totalCents: 437710,
              },
            ],
          }),
        );
      }
      if (url.endsWith('/invoices/invoice-123')) {
        return Promise.resolve(
          jsonResponse({
            invoice: {
              id: 'invoice-123',
              invoiceNumber: 'C997672026-03-21001',
              clientName: 'Cofomo',
              documentReference: 'F00000349957',
              resourceName: 'Machado Da Silva, Eduardo (C99767)',
              invoiceDate: '2026-03-21',
              status: 'draft',
              totalCents: 437710,
              lines: [
                {
                  description: "Main d'oeuvre",
                  serviceDate: '2026-03-21',
                  quantity: 40.5,
                  unitRateCents: 9400,
                },
              ],
            },
          }),
        );
      }

      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    expect(await screen.findByRole('button', { name: 'owner@example.com' })).toBeInTheDocument();
    expect(screen.getAllByText('C997672026-03-21001').length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.getByLabelText('Legal name')).toHaveValue('9493-1011 QUEBEC INC'));
    expect(await screen.findByLabelText('Client company')).toHaveValue('Cofomo');
    expect(await screen.findByDisplayValue("Main d'oeuvre")).toBeInTheDocument();
  });

  it('lets the user choose which company is used for a new invoice', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith('/me')) {
        return Promise.resolve(jsonResponse({ user: { id: 'user-123', email: 'owner@example.com' } }));
      }
      if (url.endsWith('/companies')) {
        return Promise.resolve(
          jsonResponse({
            companies: [
              {
                id: 'company-a',
                legalName: 'Alpha Quebec Inc.',
                companyNumber: '100',
                address: 'Montreal, QC',
                gstNumber: '111',
                qstNumber: '222',
                defaultHourlyRateCents: 9400,
                paymentTerms: 'MOIS-SUIV',
              },
              {
                id: 'company-b',
                legalName: 'Beta Conseil Inc.',
                companyNumber: '200',
                address: 'Quebec, QC',
                gstNumber: '333',
                qstNumber: '444',
                defaultHourlyRateCents: 12000,
                paymentTerms: 'NET 30',
              },
            ],
          }),
        );
      }
      if (url.endsWith('/clients')) {
        return Promise.resolve(
          jsonResponse({
            clients: [
              {
                id: 'client-123',
                name: 'Cofomo',
                billingAddress: '1000 De la Gauchetiere',
                email: 'ap@cofomo.test',
              },
            ],
          }),
        );
      }
      if (url.endsWith('/invoices') && init?.method === 'POST') {
        return Promise.resolve(
          jsonResponse(
            {
              invoice: {
                id: 'invoice-456',
                invoiceNumber: 'FAC-2026-001',
                invoiceDate: '2026-05-29',
                status: 'draft',
                totalCents: 465365,
              },
            },
            { status: 201 },
          ),
        );
      }
      if (url.endsWith('/invoices')) {
        return Promise.resolve(jsonResponse({ invoices: [] }));
      }

      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    const selector = await screen.findByLabelText('Select company');
    fireEvent.change(selector, { target: { value: 'company-b' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save facture' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:4000/invoices',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"companyId":"company-b"'),
        }),
      ),
    );
  });

  it('can start a new company after loading existing companies', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith('/me')) {
        return Promise.resolve(jsonResponse({ user: { id: 'user-123', email: 'owner@example.com' } }));
      }
      if (url.endsWith('/companies')) {
        return Promise.resolve(
          jsonResponse({
            companies: [
              {
                id: 'company-123',
                legalName: '9493-1011 QUEBEC INC',
                companyNumber: '949301',
                address: 'Montreal, QC',
                gstNumber: '744492612',
                qstNumber: '1230724969',
                defaultHourlyRateCents: 9400,
                paymentTerms: 'MOIS-SUIV',
              },
            ],
          }),
        );
      }
      if (url.endsWith('/clients')) {
        return Promise.resolve(jsonResponse({ clients: [] }));
      }
      if (url.endsWith('/invoices')) {
        return Promise.resolve(jsonResponse({ invoices: [] }));
      }

      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    expect(await screen.findByLabelText('Legal name')).toHaveValue('9493-1011 QUEBEC INC');
    fireEvent.click(screen.getByRole('button', { name: 'Add company' }));

    await waitFor(() => expect(screen.getByLabelText('Legal name')).toHaveValue(''));
    expect(screen.getByText('New company form ready. Save it before creating an invoice.')).toBeInTheDocument();
  });

  it('updates an existing company instead of creating another one', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith('/me')) {
        return Promise.resolve(jsonResponse({ user: { id: 'user-123', email: 'owner@example.com' } }));
      }
      if (url.endsWith('/companies/company-123') && init?.method === 'PATCH') {
        return Promise.resolve(
          jsonResponse({
            company: {
              id: 'company-123',
              legalName: 'Updated Company Inc.',
              companyNumber: '949301',
              address: 'Montreal, QC',
              gstNumber: '744492612',
              qstNumber: '1230724969',
              defaultHourlyRateCents: 9400,
              paymentTerms: 'MOIS-SUIV',
            },
          }),
        );
      }
      if (url.endsWith('/companies')) {
        return Promise.resolve(
          jsonResponse({
            companies: [
              {
                id: 'company-123',
                legalName: '9493-1011 QUEBEC INC',
                companyNumber: '949301',
                address: 'Montreal, QC',
                gstNumber: '744492612',
                qstNumber: '1230724969',
                defaultHourlyRateCents: 9400,
                paymentTerms: 'MOIS-SUIV',
              },
            ],
          }),
        );
      }
      if (url.endsWith('/clients')) {
        return Promise.resolve(jsonResponse({ clients: [] }));
      }
      if (url.endsWith('/invoices')) {
        return Promise.resolve(jsonResponse({ invoices: [] }));
      }

      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    const legalName = await screen.findByLabelText('Legal name');
    fireEvent.change(legalName, { target: { value: 'Updated Company Inc.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save company' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:4000/companies/company-123',
        expect.objectContaining({ method: 'PATCH' }),
      ),
    );
  });

  it('saves a new company when only the business name is entered', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith('/me')) {
        return Promise.resolve(jsonResponse({ user: { id: 'user-123', email: 'owner@example.com' } }));
      }
      if (url.endsWith('/companies') && init?.method === 'POST') {
        return Promise.resolve(
          jsonResponse(
            {
              company: {
                id: 'company-123',
                legalName: 'Facture Consulting',
                companyNumber: '',
                address: '',
                gstNumber: '',
                qstNumber: '',
                defaultHourlyRateCents: 9400,
                paymentTerms: 'MOIS-SUIV',
              },
            },
            { status: 201 },
          ),
        );
      }
      if (url.endsWith('/companies')) {
        return Promise.resolve(jsonResponse({ companies: [] }));
      }
      if (url.endsWith('/clients')) {
        return Promise.resolve(jsonResponse({ clients: [] }));
      }
      if (url.endsWith('/invoices')) {
        return Promise.resolve(jsonResponse({ invoices: [] }));
      }

      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    fireEvent.change(await screen.findByLabelText('Business name'), { target: { value: 'Facture Consulting' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save company' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:4000/companies',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            legalName: 'Facture Consulting',
            companyNumber: '',
            address: '',
            gstNumber: '',
            qstNumber: '',
            defaultHourlyRateCents: 9400,
            paymentTerms: 'MOIS-SUIV',
          }),
        }),
      ),
    );
    expect(await screen.findByText('Company profile saved.')).toBeInTheDocument();
  });

  it('saves a client without requiring an email address first', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith('/me')) {
        return Promise.resolve(jsonResponse({ user: { id: 'user-123', email: 'owner@example.com' } }));
      }
      if (url.endsWith('/companies')) {
        return Promise.resolve(jsonResponse({ companies: [] }));
      }
      if (url.endsWith('/clients') && init?.method === 'POST') {
        return Promise.resolve(
          jsonResponse(
            {
              client: {
                id: 'client-123',
                name: 'Cofomo',
                billingAddress: '1000 De la Gauchetiere',
                email: '',
              },
            },
            { status: 201 },
          ),
        );
      }
      if (url.endsWith('/clients')) {
        return Promise.resolve(jsonResponse({ clients: [] }));
      }
      if (url.endsWith('/invoices')) {
        return Promise.resolve(jsonResponse({ invoices: [] }));
      }

      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    fireEvent.change(await screen.findByLabelText('Client company'), { target: { value: 'Cofomo' } });
    fireEvent.change(screen.getByLabelText('Billing address'), { target: { value: '1000 De la Gauchetiere' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save client' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:4000/clients',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'Cofomo',
            billingAddress: '1000 De la Gauchetiere',
            email: '',
          }),
        }),
      ),
    );
    expect(await screen.findByText('Client saved.')).toBeInTheDocument();
  });

  it('lets the user select an existing client before saving a facture', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith('/me')) {
        return Promise.resolve(jsonResponse({ user: { id: 'user-123', email: 'owner@example.com' } }));
      }
      if (url.endsWith('/companies')) {
        return Promise.resolve(
          jsonResponse({
            companies: [
              {
                id: 'company-123',
                legalName: '9493-1011 QUEBEC INC',
                companyNumber: '949301',
                address: 'Montreal, QC',
                gstNumber: '744492612',
                qstNumber: '1230724969',
                defaultHourlyRateCents: 9400,
                paymentTerms: 'MOIS-SUIV',
              },
            ],
          }),
        );
      }
      if (url.endsWith('/clients')) {
        return Promise.resolve(
          jsonResponse({
            clients: [
              {
                id: 'client-a',
                name: 'Cofomo',
                billingAddress: '1000 De la Gauchetiere',
                email: 'ap@cofomo.test',
              },
              {
                id: 'client-b',
                name: 'Hydro Quebec',
                billingAddress: '75 Rene-Levesque',
                email: 'ap@hydro.test',
              },
            ],
          }),
        );
      }
      if (url.endsWith('/invoices') && init?.method === 'POST') {
        return Promise.resolve(
          jsonResponse(
            {
              invoice: {
                id: 'invoice-789',
                invoiceNumber: 'FAC-2026-001',
                invoiceDate: '2026-05-29',
                status: 'draft',
                totalCents: 465365,
              },
            },
            { status: 201 },
          ),
        );
      }
      if (url.endsWith('/invoices')) {
        return Promise.resolve(jsonResponse({ invoices: [] }));
      }

      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    const clientSelector = await screen.findByLabelText('Select client');
    fireEvent.change(clientSelector, { target: { value: 'client-b' } });

    await waitFor(() => expect(screen.getByLabelText('Client company')).toHaveValue('Hydro Quebec'));
    fireEvent.click(screen.getByRole('button', { name: 'Save facture' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:4000/invoices',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"clientId":"client-b"'),
        }),
      ),
    );
  });
});
