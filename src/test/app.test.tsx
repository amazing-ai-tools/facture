import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

    expect(screen.getByRole('heading', { name: 'Studio de factures' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Contexte actif de la facture' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Flux de creation de facture' })).toBeInTheDocument();
    expect(screen.getByLabelText("Langue de l'interface")).toHaveValue('fr-QC');
    expect(screen.getByRole('button', { name: 'Se connecter avec Google' })).toBeInTheDocument();
  });

  it('uses language selection for the site interface, not the facture data', () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Langue de l'interface"), { target: { value: 'en' } });

    expect(screen.getByRole('heading', { name: 'Invoice studio' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '3. Fill the invoice' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Language')).not.toBeInTheDocument();
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
              invoiceDate: '2026-03-21T00:00:00.000Z',
              status: 'draft',
              totalCents: 437710,
              lines: [
                {
                  description: "Main d'oeuvre",
                  serviceDate: '2026-03-21T00:00:00.000Z',
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
    await waitFor(() => expect(screen.getAllByText('9493-1011 QUEBEC INC').length).toBeGreaterThan(0));
    expect(screen.getAllByText('Cofomo').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Modifier la compagnie' }));
    await waitFor(() => expect(screen.getByLabelText('Legal name')).toHaveValue('9493-1011 QUEBEC INC'));
    fireEvent.click(screen.getByRole('button', { name: 'Modifier le client' }));
    expect(await screen.findByLabelText('Nom du client')).toHaveValue('Cofomo');
    expect(await screen.findByLabelText('Date')).toHaveValue('2026-03-21');
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

    const selector = await screen.findByLabelText('Selectionner la compagnie');
    fireEvent.change(selector, { target: { value: 'company-b' } });
    fireEvent.change(screen.getByLabelText('Echeance'), { target: { value: 'NET 15' } });
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
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/invoices',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"paymentTerms":"NET 15"'),
      }),
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

    await waitFor(() => expect(screen.getAllByText('9493-1011 QUEBEC INC').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter une compagnie' }));

    await waitFor(() => expect(screen.getByLabelText('Legal name')).toHaveValue(''));
    expect(screen.getByText('New company form ready. Save it before creating an invoice.')).toBeInTheDocument();
  });

  it('keeps the company profile hidden when only the company combobox changes', async () => {
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

    const selector = await screen.findByLabelText('Selectionner la compagnie');
    await waitFor(() => expect(screen.queryByLabelText('Legal name')).not.toBeInTheDocument());

    fireEvent.change(selector, { target: { value: '' } });

    expect(screen.queryByLabelText('Legal name')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ajouter une compagnie' })).toBeInTheDocument();
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

    await waitFor(() => expect(screen.getAllByText('9493-1011 QUEBEC INC').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: 'Modifier la compagnie' }));
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
        const body = JSON.parse(String(init.body)) as { name?: string };
        return Promise.resolve(
          jsonResponse(
            {
              company: {
                id: 'company-123',
                name: body.name,
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

    await screen.findByRole('button', { name: 'Ajouter une compagnie' });
    expect(screen.queryByLabelText('Supplier display name')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter une compagnie' }));
    fireEvent.change(await screen.findByLabelText('Supplier display name'), { target: { value: 'Facture Consulting' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save company' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:4000/companies',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            legalName: 'Facture Consulting',
            name: 'Facture Consulting',
            companyNumber: '',
            email: '',
            address: '',
            gstNumber: '',
            qstNumber: '',
            defaultHourlyRateCents: 9400,
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
        const body = JSON.parse(String(init.body)) as { contactName?: string };
        return Promise.resolve(
          jsonResponse(
            {
              client: {
                id: 'client-123',
                name: 'Cofomo',
                contactName: body.contactName,
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

    fireEvent.change(await screen.findByLabelText('Nom du client'), { target: { value: 'Cofomo' } });
    fireEvent.change(screen.getByLabelText('Contact'), { target: { value: 'Accounts payable' } });
    fireEvent.change(screen.getByLabelText('Adresse du client'), { target: { value: '1000 De la Gauchetiere' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save client' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:4000/clients',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'Cofomo',
            contactName: 'Accounts payable',
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

    const clientSelector = await screen.findByLabelText('Selectionner le client');
    expect(screen.getByRole('group', { name: 'Saved clients' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hydro Quebec/ })).toBeInTheDocument();
    fireEvent.change(clientSelector, { target: { value: 'client-b' } });

    await waitFor(() => expect(screen.getAllByText('Hydro Quebec').length).toBeGreaterThan(0));
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

  it('opens the generated PDF for a saved facture', async () => {
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
                email: 'ap@cofomo.test',
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
              companyId: 'company-123',
              clientId: 'client-123',
              invoiceNumber: 'FAC-2026-001',
              documentReference: 'F00000349957',
              resourceName: 'Machado Da Silva, Eduardo',
              invoiceDate: '2026-05-29',
              status: 'draft',
              totalCents: 465365,
              lines: [
                {
                  description: "Main d'oeuvre",
                  serviceDate: '2026-05-29',
                  quantity: 40,
                  unitRateCents: 10000,
                },
              ],
            },
          }),
        );
      }
      if (url.endsWith('/invoices')) {
        return Promise.resolve(
          jsonResponse({
            invoices: [
              {
                id: 'invoice-123',
                invoiceNumber: 'FAC-2026-001',
                clientName: 'Cofomo',
                invoiceDate: '2026-05-29',
                status: 'draft',
                totalCents: 465365,
              },
            ],
          }),
        );
      }

      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    const pdfLink = await screen.findByRole('link', { name: 'Ouvrir le PDF' });
    expect(pdfLink).toHaveAttribute('href', 'http://localhost:4000/invoices/invoice-123/pdf');
    expect(pdfLink).toHaveAttribute('target', '_blank');
  });

  it('shows facture history and can start a new facture from an existing saved invoice', async () => {
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
      if (url.endsWith('/invoices/invoice-123')) {
        return Promise.resolve(
          jsonResponse({
            invoice: {
              id: 'invoice-123',
              companyId: 'company-123',
              clientId: 'client-123',
              invoiceNumber: 'FAC-2026-001',
              documentReference: 'F00000349957',
              resourceName: 'Machado Da Silva, Eduardo',
              invoiceDate: '2026-05-29',
              paymentTerms: 'MOIS-SUIV',
              status: 'sent',
              totalCents: 465365,
              lines: [
                {
                  description: "Main d'oeuvre",
                  serviceDate: '2026-05-29',
                  quantity: 40,
                  unitRateCents: 10000,
                },
              ],
            },
          }),
        );
      }
      if (url.endsWith('/invoices') && init?.method === 'POST') {
        return Promise.resolve(
          jsonResponse(
            {
              invoice: {
                id: 'invoice-456',
                invoiceNumber: 'FAC-2026-002',
                invoiceDate: '2026-05-30',
                status: 'draft',
                totalCents: 465365,
              },
            },
            { status: 201 },
          ),
        );
      }
      if (url.endsWith('/invoices')) {
        return Promise.resolve(
          jsonResponse({
            invoices: [
              {
                id: 'invoice-123',
                invoiceNumber: 'FAC-2026-001',
                clientName: 'Cofomo',
                invoiceDate: '2026-05-29',
                status: 'sent',
                totalCents: 465365,
              },
            ],
          }),
        );
      }

      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Facture history' })).toBeInTheDocument();
    const history = screen.getByRole('region', { name: 'Facture history' });
    expect(within(history).getAllByRole('button', { name: /FAC-2026-001/ }).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Creer une nouvelle facture' }));
    expect(screen.getByText('New facture ready. It will be saved under the active company and client.')).toBeInTheDocument();
    expect(screen.getByLabelText('Facture no')).toHaveValue('2026-001');
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-05-30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save facture' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:4000/invoices',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"invoiceNumber":"2026-001"'),
        }),
      ),
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      'http://localhost:4000/invoices/invoice-123',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('reloads saved facture details after editing and when reopening from history', async () => {
    let savedInvoiceNumber = '2026-001';
    let savedDescription = 'Initial work';
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
      if (url.endsWith('/invoices/invoice-123') && init?.method === 'PATCH') {
        const body = JSON.parse(String(init.body)) as {
          invoiceNumber: string;
          lines: Array<{ description: string }>;
        };
        savedInvoiceNumber = body.invoiceNumber;
        savedDescription = body.lines[0].description;
        return Promise.resolve(
          jsonResponse({
            invoice: {
              id: 'invoice-123',
              invoiceNumber: savedInvoiceNumber,
              invoiceDate: '2026-05-29',
              status: 'draft',
              totalCents: 11498,
            },
          }),
        );
      }
      if (url.endsWith('/invoices/invoice-123')) {
        return Promise.resolve(
          jsonResponse({
            invoice: {
              id: 'invoice-123',
              companyId: 'company-123',
              clientId: 'client-123',
              invoiceNumber: savedInvoiceNumber,
              documentReference: savedInvoiceNumber,
              resourceName: 'Consultant',
              invoiceDate: '2026-05-29',
              paymentTerms: 'MOIS-SUIV',
              status: 'draft',
              totalCents: 11498,
              lines: [
                {
                  description: savedDescription,
                  serviceDate: '2026-05-29',
                  quantity: 1,
                  unitRateCents: 10000,
                },
              ],
            },
          }),
        );
      }
      if (url.endsWith('/invoices')) {
        return Promise.resolve(
          jsonResponse({
            invoices: [
              {
                id: 'invoice-123',
                invoiceNumber: savedInvoiceNumber,
                clientName: 'Cofomo',
                invoiceDate: '2026-05-29',
                status: 'draft',
                totalCents: 11498,
              },
            ],
          }),
        );
      }

      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    expect(await screen.findByLabelText('Facture no')).toHaveValue('2026-001');
    fireEvent.change(screen.getByLabelText('Facture no'), { target: { value: '2026-009' } });
    fireEvent.change(screen.getByLabelText('Description 1'), { target: { value: 'Updated delivery work' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save facture' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:4000/invoices/invoice-123',
        expect.objectContaining({ method: 'PATCH', body: expect.stringContaining('2026-009') }),
      ),
    );
    await waitFor(() => expect(screen.getByLabelText('Facture no')).toHaveValue('2026-009'));
    expect(screen.getByLabelText('Description 1')).toHaveValue('Updated delivery work');

    fireEvent.change(screen.getByLabelText('Facture no'), { target: { value: 'Unsaved local change' } });
    const history = screen.getByRole('region', { name: 'Facture history' });
    fireEvent.click(within(history).getAllByRole('button', { name: /2026-001|2026-009/ })[0]);

    await waitFor(() => expect(screen.getByLabelText('Facture no')).toHaveValue('2026-009'));
    expect(screen.getByLabelText('Description 1')).toHaveValue('Updated delivery work');
  });

  it('presents the app as a workflow and hides completed company and client forms until editing', async () => {
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
      if (url.endsWith('/invoices')) {
        return Promise.resolve(jsonResponse({ invoices: [] }));
      }

      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    const workflow = await screen.findByRole('region', { name: 'Flux de creation de facture' });
    expect(workflow).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '1. Selectionner la compagnie' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '2. Selectionner le client' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '3. Remplir la facture' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '4. Previsualiser et envoyer' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Facture history' })).toBeInTheDocument();

    await waitFor(() => expect(screen.queryByLabelText('Legal name')).not.toBeInTheDocument());
    expect(screen.queryByLabelText('Nom du client')).not.toBeInTheDocument();
    expect(screen.getAllByText('9493-1011 QUEBEC INC').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Cofomo').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Modifier la compagnie' }));
    expect(await screen.findByLabelText('Legal name')).toHaveValue('9493-1011 QUEBEC INC');

    fireEvent.click(screen.getByRole('button', { name: 'Modifier le client' }));
    expect(await screen.findByLabelText('Nom du client')).toHaveValue('Cofomo');
  });

  it('hard deletes draft factures from history', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith('/me')) {
        return Promise.resolve(jsonResponse({ user: { id: 'user-123', email: 'owner@example.com' } }));
      }
      if (url.endsWith('/companies')) {
        return Promise.resolve(jsonResponse({ companies: [] }));
      }
      if (url.endsWith('/clients')) {
        return Promise.resolve(jsonResponse({ clients: [] }));
      }
      if (url.endsWith('/invoices/invoice-draft') && init?.method === 'DELETE') {
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      if (url.endsWith('/invoices')) {
        return Promise.resolve(
          jsonResponse({
            invoices: [
              {
                id: 'invoice-draft',
                invoiceNumber: 'FAC-2026-001',
                clientName: 'Cofomo',
                invoiceDate: '2026-05-29',
                status: 'draft',
                totalCents: 11498,
              },
            ],
          }),
        );
      }

      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    const history = await screen.findByRole('region', { name: 'Facture history' });
    await waitFor(() => expect(within(history).getAllByRole('button', { name: /FAC-2026-001/ }).length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: 'Delete FAC-2026-001' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:4000/invoices/invoice-draft',
        expect.objectContaining({ method: 'DELETE' }),
      ),
    );
    expect(await screen.findByText('Draft facture permanently deleted.')).toBeInTheDocument();
    expect(within(history).queryByRole('button', { name: /FAC-2026-001/ })).not.toBeInTheDocument();
  });

  it('soft deletes sent factures and can show deleted factures in history', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith('/me')) {
        return Promise.resolve(jsonResponse({ user: { id: 'user-123', email: 'owner@example.com' } }));
      }
      if (url.endsWith('/companies')) {
        return Promise.resolve(jsonResponse({ companies: [] }));
      }
      if (url.endsWith('/clients')) {
        return Promise.resolve(jsonResponse({ clients: [] }));
      }
      if (url.endsWith('/invoices/invoice-sent') && init?.method === 'DELETE') {
        return Promise.resolve(
          jsonResponse({
            invoice: {
              id: 'invoice-sent',
              invoiceNumber: 'FAC-2026-002',
              clientName: 'Cofomo',
              invoiceDate: '2026-05-29',
              status: 'sent',
              totalCents: 11498,
              deletedAt: '2026-06-02T13:00:00.000Z',
            },
          }),
        );
      }
      if (url.endsWith('/invoices?includeDeleted=true')) {
        return Promise.resolve(
          jsonResponse({
            invoices: [
              {
                id: 'invoice-sent',
                invoiceNumber: 'FAC-2026-002',
                clientName: 'Cofomo',
                invoiceDate: '2026-05-29',
                status: 'sent',
                totalCents: 11498,
                deletedAt: '2026-06-02T13:00:00.000Z',
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
                id: 'invoice-sent',
                invoiceNumber: 'FAC-2026-002',
                clientName: 'Cofomo',
                invoiceDate: '2026-05-29',
                status: 'sent',
                totalCents: 11498,
              },
            ],
          }),
        );
      }

      return Promise.resolve(jsonResponse({}, { status: 404 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    const history = await screen.findByRole('region', { name: 'Facture history' });
    await waitFor(() => expect(within(history).getAllByRole('button', { name: /FAC-2026-002/ }).length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: 'Delete FAC-2026-002' }));

    expect(await screen.findByText('Facture soft deleted. Turn on deleted factures in history to see it.')).toBeInTheDocument();
    expect(screen.getByText('deleted')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Show deleted factures'));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('http://localhost:4000/invoices?includeDeleted=true', {
        credentials: 'include',
      }),
    );
  });
});
